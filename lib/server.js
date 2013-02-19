var io = require('socket.io');
var http = require('http');
var net = require('net');
var cfg = require('./config');
var ws = require('./web-server');
var logger = require('./logger');
var browser = require('./browser');

var events = require('./events');

var constant = require('./constants');
var runner = require('./runner');
var renderResult = require("./result")


var path = require('path');
var fs = require('fs');



var io_client = require('socket.io-client');
exports.start = function (cliOptions) {
//建立浏览器链接服务

    var config = cfg.parseConfig(cliOptions.configFile, cliOptions);
    logger.setup(config.logLevel, config.colors, config.loggers);
    var log = logger.create();


    var registerName = config.browsers[0];
    config.browsers[0] = config.browsers[0].replace(/\d/ig, "");

    var socket = io_client.connect("uitest.taobao.net", {port:3030});
    socket.on("connect", function () {
        console.log("connect success");
        socket.emit('console:register', {
            'name':registerName
        });
    })

    socket.on('console:task_start', function (data) {
        console.log("task start " + data.url)
        var complete = function (report) {
            console.log("task complete")
            console.log(renderResult.renderResult(report))
            socket.emit('console:task_finish', {id:data.id, report:report});
        }
        runner.run({url:data.url}, complete)
    })
    socket.on("disconnect", function () {
        console.log("disconnect")
    })

}





