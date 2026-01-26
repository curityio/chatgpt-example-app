/**
 * @param {se.curity.identityserver.procedures.context.SigningConsentorDisplayTextProcedureContext} context
 */
function result(context) {

    var apiClient = context.getWebServiceClient();

    var transactionScope = null;
    var scopes = context.consentAttributes.scopes;

    for (var i in context.consentAttributes.scopes) {
        var scope = scopes[i];
        if (scope.indexOf('transaction_') !== -1) {
            transactionScope = scope;
            continue;
        }
    }

    if (!transactionScope) {
        return "Not applicable";
    }

    var transactionDataResponse = apiClient.request(
        {
            method: 'GET',
            path: transactionScope.replace('transaction_', '')
        }
    )

    if (transactionDataResponse.statusCode !== 200) {
        throw exceptionFactory.badRequestException('Something went wrong with preparing the consent.');
    }

    var transactionData = JSON.parse(transactionDataResponse.body);

    var transactionType = 'buy';
    var quantity = transactionData.delta;

    if (transactionData['delta'] < 0) {
        transactionType = 'sell';
        quantity = -quantity;
    }

    return 'Do you want to ' + transactionType + ' ' + quantity + ' ' + transactionData.stockId + ' stocks?';
}
