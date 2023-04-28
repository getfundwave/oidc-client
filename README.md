## OIDC Client

---

@fundwave/oidc-client is a client-side library that allows you to prepare headers for your network-calls by automatically refreshing tokens (if expired) at the provided connection-url. It then parses the response and updates the tokens.

### Installation

```sh
npm install @fundwave/oidc-client
```

### Initialization

```js
import { OIDCClient } from "@fundwave/oidc-client";

const oidcClient = new OIDCClient();
```

- Set the URL-String where token-refresh requests will be sent

  ```js
  oidcClient.setBaseUrl("https://testing-placeholder.com");
  ```

- Set the path on the server which is responsible for the refresh

  ```js
  oidcClient.setRefreshPath("refresh-token");
  ```

  > Note: the `refreshPath` property defaults to **token/refresh**

### Usage

Once the class has been instantiated, you can

- use the `prepareHeaders` method to get the required headers for your calls

  ```js
  const headers = await oidcClient.prepareHeaders();
  ```

- use the `getAccessToken` method to update the tokens (access and refresh) at browser's storage

  ```js
  await oidcClient.getAccessToken();
  ```

- If the refresh-token call returns a `403` status (Unauthorized), the library would throw an custom-event `logged-out`

### Note:

- Tokens aren't refreshed every-time the `prepareHeaders` method is called. The library sets up a timeout which later triggers an update when the token is about to expire.

- **Access Token** is maintained at browser's _session-storage_ with the key being `token`
- **Refresh Token** is maintained at browser's _local-storage_ with the key being `refreshToken`

- The library allows for the server to send the tokens back in either the response **body** or **headers**
