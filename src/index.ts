import jwt_decode from "jwt-decode";

interface OIDCClientOptions {
  refreshPath?: string;
  baseUrl?: string;
  headers?: Record<string, string>;
}

interface TokenResponse {
  token?: string;
  refreshToken?: string;
}

export class OIDCClient {
  #refreshTokenPromise: Promise<void> | null;
  private refreshTokenLock: boolean;
  private refreshPath: string;
  private baseUrl: string | undefined;
  private BASE_HEADERS: Record<string, string>;

  constructor(options?: OIDCClientOptions) {
    this.refreshTokenLock = false;
    this.refreshPath = options?.refreshPath || "token/refresh";
    this.baseUrl = options?.baseUrl;
    this.BASE_HEADERS = options?.headers || {
      "Content-Type": "application/json; charset=UTF-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
    };
    this.#refreshTokenPromise = null;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  getBaseUrl(): string | undefined {
    return this.baseUrl;
  }

  setRefreshPath(path: string): void {
    if (path.startsWith("/")) path = path.slice(1);
    this.refreshPath = path;
  }

  getRefreshPath(): string {
    return this.refreshPath;
  }

  getBaseHeaders(): Record<string, string> {
    return this.BASE_HEADERS;
  }

  lockRefreshTokenLock(): void {
    this.refreshTokenLock = true;
  }

  releaseRefreshTokenLock(): void {
    this.refreshTokenLock = false;
  }

  async prepareHeaders(headers?: Record<string, string>): Promise<Record<string, string>> {
    if (!headers) headers = this.BASE_HEADERS;

    const token = await this.getAccessToken();

    if (token) return { ...headers, Authorization: `Bearer ${token}` };
    return headers;
  }

  async getAccessToken(): Promise<string | undefined> {
    if (typeof localStorage === "undefined" || !localStorage.getItem("refreshToken"))
      // Either we're in a non-browser environment, or session security is used
      return;

    try {
      for (let count = 0; this.refreshTokenLock && count < 15; count++) {
        if (this.#refreshTokenPromise) break;
        await this._wait((count) ? (200 * count) : undefined); //delays the next check of refreshTokenLock
      }

      if (this.#refreshTokenPromise) await this.#refreshTokenPromise;
      else if (!this.verifyTokenValidity()) await this._refreshToken();
    } catch (err) {
      console.log(err);
      sessionStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      document.dispatchEvent(new CustomEvent("logged-out", { bubbles: true, composed: true }));
    }

    return sessionStorage.getItem("token") || undefined;
  }

  async _wait(time = 1200): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(function () {
        resolve();
      }, time);
    });
  }

  verifyTokenValidity(): boolean {
    const token = sessionStorage.getItem("token");
    if (!token) return false;
    try {
      const exp = jwt_decode<{ exp: number }>(token);
      return exp && exp.exp >= (new Date().getTime() + 10000) / 1000;
    } catch (err) {
      return false;
    }
  }

  async _refreshToken(): Promise<void> {
    const token = sessionStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");
    const headers: Record<string, string> = { ...this.BASE_HEADERS };

    if (!refreshToken) throw "No refresh token";

    this.lockRefreshTokenLock();

    if (token) headers["Authorization"] = `Bearer ${token}`;
    headers["Refresh-Token"] = refreshToken;

    const base = this.getBaseUrl();
    if (!base) throw new Error("Missing `baseUrl` argument for OIDCClient");

    const refreshPath = this.getRefreshPath();
    const serviceUrl = base.replace(/\/?$/, "/").concat(refreshPath.replace(/^\/?/, ""));

    this.#refreshTokenPromise = fetch(serviceUrl, { method: "GET", headers: headers })
      .then(async (response) => {
        if (response.status === 403) throw 403;

        const data = await response.json() as TokenResponse;
        const token = data?.["token"] || response.headers.get("token");
        const refreshToken = data?.["refreshToken"] || response.headers.get("refreshToken");

        if (!token && !refreshToken) throw new Error("Couldn't fetch `access-token` or `refresh-token`");
        if (token) sessionStorage.setItem("token", token);
        if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      })
      .catch((err) => {
        console.log("Failed to refresh tokens", err);
        throw err;
      })
      .finally(() => {
        this.releaseRefreshTokenLock();
        this.#refreshTokenPromise = null;
      });

    return this.#refreshTokenPromise;
  }
}
