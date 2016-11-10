goog.provide('ag.bio');

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var bio = ag.bio;

// Defaults
bio.DEFAULT_GAP_CHARCODE = 45;

// --------------------------------------------------------------------------------------------------------------------
// Static public methods
/**
 * @param {string} character
 * @return {boolean}
 */
bio.isGapCharacter = function(character) {
	return character === '-' || character === '.';
};

/**
 * @param {number} charCode
 * @return {boolean}
 */
bio.isGapCharacterCode = function(charCode) {
	return charCode === 45 || charCode === 46;
};


/*******************************************************************************************************************/});