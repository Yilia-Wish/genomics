goog.provide('ag.ui.MsaSubseqTableView');

goog.require('ag.ui.AbstractHTMLItemView');
goog.require('ag.ui.MsaView');
goog.require('ag.ui.ScrollBar');
goog.require('ag.meta.MetaObject');
goog.require('ag.model.MsaSubseqModel');

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.events.MouseWheelEvent');
goog.require('goog.events.MouseWheelHandler');
goog.require('goog.style');

/**
 * @constructor
 * @extends {ag.ui.AbstractHTMLItemView}
 * @param {ag.ui.MsaView} msaView
 */
ag.ui.MsaSubseqTableView = function(msaView) {
    goog.base(this);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.ui.MsaView}
     * @private
     */
    this.msaView_ = msaView;

    /**
     * @type {goog.events.MouseWheelHandler}
     * @private
     */
    this.mouseWheelHandler_;

    /**
     * @type {Element|StyleSheet|undefined}
     * @private
     */
    this.styleEl_;

    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    this.constructor_();
};
goog.inherits(ag.ui.MsaSubseqTableView, ag.ui.AbstractHTMLItemView);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var dom = goog.dom;
var events = goog.events;
var style = goog.style;

var TagName = goog.dom.TagName;
var MouseWheelEvent = events.MouseWheelEvent;
var MouseWheelHandler = events.MouseWheelHandler;

var MsaSubseqModel = ag.model.MsaSubseqModel;
var MsaSubseqTableView = ag.ui.MsaSubseqTableView;

var ScrollBar = ag.ui.ScrollBar;
var ScrollBarSignals = ag.ui.ScrollBar.SignalType;

var MsaViewSignals = ag.ui.MsaView.SignalType;

var metaObject = ag.meta.MetaObject.getInstance;

// --------------------------------------------------------------------------------------------------------------------
/** @private */
MsaSubseqTableView.prototype.constructor_ = function() {
    assert(this.msaView_, 'MsaView is not defined');
};

/** @override */
MsaSubseqTableView.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    if (this.mouseWheelHandler_)
        this.mouseWheelHandler_.dispose();

    delete this.mouseWheelHandler_;
    delete this.msaView_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions


// --------------------------------------------------------------------------------------------------------------------
// Reimplemented protected functions
/** @override */
MsaSubseqTableView.prototype.createHTMLForModelRow = function(row) {
    var index = this.model_.index(row, MsaSubseqModel.Columns.Name);

    var domHelper = this.getDomHelper();
    return domHelper.createDom(TagName.P, null, index.data().toString());
};

/** @override */
MsaSubseqTableView.prototype.dataChanged = function(index) {
    switch (index.column()) {
    case MsaSubseqModel.Columns.Name:
        var p = this.elementForIndex(index);
        dom.setTextContent(p, index.data().toString());
        break;
    }
};

/** @override */
MsaSubseqTableView.prototype.decorateInternal = function(element) {
    goog.base(this, 'decorateInternal', element);

    this.mouseWheelHandler_ = new MouseWheelHandler(element);
};

/** @override */
MsaSubseqTableView.prototype.enterDocument = function() {
    goog.base(this, 'enterDocument');

    // Create a dummy div the height of a scrollbar so that the last element will be scrolled properly
    var div = this.getDomHelper().createDom(TagName.DIV);
    style.setHeight(div, ScrollBar.width());
    style.setWidth(div, 10);
    this.getElement().appendChild(div);

    // Proxy all mouse wheel events to the msa view
    this.getHandler().listen(this.mouseWheelHandler_, MouseWheelHandler.EventType.MOUSEWHEEL, this.onWheelEvent_);
    metaObject().connect(this.msaView_.verticalScrollBar(), ScrollBarSignals.VALUE_CHANGED, this, this.onMsaViewScrolled_)
        .connect(this.msaView_, MsaViewSignals.ENTERED_DOCUMENT, this, this.refreshStyleSheet_)
        .connect(this.msaView_, MsaViewSignals.FONT_CHANGED, this, this.refreshStyleSheet_)
        .connect(this.msaView_, MsaViewSignals.MSA_CHANGED, this, this.refreshStyleSheet_)
        .connect(this.msaView_, MsaViewSignals.VIEWPORT_RESIZED, this, this.refreshGeometry_)
        .connect(this.msaView_, ag.ui.ScrollArea.SignalType.VIEWPORT_MARGINS_CHANGED, this, this.refreshGeometry_);

    // Sync the view
    this.refreshGeometry_(this.msaView_.viewportMargins());
    this.onMsaViewScrolled_(this.msaView_.verticalScrollBar().value());

    this.refreshStyleSheet_();
};

/** @override */
MsaSubseqTableView.prototype.exitDocument = function() {
    goog.base(this, 'exitDocument');

    this.getHandler().unlisten(this.mouseWheelHandler_, MouseWheelHandler.EventType.MOUSEWHEEL, this.onWheelEvent_);
    var mo = metaObject();
    mo.disconnect(this.msaView_.verticalScrollBar(), ScrollBarSignals.VALUE_CHANGED, this, this.onMsaViewScrolled_);
    mo.disconnect(this.msaView_, MsaViewSignals.ENTERED_DOCUMENT, this, this.refreshStyleSheet_);
    mo.disconnect(this.msaView_, MsaViewSignals.FONT_CHANGED, this, this.refreshStyleSheet_);
    mo.disconnect(this.msaView_, MsaViewSignals.MSA_CHANGED, this, this.refreshStyleSheet_);
    mo.disconnect(this.msaView_, MsaViewSignals.VIEWPORT_RESIZED, this, this.refreshGeometry_);
    mo.disconnect(this.msaView_, ag.ui.ScrollArea.SignalType.VIEWPORT_MARGINS_CHANGED, this, this.refreshGeometry_);

    if (this.styleEl_) {
        style.uninstallStyles(this.styleEl_);
        this.styleEl_ = undefined;
    }
};

/** @override */
MsaSubseqTableView.prototype.indexFromEvent = function(event) {
    var target = event.target;
    if (target.tagName === TagName.P.toString()) {
        var rootEl = this.rootElement();
        var row = Array.prototype.indexOf.call(rootEl.childNodes, target);
        return this.model_.index(row, 0);
    }

    return goog.base(this, 'indexFromEvent', event);
};

// --------------------------------------------------------------------------------------------------------------------
// Private event handlers
/**
 * @param {goog.events.MouseWheelEvent} wheelEvent
 * @private
 */
MsaSubseqTableView.prototype.onWheelEvent_ = function(wheelEvent) {
    // Proxy vertical scrolling to the msaView
    this.msaView_.proxyWheelEvent(wheelEvent, true /* ignoreX */);

    // Handle horizontal scrolling ourselves
    this.getElement().scrollLeft += wheelEvent.deltaX;
};

// --------------------------------------------------------------------------------------------------------------------
// Private slots
/**
 * @param {number} value
 * @private
 */
MsaSubseqTableView.prototype.onMsaViewScrolled_ = function(value) {
    this.getElement().scrollTop = value;
};

/**
 * @param {goog.math.Box} margins
 * @private
 */
MsaSubseqTableView.prototype.refreshGeometry_ = function(margins) {
    var s = this.getElement().style;
    s.marginTop = margins.top + 'px';
    s.height = this.msaView_.viewportSize().height + 'px';
};

// --------------------------------------------------------------------------------------------------------------------
/** @private */
MsaSubseqTableView.prototype.refreshStyleSheet_ = function() {
    if (this.msaView_.isInDocument()) {
        if (this.styleEl_)
            style.uninstallStyles(this.styleEl_);

        var fs = this.msaView_.fontSize();
        var blockHeight = this.msaView_.blockSize().height;
        var id = this.getElement().id;
        if (id)
            this.styleEl_ = style.installStyles('#' + id + '> p { white-space: nowrap; margin: 0; padding: 0; vertical-align: middle; line-height: ' + blockHeight + 'px; font-size: ' + fs + 'px; height: ' + blockHeight + 'px; }');
        else
            this.styleEl_ = undefined;
    }
};

/*******************************************************************************************************************/});
