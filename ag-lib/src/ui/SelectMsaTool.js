goog.provide('ag.ui.SelectMsaTool');

goog.require('ag');
goog.require('ag.core.Point');
goog.require('ag.core.UnitRect');
goog.require('ag.meta.MetaObject');
goog.require('ag.ui');
goog.require('ag.ui.AbstractMsaTool');
goog.require('ag.ui.Action');

goog.require('goog.asserts');
goog.require('goog.events');
goog.require('goog.events.BrowserEvent');
goog.require('goog.events.KeyCodes');
goog.require('goog.math.Coordinate');
goog.require('goog.structs.Set');
goog.require('goog.Timer');

goog.require('ag.core.ClosedIntRange');


/**
 * @constructor
 * @extends {ag.ui.AbstractMsaTool}
 * @param {ag.ui.MsaView} msaView
 */
ag.ui.SelectMsaTool = function(msaView) {
    goog.base(this, msaView, ag.ui.AbstractMsaTool.Type.Select);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {boolean}
     * @private
     */
    this.selectionIsActive_ = false;

    /**
     * @type {boolean}
     * @private
     */
    this.slideIsActive_ = false;

    /**
     * @type {ag.core.Point}
     * @private
     */
    this.lastMsaCursorPoint_ = new ag.core.Point();

    /**
     * Anchor point in msa space for the selection start.
     *
     * @type {ag.core.Point}
     * @private
     */
    this.selectAnchor_ = new ag.core.Point();

    /**
     * @type {ag.core.Point}
     * @private
     */
    this.viewAnchor_ = new ag.core.Point();

    /**
     * @type {ag.ui.Axis}
     * @private
     */
    this.selectionAxis_ = ag.ui.Axis.Both;

    /**
     * @type {ag.core.Point}
     * @private
     */
    this.slideAnchor_ = new ag.core.Point();

    /**
     * @type {goog.Timer}
     * @private
     */
    this.scrollTimer_ = new goog.Timer(50);

    /**
     * @type {boolean}
     * @private
     */
    this.ctrlPressed_ = false;

    /**
     * Support for temporarily switching to the hand tool
     *
     * @type {ag.ui.HandMsaTool}
     * @private
     */
    this.handTool_;

    /**
     * @type {goog.structs.Set}
     * @private
     */
    this.keysPressed_ = new goog.structs.Set();

    /**
     * @type {ag.ui.Action}
     * @private
     */
    this.extendAction_;

    /**
     * @type {ag.ui.Action}
     * @private
     */
    this.trimAction_;



    // Extendable mode slide variables
    /**
     * @type {boolean}
     * @private
     */
    this.horizScrollBarVisible_ = false;

    /**
     * @type {number}
     * @private
     */
    this.terminalGaps_ = 0;

    /**
     * @type {ag.ui.SelectMsaTool.SlideMode}
     * @private
     */
    this.slideMode_ = ag.ui.SelectMsaTool.SlideMode.Extendable;


    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    this.constructor_();
};
goog.inherits(ag.ui.SelectMsaTool, ag.ui.AbstractMsaTool);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var events = goog.events;
var Coordinate = goog.math.Coordinate;
var KeyCodes = events.KeyCodes;
var MouseButton = events.BrowserEvent.MouseButton;

var Action = ag.ui.Action;
var Point = ag.core.Point;
var SelectMsaTool = ag.ui.SelectMsaTool;
var UnitRect = ag.core.UnitRect;

var Cursor = ag.ui.Cursor;
var metaObject = ag.meta.MetaObject.getInstance;

var ClosedIntRange = ag.core.ClosedIntRange;

// --------------------------------------------------------------------------------------------------------------------
// Constants
/** @define {number} */
SelectMsaTool.kCollapseTolerance = 2;    // Must move at least this amount of pixels to cause a collapse

/** @enum {number} */
SelectMsaTool.SlideMode = {
    Basic: 1,       // Can only slide where there are available gaps
    Extendable: 2   // Creates terminal gaps where horizontal slide can no longer function
};

var SlideMode = SelectMsaTool.SlideMode;

// --------------------------------------------------------------------------------------------------------------------
// Signals
/** @enum {string} */
SelectMsaTool.SignalType = {
    SELECTION_CLEARED: events.getUniqueId('selection-cleared'),
    SELECTION_STARTED: events.getUniqueId('selection-started'),
    // currentSelection (UnitRect)
    SELECTION_FINISHED: events.getUniqueId('selection-finished'),
    // msaRect (UnitRect)
    SLIDE_STARTED: events.getUniqueId('slide-started'),
    // msaRect (UnitRect), terminal gaps
    SLIDE_FINISHED: events.getUniqueId('slide-finished')
};

var SignalType = SelectMsaTool.SignalType;

// --------------------------------------------------------------------------------------------------------------------
/** @private */
SelectMsaTool.prototype.constructor_ = function() {
    events.listen(this.scrollTimer_, goog.Timer.TICK, this.onScrollTimerTick_, false /* optCapture */, this);

    this.extendAction_ = new Action(KeyCodes.INSERT, 'Extend Sequence');
    this.extendAction_.setEnabled(false);

    this.trimAction_ = new Action(KeyCodes.DELETE, 'Trim Sequence');
    this.trimAction_.setEnabled(false);
};

SelectMsaTool.prototype.dispose = function() {
    events.unlisten(this.scrollTimer_, goog.Timer.TICK, this.onScrollTimerTick_, false /* optCapture */, this);
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
SelectMsaTool.prototype.activate = function() {
    this.updateMouseCursor_();

    goog.base(this, 'activate');

    metaObject().connect(this.extendAction_, ag.ui.Action.SignalType.TRIGGERED, this, this.onExtendAction_)
        .connect(this.trimAction_, ag.ui.Action.SignalType.TRIGGERED, this, this.onTrimAction_);

    this.extendAction_.setEnabled();
    this.trimAction_.setEnabled();
};

/** @override */
SelectMsaTool.prototype.deactivate = function() {
    this.finishSelectionSlide_();
    this.keysPressed_.clear();
    this.msaView_.setCursor();

    goog.base(this, 'deactivate');

    this.extendAction_.setEnabled(false);
    this.trimAction_.setEnabled(false);

    metaObject().disconnect(this.extendAction_, ag.ui.Action.SignalType.TRIGGERED, this, this.onExtendAction_);
    metaObject().disconnect(this.trimAction_, ag.ui.Action.SignalType.TRIGGERED, this, this.onTrimAction_);
};

/** @return {ag.ui.Action} */
SelectMsaTool.prototype.extendAction = function() {
    return this.extendAction_;
};

/** @override */
SelectMsaTool.prototype.isActive = function() {
    return this.selectionIsActive_ || this.slideIsActive_;
};

/**
 * @param {ag.ui.HandMsaTool} handTool
 */
SelectMsaTool.prototype.setHandTool = function(handTool) {
    this.handTool_ = handTool;
};

/**
 * @param {ag.ui.Axis} axis
 */
SelectMsaTool.prototype.setSelectionAxis = function(axis) {
    this.selectionAxis_ = axis;
};

/** @return {ag.ui.Action} */
SelectMsaTool.prototype.trimAction = function() {
    return this.trimAction_;
};


// --------------------------------------------------------------------------------------------------------------------
// Protected event handlers
/** @override */
SelectMsaTool.prototype.viewportKeyDown = function(keyEvent) {
    goog.base(this, 'viewportKeyDown', keyEvent);

    this.ctrlPressed_ = ag.xOsCtrlPressed(keyEvent);
    if (this.ctrlPressed_) {
        this.updateSelection_();
        return;
    }

    switch (keyEvent.keyCode) {
    case KeyCodes.ESC:
        if (!this.isActive()) {
            this.msaView_.clearSelection();
            metaObject().emit(this, SignalType.SELECTION_CLEARED);
            this.updateMouseCursor_();
        }
        break;
    case KeyCodes.SPACE:
        if (this.handTool_ && !this.isActive() && !keyEvent.repeat)
            this.msaView_.setCurrentTool(this.handTool_, true /* temporary */, keyEvent.keyCode);
        break;
    }
};

/** @override */
SelectMsaTool.prototype.viewportKeyUp = function(keyEvent) {
    var ctrlWasPressed = this.ctrlPressed_;
    this.ctrlPressed_ = ag.xOsCtrlPressed(keyEvent);
    if (!this.ctrlPressed_ && ctrlWasPressed)
        this.updateSelection_();
};

/** @override */
SelectMsaTool.prototype.viewportMouseDown = function(mouseEvent) {
    if (!mouseEvent.isButton(MouseButton.LEFT))
        return;

    if (this.msaView_.isMouseOverSelection()) {
        this.slideIsActive_ = true;
        this.slideAnchor_.assign(this.msaView_.msaCursorPoint());
        metaObject().emit(this, SignalType.SLIDE_STARTED, this.msaView_.selection());

        // Temporarily diable the scroll bar during the move
        this.horizScrollBarVisible_ = this.msaView_.horizontalScrollBar().isVisible();
        if (!this.horizScrollBarVisible_)
            this.msaView_.setHorizontalScrollBarPolicy(ag.ui.ScrollBarPolicy.Off);
    }
    else {
        this.viewAnchor_.assign(this.msaView_.viewportMousePos());
        this.selectionIsActive_ = true;

        this.ctrlPressed_ = ag.xOsCtrlPressed(mouseEvent);

        var msaClickPoint = this.msaView_.msaCursorPoint();
        if (!mouseEvent.shiftKey || !this.msaView_.hasSelection()) {
            this.selectAnchor_.assign(msaClickPoint);
        }
        else {
            var sel = this.msaView_.selection();
            this.selectAnchor_.x = sel.x1;
            this.selectAnchor_.y = sel.y1;
        }

        var newSel = UnitRect.create();
        newSel.assignTopLeft(this.selectAnchor_);
        if (!mouseEvent.shiftKey && this.ctrlPressed_)
            newSel.y1 = 1;

        newSel.assignBottomRight(msaClickPoint);
        if (this.ctrlPressed_)
            newSel.y2 = this.msaView_.msa().rowCount();

        this.msaView_.setSelection(newSel);
        newSel.release();
    }
};

/** @override */
SelectMsaTool.prototype.viewportMouseMove = function(mouseEvent) {
    if (this.selectionIsActive_) {
        this.updateSelection_();

        // Automatically scroll if viewPoint is outside the viewport() rect bounds
        if (this.msaView_.isMouseOverViewport())
            this.scrollTimer_.stop();
        else
            this.scrollTimer_.start();
    }
    else if (this.slideIsActive_) {
        var newSlideMsaPoint = this.msaView_.msaCursorPoint();
        var dx = newSlideMsaPoint.x - this.slideAnchor_.x;
        if (dx) {
            if (this.slideMode_ === SlideMode.Basic)
                this.handleBasicSlide_(dx);
            else
                this.handleExtendableSlide_(dx);
            this.slideAnchor_.assign(newSlideMsaPoint);
        }
    }
    else {
        assert(!this.isActive());

        // Update the mouse cursor point as necessary
        var newMsaCursorPoint = this.msaView_.msaCursorPoint();
        if (!newMsaCursorPoint) {
            this.lastMsaCursorPoint_.x = -1;
            this.lastMsaCursorPoint_.y = -1;
        }
        else if (newMsaCursorPoint.ne(this.lastMsaCursorPoint_)) {
            this.lastMsaCursorPoint_.assign(newMsaCursorPoint);
        }
        this.msaView_.update();
    }

    this.updateMouseCursor_();
};

/** @override */
SelectMsaTool.prototype.viewportMouseUp = function(mouseEvent) {
    this.finishSelectionSlide_();
};

/** @override */
SelectMsaTool.prototype.viewportPaint = function(context, origin, msaRect) {
    if (this.isActive() || this.msaView_.isMouseOverSelection())
        return;

    var msaCursorPoint = this.msaView_.msaCursorPoint();
    if (msaCursorPoint) {
        var rect = this.msaView_.pointRectMapper().msaPointToViewRect(msaCursorPoint);
        rect.moveLeft(rect.x1 + this.msaView_.renderXShift());
        ag.ui.MsaView.strokeRectangle(rect, context);
        rect.release();
    }
};


// --------------------------------------------------------------------------------------------------------------------
// Private event handlers
/**
 * @private
 */
SelectMsaTool.prototype.onScrollTimerTick_ = function() {
    var dx = 0;
    var dy = 0;

    var viewPos = this.msaView_.viewportMousePos();
    var viewSize = this.msaView_.viewportSize();
    var xOutsideViewport = viewPos.x < 0 || viewPos.x >= viewSize.width;
    var yOutsideViewport = viewPos.y < 0 || viewPos.y >= viewSize.height;
    if (xOutsideViewport) {
        dx = viewPos.x;
        if (dx > this.viewAnchor_.x)    // Off the right side
            dx -= viewSize.width;
        this.msaView_.horizontalScrollBar().adjustValue(dx);
    }

    if (yOutsideViewport) {
        dy = viewPos.y;
        if (dy > this.viewAnchor_.y)    // Off the bottom
            dy -= viewSize.height;
        this.msaView_.verticalScrollBar().adjustValue(dy);
    }

    // Now that we have scrolled - update the selection
    this.updateSelection_(viewPos);
};

/** @private */
SelectMsaTool.prototype.onExtendAction_ = function() {
    var msaPoint = this.msaView_.msaCursorPoint();
    assert(msaPoint);

    var msa = this.msaView_.msa();
    var subseq = msa.at(msaPoint.y);
    var xInLeftHalfOfMsa = msaPoint.x <= msa.columnCount() / 2.;
    if (xInLeftHalfOfMsa) {
        if (subseq.start() > 1)
            msa.setSubseqStart(msaPoint.y, subseq.start() - 1);
    }
    else if (subseq.stop() < subseq.constParentSeq().length()) {
        msa.setSubseqStop(msaPoint.y, subseq.stop() + 1);
    }
};

/** @private */
SelectMsaTool.prototype.onTrimAction_ = function() {
    var msa = this.msaView_.msa();
    var msaPoint = this.msaView_.msaCursorPoint();
    var subseq = msa.at(msaPoint.y);

    // Prevent trimming away the last non-gap character
    if (subseq.ungappedLength() === 1)
        return;

    var xInLeftHalfOfMsa = msaPoint.x <= msa.columnCount() / 2.;
    if (xInLeftHalfOfMsa)
        msa.setSubseqStart(msaPoint.y, subseq.start() + 1);
    else
        msa.setSubseqStop(msaPoint.y, subseq.stop() - 1);
};


// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * Convenience method for finishing/terminating any "open" selection or slide operation. Currently, called from
 * viewportMouseReleaseEvent and deactivate.
 *
 * @private
 */
SelectMsaTool.prototype.finishSelectionSlide_ = function() {
    if (this.selectionIsActive_) {
        this.selectionIsActive_ = false;
        this.scrollTimer_.stop();
        metaObject().emit(this, SignalType.SELECTION_FINISHED, this.msaView_.selection());
    }

    if (this.slideIsActive_) {
        this.slideIsActive_ = false;
        metaObject().emit(this, SignalType.SLIDE_FINISHED, this.msaView_.selection(), this.terminalGaps_);
        this.terminalGaps_ = 0;

        if (!this.horizScrollBarVisible_) {
            this.msaView_.setRenderXShift(0);
            this.msaView_.setHorizontalScrollBarPolicy(ag.ui.ScrollBarPolicy.Auto);
        }
        this.msaView_.update();
    }
};

/**
 * @param {number} dx
 * @private
 */
SelectMsaTool.prototype.handleBasicSlide_ = function(dx) {
    // It is important that no normalization occurs here, otherwise, the slide may get pushed onto the stack
    // inadvertently.
    var rect = /** @type {UnitRect} */(this.msaView_.selection());
    var actualDelta = this.msaView_.msa().slideRect(rect, dx);

    // Update the msa selection in accordance with how many residues were slid
    if (actualDelta != 0) {
        rect = UnitRect.create(rect.x1 + actualDelta, rect.y1, rect.width(), rect.height());
        this.msaView_.setSelection(rect);
        rect.release();
        this.msaView_.update();
    }
};

/**
 * @param {number} dx
 * @private
 */
SelectMsaTool.prototype.handleExtendableSlide_ = function(dx) {
    var msa = this.msaView_.msa();
    var rect = /** @type {UnitRect} */(this.msaView_.selection());
    var tmpSelRect = rect.createCopy();
    tmpSelRect.normalize();
    var blockWidth = this.msaView_.blockSize().width;
    var tmpRect = tmpSelRect.createCopy();

    if (this.terminalGaps_ > 0 && dx < 0) {
        var cols = msa.columnCount();
        var toRemove = Math.min(this.terminalGaps_, -dx);
        // var tmpRect = UnitRect.create(rect.x1, rect.y1, cols - rect.x1 + 1, rect.height());
        tmpRect.x1 = rect.x1;
        tmpRect.x2 = cols;
        msa.slideRect(tmpRect, -toRemove);

        // No need for x render shift here
        this.terminalGaps_ -= toRemove;
        msa.removeGapColumns(new ClosedIntRange(cols - toRemove + 1, cols));
        dx += toRemove;

        // Need to update selection
        tmpSelRect.shift(-toRemove, 0);
    }
    else if (this.terminalGaps_ < 0 && dx > 0) {
        var toRemove = Math.min(-this.terminalGaps_, dx);
        if (!this.horizScrollBarVisible_)
            this.msaView_.setRenderXShift((this.terminalGaps_ + toRemove) * blockWidth);

        // var tmpRect = UnitRect.create(1, rect.y1, rect.x2, rect.height());
        tmpRect.x1 = 1;
        tmpRect.x2 = rect.x2;
        msa.slideRect(tmpRect, toRemove);

        this.terminalGaps_ += toRemove;
        if (!this.horizScrollBarVisible_)
            this.msaView_.setRenderXShift(-Math.abs(this.terminalGaps_) * blockWidth);
        else
            this.msaView_.horizontalScrollBar().adjustValue(-toRemove * blockWidth);

        msa.removeGapColumns(new ClosedIntRange(1, toRemove));
        dx -= toRemove;

        // Selection stays exactly where it was so no change needed
    }

    if (dx) {
        // 1) Shift as much as possible without adding terminal gaps.
        // It is important that no normalization occurs here, otherwise, the slide may get pushed onto the stack
        // inadvertently.
        var actualDelta = msa.slideRect(tmpSelRect, dx);
        tmpSelRect.shift(actualDelta, 0);

        if (dx !== actualDelta) {
            var nTerminalGaps = dx - actualDelta;
            this.terminalGaps_ += nTerminalGaps;
            if (nTerminalGaps < 0) {
                tmpSelRect.shift(-nTerminalGaps, 0);
                if (!this.horizScrollBarVisible_)
                    this.msaView_.setRenderXShift(-Math.abs(this.terminalGaps_) * blockWidth);
                else
                    this.msaView_.horizontalScrollBar().adjustValue(-nTerminalGaps * blockWidth);

                msa.insertGapColumns(1, Math.abs(nTerminalGaps));
                // var tmpRect = UnitRect.create(-nTerminalGaps + 1, tmpSelRect.y1, tmpSelRect.x2 + nTerminalGaps, tmpSelRect.height());
                tmpRect.x1 = -nTerminalGaps + 1;
                tmpRect.x2 = tmpSelRect.x2;
                msa.slideRect(tmpRect, nTerminalGaps);
            }
            else {
                msa.insertGapColumns(msa.columnCount() + 1, Math.abs(nTerminalGaps));
                // var tmpRect = UnitRect.create(tmpSelRect.x1, tmpSelRect.y1, msa.columnCount() - nTerminalGaps - tmpSelRect.x1 + 1, tmpSelRect.height());
                tmpRect.x1 = tmpSelRect.x1;
                tmpRect.x2 = msa.columnCount() - nTerminalGaps;
                msa.slideRect(tmpRect, nTerminalGaps);
            }
            tmpSelRect.shift(nTerminalGaps, 0);
        }
    }

    this.msaView_.setSelection(tmpSelRect);
    tmpSelRect.release();
    tmpRect.release();
    this.msaView_.update();
};

/** @private */
SelectMsaTool.prototype.updateMouseCursor_ = function() {
    var mousePos = this.msaView_.viewportMousePos();
    var newCursor;
    if (!this.selectionIsActive_ && (this.slideIsActive_ || this.msaView_.isMouseOverSelection()))
        newCursor = Cursor.ResizeEW;
    this.msaView_.setCursor(newCursor);
};

/**
 * By default, optViewPoint is not defined, which indicates to autocalculate the stop position from the current mouse
 * position within the viewport.
 *
 * @param {Point} [optViewPoint] in view space
 * @private
 */
SelectMsaTool.prototype.updateSelection_ = function(optViewPoint) {
    if (!this.selectionIsActive_)
        return;

    assert(this.msaView_.selection());

    var currentSelection = this.msaView_.selection().createCopy();
    currentSelection.normalize();

    var start = this.selectAnchor_.createCopy();
    var stop;
    if (!optViewPoint) {
        var msaCursorPoint = this.msaView_.msaCursorPoint();
        stop = Point.create(msaCursorPoint.x, msaCursorPoint.y);
    }
    else {
        stop = this.msaView_.pointRectMapper().viewPointToMsaPoint(optViewPoint);
    }

    if (this.selectionAxis_ === ag.ui.Axis.Vertical) {
        // Note: column selection is not supported when the selection mode is constrained to the vertical axis
        stop.x = currentSelection.x2;
    }
    else {
        if (this.selectionAxis_ === ag.ui.Axis.Horizontal)
            stop.y = currentSelection.y2;

        if (this.ctrlPressed_) {
            start.y = 1;
            stop.y = this.msaView_.msa().rowCount();
        }
    }

    currentSelection.assignTopLeft(start);
    currentSelection.assignBottomRight(stop);
    this.msaView_.setSelection(currentSelection);
    stop.release();
    start.release();
    currentSelection.release();
};

/*******************************************************************************************************************/});
