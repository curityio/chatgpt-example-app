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

export interface HaapiView {
    type: string;
    metadata: {
        viewName: string;
    }
}

export interface HaapiRedirect extends HaapiView {
    type: 'redirection-step';
    actions: Array<{
        template: 'form';
        kind: 'redirect';
        model: { href: string, method: string, fields?: Array<{ name: string, value: string }> };
    }>;
}

export interface AccessTokenAuthenticatorView extends HaapiView {
    type: 'authentication-step';
    actions: Array<{
        template: 'form';
        kind: 'login';
        model: {
            href: string;
            method: 'POST';
            fields: {
                name: 'token',
                type: 'text',
                label: 'Token',
            }
        }
    }>;
}

export interface HtmlFormAuthenticatorView extends HaapiView {
    type: 'authentication-step';
    actions: Array<{
        template: 'form';
        kind: 'login';
        model: {
            href: string;
            method: 'POST';
            fields: {
                name: 'userName' | 'password',
                type: 'text',
                label: string,
            }
        }
    }>;
}

export interface RedirectAction {
    template: 'form';
    kind: 'redirect';
    model: { href: string, method: string, fields?: Array<{ name: string, value: string }> };
}

export interface PollAction {
    template: 'form';
    kind: 'poll';
    model: {
        href: string;
        method: string;
    }
}

export interface BankIDAuthenticatorView extends HaapiView {
    type: 'polling-step';
    links: Array<{
        rel: string;
        href: string;
        type?: string;
    }>;
    properties: {
        status: 'pending' | 'done' | 'failed';
    }
    actions: Array<
        PollAction | RedirectAction | {
        template: 'form';
        kind: 'cancel';
        model: {
            href: string;
            method: string;
            type: string;
        }
    } | {
        template: 'client-operation';
        kind: 'login',
        model: {
            name: 'bankid',
            arguments: {
                href: string;
                autoStartToken: string;
                redirect: string;
            },
            continueActions: Array<{
                template: 'form';
                kind: 'redirect';
                model: {
                    href: string;
                    method: string;
                }
            }>;
        }
    }>;
}

export interface EmailAuthenticatorView extends HaapiView {
    type: 'polling-step';
    links: Array<{
        rel: string;
        href: string;
        type?: string;
    }>;
    properties: {
        status: 'pending' | 'done' | 'failed';
    }
    actions: Array< PollAction | RedirectAction | {
        template: 'form';
        kind: 'cancel';
        model: {
            href: string;
            method: string;
            type: string;
        }
    } | {
        template: 'client-operation';
        kind: 'login',
        model: {
            name: 'email',
            arguments: {
                href: string;
                autoStartToken: string;
                redirect: string;
            },
            continueActions: Array<{
                template: 'form';
                kind: 'redirect';
                model: {
                    href: string;
                    method: string;
                }
            }>;
        }
    }>;
}

export interface OAuthAuthorizationResponseView extends HaapiView {
    type: 'oauth-authorization-response';
    links: Array<{
        href: string;
        rel: 'authorization-response';
    }>;
    properties: {
        code: string;
        iss: string;
        state?: string;
    }
}
