/**
 * @fileoverview ObservableMsa simply extends Msa with signals such that clients may observe and react to any
 *   changes.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.bio.ObservableMsa');

goog.require('ag.bio.Msa');
goog.require('ag.core.ClosedIntRange');
goog.require('ag.meta.MetaObject');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.events');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.bio.Msa}
 * @param {ag.bio.grammar=} optGrammar
 */
ag.bio.ObservableMsa = function(optGrammar) {
    goog.base(this, optGrammar);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {boolean}
     * @private
     */
    this.modified_ = false;
};
goog.inherits(ag.bio.ObservableMsa, ag.bio.Msa);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;
var events = goog.events;

var metaObject = ag.meta.MetaObject.getInstance;
var ClosedIntRange = ag.core.ClosedIntRange;
var ObservableMsa = ag.bio.ObservableMsa;

// --------------------------------------------------------------------------------------------------------------------
// Static properties
/** @enum {string} */
ObservableMsa.SignalType = {
    // ClosedIntRange
    ROWS_ABOUT_TO_BE_INSERTED: events.getUniqueId('rows-about-to-be-inserted'),
    // ClosedIntRange
    ROWS_INSERTED: events.getUniqueId('rows-inserted'),
    // UnitRect
    ABOUT_TO_BE_COLLAPSED_LEFT: events.getUniqueId('about-to-be-collapsed-left'),
    // UnitRect
    COLLAPSED_LEFT: events.getUniqueId('collapsed-left'),
    // UnitRect
    ABOUT_TO_BE_COLLAPSED_RIGHT: events.getUniqueId('about-to-be-collapsed-right'),
    // UnitRect
    COLLAPSED_RIGHT: events.getUniqueId('collapsed-right'),
    // MsaSubseqChangeArray
    SUBSEQS_CHANGED: events.getUniqueId('subseqs-changed'),
    // ClosedIntRange
    GAP_COLUMNS_ABOUT_TO_BE_INSERTED: events.getUniqueId('gap-columns-about-to-be-inserted'),
    // ClosedIntRange
    GAP_COLUMNS_INSERTED: events.getUniqueId('gap-columns-inserted'),
    // ClosedIntRange, finalRow
    ROWS_ABOUT_TO_BE_MOVED: events.getUniqueId('rows-about-to-be-moved'),
    // ClosedIntRange, finalRow
    ROWS_MOVED: events.getUniqueId('rows-moved'),
    // ClosedIntRange
    ROWS_ABOUT_TO_BE_REMOVED: events.getUniqueId('rows-about-to-be-removed'),
    // ClosedIntRange
    ROWS_REMOVED: events.getUniqueId('rows-removed'),
    // Array.<ClosedIntRange>
    GAP_COLUMNS_REMOVED: events.getUniqueId('gap-columns-removed'),
    // boolean
    MODIFIED_CHANGED: events.getUniqueId('modified-changed'),
    // UnitRect, delta, finalRange
    ABOUT_TO_BE_SLID: events.getUniqueId('about-to-be-slid'),
    // UnitRect, delta, finalRange
    SLID: events.getUniqueId('slid'),
    ABOUT_TO_BE_SORTED: events.getUniqueId('about-to-be-sorted'),
    SORTED: events.getUniqueId('sorted')
};
var SignalType = ObservableMsa.SignalType;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
ObservableMsa.prototype.insert = function(subseqs, optRow) {
    var row = goog.isNumber(optRow) ? optRow : 1;
    assert(row > 0 && row <= this.rowCount() + 1, 'row out of range');
    if (!this.isCompatible(subseqs))
        return false;

    if (!goog.isArray(subseqs))
        subseqs = [subseqs];

    var endRow = row + subseqs.length - 1;
    var insertRange = new ClosedIntRange(row, endRow);

    metaObject().emit(this, SignalType.ROWS_ABOUT_TO_BE_INSERTED, insertRange);
    array.insertArrayAt(this.subseqs_, subseqs, row - 1);
    metaObject().emit(this, SignalType.ROWS_INSERTED, insertRange);

    return true;
};

/** @override */
ObservableMsa.prototype.clear = function() {
    if (this.isEmpty())
        return;

    var allRows = new ClosedIntRange(1, this.rowCount());
    metaObject().emit(this, SignalType.ROWS_ABOUT_TO_BE_REMOVED, allRows);
    goog.base(this, 'clear');       // Important that Msa.clear does not call removeRows or
                                    // we will double up on the signals emitted.
    metaObject().emit(this, SignalType.ROWS_REMOVED, allRows);
};

/** @override */
ObservableMsa.prototype.collapseLeft = function(rect) {
    var normRect = rect.normalized();
    metaObject().emit(this, SignalType.ABOUT_TO_BE_COLLAPSED_LEFT, normRect);
    var changes = goog.base(this, 'collapseLeft', rect);
    metaObject().emit(this, SignalType.COLLAPSED_LEFT, normRect);
    metaObject().emit(this, SignalType.SUBSEQS_CHANGED, changes);

    return changes;
};

/** @override */
ObservableMsa.prototype.collapseRight = function(rect) {
    var normRect = rect.normalized();
    metaObject().emit(this, SignalType.ABOUT_TO_BE_COLLAPSED_RIGHT, normRect);
    var changes = goog.base(this, 'collapseRight', rect);
    metaObject().emit(this, SignalType.COLLAPSED_RIGHT, normRect);
    metaObject().emit(this, SignalType.SUBSEQS_CHANGED, changes);

    return changes;
};

/** @override */
ObservableMsa.prototype.extendLeft = function(column, rows) {
    var changes = goog.base(this, 'extendLeft', column, rows);
    if (changes.length)
        metaObject().emit(this, SignalType.SUBSEQS_CHANGED, changes);
    return changes;
};

/** @override */
ObservableMsa.prototype.extendRight = function(column, rows) {
    var changes = goog.base(this, 'extendRight', column, rows);
    if (changes.length)
        metaObject().emit(this, SignalType.SUBSEQS_CHANGED, changes);
    return changes;
};

/** @override */
ObservableMsa.prototype.insertGapColumns = function(column, count, optGapChar) {
    if (count === 0)
        return;

    var range = new ClosedIntRange(column, column + count - 1);
    metaObject().emit(this, SignalType.GAP_COLUMNS_ABOUT_TO_BE_INSERTED, range);
    goog.base(this, 'insertGapColumns', column, count, optGapChar);
    metaObject().emit(this, SignalType.GAP_COLUMNS_INSERTED, range);
};

/** @return {boolean} */
ObservableMsa.prototype.isModified = function() {
    return this.modified_;
};

/** @override */
ObservableMsa.prototype.levelLeft = function(column, rows) {
    var changes = goog.base(this, 'levelLeft', column, rows);
    if (changes.length)
        metaObject().emit(this, SignalType.SUBSEQS_CHANGED, changes);
    return changes;
};

/** @override */
ObservableMsa.prototype.levelRight = function(column, rows) {
    var changes = goog.base(this, 'levelRight', column, rows);
    if (changes.length)
        metaObject().emit(this, SignalType.SUBSEQS_CHANGED, changes);
    return changes;
};

/** @override */
ObservableMsa.prototype.moveRow = function(from, to) {
    assert(this.isValidRow(from), 'from out of range');
    assert(to > 0 && to < this.rowCount() + 1, 'to out of range');
    if (from !== to) {
        var range = new ClosedIntRange(from);
        metaObject().emit(this, SignalType.ROWS_ABOUT_TO_BE_MOVED, range, to);
        goog.base(this, 'moveRow', from, to);
        metaObject().emit(this, SignalType.ROWS_MOVED, range, to);
    }
};

/** @override */
ObservableMsa.prototype.moveRowRange = function(rows, to) {
    assert(this.isValidRowRange(rows), 'rows out of range');
    assert(to > 0 && to <= this.rowCount() + 1, 'to out of range');
    if (to === rows.begin)
        return;

    metaObject().emit(this, SignalType.ROWS_ABOUT_TO_BE_MOVED, rows, to);
    goog.base(this, 'moveRowRange', rows, to);
    metaObject().emit(this, SignalType.ROWS_MOVED, rows, to);
};

/** @override */
ObservableMsa.prototype.removeAt = function(row) {
    var range = new ClosedIntRange(row);
    metaObject().emit(this, SignalType.ROWS_ABOUT_TO_BE_REMOVED, range);
    goog.base(this, 'removeAt', row);
    metaObject().emit(this, SignalType.ROWS_REMOVED, range);
};

/** @override */
ObservableMsa.prototype.removeGapColumns = function(optColumns) {
    var columnRanges = goog.base(this, 'removeGapColumns', optColumns);
    if (columnRanges.length)
        metaObject().emit(this, SignalType.GAP_COLUMNS_REMOVED, columnRanges);
    return columnRanges;
};

/** @override */
ObservableMsa.prototype.removeRows = function(rows) {
    metaObject().emit(this, SignalType.ROWS_ABOUT_TO_BE_REMOVED, rows);
    goog.base(this, 'removeRows', rows);
    metaObject().emit(this, SignalType.ROWS_REMOVED, rows);
};

/**
 * @param {boolean} optModified defaults to true
 */
ObservableMsa.prototype.setModified = function(optModified) {
    var modified = goog.isDefAndNotNull(optModified) ? optModified : true;
    if (modified === this.modified_)
        return;

    this.modified_ = modified;
    metaObject().emit(this, SignalType.MODIFIED_CHANGED, modified);
};

/** @override */
ObservableMsa.prototype.setSubseqStart = function(row, newStart) {
    var change = goog.base(this, 'setSubseqStart', row, newStart);
    if (change.row)
        metaObject().emit(this, SignalType.SUBSEQS_CHANGED, [change]);
    return change;
};

/** @override */
ObservableMsa.prototype.setSubseqStop = function(row, newStop) {
    var change = goog.base(this, 'setSubseqStop', row, newStop);
    if (change.row)
        metaObject().emit(this, SignalType.SUBSEQS_CHANGED, [change]);
    return change;
};

/** @override */
ObservableMsa.prototype.doSlide_ = function(top, bottom, columns, delta, sourceRect) {
    // It is safe to assume that we can move delta positions
    var finalRange = new ClosedIntRange();
    finalRange.begin = columns.begin + delta;
    finalRange.end = columns.end + delta;

    metaObject().emit(this, SignalType.ABOUT_TO_BE_SLID, sourceRect, delta, finalRange);
    goog.base(this, 'doSlide_', top, bottom, columns, delta, sourceRect);
    metaObject().emit(this, SignalType.SLID, sourceRect, delta, finalRange);
};

/** @override */
ObservableMsa.prototype.sort = function(callback) {
    metaObject().emit(this, SignalType.ABOUT_TO_BE_SORTED);
    goog.base(this, 'sort', callback);
    metaObject().emit(this, SignalType.SORTED);
};

/** @override */
ObservableMsa.prototype.takeRows = function(rows) {
    metaObject().emit(this, SignalType.ROWS_ABOUT_TO_BE_REMOVED, rows);
    var result = goog.base(this, 'takeRows', rows);
    metaObject().emit(this, SignalType.ROWS_REMOVED, rows);

    return result;
};

/** @override */
ObservableMsa.prototype.trimLeft = function(column, rows) {
    var changes = goog.base(this, 'trimLeft', column, rows);
    if (changes.length)
        metaObject().emit(this, SignalType.SUBSEQS_CHANGED, changes);
    return changes;
};

/** @override */
ObservableMsa.prototype.trimRight = function(column, rows) {
    var changes = goog.base(this, 'trimRight', column, rows);
    if (changes.length)
        metaObject().emit(this, SignalType.SUBSEQS_CHANGED, changes);
    return changes;
};

/** @override */
ObservableMsa.prototype.undo = function(changes) {
    var effectiveChanges = goog.base(this, 'undo', changes);
    if (effectiveChanges.length)
        metaObject().emit(this, SignalType.SUBSEQS_CHANGED, effectiveChanges);
    return effectiveChanges;
};

/*******************************************************************************************************************/});
