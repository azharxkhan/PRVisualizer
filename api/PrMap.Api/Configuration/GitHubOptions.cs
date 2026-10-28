namespace PrMap.Api.Configuration;

/// <summary>Where the GitHub token comes from. Chosen by configuration, not by code paths.</summary>
public enum GitHubAuthMode
{
    /// <summary>Public repositories only. Uses <see cref="GitHubOptions.InstanceToken"/> if set.</summary>
    Anonymous,

    /// <summary>A single personal access token, for a self-hosted instance serving one person.</summary>
    PersonalToken,

    /// <summary>Per-user tokens from a GitHub App sign-in. Phase 5.</summary>
    GitHubApp,
}

public sealed class GitHubOptions
{
    public const string SectionName = "GitHub";

    public GitHubAuthMode AuthMode { get; set; } = GitHubAuthMode.Anonymous;

    /// <summary>
    /// Optional token used in <see cref="GitHubAuthMode.Anonymous"/> mode. Without one the GitHub
    /// API allows only 60 requests an hour per IP, which one large pull request can exhaust.
    /// </summary>
    public string? InstanceToken { get; set; }

    /// <summary>The personal access token used in <see cref="GitHubAuthMode.PersonalToken"/> mode.</summary>
    public string? PersonalAccessToken { get; set; }

    public string? ClientId { get; set; }
    public string? ClientSecret { get; set; }

    /// <summary>Sent as the User-Agent. GitHub rejects requests without one.</summary>
    public string ProductName { get; set; } = "PRVisualizer";

    /// <summary>How long a fetched file list stays cached.</summary>
    public TimeSpan CacheDuration { get; set; } = TimeSpan.FromMinutes(5);
}
