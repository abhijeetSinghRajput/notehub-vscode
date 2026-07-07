import * as vscode from "vscode";
import { NoteAuthor, NoteDetail } from "./api";

const panels = new Map<string, vscode.WebviewPanel>();

export function showNotePanel(
  context: vscode.ExtensionContext,
  note: NoteDetail,
  author: NoteAuthor,
): void {
  const key = note._id;
  const existing = panels.get(key);
  if (existing) {
    existing.reveal(vscode.ViewColumn.One);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    "notehubNote",
    note.name || "Note",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [],
    },
  );

  panel.webview.html = renderNoteHtml(panel.webview, note, author);
  panel.onDidDispose(() => panels.delete(key));
  panels.set(key, panel);
}

function renderNoteHtml(
  webview: vscode.Webview,
  note: NoteDetail,
  author: NoteAuthor,
): string {
  const nonce = getNonce();
  const csp = [
    `default-src 'none'`,
    `img-src https: data:`,
    `style-src https: 'unsafe-inline'`,
    `font-src https:`,
    `script-src https: 'nonce-${nonce}'`,
  ].join("; ");

  const updated = note.contentUpdatedAt || note.updatedAt;
  const updatedLabel = updated
    ? new Date(updated).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"
/>
<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css"
/>
<title>${escapeHtml(note.name || "Note")}</title>
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: var(--vscode-editor-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
    color: var(--vscode-editor-foreground, #ddd);
    background: var(--vscode-editor-background, #1e1e1e);
    max-width: 840px;
    margin: 0 auto;
    padding: 32px 24px 96px;
    line-height: 1.7;
    font-size: 15px;
  }
  .note-meta {
    color: var(--vscode-descriptionForeground, #999);
    font-size: 13px;
    margin-bottom: 28px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--vscode-panel-border, #333);
  }
  .note-meta h1 {
    font-size: 26px;
    margin: 0 0 8px;
    color: var(--vscode-editor-foreground);
  }
  .note-view h1, .note-view h2, .note-view h3,
  .note-view h4, .note-view h5, .note-view h6 {
    margin-top: 1.6em;
    margin-bottom: 0.6em;
    font-weight: 600;
  }
  .note-view p { margin: 0.8em 0; }
  .note-view img { max-width: 100%; border-radius: 8px; }
  .note-view pre {
    padding: 14px 16px;
    border-radius: 8px;
    overflow-x: auto;
    background: #0d1117 !important;
  }
  .note-view code {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 0.9em;
  }
  .note-view :not(pre) > code {
    background: var(--vscode-textCodeBlock-background, rgba(127,127,127,0.15));
    padding: 0.15em 0.4em;
    border-radius: 4px;
  }
  .note-view blockquote {
    border-left: 3px solid var(--vscode-textLink-foreground, #4daafc);
    margin: 1em 0;
    padding: 0.2em 1em;
    color: var(--vscode-descriptionForeground, #aaa);
  }
  .note-view table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  .note-view th, .note-view td {
    border: 1px solid var(--vscode-panel-border, #444);
    padding: 6px 10px;
  }
  .note-view a { color: var(--vscode-textLink-foreground, #4daafc); }
  .pre-header, .heading-copy-btn, .table-copy-btn { display: none; }
</style>
</head>
<body>
  <div class="note-meta">
    <h1>${escapeHtml(note.name || "Untitled note")}</h1>
    <div>
      ${author.fullName ? escapeHtml(author.fullName) : "Unknown author"}
      ${author.userName ? `· @${escapeHtml(author.userName)}` : ""}
      ${updatedLabel ? `· updated ${updatedLabel}` : ""}
      ${note.visibility === "private" ? "· 🔒 private" : ""}
    </div>
  </div>
  <div class="note-view">${note.content || "<p><em>This note is empty.</em></p>"}</div>

  <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js"></script>
  <script nonce="${nonce}">
    if (window.hljs) {
      document.querySelectorAll('pre code').forEach((block) => {
        try { window.hljs.highlightElement(block); } catch (e) {}
      });
    }
    if (window.katex) {
      document.querySelectorAll('[data-type="inline-math"], [data-type="block-math"]').forEach((el) => {
        const latex = el.getAttribute('data-latex') || el.textContent || '';
        try {
          window.katex.render(latex, el, {
            displayMode: el.getAttribute('data-type') === 'block-math',
            throwOnError: false,
          });
        } catch (e) {}
      });
    }
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getNonce(): string {
  let text = "";
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
