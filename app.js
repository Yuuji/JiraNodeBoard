global.AppUtils = require('./src/libs/utils/utils');
global.AppEvents = require('./src/libs/utils/events');
global.AppTemplates = require('./src/libs/utils/templates');

global.AppCouchDB = require('./src/libs/db/couchdb')(function() {
    global.AppJira = require('./src/libs/jira/jira')(function() {
        require('./src/libs/net/webserver')();
        require('./src/modules/modules')();
    });
});