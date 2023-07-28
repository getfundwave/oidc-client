"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OIDCClient = void 0;
const jwt_decode_1 = __importDefault(require("jwt-decode"));
class OIDCClient {
    constructor(options) {
        this.refreshTokenLock = false;
        this.refreshPath = (options === null || options === void 0 ? void 0 : options.refreshPath) || "token/refresh";
        this.baseUrl = options === null || options === void 0 ? void 0 : options.baseUrl;
        this.BASE_HEADERS = (options === null || options === void 0 ? void 0 : options.headers) || {
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
        if (path.startsWith("/"))
            path = path.slice(1);
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
    prepareHeaders(HEADERS) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!HEADERS)
                HEADERS = this.BASE_HEADERS;
            const token = yield this.getAccessToken();
            if (token)
                return Object.assign(Object.assign({}, HEADERS), { Authorization: `Bearer ${token}` });
            else
                return HEADERS;
        });
    }
    getAccessToken() {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof localStorage === "undefined" || !localStorage.getItem("refreshToken"))
                // Either we're in a non-browser environment, or session security is used
                return;
            try {
                let count = 0;
                while (this.refreshTokenLock && count < 15) {
                    yield this._wait(count > 0 ? 200 * count : undefined); //delays the next check of refreshTokenLock
                    count += 1;
                }
                if (!this.verifyTokenValidity())
                    yield this._refreshToken();
            }
            catch (err) {
                console.log(err);
                sessionStorage.removeItem("token");
                localStorage.removeItem("refreshToken");
                document.dispatchEvent(new CustomEvent("logged-out", { bubbles: true, composed: true }));
            }
            return sessionStorage.getItem("token");
        });
    }
    _wait(time = 1200) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                setTimeout(function () {
                    resolve();
                }, time);
            });
        });
    }
    verifyTokenValidity() {
        const token = sessionStorage.getItem("token");
        if (!token)
            return false;
        try {
            const exp = (0, jwt_decode_1.default)(token);
            return (exp === null || exp === void 0 ? void 0 : exp.exp) && exp.exp >= (new Date().getTime() + 10000) / 1000;
        }
        catch (err) {
            return false;
        }
    }
    _refreshToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const headers = Object.assign({}, this.BASE_HEADERS);
            const refreshToken = localStorage.getItem("refreshToken");
            const token = sessionStorage.getItem("token");
            if (!refreshToken)
                throw "No refresh token";
            this.lockRefreshTokenLock();
            if (token)
                headers["Authorization"] = `Bearer ${token}`;
            headers["Refresh-Token"] = refreshToken;
            let base = this.getBaseUrl();
            if (!base)
                throw new Error("Missing `baseUrl` argument for OIDCClient");
            if (!base.endsWith("/"))
                base = `${base}/`;
            let refreshPath = this.getRefreshPath();
            if (refreshPath.startsWith("/"))
                refreshPath = refreshPath.slice(1);
            const serviceUrl = `${base}${refreshPath}`;
            return fetch(serviceUrl, { method: "GET", headers: headers })
                .then((response) => __awaiter(this, void 0, void 0, function* () {
                if (response.status === 403) {
                    throw 403;
                }
                else {
                    const data = yield response.json();
                    const token = (data === null || data === void 0 ? void 0 : data["token"]) || response.headers.get("token");
                    const refreshToken = (data === null || data === void 0 ? void 0 : data["refreshToken"]) || response.headers.get("refreshToken");
                    if (!token && !refreshToken)
                        throw new Error("Couldn't fetch `access-token` or `refresh-token`");
                    if (token)
                        sessionStorage.setItem("token", token);
                    if (refreshToken)
                        localStorage.setItem("refreshToken", refreshToken);
                }
            }))
                .catch((err) => {
                console.log(err);
                throw err;
            })
                .finally(() => {
                this.releaseRefreshTokenLock();
            });
        });
    }
}
exports.OIDCClient = OIDCClient;
