import * as vscode from "vscode";
import { fetchNote, NoteSummary } from "./api";
import { NoteHubTreeProvider, NoteNode, CollectionNode } from "./treeProvider";
import { showNotePanel } from "./noteWebview";
import { AuthManager } from "./auth";
import { registerSearchCommand } from "./search";

export function activate(context: vscode.ExtensionContext): void {
  const auth = new AuthManager(context);
  const treeProvider = new NoteHubTreeProvider(context, auth);
  const treeView = vscode.window.createTreeView("notehubExplorer", {
    treeDataProvider: treeProvider,
  });
  context.subscriptions.push(treeView);

  registerSearchCommand(context, auth, async (note) => {
    const config = vscode.workspace.getConfiguration("notehub");
    const apiBaseUrl = config.get<string>("apiBaseUrl", "");
    const user = await auth.getUser();

    if (!user) {
      return;
    }

    const { note: fullNote, author } = await fetchNote(
      apiBaseUrl,
      note.userId.userName,
      note.collectionId.slug,
      note.slug,
      {},
    );

    showNotePanel(context, fullNote, author);
  });

  // Reflect login state into the tree title so it's always visible at a glance.
  const refreshTitle = async () => {
    const user = await auth.getUser();
    treeView.title = user ? `Collections — ${user.userName}` : "Collections";
  };
  context.subscriptions.push(auth.onDidChangeSession(refreshTitle));
  void refreshTitle();

  context.subscriptions.push(
    vscode.commands.registerCommand("notehub.refresh", () => {
      treeProvider.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("notehub.login", async () => {
      const identifier = await vscode.window.showInputBox({
        title: "NoteHub Sign In (1/2)",
        prompt: "Email or username",
        ignoreFocusOut: true,
      });
      if (!identifier) return;

      const password = await vscode.window.showInputBox({
        title: "NoteHub Sign In (2/2)",
        prompt: "Password",
        password: true,
        ignoreFocusOut: true,
      });
      if (!password) return;

      try {
        const user = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Signing in to NoteHub…",
          },
          () => auth.login(identifier.trim(), password),
        );
        void vscode.window.showInformationMessage(
          `NoteHub: signed in as ${user.userName}.`,
        );
      } catch (err: any) {
        void vscode.window.showErrorMessage(
          `NoteHub: sign in failed — ${err?.message ?? err}`,
        );
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("notehub.logout", async () => {
      const user = await auth.getUser();
      if (!user) {
        void vscode.window.showInformationMessage("NoteHub: not signed in.");
        return;
      }
      await auth.logout();
      void vscode.window.showInformationMessage("NoteHub: signed out.");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "notehub.openNote",
      async (note: NoteSummary, collectionSlug: string) => {
        const config = vscode.workspace.getConfiguration("notehub");
        const apiBaseUrl = config.get<string>("apiBaseUrl", "");
        const user = await auth.getUser();

        if (!user) {
          const choice = await vscode.window.showWarningMessage(
            "NoteHub: sign in to open notes.",
            "Sign in",
          );
          if (choice === "Sign in") {
            await vscode.commands.executeCommand("notehub.login");
          }
          return;
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Opening "${note.name}"…`,
          },
          async () => {
            try {
              const { note: fullNote, author } = await auth.withAuthRetry(
                (authHeader) =>
                  fetchNote(
                    apiBaseUrl,
                    user.userName,
                    collectionSlug,
                    note.slug,
                    authHeader,
                  ),
              );
              showNotePanel(context, fullNote, author);
            } catch (err: any) {
              if (err?.status === 403) {
                void vscode.window.showWarningMessage(
                  `"${note.name}" is private and you don't have access to it.`,
                );
              } else {
                void vscode.window.showErrorMessage(
                  `NoteHub: failed to open note — ${err?.message ?? err}`,
                );
              }
            }
          },
        );
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "notehub.openInBrowser",
      async (item: CollectionNode | NoteNode) => {
        const config = vscode.workspace.getConfiguration("notehub");
        const siteBaseUrl = config.get<string>("siteBaseUrl", "");
        const user = await auth.getUser();

        if (!user) {
          void vscode.window.showWarningMessage(
            "NoteHub: sign in first (NoteHub: Sign In).",
          );
          return;
        }

        const url =
          item.kind === "collection"
            ? `${siteBaseUrl}/${user.userName}/${item.collection.slug}`
            : `${siteBaseUrl}/${user.userName}/${item.collectionSlug}/${item.note.slug}`;

        void vscode.env.openExternal(vscode.Uri.parse(url));
      },
    ),
  );

  void auth
    .isLoggedIn()
    .then((loggedIn) =>
      vscode.commands.executeCommand(
        "setContext",
        "notehub.configured",
        loggedIn,
      ),
    );
}

export function deactivate(): void {}
