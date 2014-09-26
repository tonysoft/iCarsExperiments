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
