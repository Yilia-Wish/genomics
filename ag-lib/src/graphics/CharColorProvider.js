goog.provide('ag.graphics.CharColorProvider');

goog.require('ag.graphics.MsaColorProvider');

goog.require('goog.asserts');

/**
 * @constructor
 * @extends {ag.graphics.MsaColorProvider}
 * @param {ag.graphics.CharColorScheme} scheme
 * @param {ag.bio.Msa} [optMsa]
 */
ag.graphics.CharColorProvider = function(scheme, optMsa) {
    goog.base(this, optMsa);

    this.scheme_ = scheme;
};
goog.inherits(ag.graphics.CharColorProvider, ag.graphics.MsaColorProvider);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var CharColorProvider = ag.graphics.CharColorProvider;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
CharColorProvider.prototype.colors = function(row, column) {
    assert(this.msa_);
    var asciiCh = this.msa_.at(row).at(column);
    return this.scheme_.colors(asciiCh);
};

/** @override */
CharColorProvider.prototype.colorsArray = function(row, left, right, optOutArray) {
    assert(this.msa_);
    assert(!optOutArray || optOutArray.length >= right - left + 1);

    var result = optOutArray ? optOutArray : new Array(right - left + 1);

    var buffer = this.msa_.at(row).constBuffer();
    for (var i=left-1, z=right, j=0; i<z; ++i, ++j) {
        var asciiCh = buffer[i];
        result[j] = this.scheme_.colors(asciiCh);
    }

    return result;
};

/*******************************************************************************************************************/});
