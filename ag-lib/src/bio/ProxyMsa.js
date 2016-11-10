/**
 * @fileoverview: ProxyMsa enables seamless working with subsets of a source Msa. This is most useful when
 *   for hiding sequences.
 *
 * Note: for optimization/timeliness purposes, ProxyMsa does not fully satisfy the requirements of a proxy. Namely,
 * if an action is performed directly on this msa, it appropriately modifies the relevant elements (because modifying
 * methods such as slideRect access the relevant subseqs using the at() method, which is overridden in this class to
 * map to the appropriate source subseq) and emits the appropriate signals for this instance; however, the source msa
 * will not emit the appropriate signals.
 *
 * Consequences:
 * o It is not accurate with the current implementation to have multiple views onto the same source msa where
 *   manipulation is performed through a proxy msa.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.bio.ProxyMsa');

goog.require('ag.bio.NullMsa');
goog.require('ag.bio.ObservableMsa');
goog.require('ag.core.RangeSet');
goog.require('ag.core.UnitRect');
goog.require('ag.meta.MetaObject');

goog.require('ag.util');

goog.require('goog.asserts');

ag.bio.ProxyMsa = function(optGrammar) {
    goog.base(this, optGrammar);

    this.hiddenSourceRows_ = new ag.core.RangeSet();

    /**
     * @type {ag.bio.NullMsa|ag.bio.ObservableMsa}
     * @private
     */
    this.sourceMsa_ = new ag.bio.NullMsa();

    /**
     * Maps proxy rows to source rows
     *
     * @type {Array.<number>}
     * @private
     */
    this.proxyToSource_ = [];

    this.tmpRangeSet_ = new ag.core.RangeSet();

    this.tmpRect_ = new ag.core.UnitRect();
};
goog.inherits(ag.bio.ProxyMsa, ag.bio.ObservableMsa);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var ObservableMsa = ag.bio.ObservableMsa;
var ProxyMsa = ag.bio.ProxyMsa;
var UnitRect = ag.core.UnitRect;

var metaObject = ag.meta.MetaObject.getInstance;
var util = ag.util;

// --------------------------------------------------------------------------------------------------------------------
// Simple proxies
/** @override */
ProxyMsa.prototype.at = function(proxyRow) {    return this.sourceMsa_.at(this.proxyToSource_[proxyRow-1]);     };
/** @override */
ProxyMsa.prototype.columnCount = function() {    return sourceMsa_.columnCount();   };
/** @override */
ProxyMsa.prototype.clear = function() {             this.sourceMsa_.clear();    };
/** @override */
ProxyMsa.prototype.grammar = function() {           return this.sourceMsa_.grammar();   };
/** @override */
ProxyMsa.prototype.insert = function(subseqs, optRow) {
    // TODO: map optRow to source row insertion point
    return this.sourceMsa_.insert(subseqs, optRow);
};

// When inserting gap columns, insert in all sequences of the source msa
/** @override */
ProxyMsa.prototype.insertGapColumns = function(column, count, optGapChar) {
    return this.sourceMsa_.insertGapColumns(column, count, optGapChar);
};

/** @override */
ProxyMsa.prototype.moveRow = function(from, to) {
    assert(this.isValidRow(from));
    assert(to > 0 && to < this.rowCount() + 1);
    this.sourceMsa_.moveRow(this.mapToSource(from), this.mapToSource(to));
};

/** @override */
ProxyMsa.prototype.moveRowRange = function(rows, to) {
    assert(this.isValidRowRange(rows), 'rows out of range');
    assert(to > 0 && to <= this.rowCount() + 1, 'to out of range');
    this.sourceMsa_.moveRowRange(this.mapRowsToSource(rows), this.mapToSource(to));
};

/** @override */
ProxyMsa.prototype.removeAt = function(row) {
    assert(this.isValidRow(row), 'row out of range');
    this.sourceMsa_.removeAt(this.mapToSource(row));
};
/** @override */
ProxyMsa.prototype.removeGapColumns = function(optColumns) {    return this.sourceMsa_.removeGapColumns(optColumns);    };
/** @override */
ProxyMsa.prototype.removeRows = function(rows) {    this.sourceMsa_.removeRows(this.mapRowsToSource(rows));     };
/** @override */
ProxyMsa.prototype.rowCount = function() {      return this.proxyToSource_.length;      };
/** @override */
ProxyMsa.prototype.sort = function() {    assert(false, 'Not implemented');     };

// --------------------------------------------------------------------------------------------------------------------
// More complex proxies
/** @override */
ProxyMsa.prototype.collapseLeft = function(proxyRect) {
    var rect = this.tmpRect_;
    rect.x1 = proxyRect.x1;
    rect.x2 = proxyRect.x2;
    var sourceMsa = this.sourceMsa_;
    this.forEachSourceRowsIn_(proxyRect, function(sourceFrom, sourceTo) {
        rect.y1 = sourceFrom;
        rect.y2 = sourceTo;
        sourceMsa.collapseLeft(rect);
    });
};

/** @override */
ProxyMsa.prototype.members = function() {
    var subseqs = new Array(this.rowCount());
    for (var i=0, z=subseqs.length; i<z; i++)
        subseqs[i] = this.at(i+1);
    return subseqs;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
ProxyMsa.prototype.mapToSource = function(proxyRow) {
    assert(this.isValidRow(proxyRow), 'proxy row out of range');

    return this.proxyToSource_[proxyRow-1];

    // Option B: using hidden row ranges
    /*
    var sourceRow = proxyRow;
    var ranges = this.hiddenSourceRows_.ranges();
    for (var i=0, z=ranges.length; i<z && i<proxyRow; i++)
        sourceRow += ranges[i].length();
    return sourceRow;
    */
};

ProxyMsa.prototype.mapFromSource = function(sourceRow) {
    assert(this.sourceMsa_.isValidRow(sourceRow), 'source row out of range');

    // Option B: using hidden row ranges
    var proxyRow = sourceRow;
    var ranges = this.hiddenSourceRows_.ranges();
    for (var i=0, z=ranges.length; i<z; i++) {
        var range = ranges[i];
        if (range.begin > sourceRow)
            break;
        else if (range.end >= sourceRow)
            return 0;

        proxyRow -= ranges[i].length();
    }
    return proxyRow;
};

ProxyMsa.prototype.setSourceMsa = function(newMsa) {
    // Disconnect signals

    this.sourceMsa_ = goog.isDef(newMsa) ? newMsa : new ag.bio.NullMsa();

    // Connect signals

    // Build the mapping
    this.hiddenSourceRows_.clear();
    this.rebuildProxyToSource_();
};

ProxyMsa.prototype.setRowsVisible = function(sourceRows, optVisible) {
    var visible = goog.isDef(optVisible) ? optVisible : true;
    if (!visible)
        this.hiddenSourceRows_.merge(sourceRows);
    else
        this.hiddenSourceRows_.subtract(sourceRows);

    this.rebuildProxyToSource_();
};

// --------------------------------------------------------------------------------------------------------------------
// Private event handlers
ProxyMsa.prototype.onSourceMsaAboutToBeCollapsedLeft_ = function(sourceRect) {
    this.tmpRect_ = this.mapRectFromSource_(sourceRect);
    if (this.tmpRect_)
        metaObject.emit(this, ObservableMsa.SignalType.ABOUT_TO_BE_COLLAPSED_LEFT, this.tmpRect_);
};

ProxyMsa.prototype.collapsedLeft_ = function(sourceRect) {
    if (this.tmpRect_) {
        metaObject.emit(this, ObservableMsa.SignalType.COLLAPSED_LEFT, this.tmpRect_);
        this.resetTmpRect_();
    }
};

ProxyMsa.prototype.onSourceMsaAboutToBeCollapsedRight_ = function(sourceRect) {
    this.tmpRect_ = this.mapRectFromSource_(sourceRect);
    if (this.tmpRect_)
        metaObject.emit(this, ObservableMsa.SignalType.ABOUT_TO_BE_COLLAPSED_RIGHT, this.tmpRect_);
};

ProxyMsa.prototype.collapsedRight_ = function(sourceRect) {
    if (this.tmpRect_) {
        metaObject.emit(this, ObservableMsa.SignalType.COLLAPSED_RIGHT, this.tmpRect_);
        this.resetTmpRect_();
    }
};

ProxyMsa.prototype.onSourceMsaAboutToBeSlid_ = function(sourceRect, delta, finalRange) {
    this.tmpRect_ = this.mapRectFromSource_(sourceRect);
    if (this.tmpRect_)
        metaObject.emit(this, ObservableMsa.SignalType.ABOUT_TO_BE_SLID, this.tmpRect_, delta, finalRange);
};

ProxyMsa.prototype.onSourceMsaSlid_ = function(sourceRect, delta, finalRange) {
    if (this.tmpRect_) {
        metaObject.emit(this, ObservableMsa.SignalType.SLID,  this.tmpRect_, delta, finalRange);
        this.resetTmpRect_();
    }
};

// --------------------------------------------------------------------------------------------------------------------
// Private functions
ProxyMsa.prototype.resetTmpRect_ = function() {
    this.tmpRect_.release();
    this.tmpRect_ = null;
}

ProxyMsa.prototype.rebuildProxyToSource_ = function() {
    var nSourceRows = this.sourceMsa_.rowCount();
    this.proxyToSource_.length = nSourceRows - this.hiddenSourceRows_.summedLength();

    var proxyRow = 1;
    var sourceRow = 1;
    var hiddenRanges = this.hiddenSourceRows_.ranges();
    for (var i=0, z=hiddenRanges.length; i<z; i++) {
        var range = hiddenRanges[i];
        for (; sourceRow < range.begin; ++sourceRow, ++proxyRow)
            this.proxyToSource_[proxyRow-1] = sourceRow;
        sourceRow = range.end + 1;
    }
    for (; sourceRow<=nSourceRows; ++sourceRow, ++proxyRow)
        this.proxyToSource_[proxyRow-1] = sourceRow;
};

ProxyMsa.prototype.mapRowsToSource = function(rows) {
    var sourceRows = new ClosedIntRange();
    sourceRows.begin = this.mapToSource(rows.begin);
    sourceRows.end = this.mapToSource(rows.end);
    return sourceRows;
};

ProxyMsa.prototype.mapRectFromSource_ = function(sourceRect) {
    if (this.hiddenSourceRows_.isEmpty())
        return sourceRect.createCopy();

    var proxyRect;
    this.tmpRangeSet_.clear();
    this.tmpRangeSet_.merge(sourceRect.verticalRange());
    this.tmpRangeSet_.subtract(this.hiddenSourceRows_);
    if (!this.tmpRangeSet_.isEmpty()) {
        var bounds = this.tmpRangeSet_.boundingRange();
        proxyRect = sourceRect.createCopy();
        proxyRect.y1 = this.mapFromSource(bounds.begin);
        proxyRect.y2 = this.mapFromSource(bounds.end);
    }
    return proxyRect;
};

ProxyMsa.prototype.unwatchMsa_ = function() {

};

ProxyMsa.prototype.watchMsa_ = function() {
    metaObject().connect(this.sourceMsa_, ObservableMsa.SignalType.GAP_COLUMNS_ABOUT_TO_BE_INSERTED, this, ObservableMsa.SignalType.GAP_COLUMNS_ABOUT_TO_BE_INSERTED)
        .connect(this.sourceMsa_, ObservableMsa.SignalType.GAP_COLUMNS_INSERTED, this, ObservableMsa.SignalType.GAP_COLUMNS_INSERTED)
        .connect(this.sourceMsa_, ObservableMsa.SignalType.GAP_COLUMNS_REMOVED, this, ObservableMsa.SignalType.GAP_COLUMNS_REMOVED)

        .connect(this.sourceMsa_, ObservableMsa.SignalType.ABOUT_TO_BE_SLID, this, this.onSourceMsaAboutToBeSlid_)
        .connect(this.sourceMsa_, ObservableMsa.SignalType.SLID, this, this.onSourceMsaSlid_);
};

ProxyMsa.prototype.forEachSourceRowsIn_ = function(proxyRect, callback) {
    assert(this.isValidRect(proxyRect));
    var top = proxyRect.y1;
    var bottom = proxyRect.y2;
    if (!proxyRect.isNormal()) {
        top = proxyRect.y2;
        bottom = proxyRect.y1;
    }

    var x = this.mapToSource(top);
    var y = x;
    for (var i=top+1; i<= bottom; i++) {
        var sourceRow = this.mapToSource(i);
        if (y + 1 === sourceRow)
            ++y;
        else {
            callback(x, y);
            x = y = sourceRow;
        }
    }
    callback(x, y);
};

ProxyMsa.prototype.sourceRanges_ = function(proxyRect) {
    var top = proxyRect.y1;
    var bottom = proxyRect.y2;
    if (!proxyRect.isNormal()) {
        top = proxyRect.y2;
        bottom = proxyRect.y1;
    }

    var ranges = [new ClosedIntRange(this.mapToSource(top))];
    for (var i=top; i<= bottom; i++) {
        var sourceRow = this.mapToSource(i);
        var lastRange = ranges.last();
        if (lastRange.end + 1 === sourceRow)
            lastRange.end++;
        else
            ranges.push(new ClosedIntRange(sourceRow));
    }
    return ranges;
};

/*******************************************************************************************************************/});
