namespace PrMap.Api.Models;

/// <summary>Everything the map needs for one pull request.</summary>
/// <param name="Files">The changed files, in the order GitHub returned them.</param>
/// <param name="Truncated">
/// True when GitHub capped the response at 3,000 files, so the map is showing a subset.
/// The frontend renders a banner when this is set.
/// </param>
public sealed record PullRequestFiles(IReadOnlyList<ChangedFile> Files, bool Truncated)
{
    public int FileCount => Files.Count;
    public int Additions => Files.Sum(f => f.Additions);
    public int Deletions => Files.Sum(f => f.Deletions);
}
