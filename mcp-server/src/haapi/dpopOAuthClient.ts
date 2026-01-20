/*
 *  Copyright 2025 Curity AB
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {Buffer} from 'buffer';
import https from 'https';
import {generateKeyPair, generateProof} from 'dpop'
import {Configuration} from '../configuration.js';
import {TokenResponse} from '../oauth/tokenResponse.js';
import {makeFetchRequest} from '../errors/fetchClient.js';
import {Session} from '../session/session.js';

/*
 * Sends DPoP proofs and follows HAAPI requests
 */
export class DPoPOAuthClient {

    private readonly session: Session;
    private readonly clientId: string;
    private readonly clientPassword: string;
    private readonly httpsAgent: https.Agent;
    private readonly authnBaseUrl: string;
    private readonly externalAuthnBaseUrl: string;
    private haapiSessionId?: string;

    constructor(configuration: Configuration, session: Session) {
        
        this.session = session;
        this.clientId = configuration.haapiClientId;
        this.clientPassword = configuration.haapiClientSecret;
        this.clientId = configuration.haapiClientId;
        this.clientPassword = configuration.haapiClientSecret;
        
        // The DPoPOAuthClient could send requests to internal token endpoints
        // However, the `htu` claim in DPoP must always be created using the authorization server's external URL
        this.authnBaseUrl = configuration.authorizationServerBaseUrl;
        this.externalAuthnBaseUrl = configuration.authorizationServerBaseUrl;

        // In some developer setups it is useful to create an HTTPS agent that ignores self-signed certificates
        this.httpsAgent = new https.Agent({
            rejectUnauthorized: false,
            requestCert: true,
            checkServerIdentity: () => undefined,
        });
    }

    private getBasicAuthHeader(): string {
      
        // Encode client credentials for Basic Authentication according to RFC 6749
      const credentials = `${encodeURIComponent(this.clientId)}:${encodeURIComponent(this.clientPassword)}`;
      const encoded = Buffer.from(credentials, 'utf-8').toString('base64')
          .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      return `Basic ${encoded}`;
    }

    private async createDPoPProof(method: string, url: string, accessToken?: string): Promise<string> {
        let nonce!: string | undefined;
        const dpopProof = await generateProof(
          this.session.dpopKeyPair!,
          this.ensureExternalDomain(url.split('?')[0]),
          method,
          nonce,
          accessToken,
        );
        return dpopProof;
    }

    private ensureExternalDomain(url: string): string {
        if (this.authnBaseUrl !== this.externalAuthnBaseUrl) {
            return url.replace(this.authnBaseUrl, this.externalAuthnBaseUrl);
        }

        return url;
    }

    private isTokenExpired(): boolean {
        
      if (!this.session.haapiExpiresAt) {
          return true;
        }
        return new Date() >= this.session.haapiExpiresAt;
    }

    async authenticateClient(tokenEndpoint: string, scope: string): Promise<void> {
      
        if (this.session.haapiAccessToken && !this.isTokenExpired()) {
            return;
        }

        const keypair = await generateKeyPair('ES256', { extractable: false });
        this.session.dpopKeyPair = keypair;

        const dpopProof = await this.createDPoPProof('POST', tokenEndpoint);
        console.log('>>> Using Dpop: ' + dpopProof);
        const body = new URLSearchParams({
            grant_type: 'client_credentials',
            scope: scope,
        });

        console.log('>>> Request with body ' + body.toString());

        const response = await makeFetchRequest(tokenEndpoint, {
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

        const tokenData = await response.json() as TokenResponse;

        this.session.haapiAccessToken = tokenData.access_token;
        this.session.haapiTokenType = tokenData.token_type;

        if (tokenData.expires_in) {
            this.session.haapiExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        }
        console.log('>>> Obtained client access token, expires at:', this.session.haapiExpiresAt);
    }

    async request(url: string, options: RequestInit = {}): Promise<Response> {
      
        if (!this.session.haapiAccessToken) {
            throw new Error('HAAPI access token not found');
        }

        const method = options.method || 'GET';
        const dpopProof = await this.createDPoPProof(method, url, this.session.haapiAccessToken);

        console.log('>>> Using Dpop: ' + dpopProof);

        const headers = {
            'Authorization': `${this.session.haapiTokenType || 'DPoP'} ${this.session.haapiAccessToken}`,
            'DPoP': dpopProof,
            ... this.haapiSessionId ? { 'Session-Id': this.haapiSessionId } : {},
            ...options.headers,
        };

        const response = await fetch(url, {
            ...options,
            headers,
            // @ts-ignore - Node.js specific agent property
            agent: url.startsWith('https:') ? this.httpsAgent : undefined,
        });
        console.log(`>>> HAAPI request returned status: ${response.status}`);

        if (response.headers.has('Set-Session-Id')) {
            this.haapiSessionId = response.headers.get('Set-Session-Id') || undefined;
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
            },
            {
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
            token: this.session.haapiAccessToken,
            expiresAt: this.session.haapiExpiresAt,
        };
    }
}
