var cfg = require("./config");
var http = require("http");
var path = require("path");
var vm = require('vm');
var fs = require("fs");
var UT = require("./uitest");

var newEnv = UT.newEnv;
var renderResult = require("./result").renderResult;
var logger = require('./logger');


function merge(a, b) {
    if (!a || !b) return a

    var keys = Object.keys(b)
    for (var k, i = 0, n = keys.length; i < n; i++) {
        k = keys[i]
        a[k] = b[k]
    }

    return a
}
function eval(script) {
    var sandbox = {};
    merge(sandbox, global)
    sandbox.global = sandbox
    sandbox.UT = UT;
    try {
        vm.runInNewContext(script, sandbox);
    } catch (e) {
        throw  e;
    }
}


exports.run = function (cliOptions, done) {
    var defaultResult = {
        errors:[],
        failedSpecs:[],
        totalSpecs:[],
        suites:[]

    }

    var env = newEnv();
    env.singleRun = true;
    env.browsers =[]

    var configFile = path.resolve(__dirname, "../uitest.conf.js")
    var config = cfg.parseConfig(configFile, cliOptions);


    config.browsers.forEach(function (name,i) {
            name = name.replace(/\d*/ig, "");
            env.browsers.push(name);
        }
    )

    if (config.singleRun === false) {
        env.singleRun = false;
    }


    logger.setup(config.logLevel, config.colors, config.loggers);
    var log = logger.create('runner')

    if (!done) {
        done = function (result) {
            console.log(renderResult(result));
        }
    }

    if (config.file) {

        var file = path.resolve(process.cwd(), config.file);
        fs.readFile(file, function (err, data) {
            if (err) {

                log.error("open '" + file + "' failed: ");
                throw err;
                return;
            }

            log.info("Running file " + file);
            try {
                eval(data);
            } catch (e) {
                defaultResult.errors.push({type:e.type, message:e.message, stack:e.stack})
                done && done({"null":defaultResult});
            }

            UT.execute(function (result) {
                done && done(result);
            })
        });
    }
    else if (config.url) {

        http.get(config.url,function (res) {

            var buffers = []
            res.on('data', function (chunk) {
                buffers.push(chunk);
            });
            res.on("end", function () {
                log.info("Running url " + config.url);


                try {
                    eval(buffers.toString());
                } catch (e) {
                    defaultResult.errors.push({type:e.type, message:e.message, stack:e.stack})
                    done && done({"null":defaultResult});
                }

                UT.execute(function (result) {
                    done && done(result);
                })
            })

        }).on('error', function (e) {
                log.error("Got error: " + e.message);
            });
    }


}

