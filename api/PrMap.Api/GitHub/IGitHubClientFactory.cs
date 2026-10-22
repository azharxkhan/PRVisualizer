using Octokit;

namespace PrMap.Api.GitHub;

/// <summary>Builds an Octokit client carrying whatever token the current mode supplies.</summary>
public interface IGitHubClientFactory
{
    ValueTask<IGitHubClient> CreateAsync(HttpContext context, CancellationToken cancellationToken = default);
}
