using PrMap.Api.Models;

namespace PrMap.Api.GitHub;

public interface IPullRequestFileService
{
    /// <summary>Fetches every changed file for the pull request, paging until GitHub runs out.</summary>
    Task<PullRequestFiles> GetFilesAsync(
        PrReference reference,
        HttpContext context,
        CancellationToken cancellationToken = default);
}
