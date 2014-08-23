var path = require('path');
var fs = require('fs');
var read = fs.readFileSync;

var templates = function() {
    this.ejs_ = require('ejs');
};

templates.prototype.ejs_ = null;

templates.prototype.fixture = function(filename) {
  return read(filename, 'utf8').replace(/\r/g, '');
};

templates.prototype.render = function(str, options) {
    try {
        return this.ejs_.render(str, options);
    } catch (e) {
        return e;
    }
};

templates.prototype.renderFile = function(filename, options) {
    options = options || {};
    options['__dirname'] = path.dirname(filename);
    options['render'] = AppUtils.proxy(this.renderFile, this);
    return this.render(this.fixture(filename), options);
};

templates.prototype.compile = function(str, options) {
    return this.ejs_.compile(str, options);
};

templates.prototype.compileFile = function(filename, options) {
    options = options || {};
    options['__dirname'] = path.dirname(filename);
    options['render'] = AppUtils.proxy(this.renderFile, this);
    return this.compile(this.fixture(filename), options);
};

module.exports = new templates();