goog.provide('ag.commands.SlideMsaRectCommand');

goog.require('ag.commands.SkipFirstRedoCommand');
goog.require('ag.core.UnitRect');

goog.require('goog.asserts');

/**
 * @constructor
 * @extends {ag.commands.SkipFirstRedoCommand}
 * @param {ag.ui.MsaView} msaView
 * @param {ag.core.UnitRect} msaRect
 * @param {number} delta
 * @param {ag.undoredo.UndoCommand} [optParentCommand]
 */
ag.commands.SlideMsaRectCommand = function(msaView, msaRect, delta, optParentCommand) {
    goog.asserts.assert(goog.isDefAndNotNull(msaView));
    goog.base(this, 'Slide rectangle ' + msaRect + ' ' + delta + ' positions', optParentCommand);

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
     * @type {number}
     * @private
     */
    this.delta_ = delta;

    this.invertOp_();
};
goog.inherits(ag.commands.SlideMsaRectCommand, ag.commands.SkipFirstRedoCommand);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var SlideMsaRectCommand = ag.commands.SlideMsaRectCommand;

// --------------------------------------------------------------------------------------------------------------------
// Destructor
/** @override */
SlideMsaRectCommand.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    this.msaRect_.release();
    delete this.msaRect_;
    delete this.msaView_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
SlideMsaRectCommand.prototype.undo = function() {
    this.msaView_.msa().slideRect(this.msaRect_, this.delta_);
    this.invertOp_();
    this.msaView_.setSelection(this.msaRect_);
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
SlideMsaRectCommand.prototype.doRedo = SlideMsaRectCommand.prototype.undo;

// --------------------------------------------------------------------------------------------------------------------
/** @private */
SlideMsaRectCommand.prototype.invertOp_ = function() {
    this.msaRect_.moveLeft(this.msaRect_.x1 + this.delta_);
    this.delta_ = -this.delta_;
};

/*******************************************************************************************************************/});
