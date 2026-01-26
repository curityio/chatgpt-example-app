/**
 * @param {se.curity.identityserver.procedures.context.ClientCredentialsTokenProcedureContext} context
 */
function result(context) {
    var delegationData = context.getDefaultDelegationData();
    var issuedDelegation = context.delegationIssuer.issue(delegationData);

    var accessTokenData = context.getDefaultAccessTokenData();
    var issuedAccessToken = context.defaultAccessTokenJwtIssuer.issue(accessTokenData, issuedDelegation);

    return {
        scope: accessTokenData.scope,
        access_token: issuedAccessToken,
        token_type: 'bearer',
        expires_in: secondsUntil(accessTokenData.exp),
    };
}
