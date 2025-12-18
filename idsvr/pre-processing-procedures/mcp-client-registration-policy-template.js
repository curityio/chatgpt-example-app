/**
 * @param {se.curity.identityserver.procedures.context.DcrPreProcessingProcedureContext} context
 * @returns {*}
 */
function result(context) {
  var request = context.getRequest();
  var httpMethod = request.getMethod();
  var attributes = {};

  // Apply the security policy for MCP clients that access the Portfolio API
  // Note that ChatGPT does not supply a scope in its DCR request
  if (httpMethod === "POST") {
    
    // Set a property to store the allowed access token audiences for the DCR client
    attributes.audiences = ["$EXTERNAL_BASE_URL/"];

    // The example uses a 30 minute access token, to provide sufficient development time to debug HAAPI flows
    attributes.require_proof_key = true;
    attributes.access_token_ttl = 1800;
  }

  return attributes;
}
