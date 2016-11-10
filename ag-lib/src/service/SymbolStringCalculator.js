/**
 * @fileoverview SymbolStringCalculator determines the symbol string from a vector distribution of character
 *   frequencies.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.service.SymbolStringCalculator');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.math');

/**
 * @constructor
 * @param {ag.bio.BioSymbolGroup} bioSymbolGroup
 * @param {string=} optDefaultSymbol defaults to space
 */
ag.service.SymbolStringCalculator = function(bioSymbolGroup, optDefaultSymbol) {
    goog.asserts.assert(bioSymbolGroup, 'Missing bioSymbolGroup argument');

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.bio.BioSymbolGroup}
     * @private
     */
    this.bioSymbolGroup_ = bioSymbolGroup;

    /**
     * @type {string}
     * @private
     */
    this.defaultSymbol_ = optDefaultSymbol ? optDefaultSymbol[0] : ' ';

    /**
     * Maps the ASCII character code to its associated symbols
     *
     * @type {Object.<string,string>}
     * @private
     */
    this.charSymbolAssociation_;

    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    this.buildCharSymbolAssocation_();
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;
var math = goog.math;

var SymbolStringCalculator = ag.service.SymbolStringCalculator;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {ag.bio.BioSymbolGroup} */
SymbolStringCalculator.prototype.bioSymbolGroup = function() {
    return this.bioSymbolGroup_;
};

/**
 * Analyzes each character's amount in each column of charCounts relative to a required BioSymbol threshold.
 * If at least one BioSymbol matches the column contents, then the highest matching BioSymbol's symbol is used for this
 * column. If the character count distribution in this column does not surpass any of the BioSymbol's thresholds, the
 * defaultSymbol_ character is used. This process is done for each column and results in a symbol string, which is
 * returned.
 *
 * Overarching principle when choosing BioSymbolGroup rules: If two or more BioSymbol's thresholds are simultaneously
 * matched, divide each distribution value by the number of characters in that BioSymbol and take the highest (most
 * specific, that is, the one with the fewest characters) BioSymbol. If there is a tie, take the first rule defined.
 *
 * It is assumed that the sum of all values in each column is <= 1, otherwise the behavior is undefined.
 *
 * @param {Array.<Object.<string|number,number>>} charFractions
 *                        ^^^^^^^^^^^^^ ascii code
 *                                      ^^^^^^ fraction this code appears
 * @return {string}
 */
SymbolStringCalculator.prototype.computeSymbolString = function(charFractions) {
    var result = '';
    var bioSymbolGroup = this.bioSymbolGroup_;
    var bioSymbols = bioSymbolGroup.bioSymbols();

    for (var i=0, z=charFractions.length; i<z; i++) {
        var columnFractions = charFractions[i];
        var symbolProportions = this.sumSymbolProportions_(columnFractions);
        var matchingSymbols = this.findMatchingGroups_(symbolProportions, bioSymbols);
        var n = matchingSymbols.length;
        // If no rules were matched
        if (!n) {
            result += this.defaultSymbol_;
            continue;
        }

        // Or, if only a single rule was matched, use its symbol
        if (n === 1) {
            result += bioSymbols[matchingSymbols[0][0]].symbol();
            continue;
        }

        // Otherwise, determine the winning symbol
        // 1) Compute the effective threshold (actual proportion of this symbol divided by the number of
        //    characters it contains) for each matching BioSymbol
        var threshes = this.computeEffectiveThresholds_(matchingSymbols, bioSymbols);

        // 2) Sort by the effective thresholds
        array.stableSort(threshes, function(b, a) {
            // A and B: [character code, effective threshold]
            if (a[1] < b[1])
                return -1;
            else if (a[1] > b[1])
                return 1;

            // Effective thresholds are equivalent, therefore compare by their serial position
            var aSerial = bioSymbolGroup.serialNumber(a[0]);
            var bSerial = bioSymbolGroup.serialNumber(b[0]);
            if (aSerial > bSerial)
                return -1;
            else if (aSerial < bSerial)
                return 1;

            return 0;
        });

        // 3) Last one should be our winner - unless there is a tie :)
        // result += bioSymbols[threshes[threshes.length-1][0]].symbol();
        result += bioSymbols[threshes[0][0]].symbol();
    }

    return result;
};

/** @return {string} */
SymbolStringCalculator.prototype.defaultSymbol = function() {
    return this.defaultSymbol_;
};

/**
 * @param {ag.bio.BioSymbolGroup} newBioSymbolGroup
 */
SymbolStringCalculator.prototype.setBioSymbolGroup = function(newBioSymbolGroup) {
    this.bioSymbolGroup_ = newBioSymbolGroup;
    this.buildCharSymbolAssocation_();
};

/**
 * @param {string} symbol
 */
SymbolStringCalculator.prototype.setDefaultSymbol = function(symbol) {
    assert(symbol.length > 0, 'symbol must not be empty');

    this.defaultSymbol_ = symbol[0];
};

// --------------------------------------------------------------------------------------------------------------------
// Private functions
/**
 * Given a symbol group, essentially reverse its data structure so that it is possible to find all symbols associated
 * with a particular character.
 *
 * Given the BioSymbolGroup:
 *   Symbol        Characters
 *   p             KE
 *   +             KR
 *   -             DE
 *
 * This method constructs the inverse:
 *   Character     Symbols
 *   K             p+
 *   E             p-
 *   D             -
 *   R             +
 *
 * Or in this version, character will be the ASCII code.
 *
 * @private
 */
SymbolStringCalculator.prototype.buildCharSymbolAssocation_ = function() {
    var mapping = {};
    var bioSymbols = this.bioSymbolGroup_.bioSymbols();
    for (var symbol in bioSymbols) {
        var bioSymbol = bioSymbols[symbol];
        var codes = bioSymbol.characterSet().getValues();
        var i=codes.length;
        while (i--) {
            var code = codes[i];
            if (code in mapping)
                mapping[code] += symbol;
            else
                mapping[code] = symbol;
        }
    }

    this.charSymbolAssociation_ = mapping;
};

/**
 * @param {Object.<string|number,number>} columnFractions
 * @return {Object.<string,number>}  symbol -> summed fraction
 */
SymbolStringCalculator.prototype.sumSymbolProportions_ = function(columnFractions) {
    var result = {};

    for (var ch in columnFractions) {
        if (ch in this.charSymbolAssociation_) {
            var fraction = columnFractions[ch];
            var symbols = this.charSymbolAssociation_[ch];
            for (var i=0, z=symbols.length; i<z; i++) {
                var symbol = symbols[i];
                if (symbol in result)
                    result[symbol] += fraction;
                else
                    result[symbol] = fraction;
            }
        }
    }

    return result;
};

/**
 */
SymbolStringCalculator.prototype.findMatchingGroups_ = function(symbolProportions, bioSymbols) {
    var matches = [];
    for (var symbol in symbolProportions) {
        var proportion = symbolProportions[symbol];
        assert(symbol in bioSymbols, 'Symbol: ' + symbol + ' not found in biosymbols');

        if (proportion >= bioSymbols[symbol].threshold())
            matches.push([symbol, proportion]);
    }
    return matches;
};

/**
 */
SymbolStringCalculator.prototype.computeEffectiveThresholds_ = function(matchingSymbols, bioSymbols) {
    var thresholds = Array(matchingSymbols.length);

    for (var i=0, z=matchingSymbols.length; i<z; i++) {
        var match = matchingSymbols[i];
        var symbol = match[0];
        var nChar = bioSymbols[symbol].size();
        var proportion = match[1];
        thresholds[i] = [symbol, proportion / nChar];
    }

    return thresholds;
};

/*******************************************************************************************************************/});
