import * as vscode from "vscode";
import { searchNotes, NoteSearchResult } from "./api";
import { AuthManager } from "./auth";

export function registerSearchCommand(
  context: vscode.ExtensionContext,
  auth: AuthManager,
  openNote: (note: NoteSearchResult) => void,
) {
  const disposable = vscode.commands.registerCommand("notehub.search", async () => {
    const config = vscode.workspace.getConfiguration("notehub");
    const apiBaseUrl = config.get<string>("apiBaseUrl", "");

    const qp = vscode.window.createQuickPick<vscode.QuickPickItem & { note?: NoteSearchResult }>();
    qp.placeholder = "Search NoteHub notes…";
    qp.matchOnDescription = true;

    let debounceTimer: NodeJS.Timeout | undefined;
    let requestId = 0;

    qp.onDidChangeValue((value) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (!value.trim()) {
        qp.items = [];
        return;
      }
      debounceTimer = setTimeout(async () => {
        const currentRequest = ++requestId;
        qp.busy = true;
        try {
          const result = await searchNotes(apiBaseUrl, value.trim());
          if (currentRequest !== requestId) return;
          qp.items = result.notes.map((n) => ({
            label: n.name,
            description: n.collectionId?.name,
            detail: `@${n.userId?.userName ?? "unknown"}`,
            note: n,
          }));
        } catch (err: any) {
          if (currentRequest !== requestId) return;
          qp.items = [];
          void vscode.window.showErrorMessage(`NoteHub search failed: ${err.message ?? err}`);
        } finally {
          if (currentRequest === requestId) qp.busy = false;
        }
      }, 300);
    });

    qp.onDidAccept(() => {
      const selected = qp.selectedItems[0];
      if (selected?.note) openNote(selected.note);
      qp.hide();
    });

    qp.onDidHide(() => qp.dispose());
    qp.show();
  });

  context.subscriptions.push(disposable);
}