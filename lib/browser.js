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
var capturedBrowsers;

var Browser = function (name, url, timeout, emitter) {
    var self = this;
    this.name = name;
    this.data = {};
    this.fullName = null;
    this.isReady = true;
    this.timeout = timeout;
    this.launcher = new Launcher(emitter);
    this.scriptBrowser = this.launcher.launch(name, url, timeout / 2, 2);
    this.scriptBrowser.on("browser_process_failure", function () {
        self.emit("browser_process_failure");
    })
    this.id = this.scriptBrowser.id;
    this.toString = function () {
        return this.name;
    };

    this.close = function () {
        capturedBrowsers.remove(this);

        this.launcher.kill()
    }

    this.register = function (info) {

        var host = this;
        this.fullName = helper.browserFullNameToShort(info.name);

        this.socket = info.socket;
        // log.info('Connected on socket id ' + host.id);
        this.launcher.markCaptured();

        this.socket.on("answer_canNav", function (data) {

            host._canNav = data;
        })
        this.socket.on("answer_canRun", function (data) {
            host._canRun = data;
        })
        this.socket.on("set_data", function (data) {
            _.merge(host.data, data);
        })
        this.socket.on("get_data", function (data) {
            host.socket.emit("push_data", host.data)
        })
        this.socket.on("complete", function (result) {
            if (!host.isComplete) {
                host.isComplete = true;
                log.debug(host.name + " is completed");
                host.result = result;
                // host.launcher.kill();
                host.emit("complete", result);
            }

        })
        this.socket.on("disconnect", function () {
            host.emit("disconnect");
            host._isok = false;
            log.warn('Disconnected');

        })
        // emitter.emit('browser_register', this);
        // emitter.emit('browsers_change', collection);


    };

    this.navigator = function (cmd, url) {
        var host = this;
        this.isComplete = false;

        if (cmd === "go") {
            if (/\?/.test(url)) {
                url += "&_ut_=" + this.id
            }
            else {
                url += "?_ut_=" + this.id
            }
        }

        host.canNav(function () {
            log.info(host.name + " navigator to " + (url || cmd));

            host.socket.emit("navigator", {
                cmd:cmd,
                url:url
            })

            setTimeout(function () {
                host.emit("complete");
            }, 1000)
        })

    };
    this.start = function (func) {
        var host = this;

        host.isComplete = false;
        host.canRun(function () {
            log.debug(host.name + " start run");

            host.socket.emit("start", {

                func:"with(window.UT){(" + func.toString() + ")()};"
            })
        })
        setTimeout(function () {
            if (!host.isComplete) {
                log.debug(host.name + " timeout")
                host.isComplete = true;
                var result = defaultResult();
                result.errors.push({type:"timeout", message:host.url + "运行超时"})
                host.emit("complete", result)
            }

        }, host.timeout)
    };
    this.canRun = function (callback) {
        var host = this;

        var timeout = 0;
        var t = 1000;
        var timer;

        var checker = function () {

            if (host._canRun) {

                callback & callback();
                host._canRun = false;
            }
            else if (timeout > host.timeout) {
                log.error("无法和被测页面建立连接，请检查是否在被测页面里引入了uitest框架")

                //   host.emit("failure", {type:"timeout", message:host.url + "无法建立链接"})


            }
            else {
                timeout += t;
                host.socket && host.socket.emit("ask_canRun")
                timer = setTimeout(arguments.callee, t)
            }

        }
        setTimeout(checker, 2000)


    };
    this.canNav = function (callback) {
        var host = this;

        var timeout = 0;
        var t = 1000;
        var timer;

        var checker = function () {

            if (host._canNav) {
                callback & callback();
                host._canNav = false;
            }
            else if (timeout > host.timeout) {
                log.error("无法和被测页面建立连接，请检查是否在被测页面里引入了uitest框架")

                //   host.emit("failure", {type:"timeout", message:host.url + "无法建立链接"})


            }
            else {
                timeout += t;
                host.socket && host.socket.emit("ask_canNav")
                setTimeout(arguments.callee, t)
            }

        }
        setTimeout(checker, 2000)


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

capturedBrowsers = new Collection();

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
exports.createBrowser = function (type, url, timeout) {

    var newBrowser = new Browser(type, url, timeout);

    capturedBrowsers.add(newBrowser);

    newBrowser.on("no_cmd", function () {
        capturedBrowsers.remove(newBrowser)
    })
    newBrowser.on("browser_process_failure", function () {
        capturedBrowsers.remove(newBrowser)
    })


    return newBrowser;
};
/*
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


 })

 return capturedBrowsers;
 };


 */

