using Microsoft.AspNetCore.Http;
using Octokit;
using PrMap.Api.GitHub;

namespace PrMap.Api.Tests.Fakes;

public sealed class FakeGitHubClientFactory(IGitHubClient client) : IGitHubClientFactory
{
    /// <summary>The token the sign-in flow handed over, for tests that check it was used.</summary>
    public string? LastToken { get; private set; }

    public ValueTask<IGitHubClient> CreateAsync(
        HttpContext context,
        CancellationToken cancellationToken = default) => ValueTask.FromResult(client);

    public IGitHubClient Create(string token)
    {
        LastToken = token;
        return client;
    }
}
