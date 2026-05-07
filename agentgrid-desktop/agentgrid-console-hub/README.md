# AgentGrid Desktop Download Site

Marketing and download site for AgentGrid, a local desktop workspace for running AI coding CLIs side by side in real terminal panes.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm test`

## Deployment env

- `VITE_AGENTGRID_DOWNLOAD_WINDOWS_URL`: direct Windows installer URL. If omitted, the site links to GitHub releases instead of showing a fake download.
- `VITE_AGENTGRID_VERSION`: optional release label shown in the download section.
- `VITE_AGENTGRID_RELEASE_NOTES_URL`: optional release-notes URL. Defaults to GitHub releases.
