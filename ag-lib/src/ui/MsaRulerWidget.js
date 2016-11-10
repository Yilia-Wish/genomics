goog.provide('ag.ui.MsaRulerWidget');

goog.require('ag.meta.MetaObject');
goog.require('ag.painting.CharPixelMetrics');
goog.require('ag.service.RAFHub');
goog.require('ag.ui.ScrollBar');
// Note: cannot include MsaView because this would create a circular reference:
// MsaView requires MsaRulerWidget
// MsaRulerWidget requires MsaView

goog.require('goog.asserts');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.ui.Component');

/**
 * @constructor
 * @extends {goog.ui.Component}
 * @param {ag.ui.MsaView} msaView
 */
ag.ui.MsaRulerWidget = function(msaView) {
    // Special classes that could not be require'd due to circular references, but necessary for this
    // class to function.
    goog.asserts.assert(ag.ui.MsaView, 'ag.ui.MsaView must be loaded before this class');
    goog.asserts.assert(msaView);

    goog.base(this);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.ui.MsaView}
     * @private
     */
    this.msaView_ = msaView;

    /**
     * @type {number}
     * @private
     */
    this.bottomVerticalPadding_ = 3;

    /**
     * @type {number}
     * @private
     */
    this.unitsPerLabel_ = 10;

    /**
     * @type {CanvasRenderingContext2D}
     * @private
     */
    this.context_;

    /**
     * @type {number}
     * @private
     */
    this.viewWidth_;
}
goog.inherits(ag.ui.MsaRulerWidget, goog.ui.Component);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var events = goog.events;
var TagName = goog.dom.TagName;

var MsaRulerWidget = ag.ui.MsaRulerWidget;
// var MsaView = ag.ui.MsaView;

var RAFHub = ag.service.RAFHub.getInstance;

// var MsaViewSignals = MsaView.SignalType;
var ScrollBarSignals = ag.ui.ScrollBar.SignalType;
var metaObject = ag.meta.MetaObject.getInstance;

// --------------------------------------------------------------------------------------------------------------------
// Reimplemented public methods
/** @override */
MsaRulerWidget.prototype.canDecorate = function(element) {
    return element.tagName === TagName.CANVAS.toString();
};

/** @override */
MsaRulerWidget.prototype.createDom = function() {
    this.decorateInternal(this.dom_.createElement(TagName.CANVAS));
};

/** @override */
MsaRulerWidget.prototype.decorateInternal = function(element) {
    goog.base(this, 'decorateInternal', element);

    this.context_ = element.getContext('2d');
    element.style.position = 'absolute';
    element.height = 0;
    element.width = 0;
};

/** @override */
MsaRulerWidget.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    delete this.msaView_;
};

/** @override */
MsaRulerWidget.prototype.enterDocument = function() {
    goog.base(this, 'enterDocument');

    var MsaViewSignals = ag.ui.MsaView.SignalType;

    this.getHandler().listen(this.getElement(), events.EventType.MOUSEMOVE, this.update);
    metaObject().connect(this.msaView_, MsaViewSignals.MSA_CURSOR_MOVED, this, this.update)
        .connect(this.msaView_.horizontalScrollBar(), ScrollBarSignals.VALUE_CHANGED, this, this.update)
        .connect(this.msaView_, MsaViewSignals.FONT_CHANGED, this, this.updateHeight)
        .connect(this.msaView_, MsaViewSignals.VIEWPORT_RESIZED, this, this.onViewportResized_)
        .connect(this.msaView_, ag.ui.ScrollArea.SignalType.VIEWPORT_MARGINS_CHANGED, this, this.onViewportMarginsChanged_);
    this.getElement().width = this.msaView_.viewportSize().width;
    this.updateHeight();
};

/** @override */
MsaRulerWidget.prototype.exitDocument = function() {
    goog.base(this, 'exitDocument');

    var MsaViewSignals = ag.ui.MsaView.SignalType;

    this.getHandler().unlisten(this.getElement(), events.EventType.MOUSEMOVE, this.update);
    metaObject().disconnect(this.msaView_, MsaViewSignals.MSA_CURSOR_MOVED, this, this.update);
    metaObject().disconnect(this.msaView_.horizontalScrollBar(), ScrollBarSignals.VALUE_CHANGED, this, this.update);
    metaObject().disconnect(this.msaView_, MsaViewSignals.FONT_CHANGED, this, this.updateHeight);
    metaObject().disconnect(this.msaView_, MsaViewSignals.VIEWPORT_RESIZED, this, this.onViewportResized_);
    metaObject().disconnect(this.msaView_, ag.ui.ScrollArea.SignalType.VIEWPORT_MARGINS_CHANGED, this, this.onViewportMarginsChanged_);
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {number} */
MsaRulerWidget.prototype.bottomVerticalPadding = function() {
    return this.bottomVerticalPadding_;
};

/** @return {number} */
MsaRulerWidget.prototype.height = function() {
    return this.getElement().height;
};

MsaRulerWidget.prototype.raf =
MsaRulerWidget.prototype.repaint = function() {
    var canvas = this.getElement();
    var height = canvas.height;
    var context = this.context_;
    context.clearRect(0, 0, canvas.width, height);

    var msa = this.msaView_.msa();
    if (!msa || msa.rowCount() === 0)
        return;

    var blockSize = this.msaView_.blockSize();
    var columnWidth = blockSize.width;
    var horizScrollPos = this.msaView_.horizontalScrollBar().value();
    var offset = -horizScrollPos % columnWidth + this.msaView_.renderXShift();
    var startColumn = Math.floor(horizScrollPos / columnWidth) + 1;  // Convert to 1-based msa indices
    var msaLength = msa.columnCount();
    var halfColumnWidth = Math.floor(columnWidth / 2.);

    var tickHeight = Math.floor(this.msaView_.fontSize() / 2);
    var halfTickHeight = Math.floor(tickHeight / 2.);
    var halfTickXShift = Math.floor(this.unitsPerLabel_ / 2 * columnWidth);

    var baseline = this.msaView_.textRenderer().baseline();

    var x = offset + .5;
    var column = 0;
    if (startColumn === 1) {
        // Special case: always draw 1 at the very left hand side of alignment
        context.fillText('1', x, baseline);
        var left = x + halfColumnWidth;
        var bottom = height - this.bottomVerticalPadding_;
        MsaRulerWidget.drawLine_(context, left, bottom, left, bottom - tickHeight);

        if (this.unitsPerLabel_ / 2. <= msaLength) {
            left += halfTickXShift - columnWidth;
            MsaRulerWidget.drawLine_(context, left, bottom, left, bottom - halfTickHeight);
        }

        x += (this.unitsPerLabel_ - 1) * columnWidth;
        column = this.unitsPerLabel_;
    }
    else {
        column = Math.floor(startColumn / this.unitsPerLabel_) * this.unitsPerLabel_;
        x += (column - startColumn) * columnWidth;
    }

    for (var w = this.viewWidth_; x < w && column <= msaLength; column += this.unitsPerLabel_) {
        context.fillText(column.toString(), x, baseline);

        var left = x + halfColumnWidth;
        var bottom = height - this.bottomVerticalPadding_;
        MsaRulerWidget.drawLine_(context, left, bottom, left, bottom - tickHeight);

        // Only render the half tick mark if it is still within the msa bounds
        left += halfTickXShift;
        if (left < w && column + (this.unitsPerLabel_ / 2.) <= msaLength)
            MsaRulerWidget.drawLine_(context, left, bottom, left, bottom - halfTickHeight);

        x += this.unitsPerLabel_ * columnWidth;
    }

    // Now draw the mouse location
    var msaPoint = this.msaView_.msaCursorPoint();
    if (msaPoint) {
        var mouseColumn = msaPoint.x;
        context.beginPath();

        var x1 = (mouseColumn - startColumn) * columnWidth + offset + halfColumnWidth - this.msaView_.renderXShift() + .5;
        var y1 = height - this.bottomVerticalPadding_;
        context.moveTo(x1, y1);

        var x2 = x1 - halfColumnWidth;
        var y2 = y1 - tickHeight;
        context.lineTo(x2, y2);

        var x3 = x1 + halfColumnWidth;
        var y3 = y2;
        context.lineTo(x3, y3);

        context.closePath();
        context.fill();
    }
};

/**
 * @param {number} padding
 */
MsaRulerWidget.prototype.setBottomVerticalPadding = function(padding) {
    assert(padding >= 0);
    this.bottomVerticalPadding_ = padding;
    this.update();
};

/**
 * @param {number} unitsPerLabel
 */
MsaRulerWidget.prototype.setUnitsPerLabel = function(unitsPerLabel) {
    assert(unitsPerLabel >= 0);
    this.unitsPerLabel_ = unitsPerLabel;
    this.update();
};

/**
 * Use a constantly expanding (in width) canvas to avoid flicker. Anytime we resize the canvas a flicker is induced.
 * By simply enlarging it as necessary, we avoid this nasty effect.
 *
 * @param {number} newWidth
 */
MsaRulerWidget.prototype.setWidth = function(newWidth) {
    if (!this.isInDocument())
        return;

    this.viewWidth_ = newWidth;
    var canvas = this.getElement();
    if (newWidth > canvas.width) {
        canvas.width = newWidth;

        // Because we changed the width, the context is reset. Therefore, re-update the font.
        this.context_.font = this.msaView_.font();
    }

    this.update();
};

/** @return {number} */
MsaRulerWidget.prototype.unitsPerLabel = function() {
    return this.unitsPerLabel_;
};

MsaRulerWidget.prototype.update = function() {
    if (this.isInDocument())
        RAFHub().update(this);
};

MsaRulerWidget.prototype.updateHeight = function() {
    var fs = this.msaView_.fontSize();
    var tickHeight = Math.ceil(fs / 2);
    var extra = 2;
    this.getElement().height = fs + extra + this.bottomVerticalPadding_ + tickHeight;
    this.context_.font = this.msaView_.font();
    this.update();
};

// --------------------------------------------------------------------------------------------------------------------
// Private event handlers
/**
 * @param {goog.math.Box} margins
 * @private
 */
MsaRulerWidget.prototype.onViewportMarginsChanged_ = function(margins) {
    assert(this.isInDocument(), 'Not in document');

    var el = this.getElement();
    el.style.left = margins.left + 'px';
    this.setWidth(this.msaView_.viewportSize().width);  // Triggers a paint request
};

/**
 * @param {goog.math.Size} size
 * @private
 */
MsaRulerWidget.prototype.onViewportResized_ = function(size) {
    this.setWidth(size.width);
};

// --------------------------------------------------------------------------------------------------------------------
// Private static methods
MsaRulerWidget.drawLine_ = function(context, x1, y1, x2, y2) {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
};

/*******************************************************************************************************************/});
