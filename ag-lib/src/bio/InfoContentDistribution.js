goog.provide('ag.bio.InfoContentDistribution');
goog.provide('ag.bio.InfoUnit');

goog.require('ag.core.CharCountDistribution');
goog.require('ag.core.ClosedIntRange');
goog.require('ag.meta.MetaObject');

goog.require('goog.array');
goog.require('goog.asserts');

/**
 * @constructor
 * @param {string|number} [optCh] defaults to 0
 * @param {number} [optPercent] percentage this character occurs; defaults to 0
 * @param {number} [optInfo] information contributed by this character; defaults to 0
 */
ag.bio.InfoUnit = function(optCh, optPercent, optInfo) {
    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {string|number}
     */
    this.ch = goog.isDef(optCh) ? optCh : 0;

    /**
     * @type {number}
     */
    this.percent = goog.isDef(optPercent) ? optPercent : 0;

    /**
     * @type {number}
     */
    this.info = goog.isDef(optInfo) ? optInfo : 0;

    goog.asserts.assert(this.percent >= 0 && this.percent <= 1);
    goog.asserts.assert(this.info >= 0);
};

/** @typedef {Array.<Array.<InfoUnit>>} */
ag.bio.ArrayArrayInfoUnit;

/**
 * @constructor
 * @param {ag.core.CharCountDistribution} distribution
 * @param {number} possibleLetters
 * @param {boolean} [optSmallSampleErrorCorrection] defaults to true
 */
ag.bio.InfoContentDistribution = function(distribution, possibleLetters, optSmallSampleErrorCorrection) {
    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.core.CharCountDistribution}
     * @private
     */
    this.distribution_ = distribution;

    /**
     * @type {number}
     * @private
     */
    this.possibleLetters_ = possibleLetters;

    /**
     * @type {boolean}
     * @private
     */
    this.smallSampleErrorCorrection_ = goog.isBoolean(optSmallSampleErrorCorrection) ? optSmallSampleErrorCorrection : true;

    /**
     * @type {ArrayArrayInfoUnit}
     * @private
     */
    this.infoContent_;

    /**
     * @type {number}
     * @private
     */
    this.maxInfo_;

    /**
     * @type {number}
     * @private
     */
    this.smallSampleErrorFactor_;

    this.constructor_();
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;

var CharCountDistribution = ag.core.CharCountDistribution;
var ClosedIntRange = ag.core.ClosedIntRange;
var InfoContentDistribution = ag.bio.InfoContentDistribution;
var InfoUnit = ag.bio.InfoUnit;

var metaObject = ag.meta.MetaObject.getInstance;

// --------------------------------------------------------------------------------------------------------------------
/** @enum {string} */
InfoContentDistribution.SignalType = {
    // ClosedIntRange
    COLUMNS_INSERTED: 'columns-inserted',
    // ClosedIntRange
    COLUMNS_REMOVED: 'columns-removed',
    // ClosedIntRange
    DATA_CHANGED: 'data-changed'
};

// --------------------------------------------------------------------------------------------------------------------
/**
 * @param {InfoUnit} a
 * @param {InfoUnit} b
 * @return {boolean}
 */
InfoUnit.infoSortFn = function(a, b) {
    if (a.info < b.info)
        return -1;
    else if (a.info > b.info)
        return 1;

    return 0;
};

/**
 * @param {number} n
 * @return {number}
 */
InfoContentDistribution.log2 = function(n) {
    return Math.log(n) / Math.LN2;
};

// --------------------------------------------------------------------------------------------------------------------
/** @private */
InfoContentDistribution.prototype.constructor_ = function() {
    assert(this.possibleLetters_ > 0);
    this.maxInfo_ = InfoContentDistribution.log2(this.possibleLetters_);
    this.smallSampleErrorFactor_ = (this.possibleLetters_ - 1) / (2 * Math.LN2);
    this.infoContent_ = this.computeInfoContent();

    metaObject().connect(this.distribution_, CharCountDistribution.SignalType.COLUMNS_INSERTED, this, this.onSourceColumnsInserted_)
        .connect(this.distribution_, CharCountDistribution.SignalType.COLUMNS_REMOVED, this, this.onSourceColumnsRemoved_)
        .connect(this.distribution_, CharCountDistribution.SignalType.DATA_CHANGED, this, this.onSourceDataChanged_);
};

InfoContentDistribution.prototype.dispose = function() {
    metaObject().disconnect(this.distribution_, CharCountDistribution.SignalType.COLUMNS_INSERTED, this, this.onSourceColumnsInserted_);
    metaObject().disconnect(this.distribution_, CharCountDistribution.SignalType.COLUMNS_REMOVED, this, this.onSourceColumnsRemoved_);
    metaObject().disconnect(this.distribution_, CharCountDistribution.SignalType.DATA_CHANGED, this, this.onSourceDataChanged_);

    delete this.distribution_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {CharCountDistribution} */
InfoContentDistribution.prototype.distribution = function() {
    return this.distribution_;
};

/**
 * @return {ArrayArrayInfoUnit}
 */
InfoContentDistribution.prototype.infoContent = function() {
    return this.infoContent_;
};

/**
 * @param {number} column 1-based
 * @return {number}
 */
InfoContentDistribution.prototype.totalColumnInfo = function(column) {
    assert(column > 0 && column <= this.length(), 'column out of range');
    var columnIC = this.infoContent_[column-1];
    var sum = 0;
    for (var i=0, z=columnIC.length; i<z; i++)
        sum += columnIC[i].info;
    return sum;
};

/** @return {number} */
InfoContentDistribution.prototype.length = function() {
    return this.infoContent_.length;
};

/** @return {number} */
InfoContentDistribution.prototype.maxInfo = function() {
    return this.maxInfo_;
};

/** @return {number} */
InfoContentDistribution.prototype.possibleLetters = function() {
    return this.possibleLetters_;
};

/**
 * @param {boolean} [optEnabled] defaults to true
 */
InfoContentDistribution.prototype.setSmallSampleErrorCorrectionEnabled = function(optEnabled) {
    var enabled = goog.isDef(optEnabled) ? optEnabled : true;
    if (enabled !== this.smallSampleErrorCorrection_) {
        this.smallSampleErrorCorrection_ = enabled;
        if (this.distribution_.length() > 0) {
            this.infoContent_ = this.computeInfoContent();
            metaObject().emit(this, InfoContentDistribution.SignalType.DATA_CHANGED, new ClosedIntRange(1, this.length()));
        }
    }
};

/** @return {number} */
InfoContentDistribution.prototype.smallSampleErrorCorrection = function() {
    return this.smallSampleErrorCorrection_;
};

/** @return {number} */
InfoContentDistribution.prototype.totalInfo = function() {
    var sum = 0;
    for (var i=1, z=this.length(); i<=z; i++)
        sum += this.totalColumnInfo(i);
    return sum;
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/**
 * @param {ag.core.ClosedIntRange} [optRange] defaults to the entire distribution length
 * @protected
 */
InfoContentDistribution.prototype.computeInfoContent = function(optRange) {
    var begin = 1;
    var end = this.distribution().length();
    if (end === 0)
        return [];

    if (optRange) {
        begin = optRange.begin;
        end = optRange.end;
    }

    assert(begin > 0 && begin <= end && end <= this.distribution().length(), 'Invalid range');
    var result = new Array(end - begin + 1);
    for (var i=begin-1, j=0; i< end; i++, j++) {
        var columnIC = [];
        result[j] = columnIC;
        var nLettersInColumn = 0;
        var entropy = 0;

        var columnCounts = this.distribution().charCounts()[i];
        for (var ch in columnCounts) {
            var nCh = columnCounts[ch];
            nLettersInColumn += nCh;
            var percent = nCh / this.distribution().divisor();
            columnIC.push(new InfoUnit(ch, percent));
            entropy += percent * InfoContentDistribution.log2(percent);
        }

        var error = this.smallSampleErrorCorrection_ ? this.smallSampleErrorFactor_ / nLettersInColumn : 0;
        var totalColumnInfo = Math.max(0, this.maxInfo_ + entropy - error);
        for (var k=0, z=columnIC.length; k<z; k++)
            columnIC[k].info = columnIC[k].percent * totalColumnInfo;

        array.stableSort(columnIC, InfoUnit.infoSortFn);
    }
    return result;
};


// --------------------------------------------------------------------------------------------------------------------
// Private slots
/**
 * @param {ag.core.ClosedIntRange} range
 * @private
 */
InfoContentDistribution.prototype.onSourceColumnsInserted_ = function(range) {
    var addition = this.computeInfoContent(range);
    assert(addition.length === range.length());
    array.insertArrayAt(this.infoContent_, addition, range.begin - 1);
    metaObject().emit(this, InfoContentDistribution.SignalType.COLUMNS_INSERTED, range);
};

/**
 * @param {ag.core.ClosedIntRange} range
 * @private
 */
InfoContentDistribution.prototype.onSourceColumnsRemoved_ = function(range) {
    this.infoContent_.splice(range.begin - 1, range.length());
    metaObject().emit(this, InfoContentDistribution.SignalType.COLUMNS_REMOVED, range);
};

/**
 * @param {ag.core.ClosedIntRange} range
 * @private
 */
InfoContentDistribution.prototype.onSourceDataChanged_ = function(range) {
    var replacement = this.computeInfoContent(range);
    var i = replacement.length;
    while (i--)
        this.infoContent_[range.begin - 1 + i] = replacement[i];
    metaObject().emit(this, InfoContentDistribution.SignalType.DATA_CHANGED, range);
};

/*******************************************************************************************************************/});
