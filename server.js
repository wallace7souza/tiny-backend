#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require('./app');
var fs = require('fs');
var path = require('path');
var envConfig = require('./config/env/'+(NODE_ENV||'development'));

/**
 * Get port from environment and store in Express.
 */


var port = normalizePort(envConfig.app.port || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = null;

var serverKey = '/etc/nginx/conf.d/cert_dev/cloud.key';
var serverCrt = '/etc/nginx/conf.d/cert_dev/cloud.pem';

if( (ENV_SECURITY && envConfig.app.security) && fs.existsSync(serverKey) && fs.existsSync(serverCrt) ){

    var https = require('https');
    server = https.createServer({
        key: fs.readFileSync(serverKey),
        cert: fs.readFileSync(serverCrt)
    }, app);

}else{
    var http = require('http');
    server = http.createServer(app);
}



// var http = require('http');
// server = http.createServer(app);

/*var io = require('socket.io')(server);

io.on('connection', function(){

    console.log('user connected');

});
*/
/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    console.log('Listening on '+bind);
    // debug('Listening on ' + bind);
}
