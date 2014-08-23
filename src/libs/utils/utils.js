var utils = function() {};

/**
 * Returns a function that executes the fiven function in given context
 * 
 * @param {Function} func
 * @param {Object} context
 * @returns {Function}
 */
utils.proxy = function(func, context) {
    return function() {
        return func.apply(context, arguments);
    };
};

module.exports = utils;