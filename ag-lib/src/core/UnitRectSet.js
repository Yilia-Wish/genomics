/**
 * @fileoverview UnitRectSet represents an arbitrarily rectilinear polygon using one or more UnitRects and
 *   exposes basic set operations and other useful manipulation methods.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.core.UnitRectSet');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.math');
goog.require('goog.math.Coordinate');

goog.require('ag');
goog.require('ag.core.ClosedIntRange');
goog.require('ag.core.RangeSet');
goog.require('ag.core.UnitRect');
goog.require('ag.core.UnitRectReducer');

// --------------------------------------------------------------------------------------------------------------------
/**
 * Constructs a new rectilinear set from optRects, which are reduced to a non-overlapping representation.
 *
 * @param {ag.core.UnitRect|ag.core.UnitRectArray} [optRects]
 * @constructor
 */
ag.core.UnitRectSet = function(optRects) {
	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.core.UnitRectArray}
	 * @private
	 */
	this.rects_ = [];

	// --------------------------------------------------------------------------------------------------------------------
	// Initialization
	if (goog.isDefAndNotNull(optRects)) {
		if (goog.isArray(optRects))
			this.rects_ = ag.core.UnitRectReducer.getInstance().reduce(optRects);
		else if (optRects instanceof ag.core.UnitRect)
			this.rects_.push(optRects.normalized());
			//                        ^^^^^^^^^^ Does two things: 1) Creates our own copy so that
			// we do not share changes with the client and 2) ensures that we always maintain a
			// a normalized set of rectangles internally to ease downstream calcs.
		else if (goog.DEBUG)
			throw Error("Called UnitRectSet with non-null, invalid optRects argument");
	}
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;
var isInt = goog.math.isInt;

var Coordinate = goog.math.Coordinate;

var ClosedIntRange = ag.core.ClosedIntRange;
var RangeSet = ag.core.RangeSet;
var UnitRect = ag.core.UnitRect;
var UnitRectArray = ag.core.UnitRectArray;
var UnitRectSet = ag.core.UnitRectSet;

var unitRectReducer = ag.core.UnitRectReducer.getInstance;


// --------------------------------------------------------------------------------------------------------------------
// Operators
/**
 * Unlike its constituents (array of UnitRect's), UnitRectSet is uniquely defined by the rectilinear area that it
 * covers. Therefore, two sets are considered unique if they exactly overlap the same area regardless of the actual
 * structure and number of rectangles.
 *
 * @param {UnitRectSet} other
 * @return {boolean}
 */
UnitRectSet.prototype.eq = function(other) {
	var thisArea = this.area();
	var otherArea = other.area();
	return thisArea === otherArea &&
		   this.intersection(other).area() === thisArea;
};


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {number} */
UnitRectSet.prototype.area = function() {
	var totalArea = 0;
	for (var i=0; i< this.rects_.length; i++)
		totalArea += this.rects_[i].area();
	return totalArea;
};

/**
 * Returns the smallest rectangle that fully encloses the space represented by this set or null if the set is empty.
 *
 * @return {UnitRect}
 */
UnitRectSet.prototype.boundingRect = function() {
	if (this.isEmpty())
		return null;

	var result = new UnitRect();
	for (var i=0, z=this.rects_.length; i<z; i++) {
		var rect = this.rects_[i];
		assert(rect.isNormal());
		if (rect.x1 < result.x1)
			result.x1 = rect.x1;
		if (rect.x2 > result.x2)
			result.x2 = rect.x2;
		if (rect.y1 < result.y1)
			result.y1 = rect.y1;
		if (rect.y2 > result.y2)
			result.y2 = rect.y2;
	}
	return result;
};

/**
 * Removes all rectangles from the set.
 */
UnitRectSet.prototype.clear = function() {
	array.clear(this.rects_);
};

/** @return {UnitRectSet} */
UnitRectSet.prototype.clone = function() {
	var result = new UnitRectSet();
	result.rects_ = this.rects_.clone();
	return result;
};

/**
 * @param {number} x
 * @param {number} y
 * @return {boolean}
 */
UnitRectSet.prototype.contains = function(x, y) {
	for (var i=0, z=this.rects_.length; i<z; i++)
		if (this.rects_[i].contains(x, y))
			return true;

	return false;
};

/**
 * @param {Coordinate} coordinate
 * @return {boolean}
 */
UnitRectSet.prototype.containsCoordinate = function(coordinate) {
	return this.contains(coordinate.x, coordinate.y);
};

/**
 * @param {UnitRectSet} unitRectSet
 * @return {boolean}
 */
UnitRectSet.prototype.containsSet = function(unitRectSet) {
	return unitRectSet.difference(this).isEmpty();
};

/**
 * @param {UnitRect} unitRect
 * @return {boolean}
 */
UnitRectSet.prototype.containsUnitRect = function(unitRect) {
	return this.containsSet(new UnitRectSet(unitRect));
};

/**
 * Computes the set difference of this set with other. The area of other is subtracted from this set and returned.
 *
 * @param {UnitRectSet|UnitRect} other
 * @return {UnitRectSet}
 */
UnitRectSet.prototype.difference = function(other) {
	var rects_ = [];
	var otherRects = UnitRectSet.rectsFromOther_(other);

	for (var i=0, z=this.rects_.length; i<z; i++) {
		var thisRect = this.rects_[i];

		var queryRects = [thisRect];
		while (queryRects.length > 0) {
			var queryRect = queryRects.pop();
			var totalNoIntersection = true;
			for (var j=0, y=otherRects.length; j<y; j++) {
				var otherRect = otherRects[j];
				var diff = queryRect.difference(otherRect);
				var intersects = diff.length !== 1 || queryRect.ne(diff[0]);
				if (intersects) {
					totalNoIntersection = false;
					queryRects = queryRects.concat(diff);
					break;
				}
			}

			if (totalNoIntersection)
				rects_ = rects_.concat(queryRect);
		}
	}

	return new UnitRectSet(rects_);
};

/**
 * Returns a RangeSet that uniquely defines the horizontal ranges that intersect this set at position y on the
 * vertical axis. If optY is not defined, simply returns the unique horizontal ranges of the entire set.
 *
 * @param {number} [optY]
 * @return {RangeSet}
 */
UnitRectSet.prototype.horizontalRanges = function(optY) {
	var ranges = [];
	var y = goog.isNumber(optY) ? optY : null;
	for (var i=0, z=this.rects_.length; i<z; i++) {
		var thisRect = this.rects_[i];
		if (goog.isNull(y) || thisRect.intersectsY(y))
			ranges.push(thisRect.horizontalRange());
	}
	return new RangeSet(ranges);
};

/**
 * Inserts count columns before startColumn adjusting and splitting existing portions of the set as needed. The word
 * spacing is used to indicate that this does not add anything to the set, but rather changes the spacing of any
 * existing portions. Does nothing if the set is empty.
 *
 * @param {number} startColumn
 * @param {number} [optCount] the number of spacer columns to insert into the set.
 */
UnitRectSet.prototype.insertColumnSpacing = function(startColumn, optCount) {
	assert(isInt(startColumn));
	var count = goog.isNumber(optCount) ? optCount : 1;
	assert(isInt(count));
	assert(count >= 0);
	if (count === 0)
		return;

	for (var i=0, z=this.rects_.length; i<z; i++) {
		var thisRect = this.rects_[i];

		// It is safe to assume that all member rects_ are normalized because they all get reduced.
		assert(thisRect.isNormal());
		if (startColumn <= thisRect.x1) {
			thisRect.shift(count, 0);
			continue;
		}

		if (startColumn <= thisRect.x2) {
			var newRect = thisRect.clone();

			// Need to split this rectangle
			thisRect.x2 = startColumn - 1;

			newRect.x1 = startColumn + count;
			newRect.x2 += count;
			this.rects_.push(newRect);
		}
	}
};

/**
 * Inserts count at optRow adjusting and splitting existing portions of the set as needed.  The word spacer
 * is used to indicate that this does not add anything to the set, but rather changes the spacing of any existing
 * portions. Does nothing if the set is empty.
 *
 * @param {number} startRow the row to insert before
 * @param {number=} optCount optional number of rows to insert; defaults to 1
 */
UnitRectSet.prototype.insertRowSpacing = function(startRow, optCount) {
	assert(isInt(startRow));
	var count = goog.isNumber(optCount) ? optCount : 1;
	assert(isInt(count));
	assert(count >= 0);
	if (count === 0)
		return;

	for (var i=0, z=this.rects_.length; i<z; i++) {
		var thisRect = this.rects_[i];

		// It is safe to assume that all member rects_ are normalized because they all get reduced.
		assert(thisRect.isNormal());
		if (startRow <= thisRect.y1) {
			thisRect.shift(0, count);
			continue;
		}

		if (startRow <= thisRect.y2) {
			var newRect = thisRect.clone();

			// Need to split this rectangle
			thisRect.y2 = startRow - 1;

			newRect.y1 = startRow + count;
			newRect.y2 += count;
			this.rects_.push(newRect);
		}
	}
};

/**
 * Returns the intersection of this set with other.
 *
 * @param {UnitRectSet|UnitRect|UnitRectArray} other
 * @return {UnitRectSet}
 */
UnitRectSet.prototype.intersection = function(other) {
	var rects_ = [];
	var otherRects = UnitRectSet.rectsFromOther_(other);
	for (var i=0, z=this.rects_.length; i<z; i++) {
		var thisRect = this.rects_[i];
		for (var j=0, y=otherRects.length; j<y; j++) {
			var otherRect = otherRects[j];
			var overlap = thisRect.intersection(otherRect);
			if (overlap)
				rects_.push(overlap);
		}
	}

	return new UnitRectSet(rects_);
};

/**
 * @param {UnitRectSet|UnitRect|UnitRectArray} other
 * @return {boolean}
 */
UnitRectSet.prototype.intersects = function(other) {
	var otherRects = UnitRectSet.rectsFromOther_(other);
	for (var i=0, z=this.rects_.length; i<z; i++) {
		var thisRect = this.rects_[i];
		for (var j=0, y=otherRects.length; j<y; j++) {
			var otherRect = otherRects[j];
			if (thisRect.intersects(otherRect))
				return true;
		}
	}

	return false;
};

/**
 * Removes the intersection of other and this set from set and adds the difference to this set.
 *
 * @param {UnitRectSet?} other
 * @return {UnitRectSet}
 */
UnitRectSet.prototype.inverse = function(other) {
	var copy = this.clone();
	copy.invert(other);
	return copy;
};

/**
 * Inverts (i.e. toggles) the area specified by other. In other words, the area intersecting other is removed from
 * this set and the non-intersecting area of other is added to this set. If other is null, then the entire area of
 * this set is inverted.
 *
 * @param {?UnitRectSet|UnitRect|UnitRectArray} other
 */
UnitRectSet.prototype.invert = function(other) {
	if (!other) {
		other = new UnitRectSet();
		if (this.isEmpty())
			return other;
		other.rects_.push(this.boundingRect());
	}
	else if (!(other instanceof UnitRectSet)) {
		other = new UnitRectSet(other);
	}

	var intersection = this.intersection(other);
	var nonIntersection = other.difference(intersection);
	this.subtract(intersection);
	this.merge(nonIntersection);
};

/** @return {boolean} */
UnitRectSet.prototype.isEmpty = function() {
	return this.rects_.length === 0;
};

/**
 * Merges other into this set producing a unique set of non-overlapping rectangles.
 *
 * @param {UnitRectSet|UnitRect|UnitRectArray} other
 */
UnitRectSet.prototype.merge = function(other) {
	this.rects_ = this.unionOfRects_(other);
};

/**
 * UNTESTED
 *
 * @param {number} startRow
 * @param {number} endRow
 * @param {number} destRow
 */
UnitRectSet.prototype.moveRows = function(startRow, endRow, destRow) {
	assert(startRow <= endRow);
	var boundRect = this.boundingRect();
	if (!boundRect)
		return;

	var count = endRow - startRow + 1;
	var rowBoundedRect = new UnitRect(boundRect.left(), startRow, boundRect.width(), count);
	var overlap = this.intersection(rowBoundedRect);
	this.removeRows(startRow, count);
	this.insertRowSpacing(destRow, count);
	var deltaRowShift = destRow - startRow;
	overlap.shift(0, deltaRowShift);
	this.merge(overlap);
};

/**
 * Shifts the entire UnitRectSet deltaX units along the horizontal axis and deltaY units along the vertical axis.
 *
 * @param {number} deltaX
 * @param {number} deltaY
 */
UnitRectSet.prototype.shift = function(deltaX, deltaY) {
	assert(goog.isNumber(deltaX));
	assert(goog.isNumber(deltaY));
	for (var i=0, z=this.rects_.length; i<z; i++) {
		var thisRect = this.rects_[i];
		thisRect.x1 += deltaX;
		thisRect.x2 += deltaX;

		thisRect.y1 += deltaY;
		thisRect.y2 += deltaY;
	}
};

/**
 * Attempts to reduce the total number of rectangles by searching for an equivalent representation that
 * occupies the exact same area as the current set. Assumes that there are no overlapping rectangles in
 * the current set.
 *
 * Specifically, walks through all ranges and replaces any adjacent pair of rectangles that has two
 * colinear sides with a single larger, equivalent rectangle. For example:
 *
 * +---++---+         +--------+
 * |   ||   |   -->   |        |
 * |   ||   |         |        |
 * +---++---+         +--------+
 *
 * Such inefficient representations often occur from the UnitRectReducer output.
 */
UnitRectSet.prototype.optimize = function() {
	for (var i=0, z=this.rects_.length; i<z; i++) {
		var rect1 = this.rects_[i];
		if (!rect1)
			continue;

		for (var j=i+1; j<z; j++) {
			var rect2 = this.rects_[j];
			if (!rect2)
				continue;

			// Simply test if rect2 has two colinear and adjacent sides to rect1. If so, extend rect1
			// to include rect2 and null rect2
			var removeRect2 = false;
			if (rect2.left() === rect1.left() && rect2.right() === rect1.right()) {
				// Case 1: rect2 just above rect1
				//
				// +---+  --> +---+
				// | 2 |      | 1 |
				// +---+      |   |
				// +---+      |   |
				// | 1 |      |   |
				// +---+      +---+
				//
				if (rect2.bottom() + 1 === rect1.top()) {
					rect1.y1 = rect2.top();
					removeRect2 = true;
				}

				// Case 2: rect2 just below rect1
				//
				// +---+  --> +---+
				// | 1 |      | 1 |
				// +---+      |   |
				// +---+      |   |
				// | 2 |      |   |
				// +---+      +---+
				//
				else if (rect2.top() - 1 === rect1.bottom()) {
					rect1.y2 = rect2.bottom();
					removeRect2 = true;
				}
			}
			else if (rect2.top() === rect1.top() && rect2.bottom() === rect1.bottom()) {
				// Case 3: rect2 just left of rect1
				//
			 	// +---++---+         +--------+
			 	// | 2 || 1 |   -->   | 1      |
			 	// |   ||   |         |        |
			 	// +---++---+         +--------+
				if (rect2.right() + 1 === rect1.left()) {
					rect1.x1 = rect2.left();
					removeRect2 = true;
				}

				// Case 4: rect2 just right of rect1
				//
			 	// +---++---+         +--------+
			 	// | 1 || 2 |   -->   | 1      |
			 	// |   ||   |         |        |
			 	// +---++---+         +--------+
				else if (rect2.left() - 1 === rect1.right()) {
					rect1.x2 = rect2.right();
					removeRect2 = true;
				}
			}

			if (removeRect2)
				this.rects_[j] = null;
		}
	}

	for (var i=this.rects_.length - 1; i >= 0; i--)
		if (!this.rects_[i])
			array.splice(this.rects_, i, 1);
};

/** @return {UnitRectArray} */
UnitRectSet.prototype.rectangles = function() {
	return this.rects_;
};

/**
 * Removes all space occupied by startColumn .. startColumn + optCount - 1 from any existing UnitRect's in the set. This
 * may result in an empty set.
 *
 * @param {number} startColumn
 * @param {number=} optCount number to remove; defaults to 1
 */
UnitRectSet.prototype.removeColumns = function(startColumn, optCount) {
	var count = goog.isNumber(optCount) ? optCount : 1;
	assert(count >= 0);
	assert(isInt(count));
	if (count === 0)
		return;

	var endColumn = startColumn + count - 1;
	var columnRange = new ClosedIntRange(startColumn, endColumn);
	var toRemove = [];
	for (var i=0, z=this.rects_.length; i<z; i++) {
		var thisRect = this.rects_[i];

		// It is safe to assume that all member rects_ are normalized because they all get reduced.
		assert(thisRect.isNormal());

		if (startColumn > thisRect.x2)
			continue;

		var w = thisRect.width();
		var intersection = thisRect.horizontalRange().intersection(columnRange);
		var overlap = intersection ? intersection.length() : 0;
		if (overlap === w) {
			toRemove.push(i);
			continue;
		}

		var lengthBeyondBottom = Math.max(0, endColumn - thisRect.x2);
		thisRect.x1 += (overlap - (count - lengthBeyondBottom));
		thisRect.x2 = thisRect.x1 + w - overlap - 1;
	}

	for (var i=toRemove.length - 1; i>=0; i--)
		array.removeAt(this.rects_, toRemove[i]);
};

/**
 * Removes all space occupied by startRow .. startRow + optCount - 1 from any existing UnitRect's in the set. This
 * may result in an empty set.
 *
 * @param {number} startRow
 * @param {number=} optCount number to remove; defaults to 1
 */
UnitRectSet.prototype.removeRows = function(startRow, optCount) {
	var count = goog.isNumber(optCount) ? optCount : 1;
	assert(count >= 0);
	assert(isInt(count));
	if (count === 0)
		return;

	var endRow = startRow + count - 1;
	var rowRange = new ClosedIntRange(startRow, endRow);
	var toRemove = [];
	for (var i=0, z=this.rects_.length; i<z; i++) {
		var thisRect = this.rects_[i];

		// It is safe to assume that all member rects_ are normalized because they all get reduced.
		assert(thisRect.isNormal());

		if (startRow > thisRect.y2)
			continue;

		var h = thisRect.height();
		var intersection = thisRect.verticalRange().intersection(rowRange);
		var overlap = intersection ? intersection.length() : 0;
		if (overlap === h) {
			toRemove.push(i);
			continue;
		}

		var lengthBeyondBottom = Math.max(0, endRow - thisRect.y2);
		thisRect.y1 += (overlap - (count - lengthBeyondBottom));
		thisRect.y2 = thisRect.y1 + h - overlap - 1;
	}

	for (var i=toRemove.length - 1; i>=0; i--)
		array.removeAt(this.rects_, toRemove[i]);
};

/**
 * Subtracts other from this set.
 *
 * @param {UnitRectSet|UnitRect} other
 */
UnitRectSet.prototype.subtract = function(other) {
	this.rects_ = this.difference(other).rects_;
};

/**
 * Performs the union of other with this UnitRectSet. In other words, adds the unique parts of other
 * to this set.
 *
 * @param {UnitRectSet|UnitRect|UnitRectArray} other
 * @return {UnitRectSet}
 */
UnitRectSet.prototype.union = function(other) {
	var combinedRects = this.rects_.concat(UnitRectSet.rectsFromOther_(other));
	return new UnitRectSet(combinedRects);
};

/**
 * Returns a RangeSet that uniquely defines the vertical ranges that intersect this set at position x on the
 * horizontal axis. If optX is not defined, simply returns the unique vertical ranges of the entire set.
 *
 * @param {number} [optX]
 * @return {RangeSet}
 */
UnitRectSet.prototype.verticalRanges = function(optX) {
	var ranges = [];
	var x = goog.isNumber(optX) ? optX : null;
	for (var i=0, z=this.rects_.length; i<z; i++) {
		var thisRect = this.rects_[i];
		if (goog.isNull(x) || thisRect.intersectsX(x))
			ranges.push(thisRect.verticalRange());
	}
	return new RangeSet(ranges);
};



// --------------------------------------------------------------------------------------------------------------------
// Private static methods
/**
 * @param {UnitRectSet|UnitRect|UnitRectArray} other
 * @return {UnitRectArray}
 * @private
 */
UnitRectSet.rectsFromOther_ = function(other) {
	if (!other)
		return [];

	if (goog.isArray(other)) {
		assert(other.length === 0 || other[0] instanceof UnitRect);
		return other;
	}

	assert(other instanceof UnitRect || other instanceof UnitRectSet);
	return (other instanceof UnitRect) ? [ other ] : other.rects_;
};


// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * Only need to clone if the result other is equal to this, but result will be passed outside of this
 * class.
 *
 * @param {UnitRectSet|UnitRect|UnitRectArray} other
 * @param {boolean} [optClone] defaults to false optionally clone the rects_ if other === this
 * @return {UnitRectArray}
 * @private
 */
UnitRectSet.prototype.unionOfRects_ = function(other, optClone) {
	if (other === this) {
		if (!goog.isDefAndNotNull(optClone))
			return this.rects_;
		else
			return this.rects_.clone();
	}

	var otherRects_ = UnitRectSet.rectsFromOther_(other);
	var input = this.rects_.concat(otherRects_);
	return unitRectReducer().reduce(input);
};

/*******************************************************************************************************************/});
