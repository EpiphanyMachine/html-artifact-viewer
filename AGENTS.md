# HTML Artifact Viewer

Independent implementation based on the product requirements and documented browser APIs. Do not copy code, tests, documentation, icons, or other assets from other HTML preview extensions.

Use Node 22 (`.nvmrc`). Run `npm test` for rule/configuration tests and `npm run test:browser` for the real unpacked Chromium extension. Run `npm run check` before committing. Runtime files in `extension/` have no third-party dependencies or network clients. Keep permissions, README and PRIVACY.md accurate when behavior changes.

Repository settings must constrain rendering to explicitly configured repositories. Treat raw access tokens as browser-owned URL parameters: do not persist, log, or transmit them. Keep all extension UI scripts and styles local. Do not claim a browser was tested without running it. Never publish a store listing, submit to Hacker News, or change repository visibility without the user's instruction.
