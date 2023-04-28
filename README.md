### OIDC Client

---

@fundwave/oidc-client is a client-side library that allows you to prepare headers for your network-calls by automatically refreshing tokens (if expired) at the provided connection-url. It then parses the response and updates the tokens at their respective locations.

#### Installation

```sh
npm install @fundwave/oidc-client
```

#### Usage

```js
const Client = new OIDCClient();
```

- Set the URL-String where token-refresh requests will be sent

  ```js
  Client.setBaseUrl("https://testing-placeholder.com");
  ```

- Set the path on the server which is responsible for the refresh

  ```js
  Client.setRefreshPath("refresh-token");
  ```

  > Note: the `refreshPath` property defaults to **token/refresh**

#### Caveats:

- The library allows for the server to send the tokens back in the responses in either the **body** or **headers**

- **Access Token** is maintained at browser's *session-storage* with the key being `token`
- **Refresh Token** is maintained at browser's *local-storage* with the key being `refreshToken`
