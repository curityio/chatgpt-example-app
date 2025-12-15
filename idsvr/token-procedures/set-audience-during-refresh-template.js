/**
 * @param {se.curity.identityserver.procedures.context.RefreshTokenProcedureContext} context
 */
function result(context) {
    var accessTokenData = context.getDefaultAccessTokenData(context.delegation);

    if (context.client.name === 'ChatGPT') {
        // Set the audience during access token refresh
        accessTokenData.aud = ['https://$BASE_IDSVR_DOMAIN/'];
    }

    var issuedAccessToken = context.accessTokenIssuer.issue(accessTokenData, context.delegation);

    var refreshToken = context.presentedToken.value;

    if (refreshToken === null) {
        var refreshTokenData = context.getDefaultRefreshTokenData();
        refreshToken = context.refreshTokenIssuer.issue(refreshTokenData, context.delegation);
    }

    return {
        scope: accessTokenData.scope,
        access_token: issuedAccessToken,
        refresh_token: refreshToken,
        token_type: 'bearer',
        expires_in: secondsUntil(accessTokenData.exp),
    };
}
