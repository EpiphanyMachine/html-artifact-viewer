# HTML Artifact Viewer

### Your artifacts already live in GitHub. Bring them to life.

AI tools are getting good at making standalone HTML: PRDs, clickable prototypes, reports, diagrams, and tiny tools. GitHub stores them beautifully—and shows you the source.

**Choose a repository. Click Raw. See the artifact.**

No upload. No preview service. No extra login. Just your browser rendering the file it already received.

> **Built with Codex.**

## Three steps, then it's just Raw

1. Load the extension using the instructions below.
2. Add repositories in its settings, such as `your-org/artifacts`. An empty list renders nothing; there is no all-repositories mode.
3. Open an HTML file on GitHub and click **Raw**. It renders automatically, with embedded images, styles, and section anchors. Scripts are off by default; optionally enable them for trusted repositories in settings.

Works with private repositories when GitHub already grants access to the raw file. Share the ordinary GitHub file link with teammates; each person clicks Raw using their own session. Do not share temporary token-bearing raw links.

## Try a self-contained artifact

The [product & design brief](docs/product-design.html) is also a working test artifact: requirements, UX decisions, section links, a theme switch, and an interactive repository-matching example in one offline HTML file.

Add `EpiphanyMachine/html-artifact-viewer` in the extension's settings, save, then open that file in GitHub and click **Raw**. The repository must be allowed even when it contains the extension itself. To use its interactive controls, explicitly enable scripts for this repository after reading the trust warning. You can also save the HTML file using the browser’s Save Page As command and open it locally. Locally opened copies are outside the extension’s sandbox and script settings.

## Built for artifacts, not another hosting platform

- **Repository-scoped.** Select exactly where automatic rendering applies. Add, remove, or pause repositories without editing code.
- **Local by design.** The extension changes response headers; it never reads or uploads HTML bodies. Repository settings are stored only in this browser.
- **Optionally interactive.** Enable scripts for repositories you trust to use interactive filtering and diagrams; embedded media works without script opt-in. Embedded assets mean no clone or local server is needed.
- **Small enough to inspect.** No runtime dependencies, injected page scripts, API tokens, or hidden preview service. Read [the privacy design](PRIVACY.md).
- **Open to build on.** Independently implemented from browser documentation, with original code and artwork, under the [MIT license](LICENSE).

## Install locally

Store publication is planned; this is an unpacked developer installation today.

1. Clone this repository, or download the extension ZIP and extract it.
2. Open your browser's extension manager and enable **Developer mode**.
3. Choose **Load unpacked** and select the `extension/` directory (or the extracted ZIP directory).
4. Open HTML Artifact Viewer's settings from its toolbar icon. Add your repositories and save.

| Browser | Extension manager | Status |
| --- | --- | --- |
| Chrome / Chromium | `chrome://extensions` | Automated testing uses Chromium |
| Arc | Extension manager from Arc's Extensions menu | Expected compatible; not yet tested in Arc |
| Edge | `edge://extensions` | Expected compatible; not yet tested in Edge |
| Brave | `brave://extensions` | Expected compatible; not yet tested in Brave |

Keep the installation folder in place. After updating its files, click **Reload** on the extension's card. Desktop Chromium 120+ is the target; Firefox, Safari, and mobile browsers are not currently supported.

## What it changes—and what it doesn't

The extension uses the browser's documented `declarativeNetRequest` API to set the content type and an isolation policy for configured top-level `.html` and `.htm` responses. It never intercepts response bodies. Dynamic rules persist across restarts; configuration is local and starts empty. Upgrading from v0.1 keeps your repository list but turns scripts off. Reload any already-open artifacts to apply the new policy.

External scripts, styles, fonts, images, API requests, frames, cookies, normal storage, form submissions, and artifact-initiated downloads are unavailable in the artifact sandbox. Inline styles and embedded assets work by default. Inline JavaScript requires a separate opt-in for each configured repository.

**Artifact exports are disabled.** Downloads remain blocked even when you click an export button or download link, and enabling scripts does not enable downloads. There is no download setting. The browser’s own Save Page As command is separate.

**Only enable scripts for content you trust.** Trusted scripts can read the current document and its private raw URL token, then send both to another site by navigating the tab. This trust applies to every matching file, branch, and revision in that repository. Scripts-off prevents this script-based attack; it is not a promise of zero network requests (for example, following a link still navigates). The [privacy policy](PRIVACY.md) explains the boundary.

GitHub access errors remain errors. Expired private raw links need to be reopened through GitHub. This does not host a website or replace a development server for multi-file apps.

## Development

```sh
nvm use
npm ci
npm test
npm run check
npx playwright install chromium
npm run test:browser
npm run package
```

Tests cover repository boundaries, configuration validation, actual browser header changes, interactive HTML, private-query handling, persisted settings, and disabled previews. The browser suite uses a local HTTPS fixture and an isolated profile; it never signs into GitHub or uses private repository contents.

`npm run package` writes a ZIP to `dist/` containing an explicit list of extension files plus LICENSE and PRIVACY.md. Unlisted files are excluded and symlink inputs are rejected. Tests and development dependencies are not included.

GitHub Actions runs the **CI / Test and package** job on pull requests targeting `main` and pushes to `main`. It uses Node 22 and Chromium on Ubuntu to run the unit/package tests, source checks, browser security tests, and ZIP build. The workflow has read-only repository permissions and does not publish releases or submit the extension to a store. CodeQL runs separately.

## Browser API references

- [Declarative Net Request](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest): response changes without exposing request contents to extension code.
- [Manifest V3 options pages](https://developer.chrome.com/docs/extensions/develop/ui/options-page): local repository configuration.
- [Porting Chromium extensions to Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/port-chrome-extension).

No code or assets from other HTML preview extensions are included.
