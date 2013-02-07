var proxy = require("./proxy"),
    socket = require('socket.io'),
    events = require('./events'),
    browser = require("./browser");
var _ = require('lodash');


var UT = {
    autoClose:true,
    timeout:1000 * 60 * 2//超时2分钟
};


var _currentEnv;
var Env = function () {
    this.currentRunner = new Runner(this);
    this.results = {};
    this.data = {};
    this.reset = function () {
        this.currentRunner = new Runner(this);
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

var Runner = function (env) {
    var self = this;
    self.env = env;
    self.queue = new Queue(env);
    self.before_ = [];
    self.after_ = [];
    self.suites_ = [];
};

Runner.prototype.execute = function (finishCallback) {
    var self = this;

    self.queue.start(function () {
        finishCallback && finishCallback();
    });
};


Runner.prototype.add = function (block) {

    this.queue.add(block);
};

Runner.prototype.results = function () {
    return this.queue.results();
};
var Queue = function (env) {
    this.env = env;
    this.blocks = [];
    this.running = false;
    this.index = 0;
    this.offset = 0;
    this.abort = false;
};

Queue.prototype.addBefore = function (block) {
    this.blocks.unshift(block);
};

Queue.prototype.add = function (block) {
    this.blocks.push(block);
};

Queue.prototype.insertNext = function (block) {
    this.blocks.splice((this.index + this.offset + 1), 0, block);
    this.offset++;
};

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

var Block = function (configs) {
    this.runner = getEnv().currentRunner;
    for (var p in configs) {
        this[p] = configs[p];
    }
};


Block.prototype.execute = function (onComplete) {
    var host = this,
        currentBrowser;
    var runner = getEnv().currentRunner;


    if (!runner.browser) {
        runner.browser = browser.createBrowser(getEnv().browsers, host.url, UT.timeout);

    }
    currentBrowser = runner.browser;
    currentBrowser.data = getEnv().data;
    if (host.navigator) {
        currentBrowser.navigator(host.navigator, host.url);
    }
    else {

        currentBrowser.start(host.fun)


    }

    //chrome下setTimeout里window的自定义属性失败


    currentBrowser.once("complete", function (results) {
        results = results || {}
        var allResult = getEnv().results;
        for (var b in results) {
            var old = allResult[b];
            var current = results[b];
            current.errors = current.errors || [];

            if (!old) {
                allResult[b] = current;
                continue;
            }
            old.failedSpecs += current.failedSpecs;
            old.totalSpecs += current.totalSpecs;
            old.suites = old.suites.concat(current.suites || [])
            old.errors = old.errors.concat(current.errors || [])
        }

        onComplete();
    })

    /*
     currentBrowser.once("failure", function (data) {

     var env = getEnv();
     env.results.push({
     errors:[
     {
     type:data.type,
     message:data.message
     }
     ],
     failedSpecs:0,
     suites:[],
     totalSpecs:0
     })
     complete = true;
     onComplete();


     });
     */


};


var addQueue = function (configs) {
    getEnv().currentRunner.add(new Block(configs));

}

UT.open = function (url, fun) {
    var win = {};
    addQueue({
        url:url,
        fun:fun
    });

    win.go = function (url, fun) {
        addQueue({
            url:url,
            navigator:"go"
        });

        addQueue({
            fun:fun
        });

    }
    win.ready = function (fun) {
        addQueue({
            "ready":true,
            fun:fun
        });

    }
    win.back = function (fun) {

        addQueue({

            navigator:"back"
        });
        if (fun) {
            addQueue({
                fun:fun
            });
        }
    }
    win.foward = function (fun) {
        addQueue({

            navigator:"foward"
        });
        if (fun) {
            addQueue({

                fun:fun
            });
        }
    }
    win.reload = function (fun) {
        addQueue({

            navigator:"reload"
        });
        if (fun) {
            addQueue({
                fun:fun
            });
        }
    }


    return win;


}

//共享数据API

var mixData = function (data) {
    for (var p in data) {
        getEnv().data[p] = data[p];
    }

}


UT.setData = function (data) {
    mixData(data);
}
UT.getData = function (fun) {
    return getEnv().data;
}

UT.execute = function (callback) {
    var env = getEnv();
    env.currentRunner.execute(function () {
        //合并结果
        console.log("is all compelte")
        if (UT.autoClose && env.currentRunner.browser) env.currentRunner.browser.close();

        callback && callback(env.results);
        env.reset();

        if (env.singleRun) {

            proxy.unReg();
            process.exit(0);
        }
    })

}


var domain = 'taobao.com';
UT.taobao = {}


UT.taobao.login = function (username, password, domain) {
    if (domain) {
        domain = "daily.taobao.net";
    }
    else {
        domain = "taobao.com";
    }


    _login(username, password);
};
UT.taobao.logout = function (domain) {
    if (domain) {
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

    UT.setData({
        username:username,
        password:password
    })

    var win = UT.open(src, function () {
        describe("登录", function () {
            it("获取数据并提交登录", function () {
                var info;

                UT.getData(function (data) {
                    info = data;
                    console.log(info)
                });
                console.log(waitsMatchers)
                waitsMatchers(function () {

                    expect(info).toBeDefined();
                });
                runs(function () {
                    console.log(info)
                    var doc = document;
                    var safeInput = document.getElementById("J_SafeLoginCheck");
                    var quick = document.getElementById("J_Quick2Static");
                    if (safeInput && safeInput.checked) {
                        safeInput.click();
                        safeInput.checked = false;
                    }
                    if (quick)quick.click();


                    var forms = doc ? doc.getElementsByTagName('form') : null;
                    forms[0]['TPL_username'].value = info.username;
                    forms[0]['TPL_password'].value = info.password;
                    var button = document.getElementById("J_SubmitStatic");
                    button.click();
                    //forms[0].submit();
                    done();

                })


            })
        })


    })

    win.go(function () {
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

    UT.setData({
        src:'http://login.' + domain + '/member/logout.jhtml?f=top&t=' + (+new Date())
    })


    UT.open(src, function () {
        describe("淘宝帐号登出", function () {
            it("测试淘宝帐号登出", function () {
                var info;
                UT.getData(function (data) {
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


exports.UT = UT;
exports.newEnv = newEnv;
exports.getEnv = getEnv;
