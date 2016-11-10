goog.provide('ag.commands.SetMsaSelectionCommand');

goog.require('ag.commands.SkipFirstRedoCommand');

goog.require('goog.asserts');

/**
 * @constructor
 * @extends {ag.commands.SkipFirstRedoCommand}
 * @param {ag.ui.MsaView} msaView
 * @param {ag.core.UnitRect} msaRect
 * @param {ag.undoredo.UndoCommand} [optParentCommand]
 */
ag.commands.SetMsaSelectionCommand = function(msaView, msaRect, optParentCommand) {
    goog.asserts.assert(goog.isDefAndNotNull(msaView));
    goog.base(this, 'Set selection: ' + msaRect, optParentCommand);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.ui.MsaView}
     * @private
     */
    this.msaView_ = msaView;

    /**
     * @type {ag.core.UnitRect}
     * @private
     */
    this.msaRect_ = msaRect.createCopy();

    /**
     * @type {ag.core.UnitRect}
     * @private
     */
    this.oldSelection_ = msaView.selection() ? msaView.selection().createCopy() : null;
};
goog.inherits(ag.commands.SetMsaSelectionCommand, ag.commands.SkipFirstRedoCommand);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var SetMsaSelectionCommand = ag.commands.SetMsaSelectionCommand;

// --------------------------------------------------------------------------------------------------------------------
// Destructor
/** @override */
SetMsaSelectionCommand.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    this.msaRect_.release();
    delete this.msaRect_;
    delete this.msaView_;

    if (this.oldSelection_)
        this.oldSelection_.release();
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
SetMsaSelectionCommand.prototype.undo = function() {
    this.msaView_.setSelection(this.msaRect_);
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
SetMsaSelectionCommand.prototype.doRedo = function() {
    this.msaView_.setSelection(this.oldSelection_);
};

/*******************************************************************************************************************/});
