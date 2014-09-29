var loopback = require('loopback');
module.exports = function mountLoopBackExplorer(server, next) {

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
      function waitForSOAPConnectorToLoad(i) {
        var soapConnector = soapConnectors[i];
        soapConnector.once('connected', function () {
          // Once it's loaded...
          var connectorModel = soapConnector.createModel(soapConnectorNames[i], {});
          var services = Object.keys(soapConnector.adapter.client.wsdl.services);
          for (var j = 0; j < services.length; j++) {
            var serviceName = services[j];
            var bindingName = serviceName + "Soap";
            var soapMethods = soapConnector.adapter.client.wsdl.definitions.bindings[bindingName].methods;
            for (var soapMethod in soapMethods) {
              creatParameterizedSoapRemoteMethod(soapMethod);
              function creatParameterizedSoapRemoteMethod(soapMethod) {
                var method = connectorModel.sharedClass.find(soapMethod, true);
                if (method !== null) {
                  method = method.fn;
                  method.shared = false;
                  var params = soapConnector.adapter.client.wsdl.definitions.bindings[bindingName].methods[soapMethod].input.$lookupTypes;
                  if (params.length > 0) {
                    var accepts = [];
                    for (var p = 0; p < params.length; p++) {
                      var param = {arg: '', type: '', required: true, http: {source: 'query'}};
                      param.arg = params[p].$name;
                      param.type = params[p].$type.replace('s:', '');
                      accepts.push(param);
                    }

                    connectorModel['_' + soapMethod] = function () {
                      var tempArguments = arguments;

                      var inputObject = {}
                      for (var ip = 0; ip < accepts.length; ip++) {
                        inputObject[accepts[ip].arg] = tempArguments[ip];
                      }
                      console.log(soapMethod + ":" + inputObject);
                      connectorModel[soapMethod](inputObject, function (err, response) {
                        console.log('Weather: %j', response);
                        var result = response;
                        tempArguments[tempArguments.length-1](err, result);
                      });
                    };

                    loopback.remoteMethod(
                      connectorModel['_' + soapMethod], {
                        accepts: accepts,
                        returns: {arg: 'result', type: 'object', root: true},
                        http: {verb: 'get', path: '/' + '_' + soapMethod}
                      }
                    );
                  }
                }
              }
            }
          }
//           var method = connectorModel.sharedClass.find('GetCityWeatherByZIP', true);
//           if (method !== null) {
//             method = method.fn;
// //            method.shared = false;
//             console.log(connectorModel['GetCityWeatherByZIP']);
//             method.accepts = [
//                 {arg: 'ZIP', type: 'string', required: true,
//                   http: {source: 'form'}}
//               ]
// //            method.fn.http = { "path": soapConnector.adapter.client.wsdl.options.wsdl.replace('?WSDL', '/') +  'GetCityWeatherByZIP' };
//             console.log(method);
//           }
//           console.log(soapConnector.adapter.client.wsdl.definitions.bindings);
//           console.log(soapConnector.adapter.client.wsdl.definitions.bindings.WeatherSoap.methods['GetCityWeatherByZIP'].input); //messages.GetCityWeatherByZIP.element.children[0].children[0]);
//           console.log(Object.keys(soapConnector.adapter.client.wsdl.services)[0]); //.definitions.bindings.WeatherSoap.methods.GetCityWeatherByZIP.input.$lookupTypes); //messages.GetCityWeatherByZIP.element.children[0].children[0]);
          server.model(connectorModel);
          // Let's associate a Model and expose it so it'll appear in Explorer

          console.log("SOAP Connector loaded: " + soapConnectorNames[i]);
          numSoapConnectorsLoaded++;
          if (numSoapConnectorsLoaded === numSoapConnectors) {
            // If we've loaded them all continue to setup Explorer
            setupExplorer();
          }
        });
      }
    }
  }
  else {
    setupExplorer();
  }

  function setupExplorer(bWaitForServerStarted) {
    var explorer;
    try {
      explorer = require('loopback-explorer');
    } catch(err) {
      console.log(
        'Run `npm install loopback-explorer` to enable the LoopBack explorer'
      );
      return;
    }

    var restApiRoot = server.get('restApiRoot');
    var explorerApp = explorer(server, { basePath: restApiRoot });
    server.use('/explorer', explorerApp);
    var baseUrl = server.get('url').replace(/\/$/, '');
    // express 4.x (loopback 2.x) uses `mountpath`
    // express 3.x (loopback 1.x) uses `route`
    var explorerPath = explorerApp.mountpath || explorerApp.route;
    console.log('Browse your REST API at %s%s', baseUrl, explorerPath);

    next();
      // This will return to finish up the App Setup...
  }
};
