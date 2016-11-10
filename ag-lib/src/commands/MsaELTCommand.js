goog.provide('ag.commands.MsaELTCommand');

goog.require('ag.undoredo.UndoCommand');

goog.require('goog.asserts');
goog.require('goog.string');

/**
 * @constructor
 * @extends {ag.undoredo.UndoCommand}
 * @param {ag.commands.MsaELTCommand.Type} type
 * @param {ag.bio.Msa} msa
 * @param {number} column
 * @param {ag.core.ClosedIntRange} rows
 * @param {ag.commands.MsaELTCommand.Direction} direction
 * @param {ag.undoredo.UndoCommand} [optParentCommand]
 */
ag.commands.MsaELTCommand = function(type, msa, column, rows, direction, optParentCommand) {
    goog.base(this, null, optParentCommand);

    goog.asserts.assert(msa);
    goog.asserts.assert(msa.isValidRowRange(rows));
    goog.asserts.assert(msa.isValidColumn(column));

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.commands.MsaELTCommand.Type}
     * @private
     */
    this.type_ = type;

    /**
     * @type {ag.bio.Msa}
     * @private
     */
    this.msa_ = msa;

    /**
     * @type {number}
     * @private
     */
    this.column_ = column;

    /**
     * @type {ag.core.ClosedIntRange}
     * @private
     */
    this.rows_ = rows;

    /**
     * @type {ag.commands.MsaELTCommand.Direction}
     * @private
     */
    this.direction_ = direction;

    /**
     * @type {ag.bio.MsaSubseqChangeArray}
     * @private
     */
    this.changes_;

    var typeText = (type === ag.commands.MsaELTCommand.Type.Extend) ? 'Extend' :
                   (type === ag.commands.MsaELTCommand.Type.Level) ? 'Level' :
                   'Trim';

    this.setText(goog.string.subs(typeText + " rows (%1 - %2) %3 to column %4", rows.begin, rows.end, direction === ag.commands.MsaELTCommand.Direction.Left ? "left" : "right", column));
};
goog.inherits(ag.commands.MsaELTCommand, ag.undoredo.UndoCommand);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var MsaELTCommand = ag.commands.MsaELTCommand;

/** @enum {number} */
MsaELTCommand.Type = {
    Extend: 0,
    Level: 1,
    Trim: 2
};

/** @enum {number} */
MsaELTCommand.Direction = {
    Left: 0,
    Right: 1
};

// --------------------------------------------------------------------------------------------------------------------
/** @override */
MsaELTCommand.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    delete this.msa_;
    delete this.rows_;
    delete this.changes_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
MsaELTCommand.prototype.redo = function() {
    if (this.type_ === MsaELTCommand.Type.Extend) {
        this.changes_ = (this.direction_ === MsaELTCommand.Direction.Left) ?
            this.msa_.extendLeft(this.column_, this.rows_) :
            this.msa_.extendRight(this.column_, this.rows_);
    }
    else if (this.type_ === MsaELTCommand.Type.Level) {
        this.changes_ = (this.direction_ === MsaELTCommand.Direction.Left) ?
            this.msa_.levelLeft(this.column_, this.rows_) :
            this.msa_.levelRight(this.column_, this.rows_);
    }
    else {
        this.changes_ = (this.direction_ === MsaELTCommand.Direction.Left) ?
            this.msa_.trimLeft(this.column_, this.rows_) :
            this.msa_.trimRight(this.column_, this.rows_);
    }
};

/** @override */
MsaELTCommand.prototype.undo = function() {
    this.msa_.undo(this.changes_);
    this.changes_ = null;
};

/*******************************************************************************************************************/});
