/**
 * @fileoverview: MsaSubseqModel defines the model interface for managing the subseqs associated with an Msa.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.model.MsaSubseqModel');

goog.require('ag.bio.ObservableMsa');
goog.require('ag.meta.MetaObject');
goog.require('ag.model.AbstractItemModel');

goog.require('goog.asserts');

/**
 * @constructor
 * @extends {ag.model.AbstractItemModel}
 * @param {ag.bio.ObservableMsa} [optMsa]
 */
ag.model.MsaSubseqModel = function(optMsa) {
    goog.base(this);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.bio.ObservableMsa|undefined}
     * @private
     */
    this.msa_;

    this.setMsa(optMsa);
};
goog.inherits(ag.model.MsaSubseqModel, ag.model.AbstractItemModel);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var ModelIndex = ag.model.ModelIndex;
var MsaSubseqModel = ag.model.MsaSubseqModel;

var DataRole = ag.model.AbstractItemModel.DataRole;
var SignalType = ag.model.AbstractItemModel.SignalType;
var MsaSignals = ag.bio.ObservableMsa.SignalType;

var metaObject = ag.meta.MetaObject.getInstance;

/** @enum {number} */
MsaSubseqModel.Columns = {
    Name: 0,

    _TOTAL: 1
};

// --------------------------------------------------------------------------------------------------------------------
/** @override */
MsaSubseqModel.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    this.unwatchMsa_();

    delete this.msa_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {ag.bio.ObservableMsa|undefined} */
MsaSubseqModel.prototype.msa = function() {
    return this.msa_;
};

/**
 * @param {ag.bio.ObservableMsa} [optMsa]
 */
MsaSubseqModel.prototype.setMsa = function(optMsa) {
    if (this.msa_ === optMsa)
        return;

    this.beginResetModel();
    this.unwatchMsa_();
    this.msa_ = optMsa;
    this.watchMsa_();
    this.endResetModel();
};

// --------------------------------------------------------------------------------------------------------------------
// Reimplemented public functions
/** @override */
MsaSubseqModel.prototype.columnCount = function() {
    return MsaSubseqModel.Columns._TOTAL;
};

/** @override */
MsaSubseqModel.prototype.data = function(index, role) {
    if (!this.isValidIndex(index))
        return null;

    // role = goog.isNumber(role) ? role : DataRole.kDisplay;

    return this.msa_.at(index.row() + 1).name;
};

/** @override */
MsaSubseqModel.prototype.rowCount = function() {
    return this.msa_ ? this.msa_.rowCount() : 0;
};

/** @override */
MsaSubseqModel.prototype.setData = function(index, newValue, optRole) {
    if (!this.isValidIndex(index))
        return false;

    var oldData = this.data(index, optRole);
    if (oldData === newValue)
        return true;

    this.msa_.at(index.row() + 1).name = /** @type {string} */ (newValue);
    this.emit(SignalType.DATA_CHANGED, index);

    return true;
};

// --------------------------------------------------------------------------------------------------------------------
// Private slots
/**
 * @param {ag.core.ClosedIntRange} rows
 * @private
 */
MsaSubseqModel.prototype.onRowsAboutToBeInserted_ = function(rows) {
    this.beginInsertRows(rows.begin - 1, rows.end - 1);
};

/**
 * @param {ag.core.ClosedIntRange} rows
 * @param {number} finalRow
 * @private
 */
MsaSubseqModel.prototype.onRowsAboutToBeMoved_ = function(rows, finalRow) {
    var modelDestRow = (finalRow < rows.begin) ? finalRow - 1
        : finalRow + rows.length() - 1;
    this.beginMoveRows(rows.begin - 1, rows.end - 1, modelDestRow);
};

/**
 * @param {ag.core.ClosedIntRange} rows
 * @private
 */
MsaSubseqModel.prototype.onRowsAboutToBeRemoved_ = function(rows) {
    this.beginRemoveRows(rows.begin - 1, rows.end - 1);
};

/** @private */
MsaSubseqModel.prototype.onRowsInserted_ = function() {
    this.endInsertRows();
};

/** @private */
MsaSubseqModel.prototype.onRowsMoved_ = function() {
    this.endMoveRows();
};

/** @private */
MsaSubseqModel.prototype.onRowsRemoved_ = function() {
    this.endRemoveRows();
};

/**
 * @param {ag.bio.MsaSubseqChangeArray} changes
 * @private
 */
MsaSubseqModel.prototype.onSubseqsChanged_ = function(changes) {

};

// --------------------------------------------------------------------------------------------------------------------
// Private functions
/** @private */
MsaSubseqModel.prototype.unwatchMsa_ = function() {
    if (this.msa_) {
        var mo = metaObject();
        mo.disconnect(this.msa_, MsaSignals.ABOUT_TO_BE_SORTED, this, SignalType.LAYOUT_ABOUT_TO_BE_CHANGED);
        mo.disconnect(this.msa_, MsaSignals.SORTED, this, SignalType.LAYOUT_CHANGED);
        mo.disconnect(this.msa_, MsaSignals.ROWS_ABOUT_TO_BE_INSERTED, this, this.onRowsAboutToBeInserted_);
        mo.disconnect(this.msa_, MsaSignals.ROWS_ABOUT_TO_BE_MOVED, this, this.onRowsAboutToBeMoved_);
        mo.disconnect(this.msa_, MsaSignals.ROWS_ABOUT_TO_BE_REMOVED, this, this.onRowsAboutToBeRemoved_);
        mo.disconnect(this.msa_, MsaSignals.ROWS_INSERTED, this, this.onRowsInserted_);
        mo.disconnect(this.msa_, MsaSignals.ROWS_MOVED, this, this.onRowsMoved_);
        mo.disconnect(this.msa_, MsaSignals.ROWS_REMOVED, this, this.onRowsRemoved_);
        mo.disconnect(this.msa_, MsaSignals.SUBSEQS_CHANGED, this, this.onSubseqsChanged_);
    }
};

/** @private */
MsaSubseqModel.prototype.watchMsa_ = function() {
    if (this.msa_) {
        metaObject()
            .connect(this.msa_, MsaSignals.ABOUT_TO_BE_SORTED, this, SignalType.LAYOUT_ABOUT_TO_BE_CHANGED)
            .connect(this.msa_, MsaSignals.SORTED, this, SignalType.LAYOUT_CHANGED)
            .connect(this.msa_, MsaSignals.ROWS_ABOUT_TO_BE_INSERTED, this, this.onRowsAboutToBeInserted_)
            .connect(this.msa_, MsaSignals.ROWS_ABOUT_TO_BE_MOVED, this, this.onRowsAboutToBeMoved_)
            .connect(this.msa_, MsaSignals.ROWS_ABOUT_TO_BE_REMOVED, this, this.onRowsAboutToBeRemoved_)
            .connect(this.msa_, MsaSignals.ROWS_INSERTED, this, this.onRowsInserted_)
            .connect(this.msa_, MsaSignals.ROWS_MOVED, this, this.onRowsMoved_)
            .connect(this.msa_, MsaSignals.ROWS_REMOVED, this, this.onRowsRemoved_)
            .connect(this.msa_, MsaSignals.SUBSEQS_CHANGED, this, this.onSubseqsChanged_);
    }
};

/*******************************************************************************************************************/});
