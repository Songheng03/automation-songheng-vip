# MCPList Submission Guide

## Directory Information

- **Directory Name:** MCPList
- **Repository:** https://github.com/tomsmithtld/mcplist
- **Website:** https://mcplist.dev (currently parked/redirecting)
- **Submission Method:** GitHub PR to `data/servers.json`

## Research Findings

MCPList is a curated directory of MCP servers hosted as a GitHub repository (`tomsmithtld/mcplist`). The directory is a Next.js application that reads from a single data file `data/servers.json`.

### Submission Methods Available

1. **GitHub Pull Request (Primary Method)** - Fork the repository, edit `data/servers.json`, and submit a PR
2. **Direct Edit on GitHub** - Use GitHub's web interface to edit the file and create a PR
3. **No API** - There is no public API for automated submission
4. **No Web Form** - The website domain is parked and does not serve a submission form

## Instructions for Manual Submission

1. Go to https://github.com/tomsmithtld/mcplist
2. Fork the repository to your GitHub account
3. Navigate to `data/servers.json`
4. Add the following entry to the `"servers"` array (at the end, before the closing `]`):

```json
{
  "id": "my-automaton",
  "name": "my-automaton",
  "description": "An autonomous agent MCP server for automation tasks including web scraping, data extraction, and automated workflows.",
  "category": "browser-automation",
  "author": "Automaton Colony",
  "authorUrl": "https://automation.songheng.vip",
  "githubUrl": "",
  "installCommand": "",
  "isOfficial": false,
  "tags": ["automation", "agent", "web-scraping", "workflow"],
  "bestFor": ["Web scraping", "Data extraction", "Automated workflows"],
  "rating": 3,
  "stars": 0,
  "forks": 0,
  "openIssues": 0,
  "lastUpdated": "2026-06-17",
  "language": "",
  "license": "MIT",
  "score": 0
}
```

5. Commit the change and create a Pull Request back to the original repository
6. The maintainers will review and merge the PR

## Notes

- The server entry was generated from `listing-metadata.json` metadata
- Some fields (githubUrl, installCommand, stars, forks, openIssues, language) are empty/zero because this server is not hosted on GitHub
- The `category` was chosen as "browser-automation" as the closest match for automation/web scraping tools
- Score will be calculated automatically by MCPList
