const zmq = require('zeromq').socket('sub');
const WebSocketServer = require('websocket').server;
const http = require('http');

// Create an http server needed to creates an ws one.
// Http and WS port will be identical.
const server = http.createServer((request, response) => {});
server.listen(1337, function () {
    console.log((new Date()) + ' Server is listening on port 1337');
});

const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false,
});

// For poc no need to bother with origins
const  originIsAllowed = (origin) => {
    return true;
}

wsServer.on('request', function (request) {
    if (!originIsAllowed(request.origin)) {
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }
    const connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted from: ' + request.origin);

    const url = 'tcp://node.iota-tangle.io:5556';
    zmq.connect(url);

    zmq.subscribe('tx')  /* newly seen transactions */
    zmq.subscribe('sn')  /* newly confirmed transactions */
    zmq.subscribe('lmi') /* latest milestone index */

    // Forward zmq data via ws connection to client.
    zmq.on('message', msg => {
        const data = msg.toString().split(' ');
        connection.sendUTF(data);
    });

    connection.on('close', function (reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});