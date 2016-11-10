goog.provide('ag.service.RAFHub');

goog.require('polyfill.rAF');

goog.require('goog.asserts');

/**
 * @constructor
 */
ag.service.RAFHub = function() {
    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {Array.<Object>}
     * @private
     */
    this.objects_ = new Array(8);

    /**
     * @type {Object.<string,boolean>}
     * @private
     */
    this.objectIds_ = {};

    /**
     * @type {boolean}
     * @private
     */
    this.updateRequested_ = false;

    /**
     * @type {number}
     * @private
     */
    this.nextI_ = 0;
};
goog.addSingletonGetter(ag.service.RAFHub);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var RAFHub = ag.service.RAFHub;

// --------------------------------------------------------------------------------------------------------------------
// Static onAnimationFrame method
/** @private */
RAFHub.onAnimationFrame_ = function() {
    RAFHub.getInstance().processUpdateQueue();
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * @param {Object} object
 */
RAFHub.prototype.update = function(object) {
    assert(goog.isObject(object), 'Argument is not an object');
    assert(goog.isFunction(object.raf), 'Object is missing raf argument');

    var id = goog.getUid(object).toString();
    if (!this.objectIds_[id]) {
        this.objectIds_[id] = true;
        this.objects_[this.nextI_++] = object;
    }

    if (!this.updateRequested_) {
        requestAnimationFrame(RAFHub.onAnimationFrame_);
        this.updateRequested_ = true;
    }
};

/**
 * Assumes that any callback does not in turn request another request animation frame.
 */
RAFHub.prototype.processUpdateQueue = function() {
    for (var i=0, z=this.nextI_; i<z; i++) {
        var object = this.objects_[i];
        object.raf();
        this.objects_[i] = null;
        this.objectIds_[ goog.getUid(object).toString() ] = false;
    }
    this.nextI_ = 0;
    this.updateRequested_ = false;
};

/*******************************************************************************************************************/});
