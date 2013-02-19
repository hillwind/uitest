var proxy = require("./proxy"),
    socket = require('socket.io'),
    events = require('./events'),
    browser = require("./browser");
var logger = require('./logger');
var log = logger.create("UITest");

var _ = require('lodash');


var _currentEnv;
var Env = function () {
    this.runners = [];
    this.browsers = [];

    this.results = {};
    this.configs = {
        autoClose:true,
        timeout:1000 * 60 * 2//超时2分钟
    }
    this.data = {};
    this.reset = function () {
        this.runners = [];
        this.results = {};
    }


};

var getEnv = function () {
    _currentEnv = _currentEnv || new Env();
    return _currentEnv;
};
var newEnv = function () {
    _currentEnv = new Env();
    return _currentEnv;
}
var config = function (key, value) {
    var env = getEnv();
    if (arguments.length == 2) {
        env.configs[key] = value;
    }
    else (arguments.length == 1)
    {
        return env.configs[key]
    }
}
var Runner = function (env) {
    var self = this;
    self.env = env;
    self.results = { failedSpecs:0, totalSpecs:0, totalErrors:0, urls:[]};
    self.queue = new Queue(this);
    self.before_ = [];
    self.after_ = [];
    self.suites_ = [];
};

Runner.prototype.execute = function (finishCallback) {
    var self = this;

    self.queue.start(function () {
        finishCallback && finishCallback(self);
    });
};


Runner.prototype.add = function (block) {

    this.queue.add(block);
};
Runner.prototype.insertNext = function (block) {
    this.queue.insertNext(block);
}

Runner.prototype.results = function () {
    return this.queue.results();
};
var Queue = function (runner) {
    this.runner = runner;
    this.blocks = [];
    this.running = false;
    this.index = 0;
    this.abort = false;
};

Queue.prototype.addBefore = function (block) {
    this.blocks.unshift(block);
};

Queue.prototype.add = function (block) {
    this.blocks.push(block);
};

Queue.prototype.insertNext = function (block) {

    this.blocks.splice((this.index + 1), 0, block);
}

Queue.prototype.start = function (onComplete) {
    this.running = true;
    this.onComplete = onComplete;
    this.next_();
};

Queue.prototype.isRunning = function () {
    return this.running;
};

Queue.LOOP_DONT_RECURSE = true;

Queue.prototype.next_ = function () {
    var self = this;
    if (self.index < self.blocks.length) {
        var onComplete = function () {

            self.index++;
            self.next_();


        };


        self.blocks[self.index].execute(onComplete);
    } else {
        self.running = false;
        if (self.onComplete) {
            self.onComplete();
        }
    }

};

Queue.prototype.results = function () {
    var results = new jasmine.NestedResults();
    for (var i = 0; i < this.blocks.length; i++) {
        if (this.blocks[i].results) {
            results.addResult(this.blocks[i].results());
        }
    }
    return results;
};

var Block = function (runner, configs) {
    this.runner = runner;

    for (var p in configs) {
        this[p] = configs[p];
    }
};


Block.prototype.execute = function (onComplete) {
    var host = this, runner = this.runner;

    if (!runner.browser) {
        runner.browser = browser.createBrowser(runner.name, host.url, getEnv().configs.timeout);
        runner.browser.data = getEnv().data;

        onComplete();
        return;
    }

    if (host.navigator) {

        runner.browser.navigator(host.navigator, host.url);
        runner.browser.once("complete", function (data) {
            onComplete();
        })
        return
    }

    if (host.func) {

        runner.browser.start(host.func)
        runner.browser.once("complete", function (data) {

            /*
             * {
             *     failedSpecs:
             *     totalSpecs:
             *     totalErrors:
             *     urls:[]
             * }
             * */

            if (data) {

                var results = runner.results;

                runner.fullName = runner.browser.fullName;
                data.errors = data.errors || [];
                data.totalErrors = data.totalErrors || 0;

                results.urls.push(data);
                results.failedSpecs += data.failedSpecs;
                results.totalSpecs += data.totalSpecs;
                results.totalErrors += data.totalErrors;
            }


            onComplete();
        })
    }


};


var addQueue = function (cfg) {
    var env = getEnv(),
        runners = env.runners,

        browsers = env.browsers,
        funcBlock, navBlock;

    browsers.forEach(function (name) {
        var currentRunner;

        for (var i = 0; i < runners.length; i++) {
            if (runners[i].name === name) {

                currentRunner = runners[i];
            }
        }
        if (!currentRunner) {

            currentRunner = new Runner(env);
            currentRunner.name = name;
            runners.push(currentRunner)
        }

        if (cfg.navigator || cfg.url) {
            navBlock = new Block(currentRunner, {
                navigator:cfg.navigator || "go",
                url:cfg.url
            })
            currentRunner.add(navBlock);

        }
        if (cfg.func) {
            funcBlock = new Block(currentRunner, {
                func:cfg.func
            })
            currentRunner.add(funcBlock);
        }
    })


}

var open = function (url, func) {
    var win = {};
    addQueue({
        url:url,
        func:func
    });

    win.go = function (url, func) {
        addQueue({
            navigator:"go",
            url:url,
            func:func
        });

    }
    win.ready = function (func) {
        addQueue({
            func:func
        });

    }
    win.back = function (func) {

        addQueue({
            navigator:"back",
            func:func
        });

    }
    win.foward = function (func) {

        addQueue({
            navigator:"foward",
            func:func
        });

    }
    win.reload = function (func) {

        addQueue({
            navigator:"reload",
            func:func
        });

    }


    return win;


}

//共享数据API

var mixData = function (data) {
    for (var p in data) {
        getEnv().data[p] = data[p];
    }

}


var setData = function (data) {
    mixData(data);
}
var getData = function (fun) {
    return getEnv().data;
}

var execute = function (callback) {
    var env = getEnv();
    var runners = env.runners;
    var allResults = env.results;
    var l = runners.length;

    runners.forEach(function (currentRunner) {
        log.info(currentRunner.name+" start run")
        currentRunner.execute(function (currentRunner) {
            //合并结果
            l--;
            log.info(currentRunner.name+" is completed")

            allResults[currentRunner.fullName] = currentRunner.results;


            if (env.configs.autoClose && currentRunner.browser) currentRunner.browser.close();

            if (l == 0) {


                callback && callback(allResults);
                if (env.singleRun) {
                    // proxy.unReg();
                    process.exit(0);
                }
            }
        })
    })

}


var domain = 'taobao.com';
var taobao = {}

var login = function (username, password, isDaily) {
    if (isDaily) {
        domain = "daily.taobao.net";
    }
    else {
        domain = "taobao.com";
    }


    _login(username, password);
};
var logout = function (isDaily) {
    if (isDaily) {
        domain = "daily.taobao.net";
    }
    else {
        domain = "taobao.com";
    }


    _logout();
}


function _login(username, password) {
    var src = 'http://login.' + domain + '/member/login.jhtml?from=buy' +
        '&full_redirect=false&redirect_url=http://www.' + domain + '/go/act/uitest/login.php';

    setData({
        username:username,
        password:password
    })

    var win = open(src, function () {
        describe("登录", function () {
            it("获取数据并提交登录", function () {
                var info;

                getData(function (data) {
                    info = data;
                });

                waitsMathers(function () {

                    expect(info).toBeDefined();
                });

                runs(function () {


                    if (jQuery("#J_QuickLogin").css("display") != "none") {
                        var quick = jQuery("#J_Quick2Static");
                        if (quick[0])quick[0].click();
                    }
                    var safeInput = jQuery("#J_SafeLoginCheck");
                    if (safeInput[0] && safeInput[0].checked) {
                        safeInput[0].click();
                        safeInput[0].checked = false;
                    }


                    var form = jQuery('form')[0];

                    form['TPL_username'].value = info.username;
                    form['TPL_password'].value = info.password;
                    var button = jQuery("#J_SubmitStatic")[0];
                    button.click();
                    //  forms[0].submit();

                })


            })
        })


    })

    win.ready(function () {
        describe("登录", function () {
            it("判断登录跳转成功", function () {
                waitsMathers(function () {
                    expect(window.loginsuccess).toBeDefined();
                })
            })
        })
    })


}

function _logout() {
    var src = 'http://login.' + domain + '/member/login.jhtml?style=minisimple&from=buy' +
        '&full_redirect=false&redirect_url=' + encodeURI('http://www.' + domain + '/go/act/uitest/login.php');

    setData({
        src:'http://login.' + domain + '/member/logout.jhtml?f=top&t=' + (+new Date())
    })


    open(src, function () {
        describe("淘宝帐号登出", function () {
            it("测试淘宝帐号登出", function () {
                var info;
                getData(function (data) {
                    info = data;
                });
                waitsMatchers(function () {

                    expect(info).toBeDefined();
                });
                runs(function () {
                    try {
                        var img = new Image();
                        img.src = info.src;

                    } catch (e) {

                    }
                })
                waits(2000);
                expect(1).toBe(1);
            })
        })
    })

}


exports.open = open;
exports.getData = getData;
exports.setData = setData;
exports.execute = execute;
exports.config = config;
exports.newEnv = newEnv;
exports.getEnv = getEnv;
exports.taobao = {
    login:login,
    logout:logout
}

