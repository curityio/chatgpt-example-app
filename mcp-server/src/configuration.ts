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

/*
 * Configuration settings for the OAuth-secured MCP server that acts as an API gateway
 */
export default class Configuration {
    public port: string;
    public externalBaseUrl: string;
    public apiUrl: string;
    public authorizationServerBaseUrl: string;
    public tokenEndpoint: string;
    public authorizationEndpoint: string;
    public scope: string;
    public redirectUri: string;
    public authnServerBaseUrl: string;
    // The MCP server can connect to the authorization server using internal network (e.g. through http://idsvr:8443 when running on Docker), but `htu` claim in DPoP needs to be created using the authorization server's public address.
    public externalAuthnServerBaseUrl: string;
    public acr: string;
    public backendAccessToken: string;
    public username: string;
    public password: string;
    public haapiClientId: string;
    public haapiClientSecret: string;

    public constructor() {
        this.port = this.getValue('PORT');
        this.externalBaseUrl = this.getValue('EXTERNAL_BASE_URL');
        this.apiUrl = this.getValue('API_URL');
        this.authorizationServerBaseUrl = this.getValue('AUTHORIZATION_SERVER_BASE_URL');
        this.tokenEndpoint = this.getValue('TOKEN_ENDPOINT');
        this.authorizationEndpoint = this.getValue('AUTHORIZATION_ENDPOINT');
        this.scope = this.getValue('SCOPE');
        this.redirectUri = this.getValue('REDIRECT_URI');
        this.authnServerBaseUrl = this.getValue('AUTHN_SERVER_BASE_URL');
        this.externalAuthnServerBaseUrl = this.getValue('EXTERNAL_AUTHN_SERVER_BASE_URL');
        this.acr = this.getValue('ACR');
        this.backendAccessToken = this.getValue('BACKEND_ACCESS_TOKEN', '');
        this.haapiClientId = this.getValue('HAAPI_CLIENT_ID');
        this.haapiClientSecret = this.getValue('HAAPI_CLIENT_PASSWORD');
        this.username = this.getValue('USERNAME', 'testuser');
        this.password = this.getValue('PASSWORD', 'password');
    }

    private getValue(name: string, defaultValue?: string): string {

        const value = process.env[name];
        if (!value) {
            if (defaultValue || defaultValue === '') {
                return defaultValue;
            }

            throw new Error(`The environment variable ${name} has not been set`)
        }

        return value!;
    }
}
