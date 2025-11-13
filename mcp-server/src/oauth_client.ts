import { Buffer } from 'buffer';
import https from 'https';
import * as DPoP from 'dpop'
import Configuration from "./configuration";

interface DPoPKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
}

export class DPoPOAuthClient {
  private readonly clientId: string;
  private readonly clientPassword: string;
  private readonly keyPair: Promise<DPoPKeyPair>;
  private readonly httpsAgent: https.Agent;
  private accessToken?: string;
  private tokenType?: string;
  private expiresAt?: Date;
  private sessionId?: string;

  constructor() {
      const config = new Configuration();
    this.clientId = config.haapiClientId;
    this.clientPassword = config.haapiClientSecret;
    this.keyPair = this.generateKeyPair();
    // Create HTTPS agent that ignores self-signed certificates
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false,
      requestCert: true,
      checkServerIdentity: () => undefined,
    });
  }

  private generateKeyPair(): Promise<DPoPKeyPair> {
    return DPoP.generateKeyPair('ES256', { extractable: false });
  }

  private getBasicAuthHeader(): string {
    // Encode client credentials for Basic Authentication according to RFC 6749
    const credentials = `${encodeURIComponent(this.clientId)}:${encodeURIComponent(this.clientPassword)}`;
    const encoded = Buffer.from(credentials, 'utf-8').toString('base64');
    return `Basic ${encoded}`;
  }

  private async createDPoPProof(method: string, url: string, accessToken?: string): Promise<string> {
    let nonce!: string | undefined;
    const keyPair = await this.keyPair;
    const dpopProof = await DPoP.generateProof(
      keyPair,
      url.split('?')[0],
      method,
      nonce,
      accessToken,
    );
    return dpopProof;
  }

  private isTokenExpired(): boolean {
    if (!this.expiresAt) return true;
    return new Date() >= this.expiresAt;
  }

  /**
   * Authenticate the OAuth client with the authorization server.
   *
   * Uses the Client Credentials grant type with DPoP.
   *
   * @param tokenEndpoint Authorization Server's token endpoint
   * @param scope The scope for which to request access
   * @returns
   */
  async authenticateClient(tokenEndpoint: string, scope: string): Promise<void> {
    if (this.accessToken && !this.isTokenExpired()) {
      return; // Token is still valid
    }

    const dpopProof = await this.createDPoPProof('POST', tokenEndpoint);

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: scope,
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': this.getBasicAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'DPoP': dpopProof,
      },
      body: body.toString(),
      // @ts-ignore - Node.js specific agent property
      agent: tokenEndpoint.startsWith('https:') ? this.httpsAgent : undefined,
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    const tokenData: TokenResponse = await response.json();

    this.accessToken = tokenData.access_token;
    this.tokenType = tokenData.token_type;

    if (tokenData.expires_in) {
      this.expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    }
    console.log('Obtained client Access Token, expires at:', this.expiresAt);
  }

  async request(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const method = options.method || 'GET';
    const dpopProof = await this.createDPoPProof(method, url, this.accessToken);

    const headers = {
      'Authorization': `${this.tokenType || 'DPoP'} ${this.accessToken}`,
      'DPoP': dpopProof,
      ... this.sessionId ? { 'Session-Id': this.sessionId } : {},
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      // @ts-ignore - Node.js specific agent property
      agent: url.startsWith('https:') ? this.httpsAgent : undefined,
    });

    if (response.headers.has('Set-Session-Id')) {
      this.sessionId = response.headers.get('Set-Session-Id') || undefined;
    }

    return response;
  }

  async get(url: string, headers?: Record<string, string>): Promise<Response> {
    return this.request(url, { method: 'GET', headers });
  }

  async post(url: string, body?: any, headers?: Record<string, string>): Promise<Response> {
    const requestHeaders = {
      ...headers,
    };

    return this.request(url, {
      method: 'POST',
      headers: requestHeaders,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  async postAuthorizationCode(url: string, code: string, redirectUri: string): Promise<TokenResponse> {
    const response = await this.postForm(
      url,
      {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }, {
      'Accept': 'application/json',
      'Authorization': this.getBasicAuthHeader(),
    }
    );
    return await response.json() as TokenResponse;
  }

  async postForm(url: string, formData: Record<string, string>, headers?: Record<string, string>): Promise<Response> {
    const body = new URLSearchParams(formData);

    const requestHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers,
    };

    return this.request(url, {
      method: 'POST',
      headers: requestHeaders,
      body: body.toString(),
    });
  }

  async put(url: string, body?: any, headers?: Record<string, string>): Promise<Response> {
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    return this.request(url, {
      method: 'PUT',
      headers: requestHeaders,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  async delete(url: string, headers?: Record<string, string>): Promise<Response> {
    return this.request(url, { method: 'DELETE', headers });
  }

  // Utility method to get current token info
  getTokenInfo(): { token: string | undefined; expiresAt: Date | undefined } {
    return {
      token: this.accessToken,
      expiresAt: this.expiresAt,
    };
  }
}

// Example usage:
// const client = new DPoPOAuthClient();
// const response = await client.get('https://api.example.com/protected-resource');
