var loopback = require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();

// Set up the /favicon.ico
app.use(loopback.favicon());

// request pre-processing middleware
app.use(loopback.compress());

// -- Add your pre-processing middleware here --



// boot scripts mount components like REST API
boot(app, __dirname);
	// We took explorer.js out of /boot and put it in /server root next to server.js


require('./processSoapConnectors')(app, finishUp);
	// To ensure that SOAP Interfaces appear within Explorer, we took Explorer out of the /boot directory
	// The Explorer will Load within "finishUp" below when its all custom Setup is done by processSoapConnectors above.


// Defer all the rest of the Startup Work until Explorer is properly configured.
function finishUp() {

	require('./explorer')(app);
		// This was formerly done within "boot" above...

	// -- Mount static files here--
	// All static middleware should be registered at the end, as all requests
	// passing the static middleware are hitting the file system
	// Example:
	//   app.use(loopback.static(path.resolve(__dirname', '../client')));
	var websitePath = require('path').resolve(__dirname, '../client');
	app.use(loopback.static(websitePath));

	// Requests that get this far won't be handled
	// by any middleware. Convert them into a 404 error
	// that will be handled later down the chain.
	app.use(loopback.urlNotFound());

	// The ultimate error handler.
	app.use(loopback.errorHandler());

	app.start = function() {
	  // start the web server
	  return app.listen(function() {
	    app.emit('started');
	    console.log('Web server listening at: %s', app.get('url'));
	  });
	};

	// start the server if `$ node server.js`
	if (require.main === module) {
	  app.start();
	}
}


