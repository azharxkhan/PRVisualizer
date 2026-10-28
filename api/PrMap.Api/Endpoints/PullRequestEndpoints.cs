using Octokit;
using PrMap.Api.GitHub;
using PrMap.Api.Models;

namespace PrMap.Api.Endpoints;

public static class PullRequestEndpoints
{
    public static IEndpointRouteBuilder MapPullRequestEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/prs").RequireRateLimiting("per-user");

        // The browser only ever has the link the user pasted, so the server owns URL parsing too.
        // Nothing in the frontend needs to know GitHub's URL shape.
        group.MapGet("/files", GetFilesByUrl)
            .WithName("GetPullRequestFilesByUrl");

        group.MapGet("/{owner}/{repo}/{number:int}/files", GetFiles)
            .WithName("GetPullRequestFiles");

        return app;
    }

    private static Task<IResult> GetFilesByUrl(
        string? url,
        IPullRequestFileService files,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        if (!PrReference.TryParseUrl(url, out var reference, out var error))
        {
            return Task.FromResult(Results.BadRequest(new { error }));
        }

        return Fetch(reference, files, context, cancellationToken);
    }

    private static Task<IResult> GetFiles(
        string owner,
        string repo,
        int number,
        IPullRequestFileService files,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        if (!PrReference.TryCreate(owner, repo, number, out var reference, out var error))
        {
            return Task.FromResult(Results.BadRequest(new { error }));
        }

        return Fetch(reference, files, context, cancellationToken);
    }

    private static async Task<IResult> Fetch(
        PrReference reference,
        IPullRequestFileService files,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await files.GetFilesAsync(reference, context, cancellationToken);
            return Results.Ok(result);
        }
        catch (NotFoundException)
        {
            // GitHub answers 404 both for a pull request that does not exist and for one this
            // token cannot see, and says nothing that tells the two apart. So neither does this.
            return Results.NotFound(new
            {
                error = "That pull request could not be found. It may be private, or the link may be wrong.",
            });
        }
        catch (RateLimitExceededException)
        {
            return Results.Json(
                new { error = "GitHub is busy, try again in a minute." },
                statusCode: StatusCodes.Status429TooManyRequests);
        }
        catch (ApiException)
        {
            // Anything else from GitHub. The detail is in the logs, not in the response: an
            // Octokit stack trace tells the user nothing they can act on.
            return Results.Json(
                new { error = "GitHub could not answer that request. Try again shortly." },
                statusCode: StatusCodes.Status502BadGateway);
        }
    }
}
