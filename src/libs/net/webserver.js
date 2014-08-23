var fs = require('fs');
var sass = require('node-sass');

var webserver = function() {
    this.init();
    this.start();
};

/**
 * @typedef {string|{head: Array.<number|Object>|undefined, body: string}}
 */
webserver.pageType;

/**
 * HTTP
 * 
 * @private
 * @type {http}
 */
webserver.prototype.http_ = null;

/**
 * Simple Router
 * 
 * @private
 * @type {node-simple-router}
 */
webserver.prototype.router_ = null;

/**
 * HTTP Server
 * @type {http.Server}
 */
webserver.prototype.server_ = null;

/**
 * 
 * @type {number}
 */
webserver.prototype.registerID_ = 0;

/**
 * Inits http, router etc.
 */
webserver.prototype.init = function() {
    var Router = require('node-simple-router');

    this.http_ = require('http');
    this.router_ = new Router({
        logging: false,
        log: console.log,
        static_route: process.cwd() + "/public",
        serve_static: true,
        list_dir: false,
        default_home: ['index.html', 'index.htm', 'default.htm'],
        serve_cgi: false,
        serve_php: false,
        served_by: 'PiHome',
        software_name: 'PiHome'
    });
    
    this.server_ = this.http_.createServer(this.router_);
    
    AppEvents.on('webserver.register', AppUtils.proxy(this.register, this));
    AppEvents.on('webserver.register_css', AppUtils.proxy(this.registerCSS, this));
    AppEvents.on('webserver.register_js', AppUtils.proxy(this.registerJS, this));
};

webserver.prototype.start = function() {
    this.server_.listen(3000);
};

webserver.prototype.stop = function() {
    this.server_.close();
};

webserver.prototype.register = function(data) {
    var that_ = this;
    var type = data.type;
    
    if (type !== 'GET' && type !== 'POST') {
        type = 'GET';
    }
    
    var id = (this.registerID_++);
    
    AppEvents.callbackOn('webserver_register_' + id, data.callback)
    
    this.router_[type.toLowerCase()](data.url, function(request, response) {
        AppEvents.callbackEmit('webserver_register_' + id, {
            value: data.callback.value,
            request: request
        }, function(data) {
            function doResponse(data) {
                if (typeof data === 'string') {
                    data = {
                        header: [],
                        body: data
                    };
                }

                if (typeof data.proxy === 'string') {
                    that_.router_.proxy_pass(data.proxy, response);
                } else {

                    if (typeof data.header === 'number') {
                        data.header = [data.header, undefined];
                    }

                    if(data.header.length===2) {
                        response.writeHead(data.header[0], data.header[1]);
                    } else {
                        response.writeHead(200, {'Content-type': 'text/html;;charset=UTF-8'});
                    }

                    response.end(data.body);
                }
            };
            if (typeof data === 'function') {
                data(doResponse);
            } else {
                doResponse(data);
            }
        });
    });
};

webserver.prototype.registerCSS = function(data) {
    this.router_.get(data.url + '/:file.css', function (request, response) {
        if (fs.existsSync(data.path + '/' + request.params.file + '.css')) {
            sass.render({
                file: data.path + '/' + request.params.file + '.css',
                success: function(css) {
                    response.writeHead(200, {'Content-type': 'text/css'});
                    response.end(css);
                },
                error: function(error) {
                    response.writeHead(500, {'Content-type': 'text/css'});
                    response.end(error);
                }
            });
            
        } else {
            response.writeHead(404);
            response.end('File not found :/');
        }
    });
};

webserver.prototype.registerJS = function(data) {
    this.router_.get(data.url + '/:file.js', function (request, response) {
        if (fs.existsSync(data.path + '/' + request.params.file + '.js')) {
            response.writeHead(200, {'Content-type': 'text/javascript'});
            response.end(fs.readFileSync(data.path + '/' + request.params.file + '.js'));
        } else {
            response.writeHead(404);
            response.end('File not found :/');
        }
    });
};

module.exports = function(ev) { return new webserver(ev); };