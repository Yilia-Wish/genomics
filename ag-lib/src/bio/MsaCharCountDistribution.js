/**
 * @fileoverview: Encapsulates and maintains a current representation of the character count distribution
 * within a MSA.
 *
 * If a valid msa is provided upon construction, its character count distribution is immediately computed and stored
 * as a private member. Moreover, the distribution is updated whenever the MSA is modified in such a way as to change
 * the character count distribution.
 *
 * Automatically removes zero value keys as distribution is updated.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.bio.MsaCharCountDistribution');

goog.require('ag.bio');
goog.require('ag.bio.MsaSubseqChange');
goog.require('ag.bio.ObservableMsa');
goog.require('ag.core.CharCountDistribution');
goog.require('ag.core.ClosedIntRange');
goog.require('ag.core.UnitRect');
goog.require('ag.meta.MetaObject');

goog.require('goog.asserts');
goog.require('goog.events');

/**
 * @constructor
 * @extends {ag.core.CharCountDistribution}
 * @param {ag.bio.ObservableMsa} msa
 */
ag.bio.MsaCharCountDistribution = function(msa) {
    goog.base(this);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.bio.ObservableMsa}
     * @private
     */
    this.msa_ = msa;

    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    this.constructor_();
};
goog.inherits(ag.bio.MsaCharCountDistribution, ag.core.CharCountDistribution);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var events = goog.events;

var metaObject = ag.meta.MetaObject.getInstance;
var isGapCharacterCode = ag.bio.isGapCharacterCode;

var CharCountDistribution = ag.core.CharCountDistribution;
var ClosedIntRange = ag.core.ClosedIntRange;
var MsaCharCountDistribution = ag.bio.MsaCharCountDistribution;
var MsaSubseqChangeArray = ag.bio.MsaSubseqChangeArray;
var ObservableMsa = ag.bio.ObservableMsa;
var UnitRect = ag.core.UnitRect;

var MsaSignals = ObservableMsa.SignalType;
var DistSignals = CharCountDistribution.SignalType;
var TrimExtOp = ag.bio.MsaSubseqChange.TrimExtOp;

// --------------------------------------------------------------------------------------------------------------------
// Constructor
/**
 * @private
 */
MsaCharCountDistribution.prototype.constructor_ = function() {
    if (!this.msa_)
        return;

    var msa = this.msa_;
    var mo = metaObject();
    mo.connect(msa, MsaSignals.GAP_COLUMNS_INSERTED, this, this.onGapColumnsInserted_)
        .connect(msa, MsaSignals.GAP_COLUMNS_REMOVED, this, this.onGapColumnsRemoved_)
        .connect(msa, MsaSignals.ABOUT_TO_BE_SLID, this, this.onAboutToBeSlid_)
        .connect(msa, MsaSignals.SLID, this, this.onSlid_)
        .connect(msa, MsaSignals.ROWS_ABOUT_TO_BE_REMOVED, this, this.onRowsAboutToBeRemoved_)
        .connect(msa, MsaSignals.ROWS_REMOVED, this, this.onRowsRemoved_)
        .connect(msa, MsaSignals.ROWS_INSERTED, this, this.onRowsInserted_)
        .connect(msa, MsaSignals.SUBSEQS_CHANGED, this, this.onSubseqsChanged_);

    this.charCounts_ = MsaCharCountDistribution.fromMsa(this.msa_).charCounts_;
};

// Destructor
MsaCharCountDistribution.prototype.dispose = function() {
    if (!this.msa_)
        return;

    var mo = metaObject();
    var msa = this.msa_;
    mo.disconnect(msa, MsaSignals.GAP_COLUMNS_INSERTED, this, this.onGapColumnsInserted_);
    mo.disconnect(msa, MsaSignals.GAP_COLUMNS_REMOVED, this, this.onGapColumnsRemoved_);
    mo.disconnect(msa, MsaSignals.ABOUT_TO_BE_SLID, this, this.onAboutToBeSlid_)
    mo.disconnect(msa, MsaSignals.SLID, this, this.onSlid_)
    mo.disconnect(msa, MsaSignals.ROWS_ABOUT_TO_BE_REMOVED, this, this.onRowsAboutToBeRemoved_);
    mo.disconnect(msa, MsaSignals.ROWS_REMOVED, this, this.onRowsRemoved_);
    mo.disconnect(msa, MsaSignals.ROWS_INSERTED, this, this.onRowsInserted_);
    mo.disconnect(msa, MsaSignals.SUBSEQS_CHANGED, this, this.onSubseqsChanged_);

    delete this.msa_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public static functions
/**
 * @param {ag.bio.Msa} msa
 * @param {ag.core.UnitRect=} optRect
 * @return {ag.core.CharCountDistribution}
 */
MsaCharCountDistribution.fromMsa = function(msa, optRect) {
    if (msa.isEmpty())
        return new CharCountDistribution();

    var rect = optRect ? optRect.normalized() : new UnitRect(1, 1, msa.columnCount(), msa.rowCount());
    assert(msa.isValidRect(rect));
    var left = rect.x1;
    var right = rect.x2;

    var dist = Array(rect.width());
    var i = dist.length;
    while (i--)
        dist[i] = {};

    i=rect.y1;
    for (var z=rect.y2; i<=z; ++i) {
        var buffer = msa.at(i).constBuffer();
        for (var j=left-1, k=0; j<right; ++j, ++k) {
            var ch = buffer[j];
            if (isGapCharacterCode(ch))
                continue;

            if (ch in dist[k])
                ++dist[k][ch];
            else
                dist[k][ch] = 1;
        }
    }

    return new CharCountDistribution(dist);
};


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
MsaCharCountDistribution.prototype.divisor = function() {
    return this.msa_ ? this.msa_.rowCount() : 1;
};

/** @return {ObservableMsa} */
MsaCharCountDistribution.prototype.msa = function() {
    return this.msa_;
};

// --------------------------------------------------------------------------------------------------------------------
// Private slots
/**
 * @param {ag.core.ClosedIntRange} columns
 * @private
 */
MsaCharCountDistribution.prototype.onGapColumnsInserted_ = function(columns) {
    this.insertBlanks(columns.begin, columns.length());
    metaObject().emit(this, DistSignals.COLUMNS_INSERTED, columns);
};

/**
 * @param {Array.<ag.core.ClosedIntRange>} columnRanges
 * @private
 */
MsaCharCountDistribution.prototype.onGapColumnsRemoved_ = function(columnRanges) {
    var i = columnRanges.length;
    while (i--) {
        var columns = columnRanges[i];
        this.remove(columns.begin, columns.length());
        metaObject().emit(this, DistSignals.COLUMNS_REMOVED, columns);
    }
};


/**
 * @param {UnitRect} rect
 * @param {number} delta
 * @param {ag.core.ClosedIntRange} finalRange
 * @private
 */
MsaCharCountDistribution.prototype.onAboutToBeSlid_ = function(rect, delta, finalRange) {
    var normRect = rect.normalized();
    var msa = this.msa_;

    var sourceRectAllGaps = msa.rectAllGaps(normRect);
    var normRect2;

    if (delta < 0) {
        if (sourceRectAllGaps || finalRange.end >= rect.x1 - 1)
            // This means that the final resting rect will be touching or even overlapping
            // the source rect. Only need to work with one rectangle.
            normRect.x1 = finalRange.begin;
        else
            // Create a separate rectangle
            normRect2 = new UnitRect();
    }
    else {
        if (sourceRectAllGaps || finalRange.begin <= rect.x2 + 1)
            normRect.x2 = finalRange.end;
        else
            normRect2 = new UnitRect();
    }

    var nNonGaps = 0;
    nNonGaps += this.subtract1_(normRect);
    if (normRect2) {
        normRect2.x1 = finalRange.begin;
        normRect2.y1 = normRect.y1;
        normRect2.x2 = finalRange.end;
        normRect2.y2 = normRect.y2;

        nNonGaps += this.subtract1_(normRect2);
    }
    if (!nNonGaps)
        // Purely moving gaps - nothing to change with the character count distribution
        return;

    this.removeZeroValueKeys();

    // Save the normalized data for consumption in the onSlid_ method so we don't have to
    // repeat this analysis.
    this.slideData__ = {
        normRect1: normRect,
        normRect2: normRect2
    };
};

/**
 * @param {UnitRect} normRect
 * @return {number} number of non gap characters subtracted
 * @private
 */
MsaCharCountDistribution.prototype.subtract1_ = function(normRect) {
    var nNonGaps = 0;

    var left = normRect.x1-1;
    var right = normRect.x2;
    for (var i=normRect.y1, z=normRect.y2; i<=z; ++i) {
        var buffer = this.msa_.at(i).constBuffer();
        for (var j=left; j<right; ++j) {
            var ch = buffer[j];
            if (!isGapCharacterCode(ch)) {
                this.charCounts_[j][ch]--;
                ++nNonGaps;
            }
        }
    }

    return nNonGaps;
};

/**
 * @param {UnitRect} rect
 * @param {number} delta
 * @param {ag.core.ClosedIntRange} finalRange
 * @private
 */
MsaCharCountDistribution.prototype.onSlid_ = function(rect, delta, finalRange) {
    if (!this.slideData__)
        return;

    this.add1_(this.slideData__.normRect1);
    this.add1_(this.slideData__.normRect2);

    var normRect1 = this.slideData__.normRect1;
    var normRect2 = this.slideData__.normRect2;
    delete this.slideData__;

    metaObject().emit(this, DistSignals.DATA_CHANGED, normRect1.horizontalRange());
    if (normRect2)
        metaObject().emit(this, DistSignals.DATA_CHANGED, normRect2.horizontalRange());
};

/**
 * @param {UnitRect} normRect
 * @private
 */
MsaCharCountDistribution.prototype.add1_ = function(normRect) {
    if (!normRect)
        return;

    var left = normRect.x1-1;
    var right = normRect.x2;
    for (var i=normRect.y1, z=normRect.y2; i<=z; ++i) {
        var buffer = this.msa_.at(i).constBuffer();
        for (var j=left; j<right; ++j) {
            var ch = buffer[j];
            var counts = this.charCounts_[j];
            if (!isGapCharacterCode(ch)) {
                if (ch in counts)
                    counts[ch]++;
                else
                    counts[ch] = 1;
            }
        }
    }
};

/**
 * Two possibilities:
 * o Msa will no longer have any sequences and the resulting distribution should be empty. Simply assign an empty value
 *   to the internal distribution. Emit the removed signal for the relevant columns
 * o Msa will still have sequences left - calculate the distribution for those sequences being removed and subtract
 *   this value from the internal distribution. Emit data changed signals in the onRowsRemoved handler.
 *
 * TODO:
 * OPTIMIZATION: If more than half are being removed, it is more efficient to recompute the distribution for the
 *               remaining members rather than calculate the distribution for those being removed and subtract this
 *               value from the internal distribution.
 *
 * This removed signal is not emitted until the rows removed signal has been processed.
 *
 * @param {ag.core.ClosedIntRange} rows
 * @private
 */
MsaCharCountDistribution.prototype.onRowsAboutToBeRemoved_ = function(rows) {
    var msa = this.msa_;
    var rowsSpanAllSequences = rows.begin === 1 && rows.end === msa.rowCount();
    if (!rowsSpanAllSequences) {
        var difference = MsaCharCountDistribution.fromMsa(msa, new UnitRect(1, rows.begin, msa.columnCount(), rows.length()));
        this.subtract(difference)
            .removeZeroValueKeys();
    }
    else {
        this.clear();
        metaObject().emit(this, DistSignals.COLUMNS_REMOVED, new ClosedIntRange(1, msa.columnCount()));
    }
};

/** @private */
MsaCharCountDistribution.prototype.onRowsRemoved_ = function() {
    if (this.msa_.rowCount())
        metaObject().emit(this, DistSignals.DATA_CHANGED, new ClosedIntRange(1, this.msa_.columnCount()));
};

/**
 * Two possibilities:
 * o Msa did not have any sequences beforehand in which case the distribution would have been empty. In this case,
 *   simply calculate the distribution for the entire alignment and assign this to the internal distribution.
 *   Emit columnsInserted signal
 * o Msa already had some sequences, calculate the distribution of the new sequences and add this to the existing
 *   values. Emits data changed signal for across the entire alignment.
 *
 * @param {ag.core.ClosedIntRange} rows
 * @private
 */
MsaCharCountDistribution.prototype.onRowsInserted_ = function(rows) {
    var msa = this.msa_;
    var signal;
    if (this.length()) {
        var difference = MsaCharCountDistribution.fromMsa(msa, new UnitRect(1, rows.begin, msa.columnCount(), rows.length()));
        this.add(difference);
        signal = DistSignals.DATA_CHANGED;
    }
    else {
        this.charCounts_ = MsaCharCountDistribution.fromMsa(msa).charCounts_;
        signal = DistSignals.COLUMNS_INSERTED;
    }
    metaObject().emit(this, signal, new ClosedIntRange(1, msa.columnCount()));
};

/**
 * @param {MsaSubseqChangeArray} changes
 * @private
 */
MsaCharCountDistribution.prototype.onSubseqsChanged_ = function(changes) {
    if (changes.isEmpty())
        return;

    var affectedColumns = new ClosedIntRange(this.msa_.columnCount(), 0);
    for (var i=0, z=changes.length; i<z; i++) {
        var change = changes[i];
        var changeBegin = change.columns.begin;
        var changeEnd = change.columns.end;
        var difference = change.difference;
        switch (change.operation) {
            case TrimExtOp.eExtendLeft:
            case TrimExtOp.eExtendRight:
                this.addBioString(difference, '-', changeBegin);
                break;
            case TrimExtOp.eTrimLeft:
            case TrimExtOp.eTrimRight:
                this.subtractBioString(difference, '-', changeBegin);
                break;
            case TrimExtOp.eInternal:
                this.subtractBioString(difference, '-', changeBegin);
                var current = this.msa_.at(change.row).mid(change.columns);
                this.addBioString(current, '-', changeBegin);
                break;

            default:
                continue;
        }

        if (changeBegin < affectedColumns.begin)
            affectedColumns.begin = changeBegin;
        if (changeEnd > affectedColumns.end)
            affectedColumns.end = changeEnd;
    }

    this.removeZeroValueKeys();
    metaObject().emit(this, DistSignals.DATA_CHANGED, affectedColumns);
};

/*******************************************************************************************************************/});
