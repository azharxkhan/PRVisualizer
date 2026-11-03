namespace PrMap.Api.Auth;

/// <summary>
/// What the server keeps for one signed-in user. None of it is ever sent to the browser; the
/// browser holds the session id that points here and nothing more.
/// </summary>
/// <param name="AccessToken">The user-to-server token, good for eight hours.</param>
/// <param name="RefreshToken">Swapped for a new access token when that one runs out.</param>
/// <param name="ExpiresAt">When <paramref name="AccessToken"/> stops working.</param>
/// <param name="Login">The GitHub username, the only part the UI gets to see.</param>
public sealed record GitHubSession(
    string AccessToken,
    string? RefreshToken,
    DateTimeOffset ExpiresAt,
    string Login);
