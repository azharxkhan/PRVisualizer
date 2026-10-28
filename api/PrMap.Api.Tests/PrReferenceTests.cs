using PrMap.Api.Models;

namespace PrMap.Api.Tests;

public class PrReferenceTests
{
    [Theory]
    [InlineData("azharxkhan", "PRVisualizer", 42)]
    [InlineData("a", "b", 1)]
    [InlineData("my-org", "repo.name_v2", 2147483647)]
    public void TryCreate_accepts_valid_parts(string owner, string repo, int number)
    {
        Assert.True(PrReference.TryCreate(owner, repo, number, out var reference, out var error));
        Assert.Null(error);
        Assert.Equal(owner, reference.Owner);
        Assert.Equal(repo, reference.Repo);
        Assert.Equal(number, reference.Number);
    }

    [Theory]
    [InlineData("", "repo", 1)]
    [InlineData("-leading", "repo", 1)]
    [InlineData("trailing-", "repo", 1)]
    [InlineData("double--hyphen", "repo", 1)]
    [InlineData("has space", "repo", 1)]
    [InlineData("has/slash", "repo", 1)]
    public void TryCreate_rejects_bad_owner(string owner, string repo, int number)
    {
        Assert.False(PrReference.TryCreate(owner, repo, number, out _, out var error));
        Assert.Contains("Owner", error);
    }

    [Fact]
    public void TryCreate_rejects_owner_over_39_characters()
    {
        Assert.False(PrReference.TryCreate(new string('a', 40), "repo", 1, out _, out _));
    }

    [Theory]
    [InlineData("")]
    [InlineData("has space")]
    [InlineData("has/slash")]
    public void TryCreate_rejects_bad_repo(string repo)
    {
        Assert.False(PrReference.TryCreate("owner", repo, 1, out _, out var error));
        Assert.Contains("Repository", error);
    }

    [Fact]
    public void TryCreate_rejects_repo_over_100_characters()
    {
        Assert.False(PrReference.TryCreate("owner", new string('a', 101), 1, out _, out _));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(int.MinValue)]
    public void TryCreate_rejects_non_positive_number(int number)
    {
        Assert.False(PrReference.TryCreate("owner", "repo", number, out _, out var error));
        Assert.Contains("positive", error);
    }

    [Theory]
    [InlineData("https://github.com/azharxkhan/PRVisualizer/pull/42")]
    [InlineData("https://github.com/azharxkhan/PRVisualizer/pull/42/")]
    [InlineData("  https://GITHUB.com/azharxkhan/PRVisualizer/pull/42  ")]
    public void TryParseUrl_accepts_pull_request_links(string url)
    {
        Assert.True(PrReference.TryParseUrl(url, out var reference, out _));
        Assert.Equal("azharxkhan", reference.Owner);
        Assert.Equal("PRVisualizer", reference.Repo);
        Assert.Equal(42, reference.Number);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not a url")]
    [InlineData("http://github.com/owner/repo/pull/1")]
    [InlineData("https://gitlab.com/owner/repo/pull/1")]
    [InlineData("https://github.com.evil.example/owner/repo/pull/1")]
    [InlineData("https://github.com/owner/repo/issues/1")]
    [InlineData("https://github.com/owner/repo/pull/42/files")]
    [InlineData("https://github.com/owner/repo")]
    [InlineData("https://github.com/owner/repo/pull/abc")]
    public void TryParseUrl_rejects_everything_else(string? url)
    {
        Assert.False(PrReference.TryParseUrl(url, out _, out var error));
        Assert.False(string.IsNullOrWhiteSpace(error));
    }

    [Fact]
    public void TryParseUrl_rejects_a_number_too_large_for_int()
    {
        Assert.False(PrReference.TryParseUrl("https://github.com/owner/repo/pull/99999999999", out _, out _));
    }

    [Fact]
    public void ToString_is_the_familiar_short_form()
    {
        Assert.True(PrReference.TryCreate("azharxkhan", "PRVisualizer", 42, out var reference, out _));
        Assert.Equal("azharxkhan/PRVisualizer#42", reference.ToString());
    }
}
