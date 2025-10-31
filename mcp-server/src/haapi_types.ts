
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
export interface BankdIDAuthenticatorView extends HaapiView {
    type: 'polling-step';
    links: Array<{
        rel: string;
        href: string;
        type?: string;
    }>;
    properties: {
        status: 'pending' | 'completed' | 'failed';
    }
    actions: Array<{
        template: 'form';
        kind: 'poll';
        model: {
            href: string;
            method: string;
        }
    } | {
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
