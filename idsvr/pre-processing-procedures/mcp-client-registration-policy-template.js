/**
 * @param {se.curity.identityserver.procedures.context.DcrPreProcessingProcedureContext} context
 * @returns {*}
 */
function result(context) {
  var request = context.getRequest();
  var httpMethod = request.getMethod();
  var attributes = {};

  if (httpMethod === "POST") {
    
    // Get the request scope
    var body = request.getParsedBodyAsJson();
    var scope = '';
    if (body && body.scope) {
      scope = body.scope;
    }

    // ChatGPT apps seem to not use MCP's scope selection strategy so we set a default scope
    attributes.scope = scope || 'portfolio';
    
    // Apply the security policy for MCP clients that access the Portfolio API
    attributes.require_proof_key = true;
    attributes.access_token_ttl = 1800; // 30 minutes
    attributes.refresh_token_ttl = 3600; // 1 hour

    // Add a custom property that specifies the audiences of this DCR client
    attributes.audiences = ["$EXTERNAL_BASE_URL/"];
  }

  return attributes;
}
