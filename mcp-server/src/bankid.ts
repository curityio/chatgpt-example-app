import { DPoPOAuthClient } from './oauth_client';
import { BankdIDAuthenticatorView } from './haapi_types';
import { haapiHeaders, haapiResponseView } from './haapi_utils';

export async function authenticateWithBankID(
    client: DPoPOAuthClient,
    bankIDView: BankdIDAuthenticatorView,
) {
    const qrCode = findQrCode(bankIDView);
    console.log('BankID QR Code (base64):', qrCode);

    let bankIDViewCurrent = bankIDView;

    // pause for a second before polling
    await new Promise(resolve => setTimeout(resolve, 2000));

    // TODO keep polling until authentication is complete
    // while (true) {
        const pollAction = findPollAction(bankIDViewCurrent);
        bankIDViewCurrent = await haapiResponseView<BankdIDAuthenticatorView>(
            await client.get(pollAction.model.href, haapiHeaders),
            client
        );
        console.log('BankID poll response status:', bankIDViewCurrent);
    // }
    
}

export function findQrCode(view: BankdIDAuthenticatorView): string {
    const qrCodeLink = view.links.find(link => link.rel === 'activation' && link.type === 'image/png');
    if (!qrCodeLink) {
        throw new Error('QR code link not found in BankID authenticator view');
    }
    if (qrCodeLink.href.startsWith('data:image/png;base64,')) {
        return qrCodeLink.href.substring('data:image/png;base64,'.length);
    }
    throw new Error('QR code link is not a base64 data URL: ' + qrCodeLink.href);
}

function findPollAction(view: BankdIDAuthenticatorView) {
    const action = view.actions.find(action => action.kind === 'poll');
    if (!action) {
        throw new Error('Poll action not found in BankID authenticator view');
    }
    return action;
}
