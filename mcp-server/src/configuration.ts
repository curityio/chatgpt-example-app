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
 * Configuration settings for the OAuth-secured MCP server that runs in front of the Portfolio API
 */
export default class Configuration {
    public port: string;
    public haapiClientId: string;
    public haapiClientSecret: string;
    public externalBaseUrl: string;
    public apiUrl: string;
    public authorizationServerBaseUrl: string;
    public tokenEndpoint: string;
    public authorizationEndpoint: string;
    public lowPrivilegeScope: string;
    public highPrivilegeScope: string;
    public redirectUri: string;
    public acr: string;
    public developerMode: boolean;
    public haapiTestAccessToken: string;
    
    public constructor() {
        this.port = this.getValue('PORT');
        this.haapiClientId = this.getValue('HAAPI_CLIENT_ID');
        this.haapiClientSecret = this.getValue('HAAPI_CLIENT_PASSWORD');
        this.externalBaseUrl = this.getValue('EXTERNAL_BASE_URL');
        this.apiUrl = this.getValue('API_URL');
        this.authorizationServerBaseUrl = this.getValue('AUTHORIZATION_SERVER_BASE_URL');
        this.tokenEndpoint = this.getValue('TOKEN_ENDPOINT');
        this.authorizationEndpoint = this.getValue('AUTHORIZATION_ENDPOINT');
        this.lowPrivilegeScope = this.getValue('LOW_PRIVILEGE_SCOPE');
        this.highPrivilegeScope = this.getValue('HIGH_PRIVILEGE_SCOPE');
        this.redirectUri = this.getValue('REDIRECT_URI');
        this.acr = this.getValue('ACR');
        this.developerMode = this.getValue('DEVELOPER_MODE') === '1';
        this.haapiTestAccessToken = this.getValue('HAAPI_TEST_ACCESS_TOKEN', '');
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
