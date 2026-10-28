using Microsoft.Extensions.Options;
using Octokit;
using PrMap.Api.Configuration;

namespace PrMap.Api.GitHub;

public sealed class GitHubClientFactory(
    IGitHubTokenProvider tokenProvider,
    IOptions<GitHubOptions> options) : IGitHubClientFactory
{
    private readonly ProductHeaderValue _product = new(options.Value.ProductName);

    public async ValueTask<IGitHubClient> CreateAsync(
        HttpContext context,
        CancellationToken cancellationToken = default)
    {
        var client = new GitHubClient(_product);
        var token = await tokenProvider.GetTokenAsync(context, cancellationToken);

        if (!string.IsNullOrEmpty(token))
        {
            client.Credentials = new Credentials(token);
        }

        return client;
    }
}
