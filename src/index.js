import jwt_decode from "jwt-decode";

export class OIDCClient {
  #refreshTokenPromise;

  constructor(options) {
    this.refreshTokenLock = false;
    this.refreshPath = options?.refreshPath || "token/refresh";
    this.baseUrl = options?.baseUrl;
    this.BASE_HEADERS = options?.headers || {
      "Content-Type": "application/json; charset=UTF-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
    };
  }

  setBaseUrl(url) {
    this.baseUrl = url;
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  setRefreshPath(path) {
    if (path.startsWith("/")) path = path.slice(1);
    this.refreshPath = path;
  }

  getRefreshPath() {
    return this.refreshPath;
  }

  getBaseHeaders() {
    return this.BASE_HEADERS;
  }

  lockRefreshTokenLock() {
    this.refreshTokenLock = true;
  }

  releaseRefreshTokenLock() {
    this.refreshTokenLock = false;
  }

  async prepareHeaders(headers) {
    if (!headers) headers = this.BASE_HEADERS;

    const token = await this.getAccessToken();

    if (token) return { ...headers, Authorization: `Bearer ${token}` };
    return headers;
  }

  async getAccessToken() {
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

    return sessionStorage.getItem("token");
  }

  async _wait(time = 1200) {
    return new Promise((resolve) => {
      setTimeout(function () {
        resolve();
      }, time);
    });
  }

  verifyTokenValidity() {
    const token = sessionStorage.getItem("token");
    if (!token) return false;
    try {
      const exp = jwt_decode(token);
      return exp && exp.exp >= (new Date().getTime() + 10000) / 1000;
    } catch (err) {
      return false;
    }
  }

  async _refreshToken() {
    const token = sessionStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");
    const headers = { ...this.BASE_HEADERS };

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

        const data = await response.json();
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
