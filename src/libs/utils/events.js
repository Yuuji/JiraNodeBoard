var util = require("util");
var nodeEvents = require("events");

function events() {
    nodeEvents.EventEmitter.call(this);
}

util.inherits(events, nodeEvents.EventEmitter);

events.prototype.callbackEmits_ = {};

events.prototype.callbackEmitId_ = 0;

// todo: timeout
events.prototype.callbackEmit = function(name, data, callback) {
    var id = (++this.callbackEmitId_);
    var callbackData = {
        id: id,
        callback: callback,
        data: data
    };

    this.emit(name, callbackData);
};

events.prototype.callbackOn = function(name, callback) {
    this.on(name, function(callbackData) {
        if (!callbackData.id || !callbackData.callback) {
            console.error('Unknown callback on ' + name);
            console.error(callbackData);
            return;
        }
        
        var returnCallback = function(data) {
            if (data === false) return;
        
            callbackData.callback(data);
        };
        
        var returnData = callback(callbackData.data, returnCallback);
        
        if (returnData === true) return; // callback modus
        
        returnCallback(returnData);
    });
};

module.exports = new events();