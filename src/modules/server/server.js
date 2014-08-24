var fs = require('fs');

/**
 * Server module
 * 
 * @constructor
 */
var server = function() {
    this.start();
};

server.prototype.sprintData = {
    timestamp: 0,
    sprint: false,
    issues: false
};

/**
 * Starts server
 */
server.prototype.start = function() {
    AppEvents.emit('webserver.register', {
        type: 'GET',
        url: '/',
        callback: AppUtils.proxy(this.pageRoot, this)
    });
    
    AppEvents.emit('webserver.register', {
        type: 'GET',
        url: '/module/server/page/:page',
        callback: AppUtils.proxy(this.pageHandler, this)
    });
    
    AppEvents.emit('webserver.register', {
        type: 'POST',
        url: '/module/server/page/:page',
        callback: AppUtils.proxy(this.pagePostHandler, this)
    });
    
    AppEvents.emit('webserver.register_css', {
        url: '/module/server/css',
        path: __dirname + '/css'
    });
    
    AppEvents.emit('webserver.register_js', {
        url: '/module/server/js',
        path: __dirname + '/js'
    });
};

server.prototype.loadSprintData = function(callback) {
    var that_ = this;
    var now = new Date().getTime();
    
    var doCallback = function(success) {
        if (success===false) {
            that_.sprintData.sprint = false;
            that_.sprintData.issues = false
        }
        
        that_.sprintData.timestamp = new Date().getTime();
        
        callback(success);
    }
    
    if ((now - this.sprintData.timestamp) <= (10*60*1000)) {
        doCallback(true);
        return;
    } else {
        AppJira.getActiveSprint(function (sprint, error) {
            if (sprint===false) {
                doCallback(false);
                return;
            } else {
                that_.sprintData.sprint = sprint;
                AppJira.getSprintIssues(sprint.id, function(issues, error) {
                    if (issues===false) {
                        doCallback(false);
                        return;
                    } else {
                        that_.sprintData.issues = issues;
                        
                        var doSort = function() {
                            that_.sprintData.issues.ordered = [];
                            
                            for (var key in that_.sprintData.issues.completed) {
                                that_.sprintData.issues.ordered.push(that_.sprintData.issues.completed[key]);
                            }
                            
                            for (var key in that_.sprintData.issues.incompleted) {
                                that_.sprintData.issues.ordered.push(that_.sprintData.issues.incompleted[key]);
                            }
                            
                            that_.sprintData.issues.ordered.sort(function(a, b){
                                var keyA = parseInt(a.issue.order, 10);
                                var keyB = parseInt(b.issue.order, 10);
                                var lengthA = a.issue.subtasks.length;
                                var lengthB = b.issue.subtasks.length;
                                
                                if(
                                        (lengthA === 0 ||
                                         lengthB === 0) &&
                                         lengthA !== lengthB) {
                                    if(lengthA < lengthB) return 1;
                                    if(lengthA > lengthB) return -1;
                                    return 0;
                                }
                                if(keyA < keyB) return -1;
                                if(keyA > keyB) return 1;
                                return 0;
                            });
                            
                            doCallback(true);
                            return;
                        };
                        
                        var doLoop = function(key, type) {
                            if (!that_.sprintData.issues[type][key]) {
                                if (type==='completed') {
                                    doLoop(0, 'incompleted');
                                    return;
                                } else {
                                    doSort();
                                    return;
                                }
                                return;
                            } else {
                                AppJira.getIssue(that_.sprintData.issues[type][key].id, function(issue, error) {
                                    if (issue===false) {
                                        doCallback(false);
                                        return;
                                    } else {
                                        // todo: Clear if new sprint but not the tag for issues in both sprints
                                        issue.tagId = AppTags.getTagId(issue.id);
                                        
                                        for(var subkey in issue.subtasks) {
                                            issue.subtasks[subkey].tagId = AppTags.getTagId(issue.subtasks[subkey].id);
                                        }
                                        
                                        that_.sprintData.issues[type][key].issue = issue;
                                        doLoop(key+1, type);
                                    }
                                });
                            }
                        };
                        doLoop(0, 'completed');
                        return;
                    }
                });
            }
        });
    }
}

/**
 * Start page
 * 
 * @returns {webserver.pageType}
 */
server.prototype.pageRoot = function() {
    return {
        header: [
            302, {'Location': '/module/server/page/index'}
        ],
        body: ''
    };
};

/**
 * Page handler
 * 
 * @returns {webserver.pageType}
 */
server.prototype.pageHandler = function(event) {
    switch (event.request.params.page) {
        case 'home':
        case 'sprint':
        case 'board':
        case 'cam':
        case 'cards':
            if (!AppCouchDB.connected) {
                return {
                    header: [
                        302, {'Location': '/module/server/page/dbsetup'}
                    ],
                    body: ''
                };
                break;
            }
            
            if (!AppJira.connected) {
                return {
                    header: [
                        302, {'Location': '/module/server/page/jirasetup'}
                    ],
                    body: ''
                };
                break;
            }
            
            if (AppJira.getSelectedRapidView() === false) {
                return {
                    header: [
                        302, {'Location': '/module/server/page/jiraviewsetup'}
                    ],
                    body: ''
                };
                break;
            }
        case 'index':
        case 'dbsetup':
        case 'jirasetup':
        case 'jiraviewsetup':
            var page = 'page';
            page += event.request.params.page.substr(0,1).toUpperCase();
            page += event.request.params.page.substr(1);
            return this[page]();
            break;
        default:
            return {
                header: 404,
                body: 'Not found (server.js:89)'
            };
            break;
    }
};

/**
 * Page handler
 * 
 * @returns {webserver.pageType}
 */
server.prototype.pagePostHandler = function(event) {
    switch (event.request.params.page) {
        case 'dbsetup':
        case 'jirasetup':
        case 'jiraviewsetup':
            var page = 'pagePost';
            page += event.request.params.page.substr(0,1).toUpperCase();
            page += event.request.params.page.substr(1);
            return this[page](event.request);
            break;
        default:
            return {
                header: 404,
                body: 'Not found (server.js:89)'
            };
            break;
    }
};

/**
 * Index page
 * 
 * @returns {webserver.pageType}
 */
server.prototype.pageIndex = function() {
    return AppTemplates.renderFile(__dirname + '/templates/index.ejs');
};

/**
 * Page Home
 * 
 * @returns {webserver.pageType}
 */
server.prototype.pageHome = function() {
    return function(callback) {
        AppJira.getActiveSprint(function(sprint, error) {
            console.log(sprint, error);
            callback(AppTemplates.renderFile(__dirname + '/templates/page/home.ejs', {
                error: error,
                sprint: sprint
            }));
        });
    };
};

/**
 * Page Setup
 * 
 * @returns {webserver.pageType}
 */
server.prototype.pageDbsetup = function() {
    var config = AppCouchDB.config;
    config = config || {};
    config.couchHostname = config.couchHostname || 'localhost';
    config.couchPort = config.couchPort || 5984;
    config.couchDatabase = config.couchDatabase || 'jiranodeboard';
    config.couchUsername = config.couchUsername || '';
    config.couchPassword = config.couchPassword || '';
    
    var error = AppCouchDB.connectionError;
    
    return AppTemplates.renderFile(__dirname + '/templates/page/dbsetup.ejs', {error: error, config: config});
};

/**
 * Page Post Setup
 * 
 * @returns {webserver.pageType}
 */
server.prototype.pagePostDbsetup = function(request) {    
    
    //var error = AppCouchDB.connectionError;
    
    return function(callback) {
        AppCouchDB.saveConfig(
            request.post.hostname,
            request.post.port,
            request.post.database,
            request.post.username,
            request.post.password
        );

        var page = 'index';

        AppCouchDB.checkConfig(function() {
            if (!AppCouchDB.connected) {
                page = 'dbsetup';
            }
            
            callback({
                header: [200, {'Content-type': 'application/json'}],
                body: JSON.stringify({
                    page: page
                })
            });
        });
    };
};

/**
 * Page Jirasetup
 * 
 * @returns {webserver.pageType}
 */
server.prototype.pageJirasetup = function() {
    var config = AppJira.config;
    config = config || {};
    config.url = config.url || 'https://localhost/jira/';
    config.username = config.username || '';
    config.password = config.password || '';
    
    var error = AppJira.connectionError;
    
    return AppTemplates.renderFile(__dirname + '/templates/page/jirasetup.ejs', {error: error, config: config});
};

/**
 * Page Post Jirasetup
 * 
 * @returns {webserver.pageType}
 */
server.prototype.pagePostJirasetup = function(request) {    
    
    return function(callback) {
        AppJira.saveServerConfig(
            request.post.url,
            request.post.username,
            request.post.password,
            function() {
                var page = 'index';

                AppJira.checkConfig(function() {
                    if (!AppJira.connected) {
                        page = 'jirasetup';
                    }

                    callback({
                        header: [200, {'Content-type': 'application/json'}],
                        body: JSON.stringify({
                            page: page
                        })
                    });
                });
            }
        );
    };
};

/**
 * Page Jiraviewsetup
 * 
 * @returns {webserver.pageType}
 */
server.prototype.pageJiraviewsetup = function() {
    return function(callback) {
        AppJira.getRapidViews(function(views, error) {
            callback(
                    AppTemplates.renderFile(
                        __dirname + '/templates/page/jiraviewsetup.ejs',
                        {
                            selectedViewId: AppJira.getSelectedRapidView(),
                            views: views,
                            error: error
                        }
                    )
            );
        });
    };
};

/**
 * Page Post Jiraviewsetup
 * 
 * @returns {webserver.pageType}
 */
server.prototype.pagePostJiraviewsetup = function(request) {    
    
    return function(callback) {
        AppJira.setSelectedRapidView(
            request.post.selectedview || false,
            function() {
                callback({
                    header: [200, {'Content-type': 'application/json'}],
                    body: JSON.stringify({
                        page: 'index'
                    })
                });
            }
        );
    };
};

/**
 * Page sprint
 * 
 * @returns {webserver.pageType}
 */
server.prototype.pageSprint = function() {
    var that_ = this;
    return function(callback) {
        that_.loadSprintData(function() {
            /*callback({
                header: [200, {'Content-type': 'application/json'}],
                body: JSON.stringify(that_.sprintData)
            });*/
            callback(AppTemplates.renderFile(__dirname + '/templates/page/sprint.ejs', {
                data: that_.sprintData
            }));
        });
    };
};

/**
 * Page board
 * 
 * @returns {webserver.pageType}
 */
server.prototype.pageBoard = function() {
    var that_ = this;
    return function(callback) {
        that_.loadSprintData(function() {
            /*callback({
                header: [200, {'Content-type': 'application/json'}],
                body: JSON.stringify(that_.sprintData)
            });*/
            callback(AppTemplates.renderFile(__dirname + '/templates/page/board.ejs', {
                data: that_.sprintData
            }));
        });
    };
};

/**
 * Page cards
 * 
 * @returns {webserver.pageType}
 */
server.prototype.pageCards = function() {
    var that_ = this;
    return function(callback) {
        that_.loadSprintData(function() {
            callback(AppTemplates.renderFile(__dirname + '/templates/page/cards.ejs', {
                data: that_.sprintData
            }));
        });
    };
};

/**
 * Page cam
 * 
 * @returns {webserver.pageType}
 */
server.prototype.pageCam = function() {
    var that_ = this;
    return function(callback) {
        that_.loadSprintData(function() {
            callback(AppTemplates.renderFile(__dirname + '/templates/page/cam.ejs', {
                data: that_.sprintData
            }));
        });
    };
};

module.exports = function() { return new server(); };