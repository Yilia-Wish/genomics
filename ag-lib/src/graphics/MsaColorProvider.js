/**
 * @fileoverview: MsaColorProvider defines a abstract and default concrete implementation for returning colors based
 * on a specific position within a user-supplied Msa.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.graphics.MsaColorProvider');

goog.require('goog.asserts');

/**
 * @constructor
 * @param {ag.bio.Msa} [optMsa]
 */
ag.graphics.MsaColorProvider = function(optMsa) {
    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.bio.Msa|undefined}
     * @protected
     */
    this.msa_ = optMsa;
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var MsaColorProvider = ag.graphics.MsaColorProvider;

/** @const {string} */
MsaColorProvider.kDefaultColors = '000000ffffff';


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * @param {number} row
 * @param {number} column
 * @return {string}
 */
MsaColorProvider.prototype.colors = function(row, column) {
    return MsaColorProvider.kDefaultColors;
};

/**
 * @param {number} row
 * @param {number} left
 * @param {number} right
 * @param {Array=} optOutArray
 * @return {Array.<string>}
 */
MsaColorProvider.prototype.colorsArray = function(row, left, right, optOutArray) {
    assert(!optOutArray || optOutArray.length >= right - left + 1);
    var result = optOutArray ? optOutArray : new Array(right - left + 1);

    var i=result.length;
    while (i--)
        result[i] = MsaColorProvider.kDefaultColors;

    return result;
};

/**
 * @param {ag.bio.Msa} msa
 */
MsaColorProvider.prototype.setMsa = function(msa) {
    this.msa_ = msa;
};


/*******************************************************************************************************************/});
