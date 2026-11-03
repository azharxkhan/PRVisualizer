namespace PrMap.Api.Auth;

public interface ISessionStore
{
    /// <summary>Stores a session and returns the opaque id the cookie will carry.</summary>
    string Create(GitHubSession session);

    GitHubSession? Get(string sessionId);

    /// <summary>Replaces a session in place, for a refreshed token.</summary>
    void Replace(string sessionId, GitHubSession session);

    void Remove(string sessionId);
}
