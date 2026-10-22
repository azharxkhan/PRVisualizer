namespace PrMap.Api.Models;

/// <summary>One file touched by a pull request, as GitHub reports it.</summary>
/// <param name="Filename">Path relative to the repository root.</param>
/// <param name="Status">added, modified, removed, renamed, copied, changed or unchanged.</param>
/// <param name="Additions">Lines added.</param>
/// <param name="Deletions">Lines removed.</param>
/// <param name="Patch">The unified diff, or null for binary files and oversized diffs.</param>
/// <param name="PreviousFilename">The old path, set only when <paramref name="Status"/> is renamed.</param>
public sealed record ChangedFile(
    string Filename,
    string Status,
    int Additions,
    int Deletions,
    string? Patch,
    string? PreviousFilename)
{
    /// <summary>Total lines touched. The treemap uses this as box area.</summary>
    public int Changes => Additions + Deletions;

    /// <summary>True when GitHub returned no patch, so there is nothing to render in the diff panel.</summary>
    public bool HasPatch => !string.IsNullOrEmpty(Patch);
}
