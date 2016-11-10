goog.provide('ag.commands.CollapseCommand');

goog.require('ag.undoredo.UndoCommand');

goog.require('goog.asserts');
goog.require('goog.string');

/**
 * @constructor
 * @extends {ag.undoredo.UndoCommand}
 * @param {ag.bio.Msa} msa
 * @param {ag.core.UnitRect} msaRect
 * @param {ag.commands.CollapseCommand.Direction} direction
 * @param {ag.undoredo.UndoCommand} [optParentCommand]
 */
ag.commands.CollapseCommand = function(msa, msaRect, direction, optParentCommand) {
    goog.base(this, null, optParentCommand);

    goog.asserts.assert(msa);
    goog.asserts.assert(msa.isValidRect(msaRect));

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.bio.Msa}
     * @private
     */
    this.msa_ = msa;

    /**
     * @type {ag.core.UnitRect}
     * @private
     */
    this.msaRect_ = ag.core.UnitRect.create();
    this.msaRect_.assign(msaRect);

    /**
     * @type {ag.commands.CollapseCommand.Direction}
     * @private
     */
    this.direction_ = direction;

    /**
     * @type {ag.bio.MsaSubseqChangeArray}
     * @private
     */
    this.changes_;

    this.setText(goog.string.subs("Collapse %1 ([%2, %3],  [%4, %5])", direction === ag.commands.CollapseCommand.Direction.Left ? "left" : "right", msaRect.x1, msaRect.y1, msaRect.x2, msaRect.y2));
};
goog.inherits(ag.commands.CollapseCommand, ag.undoredo.UndoCommand);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var CollapseCommand = ag.commands.CollapseCommand;

/** @enum {number} */
CollapseCommand.Direction = {
    Left: 0,
    Right: 1
};

// --------------------------------------------------------------------------------------------------------------------
/** @override */
CollapseCommand.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    delete this.msa_;
    this.msaRect_.release();
    delete this.msaRect_;
    delete this.changes_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
CollapseCommand.prototype.redo = function() {
    this.changes_ = (this.direction_ === CollapseCommand.Direction.Left) ?
        this.msa_.collapseLeft(this.msaRect_) :
        this.msa_.collapseRight(this.msaRect_);
};

/** @override */
CollapseCommand.prototype.undo = function() {
    this.msa_.undo(this.changes_);
    this.changes_ = null;
};

/*******************************************************************************************************************/});
