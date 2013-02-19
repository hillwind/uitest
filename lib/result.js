var util = require('util');

var helper = require('./helper');

var colors = require('colors');
exports.renderResult = function (result) {


    var msg = "\n";
    for (var b in result) {
        var r = result[b];
        msg+="\n\n";
        msg +="-------------------------------------------------------------------------------------------\n"
        var s = util.format("测试结果：%s  用例总数: %s | 失败用例总数: %s | 错误数：%s", b, r.totalSpecs, r.failedSpecs, r.errors&&r.errors.length) + "\n";
        if(r.failedSpecs){
            msg+=colors.red(s);
        }
        else if(r.errors&&r.errors.length){
            msg+=colors.yellow(s);
        }
        else{
            msg+=colors.green(s);
        }
        msg +="-------------------------------------------------------------------------------------------\n"
        if (r.errors&&r.errors.length) {
            r.errors.forEach(function (e) {
                msg += colors.yellow(util.format("JS错误：%s", e.message))+"\n"
                if(e.stack){
                    msg +=""+colors.grey(e.stack)+"\n"
                }
            })
        }
        r.urls.forEach(function(url){
            msg += "\n"+util.format("%s", url.url) + "\n";
            url.suites.forEach(function (suite) {
                msg += '  ' +util.format("%s", suite.description) + "\n";
                suite.specs.forEach(function (spec) {
                    msg += '    ' + spec.description + "\n";
                    spec.results_.forEach(function (result) {
                        result.items_.forEach(function (item) {
                            var s = util.format("      expect %s %s %s %s", item.actual, item.matcherName, item.expected, item.passed_ == true ? item.message :"failed") + "\n";
                            if(!item.passed_ ){
                                msg+=colors.red(s);
                            }
                            else{
                                msg+=colors.green(s);
                            }
                            if(item.trace&&item.trace.stack&&item.trace.stack!="undefined"){
                                msg +="      "+colors.grey(item.trace.stack)+"\n"
                            }
                        })

                    })

                })
            })
        })

    }
    msg+="\n\n";
    msg +="-------------------------------------------------------------------------------------------\n"
    return msg;


}

