/**
 * @fileoverview CharCountDistribution encapsulates the manipulation of a character count distribution which is represented by a
 * ListHashCharInt (see global.h).
 *
 * CharCountDistribution merely wraps a ListHashCharInt and provides useful methods for tweaking its contents. It does
 * not produce any such raw distribution data - this must be supplied upon construction.
 *
 * Specifically, methods are provided for adding and subtracting other character count distributions with respect
 * to this distribution. Additionally, blanks - empty character counts for one or more columns - may be added to the
 * distribution as well as removal of any columns.
 *
 * Note: It is possible to have hash keys with a value of 0. This typically would result from adding or subtracting
 *       another distribution. In essence, this is functionally the same thing as not having this key at all; however,
 *       no care is taken to automatically remove these keys because 1) it requires additional code that carries no
 *       significant benefit and 2) it may be desired in some user cases.
 *
 *       The removeZeroValueKeys method is a convenience method for removing all keys that have a zero value if it is
 *       desired to not have these present.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.core.CharCountDistribution');

goog.require('ag.core.ClosedIntRange');
goog.require('ag.bio.BioString');

goog.require('goog.asserts');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.object');

/**
 * @constructor
 * @param {Array.<Object.<string|number,number>>} [optCharCounts]
 * @param {number} [optDivisor] must not be zero; defaults to 1
 */
ag.core.CharCountDistribution = function(optCharCounts, optDivisor) {
    /**
     * The key may either be a string or its character code equivalent.
     *
     * @type {Array.<Object.<string|number,number>>}
     * @protected
     */
    this.charCounts_ = goog.isArray(optCharCounts) ? optCharCounts : [];

    /**
     * @type {number}
     * @private
     */
    this.divisor_ = goog.isDef(optDivisor) ? optDivisor : 1;

    goog.asserts.assert(this.divisor_ !== 0, 'Divisor may not be zero');
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;
var events = goog.events;
var object = goog.object;

var CharCountDistribution = ag.core.CharCountDistribution;
var ClosedIntRange = ag.core.ClosedIntRange;


// --------------------------------------------------------------------------------------------------------------------
// Static properties
/** @enum {string} */
CharCountDistribution.SignalType = {
    // ClosedIntRange
    COLUMNS_INSERTED: events.getUniqueId('columns-inserted'),
    // ClosedIntRange
    COLUMNS_REMOVED: events.getUniqueId('columns-removed'),
    // ClosedIntRange
    DATA_CHANGED: events.getUniqueId('data-changed')
};


// --------------------------------------------------------------------------------------------------------------------
// Static methods
CharCountDistribution.rawCountsEqual = function(a, b) {
    if (a.length !== b.length)
        return false;

    for (var i=0, z=a.length; i<z; i++) {
        var aHash = a[i];
        var bHash = b[i];

        for (var key in aHash)
            if (!(key in bHash) || bHash[key] !== aHash[key])
                return false;

        // Check that there are no extra keys in the bHash not present in aHash
        for (var key in bHash)
            if (!(key in aHash))
                return false;
    }

    return true;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * Adds the character count values in otherCharCountDistribution to this distribution beginning at offset (1-based).
 * Requirements:
 * o offset must be between 1 and length(), which implies that there must be at least one column
 * o offset + otherCharCountDistribution.length() - 1 must be less than or equal to length()
 *
 * This method does a simple column by column addition of all character counts. If a character count present in
 * otherCharCountDistribution does not exist in this object, transfer that character's count. If an add operation
 * is done without a corresponding subtract operation, it is very possible that the rows value will no longer be
 * valid. It is the user's responsibility to ensure that all operations are properly applied.
 *
 * Example:
 * >> this.charCounts_:           [ (A, 2) (C, 2) ], [ (T, 1) (G, 3) ]
 * >> otherCharCountDistribution: [ (A, 1) (G, 1) ], [ (G, 1) ]
 * >> result:                     [ (A, 3) (C, 2) (G, 1) ], [ (T, 1) (G, 4) ]
 *
 * @param {CharCountDistribution} other
 * @param {number=} optOffset defaults to 1
 * @return {CharCountDistribution} this
 */
CharCountDistribution.prototype.add = function(other, optOffset) {
    var offset = optOffset ? optOffset : 1;
    assert(offset > 0 && offset <= this.length(), 'offset out of range');
    assert(offset + other.length() - 1 <= this.length(), 'offset + other exceeds distribution length');

    var selfCounts = this.charCounts_;
    var otherCounts = other.charCounts_;
    var i = otherCounts.length;
    while (i--) {
        var otherHash = otherCounts[i];
        var thisHash = selfCounts[offset + i - 1];

        for (var key in otherHash) {
            var amount = otherHash[key];
            if (key in thisHash)
                thisHash[key] += amount;
            else
                thisHash[key] = amount;
        }
    }

    return this;
};

/**
 * @param {ag.bio.BioString} bioString
 * @param {string=} optSkipChar if not provided all characters are counted
 * @param {number=} optOffset defaults to 1
 * @return {CharCountDistribution} this
 */
CharCountDistribution.prototype.addBioString = function(bioString, optSkipChar, optOffset) {
    var offset = optOffset ? optOffset : 1;
    assert(offset > 0 && offset <= this.length(), 'offset out of range');
    assert(offset + bioString.length() - 1 <= this.length(), 'offset + bioString exceeds distribution length');
    assert(!optSkipChar || optSkipChar.length === 1, 'invalid skip char');
    var skipCharCode = optSkipChar ? optSkipChar.charCodeAt(0) : undefined;

    var constBuffer = bioString.constBuffer();
    var charCounts = this.charCounts_;
    for (var i=0, j=offset-1, z=bioString.length(); i< z; ++i, ++j) {
        var key = constBuffer[i];
        if (key === skipCharCode)
            continue;

        var hash = charCounts[j];
        if (key in hash)
            ++hash[key];
        else
            hash[key] = 1;
    }

    return this;
};

/** @return {boolean} */
CharCountDistribution.prototype.allColumnsAreEmpty = function() {
    for (var i=0, z=this.charCounts_.length; i<z; i++)
        if (!object.isEmpty(this.charCounts_[i]))
            return false;

    return true;
};

/** @return {Array.<Object.<*,number>>} */
CharCountDistribution.prototype.charCounts = function() {
    return this.charCounts_;
};

/** @return {CharCountDistribution} this */
CharCountDistribution.prototype.clear = function() {
    this.charCounts_.length = 0;
    return this;
};

/**
 * Transform the character counts spanning range into their fractional amount and return an array with this information.
 *
 * @param {number} divisor
 * @param {ClosedIntRange=} optRange defaults to all columns if empty
 * @return {Array.<Object.<*,number>>}
 */
CharCountDistribution.prototype.divide = function(divisor, optRange) {
    assert(divisor !== 0, 'Invalid divisor must not be zero');
    if (!optRange && this.length() === 0)
        return [];

    var range = optRange ? optRange : new ClosedIntRange(1, this.length());
    assert(this.isValidRange(range), 'range out of range');

    // In general, multiply is faster (http://jsperf.com/multiply-vs-divide/14)
    var factor = 1.0 / divisor;

    var result = new Array(range.length());
    for (var i=range.begin-1, z=range.end, j=0; i<z; i++, j++) {
        var hash = this.charCounts_[i];
        var newHash = {};
        for (var key in hash)
            newHash[key] = hash[key] * factor;
        result[j] = newHash;
    }
    return result;
};

/**
 * This base class method simply returns 1.
 *
 * @return {number}
 */
CharCountDistribution.prototype.divisor = function() {
    return this.divisor_;
};

/**
 * Inserts count blank entries before position (1-based).
 * Requirements (asserted):
 * o position must be between 1 and length() + 1
 * o count must be greater than or equal to zero
 *
 * Examples:
 * >> insertBlanks(3, 1) -> inserts 1 blank as the third element
 * >> insertBlanks(1, 5) -> inserts 5 blanks at the beginning
 *
 * Given a length of 4, then
 * >> insertBlanks(5, 2) -> inserts 2 blanks at the end
 *
 * @param {number} position
 * @param {number} count
 * @return {CharCountDistribution} this
 */
CharCountDistribution.prototype.insertBlanks = function(position, count) {
    assert(position > 0 && position <= this.length()+1, 'position out of range');
    assert(count >= 0);

    var insertion = new Array(count);
    while (count--)
        insertion[count] = {};

    array.insertArrayAt(this.charCounts_, insertion, position-1);

    return this;
};

/**
 * @param {ClosedIntRange} range
 * @return {boolean}
 */
CharCountDistribution.prototype.isValidRange = function(range) {
    return range.begin > 0 && range.begin <= range.end && range.end <= this.length();
};

/** @return {number} */
CharCountDistribution.prototype.length = function() {
    return this.charCounts_.length;
};

/**
 * Returns a slice of the CharCountDistribution spanning range. Hashes returned are shallow copies.
 *
 * @param {ClosedIntRange} range
 * @return {CharCountDistribution}
 */
CharCountDistribution.prototype.mid = function(range) {
    assert(this.isValidRange(range), 'range out of range');

    var slice = this.charCounts_.slice(range.begin - 1, range.end);
    return new CharCountDistribution(slice);
};

/**
 * Removes count entries/columns beginning at position (1-based).
 * Requirements (asserted):
 * o position must be between 1 and length(), which implies that there must be at least one column
 * o count must be greater than or equal to zero
 * o position + count - 1 must be less than or equal to length()
 *
 * Examples:
 * >> remove(3, 1) -> removes the third column
 * >> remove(1, 2) -> inserts the first 2 columns
 *
 * Given a length of 4, then
 * >> remove(3, 2) -> removes the last two columns
 *
 * @param {number} position
 * @param {number} optCount defaults to 1
 * @return {CharCountDistribution} this
 */
CharCountDistribution.prototype.remove = function(position, optCount) {
    assert(position > 0 && position <= this.length(), 'position out of range');
    var count = goog.isDefAndNotNull(optCount) ? optCount : 1;
    assert(count >= 0);

    array.splice(this.charCounts_, position - 1, count);
    return this;
};

/**
 * Removes all character keys from each hash that have a value of zero.
 *
 * Example:
 * >> this.charCounts_:           [ (B, 0) ], [ (A, 2) (C, 2) (G, 0) ], [ (T, 1) (G, 3) ], []
 * >> result:                     [ ], [ (A, 2) (C, 2) ], [ (T, 1) (G, 3) ], []
 *
 * @param {ClosedIntRange} [optRange]
 * @return {CharCountDistribution} this
 */
CharCountDistribution.prototype.removeZeroValueKeys = function(optRange) {
    var range = optRange ? optRange : new ClosedIntRange(1, this.length());
    assert(this.isValidRange(range), 'range out of range');

    var charCounts = this.charCounts_;
    for (var i=range.begin-1, z=range.end; i<z; i++) {
        var hash = charCounts[i];
        var zeroKeys = [];
        for (var key in hash)
            if (hash[key] === 0)
                zeroKeys.push(key);

        var j = zeroKeys.length;
        while (j--)
            delete hash[zeroKeys[j]];
    }
    return this;
};

/**
 * Subtracts the character count values in otherCharCountDistribution to this distribution beginning at
 * offset (1-based).
 * Requirements:
 * o offset must be between 1 and length(), which implies that there must be at least one column
 * o offset + otherCharCountDistribution.length() - 1 must be less than or equal to length()
 *
 * This method does a simple column by column subtraction of all character counts. If a character count present in
 * otherCharCountDistribution does not exist in this, simply transfer the negative character's count. If a subtract
 * operation is done without a cognate addition operation, it is very possible that the rows value will no longer be
 * valid. It is the user's responsibility to ensure that all operations are properly applied.
 *
 * All zero keys are ignored.
 *
 * Example:
 * >> this.charCounts_:           [ (A, 2) (C, 2) ], [ (T, 1) (G, 3) ]
 * >> otherCharCountDistribution: [ (A, 1) (G, 1) ], [ (-, 1) (G, 1) ]
 * >> result:                     [ (A, 2) (C, 2) (G, -2) ], [ (T, 1) (G, 3) (A, -1) (C, -1) ]
 *
 * @param {CharCountDistribution} other
 * @param {number=} optOffset defaults to 1
 * @return {CharCountDistribution} this
 */
CharCountDistribution.prototype.subtract = function(other, optOffset) {
    var offset = optOffset ? optOffset : 1;
    assert(offset > 0 && offset <= this.length(), 'offset out of range');
    assert(offset + other.length() - 1 <= this.length(), 'offset + other exceeds distribution length');

    var selfCounts = this.charCounts_;
    var otherCounts = other.charCounts_;
    var i = otherCounts.length;
    while (i--) {
        var otherHash = otherCounts[i];
        var thisHash = selfCounts[offset + i - 1];

        for (var key in otherHash) {
            var amount = otherHash[key];
            if (amount) {
                if (key in thisHash)
                    thisHash[key] -= amount;
                else
                    thisHash[key] = -amount;
            }
        }
    }
    return this;
};

/**
 * @param {ag.bio.BioString} bioString
 * @param {string=} optSkipChar if not provided all characters are counted
 * @param {number=} optOffset defaults to 1
 * @return {CharCountDistribution} this
 */
CharCountDistribution.prototype.subtractBioString = function(bioString, optSkipChar, optOffset) {
    var offset = optOffset ? optOffset : 1;
    assert(offset > 0 && offset <= this.length(), 'offset out of range');
    assert(offset + bioString.length() - 1 <= this.length(), 'offset + bioString exceeds distribution length');
    assert(!optSkipChar || optSkipChar.length === 1, 'invalid skip char');
    var skipCharCode = optSkipChar ? optSkipChar.charCodeAt(0) : undefined;

    var constBuffer = bioString.constBuffer();
    var charCounts = this.charCounts_;
    for (var i=0, j=offset-1, z=bioString.length(); i< z; ++i, ++j) {
        var key = constBuffer[i];
        if (key === skipCharCode)
            continue;

        var hash = charCounts[j];
        if (key in hash)
            --hash[key];
        else
            hash[key] = -1;
    }
    return this;
};

/*******************************************************************************************************************/});
