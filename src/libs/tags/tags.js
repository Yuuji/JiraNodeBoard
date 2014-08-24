var tags = function(callback) {
    this.init(callback);
};

tags.prototype.tagIds_ = {};
tags.prototype.nextId_ = 0;

tags.prototype.init = function(callback) {
    AppCouchDB.getDocument('tags', function(data, error) {
        if (data===false) {
            callback(false, error);
            return;
        } else {
            this.tagIds_ = data.tagIds;
            this.nextId_ = data.nextId;
            callback(true);
        }
    });
};

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
        this.tagIds_[id] = this.nextId_;
        this.nextId_++;
        this.save(function() {});
    }
    
    console.log('Tag: ' + id + ' => ' + this.tagIds_[id]);
    return this.tagIds_[id];
};

module.exports = function(callback) { return new tags(callback); };

