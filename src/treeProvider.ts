import * as vscode from "vscode";
import { CollectionSummary, NoteSummary, fetchCollections } from "./api";
import { AuthManager } from "./auth";

type NoteHubNode = CollectionNode | NoteNode;

export class CollectionNode extends vscode.TreeItem {
  public readonly kind = "collection" as const;
  constructor(public readonly collection: CollectionSummary) {
    super(collection.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue =
      collection.visibility === "private" ? "collection-private" : "collection";
    this.iconPath = new vscode.ThemeIcon(
      collection.visibility === "private" ? "lock" : "folder",
    );
    this.description =
      collection.visibility === "private" ? "private" : undefined;
    this.tooltip = `${collection.name} (${collection.notes.length} note${
      collection.notes.length === 1 ? "" : "s"
    })`;
  }
}

export class NoteNode extends vscode.TreeItem {
  public readonly kind = "note" as const;
  constructor(
    public readonly note: NoteSummary,
    public readonly collectionSlug: string,
  ) {
    super(note.name, vscode.TreeItemCollapsibleState.None);
    this.contextValue = note.visibility === "private" ? "note-private" : "note";
    this.iconPath = new vscode.ThemeIcon(
      note.visibility === "private" ? "lock" : "file",
    );
    this.tooltip = note.visibility === "private" ? "Private note" : note.name;
    this.command = {
      command: "notehub.openNote",
      title: "Open Note",
      arguments: [note, collectionSlug],
    };
  }
}

export class NoteHubTreeProvider
  implements vscode.TreeDataProvider<NoteHubNode>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    NoteHubNode | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private collectionsPromise: Promise<CollectionSummary[]> | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly auth: AuthManager,
  ) {
    this.auth.onDidChangeSession(() => this.refresh());
  }

  refresh(): void {
    this.collectionsPromise = undefined;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: NoteHubNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: NoteHubNode): Promise<NoteHubNode[]> {
    const config = vscode.workspace.getConfiguration("notehub");
    const apiBaseUrl = config.get<string>("apiBaseUrl", "");
    const user = await this.auth.getUser();

    if (!user) {
      void vscode.commands.executeCommand(
        "setContext",
        "notehub.configured",
        false,
      );
      return [];
    }
    void vscode.commands.executeCommand(
      "setContext",
      "notehub.configured",
      true,
    );

    if (!element) {
      if (!this.collectionsPromise) {
        this.collectionsPromise = this.auth
          .withAuthRetry((authHeader) =>
            fetchCollections(apiBaseUrl, user._id, authHeader),
          )
          .catch((err) => {
            this.collectionsPromise = undefined;
            void vscode.window.showErrorMessage(
              `NoteHub: failed to load collections — ${err.message ?? err}`,
            );
            return [];
          });
      }
      const collections = await this.collectionsPromise;
      return collections.map((c) => new CollectionNode(c));
    }

    if (element.kind === "collection") {
      return element.collection.notes.map(
        (n) => new NoteNode(n, element.collection.slug),
      );
    }

    return [];
  }
}
