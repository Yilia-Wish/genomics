/**
 * @fileoverview BioSymbolGroup manages a collection of BioSymbols and provides a convenient mechanism for testing if a character
 * belongs to a particular symbol.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.bio.BioSymbolGroup');

goog.require('ag.bio.BioSymbol');

goog.require('goog.object');

/**
 * @constructor
 */
ag.bio.BioSymbolGroup = function() {
    /**
     * @type {Object.<string,ag.bio.BioSymbol>}
     * @private
     */
    this.bioSymbols_ = {};

    /**
     * @type {Object.<string,number>}
     * @private
     */
    this.bioSymbolSerialNumbers_ = {};

    /**
     * @type {number}
     * @private
     */
    this.serialNo_ = 1;
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var object = goog.object;

var BioSymbol = ag.bio.BioSymbol;
var BioSymbolGroup = ag.bio.BioSymbolGroup;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * Adds bioSymbol to this group (or replaces an existing version if it already exists).
 *
 * No two BioSymbols with the same symbol character may be present in a group at the same time. Therefore, this method
 * adds bioSymbol to the group if it does not already have an entry for its symbol. Otherwise, it replaces that entry
 * in the hash with the BioSymbol passed into this method.
 *
 * @param {BioSymbol} bioSymbol
 */
BioSymbolGroup.prototype.add = function(bioSymbol) {
    var symbol = bioSymbol.symbol();
    this.bioSymbols_[symbol] = bioSymbol;
    this.bioSymbolSerialNumbers_[symbol] = this.serialNo_++;

    return this;
};

/** @return {Object.<string,BioSymbol>} */
BioSymbolGroup.prototype.bioSymbols = function() {
    return this.bioSymbols_;
};

BioSymbolGroup.prototype.clear = function() {
    object.clear(this.bioSymbols_);
    object.clear(this.bioSymbolSerialNumbers_);
    this.serialNo_ = 1;
};

/** @return {number} */
BioSymbolGroup.prototype.count = function() {
    return object.getCount(this.bioSymbols_);
};

/**
 * @param {string} ch
 * @param {string} symbol
 * @return {boolean}
 */
BioSymbolGroup.prototype.isCharAssociatedWithSymbol = function(ch, symbol) {
    var bioSymbol = this.bioSymbols_[symbol];
    return goog.isDef(bioSymbol) && bioSymbol.hasCharacter(ch);
};

/** @return {boolean} */
BioSymbolGroup.prototype.isEmpty = function() {
    return this.serialNo_ === 1;
};

/** @param {string} symbol */
BioSymbolGroup.prototype.removeBioSymbol = function(symbol) {
    delete this.bioSymbols_[symbol];
};

/** @return {Array.<string>} */
BioSymbolGroup.prototype.orderedSymbols = function() {
    var pairs = [];
    for (var symbol in this.bioSymbolSerialNumbers_)
        pairs.push([symbol, this.bioSymbolSerialNumbers_[symbol]]);
    pairs.sort(function(a, b) {
        if (a[1] < b[1])
            return -1;
        else if (a[1] > b[1])
            return 1;

        return 0;
    });

    var result = new Array(pairs.length);
    for (var i=0, z=pairs.length; i<z; i++)
        result[i] = pairs[i][0];
    return result;
};

/**
 * @param {string} ch
 *
 * @return {number}
 */
BioSymbolGroup.prototype.serialNumber = function(ch) {
    var no = this.bioSymbolSerialNumbers_[ch];
    return no ? no : 0;
};

/**
 * @param {number} newThreshold
 */
BioSymbolGroup.prototype.setThresholdForAllBioSymbols = function(newThreshold) {
    for (var symbol in this.bioSymbols_)
        this.bioSymbols_[symbol].setThreshold(newThreshold);
};

/** @return {Array.<BioSymbol>} */
BioSymbolGroup.prototype.toArray = function() {
    var orderedSymbols = this.orderedSymbols();

    var result = new Array(orderedSymbols.length);
    for (var i=0, z=orderedSymbols.length; i<z; i++) {
        var symbol = orderedSymbols[i];
        result[i] = this.bioSymbols_[symbol];
    }

    return result;
};

/*******************************************************************************************************************/});
