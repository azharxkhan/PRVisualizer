using PrMap.Api.GitHub;

namespace PrMap.Api.Tests;

/// <summary>
/// Phase 1 exercise. Remove the Skip from each fact as you make it pass. The assertions describe
/// behaviour rather than implementation, so how you page and map is your call.
/// </summary>
public class GitHubFileServiceTests
{
    private const string Todo = "Phase 1: implement GitHubFileService.GetFilesAsync";

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

    [Fact(Skip = Todo)]
    public void Returns_every_file_across_multiple_pages()
    {
        // Fake an IGitHubClient returning 100, then 100, then 40 files.
        // Expect 240 files back, in order, with Truncated false.
        Assert.Fail("Not implemented");
    }

    [Fact(Skip = Todo)]
    public void Sets_Truncated_once_the_GitHub_file_limit_is_reached()
    {
        // 3,000 files back means GitHub capped the response, and the banner needs to say so.
        Assert.Fail("Not implemented");
    }

    [Fact(Skip = Todo)]
    public void Maps_a_renamed_file_to_its_previous_filename()
    {
        // Octokit spells it PreviousFileName; our model spells it PreviousFilename.
        Assert.Fail("Not implemented");
    }

    [Fact(Skip = Todo)]
    public void Keeps_a_null_patch_null_for_binary_files()
    {
        // HasPatch must stay false so the diff panel can show its fallback.
        Assert.Fail("Not implemented");
    }
}
