using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using PrMap.Api.Auth;
using PrMap.Api.GitHub;
using PrMap.Api.Tests.Fakes;

namespace PrMap.Api.Tests;

/// <summary>
/// The sign-in flow end to end with GitHub stubbed out. The thing being protected is simple to
/// state: the token the server holds must never appear in anything the browser receives.
/// </summary>
public sealed class AuthEndpointsTests : IDisposable
{
    private const string Token = "gho_the_server_side_token";

    private readonly FakeOAuthClient _oauth = new();
    private readonly WebApplicationFactory<Program> _factory;

    public AuthEndpointsTests()
    {
        _oauth.CodeResult = new TokenResult(
            Token, "ghr_refresh", DateTimeOffset.UtcNow.AddHours(8), null);

        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("GitHub:AuthMode", "GitHubApp");
            builder.UseSetting("GitHub:ClientId", "Iv1.testclientid");
            builder.UseSetting("GitHub:ClientSecret", "test-client-secret");

            builder.ConfigureServices(services =>
            {
                services.Replace(ServiceDescriptor.Singleton<IGitHubOAuthClient>(_oauth));
                services.Replace(ServiceDescriptor.Singleton<IGitHubClientFactory>(
                    new FakeGitHubClientFactory(new FakeGitHubClient(
                        new FakePullRequestsClient([])))));
            });
        });
    }

    public void Dispose() => _factory.Dispose();

    /// <summary>Redirects are followed by default, which would send the test at github.com.</summary>
    private HttpClient Client() => _factory.CreateClient(
        new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

    [Fact]
    public async Task Signed_out_is_the_starting_state()
    {
        var response = await Client().GetAsync("/api/auth/me");
        var body = await response.Content.ReadFromJsonAsync<MeResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(body?.SignedIn);
        Assert.Null(body?.Login);
    }

    [Fact]
    public async Task Login_sends_the_browser_to_github_with_a_state_it_can_check_later()
    {
        var response = await Client().GetAsync("/api/auth/login");

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);

        var location = response.Headers.Location?.ToString() ?? string.Empty;
        Assert.StartsWith("https://github.com/login/oauth/authorize", location);
        Assert.Contains("client_id=Iv1.testclientid", location);
        Assert.Contains("state=", location);

        // The secret stays on the server; only the public client id goes in the URL.
        Assert.DoesNotContain("test-client-secret", location);

        var cookie = Assert.Single(SetCookies(response), c => c.StartsWith(SessionCookie.StateName));
        Assert.Contains("httponly", cookie.ToLowerInvariant());
    }

    [Fact]
    public async Task A_callback_with_no_state_is_refused_before_the_code_is_touched()
    {
        var response = await Client().GetAsync("/api/auth/callback?code=abc123");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Null(_oauth.LastCode);
    }

    [Fact]
    public async Task A_callback_whose_state_does_not_match_is_refused()
    {
        var client = Client();
        await client.GetAsync("/api/auth/login");

        // The browser's cookie says one thing, the callback says another: not our redirect.
        var response = await client.GetAsync("/api/auth/callback?code=abc123&state=somebody-elses");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Null(_oauth.LastCode);
    }

    [Fact]
    public async Task A_good_callback_signs_the_user_in_without_handing_over_the_token()
    {
        var client = Client();
        var state = await StartSignIn(client);

        var response = await client.GetAsync($"/api/auth/callback?code=abc123&state={state}");

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Equal("/", response.Headers.Location?.ToString());
        Assert.Equal("abc123", _oauth.LastCode);

        var session = Assert.Single(SetCookies(response), c => c.StartsWith(SessionCookie.Name + "="));
        Assert.Contains("httponly", session.ToLowerInvariant());
        Assert.DoesNotContain(Token, session);
        Assert.DoesNotContain(Token, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Me_names_the_signed_in_user_and_says_nothing_about_the_token()
    {
        var client = Client();
        await SignIn(client);

        var response = await client.GetAsync("/api/auth/me");
        var raw = await response.Content.ReadAsStringAsync();

        Assert.Contains("\"signedIn\":true", raw);
        Assert.DoesNotContain(Token, raw);
        Assert.DoesNotContain("ghr_refresh", raw);
        Assert.DoesNotContain("expires", raw, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Logout_ends_the_session()
    {
        var client = Client();
        await SignIn(client);

        var logout = await client.PostAsync("/api/auth/logout", content: null);
        Assert.Equal(HttpStatusCode.OK, logout.StatusCode);

        var me = await client.GetFromJsonAsync<MeResponse>("/api/auth/me");
        Assert.False(me?.SignedIn);
    }

    [Fact]
    public async Task A_sign_in_GitHub_refuses_does_not_create_a_session()
    {
        _oauth.CodeResult = new TokenResult(null, null, default, "bad_verification_code");

        var client = Client();
        var state = await StartSignIn(client);

        var response = await client.GetAsync($"/api/auth/callback?code=abc123&state={state}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.DoesNotContain("bad_verification_code", await response.Content.ReadAsStringAsync());

        var me = await client.GetFromJsonAsync<MeResponse>("/api/auth/me");
        Assert.False(me?.SignedIn);
    }

    private static async Task<string> StartSignIn(HttpClient client)
    {
        var login = await client.GetAsync("/api/auth/login");
        var location = login.Headers.Location?.ToString() ?? string.Empty;
        return location[(location.IndexOf("state=", StringComparison.Ordinal) + "state=".Length)..];
    }

    private static async Task SignIn(HttpClient client)
    {
        var state = await StartSignIn(client);
        await client.GetAsync($"/api/auth/callback?code=abc123&state={state}");
    }

    private static List<string> SetCookies(HttpResponseMessage response) =>
        response.Headers.TryGetValues("Set-Cookie", out var values) ? [.. values] : [];

    private sealed record MeResponse(bool SignedIn, string? Login);
}
