/**
 * This is an example procedure that performs no transformation
 * @param {se.curity.identityserver.procedures.context.TransformationProcedureContext} context
 * @returns {*}
 */
function result(context) {
    // the 'context.attributeMap' content comes from the configured 'attributes-location' (subject-attributes, context-attributes, or action-attributes)
    var attributes = context.attributeMap;

    attributes.originalSubject = context.subjectAttributeMap.subject;
    /*
        Example: To add @example.com to each username, assuming 'attributes-location' is 'subject-attributes', do:
        attributes.subject = attributes.subject + '@example.com';
       */

    /*
        Example: To add extra attributes, like device id's:
        attributes.deviceIds = [1, 2, 3];
       */

    /*
        Example: If this transformation procedure is running on an authentication action
        then it is also possible to directly access each one of the three attribute locations available to authentication actions
        if (context.actionAttributeMap) {
            var subject = context.subjectAttributeMap.subject
            logger.info(context.contextAttributeMap.acr)
            logger.info(context.actionAttributeMap.someActionAttribute)
        }
       */

    // the returned attributes will be assigned to the configured 'attributes-location'
    return attributes;
}
