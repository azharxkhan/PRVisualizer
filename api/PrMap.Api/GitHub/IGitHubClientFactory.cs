using Octokit;

namespace PrMap.Api.GitHub;

/// <summary>Builds an Octokit client carrying whatever token the current mode supplies.</summary>
public interface IGitHubClientFactory
{
    ValueTask<IGitHubClient> CreateAsync(HttpContext context, CancellationToken cancellationToken = default);

    /// <summary>A client for one specific token, used during sign-in before a session exists.</summary>
    IGitHubClient Create(string token);
}
