/**
 * @fileoverview RangeSet encapsulates a non-overlapping set of ClosedIntRange's that may be
 *   manipulated using standard set operations.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.core.RangeSet');

goog.require('goog.asserts');

goog.require('ag.core.ClosedIntRange');
goog.require('ag.core.RangeReducer');

// --------------------------------------------------------------------------------------------------------------------
/**
 * Constructs a new linear range set from optRanges, which are reduced to a non-overlapping, but equivalent
 * representation.
 *
 * @param {ag.core.ClosedIntRangeArray|ag.core.ClosedIntRange} [optRanges]
 * @constructor
 */
ag.core.RangeSet = function(optRanges) {
	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.core.ClosedIntRangeArray}
	 * @private
	 */
	this.ranges_ = [];

	// --------------------------------------------------------------------------------------------------------------------
	// Initialization
	if (goog.isDefAndNotNull(optRanges)) {
		if (goog.isArray(optRanges))
			this.ranges_ = ag.core.RangeReducer.getInstance().reduce(optRanges);
		else if (optRanges instanceof ag.core.ClosedIntRange)
			this.ranges_.push(optRanges);
		else if (goog.DEBUG)
			throw Error("Called RangeSet with non-null, invalid optRanges argument");
	}
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;

var ClosedIntRange = ag.core.ClosedIntRange;
var ClosedIntRangeArray = ag.core.ClosedIntRangeArray;
var RangeSet = ag.core.RangeSet;

var rangeReducer = ag.core.RangeReducer.getInstance;

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * Shifts the entire RangeSet delta units.
 *
 * @param {number} delta
 */
RangeSet.prototype.adjust = function(delta) {
	assert(goog.isNumber(delta));
	for (var i=0, z=this.ranges_.length; i<z; i++)
		this.ranges_[i].adjust(delta);
};

/**
 * Returns the smallest range that fully encloses the space represented by this set or null if the set is empty.
 *
 * @return {ClosedIntRange}
 */
RangeSet.prototype.boundingRange = function() {
	if (this.isEmpty())
		return null;

	var result = new ClosedIntRange();
	for (var i=0, z=this.ranges_.length; i<z; i++) {
		var range = this.ranges_[i];
		if (range.begin < result.begin)
			result.begin = range.begin;
		if (range.end > result.end)
			result.end = range.end;
	}
	return result;
};


/**
 * Removes all ranges from the set.
 */
RangeSet.prototype.clear = function() {
	array.clear(this.ranges_);
};

/** @return {RangeSet} */
RangeSet.prototype.clone = function() {
	var result = new RangeSet();
	result.ranges_ = this.ranges_.clone();
	return result;
};

/**
 * @param {number} value
 * @return {boolean}
 */
RangeSet.prototype.contains = function(value) {
	var i = this.ranges_.length;
	while (i--)
		if (this.ranges_[i].contains(value))
			return true;

	return false;
};

/**
 * @param {ClosedIntRange} range
 * @return {boolean}
 */
RangeSet.prototype.containsRange = function(range) {
	return this.containsSet(new RangeSet(range));
};

/**
 * @param {RangeSet} rangeSet
 * @return {boolean}
 */
RangeSet.prototype.containsSet = function(rangeSet) {
	return rangeSet.difference(this).isEmpty();
};

/**
 * Computes the set difference of this set with other. The space of other is subtracted from this set and returned.
 *
 * @param {RangeSet|ClosedIntRange|ClosedIntRangeArray} other
 * @return {RangeSet}
 */
RangeSet.prototype.difference = function(other) {
	var ranges = [];
	var otherRanges = RangeSet.rangesFromOther_(other);

	for (var i=0, z=this.ranges_.length; i<z; i++) {
		var thisRange = this.ranges_[i];
		var queryRanges = [thisRange];
		while (queryRanges.length > 0) {
			var queryRange = queryRanges.pop();
			var totalNoIntersection = true;
			for (var j=0, y=otherRanges.length; j<y; j++) {
				var otherRange = otherRanges[j];
				var diff = queryRange.difference(otherRange);
				var intersects = diff.length !== 1 || queryRange.ne(diff[0]);
				if (intersects) {
					totalNoIntersection = false;
					queryRanges = queryRanges.concat(diff);
					break;
				}
			}

			if (totalNoIntersection)
				ranges.push(queryRange);
				// ranges = ranges.concat(queryRange);
		}
	}

	return new RangeSet(ranges);
};

/**
 * Returns the intersection of this set with other.
 *
 * @param {RangeSet|ClosedIntRange|ClosedIntRangeArray} other
 * @return {RangeSet}
 */
RangeSet.prototype.intersection = function(other) {
	var ranges = [];
	var otherRanges = RangeSet.rangesFromOther_(other);
	for (var i=0, z=this.ranges_.length; i<z; i++) {
		var thisRange = this.ranges_[i];
		for (var j=0, y=otherRanges.length; j<y; j++) {
			var otherRange = otherRanges[j];
			var overlap = thisRange.intersection(otherRange);
			if (overlap)
				ranges.push(overlap);
		}
	}

	return new RangeSet(ranges);
};

/**
 * @param {RangeSet|ClosedIntRange|ClosedIntRangeArray} other
 * @return {boolean}
 */
RangeSet.prototype.intersects = function(other) {
	var otherRanges = RangeSet.rangesFromOther_(other);
	for (var i=0, z=this.ranges_.length; i<z; i++) {
		var thisRange = this.ranges_[i];
		for (var j=0, y=otherRanges.length; j<y; j++) {
			var otherRange = otherRanges[j];
			if (thisRange.intersects(otherRange))
				return true;
		}
	}

	return false;
};

/**
 * Removes the intersection of other and this set from set and adds the difference to this set.
 *
 * @param {RangeSet?} other
 * @return {RangeSet}
 */
RangeSet.prototype.inverse = function(other) {
	var copy = this.clone();
	copy.invert(other);
	return copy;
};

/**
 * Inverts (i.e. toggles) the space specified by other. In other words, the space intersecting other is removed from
 * this set and the non-intersecting space of other is added to this set. If other is null, then this entire set is inverted.
 *
 * @param {?RangeSet|ClosedIntRange|ClosedIntRangeArray} other
 */
RangeSet.prototype.invert = function(other) {
	if (!other) {
		other = new RangeSet();
		if (this.isEmpty())
			return other;
		other.ranges_.push(this.boundingRange());
	}
	else if (!(other instanceof RangeSet)) {
		other = new RangeSet(other);
	}

	var intersection = this.intersection(other);
	var nonIntersection = other.difference(intersection);
	this.subtract(intersection);
	this.merge(nonIntersection);
};

/** @return {boolean} */
RangeSet.prototype.isEmpty = function() {
	return this.ranges_.length === 0;
};

/**
 * Merges other into this set producing a unique set of non-overlapping ranges.
 *
 * @param {RangeSet|ClosedIntRange|ClosedIntRangeArray} other
 */
RangeSet.prototype.merge = function(other) {
	this.ranges_ = this.unionOfRanges_(other);
};

/** @return {ClosedIntRangeArray} */
RangeSet.prototype.ranges = function() {
	return this.ranges_;
};

/**
 * Subtracts other from this set.
 *
 * @param {RangeSet|ClosedIntRange|ClosedIntRangeArray} other
 */
RangeSet.prototype.subtract = function(other) {
	this.ranges_ = this.difference(other).ranges_;
};

/**
 * Returns the sum of all individual range lengths.
 *
 * @return {number}
 */
RangeSet.prototype.summedLength = function() {
	var sum = 0;
	for (var i=0, z=this.ranges_.length; i<z; i++) {
		var range = this.ranges_[i];
		sum += range.length();
	}
	return sum;
};

/**
 * Performs the union of other with this RangeSet. In other words, adds the unique parts of other
 * to this set.
 *
 * @param {RangeSet|ClosedIntRange|ClosedIntRangeArray} other
 * @return {RangeSet}
 */
RangeSet.prototype.union = function(other) {
	var combinedRanges = this.ranges_.concat(RangeSet.rangesFromOther_(other));
	return new RangeSet(combinedRanges);
};


// --------------------------------------------------------------------------------------------------------------------
// Private static methods
/**
 * @param {RangeSet|ClosedIntRange|ClosedIntRangeArray} other
 * @return {ClosedIntRangeArray}
 * @private
 */
RangeSet.rangesFromOther_ = function(other) {
	if (!other)
		return [];

	if (goog.isArray(other)) {
		assert(other.length === 0 || other[0] instanceof ClosedIntRange);
		return other;
	}

	assert(other instanceof ClosedIntRange || other instanceof RangeSet);
	return (other instanceof ClosedIntRange) ? [ other ] : other.ranges_;
};


// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * Only need to clone if the result other is equal to this, but result will be passed outside of this
 * class.
 *
 * @param {RangeSet|ClosedIntRange|ClosedIntRangeArray} other
 * @param {boolean} [optClone] defaults to false optionally clone the ranges if other === this
 * @return {ClosedIntRangeArray}
 * @private
 */
RangeSet.prototype.unionOfRanges_ = function(other, optClone) {
	if (other === this) {
		if (!goog.isDefAndNotNull(optClone))
			return this.ranges_;
		else
			return this.ranges_.clone();
	}

	var otherRanges_ = RangeSet.rangesFromOther_(other);
	var input = this.ranges_.concat(otherRanges_);
	return rangeReducer().reduce(input);
};


/*******************************************************************************************************************/});
