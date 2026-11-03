namespace PrMap.Api.Auth;

/// <summary>
/// The one place the session cookie is written and read. It carries an opaque id and nothing
/// else: the GitHub token stays on the server, so no part of it ever reaches the browser.
/// </summary>
public static class SessionCookie
{
    public const string Name = "prmap_session";

    /// <summary>Holds the CSRF state between the redirect out to GitHub and the callback.</summary>
    public const string StateName = "prmap_oauth_state";

    public static string? Read(HttpContext context) =>
        context.Request.Cookies.TryGetValue(Name, out var id) && !string.IsNullOrEmpty(id) ? id : null;

    public static void Write(HttpContext context, string sessionId, TimeSpan lifetime) =>
        context.Response.Cookies.Append(Name, sessionId, Options(context, lifetime));

    public static void Clear(HttpContext context) =>
        context.Response.Cookies.Delete(Name, Options(context, TimeSpan.Zero));

    public static void WriteState(HttpContext context, string state) =>
        context.Response.Cookies.Append(StateName, state, Options(context, TimeSpan.FromMinutes(10)));

    public static string? ReadState(HttpContext context) =>
        context.Request.Cookies.TryGetValue(StateName, out var state) && !string.IsNullOrEmpty(state)
            ? state
            : null;

    public static void ClearState(HttpContext context) =>
        context.Response.Cookies.Delete(StateName, Options(context, TimeSpan.Zero));

    private static CookieOptions Options(HttpContext context, TimeSpan lifetime) => new()
    {
        // No script can read it, so an XSS hole cannot walk off with the session.
        HttpOnly = true,
        // Lax rather than Strict: the sign-in callback is a cross-site GET from github.com, and
        // Strict would withhold the cookie exactly then.
        SameSite = SameSiteMode.Lax,
        // Plain http is only ever the local dev server; anywhere else this must not travel.
        Secure = context.Request.IsHttps,
        Path = "/",
        MaxAge = lifetime > TimeSpan.Zero ? lifetime : null,
    };
}
