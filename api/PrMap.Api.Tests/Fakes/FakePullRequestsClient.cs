using Octokit;

namespace PrMap.Api.Tests.Fakes;

/// <summary>
/// Returns a fixed file list from Files and records the options it was called with. Octokit does
/// the paging itself, so a fake has one list to give.
/// </summary>
public sealed class FakePullRequestsClient(IReadOnlyList<PullRequestFile> files) : IPullRequestsClient
{
    public ApiOptions? LastOptions { get; private set; }

    public int CallCount { get; private set; }

    public Task<IReadOnlyList<PullRequestFile>> Files(string owner, string name, int number, ApiOptions options)
    {
        CallCount++;
        LastOptions = options;
        return Task.FromResult(files);
    }

    public Task<IReadOnlyList<PullRequestFile>> Files(string owner, string name, int number) =>
        Files(owner, name, number, ApiOptions.None);

    public Task<IReadOnlyList<PullRequestFile>> Files(long repositoryId, int number) =>
        Files(string.Empty, string.Empty, number, ApiOptions.None);

    public Task<IReadOnlyList<PullRequestFile>> Files(long repositoryId, int number, ApiOptions options) =>
        Files(string.Empty, string.Empty, number, options);

    private static T NotUsed<T>() => throw new NotSupportedException(
        "FakePullRequestsClient only answers Files.");

    public IPullRequestReviewsClient Review => NotUsed<IPullRequestReviewsClient>();
    public IPullRequestReviewCommentsClient ReviewComment => NotUsed<IPullRequestReviewCommentsClient>();
    public IPullRequestReviewRequestsClient ReviewRequest => NotUsed<IPullRequestReviewRequestsClient>();
    public ILockUnlockClient LockUnlock => NotUsed<ILockUnlockClient>();

    public Task<PullRequest> Get(string owner, string name, int number) => NotUsed<Task<PullRequest>>();
    public Task<PullRequest> Get(long repositoryId, int number) => NotUsed<Task<PullRequest>>();
    public Task<IReadOnlyList<PullRequest>> GetAllForRepository(string owner, string name) => NotUsed<Task<IReadOnlyList<PullRequest>>>();
    public Task<IReadOnlyList<PullRequest>> GetAllForRepository(long repositoryId) => NotUsed<Task<IReadOnlyList<PullRequest>>>();
    public Task<IReadOnlyList<PullRequest>> GetAllForRepository(string owner, string name, ApiOptions options) => NotUsed<Task<IReadOnlyList<PullRequest>>>();
    public Task<IReadOnlyList<PullRequest>> GetAllForRepository(long repositoryId, ApiOptions options) => NotUsed<Task<IReadOnlyList<PullRequest>>>();
    public Task<IReadOnlyList<PullRequest>> GetAllForRepository(string owner, string name, PullRequestRequest request) => NotUsed<Task<IReadOnlyList<PullRequest>>>();
    public Task<IReadOnlyList<PullRequest>> GetAllForRepository(long repositoryId, PullRequestRequest request) => NotUsed<Task<IReadOnlyList<PullRequest>>>();
    public Task<IReadOnlyList<PullRequest>> GetAllForRepository(string owner, string name, PullRequestRequest request, ApiOptions options) => NotUsed<Task<IReadOnlyList<PullRequest>>>();
    public Task<IReadOnlyList<PullRequest>> GetAllForRepository(long repositoryId, PullRequestRequest request, ApiOptions options) => NotUsed<Task<IReadOnlyList<PullRequest>>>();
    public Task<PullRequest> Create(string owner, string name, NewPullRequest newPullRequest) => NotUsed<Task<PullRequest>>();
    public Task<PullRequest> Create(long repositoryId, NewPullRequest newPullRequest) => NotUsed<Task<PullRequest>>();
    public Task<PullRequest> Update(string owner, string name, int number, PullRequestUpdate pullRequestUpdate) => NotUsed<Task<PullRequest>>();
    public Task<PullRequest> Update(long repositoryId, int number, PullRequestUpdate pullRequestUpdate) => NotUsed<Task<PullRequest>>();
    public Task<PullRequestMerge> Merge(string owner, string name, int number, MergePullRequest mergePullRequest) => NotUsed<Task<PullRequestMerge>>();
    public Task<PullRequestMerge> Merge(long repositoryId, int number, MergePullRequest mergePullRequest) => NotUsed<Task<PullRequestMerge>>();
    public Task<bool> Merged(string owner, string name, int number) => NotUsed<Task<bool>>();
    public Task<bool> Merged(long repositoryId, int number) => NotUsed<Task<bool>>();
    public Task<IReadOnlyList<PullRequestCommit>> Commits(string owner, string name, int number) => NotUsed<Task<IReadOnlyList<PullRequestCommit>>>();
    public Task<IReadOnlyList<PullRequestCommit>> Commits(long repositoryId, int number) => NotUsed<Task<IReadOnlyList<PullRequestCommit>>>();
}
