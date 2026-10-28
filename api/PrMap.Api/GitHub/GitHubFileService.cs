using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Octokit;
using PrMap.Api.Configuration;
using PrMap.Api.Models;

namespace PrMap.Api.GitHub;

/// <remarks>
/// Phase 5 wraps the whole fetch in <c>cache.GetOrCreateAsync</c> keyed on the reference, with
/// <see cref="GitHubOptions.CacheDuration"/> as the expiry. Until then the cache and the options
/// are held but unread.
/// </remarks>
public sealed class GitHubFileService(
    IGitHubClientFactory clientFactory,
    IMemoryCache cache,
    IOptions<GitHubOptions> options,
    ILogger<GitHubFileService> logger) : IPullRequestFileService
{
    private readonly IMemoryCache _cache = cache;
    private readonly GitHubOptions _options = options.Value;

    /// <summary>GitHub returns at most this many files, however large the pull request is.</summary>
    public const int GitHubFileLimit = 3000;

    /// <summary>The largest page GitHub allows. Fewer round trips than the default of 30.</summary>
    public const int PageSize = 100;

    public async Task<PullRequestFiles> GetFilesAsync(
        PrReference reference,
        HttpContext context,
        CancellationToken cancellationToken = default)
    {
        var client = await clientFactory.CreateAsync(context, cancellationToken);

        // Octokit follows GitHub's Link headers to the end on its own. Verified against a
        // 6,779-file PR: GitHub caps the list at 3,000 and page 31 returns 200 with an empty
        // array, so this terminates. PageSize only cuts the round trips from 100 to 30.
        var raw = await client.PullRequest.Files(
            reference.Owner,
            reference.Repo,
            reference.Number,
            new ApiOptions { PageSize = PageSize });

        var files = new List<ChangedFile>(raw.Count);
        foreach (var file in raw)
        {
            files.Add(new ChangedFile(
                Filename: file.FileName,
                Status: file.Status,
                Additions: file.Additions,
                Deletions: file.Deletions,
                // Null for binary files and for diffs GitHub declines to render. Kept null so
                // the diff panel can tell "nothing to show" from an empty patch.
                Patch: file.Patch,
                PreviousFilename: file.PreviousFileName));
        }

        var truncated = files.Count >= GitHubFileLimit;
        if (truncated)
        {
            logger.LogInformation(
                "GitHub capped the file list for {Reference} at {Limit} files.",
                reference,
                GitHubFileLimit);
        }

        return new PullRequestFiles(files, truncated);
    }
}
