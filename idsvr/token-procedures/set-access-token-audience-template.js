/**
 * @param {se.curity.identityserver.procedures.context.OpenIdConnectAuthorizationCodeTokenProcedureContext} context
 */
function result(context) {
  var delegationData = context.getDefaultDelegationData();
  var issuedDelegation = context.delegationIssuer.issue(delegationData);
  var accessTokenData = context.getDefaultAccessTokenData();

  // By default, require a correct resource parameter
  var resource = context.getRequest().getFormParameter("resource");
  if (resource && context.client.audiencesAsString && context.client.audiencesAsString.split(" ").indexOf(resource) != -1) {
    accessTokenData.aud = [resource];
  }
  else if (resource && context.client.properties.audiences && context.client.properties.audiences.indexOf(resource) != -1) {
    accessTokenData.aud = [resource];
  }
  else if (context.client.name === 'ChatGPT') {
    // ChatGPT apps seem to not send the resource parameter, so set the audience manually
    accessTokenData.aud = ['$EXTERNAL_BASE_URL/'];
  }
  else {
    throw exceptionFactory.badRequestException(
      "invalid_target",
      "Resource parameter is invalid or unknown."
    );
  }

  var issuedAccessToken = null;

  // Issue JWTs for internal requests
  if (context.client.id === 'mcp-server-haapi') {
    issuedAccessToken = context.getDefaultAccessTokenJwtIssuer().issue(
      accessTokenData,
      issuedDelegation
    );
  } else {
    issuedAccessToken = context.accessTokenIssuer.issue(
      accessTokenData,
      issuedDelegation
    );
  }

  var refreshTokenData = context.getDefaultRefreshTokenData();
  var issuedRefreshToken = context.refreshTokenIssuer.issue(
    refreshTokenData,
    issuedDelegation
  );

  var responseData = {
    access_token: issuedAccessToken,
    scope: accessTokenData.scope,
    refresh_token: issuedRefreshToken,
    token_type: "bearer",
    expires_in: secondsUntil(accessTokenData.exp),
  };

  var idTokenData = context.getDefaultIdTokenData();
  if (idTokenData) {
    var idTokenIssuer = context.idTokenIssuer;
    idTokenData.at_hash = idTokenIssuer.atHash(issuedAccessToken);
    responseData.id_token = idTokenIssuer.issue(idTokenData, issuedDelegation);
  }

  return responseData;
}
