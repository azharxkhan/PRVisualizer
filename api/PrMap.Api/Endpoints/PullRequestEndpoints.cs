using PrMap.Api.GitHub;
using PrMap.Api.Models;

namespace PrMap.Api.Endpoints;

public static class PullRequestEndpoints
{
    public static IEndpointRouteBuilder MapPullRequestEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/prs").RequireRateLimiting("per-user");

        group.MapGet("/{owner}/{repo}/{number:int}/files", GetFiles)
            .WithName("GetPullRequestFiles");

        return app;
    }

    private static async Task<IResult> GetFiles(
        string owner,
        string repo,
        int number,
        IPullRequestFileService files,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        if (!PrReference.TryCreate(owner, repo, number, out var reference, out var error))
        {
            return Results.BadRequest(new { error });
        }

        var result = await files.GetFilesAsync(reference, context, cancellationToken);
        return Results.Ok(result);
    }
}
