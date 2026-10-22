using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using PrMap.Api.Configuration;
using PrMap.Api.Endpoints;
using PrMap.Api.GitHub;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddMemoryCache();

builder.Services
    .AddOptions<GitHubOptions>()
    .Bind(builder.Configuration.GetSection(GitHubOptions.SectionName));

// One token provider per auth mode, resolved once at startup. Nothing downstream branches on mode.
var authMode = builder.Configuration
    .GetSection(GitHubOptions.SectionName)
    .GetValue<GitHubAuthMode>(nameof(GitHubOptions.AuthMode));

switch (authMode)
{
    case GitHubAuthMode.PersonalToken:
        builder.Services.AddSingleton<IGitHubTokenProvider, PersonalTokenProvider>();
        break;
    case GitHubAuthMode.GitHubApp:
        builder.Services.AddSingleton<IGitHubTokenProvider, GitHubAppTokenProvider>();
        break;
    default:
        builder.Services.AddSingleton<IGitHubTokenProvider, AnonymousTokenProvider>();
        break;
}

builder.Services.AddSingleton<IGitHubClientFactory, GitHubClientFactory>();
builder.Services.AddScoped<IPullRequestFileService, GitHubFileService>();

builder.Services.AddRateLimiter(rateLimiter =>
{
    // The default rejection code is 503, which reads as "the server is broken" rather than
    // "you asked too often".
    rateLimiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    rateLimiter.AddPolicy("per-user", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.Identity?.Name
                ?? context.Connection.RemoteIpAddress?.ToString()
                ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
            }));
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseRateLimiter();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.MapPullRequestEndpoints();

app.Run();

/// <summary>Exposed so the test project can reference the API's types.</summary>
public partial class Program;
