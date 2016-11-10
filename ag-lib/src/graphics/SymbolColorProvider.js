/**
 * @fileoverview: returns colors based upon the symbol string for a given Msa.
 *
 * Currently, the symbol string must come in the form of a LiveSymbolString. The other option is to have a method for
 * setting a local symbol string and then referencing that when requesting color lookups; however, the value of this
 * is limited and just as easily accomplished with a LiveSymbolString.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.graphics.SymbolColorProvider');

goog.require('ag.graphics.MsaColorProvider');

goog.require('goog.asserts');

/**
 * @constructor
 * @param {ag.service.LiveSymbolString} liveSymbolString
 * @param {ag.graphics.SymbolColorScheme} symbolColorScheme
 * @param {ag.bio.Msa} [optMsa]
 * @extends {ag.graphics.MsaColorProvider}
 */
ag.graphics.SymbolColorProvider = function(liveSymbolString, symbolColorScheme, optMsa) {
    goog.asserts.assert(liveSymbolString instanceof ag.service.LiveSymbolString, 'Invalid live symbol string argument');
    goog.asserts.assert(symbolColorScheme instanceof ag.graphics.SymbolColorScheme, 'Invalid symbol color scheme argument');

    goog.base(this, optMsa);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.service.LiveSymbolString}
     * @private
     */
    this.liveSymbolString_ = liveSymbolString;

    /**
     * @type {ag.graphics.SymbolColorScheme}
     * @private
     */
    this.scheme_ = symbolColorScheme;
};
goog.inherits(ag.graphics.SymbolColorProvider, ag.graphics.MsaColorProvider);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var SymbolColorProvider = ag.graphics.SymbolColorProvider;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
SymbolColorProvider.prototype.colors = function(row, column) {
    assert(this.msa_);
    var asciiCh = this.msa_.at(row).at(column);
    var symbol = this.liveSymbolString_.symbolString()[column-1];
    return this.scheme_.colors(asciiCh, symbol);
};

/** @override */
SymbolColorProvider.prototype.colorsArray = function(row, left, right, optOutArray) {
    assert(this.msa_);
    assert(!optOutArray || optOutArray.length >= right - left + 1);

    var result = optOutArray ? optOutArray : new Array(right - left + 1);
    var symbolString = this.liveSymbolString_.symbolString();
    var buffer = this.msa_.at(row).constBuffer();
    for (var i=left-1, z=right, j=0; i<z; ++i, ++j) {
        var asciiCh = buffer[i];
        var symbol = symbolString[i];
        result[j] = this.scheme_.colors(asciiCh, symbol);
    }
    return result;
};

/*******************************************************************************************************************/});
