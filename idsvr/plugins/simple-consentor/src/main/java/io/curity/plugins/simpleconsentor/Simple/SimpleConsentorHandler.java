package io.curity.plugins.simpleconsentor.Simple;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import se.curity.identityserver.sdk.attribute.Attribute;
import se.curity.identityserver.sdk.attribute.AttributeName;
import se.curity.identityserver.sdk.oauth.consent.ConsentorCompletionRequestHandler;
import se.curity.identityserver.sdk.oauth.consent.ConsentorCompletionResult;
import se.curity.identityserver.sdk.oauth.consent.IntermediateConsentState;
import se.curity.identityserver.sdk.service.SessionManager;
import se.curity.identityserver.sdk.web.Request;
import se.curity.identityserver.sdk.web.Response;
import se.curity.identityserver.sdk.web.ResponseModel;

public class SimpleConsentorHandler implements ConsentorCompletionRequestHandler<Request> {

    private final SessionManager _sessionManager;
    private final String _consentId;

    public SimpleConsentorHandler(SessionManager sessionManager, IntermediateConsentState intermediateConsentState) {
        _sessionManager = sessionManager;
        _consentId = intermediateConsentState.getTransactionId();;
    }

    @Override
    public Optional<ConsentorCompletionResult> get(Request request, Response response) {
        return Optional.empty();
    }

    @Override
    public Optional<ConsentorCompletionResult> post(Request request, Response response) {
        _sessionManager.put(Attribute.of(AttributeName.of(_consentId + SimpleConsentor.SESSION_ATTRIBUTE_NAME_APPROVED),true));
        return Optional.of(ConsentorCompletionResult.complete());
    }

    @Override
    public Request preProcess(Request request, Response response) {
        Map<String, Object> templateVariables = new HashMap<>();

        // Put client values
        var clientId = _sessionManager.get(_consentId + SimpleConsentor.SESSION_ATTRIBUTE_NAME_CLIENT_ID).getValue().toString();
        var client = Map.of(
                "id", clientId,
                "name", "MCP Client");
        templateVariables.put("_client", client);

        // Put subject values
        templateVariables.put("_authenticatedSubject", _sessionManager.get(_consentId + SimpleConsentor.SESSION_ATTRIBUTE_NAME_SUBJECT).getValue());

        // Add consent entries
        var scope = _sessionManager.get(_consentId + SimpleConsentor.SESSION_ATTRIBUTE_NAME_SCOPE).getValuesOfType(String.class);
        var userId = Map.of(
                "required", true,
                "displayName", "Account ID",
                "scopePrefix", "",
                "scopeSuffix", "",
                "value", "",
                "description", "Use your account ID");
        var portfolioScope = Map.of(
                "required", true,
                "displayName", "portfolio",
                "scopePrefix", "",
                "scopeSuffix", "",
                "value", "",
                "description", "Read stocks from your portfolio");

        var consentEntries = new HashMap<String, Object>();
        consentEntries.put("userid", userId);
        consentEntries.put("portfolio", portfolioScope);
        templateVariables.put("_consentEntries", consentEntries);
        templateVariables.put("_consentEntriesTyped", consentEntries);

        response.setResponseModel(ResponseModel.templateResponseModel(templateVariables, "index")
                , Response.ResponseModelScope.ANY);
        return request;
    }
}
