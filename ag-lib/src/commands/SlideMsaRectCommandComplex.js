/**
 * Performs an extendable slide in one command; however, it is easier to simply chain the individual commands
 * into a group to accomplish the same effect.
 */
goog.provide('ag.commands.SlideMsaRectCommandComplex');

goog.require('ag.commands.SkipFirstRedoCommand');
goog.require('ag.core.UnitRect');
goog.require('ag.core.ClosedIntRange');

goog.require('goog.asserts');

/**
 * @constructor
 * @extends {ag.commands.SkipFirstRedoCommand}
 * @param {ag.ui.MsaView} msaView
 * @param {ag.core.UnitRect} msaRect
 * @param {number} delta must be the amount moved internally without having to add terminal gaps; may be zero
 * @param {number} terminalGaps amount of terminal gaps added to fully accommodate the slide; may be zero
 * @param {ag.undoredo.UndoCommand} [optParentCommand]
 */
ag.commands.SlideMsaRectCommandComplex = function(msaView, msaRect, delta, terminalGaps, optParentCommand) {
    goog.asserts.assert(goog.isDefAndNotNull(msaView));
    goog.base(this, 'Slide rectangle [(' + msaRect.x1 + ', ' + msaRect.y1 + '), (' + msaRect.x2 + ', ' + msaRect.y2 + ')] ' + delta + ' positions', optParentCommand);

    goog.asserts.assert(terminalGaps !== 0 || delta !== 0);
    goog.asserts.assert(terminalGaps === 0 || delta === 0 || (delta > 0 && terminalGaps > 0) || (delta < 0 && terminalGaps < 0));

    // console.log('Delta: ' + delta + '; termgaps: ' + terminalGaps);

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
    this.msaRect_ = ag.core.UnitRect.create();
    this.msaRect_.assign(msaRect);
    this.msaRect_.normalize();

    /**
     * @type {number}
     * @private
     */
    this.delta_ = delta;

    /**
     * @type {number}
     * @private
     */
    this.terminalGaps_ = terminalGaps;

    /**
     * @type {number}
     * @private
     */
    this.direction_ = (this.delta_ < 0 || this.terminalGaps_ < 0) ? -1 : 1;
};
goog.inherits(ag.commands.SlideMsaRectCommandComplex, ag.commands.SkipFirstRedoCommand);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var SlideMsaRectCommandComplex = ag.commands.SlideMsaRectCommandComplex;
var UnitRect = ag.core.UnitRect;
var ClosedIntRange = ag.core.ClosedIntRange;

// --------------------------------------------------------------------------------------------------------------------
// Destructor
/** @override */
SlideMsaRectCommandComplex.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    this.msaRect_.release();
    delete this.msaRect_;
    delete this.msaView_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
SlideMsaRectCommandComplex.prototype.redoDelegate = function() {
    var tmpRect = UnitRect.create();
    tmpRect.assign(this.msaRect_);

    if (this.direction_ < 0) {
        if (this.terminalGaps_ < 0) {
            // Insert gap columns where appropriate
            this.msaView_.msa().insertGapColumns(1, -this.terminalGaps_);

            // Slide remainder
            tmpRect.x2 = tmpRect.x1 + -this.terminalGaps_ - 1 - -this.delta_;
            tmpRect.x1 = -this.terminalGaps_ + 1;
            this.msaView_.msa().slideRect(tmpRect, this.terminalGaps_);
        }

        // Slide the original portion
        tmpRect.x1 = this.msaRect_.x1 + -this.terminalGaps_;
        tmpRect.setWidth(this.msaRect_.width());
        this.msaView_.msa().slideRect(tmpRect, this.delta_ + this.terminalGaps_);

        // Setup the selection coordinates
        tmpRect.shift(this.delta_ + this.terminalGaps_, 0);
    }
    else {
        if (this.terminalGaps_ > 0) {
            var oldColumnCount = this.msaView_.msa().columnCount();

            // Insert gap columns
            this.msaView_.msa().insertGapColumns(oldColumnCount + 1, this.terminalGaps_);

            // Move the remaining block
            tmpRect.x1 = tmpRect.x2 + 1 + this.delta_;
            tmpRect.x2 = oldColumnCount;
            this.msaView_.msa().slideRect(tmpRect, this.terminalGaps_);
        }

        // Slide the original portion
        this.msaView_.msa().slideRect(this.msaRect_, this.delta_ + this.terminalGaps_);

        // Setup the selection coordinates
        tmpRect.assign(this.msaRect_);
        tmpRect.shift(this.delta_ + this.terminalGaps_, 0);
    }

    this.msaView_.setSelection(tmpRect);

    tmpRect.release();
};

/** @override */
SlideMsaRectCommandComplex.prototype.undo = function() {
    var tmpRect = UnitRect.create();
    tmpRect.assign(this.msaRect_);

    if (this.direction_ < 0) {
        tmpRect.shift(this.delta_, 0);
        this.msaView_.msa().slideRect(tmpRect, -this.delta_ + -this.terminalGaps_);

        if (this.terminalGaps_ < 0) {
            // Slide the remainder forwards
            tmpRect.x2 = tmpRect.x1 - 1;
            tmpRect.x1 = 1;
            this.msaView_.msa().slideRect(tmpRect, -this.terminalGaps_);

            // Remove the leading gap columns
            this.msaView_.msa().removeGapColumns(new ClosedIntRange(1, -this.terminalGaps_));
        }
    }
    else {
        // Slide original backwards
        tmpRect.shift(this.delta_ + this.terminalGaps_, 0);
        this.msaView_.msa().slideRect(tmpRect, -this.delta_ + -this.terminalGaps_);

        if (this.terminalGaps_ > 0) {
            // Slide remainder backwards
            var columnCount = this.msaView_.msa().columnCount();
            tmpRect.x1 = tmpRect.x2 + 1;
            tmpRect.x2 = columnCount;
            this.msaView_.msa().slideRect(tmpRect, -this.terminalGaps_);

            // Remove the terminal gaps
            this.msaView_.msa().removeGapColumns(new ClosedIntRange(columnCount - this.terminalGaps_ + 1, columnCount));
        }
    }

    // Update the selection
    this.msaView_.setSelection(this.msaRect_);

    tmpRect.release();
};


/*******************************************************************************************************************/});
