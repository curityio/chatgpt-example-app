import * as QRCode from 'qrcode';

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
