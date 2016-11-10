/**
 * @fileoverview MsaView provides a canvas-based view of a Msa.
 *
 * Requires that box-sizing = border-box;
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.ui.MsaView');

goog.require('ag.bio.ObservableMsa');
goog.require('ag.core.ClosedIntRange');
goog.require('ag.core.Point');
goog.require('ag.core.UnitRect');
goog.require('ag.graphics.MsaColorProvider');
goog.require('ag.meta.MetaObject');
goog.require('ag.painting.TextBlockRenderer');
goog.require('ag.service.RAFHub');
goog.require('ag.ui');
goog.require('ag.ui.MsaRulerWidget');
goog.require('ag.ui.MsaStartStopSideWidget');
goog.require('ag.ui.ScrollArea');
goog.require('ag.ui.PointRectMapper');

goog.require('goog.asserts');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('goog.math');
goog.require('goog.math.Box');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');
goog.require('goog.style');

goog.require('goog.events.KeyCodes');

/**
 * @constructor
 * @extends {ag.ui.ScrollArea}
 */
ag.ui.MsaView = function() {
    goog.base(this);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.bio.ObservableMsa}
     * @private
     */
    this.msa_;

    /**
     * @type {HTMLCanvasElement}
     * @private
     */
    this.canvas_;

    /**
     * @type {CanvasRenderingContext2D}
     * @private
     */
    this.paintContext_;

    /**
     * @type {ag.painting.TextBlockRenderer}
     * @private
     */
    this.textRenderer_;

    /**
     * @type {ag.core.UnitRect}
     * @private
     */
    this.msaClipRect_ = new ag.core.UnitRect();

    /**
     * @type {ag.ui.PointRectMapper}
     * @private
     */
    this.pointRectMapper_;

    /**
     * @type {ag.graphics.MsaColorProvider}
     * @private
     */
    this.colorProvider_ = new ag.graphics.MsaColorProvider();

    /**
     * @type {ag.ui.AbstractMsaTool}
     * @private
     */
    this.currentTool_;

    /**
     * @type {boolean}
     * @private
     */
    this.currentToolIsTemporary_ = false;

    /**
     * The key that must be released to switch back to previous tool
     *
     * @type {number|undefined}
     * @private
     */
    this.temporaryToolKey_;

    /**
     * @type {ag.ui.AbstractMsaTool}
     * @private
     */
    this.previousTool_;

    /**
     * @type {ag.core.UnitRect|undefined}
     * @private
     */
    this.selection_;

    /**
     * @type {number}
     * @private
     */
    this.renderXShift_ = 0;


    // ----------------------------
    // ----------------------------
    // Basic margin widgets
    /**
     * @type {ag.ui.MsaRulerWidget}
     * @private
     */
    this.ruler_;

    /**
     * @type {ag.ui.MsaStartStopSideWidget}
     * @private
     */
    this.startSideWidget_;

    /**
     * @type {ag.ui.MsaStartStopSideWidget}
     * @private
     */
    this.stopSideWidget_;

    // ----------------------------
    // ----------------------------
    // Helper variables
    /**
     * @type {Object}
     * @private
     */
    this.viewFocusData_ = {
        msaPoint: null,    // Coordinate
        leftFraction: 0,
        rightFraction: 0
    };

    /**
     * @type {ag.core.Point}
     * @private
     */
    this.viewportMousePos_ = new ag.core.Point();

    /**
     * @type {ag.core.Point}
     * @private
     */
    this.msaCursorPoint_;

    /**
     * @type {goog.math.Box}
     * @private
     */
    this.margins_ = new goog.math.Box(0, 0, 0, 0);

    /**
     * Since we are keeping the canvas width larger than the actual content to be rendered, it is necessary
     * to clear part of the background whenever the render space shrinks (see updateCanvasElementSize_). This
     * variable if it contains non-zero values indicates that portion to clear on a paint request.
     *
     * @type {ag.core.ClosedIntRange}
     * @private
     */
    this.backgroundClearSpan_ = new ag.core.ClosedIntRange();

    /**
     * @type {number}
     * @private
     */
    this.lastRenderWidth_ = 0;
};
goog.inherits(ag.ui.MsaView, ag.ui.ScrollArea);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var events = goog.events;
var style = goog.style;
var Coordinate = goog.math.Coordinate;
var KeyCodes = goog.events.KeyCodes;
var Size = goog.math.Size;
var TagName = goog.dom.TagName;

var ClosedIntRange = ag.core.ClosedIntRange;
var MsaView = ag.ui.MsaView;
var MsaRulerWidget = ag.ui.MsaRulerWidget;
var MsaStartStopSideWidget = ag.ui.MsaStartStopSideWidget;
var ObservableMsa = ag.bio.ObservableMsa;
var Point = ag.core.Point;
var PointRectMapper = ag.ui.PointRectMapper;
var TextBlockRenderer = ag.painting.TextBlockRenderer;
var UnitRect = ag.core.UnitRect;

var metaObject = ag.meta.MetaObject.getInstance;
var RAFHub = ag.service.RAFHub.getInstance;

var MsaSignals = ObservableMsa.SignalType;

// --------------------------------------------------------------------------------------------------------------------
// Signals
/** @enum {string} */
MsaView.SignalType = {
    // currentSelection (?UnitRect), oldSelection (?UnitRect)
    SELECTION_CHANGED: events.getUniqueId('selection-changed'),
    TOOL_CHANGED: events.getUniqueId('tool-changed'),
    // currentPoint, previousPoint
    MSA_CURSOR_MOVED: events.getUniqueId('msa-cursor-moved'),
    ENTERED_DOCUMENT: events.getUniqueId('entered-document'),
    // string
    FONT_CHANGED: events.getUniqueId('font-changed'),
    // msa, msa
    MSA_CHANGED: events.getUniqueId('msa-changed'),
    // size
    VIEWPORT_RESIZED: events.getUniqueId('viewport-resized'),
    // number
    RENDER_XSHIFT_CHANGED: events.getUniqueId('render-xshift-changed')
};

/** @define {number} */
MsaView.CanvasShrinkThreshold_ = 512;   // Pixels; amount that the target width has to be less than to actually resize the canvas

/** @define {number} */
MsaView.CanvasWidthIncrement_ = 128;    // Pixels; amount to increase the canvas width when more space is needed to render properly

/** @define {number} */
MsaView.MinimumWidth = 300;

/** @define {number} */
MsaView.MinimumHeight = 200;

/**
 * Will be expanded as necessary!
 *
 * @type {Array}
 */
MsaView.COLORS_ARRAY = new Array(256);

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {Size} */
MsaView.prototype.blockSize = function() {
    return this.textRenderer_.blockSize();
};

/**
 * Because the font may be arbitrarily zoomed, the actual canvas size is best represented by real numbers; however
 * when requested in integer units, the returned size is the rounded up version of the corresponding floating point
 * numbers.
 *
 * @return {Size}
 */
MsaView.prototype.canvasSize = function() {
    var msa = this.msa_;
    if (!msa)
        return new Size(0, 0);

    var blockSize = this.textRenderer_.blockSize();
    return new Size(msa.columnCount() * blockSize.width, msa.rowCount() * blockSize.height);
};

MsaView.prototype.clearSelection = function() {
    this.setSelection();
};

/**
 * The returned rectangle is from:
 *    (horizontal scroll bar value,
 *     vertical scroll bar value) ->
 *                                (MIN(viewport.width, ObservableMsa length * character width),
 *                                 MIN(viewport.height, ObservableMsa sequences * character height))
 *
 * @return {UnitRect}
 */
MsaView.prototype.clipRect = function() {
    if (this.msa_) {
        var viewSize = this.viewportSize();
        var viewRect = UnitRect.create(0, 0, viewSize.width+1, viewSize.height+1);
        var result = this.pointRectMapper_.viewRectToCanvasRect(viewRect);
        viewRect.release();
        return result;
    }

    return UnitRect.create();
};

/** @return {ag.ui.AbstractMsaTool} */
MsaView.prototype.currentTool = function() {
    return this.currentTool_;
};

/** @return {string} */
MsaView.prototype.font = function() {
    return (this.getElement()) ? this.fontSize() + 'px ' + this.fontFamily() : '';
};

/** @return {string} */
MsaView.prototype.fontFamily = function() {
    return style.getFontFamily(this.getElement());
};

/** @return {number} */
MsaView.prototype.fontSize = function() {
    return style.getFontSize(this.getElement());
};

/** @return {boolean} */
MsaView.prototype.hasSelection = function() {
    return goog.isDefAndNotNull(this.selection_);
};

/** @return {boolean} */
MsaView.prototype.isMouseOverSelection = function() {
    if (this.selection_ && this.viewportMousePos_) {
        var selRectInViewSpace = this.pointRectMapper_.msaRectToViewRect(this.selection_);
        var result = selRectInViewSpace.containsCoordinate(this.viewportMousePos_);
        selRectInViewSpace.release();
        return result;
    }

    return false;
};

/** @return {boolean} */
MsaView.prototype.isMouseOverViewport = function() {
    var pos = this.viewportMousePos_;
    var size = this.viewportSize();
    return goog.isDefAndNotNull(pos) &&
        pos.x >= 0 &&
        pos.y >= 0 &&
        pos.x < size.width &&
        pos.y < size.height;
};

/**
 * View space.
 *
 * @return {Coordinate}
 */
MsaView.prototype.mouseHotSpot = function() {

};

/** @return {ag.bio.ObservableMsa} */
MsaView.prototype.msa = function() {
    return this.msa_;
};

/** @return {ag.core.UnitRect} */
MsaView.prototype.msaClipRect = function() {
    return this.msaClipRect_;
};

/** @return {Point} */
MsaView.prototype.msaCursorPoint = function() {
    return this.msaCursorPoint_;
};

/** @return {PointRectMapper} */
MsaView.prototype.pointRectMapper = function() {
    return this.pointRectMapper_;
};

/**
 * Useful for sending wheel events from other widgets to this one. For example, when scrolling on a MsaSubseqTableView.
 * We create another event before proxying it onwards to avoid dealing with preventing defaults and such.
 *
 * @param {goog.events.MouseWheelEvent} mouseEvent
 * @param {boolean} [optIgnoreX] defaults to false
 * @param {boolean} [optIgnoreY] defaults to false
 */
MsaView.prototype.proxyWheelEvent = function(mouseEvent, optIgnoreX, optIgnoreY) {
    var ignoreX = goog.isBoolean(optIgnoreX) ? optIgnoreX : false;
    var ignoreY = goog.isBoolean(optIgnoreY) ? optIgnoreY : false;
    if (ignoreX && ignoreY)
        return;

    var proxyEvent = new goog.events.Event('proxy');
    proxyEvent.deltaX = !ignoreX ? mouseEvent.deltaX : 0;
    proxyEvent.deltaY = !ignoreY ? mouseEvent.deltaY : 0;
    this.wheelEvent(proxyEvent);
};

/**
 * @param {CanvasRenderingContext2D} context
 * @param {Point} origin
 * @param {UnitRect} msaRect
 */
MsaView.prototype.renderMsaRegion = function(context, origin, msaRect) {
    var top = msaRect.y1;
    var bottom = msaRect.y2;
    var left = msaRect.x1;
    var right = msaRect.x2;

    var textRenderer = this.textRenderer_;
    var blockSize = this.textRenderer_.blockSize();
    var bw = blockSize.width;
    var bh = blockSize.height;
    var msa = this.msa_;
    var subseqs = msa.members();

    if (msaRect.width() > MsaView.COLORS_ARRAY.length)
        MsaView.COLORS_ARRAY = new Array(msaRect.width() + 128);

    var y = origin.y;
    for (var i=top; i<=bottom; i++) {
        var colors = this.colorProvider_.colorsArray(i, msaRect.x1, msaRect.x2, MsaView.COLORS_ARRAY);

        var x = origin.x;
        var constBuffer = subseqs[i-1].constBuffer();
        for (var j=left-1, k=0; j< right; ++j, ++k) {
            textRenderer.drawChar(context, x, y, constBuffer[j], colors[k]);
            x += bw;
        }
        y += bh;
    }
};

/**
 * @return {goog.math.Size}
 */
MsaView.prototype.renderSize = function() {
    var vs = this.viewportSize();
    var ss = this.scrollableSize(); // Creates a new Size object, therefore, we can simply modify it directly.
    ss.width = Math.min(ss.width, vs.width);
    ss.height = Math.min(ss.height, vs.height);
    return ss;
};

/**
 * Returns the current translation amount for the x-axis
 *
 * @return {number}
 */
MsaView.prototype.renderXShift = function() {
    return this.renderXShift_;
};

/**
 * Core paint method for redrawing the entire view.
 */
MsaView.prototype.raf =
MsaView.prototype.repaint = function() {
    if (!this.msa_ || this.msa_.rowCount() === 0)
        return;

    var viewSize = this.viewportSize();
    if (viewSize.width === 0 || viewSize.height === 0)
        return;

    var viewRect = UnitRect.create(0, 0, viewSize.width+1, viewSize.height+1);
    var clipRect = this.pointRectMapper_.viewRectToMsaRect(viewRect);
    viewRect.release();
    viewRect = null;
    this.setMsaClipRect(clipRect);
    clipRect.release();
    clipRect = null;
    var origin = this.clipRenderOrigin_();
    var msaRect = UnitRect.create();
    msaRect.assign(this.msaClipRect_);
    msaRect.normalize();

    // ------------------
    // Clear the background - surprisingly doesn't produce flicker!
    if (this.backgroundClearSpan_.begin > 0) {
        this.paintContext_.clearRect(this.backgroundClearSpan_.begin, 0,
            this.backgroundClearSpan_.length(), viewSize.height);
        this.backgroundClearSpan_.begin = 0;
        this.backgroundClearSpan_.end = 0;
    }

    // ------------------
    // The MSA
    this.drawMsa(this.paintContext_, origin, msaRect);

    // ------------------
    // Selection
    if (this.selection_) {
        viewRect = this.pointRectMapper_.msaRectToViewRect(this.selection_);
        viewRect.x1 += this.renderXShift_;
        viewRect.x2 += this.renderXShift_;
        this.drawSelection(viewRect, this.paintContext_);
        viewRect.release();
        viewRect = null;
    }

    // ------------------
    // Tool specific painting
    if (this.currentTool_)
        this.currentTool_.viewportPaint(this.paintContext_, origin, msaRect);

    origin.release();
    msaRect.release();
};

/** @return {UnitRect|undefined} */
MsaView.prototype.selection = function() {
    return this.selection_;
};

MsaView.prototype.selectAll = function() {
    this.setSelection(new UnitRect(1, 1, this.msa_.columnCount(), this.msa_.rowCount()));
};

/**
 * @param {ag.graphics.MsaColorProvider=} colorProvider
 */
MsaView.prototype.setColorProvider = function(colorProvider) {
    this.colorProvider_ = colorProvider ? colorProvider : new ag.graphics.MsaColorProvider();
    this.colorProvider_.setMsa(this.msa_);
    this.update();
};

/**
 * Sets the active msa tool to tool; if isTemporary then resets to current tool when keyboardKey is released.
 *
 * @param {ag.ui.AbstractMsaTool} tool
 * @param {boolean} [optIsTemporary] defaults to false
 * @param {number} [optKeyboardKey] defaults to zero
 */
MsaView.prototype.setCurrentTool = function(tool, optIsTemporary, optKeyboardKey) {
    var isTemporary = goog.isDef(optIsTemporary) ? optIsTemporary : false;

    if (tool === this.currentTool_)
        return;

    if (this.currentTool_) {
        if (this.currentTool_.isActive())
            return;

        this.currentTool_.deactivate();
    }

    this.previousTool_ = (isTemporary) ? this.currentTool_ : null;
    this.currentTool_ = tool;
    if (this.currentTool_)
        this.currentTool_.activate();

    this.currentToolIsTemporary_ = isTemporary;
    this.temporaryToolKey_ = optKeyboardKey;

    metaObject().emit(this, MsaView.SignalType.TOOL_CHANGED);
};

/**
 * Sets the data-cursor attribute on the viewport to optCursor or removes it if optCursor is not defined.
 *
 * @param {string} [optCursor]
 */
MsaView.prototype.setCursor = function(optCursor) {
    if (!this.isInDocument())
        return;

    if (optCursor)
        this.viewport.setAttribute('data-cursor', optCursor);
    else
        this.viewport.removeAttribute('data-cursor');
};

/**
 * @param {string} newFont
 * @return {boolean}
 */
MsaView.prototype.setFont = function(newFont) {
    if (!this.isInDocument() || newFont === this.font())
        return false;

    var s = this.getElement().style;
    s.font = newFont;

    if (this.msa_)
        this.saveViewFocus_(new Coordinate(0, 0));

    this.textRenderer_.setFont(newFont);
    metaObject().emit(this, MsaView.SignalType.FONT_CHANGED, newFont);

    this.updateScrollBarRangesAndSteps_();
    // Important to call this *after* emitting the font changed signal so that any present ruler
    // can update its height and then we can use that height to adjust the margins accordingly.
    this.updateMarginWidgetGeometries_();

    if (this.msa_)
        this.restoreViewFocus_();

    this.update();
    return true;
};

/**
 * @param {ObservableMsa} newMsa
 */
MsaView.prototype.setMsa = function(newMsa) {
    if (this.msa_ === newMsa)
        return;

    var oldMsa = this.msa_;
    if (oldMsa)
        this.clearSelection();

    this.colorProvider_.setMsa(newMsa);

    this.unwatchMsa_();
    if (this.msaCursorPoint_) {
        this.msaCursorPoint_.release();
        this.msaCursorPoint_ = null;
    }
    this.msa_ = newMsa;
    this.watchMsa_();
    this.viewportMousePos_.x = 0;
    this.viewportMousePos_.y = 0;

    this.setMouseTrackingEnabled(this.isInDocument() && goog.isDefAndNotNull(newMsa));
    this.updateScrollBarRangesAndSteps_();

    metaObject().emit(this, MsaView.SignalType.MSA_CHANGED, newMsa, oldMsa);

    this.updateMarginWidgetGeometries_();
    this.scrollTo(0, 0);
};

/**
 * Sets the amount to translate the x-axis render origin
 *
 * @param {number} xShift
 */
MsaView.prototype.setRenderXShift = function(xShift) {
    if (goog.math.nearlyEquals(xShift, this.renderXShift_))
        return;

    this.renderXShift_ = xShift;
    this.updateStopSideWidgetPosition_();
    metaObject().emit(this, MsaView.SignalType.RENDER_XSHIFT_CHANGED, xShift);
};

/** @param {boolean=} optVisible defaults to true */
MsaView.prototype.setRulerVisible = function(optVisible) {
    var makeVisible = goog.isBoolean(optVisible) ? optVisible : true;
    if (makeVisible === this.ruler_.isInDocument())
        return;

    if (makeVisible)
        this.addChildAt(this.ruler_, 0, true /* optRender */);
    else
        this.removeChild(this.ruler_, true /* optUnrender */);

    this.updateMarginWidgetGeometries_();
    this.update();
};

/** @param {Size} newSize */
MsaView.prototype.resize =          // Redirect any calls to this method to setSize
MsaView.prototype.setSize = function(newSize) {
    newSize.width = Math.max(0, newSize.width);
    newSize.height = Math.max(0, newSize.height);
    goog.base(this, 'setSize', newSize);
};

/** @param {boolean=} optVisible defaults to true */
MsaView.prototype.setStartSideWidgetVisible = function(optVisible) {
    var makeVisible = goog.isBoolean(optVisible) ? optVisible : true;
    if (makeVisible === this.startSideWidget_.isInDocument())
        return;

    if (makeVisible)
        this.addChildAt(this.startSideWidget_, 0, true /* optRender */);
    else
        this.removeChild(this.startSideWidget_, true /* optUnrender */);

    this.updateMarginWidgetGeometries_();
    this.update();
    if (makeVisible)
        this.startSideWidget_.update();
};

/** @param {boolean=} optVisible defaults to true */
MsaView.prototype.setStopSideWidgetVisible = function(optVisible) {
    var makeVisible = goog.isBoolean(optVisible) ? optVisible : true;
    if (makeVisible === this.stopSideWidget_.isInDocument())
        return;

    if (makeVisible)
        this.addChildAt(this.stopSideWidget_, 0, true /* optRender */);
    else
        this.removeChild(this.stopSideWidget_, true /* optUnrender */);

    this.updateMarginWidgetGeometries_();
    this.update();
    if (makeVisible)
        this.stopSideWidget_.update();
};

/** @param {UnitRect} [newSelection] */
MsaView.prototype.setSelection = function(newSelection) {
    assert(!newSelection || (this.msa_ && this.msa_.isValidRect(newSelection)), 'newSelection out of range');

    var selectionsIdentical = (!this.selection_ && !newSelection) ||
        (this.selection_ && newSelection && this.selection_.eq(newSelection));
    if (selectionsIdentical)
        return;

    var oldSelection = this.selection_;
    if (oldSelection && newSelection) {
        oldSelection = UnitRect.create();
        oldSelection.assign(/** @type {UnitRect} */(this.selection_));
        this.selection_.assign(newSelection);
    }
    else if (oldSelection && !newSelection) {
        this.selection_ = newSelection; // <--- null or undefined
    }
    else {  // !oldSelection && newSelection
        assert(!oldSelection && newSelection);

        this.selection_ = UnitRect.create();
        this.selection_.assign(newSelection);
    }
    metaObject().emit(this, MsaView.SignalType.SELECTION_CHANGED, this.selection_, oldSelection);
    this.update();

    if (oldSelection)
        oldSelection.release();
};

/** @return {ag.ui.MsaStartStopSideWidget} */
MsaView.prototype.startSideWidget = function() {
    return this.startSideWidget_;
};

/** @return {ag.ui.MsaStartStopSideWidget} */
MsaView.prototype.stopSideWidget = function() {
    return this.stopSideWidget_;
};

/** @return {ag.painting.TextBlockRenderer} */
MsaView.prototype.textRenderer = function() {
    return this.textRenderer_;
};

/** Queues a paint request if one is not already queued */
MsaView.prototype.update = function() {
    if (this.isInDocument()) {
        RAFHub().update(this);
        this.ruler_.update();
    }
};

// --------------------------------------------------------------------------------------------------------------------
// Protected methods
/**
 * @protected
 */
MsaView.prototype.drawMsa = function(context, origin, msaRect) {
    this.renderMsaRegion(context, origin, msaRect);
};

/**
 * @param {UnitRect} rect in view space
 * @param {CanvasRenderingContext2D} context
 * @protected
 */
MsaView.prototype.drawSelection = function(rect, context) {
    // Draw the transparent rectangle
    context.save();
    context.fillStyle = 'rgba(0, 0, 0, .25)';
    context.fillRect(rect.x1, rect.y1, rect.width(), rect.height());
    context.restore();

    // Outline the rectangle
    MsaView.strokeRectangle(rect, context);
};

/**
 * @param {UnitRect} newMsaClipRect
 * @protected
 */
MsaView.prototype.setMsaClipRect = function(newMsaClipRect) {
    assert(this.msa_);
    assert(newMsaClipRect.x1 > 0 && newMsaClipRect.y1 > 0, 'top and/or left of clip rect must be positive');
    assert(newMsaClipRect.x2 <= this.msa_.columnCount() &&
        newMsaClipRect.y2 <= this.msa_.rowCount(), 'right and/or bottom of clip rect out of range');

    assert(!(newMsaClipRect.x1 < this.msaClipRect_.x1 &&
        newMsaClipRect.x2 > this.msaClipRect_.x2 &&
        newMsaClipRect.y1 < this.msaClipRect_.y1 &&
        newMsaClipRect.y2 > this.msaClipRect_.y2), 'Invalid (or rather unexpected) msa clip rectangle');

    // Account for any view shifting :) We presume that any view shifting should preserve the requested newMsaClipRect
    var msaXShift = -Math.floor(this.renderXShift_ / this.blockSize().width);
    if (msaXShift) {
        this.msaClipRect_.x1 = Math.max(1, newMsaClipRect.x1 + msaXShift);
        this.msaClipRect_.x2 = Math.min(this.msa_.columnCount(), newMsaClipRect.x2 + msaXShift);
    }
    else {
        this.msaClipRect_.x1 = newMsaClipRect.x1;
        this.msaClipRect_.x2 = newMsaClipRect.x2;
    }
    this.msaClipRect_.y1 = newMsaClipRect.y1;
    this.msaClipRect_.y2 = newMsaClipRect.y2;
};

/** @return {Point} */
MsaView.prototype.viewportMousePos = function() {
    return this.viewportMousePos_;
};

// --------------------------------------------------------------------------------------------------------------------
// Protected events
/** @override */
MsaView.prototype.keyDownEvent = function(keyEvent) {
    keyEvent.preventDefault();
    if (this.currentTool_)
        this.currentTool_.viewportKeyDown(keyEvent);
};

/** @override */
MsaView.prototype.keyUpEvent = function(keyEvent) {
    keyEvent.preventDefault();
    if (this.currentTool_) {
        this.currentTool_.viewportKeyUp(keyEvent);

        // Check if the currently active tool is temporary and reset it if is
        if (this.currentToolIsTemporary_ && !keyEvent.repeat) {
            // The !isActive_ check avoids the unpleasant scenario where the user has pressed the relevant key to
            // initiate a temporary mode, then somehow exited that mode while an activity is underway. This would leave the
            // operation in an unresolved state.
            if (!this.currentTool_.isActive() && keyEvent.keyCode === this.temporaryToolKey_)
                this.setCurrentTool(this.previousTool_);
        }
    }
};

/** @override */
MsaView.prototype.mouseDownEvent = function(mouseEvent) {
    if (!this.msa_)
        return;

    mouseEvent.preventDefault();

    // Enable it to receive keyboard events
    ag.ui.focusWithoutScroll(this.viewport);

    ag.ui.getRelativePosition(mouseEvent, this.viewport, this.viewportMousePos_);
    this.updateMsaCursorPoint_();
    if (this.currentTool_)
        this.currentTool_.viewportMouseDown(mouseEvent);

    if (this.viewport.setCapture)
        this.viewport.setCapture();

    var eh = this.getHandler();
    // Disconnect the mousemove event handler on the viewport since we will be using a
    // document wide handler
    this.setMouseTrackingEnabled(false);

    // Reference: http://stackoverflow.com/questions/1685326/responding-to-the-onmousemove-event-outside-of-the-browser-window-in-ie
    // Listen to mousemove and mouseup events on the *document* to respond to events *outside*
    // the browser window.
    eh.listen(document, events.EventType.MOUSEMOVE, this.mouseMoveEvent)
        .listen(document, events.EventType.MOUSEUP, this.onViewportMouseUp_);
};

/** @override */
MsaView.prototype.mouseMoveEvent = function(mouseEvent) {
    ag.ui.getRelativePosition(mouseEvent, this.viewport, this.viewportMousePos_);
    this.updateMsaCursorPoint_();

    if (this.currentTool_)
        this.currentTool_.viewportMouseMove(mouseEvent);

    mouseEvent.preventDefault();
};


// --------------------------------------------------------------------------------------------------------------------
// Reimplemented protected functions
/** override */
MsaView.prototype.createViewport = function() {
    var div = goog.base(this, 'createViewport');

    var domHelper = this.getDomHelper();
    var canvas = domHelper.createDom(TagName.CANVAS);
    this.canvas_ = /** @type {HTMLCanvasElement} */ (canvas);
    this.paintContext_ = canvas.getContext('2d');
    div.appendChild(canvas);

    return div;
};

/** @override */
MsaView.prototype.decorateInternal = function(element) {
    goog.base(this, 'decorateInternal', element);

    this.textRenderer_ = new TextBlockRenderer(this.font());
    this.pointRectMapper_ = new PointRectMapper(this);

    this.ruler_ = new MsaRulerWidget(this);
    this.addChildAt(this.ruler_, 0, true /* optRender */);
    this.ruler_.getElement().style.top = 0;

    this.startSideWidget_ = new MsaStartStopSideWidget(this);
    this.addChildAt(this.startSideWidget_, 1, true /* optRender */);
    this.startSideWidget_.getElement().style.left = 0;
    this.startSideWidget_.setAlignment(ag.ui.Alignment.Right);

    this.stopSideWidget_ = new MsaStartStopSideWidget(this, MsaStartStopSideWidget.PositionType.Stop);
    this.addChildAt(this.stopSideWidget_, 2, true /* optRender */);
};

/** @override */
MsaView.prototype.enterDocument = function() {
    goog.base(this, 'enterDocument');

    assert(!this.msa_ || !metaObject().disconnect(this.msa_, MsaSignals.COLLAPSED_LEFT, this, this.onMsaCollapsedLeft));

    // Special case to define a set size in case one is not set with CSS
    this.setSize(style.getSize(this.getElement()));

    if (this.msa_) {
        this.updateScrollBarRangesAndSteps_();
        this.updateMarginWidgetGeometries_();
        this.scrollTo(0, 0);
        metaObject().emit(this, MsaView.SignalType.ENTERED_DOCUMENT);
        this.watchMsa_();
    }

    this.update();
};

/** @override */
MsaView.prototype.exitDocument = function() {
    goog.base(this, 'exitDocument');

    this.setMouseTrackingEnabled(false);
    this.unwatchMsa_();
};

/** @override */
MsaView.prototype.scrollContentsTo = function(x, y) {
    // console.log('Scroll contents to: ' + x + ', ' + y);
    if (this.msa_) {
        this.updateMsaCursorPoint_();
        this.update();
    }
};

/** @override */
MsaView.prototype.setScrollableSize = function(size) {
    goog.base(this, 'setScrollableSize', size);

    this.updateCanvasElementSize_();
};

/** @override */
MsaView.prototype.viewportResized = function(size) {
    // console.log('Viewport resized: ' + size.toString());

    this.updateCanvasElementSize_();
    metaObject().emit(this, MsaView.SignalType.VIEWPORT_RESIZED, size);
    this.updateMarginWidgetGeometries_();
};


// --------------------------------------------------------------------------------------------------------------------
// Protected slots
/**
 * @param {UnitRect} rect
 * @protected
 */
MsaView.prototype.onMsaCollapsedLeft = function(rect) {};

/**
 * @param {UnitRect} rect
 * @protected
 */
MsaView.prototype.onMsaCollapsedRight = function(rect) {};

/**
 * @param {ClosedIntRange} columns
 * @protected
 */
MsaView.prototype.onMsaGapColumnsInserted = function(columns) {
    // Given the gap columns, the scroll bars should update accordingly
    this.updateScrollBarRangesAndSteps_();
    this.updateMarginWidgetGeometries_();

    // ---------------------------------
    // Update the selection if necessary to accommodate gap insertions
    if (!this.selection_)
        return;

    var newSel = UnitRect.create();
    newSel.assign(this.selection_);
    var hasReversedX = newSel.hasReversedX()
    if (hasReversedX)
        newSel.invertX();
    if (columns.begin <= newSel.x2) {
        var l = columns.length();
        newSel.x2 += l;
        if (columns.begin <= newSel.x1)
            newSel.x1 += l;

        if (hasReversedX)
            newSel.invertX();
        this.setSelection(newSel);
    }
    newSel.release();
};

/**
 * 5 cases to deal with (x => selection, | = gap column)
 * 1) xxxx |||
 *    Action: nothing
 *
 * 2) xxxx
 *      ||||
 *    Action: decrease selection stop to gap range beginning - 1
 *
 * 3) xxxxxxxxxxx
 *        ||||
 *    Action: decrease selection stop by gap range size
 *
 * 4)   xxxx
 *    ||||
 *    Action: set selection start to gap range beginning and decrease selection stop by gap range size
 *
 * 5)   xxxx
 *    ||||||||
 *    Action: entire selection region has been removed, set the default selection
 *
 * 6)     xxxx
 *    ||||
 *    Action: decrease selection start and stop by removed range size
 *
 * @param {Array.<ag.core.ClosedIntRange>} columnRanges
 * @protected
 */
MsaView.prototype.onMsaGapColumnsRemoved = function(columnRanges) {
    if (this.selection_) {
        var clearSel = false;

        var newSel = UnitRect.create();
        newSel.assign(this.selection_);
        newSel.normalize();

        var i = columnRanges.length;
        while (i--) {
            var range = columnRanges[i];
            // Case 1: gap range is beyond selection
            if (range.begin > newSel.x2)
                continue;

            var rangeLength = range.length();

            // Cases 2 and 3: Gap range overlaps right portion of selection
            if (range.begin > newSel.x1)
                newSel.x2 -= Math.min(newSel.x2 - range.begin + 1, rangeLength);
            // Cases 4 and 5: gap range end overlaps left portion (or all) of selection
            else if (range.end >= newSel.x1) {
                newSel.x1 = range.begin;
                newSel.x2 = Math.max(0, newSel.x2 - rangeLength);
            }
            // Case 6: gap range is completely to the left of the selection start
            else {
                newSel.x1 -= rangeLength;
                newSel.x2 -= rangeLength;
            }

            if (newSel.x2 < newSel.x1) {
                clearSel = true;
                // Since the selection is to be cleared, no need to continue modifying the selection relative to gap removal
                break;
            }
        }

        if (clearSel)
            this.clearSelection();
        else
            this.setSelection(newSel);

        newSel.release();
    }

    // !! Important to update scroll bar ranges and steps *before* updating the margin widget geometries.
    // Why? Because it can adjust the canvas size which is used in the update margin method to set the location
    // of the stop side widget.
    this.updateScrollBarRangesAndSteps_();
    this.updateMarginWidgetGeometries_();   // <-- Call this *after* updateScrollBarRangesAndSteps_()
    this.update();
};

/**
 * @param {ag.core.ClosedIntRange} rows
 * @protected
 */
MsaView.prototype.onMsaRowsInserted = function(rows) {
    /*
    this.updateScrollBarRangesAndSteps_();
    this.updateMarginWidgetGeometries_();
    this.startSideWidget_.updateWidth();
    this.stopSideWidget_.updateWidth();

    var curSel = this.selection_.normalized();
    if (rows.begin > curSel.y2)
        return;

    var newSel = curSel;
    */
};

/**
 * @param {ag.core.ClosedIntRange} rows
 * @param {number} finalRow
 * @protected
 */
MsaView.prototype.onMsaRowsMoved = function(rows, finalRow) {};

/**
 * @param {ag.core.ClosedIntRange} rows
 * @protected
 */
MsaView.prototype.onMsaRowsRemoved = function(rows) {};

/**
 * @param {UnitRect} rect
 * @param {number} delta
 * @param {ag.core.ClosedIntRange} finalRange
 * @protected
 */
MsaView.prototype.onMsaSlid = function(rect, delta, finalRange) {};

/**
 * @protected
 */
MsaView.prototype.onMsaSorted = function() {};

/**
 * @param {ag.bio.MsaSubseqChangeArray} changes
 * @protected
 */
MsaView.prototype.onMsaSubseqsChanged = function(changes) {
    var startChanged = false;
    var stopChanged = false;
    var i = changes.length;
    while (i--) {
        var op = changes[i].operation;
        if (!startChanged &&
            (op === ag.bio.MsaSubseqChange.TrimExtOp.eExtendLeft ||
             op === ag.bio.MsaSubseqChange.TrimExtOp.eTrimLeft)) {
            startChanged = true;
            if (stopChanged)
                break;
        }
        if (!stopChanged &&
            (op === ag.bio.MsaSubseqChange.TrimExtOp.eExtendRight ||
             op === ag.bio.MsaSubseqChange.TrimExtOp.eTrimRight)) {
            stopChanged = true;
            if (startChanged)
                break;
        }
    }

    if (startChanged) {
        this.startSideWidget_.updateWidth();

        // It is possible that the width did not need updating, yet we still need to repaint because
        // the value of a sequence did indeed change.
        this.startSideWidget_.update();
    }
    if (stopChanged) {
        this.stopSideWidget_.updateWidth();
        this.stopSideWidget_.update();
    }
    if (startChanged || stopChanged)
        this.updateMarginWidgetGeometries_();
};


// --------------------------------------------------------------------------------------------------------------------
// Private event handlers
/**
 * @param {goog.events.BrowserEvent} mouseEvent
 * @private
 */
MsaView.prototype.onViewportMouseOut_ = function(mouseEvent) {
    if (this.currentTool_)
        this.currentTool_.viewportMouseOut(mouseEvent);
};

/**
 * @param {goog.events.BrowserEvent} mouseEvent
 * @private
 */
MsaView.prototype.onViewportMouseUp_ = function(mouseEvent) {
    if (this.currentTool_) {
        this.currentTool_.viewportMouseUp(mouseEvent);
        // Check if the currently active tool is temporary and reset it if is
        if (this.currentToolIsTemporary_) {
            // The !isActive_ check avoids the unpleasant scenario where the user has pressed the relevant key to
            // initiate a temporary mode, then somehow exited that mode while an activity is underway. This would leave the
            // operation in an unresolved state.
            if (!this.currentTool_.isActive())
                this.setCurrentTool(this.previousTool_);
        }
    }

    var eh = this.getHandler();
    eh.unlisten(document, events.EventType.MOUSEMOVE, this.mouseMoveEvent)
        .unlisten(document, events.EventType.MOUSEUP, this.onViewportMouseUp_);

    mouseEvent.preventDefault();
    if (this.viewport.releaseCapture)
        this.viewport.releaseCapture();

    // Re-connect the mousemove event handler on the viewport since the document wide
    // handler is no longer active.
    this.setMouseTrackingEnabled();
};

// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * This class provides a visual window into a part or all of an ObservableMsa. When rendering the ObservableMsa, it is
 * only necessary to render the portion of the ObservableMsa that is currently visible. For simplicity and convenience
 * purposes, if any part of a glyph is visible, then we render the entire rectangular block for that glyph. This occurs
 * whenever a glyph rests on the edge of the viewable window. Because scrolling is done at the pixel level and each
 * character typically will cover a rectangular array of pixels, the rendering origin varies from 0 .. negative
 * character width. This method returns this offset value based on the current scroll bar positions and the currently
 * displayed msaRegion.
 *
 * @return {Point}
 * @private
 */
MsaView.prototype.clipRenderOrigin_ = function() {
    if (!this.msa_)
        return Point.create();

    var blockSize = this.blockSize();
    var x = -(this.horizontalScrollBar().value() - blockSize.width * (this.msaClipRect_.x1 - 1)) + this.renderXShift_;
    var y = -(this.verticalScrollBar().value() - blockSize.height * (this.msaClipRect_.y1 - 1));
    return Point.create(x, y);
};

/**
 * Sets the view position (by altering the horizontal and vertical scrollbar values) to the previously saved focus point.
 *
 * @private
 */
MsaView.prototype.restoreViewFocus_ = function() {
    var clipRect = this.clipRect();
    var blockSize = this.blockSize();
    var vfd = this.viewFocusData_;
    this.horizontalScrollBar().setValue((vfd.msaPoint.x-1) * blockSize.width - vfd.leftFraction * clipRect.width());
    this.verticalScrollBar().setValue((vfd.msaPoint.y-1) * blockSize.height - vfd.rightFraction * clipRect.height());
    clipRect.release();
    vfd.msaPoint.release();
    vfd.msaPoint = null;
};

/**
 * Saves the current viewport focus of focusPoint relative to the current viewport dimensions; if focusPoint is not
 * within the viewport, the center of the viewport will be used.
 *
 * @param {Coordinate} optFocusPoint
 * @private
 */
MsaView.prototype.saveViewFocus_ = function(optFocusPoint) {
    var viewSize = this.viewportSize();
    var viewportContainsFocusPoint = optFocusPoint &&
        optFocusPoint.x >= 0 &&
        optFocusPoint.y >= 0 &&
        optFocusPoint.x < viewSize.width &&
        optFocusPoint.y < viewSize.height;
    var viewPoint;
    if (viewportContainsFocusPoint) {
        viewPoint = optFocusPoint;
    }
    else {
        // If the canvas is completely contained within the viewport, then use the center of the canvas as the focus
        // point rather than the center of the viewport.
        var canvasSize = this.canvasSize();
        viewPoint = new Coordinate();
        viewPoint.x = (viewSize.width < canvasSize.width) ? viewSize.width / 2 : canvasSize.width / 2;
        viewPoint.y = (viewSize.height < canvasSize.height) ? viewSize.height / 2 : canvasSize.height / 2;
    }

    var canvasFocusPoint = this.pointRectMapper_.viewPointToCanvasPoint(viewPoint);
    var clipRect = this.clipRect();
    var vfd = this.viewFocusData_;
    vfd.msaPoint = this.pointRectMapper_.canvasPointToMsaPoint(canvasFocusPoint);
    vfd.leftFraction = (canvasFocusPoint.x - clipRect.x1) / clipRect.width();
    vfd.rightFraction = (canvasFocusPoint.y - clipRect.y1) / clipRect.height();
    clipRect.release();
    canvasFocusPoint.release();
};


/**
 * The canvas width and height must be adjusted to match the viewport or less than the viewport if it does not occupy
 * that much space.
 *
 * @private
 */
MsaView.prototype.updateCanvasElementSize_ = function() {
    if (!this.isInDocument())
        return;

    var vs = this.viewportSize();
    var cs = this.canvasSize();

    var renderWidthCapacity = this.canvas_.width;

    // Setting the width or height of the canvas - even if the same value - forces a complete repaint and
    // ugly flicker. Thus, only set these attributes if they differ.
    var targetRenderWidth = Math.min(cs.width, vs.width);
    var increaseCanvasWidth = targetRenderWidth > renderWidthCapacity;
    var decreaseCanvasWidth = targetRenderWidth < (renderWidthCapacity - MsaView.CanvasShrinkThreshold_);
    var resizeCanvasWidth = increaseCanvasWidth || decreaseCanvasWidth;
    var h = Math.min(cs.height, vs.height);
    var resizeCanvasHeight = h !== this.canvas_.height;
    var resizeCanvas = resizeCanvasWidth || resizeCanvasHeight;
    var smallerRenderWidth = targetRenderWidth < this.lastRenderWidth_;

    // Two optimizations to help reduce flicker:
    // 1) Tag the background region to be cleared
    if (!resizeCanvas && smallerRenderWidth) {
        this.backgroundClearSpan_.begin = targetRenderWidth+1;
        this.backgroundClearSpan_.end = this.canvas_.width;
    }

    // 2) Keep an ever-increasing canvas width unless smaller than 512 pixels (arbitrary) difference.
    if (resizeCanvasWidth)
        this.canvas_.width = targetRenderWidth + MsaView.CanvasWidthIncrement_;
        // Add some extra to keep from having  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        // to increase it each time it is 1 pixel larger.
    if (resizeCanvasHeight)
        this.canvas_.height = h;

    this.lastRenderWidth_ = targetRenderWidth;

    this.update();
};

/** @private */
MsaView.prototype.updateMsaCursorPoint_ = function() {
    var old = this.msaCursorPoint_;
    var newPos = this.pointRectMapper_.viewPointToMsaPoint(this.viewportMousePos_);
    if (!old || old.x !== newPos.x || old.y !== newPos.y) {
        if (this.msaCursorPoint_) {
            this.msaCursorPoint_.x = newPos.x;
            this.msaCursorPoint_.y = newPos.y;
        }
        else {
            this.msaCursorPoint_ = Point.create(newPos.x, newPos.y);
        }
        metaObject().emit(this, MsaView.SignalType.MSA_CURSOR_MOVED, this.msaCursorPoint_, old);
    }
    newPos.release();
};

/**
 * If a msa has not been defined or it is empty, the range for both scrollbars is clamped to zero. Otherwise, the range
 * is clamped to canvas dimensions minus the viewport dimensions.
 *
 * Currently, each single scroll bar step is equivalent to the 3 times the width and height of an individual character.
 * The page step is set to the height/width of the viewport.
 *
 * @private
 */
MsaView.prototype.updateScrollBarRangesAndSteps_ = function() {
    this.setScrollableSize(this.msa_ ? this.canvasSize() : new Size(0, 0));

    var bs = this.textRenderer_.blockSize();
    this.verticalScrollBar().setSingleStep(3 * bs.height);
    this.horizontalScrollBar().setSingleStep(3 * bs.width);
};

/**
 * @private
 */
MsaView.prototype.updateMarginWidgetGeometries_ = function() {
    var m = this.margins_;
    m.left = m.right = m.top = m.bottom = 0;
    if (this.startSideWidget_.isInDocument())
        m.left = this.startSideWidget_.width();
    if (this.stopSideWidget_.isInDocument())
        m.right = this.stopSideWidget_.width();
    if (this.ruler_.isInDocument())
        m.top = this.ruler_.height();

    this.setViewportMargins(m);
    this.updateStopSideWidgetPosition_();
};

/** @private */
MsaView.prototype.updateStopSideWidgetPosition_ = function() {
    if (this.renderXShift_ >= 0)
        this.stopSideWidget_.getElement().style.left = (this.viewportMargins().left + this.renderSize().width) + 'px';
        // Reference the canvas dimensions to handle cases when canvas is smaller     ^^^^^^^^^^^^^^^^^^
        // than the viewport size.
};

/** @private */
MsaView.prototype.unwatchMsa_ = function() {
    var msa = this.msa_;
    if (!msa)
        return;

    var mo = metaObject();
    mo.disconnect(msa, MsaSignals.COLLAPSED_LEFT, this, this.onMsaCollapsedLeft);
    mo.disconnect(msa, MsaSignals.COLLAPSED_RIGHT, this, this.onMsaCollapsedRight);
    mo.disconnect(msa, MsaSignals.GAP_COLUMNS_INSERTED, this, this.onMsaGapColumnsInserted);
    mo.disconnect(msa, MsaSignals.GAP_COLUMNS_REMOVED, this, this.onMsaGapColumnsRemoved);
    mo.disconnect(msa, MsaSignals.ROWS_INSERTED, this, this.onMsaRowsInserted);
    mo.disconnect(msa, MsaSignals.ROWS_MOVED, this, this.onMsaRowsMoved);
    mo.disconnect(msa, MsaSignals.ROWS_REMOVED, this, this.onMsaRowsRemoved);
    mo.disconnect(msa, MsaSignals.SLID, this, this.onMsaSlid);
    mo.disconnect(msa, MsaSignals.SORTED, this, this.onMsaSorted);
    mo.disconnect(msa, MsaSignals.SUBSEQS_CHANGED, this, this.onMsaSubseqsChanged);

    this.getHandler().unlisten(this.viewport, events.EventType.MOUSEOUT, this.onViewportMouseOut_);
};

/** @private */
MsaView.prototype.watchMsa_ = function() {
    var msa = this.msa_;
    if (!msa || !this.isInDocument())
        return;

    metaObject().connect(msa, MsaSignals.COLLAPSED_LEFT, this, this.onMsaCollapsedLeft)
        .connect(msa, MsaSignals.COLLAPSED_RIGHT, this, this.onMsaCollapsedRight)
        .connect(msa, MsaSignals.GAP_COLUMNS_INSERTED, this, this.onMsaGapColumnsInserted)
        .connect(msa, MsaSignals.GAP_COLUMNS_REMOVED, this, this.onMsaGapColumnsRemoved)
        .connect(msa, MsaSignals.ROWS_INSERTED, this, this.onMsaRowsInserted)
        .connect(msa, MsaSignals.ROWS_MOVED, this, this.onMsaRowsMoved)
        .connect(msa, MsaSignals.ROWS_REMOVED, this, this.onMsaRowsRemoved)
        .connect(msa, MsaSignals.SLID, this, this.onMsaSlid)
        .connect(msa, MsaSignals.SORTED, this, this.onMsaSorted)
        .connect(msa, MsaSignals.SUBSEQS_CHANGED, this, this.onMsaSubseqsChanged);

    this.getHandler().listen(this.viewport, events.EventType.MOUSEOUT, this.onViewportMouseOut_);
};

// --------------------------------------------------------------------------------------------------------------------
// Static methods
/**
 * @param {UnitRect} rect
 * @param {CanvasRenderingContext2D} context
 */
MsaView.strokeRectangle = function(rect, context) {
    context.save();
    context.translate(.5, .5);
    context.beginPath();
    context.moveTo(rect.x1, rect.y1);
    context.lineTo(rect.x2, rect.y1);
    context.lineTo(rect.x2, rect.y2);
    context.lineTo(rect.x1, rect.y2);
    context.lineTo(rect.x1, rect.y1);
    context.stroke();
    context.restore();
};


/*******************************************************************************************************************/});
