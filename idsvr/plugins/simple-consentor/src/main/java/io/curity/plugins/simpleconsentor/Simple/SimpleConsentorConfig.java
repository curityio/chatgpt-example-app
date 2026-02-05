package io.curity.plugins.simpleconsentor.Simple;

import se.curity.identityserver.sdk.config.Configuration;
import se.curity.identityserver.sdk.config.annotation.Description;
import se.curity.identityserver.sdk.service.SessionManager;

public interface SimpleConsentorConfig extends Configuration
{
    @Description("Session manager keeps data about the session and therefore helps to determine if consent was given.")
    SessionManager getSessionManager();
}
