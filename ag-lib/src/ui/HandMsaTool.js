goog.provide('ag.ui.HandMsaTool');

goog.require('ag.ui');
goog.require('ag.ui.AbstractMsaTool');

goog.require('goog.math.Coordinate');

/**
 * @constructor
 * @extends {ag.ui.AbstractMsaTool}
 * @param {ag.ui.MsaView} msaView
 */
ag.ui.HandMsaTool = function(msaView) {
    goog.base(this, msaView, ag.ui.AbstractMsaTool.Type.Hand);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {goog.math.Coordinate}
     * @private
     */
    this.lastPanScrollPos_;

    /**
     * @type {goog.math.Coordinate}
     * @private
     */
    this.panAnchorPos_;
};
goog.inherits(ag.ui.HandMsaTool, ag.ui.AbstractMsaTool);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var Coordinate = goog.math.Coordinate;

var HandMsaTool = ag.ui.HandMsaTool;
var Cursor = ag.ui.Cursor;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
HandMsaTool.prototype.activate = function() {
    this.msaView_.setCursor(Cursor.OpenHand);

    goog.base(this, 'activate');
};

// --------------------------------------------------------------------------------------------------------------------
// Protected event handlers
/** @override */
HandMsaTool.prototype.viewportMouseDown = function(mouseEvent) {
    this.msaView_.setCursor();  // Clear the cursor on the canvas element
    document.body.setAttribute('data-cursor', Cursor.ClosedHand);
    this.panAnchorPos_ = new Coordinate(mouseEvent.clientX, mouseEvent.clientY);
    this.lastPanScrollPos_ = this.msaView_.scrollPosition();
    this.isActive_ = true;
};

/** @override */
HandMsaTool.prototype.viewportMouseMove = function(mouseEvent) {
    if (!this.isActive_)
        return;

    var dx = mouseEvent.clientX - this.panAnchorPos_.x;
    var dy = mouseEvent.clientY - this.panAnchorPos_.y;

    this.msaView_.horizontalScrollBar().setValue(this.lastPanScrollPos_.x - dx);
    this.msaView_.verticalScrollBar().setValue(this.lastPanScrollPos_.y - dy);

    this.panAnchorPos_.x = mouseEvent.clientX;
    this.panAnchorPos_.y = mouseEvent.clientY;
    this.lastPanScrollPos_ = this.msaView_.scrollPosition();
};

/** @override */
HandMsaTool.prototype.viewportMouseUp = function(mouseEvent) {
    document.body.removeAttribute('data-cursor');
    this.msaView_.setCursor(Cursor.OpenHand);
    this.isActive_ = false;
};

/** @override */
HandMsaTool.prototype.viewportDeactivate = function(mouseEvent) {

};


/*******************************************************************************************************************/});
