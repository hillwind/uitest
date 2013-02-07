var events = require('events');
var util = require('util');





var EventEmitter = function () {

};

util.inherits(EventEmitter, events.EventEmitter);

// PUBLISH
exports.EventEmitter = EventEmitter;

