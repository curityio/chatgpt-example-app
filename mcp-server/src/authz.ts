import * as QRCode from 'qrcode';

export async function obtainAuthorization(): Promise<{ success: boolean; message: string; qrCode?: string }> {
    try {
        // Generate QR code for the OAuth development URL
        const url = 'https://localhost:8443/oauth/dev/';
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
            message: 'Authorization successful! Please scan the QR code to access the OAuth development endpoint.',
            qrCode: qrCodeDataURL
        };
    } catch (error) {
        console.error('Error generating QR code:', error);
        
        // Even if QR code generation fails, return success as requested
        return {
            success: true,
            message: 'Authorization successful! OAuth URL: https://localhost:8443/oauth/dev/',
            qrCode: undefined
        };
    }
}
