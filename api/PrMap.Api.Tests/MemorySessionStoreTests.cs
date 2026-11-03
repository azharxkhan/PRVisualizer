using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using PrMap.Api.Auth;
using PrMap.Api.Configuration;

namespace PrMap.Api.Tests;

public class MemorySessionStoreTests
{
    private const string Token = "gho_a_very_secret_token";

    private readonly MemoryCache _cache = new(new MemoryCacheOptions());

    private MemorySessionStore Store() => new(
        _cache,
        DataProtectionProvider.Create(nameof(MemorySessionStoreTests)),
        Options.Create(new GitHubOptions()));

    private static GitHubSession Session(string token = Token) =>
        new(token, "ghr_refresh", DateTimeOffset.UtcNow.AddHours(8), "octocat");

    [Fact]
    public void A_stored_session_comes_back_whole()
    {
        var store = Store();
        var id = store.Create(Session());

        var found = store.Get(id);

        Assert.Equal(Token, found?.AccessToken);
        Assert.Equal("octocat", found?.Login);
    }

    [Fact]
    public void An_unknown_session_id_has_no_session()
    {
        Assert.Null(Store().Get("not-a-session"));
    }

    [Fact]
    public void A_removed_session_is_gone()
    {
        var store = Store();
        var id = store.Create(Session());

        store.Remove(id);

        Assert.Null(store.Get(id));
    }

    [Fact]
    public void Replace_swaps_the_token_without_changing_the_id()
    {
        var store = Store();
        var id = store.Create(Session());

        store.Replace(id, Session("gho_refreshed"));

        Assert.Equal("gho_refreshed", store.Get(id)?.AccessToken);
    }

    [Fact]
    public void Two_sessions_never_share_an_id()
    {
        var store = Store();

        Assert.NotEqual(store.Create(Session()), store.Create(Session()));
    }

    [Fact]
    public void What_lands_in_the_cache_is_not_the_token_in_the_clear()
    {
        var store = Store();
        var id = store.Create(Session());

        // Whatever the cache holds, a memory dump of it must not read as a GitHub token.
        var cached = Assert.IsType<string>(_cache.Get($"session:{id}"));

        Assert.DoesNotContain(Token, cached);
        Assert.DoesNotContain("ghr_refresh", cached);
        Assert.DoesNotContain("octocat", cached);
    }

    [Fact]
    public void A_session_id_is_long_enough_not_to_be_guessed()
    {
        var id = Store().Create(Session());

        Assert.Equal(64, id.Length);
        Assert.Matches("^[0-9a-f]+$", id);
    }
}
