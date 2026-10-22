# PRVisualizer

AI tools write big pull requests fast, and GitHub shows them as one long flat list of files.
PRVisualizer takes a PR link and draws a clickable map of every changed file, grouped by folder
and sized by how much changed. No AI - just GitHub's own data drawn better.

**Status: Phase 0 (skeleton)**

## Run locally

Backend (.NET 10 SDK required):

```bash
dotnet run --project api/PrMap.Api
```

Frontend (Node LTS):

```bash
cd web
npm install
npm run dev
```

The Vite dev server proxies `/api` to the API's HTTPS port, so there are no CORS rules to set.
If the API's port differs from the one in `web/vite.config.ts`, update it from
`api/PrMap.Api/Properties/launchSettings.json`.

Open the Vite URL and the page should show "API ok".

## Stack

- .NET 10 Web API with Octokit for GitHub calls
- React + TypeScript via Vite, `d3-hierarchy` for the treemap layout
- xUnit for API tests, GitHub Actions for CI
