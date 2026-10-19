# HTML Artifact Viewer

### Your artifacts already live in GitHub. Bring them to life.

AI tools are getting good at making standalone HTML: PRDs, clickable prototypes, reports, diagrams, and tiny tools. GitHub stores them beautifully—and shows you the source.

**Choose a repository. Click Raw. See the artifact.**

No upload. No preview service. No extra login. Just your browser rendering the file it already received.

> **Built with Codex.**

## Three steps, then it's just Raw

1. Load the extension using the instructions below.
2. Add repositories in its settings, such as `your-org/artifacts`. An empty list renders nothing; there is no all-repositories mode.
3. Open an HTML file on GitHub and click **Raw**. It renders automatically, including inline JavaScript, embedded images, and section anchors.

Works with private repositories when GitHub already grants access to the raw file. Share the ordinary GitHub file link with teammates; each person clicks Raw using their own session. Do not share temporary token-bearing raw links.

## Try a self-contained artifact

The [product & design brief](docs/product-design.html) is also a working test artifact: requirements, UX decisions, section links, a theme switch, and an interactive repository-matching example in one offline HTML file.

Add `EpiphanyMachine/html-artifact-viewer` in the extension's settings, save, then open that file in GitHub and click **Raw**. The repository must be allowed even when it contains the extension itself. You can also download the HTML file and open it locally without the extension.

## Built for artifacts, not another hosting platform

- **Repository-scoped.** Select exactly where automatic rendering applies. Add, remove, or pause repositories without editing code.
- **Local by design.** The extension changes response headers; it never reads or uploads HTML bodies. Repository settings are stored only in this browser.
- **Actually interactive.** Inline scripts, filtering, diagrams, and embedded media work. Embedded assets mean no clone or local server is needed.
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

The extension uses the browser's documented `declarativeNetRequest` API to set the content type and an isolation policy for configured top-level `.html` and `.htm` responses. It never intercepts response bodies. Dynamic rules persist across restarts; configuration is local and starts empty.

External scripts, styles, fonts, images, API requests, frames, cookies, normal storage, and form submissions are unavailable in the artifact sandbox. Inline scripts and embedded assets work. Only open artifacts you trust: a script can still navigate its own tab. The [privacy policy](PRIVACY.md) explains the boundary.

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

`npm run package` writes an extension-only ZIP to `dist/`, without tests or development dependencies.

## Browser API references

- [Declarative Net Request](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest): response changes without exposing request contents to extension code.
- [Manifest V3 options pages](https://developer.chrome.com/docs/extensions/develop/ui/options-page): local repository configuration.
- [Porting Chromium extensions to Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/port-chrome-extension).

No code or assets from other HTML preview extensions are included.
