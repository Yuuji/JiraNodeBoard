var request = require('request').defaults({jar: true})
var trycatch = require('trycatch');

var jsonRequest = function() {
};

/**
 * Do a request
 *
 * @private
 * @param {string} url                                                  Url to request
 * @param {string=} type                                                Type to request (GET, POST, PUT, DELETE)
 * @param {(string|Object)=} data                                       Data if POST or PUT
 * @param {function(string|?, XHRResponse, string|Object} callback      Callback function after request is done
 * @throws {Error}                                                      Throws error on error
 */
jsonRequest.prototype.request_ = function(url, type, data, callback) {
    if (type && typeof type === 'function') {
        callback = type;
        type = undefined;
    }

    if (type && typeof type === 'object') {
        data = type;
        type = undefined;
    }

    if (data && typeof data === 'function') {
        callback = data;
        data = undefined;
    }

    type = type || 'GET';

    /**
     *
     * @type {{method: string, uri: string}}
     */
    var options = {
        method: type,
        uri: url
    };

    if (data && typeof data === 'object') {
        options.json = data; //JSON.stringify(data);
    }

    request(
            options,
            function(error, response, body) {
                if (typeof body === 'string') {
                    if (!error && response.statusCode >= 200 && response.statusCode <= 299) {
                        try {
                            body = JSON.parse(body);
                        } catch (e) {
                            callback('Could not parse JSON', response, body);
                            return;
                        }
                    } else {
                        try {
                            body = JSON.parse(body);
                        } catch (e) {
                            // ignore
                        }
                    }
                }

                callback(error, response, body);
            }
    );
};

module.exports = jsonRequest;