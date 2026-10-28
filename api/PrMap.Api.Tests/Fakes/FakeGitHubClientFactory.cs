using Microsoft.AspNetCore.Http;
using Octokit;
using PrMap.Api.GitHub;

namespace PrMap.Api.Tests.Fakes;

public sealed class FakeGitHubClientFactory(IGitHubClient client) : IGitHubClientFactory
{
    public ValueTask<IGitHubClient> CreateAsync(
        HttpContext context,
        CancellationToken cancellationToken = default) => ValueTask.FromResult(client);
}
