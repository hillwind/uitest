var cfg = require("./config");
var http = require("http");
var path = require("path");
var vm = require('vm');
var fs = require("fs");
var UT = require("./uitest").UT;
var newEnv = require("./uitest").newEnv;
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
    vm.runInNewContext(script, sandbox);
}


exports.run = function (cliOptions, done) {
    var env = newEnv();
    env.singleRun = true;
    var configFile = path.resolve(__dirname, "../uitest.conf.js")
    var config = cfg.parseConfig(configFile, cliOptions);
    env.browsers = config.browsers;
    if(config.singleRun ===false){
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

            log.info("run file " + file);
            eval(data);
            UT.execute(function (result) {
                done && done(result);
            })
        });
    }
    else if (config.url) {
        console.log(config.url)
        http.get(config.url, function(res) {

            var buffers =[]
            res.on('data', function (chunk) {
                buffers.push(chunk);
            });
            res.on("end", function(){
                log.info("run url " + config.url);
                console.log(buffers.toString())
                eval(buffers.toString());
                UT.execute(function (result) {
                    done && done(result);
                })
            })

        }).on('error', function(e) {
                log.error("Got error: " + e.message);
            });
    }


}

