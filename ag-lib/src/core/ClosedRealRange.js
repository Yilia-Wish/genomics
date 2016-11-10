/**
 * @fileoverview ClosedRealRange encapsualtes a range of real numbers with a definite begin and end. These values are
 *   exposed as public member variables for direct consumption and manipulation by the client.
 *
 *   By definition, a range is inclusive and spans all values including the begin and end values. Unlike ClosedIntRange
 *   the length of a ClosedRealRange is merely the absolute difference of its endpoints.
 *
 *   Because the actual range endpoints are stored as floating point numbers, the actual values may be slightly off due
 *   to rounding errors.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.core.ClosedRealRange');

goog.require('goog.asserts');
goog.require('goog.math');

goog.require('ag.core.AbstractRange');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.core.AbstractRange}
 * @param {number=} optBegin defaults to 0.
 * @param {number=} optEnd defaults to optBegin.
 */
ag.core.ClosedRealRange = function(optBegin, optEnd) {
	goog.base(this, optBegin, optEnd);
};
goog.inherits(ag.core.ClosedRealRange, ag.core.AbstractRange);

/** @typedef {Array.<ag.core.ClosedRealRange>} */
ag.core.ClosedRealRangeArray;


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var math = goog.math;

var ClosedRealRange = ag.core.ClosedRealRange;

// --------------------------------------------------------------------------------------------------------------------
// Static factory methods
/**
 * @param {number=} optBegin
 * @param {number=} optLength defaults to 0
 * @return {ClosedRealRange}
 */
ClosedRealRange.createUsingLength = function(optBegin, optLength) {
	var range = new ClosedRealRange(optBegin);
	if (goog.isNumber(optBegin) && goog.isNumber(optLength))
		range.setLength(optLength);
	return range;
};


// --------------------------------------------------------------------------------------------------------------------
// Pseudo serialization
/**
 * @param {Array.<number>} arr
 * @return {ClosedRealRange}
 */
ClosedRealRange.fromSerialObject = function(arr) {
    return new ClosedRealRange(arr[0], arr[1]);
};


// --------------------------------------------------------------------------------------------------------------------
// Operators
/**
 * Tests for equality using a tolerance (epsilon) factor.
 *
 * @param {ClosedRealRange} other
 * @return {boolean}
 */
ClosedRealRange.prototype.eq = function(other) {
	return math.nearlyEquals(this.begin, other.begin) &&
		math.nearlyEquals(this.end, other.end);
};


// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @override */
ClosedRealRange.prototype.clone = function() {
	return new ClosedRealRange(this.begin, this.end);
};

/**
 * @param {ClosedRealRange} other
 * @return {Array}
 * @override
 */
ClosedRealRange.prototype.difference = function(other) {
	assert(goog.isDefAndNotNull(other));
	var self = this.isNormal() ? this : this.normalized();
	var that = other.isNormal() ? other : other.normalized();
	if (!self.intersects(that))
		return [this.normalized()];

	var result = [];
	if (that.containsRange(self))
		return result;

	var ax1 = self.begin;	var bx1 = that.begin;
	var ax2 = self.end;		var bx2 = that.end;

	// Left side (that intersects right portion of self)
	// (ax1)         (ax2) = self
	// -------------------
	//            ------------------------
	// that =     (bx1)              (bx2)
	if (bx1 >= ax1 && bx1 <= ax2)
		result.push(new ClosedRealRange(ax1, bx1));
		// result.push(new ClosedRealRange(ax1, bx1 - ax1));
	// Right side (that intersects left portion of self)
	// self =     (ax1)              (ax2)
	//            ------------------------
	// -------------------
	// (bx1)         (bx2) = that
	if (bx2 <= ax2 && bx2 >= ax1)
		result.push(new ClosedRealRange(bx2, ax2));

	return result;
};

/*******************************************************************************************************************/});