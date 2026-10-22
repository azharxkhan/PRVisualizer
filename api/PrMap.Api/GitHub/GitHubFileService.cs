using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Octokit;
using PrMap.Api.Configuration;
using PrMap.Api.Models;

namespace PrMap.Api.GitHub;

public sealed class GitHubFileService(
    IGitHubClientFactory clientFactory,
    IMemoryCache cache,
    IOptions<GitHubOptions> options,
    ILogger<GitHubFileService> logger) : IPullRequestFileService
{
    /// <summary>GitHub returns at most this many files, however large the pull request is.</summary>
    public const int GitHubFileLimit = 3000;

    /// <summary>The largest page GitHub allows. Fewer round trips than the default of 30.</summary>
    public const int PageSize = 100;

    public Task<PullRequestFiles> GetFilesAsync(
        PrReference reference,
        HttpContext context,
        CancellationToken cancellationToken = default)
    {
        // TODO Phase 1 — this is yours.
        //
        // 1. Build a client:        var client = await clientFactory.CreateAsync(context, cancellationToken);
        // 2. One call does the paging:
        //    client.PullRequest.Files(reference.Owner, reference.Repo, reference.Number,
        //                             new ApiOptions { PageSize = PageSize })
        //    Octokit follows GitHub's Link headers to the end on its own. Verified against a
        //    6,779-file PR: GitHub caps the list at 3,000 and page 31 returns 200 with an empty
        //    array, so this terminates safely. PageSize only cuts the round trips from 100 to 30.
        // 3. Map each Octokit PullRequestFile to a ChangedFile. Note Octokit's property is
        //    PreviousFileName (capital N), and Patch is null for binary and oversized diffs.
        // 4. Set Truncated when the count reaches GitHubFileLimit.
        //
        // Then in Phase 5, wrap the whole thing in cache.GetOrCreateAsync keyed on
        // reference.ToString(), with options.Value.CacheDuration as the expiry.
        //
        // The fields above (cache, options, logger) are wired and ready; the compiler will warn
        // they are unused until you reach for them.
        throw new NotImplementedException(
            "GitHubFileService.GetFilesAsync is the Phase 1 exercise. See the TODO in this file.");
    }
}
