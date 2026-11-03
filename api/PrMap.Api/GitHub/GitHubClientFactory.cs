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
        var token = await tokenProvider.GetTokenAsync(context, cancellationToken);
        return string.IsNullOrEmpty(token) ? new GitHubClient(_product) : Create(token);
    }

    public IGitHubClient Create(string token) =>
        new GitHubClient(_product) { Credentials = new Credentials(token) };
}
