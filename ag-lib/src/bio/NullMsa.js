goog.provide('ag.bio.NullMsa');

goog.require('ag.bio.ObservableMsa');

/**
 * @constructor
 * @extends {ag.bio.ObservableMsa}
 */
ag.bio.NullMsa = function() {
    goog.base(this);
};
goog.inherits(ag.bio.NullMsa, ag.bio.ObservableMsa);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var NullMsa = ag.bio.NullMsa;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
NullMsa.prototype.insert = function() {
    assert(false, 'Method not allowed');
};

/** @override */
NullMsa.prototype.rowCount = function() {
    return 0;
};


/*******************************************************************************************************************/});
