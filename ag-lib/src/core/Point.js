goog.provide('ag.core.Point');

goog.require('ag.core.BasePoolObject');

/**
 * @constructor
 * @param {number=} optX defaults to 0
 * @param {number=} optY defaults to 0
 * @extends {ag.core.BasePoolObject}
 */
ag.core.Point = function(optX, optY) {
    goog.base(this);

    /**
     * @type {number}
     */
    this.x;

    /**
     * @type {number}
     */
    this.y;

    this.constructor_(optX, optY);
};
goog.inherits(ag.core.Point, ag.core.BasePoolObject);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var BasePoolObject = ag.core.BasePoolObject;
var Point = ag.core.Point;


// --------------------------------------------------------------------------------------------------------------------
Point.prototype.constructor_ = function(optX, optY) {
    this.x = goog.isDef(optX) ? optX : 0;
    this.y = goog.isDef(optY) ? optY : 0
};


// --------------------------------------------------------------------------------------------------------------------
// Pool functions
Point.pool = BasePoolObject.newObjectPool(Point);
/**
 * @param {number} [optX] defaults to 0
 * @param {number} [optY] defaults to 0
 * @return {Point}
 */
Point.create = function(optX, optY) {
    var p = Point.pool.allocate();
    p.constructor_(optX, optY);
    return p;
};

Point.prototype.pool = function() {
    return Point.pool;
};


// --------------------------------------------------------------------------------------------------------------------
// Public functions
Point.prototype.assign = function(other) {
    this.x = other.x;
    this.y = other.y;
};

Point.prototype.eq = function(other) {
    return goog.isDef(other) &&
        this.x === other.x &&
        this.y === other.y;
};

Point.prototype.ne = function(other) {
    return !this.eq(other);
};


/*******************************************************************************************************************/});
