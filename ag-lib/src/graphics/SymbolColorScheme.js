/**
 * @fileoverview: SymbolColorScheme extends the base CharColorScheme implementation enabling TextColorStyle's to be
 * defined for specific character and symbol combinations.
 *
 * SymbolColorScheme is compatible with TextColorStyles defined for individual characters; however, preference is given
 * to any style defined for a character and symbol combination over the individual style of a specific character.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.graphics.SymbolColorScheme');

goog.require('ag.core.CharCodes');
goog.require('ag.graphics.CharColorScheme');

goog.require('goog.asserts');

/**
 * @constructor
 * @extends {ag.graphics.CharColorScheme}
 * @param {string=} optDefaultColor
 */
ag.graphics.SymbolColorScheme = function(optDefaultColor) {
    goog.base(this, optDefaultColor);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {Array.<Object.<string,string>>}
     * @private
     */
    this.symbolColors_ = Array(128);

    var i=128;
    while (i--)
        this.symbolColors_[i] = {};
};
goog.inherits(ag.graphics.SymbolColorScheme, ag.graphics.CharColorScheme);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var CharCodes = ag.core.CharCodes;
var CharColorScheme = ag.graphics.CharColorScheme;
var SymbolColorScheme = ag.graphics.SymbolColorScheme;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * We suppress the type check because we are adding a parameter (symbol) not formally defined in the base class method.
 *
 * @override
 * @suppress {checkTypes}
 */
SymbolColorScheme.prototype.colors = function(asciiCh, symbol) {
    assert(symbol.length === 1, 'symbol must be a single character');
    var colors = this.symbolColors_[asciiCh][symbol];
    if (colors)
        return colors;

    return goog.base(this, 'colors', asciiCh);
};

/**
 * @param {number} asciiCh ASCII character code
 * @param {string} symbols string of symbols
 * @param {string} colors a 12 character symbol color
 */
SymbolColorScheme.prototype.setSymbolColors = function(asciiCh, symbols, colors) {
    assert(CharColorScheme.isValidAsciiCharacter(asciiCh), 'asciiCh: ' + asciiCh + ' out of range');
    assert(symbols.length > 0, 'symbols cannot be empty');
    assert(CharColorScheme.isValidColors(colors), 'invalid colors');

    var i=symbols.length;
    while (i--)
        this.symbolColors_[asciiCh][symbols[i]] = colors;

    return this;
};

/**
 * @param {string} chars
 * @param {string} symbols string of symbols
 * @param {string} colors a 12 character symbol color
 */
SymbolColorScheme.prototype.setSymbolColorsForChars = function(chars, symbols, colors) {
    for (var i=0, z=chars.length; i<z; i++)
        this.setSymbolColors(CharCodes[chars[i]], symbols, colors);

    return this;
};

/*******************************************************************************************************************/});
