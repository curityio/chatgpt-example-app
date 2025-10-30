import * as QRCode from 'qrcode';
import { DPoPOAuthClient } from './haapi_client';

export async function callHaapi() {
    const client = new DPoPOAuthClient();
    await client.authenticate('https://localhost:8443/dev/oauth/token');
    
    // start OAuth authorization via HAAPI
    const url = new URL('https://localhost:8443/dev/oauth/authorize');
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('client_id', process.env.HAAPI_CLIENT_ID || 'haapi-client');
    url.searchParams.append('redirect_uri', 'https://localhost:7777/client-callback');
    url.searchParams.append('scope', 'read');
    url.searchParams.append('state', 'random-state-value');

    const response = await client.get(url.toString(), {
        'Accept': 'application/vnd.auth+json'
    });
    const data = await response.json();
    console.log('HAAPI token response:', data);
}

export async function obtainAuthorization(): Promise<{ success: boolean; message: string; qrCode?: string }> {
    try {
        // TODO call BankID and get a real QR code
        const url = 'https://curity.io/';
        const qrCodeDataURL = await QRCode.toDataURL(url, {
            errorCorrectionLevel: 'M',
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            width: 256
        });

        return {
            success: true,
            message: `Authorization successful! Please scan the QR code to finish the authorization process.`,
            qrCode: qrCodeDataURL
        };
    } catch (error) {
        console.error('Error generating QR code:', error);
        
        // Even if QR code generation fails, return success as requested
        return {
            success: false,
            message: 'Authorization failed. Please try again later.',
        };
    }
}
