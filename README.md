# NoteHub for VS Code

Browse your [NoteHub](https://notehub-official.vercel.app) collections and notes from the sidebar, and open notes in a rich-text viewer — right inside VS Code.

## Features

- 📁 **Collections & Notes tree** in the activity bar — collections shown as folders, notes as leaves, private items marked with a lock icon.
- 📖 **Rich note viewer** — a webview panel that renders note content with syntax-highlighted code blocks (highlight.js) and rendered math (KaTeX).
- 🔗 **Open in Browser** — jump straight to the note or collection on notehub-official.vercel.app.
- 🔄 **Refresh** button to reload your collections after changes.

## Setup

1. Install the extension and open the **NoteHub** icon in the activity bar.
2. Click **Sign in** in the empty tree view (or run `NoteHub: Sign In` from the Command Palette).
3. Enter your email or username, then your password. This calls `POST /api/auth/login` — the same JWT-based login your web app uses.
4. Your collections load automatically. Click any note to open it in the rich-text viewer.

Signing in only supports **email/password** for now — Google sign-in isn't wired up yet (see below). Your session is stored using VS Code's encrypted `SecretStorage`, never in plaintext settings, and the extension transparently refreshes your access token when it expires (same rotation flow as the web app, via `/api/auth/refresh`). Run `NoteHub: Sign Out` to clear it.

Settings are available under **Settings → Extensions → NoteHub**:

| Setting | Description | Default |
|---|---|---|
| `notehub.apiBaseUrl` | Base URL of the NoteHub API | `https://notehub-38kp.onrender.com/api` |
| `notehub.siteBaseUrl` | Base URL of the NoteHub site (for "Open in Browser") | `https://notehub-official.vercel.app` |

### Why not Google sign-in?

Your backend's `googleLogin` expects a PKCE `code` + `codeVerifier` + an **allow-listed** `redirectUri` — it's designed for a browser redirect flow, not a desktop app. Supporting it here would need:

1. A fixed loopback redirect URI (e.g. `http://127.0.0.1:51739/callback`) registered in your Google Cloud Console OAuth client, **and**
2. That same URI added to your backend's `GOOGLE_REDIRECT_URIs` env var.

With both in place, the extension could open the system browser for Google's consent screen and catch the redirect with a short-lived local server (the standard CLI OAuth pattern). Ask if you'd like this built — it just needs those two values from you first.

## Development

```bash
npm install
npm run compile
```

Then press **F5** in VS Code to launch an Extension Development Host with the extension loaded.

## Packaging

```bash
npm install -g @vscode/vsce
vsce package
```

This produces a `.vsix` file you can install via **Extensions → … → Install from VSIX**.

## Notes on the API

- The sidebar tree is populated by a single call to `GET /api/collection/all-collections?userId=...`, which already returns collections with their nested notes in a minimal shape (`_id, name, slug, visibility`), so no extra requests are needed just to render the tree.
- Opening a note calls `GET /api/note/:username/:collectionSlug/:noteSlug`, which returns the note's full HTML content plus author info. A 403 response is treated as "private note, no access" and shown as a friendly warning instead of an error.
