goog.provide('ag.bio.DnaPattern');

goog.require('goog.asserts');
goog.require('goog.object');

goog.require('ag.bio');
goog.require('ag.bio.BioString');

/**
 * @constructor
 * @param {string=} pattern
 */
ag.bio.DnaPattern = function(pattern) {
	/**
	 * @type {string}
	 * @private
	 */
	this.pattern_ = '';

	/**
	 * @type {boolean}
	 * @private
	 */
	this.valid_ = false;

	this.setPattern(goog.isString(pattern) ? pattern : '');
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var object = goog.object;

var bio = ag.bio;
var BioString = ag.bio.BioString;
var DnaPattern = ag.bio.DnaPattern;

// --------------------------------------------------------------------------------------------------------------------
// Static defines
DnaPattern.PATTERN_QUERY_CHAR_MAP = {
	'A': {'A': 1, 'a': 1},
	'C': {'C': 1, 'c': 1},
	'G': {'G': 1, 'g': 1},
	'T': {'T': 1, 't': 1},
	'R': {'A': 1, 'a': 1, 'G': 1, 'g': 1},
	'Y': {'T': 1, 't': 1, 'C': 1, 'c': 1},
	'M': {'A': 1, 'a': 1, 'C': 1, 'c': 1},
	'K': {'G': 1, 'g': 1, 'T': 1, 't': 1},
	'S': {'C': 1, 'c': 1, 'G': 1, 'g': 1},
	'W': {'A': 1, 'a': 1, 'T': 1, 't': 1},
	'H': {'A': 1, 'a': 1, 'C': 1, 'c': 1, 'T': 1, 't': 1},
	'B': {'C': 1, 'c': 1, 'G': 1, 'g': 1, 'T': 1, 't': 1},
	'V': {'A': 1, 'a': 1, 'C': 1, 'c': 1, 'G': 1, 'g': 1},
	'D': {'A': 1, 'a': 1, 'G': 1, 'g': 1, 'T': 1, 't': 1},
	'N': {'A': 1, 'a': 1, 'C': 1, 'c': 1, 'G': 1, 'g': 1, 'T': 1, 't': 1}
};

// Identical to the above, except uses the ASCII character codes for all query characters; useful for directly
// comparing to the raw BioString data.
DnaPattern.PATTERN_QUERY_CODE_MAP = {
    'A': {65: 1, 97: 1},
    'C': {67: 1, 99: 1},
    'G': {71: 1, 103: 1},
    'T': {84: 1, 116: 1},
    'R': {65: 1, 97: 1, 71: 1, 103: 1},
    'Y': {84: 1, 116: 1, 67: 1, 99: 1},
    'M': {65: 1, 97: 1, 67: 1, 99: 1},
    'K': {71: 1, 103: 1, 84: 1, 116: 1},
    'S': {67: 1, 99: 1, 71: 1, 103: 1},
    'W': {65: 1, 97: 1, 84: 1, 116: 1},
    'H': {65: 1, 97: 1, 67: 1, 99: 1, 84: 1, 116: 1},
    'B': {67: 1, 99: 1, 71: 1, 103: 1, 84: 1, 116: 1},
    'V': {65: 1, 97: 1, 67: 1, 99: 1, 71: 1, 103: 1},
    'D': {65: 1, 97: 1, 71: 1, 103: 1, 84: 1, 116: 1},
    'N': {65: 1, 97: 1, 67: 1, 99: 1, 71: 1, 103: 1, 84: 1, 116: 1}
};


// --------------------------------------------------------------------------------------------------------------------
// Static methods
/**
 * @param {string} pattern
 * @return {boolean}
 */
DnaPattern.isValidPattern = function(pattern) {
    for (var i=0, z=pattern.length; i<z; i++)
    {
    	switch (pattern.charAt(i)) {
        case 'A':
        case 'C':
        case 'G':
        case 'T':
        case 'R':
        case 'Y':
        case 'M':
        case 'K':
        case 'S':
        case 'W':
        case 'H':
        case 'B':
        case 'V':
        case 'D':
        case 'N':
        case '-':
        case ' ':
            continue;

        default:
            return false;
        }
    }

    return true;	
};

// --------------------------------------------------------------------------------------------------------------------
// Pseudo serialization
/**
 * @param {Object} object
 * @return {DnaPattern}
 */
DnaPattern.fromSerialObject = function(object) {
    return new DnaPattern(object['pattern']);
};

/** @return {Object} */
DnaPattern.prototype.toSerialObject = function() {
    return {
        '_type': 'DnaPattern',
        'pattern': this.pattern_
    };
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * Clears out the pattern
 */
DnaPattern.prototype.clear = function() {
	this.setPattern('');
};

/** @return {string} */
DnaPattern.prototype.displayText = function() {
	var text = '';

	for (var i=0, z=this.pattern_.length; i<z; i++) {
		switch (this.pattern_.charAt(i)) {
        case 'R':            text += "[A/G]";            break;
        case 'Y':            text += "[C/T]";            break;
        case 'M':            text += "[A/C]";            break;
        case 'K':            text += "[G/T]";            break;
        case 'S':            text += "[C/G]";            break;
        case 'W':            text += "[A/T]";            break;
        case 'H':            text += "[A/C/T]";          break;
        case 'B':            text += "[C/G/T]";          break;
        case 'V':            text += "[A/C/G]";          break;
        case 'D':            text += "[A/G/T]";          break;
        case 'N':            text += "*";                break;

        default:
            break;
		}
	}

	return text;
};

/**
 * @param {BioString} bioString
 * @param {number} offset 1-based
 * @return {number}
 */
DnaPattern.prototype.indexIn = function(bioString, offset) {
    if (bioString.isEmpty())
        return -1;

    assert(offset >= 1 && offset <= bioString.length());

    var maxPositionThatCanMatch = bioString.length() - this.pattern_.length + 1;
    for (var i=offset; i<=maxPositionThatCanMatch; ++i)
        if (this.matchesAt(bioString, i))
            return i;

    return -1;
};

/** @return {boolean} */
DnaPattern.prototype.isEmpty = function() {
	return this.pattern_.length === 0;
};

/** @return {boolean} */
DnaPattern.prototype.isValid = function() {
	return this.valid_;
};

/** @return {number} */
DnaPattern.prototype.length = function() {
	return this.pattern_.length;
};

/**
 * @param {BioString} bioString
 * @param {number} offset 1-based
 * @return {boolean}
 */
DnaPattern.prototype.matchesAt = function(bioString, offset) {
    if (bioString.isEmpty())
        return false;

    var patternLength = this.pattern_.length;
    if (patternLength === 0)
        return false;

    assert(offset >= 1 && offset <= bioString.length());
    if (offset + patternLength - 1 > bioString.length())
        return false;

    for (var i=0, z=this.pattern_.length; i<z; i++)
    	if (!DnaPattern.matches_(this.pattern_.charAt(i), bioString.at(offset + i)))
    		return false;

    return true;
};

/**
 * @param {BioString} bioString
 * @return {boolean}
 */
DnaPattern.prototype.matchesAtBeginning = function(bioString) {
	return this.matchesAt(bioString, 1);
};

/**
 * @param {BioString} bioString
 * @return {boolean}
 */
DnaPattern.prototype.matchesAtEnd = function(bioString) {
	return this.matchesAt(bioString, Math.max(1, bioString.length() - this.pattern_.length + 1));
};

/** @return {string} */
DnaPattern.prototype.pattern = function() {
	return this.pattern_;
};

/**
 * @param {string} newPattern
 */
DnaPattern.prototype.setPattern = function(newPattern) {
	assert(goog.isString(newPattern), 'DnaPattern.setPattern() - newPattern must be a string');
	this.pattern_ = newPattern;
	this.valid_ = DnaPattern.isValidPattern(newPattern);
};


// --------------------------------------------------------------------------------------------------------------------
// Private static methods
/**
 * @param {string} patternChar
 * @param {number} queryCharCode
 * @return {boolean}
 */
DnaPattern.matches_ = function(patternChar, queryCharCode) {
	if (patternChar === ' ')
		return true;
	else if (patternChar === '-')
		return bio.isGapCharacterCode(queryCharCode);

	assert(object.containsKey(DnaPattern.PATTERN_QUERY_CODE_MAP, patternChar));
	return object.containsKey(DnaPattern.PATTERN_QUERY_CODE_MAP[patternChar], queryCharCode);
};


/*******************************************************************************************************************/});