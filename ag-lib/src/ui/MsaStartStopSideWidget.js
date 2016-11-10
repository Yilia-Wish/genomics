goog.provide('ag.ui.MsaStartStopSideWidget');

goog.require('ag.meta.MetaObject');
goog.require('ag.service.RAFHub');
goog.require('ag.ui');

goog.require('goog.asserts');
goog.require('goog.dom.TagName');
goog.require('goog.ui.Component');

/**
 * @constructor
 * @extends {goog.ui.Component}
 * @param {ag.ui.MsaView} msaView
 * @param {ag.ui.MsaStartStopSideWidget.PositionType=} optPositionType defaults to Start
 */
ag.ui.MsaStartStopSideWidget = function(msaView, optPositionType) {
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
     * @type {CanvasRenderingContext2D}
     * @private
     */
    this.context_;

    /**
     * @type {ag.ui.Alignment}
     * @private
     */
    this.alignment_ = ag.ui.Alignment.Left;

    /**
     * @type {number}
     * @private
     */
    this.horizontalPadding_ = 6;

    /**
     * @type {ag.ui.MsaStartStopSideWidget.PositionType}
     * @private
     */
    this.positionType_ = goog.isDefAndNotNull(optPositionType) ? optPositionType : ag.ui.MsaStartStopSideWidget.PositionType.Start;
};
goog.inherits(ag.ui.MsaStartStopSideWidget, goog.ui.Component);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var TagName = goog.dom.TagName;

var MsaStartStopSideWidget = ag.ui.MsaStartStopSideWidget;

var RAFHub = ag.service.RAFHub.getInstance;
var ScrollBarSignals = ag.ui.ScrollBar.SignalType;
var metaObject = ag.meta.MetaObject.getInstance;

/** @enum {number} */
ag.ui.MsaStartStopSideWidget.PositionType = {
    Start: 0,
    Stop: 1,
    InverseStart: 2,
    InverseStop: 3
};

var PositionType = ag.ui.MsaStartStopSideWidget.PositionType;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {ag.ui.Alignment} */
MsaStartStopSideWidget.prototype.alignment = function() {
    return this.alignment_;
};

/** @return {number} */
MsaStartStopSideWidget.prototype.horizontalPadding = function() {
    return this.horizontalPadding_;
};

/** @return {PositionType} */
MsaStartStopSideWidget.prototype.positionType = function() {
    return this.positionType_;
};

MsaStartStopSideWidget.prototype.raf =
MsaStartStopSideWidget.prototype.repaint = function() {
    var canvas = this.getElement();
    var height = canvas.height;
    var width = canvas.width;
    var context = this.context_;
    context.clearRect(0, 0, width, height);

    var msa = this.msaView_.msa();
    if (!msa)
        return;

    var blockSize = this.msaView_.blockSize();
    var rowHeight = blockSize.height;
    var baseline = this.msaView_.textRenderer().baseline();
    var vertScrollPos = this.msaView_.verticalScrollBar().value();
    var y = (-vertScrollPos % rowHeight) + baseline;
    var nRows = msa.rowCount();
    var row = Math.floor(vertScrollPos / rowHeight) + 1; // Convert to 1-based msa indices
    var padding = this.horizontalPadding_;
    var x = padding;
    var alignment = this.alignment_;

    for (var z = height + rowHeight; y< z && row <= nRows; y += rowHeight, ++row) {
        //                ^^^^^^^^^ Ensure that the last partial row is also rendered
        var subseq = msa.at(row);
        var label;
        switch (this.positionType_) {
            case PositionType.Start:
                label = subseq.start();
                break;
            case PositionType.Stop:
                label = subseq.stop();
                break;
            case PositionType.InverseStart:
                label = subseq.inverseStart();
                break;
            case PositionType.InverseStop:
                label = subseq.inverseStop();
                break;

            default:
                continue;
        }

        label = label.toString();

        var dx = x;
        if (alignment === ag.ui.Alignment.Right)
            dx = width - context.measureText(label).width - padding;

        context.fillText(label, dx, y);
    }
};

/** @param {ag.ui.Alignment} newAlignment */
MsaStartStopSideWidget.prototype.setAlignment = function(newAlignment) {
    if (newAlignment === this.alignment_)
        return;

    this.alignment_ = newAlignment;
    this.update();
};

/**
 * @param {number} newHeight
 */
MsaStartStopSideWidget.prototype.setHeight = function(newHeight) {
    var canvas = this.getElement();
    if (!this.isInDocument() || newHeight === canvas.height)
        return;

    canvas.height = newHeight;

    // Because we changed the height, the context is reset. Therefore, re-update the font.
    this.updateFont_();
    this.update();
};

MsaStartStopSideWidget.prototype.update = function() {
    if (this.isInDocument())
        RAFHub().update(this);
};

/**
 * Updates the width of the canvas to reflect the width of the longest possible position. Called automatically
 * when the msa or the font changes. Other cases: adding / removing / trimming / extending sequences will produce
 * numeric start and stop values which in turn could change the width.
 */
MsaStartStopSideWidget.prototype.updateWidth = function() {
    var longestPosition = this.longestPosition_();
    var canvas = this.getElement();

    var oldWidth = canvas.width;

    // Update the font to match the msaView's font *before* we do any measurements
    this.updateFont_();
    var newWidth = this.context_.measureText(longestPosition + '').width + 2 * this.horizontalPadding_;
    // Convert to string  ---------------------------------> ^^^^

    if (oldWidth === newWidth)
        return;

    canvas.width = newWidth;

    // console.log('Longest string: ' + longestPosition + '; newwidth: ' + newWidth);

    // Since we have changed the canvas width all previous state is lost. Configure the font for the context.
    this.updateFont_();
    this.update();
};

/** @return {number} */
MsaStartStopSideWidget.prototype.width = function() {
    return this.getElement().width;
};

// --------------------------------------------------------------------------------------------------------------------
// Reimplmented methods
/** @override */
MsaStartStopSideWidget.prototype.canDecorate = function(element) {
    return element.tagName === TagName.CANVAS.toString();
};

/** @override */
MsaStartStopSideWidget.prototype.createDom = function() {
    this.decorateInternal(this.dom_.createElement(TagName.CANVAS));
};

/** @override */
MsaStartStopSideWidget.prototype.decorateInternal = function(element) {
    goog.base(this, 'decorateInternal', element);

    this.context_ = element.getContext('2d');
    element.height = 0;
    element.width = 0;
    element.style.position = 'absolute';
    // Make the backgrond non-transparent white so that white will show through when clearRect is called and not
    // whatever transparent junk remains.
    element.style.backgroundColor = '#fff';
};

/** @override */
MsaStartStopSideWidget.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    delete this.msaView_;
};

/** @override */
MsaStartStopSideWidget.prototype.enterDocument = function() {
    goog.base(this, 'enterDocument');

    var MsaViewSignals = ag.ui.MsaView.SignalType;

    metaObject().connect(this.msaView_.verticalScrollBar(), ScrollBarSignals.VALUE_CHANGED, this, this.update)
        .connect(this.msaView_, MsaViewSignals.FONT_CHANGED, this, this.updateWidth)
        .connect(this.msaView_, MsaViewSignals.MSA_CHANGED, this, this.onMsaChanged_)
        .connect(this.msaView_, MsaViewSignals.VIEWPORT_RESIZED, this, this.onViewportResized_)
        .connect(this.msaView_, ag.ui.ScrollArea.SignalType.VIEWPORT_MARGINS_CHANGED, this, this.onViewportMarginsChanged_);
    this.getElement().height = this.msaView_.viewportSize().height;
    this.updateWidth();    // Triggers a paint request
};

/** @override */
MsaStartStopSideWidget.prototype.exitDocument = function() {
    goog.base(this, 'exitDocument');

    var MsaViewSignals = ag.ui.MsaView.SignalType;

    metaObject().disconnect(this.msaView_.verticalScrollBar(), ScrollBarSignals.VALUE_CHANGED, this, this.update);
    metaObject().disconnect(this.msaView_, MsaViewSignals.FONT_CHANGED, this, this.updateWidth);
    metaObject().disconnect(this.msaView_, MsaViewSignals.MSA_CHANGED, this, this.onMsaChanged_);
    metaObject().disconnect(this.msaView_, MsaViewSignals.VIEWPORT_RESIZED, this, this.onViewportResized_);
    metaObject().disconnect(this.msaView_, ag.ui.ScrollArea.SignalType.VIEWPORT_MARGINS_CHANGED, this, this.onViewportMarginsChanged_);
};


// --------------------------------------------------------------------------------------------------------------------
// Private slots
/**
 * @param {ag.bio.Msa} newMsa
 * @private
 */
MsaStartStopSideWidget.prototype.onMsaChanged_ = function(newMsa) {
    if (newMsa)
        this.updateWidth();
    else
        this.update();
};

/**
 * @param {goog.math.Box} margins
 * @private
 */
MsaStartStopSideWidget.prototype.onViewportMarginsChanged_ = function(margins) {
    assert(this.isInDocument(), 'Not in document');

    var canvas = this.getElement();
    canvas.style.top = margins.top + 'px';
    this.setHeight(this.msaView_.viewportSize().height);   // Triggers a paint request
};

/**
 * @param {goog.math.Size} size
 * @private
 */
MsaStartStopSideWidget.prototype.onViewportResized_ = function(size) {
    this.setHeight(size.height);
};


// --------------------------------------------------------------------------------------------------------------------
// Private
/**
 * @return {number}
 * @private
 */
MsaStartStopSideWidget.prototype.longestPosition_ = function() {
    var longest = 0;
    var msa = this.msaView_.msa();
    if (msa) {
        var nRows = msa.rowCount();
        switch (this.positionType_) {
            case PositionType.Start:
                for (var i=1; i<= nRows; ++i)
                    longest = Math.max(longest, msa.at(i).start());
                break;
            case PositionType.Stop:
                for (var i=1; i<= nRows; ++i)
                    longest = Math.max(longest, msa.at(i).stop());
                break;
            case PositionType.InverseStart:
                for (var i=1; i<= nRows; ++i)
                    longest = Math.min(longest, msa.at(i).inverseStart());
                break;
            case PositionType.InverseStop:
                for (var i=1; i<= nRows; ++i)
                    longest = Math.min(longest, msa.at(i).inverseStop());
                break;
        }
    }

    return longest;
};

/** @private */
MsaStartStopSideWidget.prototype.updateFont_ = function() {
    this.context_.font = 'italic ' + this.msaView_.font();
    this.context_.fillStyle = '#404040';
};


/*******************************************************************************************************************/});
