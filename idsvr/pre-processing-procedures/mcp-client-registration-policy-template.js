/**
 * @param {se.curity.identityserver.procedures.context.DcrPreProcessingProcedureContext} context
 * @returns {*}
 */
function result(context) {
  var request = context.getRequest();
  var httpMethod = request.getMethod();
  var attributes = {};

  if (httpMethod === "POST") {
    var body = request.getParsedBodyAsJson();
    if (
        (body && body.scope && body.scope.split(" ").indexOf("portfolio") !== -1) ||
        (body && body.client_name && body.client_name === 'ChatGPT') // ChatGPT apps seem not to use MCP's scope selection strategy
    ) {

        // Apply the security policy for MCP clients that access the Portfolio API
        attributes.require_proof_key = true;
        attributes.access_token_ttl = 900; // 30 minutes
        attributes.refresh_token_ttl = 3600; // 1 hour

        // Add a custom property that specifies the audiences of this DCR client
        attributes.audiences = ["https://$BASE_IDSVR_DOMAIN/"];
    }
  }

  return attributes;
}
