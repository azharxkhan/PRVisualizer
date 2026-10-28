namespace PrMap.Api.GitHub;

/// <summary>
/// Supplies the GitHub token for the current request. One implementation per auth mode, chosen
/// once at startup, so nothing downstream has to know how the instance is configured.
/// </summary>
public interface IGitHubTokenProvider
{
    /// <summary>Returns the token, or null to call GitHub unauthenticated.</summary>
    ValueTask<string?> GetTokenAsync(HttpContext context, CancellationToken cancellationToken = default);

    /// <summary>True when this mode can reach private repositories.</summary>
    bool SupportsPrivateRepositories { get; }
}
