var io = require('socket.io-client');
var fs = require('fs');
var path = require('path');

var tags = function(callback) {
    this.init(callback);
};

tags.prototype.tagIds_ = {};
tags.prototype.nextId_ = 100;
tags.prototype.tagFiles_ = [];

tags.prototype.init = function(callback) {
    var that_ = this;
    AppCouchDB.getDocument('tags', function(data, error) {
        if (data===false) {
            callback(false, error);
            return;
        } else {
            this.tagIds_ = data.tagIds;
            this.nextId_ = data.nextId;
            that_.readTagIds(callback);
        }
    });
};

tags.prototype.readTagIds = function(callback) {
    var that_ = this;
    var dir = process.cwd() + '/public/images/tags';
    fs.readdir(dir, function(err, files) {
        if (err) {
            callback(false, new Error('Could not read tags directory'));
            return;
        }
        
        for(var key in files) {
            var file = files[key];
            if (path.extname(file) === '.png') {
                that_.tagFiles_.push(path.basename(file, '.png'));
            }
        }
        
        callback(true);
    });
}

tags.prototype.save = function(callback) {
    AppCouchDB.setDocument('tags', {
        tagIds: this.tagIds_,
        nextId: this.nextId_
    }, callback);
};

tags.prototype.clear = function(callback) {
    this.tagIds_ = {};
    this.nextId_ = 0;
    this.save(callback);
};

tags.prototype.hasTagId = function(id) {
    if (typeof this.tagIds_[id] === 'undefined') {
        return false;
    }
    
    return true;
};

tags.prototype.getTagId = function(id) {
    if (typeof this.tagIds_[id] === 'undefined') {
        this.tagIds_[id] = this.tagFiles_[this.nextId_];
        this.nextId_++;
        this.save(function() {});
    }
    
    console.log('Tag: ' + id + ' => ' + this.tagIds_[id]);
    return this.tagIds_[id];
};

tags.prototype.getTagLine = function(tag, xRes, yRes) {
    // border from botton to top
    var p1 = tag.borders[3].p2;
    var p2 = tag.borders[3].p1;
    
    var bottom = {
        x: 0,
        y: yRes
    };
    if (p1.x === p2.x) {
        bottom.x = p1.x;
    } else {
        var m = (p1.y - p2.y) / (p1.x - p2.x);
        var a = p1.y - (p1.x * m);
        bottom.x = Math.round((yRes - a) / m);
    }
    
    return {
        p1: {
            x: p1.x,
            y: p1.y
        },
        p2: {
            x: bottom.x,
            y: bottom.y
        }
    };
};

tags.prototype.isRightOf = function(line, point) {
    return ((line.p2.x - line.p1.x)*(point.y - line.p1.y) - (line.p2.y - line.p1.y)*(point.x - line.p1.x)) <0;
};

tags.prototype.detectLive = function(callback) {
    var that_ = this;
    var socket = io('http://localhost:4000');
    var xRes;
    var yRes;
    
    var todoLine = false;
    var inProgressLine = false;
    var doneLine = false;
    
    socket.on('settings', function(data){
        xRes = data.xRes;
        yRes = data.yRes;
        
        socket.emit('join', 'tags');
        //socket.emit('join', 'image');
    });
    
    socket.on('tags', function(data) {
        if (data.tags.length>0) {
            for (var key in data.tags) {
                var tag = data.tags[key];
                
                switch (tag.id) {
                    case 1:
                        todoLine = that_.getTagLine(tag, xRes, yRes);
                        break;
                    case 2:
                        inProgressLine = that_.getTagLine(tag, xRes, yRes);
                        break;
                    case 3:
                        doneLine = that_.getTagLine(tag, xRes, yRes);
                        break;
                    default:
                        if (todoLine !== false && inProgressLine !== false && doneLine !== false) {
                            if (that_.isRightOf(doneLine, tag.center)) {
                                callback(tag.id, 'done');
                            } else if (that_.isRightOf(inProgressLine, tag.center)) {
                                callback(tag.id, 'inprogress');
                            } else if (that_.isRightOf(todoLine, tag.center)) {
                                callback(tag.id, 'todo');
                            } else {
                                callback(tag.id, 'unknown');
                            }
                        } else {
                            console.log(tag.id + ': Status tags not found yet');
                        }
                        break;
                }
            }
            
        }
    });
};

module.exports = function(callback) { return new tags(callback); };

