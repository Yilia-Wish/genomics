/**
 * @fileoverview UnitRectReducer is a singleton utility class for reducing an array of potentially
 *   overlapping UnitRect's and returning a new array of non-overlapping rectangles.
 *
 *   Utilizes a vertical line sweep algorithm to efficiently analyze all open and closed rectangles.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.core.UnitRectReducer');

goog.require('goog.array');
goog.require('goog.asserts');

goog.require('ag');
goog.require('ag.core.ClosedIntRange')
goog.require('ag.core.UnitRect');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 */
ag.core.UnitRectReducer = function() {
	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.core.UnitRectArray}
	 * @private
	 */
	var current_ = null;

	/**
	 * @type {ag.core.UnitRectArray}
	 * @private
	 */
	var output_ = null;
};
goog.addSingletonGetter(ag.core.UnitRectReducer);

/**
 * Private, helper version class that extends ClosedIntRange by having it carry an additional variable -
 * terminus, which corresponds to the right terminus of a rectangle under consideration
 *
 * @param {number=} optBegin defaults to 0
 * @param {number=} optEnd defaults to optBegin
 * @param {number=} optTerminus defaults to null
 * @extends {ag.core.ClosedIntRange}
 * @constructor
 */
ag.core.UnitRectReducer.ClosedIntRangePrivate = function(optBegin, optEnd, optTerminus) {
	goog.base(this, optBegin, optEnd);

	/**
	 * @type {number|undefined}
	 */
	this.terminus = goog.isNumber(optTerminus) ? optTerminus : undefined;
};
goog.inherits(ag.core.UnitRectReducer.ClosedIntRangePrivate, ag.core.ClosedIntRange);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;

var ClosedIntRange = ag.core.ClosedIntRange;
var ClosedIntRangePrivate = ag.core.UnitRectReducer.ClosedIntRangePrivate;
var UnitRect = ag.core.UnitRect;
var UnitRectArray = ag.core.UnitRectArray;
var UnitRectReducer = ag.core.UnitRectReducer;


// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * Works with normal or non-normal rectangles, but always returns an array of normalized rectangles.
 *
 * @param {UnitRectArray} rects
 * @return {UnitRectArray}
 */
UnitRectReducer.prototype.reduce = function(rects) {
	var normRects = array.map(rects, function(rect) {
		return rect.isNormal() ? rect : rect.normalized()
	});

	this.setupLineSweep_();
	var openCloseEvents = UnitRectReducer.extractOpenCloseData_(normRects);
	UnitRectReducer.sortOpenCloseEventsByXposAndType_(openCloseEvents);
	for (var i=0, z=openCloseEvents.length; i<z; i++) {
		var openCloseEvent = openCloseEvents[i];
		if (openCloseEvent.type === 'open')
			this.handleOpenRect_(openCloseEvent.rect)
		else
			this.handleCloseRect_(openCloseEvent.rect);
	}
	var result = this.output_;
	this.teardownLineSweep_();
	return result;
};

// --------------------------------------------------------------------------------------------------------------------
// Private static methods
/**
 * Creates an array of open/close "events" where each element corresponds to either a rectangle opening
 * or a rectangle closing.
 *
 * @param {UnitRectArray} rects
 * @return {Array.<Object>}
 * @private
 */
UnitRectReducer.extractOpenCloseData_ = function(rects) {
	var openCloseData = [];
	for (var i=0, z=rects.length; i<z; i++) {
		openCloseData.push({
			type: 'open',
			xPos: rects[i].left(),		// Unnecessary, since we could simply refer use the rect itself
			rect: rects[i]
		});
		openCloseData.push({
			type: 'close',
			xPos: rects[i].right(),
			rect: rects[i]
		});
	}
	return openCloseData;
};

/**
 * Takes an array of potentially overlapping y ranges with varying terminii and produces a non-overlapping
 * set that covers an identical area.
 *
 * @param {Array.<ClosedIntRangePrivate>} yRanges
 * @return {Array.<ClosedIntRangePrivate>}
 */
UnitRectReducer.mergeOverlappingYRanges_ = function(yRanges) {
	if (yRanges.length === 0)
		return [];

	UnitRectReducer.sortYRangesByBeginAndTerminus_(yRanges);

	var uniqueYRanges = [yRanges[0]];
	for (var i=1, z=yRanges.length; i<z; i++) {
		var yRange = yRanges[i];
		var lastUniqueYRange = uniqueYRanges.last();
		if (yRange.eq(lastUniqueYRange))
			continue;

		var overlap = Math.max(0, Math.min(lastUniqueYRange.end, yRange.end) - yRange.begin + 1);
		if (overlap === 0) {
			uniqueYRanges.push(yRange);
			continue;
		}

		if (yRange.terminus === lastUniqueYRange.terminus) {
			if (yRange.end > lastUniqueYRange.end)
				lastUniqueYRange.end = yRange.end;
			continue;
		}

		var lastHasFurtherX = lastUniqueYRange.terminus > yRange.terminus;
		if (lastHasFurtherX) {
			// Overlap goes to last valid; i.e. lastUniqueYRange does not change. To accommodate this,
			// we make a new range if necessary = there is an unaccounted hanging portion on the bottom.
			var uniqueBottomAmount = yRange.length() - overlap;
			if (uniqueBottomAmount)
				uniqueYRanges.push(new ClosedIntRangePrivate(yRange.begin + overlap, yRange.end, yRange.terminus));
		}
		else {
			// Overlap goes to the current y range
			var uniqueTopAmount = lastUniqueYRange.length() - overlap;
			if (uniqueTopAmount > 0) {
				lastUniqueYRange.end = yRange.begin - 1;
				uniqueYRanges.push(yRange);
			}
			else {
				// Cannot think of scenario that would lead to this case ever occurring.
				assert(0);
				lastUniqueYRange.end = yRange.end;
				lastUniqueYRange.terminus = yRange.terminus;
			}
		}
	}
	return uniqueYRanges;
};

/**
 * @param {number} y1
 * @param {number} y2
 * @param {UnitRect} rect
 * @return {boolean}
 * @private
 */
UnitRectReducer.rectFullyContainsYRange_ = function(rect, y1, y2) {
	assert(rect.isNormal());
	assert(y1 <= y2);
	return y1 >= rect.y1 && y2 <= rect.y2;
};

/**
 * Removes all empty arrays from the given array.
 *
 * @param {Array} arr
 * @private
 */
UnitRectReducer.removeNullElements_ = function(arr) {
	for (var i=arr.length-1; i>=0; i--)
		if (goog.isNull(arr[i]))
			array.removeAt(arr, i);
};

/**
 * Sorts by xPos first and then type
 *
 * @param {Array.<Object>} openCloseEvents
 * @private
 */
UnitRectReducer.sortOpenCloseEventsByXposAndType_ = function(openCloseEvents) {
	array.sort(openCloseEvents, function(leftOpenCloseEvent, rightOpenCloseEvent) {
		if (leftOpenCloseEvent.xPos < rightOpenCloseEvent.xPos)
			return -1;
		else if (leftOpenCloseEvent.xPos > rightOpenCloseEvent.xPos)
			return 1;
		else if (leftOpenCloseEvent.type === 'open' && rightOpenCloseEvent.type === 'close')
			return -1;
		else if (leftOpenCloseEvent.type === 'close' && rightOpenCloseEvent.type === 'open')
			return 1;

		return 0;
	});
};

/**
 * @param {Array.<ClosedIntRangePrivate>} yRanges
 * @private
 */
UnitRectReducer.sortYRangesByBeginAndTerminus_ = function(yRanges) {
	array.sort(yRanges, function(leftRange, rightRange) {
		if (leftRange.begin < rightRange.begin)
			return -1;
		else if (leftRange.begin > rightRange.begin)
			return 1;
		// Equal begin positions, sort next by decreasing terminus
		else if (leftRange.terminus < rightRange.terminus)
			return 1;
		else if (leftRange.terminus > rightRange.terminus)
			return -1;

		// Have both equal begin positions and terminus - they are equivalent as far as this sort is
		// concerned.
		return 0;
	});
};

/**
 * Given an array of
 *
 * @param {UnitRectArray} rects
 * @param {number} xPos
 * @param {Array.<ClosedIntRangePrivate>} yRanges
 */
UnitRectReducer.removeOverlappingRectYFromYRanges_ = function(rects, xPos, yRanges) {
	for (var i=0, z=rects.length; i<z; i++) {
		var rect = rects[i];

		// Skip all rectangles that do not fall within the x range
		var rectDoesNotContainXPos = xPos < rect.x1 || xPos > rect.x2;
		if (rectDoesNotContainXPos)
			continue;

		for (var j=0, y=yRanges.length; j< y; j++) {
			var yRange = yRanges[j];
			if (!yRange)
				continue;

			var y1 = yRange.begin;
			var y2 = yRange.end;

			var yRangeOutsideRect = y2 < rect.y1 || y1 > rect.y2;
			if (yRangeOutsideRect)
				// Keep this segment (for this loop iteration).
				continue;

			if (UnitRectReducer.rectFullyContainsYRange_(rect, y1, y2)) {
				// A rectangle within rects fully contains this yRange segment, remove all references to its data.
				// It will be removed at the end of this method.
				yRanges[j] = null;
				continue;
			}

			// Option 1: yRange begins above rectangle and ends within rectangle
			//        | * Keep this part and remove the overlap.
			//        | *
			//  +--+  |   < Remove the overlap.
			//  |  |
			//  +--+
			if (y1 < rect.y1 && y2 <= rect.y2) {
				yRange.end = rect.y1 - 1;
			}
			// Option 2: yRange starts within rectangle and ends below rectangle
			//  +--+
			//  |  |  |   < Remove the overlap.
			//  +--+  |   <
			//        | *
			//        | * Keep this part and remove the overlap.
			else if (y1 >= rect.y1 && y2 > rect.y2) {
				yRange.begin = rect.y2 + 1;
			}
			// Option 3: yRange fully contains the rectangle
			//        | * Keep this part
			//        | *
			//  +--+  |   < Remove the overlap.
			//  |  |  |   <
			//  +--+  |   <
			//        | * Create a new range for this part
			else { // if (y1 < rect.y1 && y2 > rect.y2)
				yRange.end = rect.y1 - 1;
				var newYRange = yRange.clone();
				newYRange.begin = rect.y2 + 1;
				newYRange.end = y2;
				yRanges.push(newYRange);
			}
		}
	}

	UnitRectReducer.removeNullElements_(yRanges);
};



// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @param {Array.<ClosedIntRangePrivate>} yRanges
 * @param {number} closingRectRight
 * @private
 */
UnitRectReducer.prototype.createNewOutputRectsFromRanges_ = function(yRanges, closingRectRight) {
	var output = this.output_;
	for (var i=0, z=yRanges.length; i<z; i++) {
		var yRange = yRanges[i];
		var w = yRange.terminus - closingRectRight;
		var h = yRange.length();
		output.push(new UnitRect(closingRectRight + 1, yRange.begin, w, h));
	}
};

/**
 * @param {UnitRect} rect
 * @private
 */
UnitRectReducer.prototype.handleOpenRect_ = function(rect) {
	assert(rect.top() <= rect.bottom());
	this.current_.push(rect);

	var output = this.output_;
	var yRanges = [ new ClosedIntRange(rect.top(), rect.bottom()) ];
	UnitRectReducer.removeOverlappingRectYFromYRanges_(output, rect.left(), yRanges);

	for (var i=0, z= yRanges.length; i<z; i++) {
		var newRect = rect.clone();
		var yRange = yRanges[i];
		newRect.y1 = yRange.begin;
		newRect.y2 = yRange.end;
		output.push(newRect);
	}
};

/**
 * @param {UnitRect} rect
 * @private
 */
UnitRectReducer.prototype.handleCloseRect_ = function(rect) {
	assert(rect.top() <= rect.bottom());
	array.remove(this.current_, rect);

	var x = rect.right();
	var yRanges = this.yIntersectionsWithCurrentRectangles_(x, rect.top(), rect.bottom());
	if (yRanges.length === 0)
		return;

	var uniqueYRanges = UnitRectReducer.mergeOverlappingYRanges_(yRanges);
	UnitRectReducer.removeOverlappingRectYFromYRanges_(this.output_, x + 1, uniqueYRanges);
	this.createNewOutputRectsFromRanges_(uniqueYRanges, x);
};

/**
 * @private
 */
UnitRectReducer.prototype.setupLineSweep_ = function() {
	this.current_ = [];
	this.output_ = [];
};

/**
 * @private
 */
UnitRectReducer.prototype.teardownLineSweep_ = function() {
	this.current_ = null;
	this.output_ = null;
};

/**
 * Returns an array of y ranges that corresponds to all segments between y1 and y2 that overlap with any
 * of the current rectangles y range. Additionally, all rectangles must contain and horizontally extend
 * beyond x.
 *
 * @param {number} x
 * @param {number} y1
 * @param {number} y2
 * @return {Array.<ClosedIntRangePrivate>}
 */
UnitRectReducer.prototype.yIntersectionsWithCurrentRectangles_ = function(x, y1, y2) {
	var current = this.current_;
	var result = [];
	for (var i=0, z=current.length; i<z; i++) {
		var currentRect = current[i];
		if (x < currentRect.x1 || x >= currentRect.x2)
			//                      ^^ By using >= we ensure that all ranges considered are
			//                         from rectangles that extend rightward of x.
			continue;

		if (y1 <= currentRect.y2 && y2 >= currentRect.y1) {
			var y1Intersect = Math.max(y1, currentRect.y1);
			var y2Intersect = Math.min(y2, currentRect.y2);
			var range = new ClosedIntRangePrivate(y1Intersect, y2Intersect, currentRect.x2);
			result.push(range);
		}
	}
	return result;
};



// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Private class methods
/** @override */
ClosedIntRangePrivate.prototype.eq = function(other) {
	return goog.base(this, 'eq', other) && this.terminus === other.terminus;
};

/**
 * @return {ClosedIntRangePrivate}
 */
ClosedIntRangePrivate.prototype.clone = function() {
	return new ClosedIntRangePrivate(this.begin, this.end, this.terminus);
};

/*******************************************************************************************************************/});
