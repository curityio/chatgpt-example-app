package io.curity.plugins.simpleconsentor.Simple;

import java.util.HashMap;
import java.util.Map;
import se.curity.identityserver.sdk.oauth.consent.Consentor;
import se.curity.identityserver.sdk.oauth.consent.ConsentorCompletionRequestHandler;
import se.curity.identityserver.sdk.plugin.descriptor.ConsentorPluginDescriptor;

public final class SimpleConsentorDescriptor implements ConsentorPluginDescriptor<SimpleConsentorConfig>
{
    @Override
    public Class<? extends Consentor> getConsentorType()
    {
        return SimpleConsentor.class;
    }

    @Override
    public String getPluginImplementationType()
    {
        return "simple";
    }

    @Override
    public Class<? extends SimpleConsentorConfig> getConfigurationType()
    {
        return SimpleConsentorConfig.class;
    }

    @Override
    public Map<String, Class<? extends ConsentorCompletionRequestHandler<?>>> getConsentorRequestHandlerTypes() {
        Map<String, Class<? extends  ConsentorCompletionRequestHandler<?>>> exampleRequestHandlerTypes = new HashMap<>();
        exampleRequestHandlerTypes.put("index", SimpleConsentorHandler.class);
        return exampleRequestHandlerTypes;
    }
}
