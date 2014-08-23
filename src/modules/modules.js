var fs = require('fs');

/**
 * Modules
 * 
 * @constructor
 */
var modules = function() {
    this.loadModules();
};

/**
 * Load Modules
 */
modules.prototype.loadModules = function() {
    var that_ = this;
    var filename = '/module.js';

    fs.readdir(__dirname, function(err, files) {
        for(var key in files) {
            var dir = __dirname + '/' + files[key];

            var stats = fs.statSync(dir);
            if (stats.isDirectory()) {
                if (fs.existsSync(dir + filename)) {
                    require(dir + filename)(that_.ev);
                }
            }
        }
    });
};

module.exports = function() { return new modules(); };