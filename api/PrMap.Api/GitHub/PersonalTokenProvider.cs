using Microsoft.Extensions.Options;
using PrMap.Api.Configuration;

namespace PrMap.Api.GitHub;

/// <summary>
/// A single personal access token for a self-hosted instance serving one person. The token comes
/// from user-secrets locally and from the environment in production, never from configuration
/// files in the repository.
/// </summary>
public sealed class PersonalTokenProvider : IGitHubTokenProvider
{
    private readonly string _token;

    public PersonalTokenProvider(IOptions<GitHubOptions> options)
    {
        var token = options.Value.PersonalAccessToken;
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException(
                "GitHub:AuthMode is PersonalToken but GitHub:PersonalAccessToken is not set. " +
                "Set it with: dotnet user-secrets set \"GitHub:PersonalAccessToken\" \"<token>\" --project api/PrMap.Api");
        }

        _token = token;
    }

    public bool SupportsPrivateRepositories => true;

    public ValueTask<string?> GetTokenAsync(HttpContext context, CancellationToken cancellationToken = default)
        => ValueTask.FromResult<string?>(_token);
}
