goog.provide('ag.commands.SkipFirstRedoCommand');

goog.require('ag.undoredo.UndoCommand');

/**
 * @constructor
 * @extends {ag.undoredo.UndoCommand}
 * @param {?string} optText
 * @param {ag.undoredo.UndoCommand} [optParentCommand]
 */
ag.commands.SkipFirstRedoCommand = function(optText, optParentCommand) {
    goog.base(this, null, optParentCommand);

    /**
     * @type {boolean}
     * @private
     */
    this.firstTime_ = true;
};
goog.inherits(ag.commands.SkipFirstRedoCommand, ag.undoredo.UndoCommand);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var SkipFirstRedoCommand = ag.commands.SkipFirstRedoCommand;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
SkipFirstRedoCommand.prototype.redo = function() {
    if (!this.firstTime_)
        goog.base(this, 'redo');

    this.firstTime_ = false;
};

/*******************************************************************************************************************/});
