import * as vscode from "vscode";
import { extractCookie, request, NoteHubHttpError } from "./httpClient";

const SECRET_KEY = "notehub.session";

export interface NoteHubUser {
  _id: string;
  userName: string;
  fullName?: string;
  email?: string;
  avatar?: string;
}

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: NoteHubUser;
}

export class AuthManager {
  private readonly _onDidChangeSession = new vscode.EventEmitter<void>();
  readonly onDidChangeSession = this._onDidChangeSession.event;

  private session: StoredSession | undefined;
  private loaded = false;

  constructor(private readonly context: vscode.ExtensionContext) {}

  private apiBaseUrl(): string {
    return vscode.workspace
      .getConfiguration("notehub")
      .get<string>("apiBaseUrl", "")
      .replace(/\/$/, "");
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    const raw = await this.context.secrets.get(SECRET_KEY);
    if (raw) {
      try {
        this.session = JSON.parse(raw) as StoredSession;
      } catch {
        this.session = undefined;
      }
    }
  }

  async getUser(): Promise<NoteHubUser | undefined> {
    await this.ensureLoaded();
    return this.session?.user;
  }

  async isLoggedIn(): Promise<boolean> {
    await this.ensureLoaded();
    return !!this.session;
  }

  /** Email or username + password login. */
  async login(identifier: string, password: string): Promise<NoteHubUser> {
    const result = await request<{ user: NoteHubUser; sessionId: string }>(
      `${this.apiBaseUrl()}/auth/login`,
      { method: "POST", body: { identifier, password } },
    );

    const accessToken = extractCookie(result.headers, "accessToken");
    const refreshToken = extractCookie(result.headers, "refreshToken");
    if (!accessToken || !refreshToken) {
      throw new Error(
        "Login succeeded but no session cookies were returned by the server.",
      );
    }

    await this.persist({ accessToken, refreshToken, user: result.json.user });
    return result.json.user;
  }

  async logout(): Promise<void> {
    const token = this.session?.accessToken;
    // Best-effort server-side session revoke; ignore failures — we clear
    // local state regardless so the user is always logged out client-side.
    if (token) {
      try {
        await request(`${this.apiBaseUrl()}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    this.session = undefined;
    await this.context.secrets.delete(SECRET_KEY);
    this._onDidChangeSession.fire();
  }

  private async persist(session: StoredSession): Promise<void> {
    this.session = session;
    await this.context.secrets.store(SECRET_KEY, JSON.stringify(session));
    this._onDidChangeSession.fire();
  }

  private async refresh(): Promise<string> {
    await this.ensureLoaded();
    if (!this.session) throw new Error("Not logged in");

    const result = await request<{ user: NoteHubUser; sessionId: string }>(
      `${this.apiBaseUrl()}/auth/refresh`,
      {
        method: "POST",
        headers: { Cookie: `refreshToken=${this.session.refreshToken}` },
      },
    );

    const accessToken = extractCookie(result.headers, "accessToken");
    const refreshToken = extractCookie(result.headers, "refreshToken");
    if (!accessToken || !refreshToken) {
      throw new Error("Refresh succeeded but no new session cookies arrived.");
    }

    await this.persist({ accessToken, refreshToken, user: result.json.user });
    return accessToken;
  }

  /**
   * Returns headers to attach to an authenticated request, or {} if the
   * user isn't logged in (many NoteHub endpoints work fine anonymously —
   * they just won't show private content).
   */
  async authHeader(): Promise<Record<string, string>> {
    await this.ensureLoaded();
    if (!this.session) return {};
    return { Authorization: `Bearer ${this.session.accessToken}` };
  }

  /**
   * Runs `fn` with the current access token; on a 401 it refreshes once
   * and retries. If the user isn't logged in, `fn` still runs with no
   * auth header (anonymous / public-only access).
   */
  async withAuthRetry<T>(
    fn: (authHeader: Record<string, string>) => Promise<T>,
  ): Promise<T> {
    const header = await this.authHeader();
    try {
      return await fn(header);
    } catch (err) {
      const httpErr = err as NoteHubHttpError;
      if (httpErr?.status === 401 && this.session) {
        try {
          const newToken = await this.refresh();
          return await fn({ Authorization: `Bearer ${newToken}` });
        } catch {
          // Refresh failed — session is dead, force logout so the UI
          // prompts the user to sign in again instead of failing silently.
          await this.logout();
          throw err;
        }
      }
      throw err;
    }
  }
}
