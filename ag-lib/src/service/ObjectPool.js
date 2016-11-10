goog.provide('ag.service.ObjectPool');

goog.require('goog.asserts');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 */
ag.service.ObjectPool = function(constructorFn) {
    goog.asserts.assert(goog.isFunction(constructorFn));

    /**
     * @type {Function}
     * @private
     */
    this.constructorFn_ = constructorFn;

    /**
     * Tail of doubly linked list of allocated BasePoolObjects
     *
     * @type {ag.core.BasePoolObject}
     * @private
     */
    this.allocated_;

    /**
     * Head of doubly linked list of free BasePoolObjects
     *
     * @type {ag.core.BasePoolObject}
     * @private
     */
    this.free_;

    /**
     * @type {number}
     * @private
     */
    this.total_ = 0;

    /**
     * @type {number}
     * @private
     */
    this.used_ = 0;
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var ObjectPool = ag.service.ObjectPool;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
ObjectPool.prototype.allocate = function() {
    var x;
    if (this.free_) {
        x = this.free_;
        if (x.__next)
            x.__next.__prev = null;

        // Remove from the free list
        this.free_ = x.__next;
    }
    else {
        // None free - create a new one
        // if (this.constructorFn_ === ag.core.UnitRect) {
        //     console.log('Allocating a new UnitRect');
        // }

        x = new this.constructorFn_();
        ++this.total_;
    }
    x.__next = null;

    // Add to the end of the list
    if (this.allocated_) {
        this.allocated_.__next = x;
        x.__prev = this.allocated_;
    }
    this.allocated_ = x;

    ++this.used_;

    return x;
};

ObjectPool.prototype.free = function() {
    return this.total_ - this.used_;
};

ObjectPool.prototype.release = function(object) {
    // Join left and right neighbors
    if (object.__prev)
        object.__prev.__next = object.__next;
    if (object.__next)
        object.__next.__prev = object.__prev;

    // Update the allocated tail object (may be null afterwards)
    if (object === this.allocated_)
        this.allocated_ = object.__prev;

    // Add to the head of free
    object.__prev = null;
    object.__next = this.free_;
    if (this.free_)
        this.free_.__prev = object;

    this.free_ = object;

    --this.used_;
};

ObjectPool.prototype.total = function() {
    return this.total_;
};

ObjectPool.prototype.used = function() {
    return this.used_;
};

/*******************************************************************************************************************/});
