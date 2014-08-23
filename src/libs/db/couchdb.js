var util = require('util');
var fs = require('fs');
var trycatch = require('trycatch');
var jsonRequest = require(process.cwd() + '/src/libs/utils/jsonrequest')

var couchdb = function(callback) {
    jsonRequest.call(this);
    this.checkConfig(callback);
};

util.inherits(couchdb, jsonRequest);

couchdb.prototype.connected = false;
couchdb.prototype.connectionError = false;
couchdb.prototype.url_ = null;
couchdb.prototype.config = null;

couchdb.prototype.checkConfig = function(callback) {
    var that_ = this;
    this.loadConfig(function(success, error) {
        that_.connected = success;
        that_.connectionError = error || false;
        callback();
    });
};

couchdb.prototype.loadConfig = function(callback) {
    var configFile = process.cwd() + '/couchdb.json';
    
    if (!fs.existsSync(configFile)) {
        callback(false);
        return;
    }
    
    var configContent = fs.readFileSync(configFile, {encoding: 'utf8'});
    
    if (!configContent || configContent.length===0) {
        callback(false);
        return;
    }
    
    try {
        var configObject = JSON.parse(configContent);
        
        if (    !configObject.couchHostname ||
                !configObject.couchPort ||
                !configObject.couchDatabase) {
            callback(false);
        return;
        }
    } catch (e) {
        callback(false);
        return;
    }
    
    var that_ = this;

    this.url_ = 'http://' + configObject.couchHostname + ':' + configObject.couchPort + '/';
    this.config = configObject;
    
    this.checkServer(function(success) {
        if (success===true) {
            that_.checkDatabase(function(success) {
                if (success===true) {
                    callback(true);
                } else {
                    callback(false, success);
                }
            });
        } else {
            callback(false, success);
        }
    });
};

couchdb.prototype.saveConfig = function(hostname, port, database, username, password) {
    var configFile = process.cwd() + '/couchdb.json';
    
    var config = {};
    config.couchHostname = hostname;
    config.couchPort = port;
    config.couchDatabase = database;
    config.couchUsername = username;
    config.couchPassword = password;
    
    var configStr = JSON.stringify(config);
    fs.writeFileSync(configFile, configStr, {encoding: 'utf8'});
};

couchdb.prototype.checkServer = function(callback) {
    this.request_(this.url_, function(error, response, body) {
        if (error) {
            callback(error);
            return;
        } else if (response.statusCode < 200 || response.statusCode > 299) {
            callback(new Error('server returned status code ' + response.statusCode));
            return;
        }

        if (!body || !body.couchdb || body.couchdb !== 'Welcome') {
            callback(new Error('Could not connect to server (Is that a couchdb server?)'));
            return;
        }

        callback(true);
    });
};

/**
 * Check if database exists
 *
 * @param {function()} callback     Callback to be called after database is checked
 * @throws {Error}                  Throws error on error
 */
couchdb.prototype.checkDatabase = function(callback) {
    var that_ = this;
    this.request_(this.url_ + this.config.couchDatabase, function(error, response, body) {
        if (error) {
            callback(error);
            return;
        } else if (response.statusCode === 404) {
            callback(new Error('Database does not exists'));
            return;
        } else if (response.statusCode < 200 || response.statusCode > 299) {
            callback(new Error('server returned status code ' + response.statusCode));
            return;
        } else {
            callback(true);
        }
    });
};

/*
 * Creates the database
 * @param {function()} callback     Callback to be called after datase is created
 * @param {string=} database        Name of database. If not set, the constructor database is used
 * @throws {Error}                  Throws error on error
 */
couchdb.prototype.createDatabase = function(callback, database) {
    database = database || this.config.couchDatabase;

    this.request_(this.url_ + database, 'PUT', function(error, response, body) {
        if (error) {
            callback(error);
            return;
        } else if (response.statusCode < 200 || response.statusCode > 299) {
            callback(new Error('server returned status code ' + response.statusCode));
            return;
        } else if (!body || !body.ok) {
            callback(new Error('Could not create database (Body: ' + body + ')'));
        } else {
            callback(true);
        }
    });
};

/**
 * Gets a document from database server
 *
 * @param {string} name                                         Name of document
 * @param {function(?, {id: number, rev: string})} callback     Callback when document is ready
 * @throws {Error}                                              Throws error on error
 */
couchdb.prototype.getDocument = function(name, callback) {
    this.request_(this.url_ + this.config.couchDatabase + '/' + name, 'GET', function(error, response, body) {
        if (error) {
            callback(false, error);
            return;
        } else if (response.statusCode < 200 || response.statusCode > 299) {
            callback(false, new Error('server returned status code ' + response.statusCode));
            return;
        } else if (!body || !body.data) {
            callback(false, new Error('couchConnector: Could not get document (Body: ' + body + ')'));
            return;
        } else {
            callback(body.data, {
                id: body._id,
                rev: body._rev
            });
        }
    });
};

/**
 * Sets a document in database
 *
 * @param {string} name             Name of document
 * @param {?} value                 Value to be set
 * @param {function()} callback     Callback after document is set
 * @param {boolean=} noOverwrite    Set to true, if document should not be overwritten if exists
 * @throws {Error}                  Throws error on error
 */
couchdb.prototype.setDocument = function(name, value, callback, noOverwrite) {
    noOverwrite = noOverwrite || false;

    var that_ = this;
    var rev = null;

    var setFunction = function() {
        var data = {
            'data': value
        };

        if (rev) {
            data._rev = rev;
        }

        that_.request_(that_.url_ + that_.config.couchDatabase + '/' + name, 'PUT', data, function(error, response, body) {
            if (error) {
                callback(error);
                return;
            } else if (response.statusCode < 200 || response.statusCode > 299) {
                callback(new Error('server returned status code ' + response.statusCode));
                return;
            } else if (!body || !body.ok) {
                callback(new Error('couchConnector: Could not get document (Body: ' + body + ')'));
            } else {
                callback(true);
            }
        });
    };

    if (noOverwrite) {
        setFunction();
    } else {
        trycatch(function() {
            that_.getDocument(name, function(doc, header) {
                rev = header.rev;
                setFunction();
            });
        }, function(e) {
            // document does not exist
            setFunction();
        });
    }
};

module.exports = function(callback) { return new couchdb(callback); };