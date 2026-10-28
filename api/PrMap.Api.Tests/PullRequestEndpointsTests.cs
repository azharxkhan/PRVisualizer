using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Octokit;
using PrMap.Api.GitHub;
using PrMap.Api.Tests.Fakes;

namespace PrMap.Api.Tests;

/// <summary>
/// Drives the endpoints over HTTP with GitHub swapped out. A fresh factory per test keeps the
/// rate limiter's window from leaking between them: every test shares the "anonymous" partition,
/// because a test client has no remote IP address.
/// </summary>
public sealed class PullRequestEndpointsTests : IDisposable
{
    private readonly FakePullRequestFileService _files = new();
    private readonly WebApplicationFactory<Program> _factory;

    public PullRequestEndpointsTests()
    {
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
                services.Replace(ServiceDescriptor.Singleton<IPullRequestFileService>(_files))));
    }

    public void Dispose() => _factory.Dispose();

    private HttpClient Client() => _factory.CreateClient();

    [Fact]
    public async Task Health_reports_ok()
    {
        var response = await Client().GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("ok", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task A_pasted_pull_request_url_returns_its_files()
    {
        var response = await Client().GetAsync(
            "/api/prs/files?url=https://github.com/octocat/Hello-World/pull/42");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<FilesResponse>();
        Assert.Equal(1, body?.FileCount);
        Assert.Equal("octocat", _files.LastReference?.Owner);
        Assert.Equal("Hello-World", _files.LastReference?.Repo);
        Assert.Equal(42, _files.LastReference?.Number);
    }

    [Theory]
    // Another host, http rather than https, a repository link that is not a pull request,
    // a missing number, and nothing at all.
    [InlineData("https://example.com/octocat/Hello-World/pull/42")]
    [InlineData("http://github.com/octocat/Hello-World/pull/42")]
    [InlineData("https://github.com/octocat/Hello-World")]
    [InlineData("https://github.com/octocat/Hello-World/pull/")]
    [InlineData("")]
    public async Task A_link_that_is_not_a_github_pull_request_is_refused(string url)
    {
        var response = await Client().GetAsync($"/api/prs/files?url={Uri.EscapeDataString(url)}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.False(string.IsNullOrWhiteSpace(body?.Error));
        Assert.Equal(0, _files.CallCount);
    }

    [Fact]
    public async Task A_missing_url_is_refused_rather_than_reaching_github()
    {
        var response = await Client().GetAsync("/api/prs/files");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, _files.CallCount);
    }

    [Fact]
    public async Task The_path_route_still_answers()
    {
        var response = await Client().GetAsync("/api/prs/octocat/Hello-World/7/files");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(7, _files.LastReference?.Number);
    }

    [Fact]
    public async Task A_bad_owner_on_the_path_route_returns_the_validation_message()
    {
        var response = await Client().GetAsync("/api/prs/-nope/Hello-World/7/files");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.Contains("Owner", body?.Error);
        Assert.Equal(0, _files.CallCount);
    }

    [Fact]
    public async Task The_twenty_first_request_in_a_minute_is_rate_limited()
    {
        var client = Client();
        const string url = "/api/prs/files?url=https://github.com/octocat/Hello-World/pull/42";

        for (var i = 1; i <= 20; i++)
        {
            var allowed = await client.GetAsync(url);
            Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        }

        var refused = await client.GetAsync(url);

        // 429, not the rate limiter's default 503: the caller asked too often, nothing is broken.
        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
    }

    [Fact]
    public async Task A_pull_request_GitHub_cannot_find_gets_a_message_rather_than_a_stack_trace()
    {
        _files.Throws = new NotFoundException("repos/o/r/pulls/1/files was not found.", HttpStatusCode.NotFound);

        var response = await Client().GetAsync(
            "/api/prs/files?url=https://github.com/octocat/Hello-World/pull/404404");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.Contains("could not be found", body?.Error);
        Assert.DoesNotContain("Octokit", body?.Error);
        Assert.DoesNotContain("repos/", body?.Error);
    }

    [Fact]
    public async Task GitHubs_own_rate_limit_is_reported_as_GitHub_being_busy()
    {
        _files.Throws = new RateLimitExceededException(
            new FakeGitHubResponse(HttpStatusCode.Forbidden));

        var response = await Client().GetAsync(
            "/api/prs/files?url=https://github.com/octocat/Hello-World/pull/42");

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.Contains("GitHub is busy", body?.Error);
    }

    [Fact]
    public async Task Any_other_GitHub_failure_is_reported_without_its_detail()
    {
        _files.Throws = new ApiException("secret internal detail", HttpStatusCode.InternalServerError);

        var response = await Client().GetAsync(
            "/api/prs/files?url=https://github.com/octocat/Hello-World/pull/42");

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.DoesNotContain("secret", body?.Error);
    }

    private sealed record FilesResponse(int FileCount, bool Truncated);

    private sealed record ErrorResponse(string Error);
}
