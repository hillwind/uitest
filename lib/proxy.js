var http = require('http');
var https = require('https');
var url = require('url');
var util = require('util');
var zlib = require('zlib');
var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var log = require('./logger').create('proxy');


var request_id_next = 1;
var reg = function () {
    var url = path.resolve(__dirname, '../static/regedit/add.reg')
    var _process = spawn("regedit", ["/S", url])
    var errorOutput = '';
    _process.stderr.on('data', function (data) {
         console.log(data.toString())
    });

    _process.on('close', function (code) {
    });

}


var setupProxyServer = function () {
    var server = http.createServer(function (request, response) {
        var self =this;
        var errState =false;
        var injectScript = '<script src="http://localhost:8080/static/lib/jquery-1.8.3.js" ></script>' +
            '<script src="http://localhost:8080/socket.io/socket.io.js" ></script>' +
            '<script src="http://localhost:8080/static/lib/json.js" ></script>' +
            '<script src="http://localhost:8080/static/lib/jasmine.js" ></script>' +
            '<script src="http://localhost:8080/static/lib/jasmine-html.js" ></script>' +
            '<script src="http://localhost:8080/static/lib/simulate.js" ></script>' +
            '<script src="http://localhost:8080/static/lib/matcher.js" ></script>' +
            '<script src="http://localhost:8080/static/lib/taobao.js" ></script>' +
            '<script src="http://localhost:8080/static/uitest.js" ></script>';


        //
        // #### function proxyError (err)
        // #### @err {Error} Error contacting the proxy target
        // Short-circuits `res` in the event of any error when
        // contacting the proxy target at `host` / `port`.
        //
        function proxyError(err) {
            errState = true;

            //
            // Emit an `error` event, allowing the application to use custom
            // error handling. The error handler should end the response.
            //
            if (self.emit('proxyError', err, request, response)) {
                return;
            }

            response.writeHead(500, { 'Content-Type': 'text/plain' });

            if (request.method !== 'HEAD') {
                //
                // This NODE_ENV=production behavior is mimics Express and
                // Connect.
                //
                if (process.env.NODE_ENV === 'production') {
                    response.write('Internal Server Error');
                }
                else {
                    response.write('An error has occurred: ' + JSON.stringify(err));
                }
            }

            try { response.end() }
            catch (ex) { log.error("res.end error: %s", ex.message) }
        }

        var request_url = url.parse(request.url);
        var proxy_options = {};
        proxy_options.headers = request.headers;
        proxy_options.path = request_url.path;
        proxy_options.method = request.method;
        proxy_options.host = request_url.host;
        //  proxy_options.agent = request_url.agent;
        proxy_options.hostname = request_url.hostname;
        proxy_options.port = request_url.port || 80;

      //  proxy_options.headers["accept-encoding"] = '*;q=1,gzip=0'

        var proxy_request = http.request(proxy_options, function (proxy_response) {

            //
            // Process the `reverseProxy` `response` when it's received.
            //
            if (proxy_response.headers.connection) {
                if (request.headers.connection) { proxy_response.headers.connection = request.headers.connection }
                else { proxy_response.headers.connection = 'close' }
            }

            // Remove `Transfer-Encoding` header if client's protocol is HTTP/1.0
            if (request.httpVersion === '1.0') {
                delete proxy_response.headers['transfer-encoding'];
            }


            var content_type = proxy_response.headers['content-type'] || "";
            var is_text = content_type.match('text\/html') || 0;

            if (request.url.match(/\.(ico|xml|css|js|jpg|gif|png|bat|swf)/i)) {
                is_text = 0;
            }
            if (request.url.match(/(owa|facebook|gravatar|vimeo|stumbleupon)/)) {
                is_text = 0;
            }

            if (is_text) {
              //  console.log(request.method, request.url)
            }


            var contentEncoding = proxy_response.headers['content-encoding'] || ""


            if (!is_text) {
                response.writeHead(proxy_response.statusCode, proxy_response.headers);
            }


            var buffers = [];
            var ended = false;
            function ondata(chunk) {
                if (response.writable) {
                    if (false === response.write(chunk) && response.pause) {
                        response.pause();
                    }
                }
            }
            proxy_response.on('data', function (chunk) {
                if (is_text) {
                    buffers.push(chunk);
                } else {
                    ondata(chunk)
                }
            });

            proxy_response.on('close', function () {
                if (!ended) {
                    response.emit('end')
                }
            });
            proxy_response.on('end', function () {

                if (is_text) {

                    var buffers_all = Buffer.concat(buffers);
                    if (contentEncoding) {
                        zlib.gunzip(buffers_all, function (err, bufferrs) {
                            if (!err) {
                                var mybuffer = bufferrs.toString("binary");

                                mybuffer = mybuffer.replace(/<\/body>/i, injectScript+'</body>');
                                bufferrs = new Buffer(mybuffer, "binary");
                                zlib.gzip(bufferrs, function (er, newBuffer) {
                                    if (!er) {
                                        proxy_response.headers['content-length'] = newBuffer.length;
                                        response.writeHead(proxy_response.statusCode, proxy_response.headers);
                                        //response.write(newBuffer);
                                        ondata(newBuffer)
                                        ended = true;
                                        if (!errState) {
                                            try {
                                                response.end()
                                            }
                                            catch (ex) {
                                                log.error("res.end error: %s", ex.message)
                                            }

                                            // Emit the `end` event now that we have completed proxying
                                            self.emit('end', request, response);
                                        }

                                    }
                                })

                            }
                        })

                    }
                    else {
                        var mybuffer = buffers_all.toString("binary");
                        mybuffer = mybuffer.replace(/<\/body>/i, injectScript+'</body>');
                        proxy_response.headers['content-length'] = mybuffer.length;
                        response.writeHead(proxy_response.statusCode, proxy_response.headers);
                        bufferrs = new Buffer(mybuffer, "binary");
                       // response.write(mybuffer, "binary");
                        ondata(bufferrs);
                        ended = true;
                        if (!errState) {
                            try {
                                response.end()
                            }
                            catch (ex) {
                                log.error("res.end error: %s", ex.message)
                            }

                            // Emit the `end` event now that we have completed proxying
                            self.emit('end', request, response);
                        }
                    }
                }
                else {
                    ended = true;
                    if (!errState) {
                        try {
                            response.end()
                        }
                        catch (ex) {
                            log.error("res.end error: %s", ex.message)
                        }

                        // Emit the `end` event now that we have completed proxying
                        self.emit('end', request, response);
                    }
                }


            });

            // If `response.statusCode === 304`: No 'data' event and no 'end'
            if (proxy_response.statusCode === 304) {
                try {
                    response.end()
                }
                catch (ex) {
                    log.error("res.end error: %s", ex.message)
                }
                return;
            }
            function ondrain() {
                if (proxy_response.readable && proxy_response.resume) {
                    proxy_response.resume();
                }
            }

            response.on('drain', ondrain);

        });
        proxy_request.setMaxListeners(100);
        proxy_request.once('error', proxyError);

        request.on('error', proxyError);
       proxy_request.once('socket', function (socket) {
           socket.setMaxListeners(100);
            socket.once('error', proxyError);
        });

        //
        // If `req` is aborted, we abort our `reverseProxy` request as well.
        //
        request.on('aborted', function () {
            proxy_request.abort();
        });
        //
        // For each data `chunk` received from the incoming
        // `req` write it to the `reverseProxy` request.
        //
        request.on('data', function (chunk) {

            if (!errState) {
                var flushed = proxy_request.write(chunk);
                if (!flushed) {
                    request.pause();
                    proxy_request.once('drain', function () {
                        try {
                            request.resume()
                        }
                        catch (er) {
                            log.error("req.resume error: %s", er.message)
                        }
                    });

                    //
                    // Force the `drain` event in 100ms if it hasn't
                    // happened on its own.
                    //
                    setTimeout(function () {
                        proxy_request.emit('drain');
                    }, 100);
                }
            }
        });
        //
        // When the incoming `req` ends, end the corresponding `reverseProxy`
        // request unless we have entered an error state.
        //
        request.on('end', function () {
            if (!errState) {
                proxy_request.end();
            }
        });

        //Aborts reverseProxy if client aborts the connection.
        request.on('close', function () {
            if (!errState) {
                proxy_request.abort();
            }
        });

    }).listen(
        8081
    )
    server.on('error', function (e) {
        log.debug('proxy server error ' + e.message);
    });
    log.info("proxy server on listen  8081");
}

exports.createProxy = function () {
    reg();
    setupProxyServer();
}
exports.unReg = function () {
    var url = path.resolve(__dirname, '../static/regedit/remove.reg')
    var _process = spawn("regedit", ["/S", url])
    var errorOutput = '';
    _process.stderr.on('data', function (data) {
    });

    _process.on('close', function (code) {
    });

}