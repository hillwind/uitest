var Launcher = require('./launcher').Launcher,
    util = require('util'),
    socket = require('socket.io'),
    ws = require("./web-server"),
    helper = require("./helper"),

    events = require('./events');
var logger = require('./logger');
var log = logger.create("Browser");




var defaultResult = function () {
    return {
        errors:[],
        failedSpecs:[],
        totalSpecs:[],
        suites:[]

    }
};

var Browser = function (name, url, timeout, emitter) {
    var self = this;
    this.name = name;
    this.data ={};
    this.fullName = null;
    this.isReady = true;
    this.timeout = timeout;
    this.launcher = new Launcher(emitter);
    this.scriptBrowser = this.launcher.launch([name], url, timeout / 2, 2);
    this.scriptBrowser.on("browser_process_failure", function () {
        self.emit("browser_process_failure");
    })
    this.id = this.scriptBrowser.id;
    this.toString = function () {
        return this.name;
    };

    this.close = function () {
        this.launcher.kill()
    }

    this.register = function (info) {
        var host = this;
        this.fullName = helper.browserFullNameToShort(info.name);
        this.socket = info.socket;
        log.info('Connected on socket id ' + host.id);
        this.launcher.markCaptured();

        this.socket.on("ok", function () {
            host._isok = true;
        })
        this.socket.on("set_data", function (data) {
            _.merge(host.data,data);
        })
        this.socket.on("get_data", function (data) {
            host.socket.emit("push_data",host.data)
        })
        this.socket.on("complete", function (data) {
            if (!host.isComplete) {
                host.isComplete = true;
                log.info(host.name + " is completed");
                host.result = data;
               // host.launcher.kill();
                host.emit("complete", data);
            }

        })
        this.socket.on("disconnect", function () {
            host.emit("disconnect");
            log.warn('Disconnected');

        })
        // emitter.emit('browser_register', this);
        // emitter.emit('browsers_change', collection);


    };
    this.open = function (url) {
        var host = this;
        host.url = url;
        host.ready(function () {

        })
    };
    this.navigator = function(cmd ,url){
        this.isComplete = false;
        log.info(this.name + "is to start navigator");
        this.socket.emit("navigator", {
            cmd:cmd,
            url:url
        })
    };
    this.start = function (func) {
        var host = this;

        host.isComplete = false;
        host.ready(function () {
            log.info(host.name + " start run");
            host.socket.emit("start", {

                func:"with(window.UT){(" + func.toString() + ")()};"
            })
        })
        setTimeout(function () {
            if (!host.isComplete) {
                log.debug(host.name + "timeout")
                host.isComplete = true;
                var result = defaultResult();
                result.errors.push({type:"timeout", message:host.url + "运行超时"})
                host.emit("complete", result)
            }

        }, host.timeout)
    };
    this.ready = function (callback) {
        var host = this;

        var timeout = 0;
        var t = 1000;
        var timer;

        var send = function () {
            if (timer) {
                clearTimeout(timer)
                timer = null;
            }
            if (host._isok) {
                callback & callback();
            }
            else if (timeout > host.timeout) {
                log.error("无法和被测页面建立连接，请检查是否在被测页面里引入了uitest框架")

                //   host.emit("failure", {type:"timeout", message:host.url + "无法建立链接"})


            }
            else {
                timeout += t;
                host.socket && host.socket.emit("isok")
                timer = setTimeout(function () {
                    send();
                }, t)
            }

        }
        setTimeout(send,5000)


    };

    this.onError = function (error) {
        if (this.isReady) {
            return;
        }

        this.lastResult.error = true;
        emitter.emit('browser_error', this, error);
    };


    this.onComplete = function (result) {
        if (this.isReady) {
            return;
        }

        this.isReady = true;
        this.lastResult.totalTimeEnd();
        emitter.emit('browsers_change', this);
        emitter.emit('browser_complete', this, result);
    };

    this.onDisconnect = function () {
        if (!this.isReady) {
            this.isReady = true;
            this.lastResult.totalTimeEnd();
            this.lastResult.disconnected = true;
            emitter.emit('browser_complete', this);
        }

    };


    this.serialize = function () {
        return {
            id:this.id,
            name:this.name,
            isReady:this.isReady
        };
    };
};
util.inherits(Browser, events.EventEmitter);


var Collection = function (browsers) {
    browsers = browsers || [];
    this.results = {};

    // Use ecma5 style to make jshint happy
    Object.defineProperty(this, 'length', {
        get:function () {
            return browsers.length;
        }
    });
    this.register = function (info) {

        browsers.forEach(function (browser) {

            if (info.id == browser.id) {
                browser.register(info);
            }
        })
    };
    this.open = function(url){
        browsers.forEach(function (browser) {

           browser.open(url);
        })
    }
    this.navigator = function(cmd ,url){
        var host = this;
        var length = browsers.length;
        host.isComplete=false;
        browsers.forEach(function (browser) {
            browser.data = host.data;
            browser.navigator(cmd,url);
            browser.on("once", function (result) {
                length--;

                if (length <= 0) {
                    if (!host.isComplete) {
                        host.emit("complete", host.results);
                        host.isComplete = true;
                    }

                }
            })
        })
    };
    this.start = function (func) {
        var host = this;
        var length = browsers.length;
        var isComplete=false;
        browsers.forEach(function (browser) {
            browser.data = host.data;
            browser.start(func);
            browser.once("complete", function (result) {

                length--;

                host.results[browser.fullName] = result;

                if (length <= 0) {

                    if (!isComplete) {

                        host.emit("complete", host.results);
                        isComplete = true;
                    }

                }
            })
        })
    };

    this.add = function (browser) {

        browsers.push(browser);
        this.emit('browsers_change', this);
    };
    this.close = function () {
        browsers.forEach(function (browser) {
            browser.close();
        })
    };

    this.remove = function (browser) {
        var host = this;
        var index = browsers.indexOf(browser);

        if (index === -1) {
            return false;
        }
        browsers.splice(index, 1);
        if (browsers.length == 0) {
            if (!host.isComplete) {
                host.emit("complete", host.results);
                host.isComplete = true;
            }
        }
        this.emit('browsers_change', this);

        return true;
    };

    this.serialize = function () {
        return browsers.map(function (browser) {
            return browser.serialize();
        });
    };


    this.clone = function () {
        return new Collection(browsers.slice());
    };

    // Array APIs
    this.map = function (callback, context) {
        return browsers.map(callback, context);
    };

    this.forEach = function (callback, context) {
        return browsers.forEach(callback, context);
    };
};
util.inherits(Collection, events.EventEmitter);

var capturedBrowsers = 0;

//代理
var server = ws.createServer();
//开启socket，等待浏览器链接
var io = socket.listen(server, {"log level":1});
io.set('transports', [
    'websocket'
    , 'flashsocket'
    , 'htmlfile'
    , 'xhr-polling'
    , 'jsonp-polling'
]);
io.sockets.on('connection', function (socket) {

    socket.on('register', function (info) {
        if (capturedBrowsers) {
            info.socket = socket;
            capturedBrowsers.register(info)
        }


    });
});

exports.Browser = Browser;
exports.Collection = Collection;
exports.createBrowser = function (types, url, timeout) {
    capturedBrowsers = new Collection();

    types.forEach(function (type) {
        var newBrowser = new Browser(type, url, timeout);
        capturedBrowsers.add(newBrowser);
        newBrowser.on("no_cmd", function () {
            capturedBrowsers.remove(newBrowser)
        })
        newBrowser.on("browser_process_failure", function () {
            capturedBrowsers.remove(newBrowser)
        })
        newBrowser.on("disconnect", function () {
            capturedBrowsers.remove(newBrowser)
        })

    })

    return capturedBrowsers;
};

