package io.curity.plugins.simpleconsentor.Simple;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import se.curity.identityserver.sdk.attribute.Attribute;
import se.curity.identityserver.sdk.attribute.AttributeName;
import se.curity.identityserver.sdk.attribute.ConsentAttributes;
import se.curity.identityserver.sdk.oauth.consent.ConsentorResult;
import se.curity.identityserver.sdk.oauth.consent.Consentor;
import se.curity.identityserver.sdk.oauth.consent.ConsentorResultAttributes;
import se.curity.identityserver.sdk.service.SessionManager;

public final class SimpleConsentor implements Consentor
{
    public static String SESSION_ATTRIBUTE_NAME_CLIENT_ID = "clientId";
    public static String SESSION_ATTRIBUTE_NAME_SUBJECT = "subject";
    public static String SESSION_ATTRIBUTE_NAME_SCOPE = "scope";
    public static String SESSION_ATTRIBUTE_NAME_APPROVED = "approved";

    private final SessionManager _sessionManager;
    private final Logger _logger;

    public SimpleConsentor(SessionManager sessionManager)
    {
        _sessionManager = sessionManager;
        _logger = LoggerFactory.getLogger(SimpleConsentor.class);
    }

    @Override
    public ConsentorResult apply(ConsentAttributes consentAttributes, String consentId)
    {
        /* Debug available attributes if required
+        for (var attr : consentAttributes) {
+            _logger.info("Consent attribute name: " + attr.getName().getValue());
+            _logger.info("Consent attribute value: " + attr.getValue().toString());
+        }
+        */
        
        if (!isCompleted(consentId)) {

            // Put values for the handler
            _sessionManager.put(Attribute.of(AttributeName.of(consentId + SESSION_ATTRIBUTE_NAME_CLIENT_ID), consentAttributes.getClientId()));
            _sessionManager.put(Attribute.of(AttributeName.of(consentId + SESSION_ATTRIBUTE_NAME_SUBJECT), consentAttributes.getAuthenticationAttributes().getSubject()));
            if (consentAttributes.getScopeNames().iterator().hasNext()) {
                _sessionManager.put(Attribute.of(AttributeName.of(consentId + SESSION_ATTRIBUTE_NAME_SCOPE), consentAttributes.getScopeNames().iterator().next()));
            }

            return ConsentorResult.pendingWithPromptUserCompletion();

        } else {
            // Clean up  the session
            _sessionManager.remove(consentId + SESSION_ATTRIBUTE_NAME_CLIENT_ID);
            _sessionManager.remove(consentId + SESSION_ATTRIBUTE_NAME_SUBJECT);
            _sessionManager.remove(consentId + SESSION_ATTRIBUTE_NAME_SCOPE);
            _sessionManager.remove(consentId + SESSION_ATTRIBUTE_NAME_APPROVED);

            return ConsentorResult.success(ConsentorResultAttributes.empty());
        }
    }

    private boolean isCompleted(String consentId) {

        Attribute userApproval = _sessionManager.get(consentId + SESSION_ATTRIBUTE_NAME_APPROVED);
        if (userApproval != null && userApproval.hasValueOfType(Boolean.class)) {
            return userApproval.getValueOfType(Boolean.class);
        } else {
            return false;
        }
    }
}
