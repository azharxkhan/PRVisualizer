using System.Diagnostics.CodeAnalysis;
using System.Text.RegularExpressions;

namespace PrMap.Api.Models;

/// <summary>
/// A validated pointer to one pull request. Constructing one is the only way into the GitHub
/// calls, so nothing unvalidated can reach the API.
/// </summary>
public sealed partial record PrReference
{
    private PrReference(string owner, string repo, int number)
    {
        Owner = owner;
        Repo = repo;
        Number = number;
    }

    public string Owner { get; }
    public string Repo { get; }
    public int Number { get; }

    /// <summary>GitHub usernames: 1-39 characters, alphanumeric or single hyphens, no hyphen at either end.</summary>
    [GeneratedRegex(@"^[A-Za-z0-9](?:[A-Za-z0-9]|-(?![-]))*$", RegexOptions.CultureInvariant)]
    private static partial Regex OwnerPattern { get; }

    /// <summary>Repository names: 1-100 characters of letters, digits, hyphen, underscore or dot.</summary>
    [GeneratedRegex(@"^[A-Za-z0-9._-]+$", RegexOptions.CultureInvariant)]
    private static partial Regex RepoPattern { get; }

    [GeneratedRegex(@"^/(?<owner>[^/]+)/(?<repo>[^/]+)/pull/(?<number>\d+)/?$", RegexOptions.CultureInvariant)]
    private static partial Regex PullUrlPath { get; }

    /// <summary>Validates the three parts. <paramref name="error"/> is safe to return to the caller.</summary>
    public static bool TryCreate(
        string? owner,
        string? repo,
        int number,
        [NotNullWhen(true)] out PrReference? reference,
        [NotNullWhen(false)] out string? error)
    {
        reference = null;

        if (string.IsNullOrEmpty(owner) || owner.Length > 39 || !OwnerPattern.IsMatch(owner) || owner.EndsWith('-'))
        {
            error = "Owner must be 1 to 39 characters of letters, digits and single hyphens, not starting or ending with a hyphen.";
            return false;
        }

        if (string.IsNullOrEmpty(repo) || repo.Length > 100 || !RepoPattern.IsMatch(repo))
        {
            error = "Repository must be 1 to 100 characters of letters, digits, hyphens, underscores or dots.";
            return false;
        }

        if (number < 1)
        {
            error = "Pull request number must be a positive whole number.";
            return false;
        }

        reference = new PrReference(owner, repo, number);
        error = null;
        return true;
    }

    /// <summary>
    /// Parses a pasted pull request URL. Only https://github.com/{owner}/{repo}/pull/{number} is
    /// accepted: no other host, no other path shape, no query or fragment carried through.
    /// </summary>
    public static bool TryParseUrl(
        string? url,
        [NotNullWhen(true)] out PrReference? reference,
        [NotNullWhen(false)] out string? error)
    {
        reference = null;

        if (string.IsNullOrWhiteSpace(url) ||
            !Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri))
        {
            error = "Paste a full pull request URL, for example https://github.com/owner/repo/pull/42.";
            return false;
        }

        if (uri.Scheme != Uri.UriSchemeHttps ||
            !string.Equals(uri.Host, "github.com", StringComparison.OrdinalIgnoreCase))
        {
            error = "Only https://github.com pull request links are supported.";
            return false;
        }

        var match = PullUrlPath.Match(uri.AbsolutePath);
        if (!match.Success)
        {
            error = "That link is not a pull request. Expected https://github.com/owner/repo/pull/42.";
            return false;
        }

        if (!int.TryParse(match.Groups["number"].Value, out var number))
        {
            error = "That pull request number is too large.";
            return false;
        }

        return TryCreate(match.Groups["owner"].Value, match.Groups["repo"].Value, number, out reference, out error);
    }

    public override string ToString() => $"{Owner}/{Repo}#{Number}";
}
