# Privacy, by construction

HTML Artifact Viewer has no accounts, backend, analytics, telemetry, or runtime dependencies. Its runtime code contains no network client. It never reads, copies, uploads, or stores an HTML response body.

## What happens to a file

1. Your browser makes its normal request to GitHub's raw host.
2. For configured repositories, the browser applies the extension's declarative response-header rules.
3. The browser renders the response it received without a preview server. The extension does not send the document to a third party; explicitly trusted artifact scripts can transmit data as described below.

GitHub authentication and private raw links remain GitHub's responsibility. This extension does not ask for OAuth, cookies, a personal access token, or repository credentials. It does not grant access to any file. Normal browser history and GitHub request handling are unchanged.

## What is stored

Only the enabled setting, repository allowlist, and explicit per-repository script opt-ins, in `storage.local`. They remain in this browser profile and are not synced. Full file URLs, access tokens, artifact contents, and browsing history are not stored by the extension. Removing the extension removes its local settings.

## Permissions

- `declarativeNetRequestWithHostAccess`: tells the browser which response headers to change. It does not expose response bodies to the extension.
- `https://raw.githubusercontent.com/*`: limits host access to GitHub's raw host. Browser host permissions operate at host level; the configured allowlist constrains rendering to selected repositories and top-level HTML files.
- `storage`: remembers local configuration.

No content scripts, GitHub API access, external message handlers, advertising code, or remotely loaded extension code.

## What an artifact can do

Artifacts render in an opaque-origin sandbox with inline styles and embedded images, fonts, and media. JavaScript is blocked by default. You can explicitly allow inline scripts for individual configured repositories. Cookies, normal browser storage, external resources, fetch/XHR, frames, and form submission are blocked by the preview policy. The artifact has no extension API privileges.

**Downloads stay blocked in every repository, whether scripts are enabled or not.** This includes automatic downloads, download links, and exports triggered by clicking a button inside an artifact (for example, “Download CSV”). A user click does not bypass the restriction. There is no download setting in this version. The browser’s own Save Page As command is separate from artifact exports; locally opened copies are outside this extension’s sandbox and script settings.

Enabling scripts is a trust decision for every matching file, branch, and revision in that repository. A trusted script can read the currently opened document and its private raw URL token, then transmit them to another site by navigating its own tab. The no-referrer policy does not prevent a script from explicitly putting data in a destination URL. Only enable scripts for content you trust.

Scripts-off prevents that script-based attack but does not guarantee that HTML can never make a browser request; links can still navigate. This is not a malware-analysis tool. The extension's own code does not transmit document contents.

Upgrading from v0.1 retains configured repositories but does not grant them script permission. Reload previously opened artifacts to apply the new policy. Removing a repository also removes its script opt-in when you save.

The repository source, permission declaration, and automated tests are available for inspection. A future store build should be compared with the tagged source before relying on that correspondence.
