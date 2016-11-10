/**
 * @fileoverview ClosedIntRange encapsualtes an integral range with a definite begin and end. These values are exposed as
 *   public member variables for direct consumption and manipulation by the client. At no point, should either value be
 *   assigned a non-integral value or else the behavior is undefined.
 *
 *   By definition, a range is inclusive and occupies each integral unit. This has important ramifications with regard to
 *   its length. For example, if the begin and end values are the same, its length is 1 because it occupies one unit of
 *   space.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.core.ClosedIntRange');

goog.require('goog.asserts');
goog.require('goog.math');

goog.require('ag.core.AbstractRange');

// --------------------------------------------------------------------------------------------------------------------
/**
 * It is vital
 *
 * @constructor
 * @param {number=} optBegin defaults to 0
 * @param {number=} optEnd defaults to optBegin
 * @extends {ag.core.AbstractRange}
 */
ag.core.ClosedIntRange = function(optBegin, optEnd) {
	goog.asserts.assert(!goog.isDef(optBegin) || goog.math.isInt(optBegin), 'new ClosedIntRange(): invalid optBegin argument (' + optBegin + ')');
	goog.asserts.assert(!goog.isDef(optEnd) || goog.math.isInt(optEnd), 'new ClosedIntRange(): invalid optEnd argument (' + optEnd + ')');

	goog.base(this, optBegin, optEnd);
};
goog.inherits(ag.core.ClosedIntRange, ag.core.AbstractRange);

/** @typedef {Array.<ag.core.ClosedIntRange>} */
ag.core.ClosedIntRangeArray;


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var isInt = goog.math.isInt;

var ClosedIntRange = ag.core.ClosedIntRange;

// --------------------------------------------------------------------------------------------------------------------
// Static factory methods
/**
 * @param {number=} optBegin defaults to 0
 * @param {number=} optLength defaults to 1
 * @return {ClosedIntRange}
 */
ClosedIntRange.createUsingLength = function(optBegin, optLength) {
	var range = new ClosedIntRange(optBegin);
	if (goog.isNumber(optBegin) && goog.isNumber(optLength))
		range.setLength(optLength);
	return range;
};


// --------------------------------------------------------------------------------------------------------------------
// Static helper methods
/**
 * Given an array of ClosedIntRange's, return a key-value object where each key indicates an integral position
 * and the cooresponding value is how many times that position has been "covered" by a given range.
 *
 * @param {ClosedIntRange|ag.core.ClosedIntRangeArray} ranges
 * @return {Object.<number,number>}
 */
ClosedIntRange.coverage = function(ranges) {
	if (!goog.isArray(ranges)) {
		assert(ranges instanceof ClosedIntRange);
		ranges = [ranges];
	}

	var result = {};
	for (var i=0, z=ranges.length; i<z; i++) {
		var range = ranges[i];
		if (!range.isNormal())
			range = range.normalized();
		for (var x=range.begin; x<=range.end; x++) {
			if (result.hasOwnProperty(x))
				result[x]++;
			else
				result[x] = 1;
		}
	}

	return result;
};


// --------------------------------------------------------------------------------------------------------------------
// Pseudo serialization
/**
 * @param {Array} arr
 * @return {ClosedIntRange}
 */
ClosedIntRange.fromSerialObject = function(arr) {
    return new ClosedIntRange(arr[0], arr[1]);
};


// --------------------------------------------------------------------------------------------------------------------
// Operators
/** @override */
ClosedIntRange.prototype.eq = function(other) {
	return this.begin === other.begin &&
		this.end === other.end;
};


// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * @return {ClosedIntRange}
 */
ClosedIntRange.prototype.clone = function() {
	return new ClosedIntRange(this.begin, this.end);
};

/** @override */
ClosedIntRange.prototype.difference = function(other) {
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
	if (bx1 > ax1 && bx1 <= ax2)
		// Alternatively with length: ax1 for bx1 - ax1
		result.push(new ClosedIntRange(ax1, bx1 - 1));
	// Right side (that intersects left portion of self)
	// self =     (ax1)         (ax2)
	//            ------------------------
	// -------------------
	// (bx1)         (bx2) = that
	if (bx2 < ax2 && bx2 >= ax1)
		// Alternatively with length: bx2 + 1 for ax2 - (bx2 + 1) + 1
		result.push(new ClosedIntRange(bx2 + 1, ax2));

	return result;
};

/** @override */
ClosedIntRange.prototype.length = function() {
	var l = this.end - this.begin;
	return (l >= 0) ? l + 1 : l - 1;
};

/** @override */
ClosedIntRange.prototype.setLength = function(newLength) {
	assert(isInt(newLength));
	assert(newLength !== 0);
	this.end = this.begin + newLength;
	if (newLength > 0)
		this.end--;
	else
		this.end++;
};

/*******************************************************************************************************************/});