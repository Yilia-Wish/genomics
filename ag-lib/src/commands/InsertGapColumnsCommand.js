goog.provide('ag.commands.InsertGapColumnsCommand');

goog.require('ag.commands.SkipFirstRedoCommand');
goog.require('ag.core.ClosedIntRange');

goog.require('goog.asserts');

/**
 * @constructor
 * @extends {ag.commands.SkipFirstRedoCommand}
 * @param {ag.bio.Msa} msa
 * @param {number} column
 * @param {number} count
 * @param {ag.undoredo.UndoCommand} [optParentCommand]
 */
ag.commands.InsertGapColumnsCommand = function(msa, column, count, optParentCommand) {
    goog.asserts.assert(goog.isDefAndNotNull(msa));
    var text = "Insert gap columns (" + column + " - " + column + count - 1 + ")";
    goog.base(this, text, optParentCommand);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
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
     * @type {number}
     * @private
     */
    this.count_ = count;
};
goog.inherits(ag.commands.InsertGapColumnsCommand, ag.commands.SkipFirstRedoCommand);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var ClosedIntRange = ag.core.ClosedIntRange;
var InsertGapColumnsCommand = ag.commands.InsertGapColumnsCommand;

// --------------------------------------------------------------------------------------------------------------------
/** @override */
InsertGapColumnsCommand.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    delete this.msa_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
InsertGapColumnsCommand.prototype.undo = function() {
    this.msa_.removeGapColumns(new ClosedIntRange(this.column_, this.column_ + this.count_ - 1));
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
InsertGapColumnsCommand.prototype.doRedo = function() {
    this.msa_.insertGapColumns(this.column_, this.count_);
};


/*******************************************************************************************************************/});
