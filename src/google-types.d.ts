// Minimal typings for Google Identity Services (GSI) loaded via the script tag in index.html

interface TokenResponse {
  access_token: string;
  error?: string;
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (tokenResponse: TokenResponse) => void;
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

interface Google {
  accounts: {
    oauth2: {
      initTokenClient(config: TokenClientConfig): TokenClient;
      revoke(token: string, done?: () => void): void;
    };
  };
}

declare global {
  interface Window {
    google?: Google;
  }
}

export {};
