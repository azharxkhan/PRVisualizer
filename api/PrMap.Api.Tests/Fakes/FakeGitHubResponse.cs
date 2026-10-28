using System.Net;
using Octokit;

namespace PrMap.Api.Tests.Fakes;

/// <summary>
/// The minimum an Octokit exception needs to be constructed. Octokit's own Response type is
/// internal, so tests that want to raise a GitHub failure have to supply their own.
/// </summary>
public sealed class FakeGitHubResponse(HttpStatusCode statusCode) : IResponse
{
    public object? Body => null;

    public IReadOnlyDictionary<string, string> Headers { get; } =
        new Dictionary<string, string>
        {
            ["X-RateLimit-Limit"] = "60",
            ["X-RateLimit-Remaining"] = "0",
            ["X-RateLimit-Reset"] = "1700000000",
        };

    public ApiInfo ApiInfo { get; } = new(
        new Dictionary<string, Uri>(),
        new List<string>(),
        new List<string>(),
        etag: null,
        new RateLimit(60, 0, 1700000000));

    public HttpStatusCode StatusCode { get; } = statusCode;

    public string ContentType => "application/json";
}
