var http = require("http"),
    path = require("path"),
    socket = require('socket.io');


exports.createSocketServer = function (emitter) {
    var server = http.createServer(handler),
        io = socket.listen(server, { 'log level':2 });

    server.listen(8080);

    io.sockets.on('connection', function (socket) {
        socket.on("register", function (data) {
            emitter.emit("register", data);
        })
    })
}
