# Privacy, by construction

HTML Artifact Viewer has no accounts, backend, analytics, telemetry, or runtime dependencies. Its runtime code contains no network client. It never reads, copies, uploads, or stores an HTML response body.

## What happens to a file

1. Your browser makes its normal request to GitHub's raw host.
2. For configured repositories, the browser applies the extension's declarative response-header rules.
3. The browser renders the response it received. No preview server or third-party service receives the document.

GitHub authentication and private raw links remain GitHub's responsibility. This extension does not ask for OAuth, cookies, a personal access token, or repository credentials. It does not grant access to any file. Normal browser history and GitHub request handling are unchanged.

## What is stored

Only the enabled setting and repository allowlist, in `storage.local`. They remain in this browser profile and are not synced. Full file URLs, access tokens, artifact contents, and browsing history are not stored by the extension. Removing the extension removes its local settings.

## Permissions

- `declarativeNetRequestWithHostAccess`: tells the browser which response headers to change. It does not expose response bodies to the extension.
- `https://raw.githubusercontent.com/*`: limits host access to GitHub's raw host. Browser host permissions operate at host level; the configured allowlist constrains rendering to selected repositories and top-level HTML files.
- `storage`: remembers local configuration.

No content scripts, GitHub API access, external message handlers, advertising code, or remotely loaded extension code.

## What an artifact can do

Inline JavaScript and styles run in an opaque-origin sandbox, with embedded images, fonts, media, and user-initiated downloads. Cookies, normal browser storage, external resources, fetch/XHR, frames, and form submission are blocked by the preview policy. The artifact has no extension API privileges.

This is a viewer for HTML you trust, not a malware-analysis tool: scripts can navigate their own tab, and exported files are user-directed output. Nothing in this policy promises that arbitrary HTML can never make a browser request. The extension's own code does not transmit document contents.

The repository source, permission declaration, and automated tests are available for inspection. A future store build should be compared with the tagged source before relying on that correspondence.
