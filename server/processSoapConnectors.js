var loopback = require('loopback');
module.exports = function processSoapConnectors(server, next) {

  var soapConnectors = [];
  var soapConnectorNames = [];
  var connectorIndex = 0;
  for (var dataSource in server.dataSources) {
    // HACK: Each Connector has a generated Alias so only use the EVEN numbered Connectors
    if (((connectorIndex % 2) === 0) && (server.dataSources[dataSource].name.indexOf("soap") >= 0)) {
      // If it's a SOAP connector let's collect them
      soapConnectors.push(server.dataSources[dataSource]);
      soapConnectorNames.push(dataSource);
    }
    connectorIndex++;
  }  
  var numSoapConnectors = soapConnectors.length;
  var numSoapConnectorsLoaded = 0;

  if (numSoapConnectors > 0) {
    // If we found some SOAP Connectors...

    for (var i = 0; i < numSoapConnectors; i++) {

      waitForSOAPConnectorToLoad(i);
        // Handle each one in its own scope...

      function waitForSOAPConnectorToLoad(i) {
        var soapConnector = soapConnectors[i];
        soapConnector.once('connected', function () {
          // Once it's loaded...
          var connectorModel = soapConnector.createModel(soapConnectorNames[i], {});
          var services = Object.keys(soapConnector.adapter.client.wsdl.services);
          for (var j = 0; j < services.length; j++) {
            // Handle each service...

            parameterizeSoapService(j, 'Soap');
              // in its own scope...
            parameterizeSoapService(j, 'Soap12');
              // Let's do Soap12 for now...

            function parameterizeSoapService(j, serviceQualifier) {
              var serviceName = services[j];
                // This is the Service Name somethin like "Weather"...
              var bindingName = serviceName + serviceQualifier;

              var soapMethods = soapConnector.adapter.client.wsdl.definitions.bindings[bindingName];
              if (soapMethods === undefined) {
                soapMethods = {};
              }
              else {
                soapMethods = soapMethods.methods;
              }
              for (var soapMethod in soapMethods) {
                // Parameterize each method...

                creatParameterizedSoapRemoteMethod(soapMethod);
                  // in its own scope...

                function creatParameterizedSoapRemoteMethod(soapMethod) {
                  var methodName = soapMethod;
                  if (serviceQualifier !== 'Soap') {
                    methodName = serviceName + '_' + serviceName + serviceQualifier + '_' + soapMethod;
                  }
                  var method = connectorModel.sharedClass.find(methodName, true);
                    // find the corresponding method in the Loopback Model we attached to the Connector...

                  if (method !== null) {
                    console.log(method.name);
                    method = method.fn;

                    var params = soapConnector.adapter.client.wsdl.definitions.bindings[bindingName].methods[soapMethod].input.$lookupTypes;
                    if (params.length > 0) {
                      // if we found input parameters...

                      method.shared = false;
                        // Hide the standard Method generated in the Model...

                      var accepts = [];
                      for (var p = 0; p < params.length; p++) {
                        var param = {arg: '', type: '', required: true, http: {source: 'query'}};
                        param.arg = params[p].$name;
                        param.type = params[p].$type.replace('s:', '');
                        accepts.push(param);
                      }
                        // generate a Loopback Style Input Parameter Array
                        // TODO Below...
                        // *********** We need to test with a variety of Soap Services
                        // *********** to ensure the the $type maps correctly from the
                        // *********** Soap standards to our Javascript types.
                        // Right now we know "string" type parameters work, but others might fail.

                      // The Signature for the new Remote Methods will PREPEND an UNDERSCORE
                      connectorModel['_' + methodName] = function () {
                        var tempArguments = arguments;
                          // Cache the input arguments...

                        var inputObject = {}
                        for (var ip = 0; ip < accepts.length; ip++) {
                          inputObject[accepts[ip].arg] = tempArguments[ip];
                        }
                          // Generate the Object to pass to the Standard, Unparameterized Method.

                        connectorModel[methodName](inputObject, function (err, response) {
                          // Call the Standard Method...

                          tempArguments[tempArguments.length-1](err, response);
                            // The Callback will always be the last input Argument.
                        });
                      };

                      loopback.remoteMethod(
                        connectorModel['_' + methodName], {
                          accepts: accepts,
                            // This is the Loopback Style Parameter List...
                          returns: {arg: 'result', type: 'object', root: true},
                            // TODO: Test for other Soap Return Types...
                          http: {verb: 'get', path: '/' + '_' + methodName}
                        }
                      );
                    }
                  }
                }
              }
            }
          }
          server.model(connectorModel);
          // Let's associate a Model and expose it so it'll appear in Explorer

          console.log("SOAP Connector loaded: " + soapConnectorNames[i]);
          numSoapConnectorsLoaded++;
          if (numSoapConnectorsLoaded === numSoapConnectors) {
            // If we've loaded them all continue to setup Explorer
            finishUp();
          }
        });
      }
    }
  }
  else {
    finishUp();
  }

  function finishUp() {
    // Do any other work here...  Nothing yet...
    next();
      // This will return to finish up the App Setup...
  }
};
