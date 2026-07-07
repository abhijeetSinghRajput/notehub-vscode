import * as vscode from "vscode";
import { NoteAuthor, NoteDetail } from "./api";

// lucide-style icons, stroke-based so they inherit `color` via currentColor
const ICONS = {
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy size-3" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`,
  badgeCheck: `<svg viewBox="0 0 24 24" width="24" height="24" fill="#2b7fff" aria-label="Verified" class="size-5 text-blue-500"><path d="M24 12a4.454 4.454 0 0 0-2.564-3.91 4.437 4.437 0 0 0-.948-4.578 4.436 4.436 0 0 0-4.577-.948A4.44 4.44 0 0 0 12 0a4.423 4.423 0 0 0-3.9 2.564 4.434 4.434 0 0 0-2.43-.178 4.425 4.425 0 0 0-2.158 1.126 4.42 4.42 0 0 0-1.12 2.156 4.42 4.42 0 0 0 .183 2.421A4.456 4.456 0 0 0 0 12a4.465 4.465 0 0 0 2.576 3.91 4.433 4.433 0 0 0 .936 4.577 4.459 4.459 0 0 0 4.577.95A4.454 4.454 0 0 0 12 24a4.439 4.439 0 0 0 3.91-2.563 4.26 4.26 0 0 0 5.526-5.526A4.453 4.453 0 0 0 24 12Zm-13.709 4.917-4.38-4.378 1.652-1.663 2.646 2.646L15.83 7.4l1.72 1.591-7.258 7.926Z"></path></svg>`,
};

// fallback avatar as data-uri so we don't need it in localResourceRoots
const FALLBACK_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" fill="#8884"/><circle cx="28" cy="21" r="10" fill="#8888"/><path d="M8 50c2-12 12-18 20-18s18 6 20 18" fill="#8888"/></svg>`,
  );

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
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
    },
  );

  const cssUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "note-view.css"),
  );
  const mdScriptUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "html-to-markdown.js"),
  );

  panel.webview.html = renderNoteHtml(
    panel.webview,
    note,
    author,
    cssUri,
    mdScriptUri,
  );

  // Handle messages from the webview (e.g. Copy MD button)
  panel.webview.onDidReceiveMessage((message) => {
    switch (message?.type) {
      case "copyMarkdown":
        vscode.env.clipboard.writeText(message.text ?? "");
        vscode.window.setStatusBarMessage("Note copied as Markdown", 2000);
        break;
    }
  });

  panel.onDidDispose(() => panels.delete(key));
  panels.set(key, panel);
}

function renderNoteHtml(
  webview: vscode.Webview,
  note: NoteDetail,
  author: NoteAuthor,
  cssUri: vscode.Uri,
  mdScriptUri: vscode.Uri,
): string {
  const nonce = getNonce();
  const csp = [
    `default-src 'none'`,
    `img-src https: data:`,
    `style-src https: ${webview.cspSource} 'unsafe-inline'`,
    `font-src https:`,
    `script-src https: ${webview.cspSource} 'nonce-${nonce}'`,
  ].join("; ");

  const updated = note.contentUpdatedAt || note.updatedAt;
  const updatedAgo = updated ? formatTimeAgo(new Date(updated)) : "";
  const createdLabel = note.createdAt
    ? new Date(note.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const isPublic = note.visibility === "public";

  // collaborators may not exist on older NoteDetail shapes — guarded access
  const collaborators = ((note as any).collaborators ?? []) as Array<{
    _id?: string;
    fullName?: string;
    avatar?: string;
  }>;

  const collaboratorsHtml = collaborators.length
    ? `
    <div class="note-collaborators">
      ${collaborators
        .map(
          (col) => `
        <div class="collab-avatar" title="${escapeHtml(col.fullName || "Collaborator")}">
          <img src="${col.avatar || FALLBACK_AVATAR}" alt="${escapeHtml(col.fullName || "Collaborator")}" />
        </div>`,
        )
        .join("")}
    </div>`
    : "";

  const noteHtmlJson = JSON.stringify(note.content || "");

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,opsz,wght@0,18..144,300..900;1,18..144,300..900&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${cssUri}" />
<title>${escapeHtml(note.name || "Note")}</title>
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: var(--vscode-editor-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
    color: var(--vscode-editor-foreground, #ddd);
    background: var(--vscode-editor-background, #1e1e1e);
    max-width: 48rem;
    margin: 0 auto;
    padding: 32px 24px 96px;
    line-height: 1.7;
    font-size: 14px;
  }

  .note-meta {
    padding-bottom: 28px;
    margin-bottom: 28px;
    border-bottom: 1px dashed var(--vscode-panel-border, #333);
  }
  .note-meta h1 {
    font-size: 30px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin: 0 0 16px;
    color: var(--vscode-editor-foreground);
  }

  .note-badges {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    background: color-mix(in srgb, var(--vscode-descriptionForeground, #999) 12%, transparent);
    color: var(--vscode-descriptionForeground, #999);
    border: 1px solid transparent;
  }
  .badge svg { width: 14px; height: 14px; flex-shrink: 0; }
  .badge-public {
    background: color-mix(in srgb, #22c55e 8%, transparent);
    border-color: color-mix(in srgb, #22c55e 25%, transparent);
    color: #4ade80;
  }
  .badge-private {
    background: color-mix(in srgb, var(--vscode-errorForeground, #f14c4c) 8%, transparent);
    border-color: color-mix(in srgb, var(--vscode-errorForeground, #f14c4c) 25%, transparent);
    color: var(--vscode-errorForeground, #f14c4c);
  }

  .note-author-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .note-author {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .avatar-ring {
    padding: 2px;
    border: 2px solid color-mix(in srgb, var(--vscode-textLink-foreground, #3794ff) 12%, transparent);
    border-radius: 999px;
    width: 52px;
    height: 52px;
    flex-shrink: 0;
  }
  .avatar-ring img {
    width: 100%;
    height: 100%;
    border-radius: 999px;
    object-fit: cover;
    display: block;
  }
  .author-info { display: flex; flex-direction: column; }
  .author-name {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 16px;
    font-weight: 500;
    color: var(--vscode-editor-foreground);
  }
  .admin-badge svg { width: 16px; height: 16px; color: var(--vscode-textLink-foreground, #3794ff); }
  .author-username {
    font-size: 13px;
    color: var(--vscode-descriptionForeground, #999);
  }

  .copy-md-btn svg {
    width: 12px;
    height: 12px;
  }
  .copy-md-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: .75rem;
    padding: 5px 12px;
    border: 1px dashed var(--border);
    border-radius: 6px;
    background: transparent;
    color: var(--vscode-editor-foreground);
    cursor: pointer;
  }
  .copy-md-btn:hover {
    background: var(--vscode-toolbar-hoverBackground);
    border-color: var(--vscode-editor-foreground);
  }
  .copy-md-btn.copied {
    color: #4ade80;
    border-color: color-mix(in srgb, #22c55e 40%, transparent);
  }

  .note-collaborators {
    display: flex;
    margin-top: 16px;
  }
  .collab-avatar {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    overflow: hidden;
    border: 2px solid var(--vscode-editor-background, #1e1e1e);
    margin-left: -10px;
    background: var(--vscode-descriptionForeground, #999);
  }
  .collab-avatar:first-child { margin-left: 0; }
  .collab-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
</style>
</head>
<body>
  <div class="note-meta">
    <h1>${escapeHtml(note.name || "Untitled note")}</h1>

    <div class="note-badges">
      ${createdLabel ? `<span class="badge">${ICONS.calendar}<span>${createdLabel}</span></span>` : ""}
      ${updatedAgo ? `<span class="badge">${ICONS.clock}<span>Updated ${updatedAgo}</span></span>` : ""}
      <span class="badge ${isPublic ? "badge-public" : "badge-private"}">
        ${isPublic ? ICONS.globe : ICONS.lock}
        <span>${isPublic ? "Public" : "Private"}</span>
      </span>
    </div>

    <div class="note-author-row">
      <div class="note-author">
        <div class="avatar-ring">
          <img src="${author.avatar || FALLBACK_AVATAR}" alt="${escapeHtml(author.fullName || "Author")}" />
        </div>
        <div class="author-info">
          <div class="author-name">
            <span>${escapeHtml(author.fullName || "Unknown author")}</span>
            ${author.role === "admin" ? `<span class="admin-badge">${ICONS.badgeCheck}</span>` : ""}
          </div>
          ${author.userName ? `<span class="author-username">@${escapeHtml(author.userName)}</span>` : ""}
        </div>
      </div>

      <button id="copy-md-btn" class="copy-md-btn" aria-label="Copy note as Markdown">
        <span>${ICONS.copy}</span>
        Copy MD
      </button>
    </div>

    ${collaboratorsHtml}
  </div>

  <div class="note-view">${note.content || "<p><em>This note is empty.</em></p>"}</div>

  <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js"></script>
  <script nonce="${nonce}" src="${mdScriptUri}"></script>
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

    const vscodeApi = acquireVsCodeApi();
    const noteHtml = ${noteHtmlJson};

    document.getElementById('copy-md-btn')?.addEventListener('click', () => {
      const md = window.NoteMD ? window.NoteMD.htmlToMarkdown(noteHtml) : '';
      vscodeApi.postMessage({ type: 'copyMarkdown', text: md });
      const btn = document.getElementById('copy-md-btn');
      if (btn) {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy MD';
          btn.classList.remove('copied');
        }, 1500);
      }
    });
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

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const units: [number, string][] = [
    [60_000, "minute"],
    [3_600_000, "hour"],
    [86_400_000, "day"],
    [604_800_000, "week"],
    [2_592_000_000, "month"],
    [31_536_000_000, "year"],
  ];
  if (diff < units[0][0]) return "just now";
  for (let i = units.length - 1; i >= 0; i--) {
    const [ms, label] = units[i];
    if (diff >= ms || i === 0) {
      const n = Math.floor(diff / ms);
      return `${n} ${label}${n !== 1 ? "s" : ""} ago`;
    }
  }
  return "";
}
