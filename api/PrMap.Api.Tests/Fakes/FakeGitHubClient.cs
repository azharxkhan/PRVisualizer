using Octokit;

namespace PrMap.Api.Tests.Fakes;

/// <summary>
/// An <see cref="IGitHubClient"/> that answers pull-request file listings and nothing else.
/// Every other member throws, so a test that reaches past the one call under test fails loudly
/// instead of quietly returning null.
/// </summary>
public sealed class FakeGitHubClient(IPullRequestsClient pullRequests) : IGitHubClient
{
    public IPullRequestsClient PullRequest { get; } = pullRequests;

    private static T NotUsed<T>() => throw new NotSupportedException(
        "FakeGitHubClient only answers PullRequest.Files.");

    public IConnection Connection => NotUsed<IConnection>();
    public IActionsClient Actions => NotUsed<IActionsClient>();
    public IActivitiesClient Activity => NotUsed<IActivitiesClient>();
    public IAuthorizationsClient Authorization => NotUsed<IAuthorizationsClient>();
    public IChecksClient Check => NotUsed<IChecksClient>();
    public ICopilotClient Copilot => NotUsed<ICopilotClient>();
    public IDependencyGraphClient DependencyGraph => NotUsed<IDependencyGraphClient>();
    public IEnterpriseClient Enterprise => NotUsed<IEnterpriseClient>();
    public IGistsClient Gist => NotUsed<IGistsClient>();
    public IGitDatabaseClient Git => NotUsed<IGitDatabaseClient>();
    public IGitHubAppsClient GitHubApps => NotUsed<IGitHubAppsClient>();
    public IGitIgnoreClient GitIgnore => NotUsed<IGitIgnoreClient>();
    public IIssuesClient Issue => NotUsed<IIssuesClient>();
    public ILicensesClient Licenses => NotUsed<ILicensesClient>();
    public IMarkdownClient Markdown => NotUsed<IMarkdownClient>();
    public IMetaClient Meta => NotUsed<IMetaClient>();
    public IMigrationClient Migration => NotUsed<IMigrationClient>();
#pragma warning disable CS0618 // IMiscellaneousClient is obsolete, but the interface still requires it.
    public IMiscellaneousClient Miscellaneous => NotUsed<IMiscellaneousClient>();
#pragma warning restore CS0618
    public IEmojisClient Emojis => NotUsed<IEmojisClient>();
    public ICodespacesClient Codespaces => NotUsed<ICodespacesClient>();
    public IOauthClient Oauth => NotUsed<IOauthClient>();
    public IOrganizationsClient Organization => NotUsed<IOrganizationsClient>();
    public IPackagesClient Packages => NotUsed<IPackagesClient>();
    public IRateLimitClient RateLimit => NotUsed<IRateLimitClient>();
    public IReactionsClient Reaction => NotUsed<IReactionsClient>();
    public IRepositoriesClient Repository => NotUsed<IRepositoriesClient>();
    public ISearchClient Search => NotUsed<ISearchClient>();
    public IUsersClient User => NotUsed<IUsersClient>();
    public ICredentialStore CredentialStore => NotUsed<ICredentialStore>();
    public Credentials Credentials { get; set; } = Credentials.Anonymous;
    public Uri BaseAddress => NotUsed<Uri>();

    public ApiInfo GetLastApiInfo() => NotUsed<ApiInfo>();

    public void SetRequestTimeout(TimeSpan timeout) =>
        throw new NotSupportedException("FakeGitHubClient only answers PullRequest.Files.");
}
