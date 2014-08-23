var util = require('util');
var trycatch = require('trycatch');
var jsonRequest = require(process.cwd() + '/src/libs/utils/jsonrequest')

var jira = function(callback) {
    jsonRequest.call(this);
    this.checkConfig(callback);
};

util.inherits(jira, jsonRequest);

jira.prototype.connected = false;
jira.prototype.connectionError = false;
jira.prototype.config = null;

jira.prototype.checkConfig = function(callback) {
    var that_ = this;
    
    if (AppCouchDB.connected) {
        that_.loadConfig(function(success, error) {
            that_.connected = success;
            that_.connectionError = error || false;
            callback();
        });
    } else {
        callback();
    }
};

jira.prototype.loadConfig = function(callback) {
    var that_ = this;
    AppCouchDB.getDocument('jiraconfig', function(data, error) {
        if (data===false) {
            callback(false, error);
            return;
        } else {
            if (    !data.url ||
                    !data.username ||
                    !data.password) {
                callback(false);
                return;
            }
            
            that_.config = data;
            that_.checkServer(function(success) {
                if (success===true) {
                    callback(true);
                } else {
                    callback(false, success);
                }
            });
        }
    });
};

jira.prototype.saveServerConfig = function(url, username, password, callback) {
    this.config.url = url;
    this.config.username = username;
    this.config.password = password;
    
    if (this.config.url.substr(config.url.length-1,1) !== '/') {
        this.config.url += '/';
    }
    
    this.saveConfig(callback);
};

jira.prototype.saveConfig = function(callback) {
    AppCouchDB.setDocument('jiraconfig', this.config, callback);
};

jira.prototype.getSelectedRapidView = function() {
    return this.config.selectedRapidView || false;
};

jira.prototype.setSelectedRapidView = function(id, callback) {
    this.config.selectedRapidView = id;
    this.saveConfig(callback);
};

jira.prototype.checkServer = function(callback) {
    console.log(this.config.url + 'rest/auth/latest/session');
    this.request_(this.config.url + 'rest/auth/latest/session', 'POST', {
        username: this.config.username,
        password: this.config.password
    }, function(error, response, body) {
        if (error) {
            callback(error);
            return;
        } else if ((response.statusCode < 400 || response.statusCode > 403) && (response.statusCode < 200 || response.statusCode > 299)) {
            callback(new Error('server returned status code ' + response.statusCode));
            return;
        }

        if (!body || (!body.errorMessages && !body.session)) {
            callback(new Error('Could not connect to server (Is that a jira server?)'));
            return;
        }
        
        if (body.errorMessages && body.errorMessages.length>0) {
            callback(new Error(body.errorMessages.toString()));
            return;
        }
        callback(true);
    });
};

jira.prototype.logout = function(callback) {
    this.request_(this.config.url + 'rest/auth/latest/session', 'DELETE',
    function(error, response, body) {
        if (error) {
            callback(error);
            return;
        } else if (response.statusCode < 200 || response.statusCode > 299) {
            callback(new Error('server returned status code ' + response.statusCode));
            return;
        }

        if (!body) {
            callback(new Error('Could not connect to server (Is that a jira server?)'));
            return;
        }
        
        callback(true);
    });
};

jira.prototype.getRapidViews = function(callback) {
    this.getAPI('rest/greenhopper/1.0/rapidviews/list', function(success, body) {
        if (success!==true) {
            callback(false, success);
            return;
        } else {
            if (!body.views) {
                callback(false, new Error('Unexpected response!'));
                return;
            }
            
            var views = [];
            for (var key in body.views) {
                if (body.views[key].sprintSupportEnabled) {
                    views.push({
                        id: body.views[key].id,
                        name: body.views[key].name
                    });
                }
            }

            callback(views);
        }
    });
};

jira.prototype.getSprints = function(callback) {
    var rapidViewId = this.getSelectedRapidView();
    
    this.getAPI('rest/greenhopper/1.0/sprintquery/' + rapidViewId, function(success, body) {
        if (success!==true) {
            callback(false, success);
            return;
        } else {
            if (!body.sprints) {
                callback(false, new Error('Unexpected response!'));
                return;
            }
            
            if (body.sprints.length===0) {
                callback(false, new Error('No sprints found!'));
                return;
            }
            
            var sprints = [];
            for (var key in body.sprints) {
                sprints.push({
                    id: body.sprints[key].id,
                    name: body.sprints[key].name,
                    active: (body.sprints[key].state==='ACTIVE' ? true : false),
                    closed: (body.sprints[key].state==='CLOSED' ? true : false)
                });
            }

            callback(sprints);
        }
    });
};

jira.prototype.getActiveSprint = function(callback) {
    this.getSprints(function(sprints, error) {
        if (sprints===false) {
            callback(false, error);
            return;
        } else {
            for (var key in sprints) {
                if (sprints[key].active) {
                    callback(sprints[key]);
                    return;
                }
            }
            
            callback(false, new Error('No active sprint found!'));
        }
    });
};

jira.prototype.getSprintIssueObject_ = function(obj) {
    return {
        id: parseInt(obj.id,10),
        key: obj.key,
        hidden: obj.hidden,
        type: {
            name: obj.typeName,
            id: obj.typeId
        },
        summary: obj.summary,
        typeUrl: obj.typeUrl,        
        priorityUrl: obj.priorityUrl,
        priorityName: obj.priorityName,
        done: obj.done,
        color: obj.color,
        epic: obj.epic,
        status: {
            id: parseInt(obj.statusId,10),
            name: obj.statusName,
            url: obj.statusUrl
        }
    };
};

jira.prototype.getSprintIssues = function(sprintId, callback) {
    var that_ = this;
    var rapidViewId = this.getSelectedRapidView();
    
    this.getAPI('rest/greenhopper/1.0/rapid/charts/sprintreport?rapidViewId=' + rapidViewId + '&sprintId=' + sprintId, function(success, body) {
        if (success!==true) {
            callback(false, success);
            return;
        } else {
            if (!body.contents) {
                callback(false, new Error('Unexpected response!'));
                return;
            }
            
            if (body.contents.length===0) {
                callback(false, new Error('No issues found!'));
                return;
            }
            
            var issues = {
                completed: [],
                incompleted: []
            };
            
            for (var key in body.contents.completedIssues) {
                issues.completed.push(that_.getSprintIssueObject_(body.contents.completedIssues[key]));
            }
            
            for (var key in body.contents.incompletedIssues) {
                issues.incompleted.push(that_.getSprintIssueObject_(body.contents.incompletedIssues[key]));
            }

            callback(issues);
        }
    });
};

jira.prototype.getIssueObject_ = function(obj) {
    // todo: comments
    var issue = {
        id: obj.id,
        key: obj.key,
        summary: obj.fields.summary,
        issuetype: {
            id: parseInt(obj.fields.issuetype.id,10),
            description: obj.fields.issuetype.description,
            icon: obj.fields.issuetype.iconUrl,
            name: obj.fields.issuetype.name,
            subtask: obj.fields.issuetype.subtask
        },
        description: obj.fields.description,
        status: {
            id: parseInt(obj.fields.status.id,10),
            name: obj.fields.status.name,
            description: obj.fields.status.description,
            icon: obj.fields.status.iconUrl
        },
        order: obj.fields.customfield_10004,
        subtasks: []
    };
    
    if (obj.fields.subtasks && obj.fields.subtasks.length > 0) {
        for (var key in obj.fields.subtasks) {
            issue.subtasks.push(this.getIssueObject_(obj.fields.subtasks[key]));
        }
    }
    
    return issue;
};

jira.prototype.getIssue = function(issueId, callback) {
    var that_ = this;
    
    this.getAPI('rest/api/2/issue/' + issueId, function(success, body) {
        if (success!==true) {
            callback(false, success);
            return;
        } else {
            if (!body.fields) {
                callback(false, new Error('Issue not found!'));
                return;
            }
            
            callback(that_.getIssueObject_(body));
        }
    });
};

jira.prototype.getAPI = function(apiURL, callback) {
    console.log(apiURL);
    this.request_(this.config.url + apiURL, 'GET',
    function(error, response, body) {
        if (error) {
            callback(error, body);
            return;
        } else if (response.statusCode < 200 || response.statusCode > 299) {
            callback(new Error('server returned status code ' + response.statusCode), body);
            return;
        }

        if (!body) {
            callback(new Error('Could not connect to server (Is that a jira server?)'), body);
            return;
        }
        
        callback(true, body);
    });
};

module.exports = function(callback) { return new jira(callback); };