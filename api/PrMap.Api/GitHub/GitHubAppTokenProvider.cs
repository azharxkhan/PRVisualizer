namespace PrMap.Api.GitHub;

/// <summary>
/// Per-user tokens from a GitHub App sign-in, decrypted from the session. Phase 5.
/// </summary>
/// <remarks>
/// When this is built: the token is stored server-side encrypted with ASP.NET Core Data
/// Protection and looked up by the session cookie. It never reaches the browser.
/// </remarks>
public sealed class GitHubAppTokenProvider : IGitHubTokenProvider
{
    public bool SupportsPrivateRepositories => true;

    public ValueTask<string?> GetTokenAsync(HttpContext context, CancellationToken cancellationToken = default)
        => throw new NotSupportedException("GitHub App sign-in arrives in Phase 5. Use PersonalToken mode for private repositories until then.");
}
