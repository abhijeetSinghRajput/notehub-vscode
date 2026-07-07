import * as https from "https";
import * as http from "http";
import { URL } from "url";

export interface HttpResult<T> {
  status: number;
  json: T;
  headers: http.IncomingHttpHeaders;
}

export interface NoteHubHttpError extends Error {
  status?: number;
  code?: string;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

export function request<T = unknown>(
  url: string,
  options: RequestOptions = {},
): Promise<HttpResult<T>> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      reject(new Error(`Invalid URL: ${url}`));
      return;
    }

    const lib = parsed.protocol === "http:" ? http : https;
    const bodyStr =
      options.body !== undefined ? JSON.stringify(options.body) : undefined;

    const req = lib.request(
      parsed,
      {
        method: options.method ?? "GET",
        headers: {
          Accept: "application/json",
          ...(bodyStr
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(bodyStr),
              }
            : {}),
          ...(options.headers ?? {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          const status = res.statusCode ?? 0;

          let json: unknown;
          try {
            json = raw ? JSON.parse(raw) : {};
          } catch {
            const err: NoteHubHttpError = new Error(
              `NoteHub returned invalid JSON (status ${status})`,
            );
            err.status = status;
            reject(err);
            return;
          }

          if (status < 200 || status >= 300) {
            const body = json as { message?: string; code?: string };
            const err: NoteHubHttpError = new Error(
              body?.message ?? `Request failed with status ${status}`,
            );
            err.status = status;
            err.code = body?.code;
            // Still resolve headers/json via the error so callers needing
            // e.g. code can inspect it; reject so happy-path stays simple.
            reject(err);
            return;
          }

          resolve({ status, json: json as T, headers: res.headers });
        });
      },
    );

    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("NoteHub request timed out")));

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

/**
 * Pulls a single cookie's value out of a Set-Cookie response header list.
 * Works fine even for httpOnly cookies — that flag only restricts browser
 * JS (document.cookie / fetch), not a raw Node HTTP client reading headers.
 */
export function extractCookie(
  headers: http.IncomingHttpHeaders,
  name: string,
): string | undefined {
  const setCookie = headers["set-cookie"];
  if (!setCookie) return undefined;
  for (const entry of setCookie) {
    const match = entry.match(new RegExp(`^${name}=([^;]+)`));
    if (match) return decodeURIComponent(match[1]);
  }
  return undefined;
}
