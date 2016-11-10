/**
 * @fileoverview CharColorScheme defines a configurable scheme for associating specific color styles with
 * invidividual characters, and a default TextColorStyle for all other characters.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.graphics.CharColorScheme');

goog.require('ag.core.CharCodes');

goog.require('goog.asserts');

/**
 * @constructor
 * @param {string=} optDefaultColor defaults to black on white ('000000ffffff')
 */
ag.graphics.CharColorScheme = function(optDefaultColor) {
    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {Array.<string>}
     * @private
     */
    this.colors_ = Array(128);

    /**
     * @type {string}
     * @private
     */
    this.defaultColors_ = optDefaultColor ? optDefaultColor : '000000ffffff';

    // --------------------------------------------------------------------------------------------------------------------
    goog.asserts.assert(this.defaultColors_.length === 12);
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var CharCodes = ag.core.CharCodes;
var CharColorScheme = ag.graphics.CharColorScheme;

/**
 * @param {number} asciiCh
 * @return {boolean}
 */
CharColorScheme.isValidAsciiCharacter = function(asciiCh) {
    return asciiCh >= 0 && asciiCh < 129;
};

/**
 * @param {string} colors
 * @return {boolean}
 */
CharColorScheme.isValidColors = function(colors) {
    return /^[A-Fa-f0-9]{12}$/.test(colors);
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * @param {number} asciiCh
 * @return {string}
 */
CharColorScheme.prototype.colors = function(asciiCh) {
    assert(CharColorScheme.isValidAsciiCharacter(asciiCh), 'asciiCh: ' + asciiCh + ' out of range');

    var result = this.colors_[asciiCh];
    return (result) ? result : this.defaultColors_;
};

/**
 * @return {string}
 */
CharColorScheme.prototype.defaultColors = function() {
    return this.defaultColors_;
};

/**
 * @param {number} asciiCh
 * @return {boolean}
 */
CharColorScheme.prototype.hasColorsFor = function(asciiCh) {
    return goog.isDef(this.colors_[asciiCh]);
};

/**
 * @param {number} asciiCh
 * @param {string} colors
 */
CharColorScheme.prototype.setColors = function(asciiCh, colors) {
    assert(CharColorScheme.isValidAsciiCharacter(asciiCh), 'asciiCh: ' + asciiCh + ' out of range');

    this.colors_[asciiCh] = colors;

    return this;
};

/**
 * @param {string} chars
 * @param {string} colors
 */
CharColorScheme.prototype.setColorsForChars = function(chars, colors) {
    for (var i=0, z=chars.length; i<z; i++)
        this.setColors(CharCodes[chars[i]], colors);

    return this;
};

/*******************************************************************************************************************/});
