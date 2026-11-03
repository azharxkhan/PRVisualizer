using PrMap.Api.Auth;

namespace PrMap.Api.Tests.Fakes;

/// <summary>Stands in for GitHub's OAuth endpoints, so no test reaches the network.</summary>
public sealed class FakeOAuthClient : IGitHubOAuthClient
{
    public TokenResult CodeResult { get; set; } =
        new("gho_test_token", "ghr_test_refresh", DateTimeOffset.UtcNow.AddHours(8), null);

    public TokenResult RefreshResult { get; set; } =
        new("gho_refreshed_token", "ghr_new_refresh", DateTimeOffset.UtcNow.AddHours(8), null);

    public string? LastCode { get; private set; }

    public string? LastRefreshToken { get; private set; }

    public int RefreshCount { get; private set; }

    public Task<TokenResult> ExchangeCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        LastCode = code;
        return Task.FromResult(CodeResult);
    }

    public Task<TokenResult> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        RefreshCount++;
        LastRefreshToken = refreshToken;
        return Task.FromResult(RefreshResult);
    }
}
