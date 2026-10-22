using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using PrMap.Api.Configuration;
using PrMap.Api.GitHub;

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
    public async Task GitHubApp_is_not_built_yet_and_says_so()
    {
        var provider = new GitHubAppTokenProvider();
        await Assert.ThrowsAsync<NotSupportedException>(
            async () => await provider.GetTokenAsync(new DefaultHttpContext()));
    }
}
