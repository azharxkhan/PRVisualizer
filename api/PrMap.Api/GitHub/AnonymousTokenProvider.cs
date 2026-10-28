using Microsoft.Extensions.Options;
using PrMap.Api.Configuration;

namespace PrMap.Api.GitHub;

/// <summary>
/// Public repositories only. Uses the instance-wide token when one is configured, purely to lift
/// the unauthenticated rate limit of 60 requests an hour. Never a per-user token.
/// </summary>
public sealed class AnonymousTokenProvider(IOptions<GitHubOptions> options) : IGitHubTokenProvider
{
    private readonly string? _token = string.IsNullOrWhiteSpace(options.Value.InstanceToken)
        ? null
        : options.Value.InstanceToken;

    public bool SupportsPrivateRepositories => false;

    public ValueTask<string?> GetTokenAsync(HttpContext context, CancellationToken cancellationToken = default)
        => ValueTask.FromResult(_token);
}
