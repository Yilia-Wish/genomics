goog.provide('ag.ui.AbstractMsaTool');

goog.require('ag.meta.MetaObject');

goog.require('goog.asserts');
goog.require('goog.events');

/**
 * @constructor
 * @param {ag.ui.MsaView} msaView
 * @param {ag.ui.AbstractMsaTool.Type} type
 */
ag.ui.AbstractMsaTool = function(msaView, type) {
    goog.asserts.assert(msaView instanceof ag.ui.MsaView, 'Invalid msaView argument');
    goog.asserts.assert(goog.isDefAndNotNull(type), 'Invalid type argument');

    // --------------------------------------------------------------------------------------------------------------------
    /**
     * @type {ag.ui.MsaView}
     * @protected
     */
    this.msaView_ = msaView;

    /**
     * @type {boolean}
     * @protected
     */
    this.isActive_ = false;

    /**
     * @type {number}
     * @private
     */
    this.type_ = type;
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var events = goog.events;

var AbstractMsaTool = ag.ui.AbstractMsaTool;

var metaObject = ag.meta.MetaObject.getInstance;

/** @enum {number} */
AbstractMsaTool.Type = {
    Select: 0,
    Hand: 1,
    Gap: 2
};

// --------------------------------------------------------------------------------------------------------------------
// Signals
/** @enum {string} */
AbstractMsaTool.SignalType = {
    ACTIVATED: events.getUniqueId('activated'),
    DEACTIVATED: events.getUniqueId('deactivated')
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
AbstractMsaTool.prototype.activate = function() {
    metaObject().emit(this, AbstractMsaTool.SignalType.ACTIVATED);
    this.msaView_.update();
};

AbstractMsaTool.prototype.deactivate = function() {
    this.msaView_.setCursor();
    document.body.removeAttribute('data-cursor');
    metaObject().emit(this, AbstractMsaTool.SignalType.DEACTIVATED);
};

/** @return {boolean} */
AbstractMsaTool.prototype.isActive = function() {
    return this.isActive_;
};

/** @return {ag.ui.MsaView} */
AbstractMsaTool.prototype.msaView = function() {
    return this.msaView_;
};

/** @return {number} */
AbstractMsaTool.prototype.type = function() {
    return this.type_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public event handlers
/**
 * @param {goog.events.BrowserEvent} keyEvent
 */
AbstractMsaTool.prototype.viewportKeyDown = function(keyEvent) {
    // Do not propagate keyboard events if the tool is active. This avoids issues like
    // action-mediated tool switching while a given tool is currently active. For example,
    // panning a MsaView while user presses shortcut for switching to the insert gaps tool
    // should not toggle the insert gaps tool.
    if (this.isActive_)
        keyEvent.stopPropagation();
};

/**
 * @param {goog.events.BrowserEvent} keyEvent
 */
AbstractMsaTool.prototype.viewportKeyUp = function(keyEvent) {};

/**
 * @param {goog.events.BrowserEvent} mouseEvent
 */
AbstractMsaTool.prototype.viewportMouseDown = function(mouseEvent) {};

/**
 * @param {goog.events.BrowserEvent} mouseEvent
 */
AbstractMsaTool.prototype.viewportMouseMove = function(mouseEvent) {};

/**
 * @param {goog.events.BrowserEvent} mouseEvent
 */
AbstractMsaTool.prototype.viewportMouseOut = function(mouseEvent) {};

/**
 * @param {goog.events.BrowserEvent} mouseEvent
 */
AbstractMsaTool.prototype.viewportMouseUp = function(mouseEvent) {};

/**
 * @param {CanvasRenderingContext2D} context
 * @param {ag.core.Point} origin
 * @param {ag.core.UnitRect} msaRect
 */
AbstractMsaTool.prototype.viewportPaint = function(context, origin, msaRect) {};

/**
 * @param {goog.events.BrowserEvent} mouseEvent
 */
AbstractMsaTool.prototype.viewportDeactivate = function(mouseEvent) {};

/*******************************************************************************************************************/});
