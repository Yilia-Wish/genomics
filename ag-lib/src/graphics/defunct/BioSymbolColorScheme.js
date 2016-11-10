/**
 * @fileoverview BioSymbolColorScheme provides for associating specific TextColorStyles with a symbol and also a
 * CharColorScheme for associating TextColorStyle purely based on the character itself.
 *
 * Because a BioSymbol is associated with a specific set of characters, it is desirable to only color those characters
 * in a given column that are members of that BioSymbol's character set. Thus, the user may set a BioSymbolGroup which
 * will be used to return associated color's for members with the associated symbol or the default text color style
 * otherwise. For example:
 *
 * Given:
 * o BioSymbol('a', "ILV", .5)
 * o The column:
 *   I
 *   I
 *   P
 * o Which results in the symbol: a (because 2/3 residues are I which is greater than .5)
 * o TextColorStyle for 'a' => (Qt::red, Qt::white)
 *
 * Then:
 * o symbolColorStyle('I', 'a') -> (Qt::red, Qt::white)
 * o symbolColorStyle('P', 'a') -> TextColorStyle()
 *
 * If any CharColorScheme is defined, it will be given precedence when choosing colors for specific characters,
 * regardless of the symbol. To illustrate this, in the above example, if a CharColorScheme has a color style defined
 * for I, then that will be returned for all I characters regardless of the symbol.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.graphics.BioSymbolColorScheme');

goog.require('goog.asserts');

goog.require('ag.bio.BioSymbolGroup');
goog.require('ag.graphics.CharColorScheme');

/**
 * @constructor
 * @param {ag.bio.BioSymbolGroup=} optBioSymbolGroup
 * @param {ag.graphics.CharColorScheme=} optCharColorScheme
 */
ag.graphics.BioSymbolColorScheme = function(optBioSymbolGroup, optCharColorScheme) {
    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.bio.BioSymbolGroup}
     */
    this.bioSymbolGroup = optBioSymbolGroup ? optBioSymbolGroup : new ag.bio.BioSymbolGroup();

    /**
     * @type {ag.graphics.CharColorScheme}
     */
    this.charColorScheme = optCharColorScheme ? optCharColorScheme : new CharColorScheme();

    /**
     * @type {Object.<string,string>}
     * @private
     */
    this.symbolColors_ = {};
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var BioSymbolGroup = ag.bio.BioSymbolGroup;
var BioSymbolColorScheme = ag.graphics.BioSymbolColorScheme;
var CharColorScheme = ag.graphics.CharColorScheme;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * @param {string} symbol
 * @param {string} colors
 */
BioSymbolColorScheme.prototype.setSymbolColors = function(symbol, colors) {
    assert(colors.length === 12);
    this.symbolColors_[symbol] = colors;
};

/**
 * The appropriate color to determine is based upon the following:
 * o If character is defined in CharColorScheme, then use its color style - regardless of the symbol
 * o If a color style is defined for the character and symbol combination, return that color style
 * o Otherwise, return the CharColorScheme's default color style
 *
 * @param {number} asciiCh
 * @param {string} symbol
 * @return {string}
 */
BioSymbolColorScheme.prototype.symbolColors = function(asciiCh, symbol) {
    var colors = this.charColorScheme.colors(asciiCh);
    if (!colors) {
        colors = this.symbolColors_[symbol];
        if (!colors || !this.bioSymbolGroup.isCharAssociatedWithSymbol(asciiCh, symbol))
            colors = this.charColorScheme.defaultColors();
    }
    return colors;
};

/*******************************************************************************************************************/});
