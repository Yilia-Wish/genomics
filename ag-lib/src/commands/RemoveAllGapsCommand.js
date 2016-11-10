goog.provide('ag.commands.RemoveAllGapsCommand');

goog.require('ag.commands.SkipFirstRedoCommand');

goog.require('goog.asserts');

/**
 * @constructor
 * @extends {ag.commands.SkipFirstRedoCommand}
 * @param {ag.bio.Msa} msa
 * @param {Array.<ag.core.ClosedIntRange>} removedColumnRanges
 * @param {ag.undoredo.UndoCommand} [optParentCommand]
 */
ag.commands.RemoveAllGapsCommand = function(msa, removedColumnRanges, optParentCommand) {
    goog.asserts.assert(goog.isDefAndNotNull(msa));
    goog.asserts.assert(goog.isArray(removedColumnRanges) && removedColumnRanges.length > 0);
    goog.base(this, "Remove all gap columns", optParentCommand);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.bio.Msa}
     * @private
     */
    this.msa_ = msa;

    /**
     * @type {Array.<ag.core.ClosedIntRange>}
     * @private
     */
    this.removedColumnRanges_ = removedColumnRanges;
};
goog.inherits(ag.commands.RemoveAllGapsCommand, ag.commands.SkipFirstRedoCommand);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var RemoveAllGapsCommand = ag.commands.RemoveAllGapsCommand;

// --------------------------------------------------------------------------------------------------------------------
/** @override */
RemoveAllGapsCommand.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    delete this.msa_;
    delete this.removedColumnRanges_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
RemoveAllGapsCommand.prototype.doRedo = function() {
    this.msa_.removeGapColumns();
};

/** @override */
RemoveAllGapsCommand.prototype.undo = function() {
    for (var i=0, z=this.removedColumnRanges_.length; i<z; i++) {
        var range = this.removedColumnRanges_[i];
        this.msa_.insertGapColumns(range.begin, range.length());
    }
};

/*******************************************************************************************************************/});
