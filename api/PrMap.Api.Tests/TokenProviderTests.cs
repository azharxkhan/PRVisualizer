using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PrMap.Api.Configuration;
using PrMap.Api.Auth;
using PrMap.Api.GitHub;
using PrMap.Api.Tests.Fakes;

namespace PrMap.Api.Tests;

public class TokenProviderTests
{
    private static IOptions<GitHubOptions> Opts(Action<GitHubOptions> configure)
    {
        var options = new GitHubOptions();
        configure(options);
        return Options.Create(options);
    }

    [Fact]
    public async Task Anonymous_returns_null_when_no_instance_token_is_set()
    {
        var provider = new AnonymousTokenProvider(Opts(_ => { }));
        Assert.Null(await provider.GetTokenAsync(new DefaultHttpContext()));
    }

    [Fact]
    public async Task Anonymous_returns_the_instance_token_when_one_is_set()
    {
        var provider = new AnonymousTokenProvider(Opts(o => o.InstanceToken = "instance-token"));
        Assert.Equal("instance-token", await provider.GetTokenAsync(new DefaultHttpContext()));
    }

    [Fact]
    public void Anonymous_never_claims_to_reach_private_repositories()
    {
        var provider = new AnonymousTokenProvider(Opts(o => o.InstanceToken = "instance-token"));
        Assert.False(provider.SupportsPrivateRepositories);
    }

    [Fact]
    public async Task PersonalToken_returns_the_configured_token()
    {
        var provider = new PersonalTokenProvider(Opts(o => o.PersonalAccessToken = "pat"));
        Assert.Equal("pat", await provider.GetTokenAsync(new DefaultHttpContext()));
        Assert.True(provider.SupportsPrivateRepositories);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void PersonalToken_fails_loudly_at_startup_when_unconfigured(string? token)
    {
        var error = Assert.Throws<InvalidOperationException>(
            () => new PersonalTokenProvider(Opts(o => o.PersonalAccessToken = token)));

        Assert.Contains("user-secrets", error.Message);
    }

    [Fact]
    public async Task GitHubApp_has_no_token_for_a_browser_with_no_session()
    {
        var provider = new GitHubAppTokenProvider(
            Sessions(), new FakeOAuthClient(), NullLogger<GitHubAppTokenProvider>.Instance);

        Assert.Null(await provider.GetTokenAsync(new DefaultHttpContext()));
        Assert.True(provider.SupportsPrivateRepositories);
    }

    [Fact]
    public async Task GitHubApp_returns_the_session_token_while_it_is_still_good()
    {
        var sessions = Sessions();
        var id = sessions.Create(new GitHubSession(
            "gho_live", "ghr_refresh", DateTimeOffset.UtcNow.AddHours(8), "octocat"));
        var oauth = new FakeOAuthClient();
        var provider = new GitHubAppTokenProvider(
            sessions, oauth, NullLogger<GitHubAppTokenProvider>.Instance);

        Assert.Equal("gho_live", await provider.GetTokenAsync(ContextWithSession(id)));
        Assert.Equal(0, oauth.RefreshCount);
    }

    [Fact]
    public async Task GitHubApp_refreshes_a_token_that_has_run_out()
    {
        var sessions = Sessions();
        var id = sessions.Create(new GitHubSession(
            "gho_stale", "ghr_refresh", DateTimeOffset.UtcNow.AddSeconds(-1), "octocat"));
        var oauth = new FakeOAuthClient();
        var provider = new GitHubAppTokenProvider(
            sessions, oauth, NullLogger<GitHubAppTokenProvider>.Instance);

        var token = await provider.GetTokenAsync(ContextWithSession(id));

        Assert.Equal("gho_refreshed_token", token);
        Assert.Equal("ghr_refresh", oauth.LastRefreshToken);
        // The new pair is stored, or the next request would refresh all over again.
        Assert.Equal("gho_refreshed_token", sessions.Get(id)?.AccessToken);
        Assert.Equal("ghr_new_refresh", sessions.Get(id)?.RefreshToken);
    }

    [Fact]
    public async Task GitHubApp_drops_a_session_whose_refresh_is_refused()
    {
        var sessions = Sessions();
        var id = sessions.Create(new GitHubSession(
            "gho_stale", "ghr_refresh", DateTimeOffset.UtcNow.AddSeconds(-1), "octocat"));
        var oauth = new FakeOAuthClient
        {
            RefreshResult = new TokenResult(null, null, default, "bad_refresh_token"),
        };
        var provider = new GitHubAppTokenProvider(
            sessions, oauth, NullLogger<GitHubAppTokenProvider>.Instance);

        Assert.Null(await provider.GetTokenAsync(ContextWithSession(id)));
        Assert.Null(sessions.Get(id));
    }

    private static MemorySessionStore Sessions() => new(
        new MemoryCache(new MemoryCacheOptions()),
        DataProtectionProvider.Create(nameof(TokenProviderTests)),
        Options.Create(new GitHubOptions()));

    private static DefaultHttpContext ContextWithSession(string sessionId)
    {
        var context = new DefaultHttpContext();
        context.Request.Headers.Cookie = $"{SessionCookie.Name}={sessionId}";
        return context;
    }
}
