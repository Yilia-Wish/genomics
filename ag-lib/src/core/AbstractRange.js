/**
 * @fileoverview AbstractRange partially defines the interface for working with inegral or real number ranges that have
 *   definite begin and end points.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.core.AbstractRange');

goog.require('goog.asserts');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @param {number=} optBegin defaults to 0
 * @param {number=} optEnd defaults to optBegin
 */
ag.core.AbstractRange = function(optBegin, optEnd) {
	// --------------------------------------------------------------------------------------------------------------------
	// Public members
	/**
	 * @type {number}
	 * @public
	 */
	this.begin = 0;

	/**
	 * @type {number}
	 * @public
	 */
	this.end = this.begin;

	// --------------------------------------------------------------------------------------------------------------------
	// Initialization
	if (goog.isNumber(optBegin)) {
		this.begin = this.end = optBegin;
		if (goog.isNumber(optEnd))
			this.end = optEnd;
	}
};

/** @typedef {Array.<ag.core.AbstractRange>} */
ag.core.AbstractRangeArray;


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var AbstractRange = ag.core.AbstractRange;

// --------------------------------------------------------------------------------------------------------------------
// Debug output
if (goog.DEBUG) {
	/**
	 * Returns a nice string representing the range.
	 * @return {string}
	 */
	AbstractRange.prototype.toString = function() {
		return '(' + this.begin + ', ' + this.end + ') = [' + this.length() + ']';
	};
}


// --------------------------------------------------------------------------------------------------------------------
// Pseudo serialization
/** @return {Array.<number>} */
AbstractRange.prototype.toSerialObject = function() {
    return [this.begin, this.end];
};


// --------------------------------------------------------------------------------------------------------------------
// Operators
/** @return {AbstractRange} */
AbstractRange.prototype.clone = goog.abstractMethod;

/**
 * @param {AbstractRange} other
 * @return {boolean}
 */
 AbstractRange.prototype.eq = goog.abstractMethod;

/**
 * @param {AbstractRange} other
 * @return {boolean}
 */
AbstractRange.prototype.lt = function(other) {
	return Math.min(this.begin, this.end) < Math.min(other.begin, other.end);
};

/**
 * @param {AbstractRange} other
 * @return {boolean}
 */
AbstractRange.prototype.ne = function(other) {
	return !this.eq(other);
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * Adjusts the begin and end values by adding delta to them.
 *
 * @param {number} delta
 */
AbstractRange.prototype.adjust = function(delta) {
	this.begin += delta;
	this.end += delta;
};

/**
 * @param {number} value
 * @return {boolean}
 */
AbstractRange.prototype.contains = function(value) {
	if (this.isNormal())
		return value >= this.begin && value <= this.end;

	// Non-normal
	return value >= this.end && value <= this.begin;
};

/**
 * @param {AbstractRange} other
 * @return {boolean}
 */
AbstractRange.prototype.containsRange = function(other) {
	return this.contains(other.begin) &&
		   this.contains(other.end);
};

/**
 * Returns an array of 0 to 2 range objects representing the remainder of this range after subtracting other.
 *
 * @param {AbstractRange} other
 * @return {Array}
 */
AbstractRange.prototype.difference = goog.abstractMethod;

/**
 * If there is an intersection, always returns a normalized range.
 *
 * @param {AbstractRange} other
 * @return {AbstractRange}
 */
AbstractRange.prototype.intersection = function(other) {
    var r1 = this.isNormal() ? this : this.normalized();
    var r2 = other.isNormal() ? other : other.normalized();
	var maxBegin = Math.max(r1.begin, r2.begin);
	var minEnd = Math.min(r1.end, r2.end);
	if (maxBegin <= minEnd) {
		var result = other.clone();
		result.begin = maxBegin;
		result.end = minEnd;
		return result;
	}

	return null;
};

/**
 * @param {AbstractRange} other
 * @return {boolean}
 */
AbstractRange.prototype.intersects = function(other) {
    var r1 = this.isNormal() ? this : this.normalized();
    var r2 = other.isNormal() ? other : other.normalized();

    return Math.max(r1.begin, r2.begin) <= Math.min(r1.end, r2.end);
};

/** @return {boolean} */
AbstractRange.prototype.isDefault = function() {
	return this.begin === 0 &&
		this.end === 0;
};

AbstractRange.prototype.invert = function() {
	var tmp = this.begin;
	this.begin = this.end;
	this.end = tmp;
};

/** @return {boolean} */
AbstractRange.prototype.isNormal = function() {
	return this.begin <= this.end;
};

/**
 * @return {number}
 */
AbstractRange.prototype.length = function() {
	return this.end - this.begin;
};

/**
 * Moves the begin to newBegin without changing the length.
 *
 * @param {number} newBegin
 */
AbstractRange.prototype.moveBegin = function(newBegin) {
	var delta = newBegin - this.begin;
	this.adjust(delta);
};

/**
 * Moves the end to newEnd without changing the length.
 *
 * @param {number} newEnd
 */
AbstractRange.prototype.moveEnd = function(newEnd) {
	var delta = newEnd - this.end;
	this.adjust(delta);
};

/** @return {AbstractRange} */
AbstractRange.prototype.normalized = function() {
	var result = this.clone();
	result.begin = Math.min(this.begin, this.end);
	result.end = Math.max(this.begin, this.end);
	return result;
};

/**
 * Sets the length to newLength and moving the end value as necessary; however, the begin value will not be affected.
 *
 * @param {number} newLength
 */
AbstractRange.prototype.setLength = function(newLength) {
	assert(goog.isNumber(newLength));
	this.end = this.begin + newLength;
};


/*******************************************************************************************************************/});
