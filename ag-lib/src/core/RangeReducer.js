/**
 * @fileoverview RangeReducer is a singleton utility clas for reducing an array of potentially overlapping
 *   ClosedIntRange's to an array of non-overlapping ranges.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.core.RangeReducer');

goog.require('goog.array');
goog.require('goog.asserts');

goog.require('ag');
goog.require('ag.core.ClosedIntRange');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 */
ag.core.RangeReducer = function() {};
goog.addSingletonGetter(ag.core.RangeReducer);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;

var ClosedIntRange = ag.core.ClosedIntRange;
var ClosedIntRangeArray = ag.core.ClosedIntRangeArray;
var RangeReducer = ag.core.RangeReducer;

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * Works with normal or non-normal ranges
 *
 * @param {ClosedIntRangeArray} ranges
 * @return {ClosedIntRangeArray}
 */
RangeReducer.prototype.reduce = function(ranges) {
	if (ranges.length === 0)
		return [];

	var normRanges = array.map(ranges, function(range) {
		return range.isNormal() ? range : range.normalized()
	});

	RangeReducer.sortRangesByBegin_(normRanges);
	var result = [normRanges[0]];
	for (var i=1, z=normRanges.length; i<z; i++) {
		var lastRange = result.last();
		var curRange = normRanges[i];
		if (curRange.begin <= lastRange.end + 1) {
			if (curRange.end > lastRange.end)
				lastRange.end = curRange.end;
		}
		else {
			result.push(curRange);
		}
	}

	return result;
};


// --------------------------------------------------------------------------------------------------------------------
// Private static methods
/**
 * @param {ClosedIntRangeArray} ranges
 * @private
 */
RangeReducer.sortRangesByBegin_ = function(ranges) {
	array.sort(ranges, function(leftRange, rightRange) {
		if (leftRange.begin < rightRange.begin)
			return -1;
		else if (leftRange.begin > rightRange.begin)
			return 1;

		return 0;
	});
};

/*******************************************************************************************************************/});
