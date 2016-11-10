goog.provide('ag.bio.MsaSubseqChange');

goog.require('ag.bio.BioString');
goog.require('ag.core.ClosedIntRange');

goog.require('goog.asserts');

/**
 * @constructor
 * @param {number} [optRow]
 * @param {ag.core.ClosedIntRange} [optColumns]
 * @param {ag.bio.MsaSubseqChange.TrimExtOp} [optOperation] defaults to extend left
 * @param {ag.bio.BioString} [optDifference]
 */
ag.bio.MsaSubseqChange = function(optRow, optColumns, optOperation, optDifference) {
    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {number}
     */
    this.row = goog.isNumber(optRow) ? optRow : 0;

    /**
     * @type {ag.core.ClosedIntRange}
     */
    this.columns = goog.isDefAndNotNull(optColumns) ? optColumns : new ag.core.ClosedIntRange();

    /**
     * @type {ag.bio.MsaSubseqChange.TrimExtOp}
     */
    this.operation = goog.isNumber(optOperation) ? optOperation : ag.bio.MsaSubseqChange.TrimExtOp.eExtendLeft;

    /**
     * @type {ag.bio.BioString}
     */
    this.difference = (optDifference) ? optDifference : new ag.bio.BioString();

    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    if (optDifference)
        goog.asserts.assert(this.columns.length() === this.difference.length());
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var MsaSubseqChange = ag.bio.MsaSubseqChange;

/** @typedef {Array.<MsaSubseqChange>} */
ag.bio.MsaSubseqChangeArray;

/** @enum {number} */
MsaSubseqChange.TrimExtOp = {
    eExtendLeft: 0,
    eExtendRight: 1,
    eTrimLeft: 2,
    eTrimRight: 3,
    eInternal: 4
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * @param {MsaSubseqChange} other
 * @return {boolean}
 */
MsaSubseqChange.prototype.eq = function(other) {
    return this.row === other.row &&
        this.columns.eq(other.columns) &&
        this.operation === other.operation &&
        this.difference.eq(other.difference);
};


/*******************************************************************************************************************/});
