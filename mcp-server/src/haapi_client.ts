import crypto from 'crypto';
import { Buffer } from 'buffer';
import https from 'https';
import * as DPoP from 'dpop'

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

  constructor() {
    this.clientId = process.env.HAAPI_CLIENT_ID || 'haapi-client';
    this.clientPassword = process.env.HAAPI_CLIENT_PASSWORD || '0ne!Secret';
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

  async authenticate(tokenEndpoint: string): Promise<void> {
    if (this.accessToken && !this.isTokenExpired()) {
      return; // Token is still valid
    }

    const dpopProof = await this.createDPoPProof('POST', tokenEndpoint);

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      scope     : 'urn:se:curity:scopes:haapi',
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
    console.log('Obtained HAAPI access token, expires at:', this.expiresAt);
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
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
      // @ts-ignore - Node.js specific agent property
      agent: url.startsWith('https:') ? this.httpsAgent : undefined,
    });
  }

  async get(url: string, headers?: Record<string, string>): Promise<Response> {
    return this.request(url, { method: 'GET', headers });
  }

  async post(url: string, body?: any, headers?: Record<string, string>): Promise<Response> {
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    return this.request(url, {
      method: 'POST',
      headers: requestHeaders,
      body: typeof body === 'string' ? body : JSON.stringify(body),
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