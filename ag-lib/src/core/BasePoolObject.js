goog.provide('ag.core.BasePoolObject');

goog.require('ag.service.ObjectPool');

/**
 * @constructor
 */
ag.core.BasePoolObject = function() {
    this.__prev = null;
    this.__next = null;
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var BasePoolObject = ag.core.BasePoolObject;
var ObjectPool = ag.service.ObjectPool;

BasePoolObject.newObjectPool = function(constructorFn) {
    return new ObjectPool(constructorFn);
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
BasePoolObject.prototype.createCopy = function() {
    var object = this.pool().allocate();
    object.assign(this);
    return object;
};

BasePoolObject.prototype.pool = goog.abstractMethod;

BasePoolObject.prototype.release = function() {
    this.pool().release(this);
};

/*******************************************************************************************************************/});
