goog.provide('ag.util');

goog.require('goog.array');
goog.require('goog.asserts');

goog.require('ag');
goog.require('ag.core.ClosedIntRange');

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;

var util = ag.util;

var ClosedIntRange = ag.core.ClosedIntRange;

// --------------------------------------------------------------------------------------------------------------------
// Static defines
util.ErrorStrings = {
};


// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * @param {Array} a
 * @param {Array} b
 * @return {boolean}
 */
util.arraySetsEq = function(a, b) {
    if (a === b)
        return true;

    var arraysAndSameLength = goog.isArray(a) && goog.isArray(b) &&
                              a.length === b.length;
    if (!arraysAndSameLength)
        return false;

    a = array.clone(a);
    b = array.clone(b);

    a.sort();
    b.sort();

    var i = a.length;
    while (i--) {
        if (a[i] !== b[i])
            return false;
    }

    return true;
};

/**
 * @param {Array} a
 * @param {Array} b
 * @return {boolean}
 */
util.arraySetsNe = function(a, b) {
    return !util.arraySetsEq(a, b);
};

/**
 * Does the exact same thing as goog.array.binaryInsert, but instead returns the index that target was inserted
 * or -1 if target was not inserted.
 *
 * @param {?Array} arr
 * @param {*} target
 * @param {Function=} opt_CompareFun
 * @returns {number}
 */
util.binaryInsert = function(arr, target, opt_CompareFun) {
	var index = array.binarySearch(arr, target, opt_CompareFun);
	if (index >= 0)
		return -1;

	var insertIndex = util.transformNegativeInsertionPoint(index);
	array.insertAt(arr, target, insertIndex);

	return insertIndex;
};

/**
 * @param {*} left
 * @param {*} right
 * @return {number}
 */
util.compareAscending = function(left, right) {
	if (left < right)
		return -1;
	else if (left > right)
		return 1;

	return 0;
}

/**
 * @param {*} left
 * @param {*} right
 * @return {number}
 */
util.compareDescending = function(left, right) {
	return util.compareAscending(right, left);
};

/**
 * Sorts and combines a vector of integers into ranges. Two or more integers that differ by 1 from the previous or
 * next integer in the vector will be combined into a ClosedIntRange.
 *
 * For example:
 * (3, 4, 5, 6) -> (3, 6)
 * (1, 2, 3, 10, 15, 16, 21, 23) -> ((1, 3), (10, 10), (15, 16), (21, 21), (23, 23))
 *
 * Duplicates are treated as a single number:
 * (1, 1, 2, 2, 3) -> (1, 3)
 *
 * @param {Array.<number>} intArray
 * @return {Array.<ClosedIntRange>}
 */
util.convertIntArrayToRanges = function(intArray) {
	if (intArray.length === 0)
		return [];

	array.sort(intArray);

	var ranges = [];
	ranges.push(new ClosedIntRange(intArray[0]));
    for (var i=1, z=intArray.length; i<z; ++i) {
    	var value = intArray[i];
    	var lastRange = ranges.last();
        if (lastRange.end + 1 === value)
            lastRange.end++;
        else if (lastRange.end != value)
            ranges.push(new ClosedIntRange(value));
    }

    return ranges;
};

/**
 * @param {number} value
 * @return {number}
 */
util.nextLargerPowerOf2 = function(value) {
	if (value < 1)
		return 1;

	var x = 1;
	while (x <= value)
		x <<= 1;
	return x;
};

/**
 * @param {number} value
 * @return {?number}
 */
util.nextSmallerPowerOf2 = function(value) {
	if (value <= 1)
		return null;

	var x = 1;
	while (x < value)
		x <<= 1;
	x >>= 1;
	return x;
};

/**
 * The goog.array.binarySearch algorithm supports 1) returning the index of a found item (index >= 0), and if not found,
 * a negative value denoting where to insert this item to preserve the sorted order. Because this insertion point value
 * is negative, it must first be mapped back to a value >= 0.
 *
 * @param {number} insertionPoint
 * @return {number}
 */
util.transformNegativeInsertionPoint = function(insertionPoint) {
	assert(insertionPoint < 0);

	return -(insertionPoint + 1);
};

/*******************************************************************************************************************/});
