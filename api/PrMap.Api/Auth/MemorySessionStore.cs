using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using PrMap.Api.Configuration;

namespace PrMap.Api.Auth;

/// <summary>
/// Sessions in memory, each encrypted with Data Protection before it is cached, so a memory dump
/// or a cache provider swapped for a shared one never exposes a token in the clear. A restart
/// signs everyone out, which for a tool that is usually one person on one box is acceptable.
/// </summary>
public sealed class MemorySessionStore : ISessionStore
{
    private const string Purpose = "PrMap.GitHubSession.v1";

    private readonly IMemoryCache _cache;
    private readonly IDataProtector _protector;
    private readonly TimeSpan _lifetime;

    public MemorySessionStore(
        IMemoryCache cache,
        IDataProtectionProvider dataProtection,
        IOptions<GitHubOptions> options)
    {
        _cache = cache;
        _protector = dataProtection.CreateProtector(Purpose);
        _lifetime = options.Value.SessionLifetime;
    }

    public string Create(GitHubSession session)
    {
        // 256 bits of randomness, so a session id cannot be guessed into.
        var sessionId = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        Store(sessionId, session);
        return sessionId;
    }

    public GitHubSession? Get(string sessionId)
    {
        if (!_cache.TryGetValue(Key(sessionId), out string? protectedSession) || protectedSession is null)
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<GitHubSession>(_protector.Unprotect(protectedSession));
        }
        catch (Exception exception) when (exception is CryptographicException or JsonException)
        {
            // Keys rotated, or the payload is not ours. Either way there is no session here.
            Remove(sessionId);
            return null;
        }
    }

    public void Replace(string sessionId, GitHubSession session) => Store(sessionId, session);

    public void Remove(string sessionId) => _cache.Remove(Key(sessionId));

    private void Store(string sessionId, GitHubSession session) =>
        _cache.Set(
            Key(sessionId),
            _protector.Protect(JsonSerializer.Serialize(session)),
            new MemoryCacheEntryOptions { SlidingExpiration = _lifetime });

    private static string Key(string sessionId) => $"session:{sessionId}";
}
