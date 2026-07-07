<div align="center">
  <img src="media/logo.png" alt="NoteHub logo" width="96" height="96" />

  <h1>NoteHub</h1>

  <p>
    Browse, search, and read your NoteHub notes directly inside VS Code.
    Organize collections, open rich-text notes, and stay focused without leaving your editor.
  </p>

  <p align="center">
    <a href="https://marketplace.visualstudio.com/items?itemName=mrcodium.notehub-vscode">
      <img
        src="media/install-from-marketplace.png"
        alt="Install from VS Code Marketplace"
        height="28"
      />
    </a>
  </p>

  <p align="center">
    <a href="https://github.com/abhijeetSinghRajput/notehub-vscode">
      <img alt="made by" src="https://img.shields.io/badge/made%20by-abhijeetsinghrajput-blueviolet?style=flat" />
    </a>
    <img alt="license" src="https://img.shields.io/badge/license-MIT-brightgreen?style=flat" />
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/abhijeetSinghRajput/notehub-vscode?style=flat&color=blue" />
    <img alt="GitHub forks" src="https://img.shields.io/github/forks/abhijeetSinghRajput/notehub-vscode?style=flat&color=blue" />
    <img alt="VS Code Marketplace Installs" src="https://vsmarketplacebadges.dev/installs/mrcodium.notehub-vscode.svg?color=blue" />
    <img alt="VS Code Marketplace Rating" src="https://vsmarketplacebadges.dev/rating/mrcodium.notehub-vscode.svg?color=blue" />
  </p>

  <img src="media/screenshots/demo.gif" alt="NoteHub Demo" width="700" />
</div>

<details>
<summary>Table of Contents</summary>

- [About](#-about)
- [Getting Started](#-getting-started)
- [Features](#-features)
- [How It Works](#-how-it-works)
- [Settings](#-settings)
- [Development](#development)
- [Contributing](#-contributing)
- [Roadmap](#-roadmap)
- [Follow Me](#-follow-me)
- [Give A Star](#-give-a-star)
- [License](#-license)

</details>

---

# 📖 About

**NoteHub** brings your notes directly into Visual Studio Code.

Browse collections, instantly search across notes, and read beautifully rendered notes without switching to your browser.

The extension supports rich text, syntax-highlighted code blocks, mathematical expressions with KaTeX, private/public notes, and opens every note in a dedicated VS Code webview.

Whether you're documenting projects, storing snippets, or writing technical notes, everything stays one shortcut away.

![NoteHub Preview](media/screenshots/banner.png)

---

# 🚀 Getting Started

1. Install the extension.
2. Open the **NoteHub** Activity Bar icon.
3. Sign in using your NoteHub account.
4. Your collections automatically appear.
5. Click any note to open it.
6. Press **Ctrl+Alt+K** to search all public notes instantly.

Your login session is securely stored using VS Code's encrypted Secret Storage.

---

# ✨ Features

- 📁 Browse collections directly from the Activity Bar
- 📄 Open notes inside a beautiful rich-text viewer
- 🔍 Instant note search with keyboard shortcut
- 🌍 Search public notes without signing in
- 🔒 Private notes with automatic authentication
- 💻 Syntax highlighting powered by Highlight.js
- ➗ Mathematical equations rendered using KaTeX
- 📋 Copy individual code blocks
- 📑 Copy the entire note as Markdown
- 🌐 Open notes in your browser
- 🔄 One-click refresh
- ⚡ Fast loading with optimistic updates
- 🎨 Native VS Code theme support

---

# ⚙️ How It Works

The extension communicates directly with the NoteHub API.

- Collections are loaded from

```
GET /api/collection/all-collections
```

- Notes are loaded from

```
GET /api/note/:username/:collection/:note
```

- Search uses

```
GET /api/note/search
```

Authentication uses the same JWT flow as the NoteHub website.

Access tokens are refreshed automatically when needed and stored securely using VS Code Secret Storage.

---

# ⚙️ Settings

Open

**Settings → Extensions → NoteHub**

| Setting | Description | Default |
|----------|-------------|---------|
| `notehub.apiBaseUrl` | Base URL of the NoteHub API | `https://notehub-38kp.onrender.com/api` |
| `notehub.siteBaseUrl` | Base URL of the NoteHub website | `https://notehub-official.vercel.app` |

---

# Development

```bash
npm install
npm run compile
```

Press **F5** to launch an Extension Development Host.

| Method | Description | Command |
|---------|-------------|----------|
| 🔧 Compile | Compile TypeScript | `npm run compile` |
| 📦 Package | Generate VSIX | `vsce package` |

```bash
npm install -g @vscode/vsce
npm run compile
vsce package
```

---

# 🤝 Contributing

<img src="https://github.com/abhijeetSinghRajput.png" width="64" height="64"/>

Contributions are always welcome.

1. Fork the repository
2. Create a branch

```
git checkout -b feature-name
```

3. Commit your changes

```
git commit -m "Add feature"
```

4. Push your branch

```
git push origin feature-name
```

5. Open a Pull Request

Please create an issue first if you'd like to discuss a major feature.

---

# 🗺️ Roadmap

- ⭐ Favorite notes
- 📌 Pin collections
- 📝 Create notes directly inside VS Code
- ✏️ Edit notes
- 📂 Offline cache
- 🔔 Notifications for shared notes
- 🔄 Live synchronization

---

# 📡 Follow Me

<p>
  <a href="https://github.com/abhijeetSinghRajput">
    <img alt="GitHub" src="https://img.shields.io/badge/abhijeetsinghrajput-181717?logo=github&logoColor=white"/>
  </a>

  <a href="https://youtube.com/@mrcodium">
    <img alt="YouTube" src="https://img.shields.io/badge/YouTube-%40mrcodium-FF0000?logo=youtube&logoColor=white"/>
  </a>
</p>

---

# ⭐ Give A Star

If this extension saves you time, consider giving the repository a ⭐ on GitHub. It helps more developers discover the project.

---

# 📄 License

MIT License — see [LICENSE](LICENSE).