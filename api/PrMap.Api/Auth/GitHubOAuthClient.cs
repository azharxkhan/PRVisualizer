using System.Net.Http.Headers;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using PrMap.Api.Configuration;

namespace PrMap.Api.Auth;

/// <summary>The result of exchanging a code or a refresh token.</summary>
/// <param name="AccessToken">Null when GitHub refused, in which case <paramref name="Error"/> says why.</param>
public sealed record TokenResult(
    string? AccessToken,
    string? RefreshToken,
    DateTimeOffset ExpiresAt,
    string? Error)
{
    public bool Succeeded => !string.IsNullOrEmpty(AccessToken);
}

public interface IGitHubOAuthClient
{
    Task<TokenResult> ExchangeCodeAsync(string code, CancellationToken cancellationToken = default);

    Task<TokenResult> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default);
}

/// <summary>
/// The two calls this app makes to GitHub's OAuth endpoints. The client secret is sent in the
/// request body to GitHub and nowhere else, and no part of either token is ever logged.
/// </summary>
public sealed class GitHubOAuthClient(HttpClient http, IOptions<GitHubOptions> options) : IGitHubOAuthClient
{
    private readonly GitHubOptions _options = options.Value;

    public Task<TokenResult> ExchangeCodeAsync(string code, CancellationToken cancellationToken = default) =>
        PostAsync(
            new Dictionary<string, string>
            {
                ["client_id"] = _options.ClientId ?? string.Empty,
                ["client_secret"] = _options.ClientSecret ?? string.Empty,
                ["grant_type"] = "authorization_code",
                ["code"] = code,
            },
            cancellationToken);

    public Task<TokenResult> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default) =>
        PostAsync(
            new Dictionary<string, string>
            {
                ["client_id"] = _options.ClientId ?? string.Empty,
                ["client_secret"] = _options.ClientSecret ?? string.Empty,
                ["grant_type"] = "refresh_token",
                ["refresh_token"] = refreshToken,
            },
            cancellationToken);

    private async Task<TokenResult> PostAsync(
        Dictionary<string, string> form,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, _options.TokenEndpoint)
        {
            Content = new FormUrlEncodedContent(form),
        };

        // Without this GitHub answers in form-encoding, whatever the documentation suggests.
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var response = await http.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            return new TokenResult(null, null, default, $"GitHub returned {(int)response.StatusCode}.");
        }

        var body = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken);

        if (body is null || string.IsNullOrEmpty(body.AccessToken))
        {
            // GitHub reports OAuth failures as 200 with an error field, not as a status code.
            return new TokenResult(null, null, default, body?.Error ?? "GitHub returned no token.");
        }

        return new TokenResult(
            body.AccessToken,
            body.RefreshToken,
            // A GitHub App's user token lasts eight hours unless expiry is turned off, in which
            // case no expires_in comes back and the token does not expire.
            body.ExpiresIn > 0
                ? DateTimeOffset.UtcNow.AddSeconds(body.ExpiresIn)
                : DateTimeOffset.MaxValue,
            null);
    }

    private sealed record TokenResponse(
        [property: JsonPropertyName("access_token")] string? AccessToken,
        [property: JsonPropertyName("refresh_token")] string? RefreshToken,
        [property: JsonPropertyName("expires_in")] int ExpiresIn,
        [property: JsonPropertyName("error_description")] string? Error);
}
