using PrMap.Api.Auth;

namespace PrMap.Api.GitHub;

/// <summary>
/// Per-user tokens from a GitHub App sign-in, held server-side and looked up by the session
/// cookie. The token never reaches the browser.
/// </summary>
public sealed class GitHubAppTokenProvider(
    ISessionStore sessions,
    IGitHubOAuthClient oauth,
    ILogger<GitHubAppTokenProvider> logger) : IGitHubTokenProvider
{
    /// <summary>
    /// A token this close to expiring is treated as expired, so a request cannot be halfway
    /// through when it runs out.
    /// </summary>
    private static readonly TimeSpan RefreshWindow = TimeSpan.FromMinutes(1);

    public bool SupportsPrivateRepositories => true;

    public async ValueTask<string?> GetTokenAsync(
        HttpContext context,
        CancellationToken cancellationToken = default)
    {
        var sessionId = SessionCookie.Read(context);
        if (sessionId is null)
        {
            return null;
        }

        var session = sessions.Get(sessionId);
        if (session is null)
        {
            // Expired or signed out elsewhere. Nothing to say: the request simply goes to GitHub
            // unauthenticated and gets the same answer a signed-out user would.
            return null;
        }

        if (DateTimeOffset.UtcNow < session.ExpiresAt - RefreshWindow)
        {
            return session.AccessToken;
        }

        if (string.IsNullOrEmpty(session.RefreshToken))
        {
            logger.LogInformation("A session's token expired and it has no refresh token.");
            sessions.Remove(sessionId);
            SessionCookie.Clear(context);
            return null;
        }

        var refreshed = await oauth.RefreshAsync(session.RefreshToken, cancellationToken);

        if (!refreshed.Succeeded || refreshed.AccessToken is null)
        {
            logger.LogWarning("Refreshing a token failed: {Error}", refreshed.Error);
            sessions.Remove(sessionId);
            SessionCookie.Clear(context);
            return null;
        }

        sessions.Replace(sessionId, session with
        {
            AccessToken = refreshed.AccessToken,
            // GitHub sends a new refresh token each time; keeping the old one would strand the
            // session at the next refresh.
            RefreshToken = refreshed.RefreshToken ?? session.RefreshToken,
            ExpiresAt = refreshed.ExpiresAt,
        });

        return refreshed.AccessToken;
    }
}
