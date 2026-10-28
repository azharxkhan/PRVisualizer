using Microsoft.AspNetCore.Http;
using PrMap.Api.GitHub;
using PrMap.Api.Models;

namespace PrMap.Api.Tests.Fakes;

/// <summary>
/// Stands in for the real service so endpoint tests never reach GitHub. Records the reference it
/// was handed, which is how those tests check that URL parsing produced the right one.
/// </summary>
public sealed class FakePullRequestFileService : IPullRequestFileService
{
    /// <summary>Set to make the service fail the way GitHub would.</summary>
    public Exception? Throws { get; set; }

    public PrReference? LastReference { get; private set; }

    public int CallCount { get; private set; }

    public Task<PullRequestFiles> GetFilesAsync(
        PrReference reference,
        HttpContext context,
        CancellationToken cancellationToken = default)
    {
        CallCount++;
        LastReference = reference;

        if (Throws is not null)
        {
            return Task.FromException<PullRequestFiles>(Throws);
        }

        return Task.FromResult(new PullRequestFiles(
            [new ChangedFile("src/one.cs", "modified", 3, 1, "@@ -1 +1 @@", null)],
            Truncated: false));
    }
}
