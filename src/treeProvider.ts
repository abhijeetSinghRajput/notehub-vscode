import * as vscode from "vscode";
import { CollectionSummary, NoteSummary, fetchCollections } from "./api";
import { AuthManager } from "./auth";

type NoteHubNode = CollectionNode | NoteNode;

// i want to use my own icons 
// media/private_opened.svg 
// media/private.svg 
// media/public_folder.svg 
// media/public_opened.svg
// media/file.svg

export class CollectionNode extends vscode.TreeItem {
  public readonly kind = "collection" as const;

  constructor(
    public readonly collection: CollectionSummary,
    extensionUri: vscode.Uri,
  ) {
    super(collection.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue =
      collection.visibility === "private"
        ? "collection-private"
        : "collection";

    this.iconPath = {
      light: vscode.Uri.joinPath(
        extensionUri,
        "media",
        collection.visibility === "private"
          ? "private.svg"
          : "public_folder.svg"
      ),
      dark: vscode.Uri.joinPath(
        extensionUri,
        "media",
        collection.visibility === "private"
          ? "private.svg"
          : "public_folder.svg"
      ),
    };

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
    extensionUri: vscode.Uri,
  ) {
    super(note.name, vscode.TreeItemCollapsibleState.None);

    this.contextValue =
      note.visibility === "private" ? "note-private" : "note";

    this.iconPath = {
      light: vscode.Uri.joinPath(extensionUri, "media", "file.svg"),
      dark: vscode.Uri.joinPath(extensionUri, "media", "file.svg"),
    };

    this.tooltip =
      note.visibility === "private" ? "Private note" : note.name;

    this.command = {
      command: "notehub.openNote",
      title: "Open Note",
      arguments: [note, collectionSlug],
    };
  }
}

export class NoteHubTreeProvider implements vscode.TreeDataProvider<NoteHubNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<NoteHubNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private cachedCollections: CollectionSummary[] | undefined;
  private collectionsPromise: Promise<CollectionSummary[]> | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly auth: AuthManager,
  ) {
    this.auth.onDidChangeSession(() => this.refresh());
  }

  /** Full refresh: clears cache and refetches from the server. */
  refresh(): void {
    this.cachedCollections = undefined;
    this.collectionsPromise = undefined;
    this._onDidChangeTreeData.fire();
  }

  private async loadCollections(): Promise<CollectionSummary[]> {
    const config = vscode.workspace.getConfiguration("notehub");
    const apiBaseUrl = config.get<string>("apiBaseUrl", "");
    const user = await this.auth.getUser();

    if (!user) {
      void vscode.commands.executeCommand("setContext", "notehub.configured", false);
      return [];
    }
    void vscode.commands.executeCommand("setContext", "notehub.configured", true);

    if (!this.collectionsPromise) {
      this.collectionsPromise = this.auth
        .withAuthRetry((authHeader) => fetchCollections(apiBaseUrl, user._id, authHeader))
        .then((collections) => {
          this.cachedCollections = collections;
          return collections;
        })
        .catch((err) => {
          this.collectionsPromise = undefined;
          void vscode.window.showErrorMessage(
            `NoteHub: failed to load collections — ${err.message ?? err}`,
          );
          return this.cachedCollections ?? [];
        });
    }
    return this.collectionsPromise;
  }

  getTreeItem(element: NoteHubNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: NoteHubNode): Promise<NoteHubNode[]> {
    if (!element) {
      const collections = this.cachedCollections ?? (await this.loadCollections());
      return collections.map((c) => new CollectionNode(c, this.context.extensionUri));
    }
    if (element.kind === "collection") {
      return element.collection.notes.map((n) => new NoteNode(n, element.collection.slug, this.context.extensionUri));
    }
    return [];
  }

  // ---- Optimistic update API — call these from your create/rename/delete commands ----

  /** Insert a note into the sidebar immediately, before the server confirms. */
  optimisticAddNote(collectionSlug: string, note: NoteSummary): void {
    const collection = this.cachedCollections?.find((c) => c.slug === collectionSlug);
    if (!collection) return;
    collection.notes = [note, ...collection.notes];
    this._onDidChangeTreeData.fire();
  }

  /** Remove a note immediately (e.g. on delete). */
  optimisticRemoveNote(noteId: string): void {
    if (!this.cachedCollections) return;
    for (const c of this.cachedCollections) {
      const before = c.notes.length;
      c.notes = c.notes.filter((n) => n._id !== noteId);
      if (c.notes.length !== before) break;
    }
    this._onDidChangeTreeData.fire();
  }

  /** Patch a note in place (e.g. rename), before the server confirms. */
  optimisticUpdateNote(noteId: string, patch: Partial<NoteSummary>): void {
    if (!this.cachedCollections) return;
    for (const c of this.cachedCollections) {
      const note = c.notes.find((n) => n._id === noteId);
      if (note) {
        Object.assign(note, patch);
        break;
      }
    }
    this._onDidChangeTreeData.fire();
  }

  /** If an optimistic update turns out wrong, drop the cache and refetch. */
  reconcile(): void {
    this.refresh();
  }
}