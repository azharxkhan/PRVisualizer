using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using PrMap.Api.Configuration;
using PrMap.Api.GitHub;

namespace PrMap.Api.Auth;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapGet("/login", Login).WithName("SignIn");
        group.MapGet("/callback", Callback).WithName("SignInCallback");
        group.MapPost("/logout", Logout).WithName("SignOut");
        group.MapGet("/me", Me).WithName("CurrentUser");

        return app;
    }

    private static IResult Login(HttpContext context, IOptions<GitHubOptions> options)
    {
        var settings = options.Value;

        if (string.IsNullOrWhiteSpace(settings.ClientId))
        {
            return Results.Json(
                new { error = "Sign-in is not configured on this instance." },
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        // The state ties this redirect to the callback that comes back. Without it, anyone could
        // feed the callback a code of their own and sign the user into the wrong account.
        var state = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        SessionCookie.WriteState(context, state);

        var authorize = QueryHelpers.AddQueryString(settings.AuthorizeEndpoint, new Dictionary<string, string?>
        {
            ["client_id"] = settings.ClientId,
            ["state"] = state,
        });

        return Results.Redirect(authorize);
    }

    private static async Task<IResult> Callback(
        string? code,
        string? state,
        HttpContext context,
        IGitHubOAuthClient oauth,
        ISessionStore sessions,
        IGitHubClientFactory clientFactory,
        IOptions<GitHubOptions> options,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("PrMap.Api.Auth");
        var expected = SessionCookie.ReadState(context);
        SessionCookie.ClearState(context);

        // Checked before the code is touched, and compared in fixed time so the comparison
        // itself gives nothing away.
        if (string.IsNullOrEmpty(state) || string.IsNullOrEmpty(expected) || !FixedTimeEquals(state, expected))
        {
            logger.LogWarning("Rejected an OAuth callback whose state did not match.");
            return Results.BadRequest(new { error = "That sign-in request did not come from here. Try again." });
        }

        if (string.IsNullOrEmpty(code))
        {
            return Results.BadRequest(new { error = "GitHub did not send a code back. Try again." });
        }

        var token = await oauth.ExchangeCodeAsync(code, cancellationToken);

        if (!token.Succeeded || token.AccessToken is null)
        {
            logger.LogWarning("GitHub refused the code exchange: {Error}", token.Error);
            return Results.BadRequest(new { error = "GitHub would not complete that sign-in. Try again." });
        }

        var login = await ReadLoginAsync(clientFactory, token.AccessToken, logger);

        var sessionId = sessions.Create(
            new GitHubSession(token.AccessToken, token.RefreshToken, token.ExpiresAt, login));

        SessionCookie.Write(context, sessionId, options.Value.SessionLifetime);

        // A redirect, not a body: nothing about the token travels back to the browser.
        return Results.Redirect(options.Value.SignedInRedirect);
    }

    private static IResult Logout(HttpContext context, ISessionStore sessions)
    {
        var sessionId = SessionCookie.Read(context);

        if (sessionId is not null)
        {
            sessions.Remove(sessionId);
        }

        SessionCookie.Clear(context);
        return Results.Ok(new { signedIn = false });
    }

    private static IResult Me(HttpContext context, ISessionStore sessions)
    {
        var sessionId = SessionCookie.Read(context);
        var session = sessionId is null ? null : sessions.Get(sessionId);

        // The login and nothing else. No token, no expiry, not even a prefix of one.
        return session is null
            ? Results.Ok(new { signedIn = false, login = (string?)null })
            : Results.Ok(new { signedIn = true, login = session.Login });
    }

    private static async Task<string> ReadLoginAsync(
        IGitHubClientFactory clientFactory,
        string accessToken,
        ILogger logger)
    {
        try
        {
            var client = clientFactory.Create(accessToken);
            var user = await client.User.Current();
            return user.Login;
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            // A name for the header is a nicety; failing to read it is no reason to refuse a
            // sign-in GitHub has already accepted, whatever went wrong fetching it.
            logger.LogWarning(exception, "Signed in but could not read the user's login.");
            return "signed in";
        }
    }

    private static bool FixedTimeEquals(string left, string right) =>
        CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.UTF8.GetBytes(left),
            System.Text.Encoding.UTF8.GetBytes(right));
}
