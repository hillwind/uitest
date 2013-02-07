var BaseBrowser = require('./Base');
var util = require("util");
var helper = require("../helper");
var _ = require('lodash');

var IEBrowser = function () {

    BaseBrowser.apply(this, arguments);
};

util.inherits(IEBrowser, BaseBrowser);
_.merge(IEBrowser.prototype, {
    name:'IE',
    DEFAULT_CMD:{
        win32:process.env.ProgramFiles + '\\Internet Explorer\\iexplore.exe'
    },
    ENV_CMD:'IE_BIN'
})



// PUBLISH
module.exports = IEBrowser;
