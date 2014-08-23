var fs = require('fs');

/**
 * Server module
 * 
 * @constructor
 */
var server = function() {
    this.init();
};

/**
 * Server instance
 * 
 * @private
 * @type {server}
 */
server.prototype.server_ = null;

/**
 * Inits module
 */
server.prototype.init = function() {
    console.log('server: init');
    this.start();
};

/**
 * Starts module
 */
server.prototype.start = function() {
    AppEvents.emit('modules.register', 'server');
    this.server_ = require('./server')();
};

module.exports = function() { return new server(); };