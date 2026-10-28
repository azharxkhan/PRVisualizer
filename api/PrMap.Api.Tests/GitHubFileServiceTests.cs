using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Octokit;
using PrMap.Api.Configuration;
using PrMap.Api.GitHub;
using PrMap.Api.Models;
using PrMap.Api.Tests.Fakes;

namespace PrMap.Api.Tests;

/// <summary>
/// The assertions describe behaviour rather than implementation, so how the service pages and
/// maps is its own business.
/// </summary>
public class GitHubFileServiceTests
{
    private static readonly PrReference Reference = Pr("octocat", "hello-world", 1);

    [Fact]
    public void The_page_size_is_the_largest_GitHub_allows()
    {
        // The default of 30 would triple the round trips on a large pull request.
        Assert.Equal(100, GitHubFileService.PageSize);
    }

    [Fact]
    public void The_file_limit_matches_what_GitHub_will_return()
    {
        Assert.Equal(3000, GitHubFileService.GitHubFileLimit);
    }

    [Fact]
    public async Task Returns_every_file_across_multiple_pages()
    {
        // Octokit follows the Link headers itself, so "every page" arrives as one list of 240.
        var github = new FakePullRequestsClient(
            Enumerable.Range(0, 240).Select(i => File($"src/file{i}.cs")).ToList());

        var result = await Service(github).GetFilesAsync(Reference, new DefaultHttpContext());

        Assert.Equal(240, result.FileCount);
        Assert.False(result.Truncated);
        Assert.Equal("src/file0.cs", result.Files[0].Filename);
        Assert.Equal("src/file239.cs", result.Files[239].Filename);
    }

    [Fact]
    public async Task Asks_GitHub_for_the_largest_page_it_allows()
    {
        var github = new FakePullRequestsClient([File("src/one.cs")]);

        await Service(github).GetFilesAsync(Reference, new DefaultHttpContext());

        Assert.Equal(1, github.CallCount);
        Assert.Equal(GitHubFileService.PageSize, github.LastOptions?.PageSize);
    }

    [Fact]
    public async Task Sums_the_additions_and_deletions_across_files()
    {
        var github = new FakePullRequestsClient(
        [
            File("src/one.cs", additions: 10, deletions: 2),
            File("src/two.cs", additions: 5, deletions: 3),
        ]);

        var result = await Service(github).GetFilesAsync(Reference, new DefaultHttpContext());

        Assert.Equal(15, result.Additions);
        Assert.Equal(5, result.Deletions);
        Assert.Equal(12, result.Files[0].Changes);
    }

    [Fact]
    public async Task Sets_Truncated_once_the_GitHub_file_limit_is_reached()
    {
        // 3,000 files back means GitHub capped the response, and the banner needs to say so.
        var github = new FakePullRequestsClient(
            Enumerable.Range(0, GitHubFileService.GitHubFileLimit)
                .Select(i => File($"src/file{i}.cs"))
                .ToList());

        var result = await Service(github).GetFilesAsync(Reference, new DefaultHttpContext());

        Assert.True(result.Truncated);
        Assert.Equal(GitHubFileService.GitHubFileLimit, result.FileCount);
    }

    [Fact]
    public async Task Leaves_Truncated_false_just_below_the_limit()
    {
        var github = new FakePullRequestsClient(
            Enumerable.Range(0, GitHubFileService.GitHubFileLimit - 1)
                .Select(i => File($"src/file{i}.cs"))
                .ToList());

        var result = await Service(github).GetFilesAsync(Reference, new DefaultHttpContext());

        Assert.False(result.Truncated);
    }

    [Fact]
    public async Task Maps_a_renamed_file_to_its_previous_filename()
    {
        // Octokit spells it PreviousFileName; our model spells it PreviousFilename.
        var github = new FakePullRequestsClient(
        [
            File("src/new-name.cs", status: "renamed", previousFileName: "src/old-name.cs"),
        ]);

        var file = (await Service(github).GetFilesAsync(Reference, new DefaultHttpContext())).Files[0];

        Assert.Equal("renamed", file.Status);
        Assert.Equal("src/new-name.cs", file.Filename);
        Assert.Equal("src/old-name.cs", file.PreviousFilename);
    }

    [Fact]
    public async Task Leaves_PreviousFilename_null_for_an_ordinary_edit()
    {
        var github = new FakePullRequestsClient([File("src/one.cs")]);

        var file = (await Service(github).GetFilesAsync(Reference, new DefaultHttpContext())).Files[0];

        Assert.Null(file.PreviousFilename);
    }

    [Fact]
    public async Task Keeps_a_null_patch_null_for_binary_files()
    {
        // HasPatch must stay false so the diff panel can show its fallback.
        var github = new FakePullRequestsClient([File("docs/logo.png", patch: null)]);

        var file = (await Service(github).GetFilesAsync(Reference, new DefaultHttpContext())).Files[0];

        Assert.Null(file.Patch);
        Assert.False(file.HasPatch);
    }

    [Fact]
    public async Task Keeps_the_patch_when_GitHub_sends_one()
    {
        var github = new FakePullRequestsClient([File("src/one.cs", patch: "@@ -1 +1 @@\n-a\n+b")]);

        var file = (await Service(github).GetFilesAsync(Reference, new DefaultHttpContext())).Files[0];

        Assert.True(file.HasPatch);
        Assert.Contains("+b", file.Patch);
    }

    private static GitHubFileService Service(IPullRequestsClient pullRequests) =>
        new(new FakeGitHubClientFactory(new FakeGitHubClient(pullRequests)),
            new MemoryCache(new MemoryCacheOptions()),
            Options.Create(new GitHubOptions()),
            NullLogger<GitHubFileService>.Instance);

    private static PullRequestFile File(
        string fileName,
        string status = "modified",
        int additions = 1,
        int deletions = 1,
        string? patch = "@@ -1 +1 @@",
        string? previousFileName = null) =>
        new(
            sha: "0000000",
            fileName: fileName,
            status: status,
            additions: additions,
            deletions: deletions,
            changes: additions + deletions,
            blobUrl: "https://github.com/blob",
            rawUrl: "https://github.com/raw",
            contentsUrl: "https://api.github.com/contents",
            patch: patch,
            previousFileName: previousFileName);

    private static PrReference Pr(string owner, string repo, int number)
    {
        Assert.True(PrReference.TryCreate(owner, repo, number, out var reference, out _));
        return reference;
    }
}
