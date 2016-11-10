/**
 * @fileoverview Ag's splitpane simply extends the base splitpane by exposing its drag start
 *   event.
 */
goog.provide('ag.ui.SplitPane');

goog.require('goog.ui.SplitPane');

/**
 * @constructor
 * @param {goog.ui.Component} firstComponent Left or Top component.
 * @param {goog.ui.Component} secondComponent Right or Bottom component.
 * @param {goog.ui.SplitPane.Orientation} orientation SplitPane orientation.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @extends {goog.ui.SplitPane}
 */
ag.ui.SplitPane = function(firstComponent, secondComponent, orientation, opt_domHelper) {
    goog.base(this, firstComponent, secondComponent, orientation, opt_domHelper);
};
goog.inherits(ag.ui.SplitPane, goog.ui.SplitPane);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var SplitPane = ag.ui.SplitPane;

// Add in the handle_drag_start event
goog.ui.SplitPane.EventType.HANDLE_DRAG_START = 'handle_drag_start';

// --------------------------------------------------------------------------------------------------------------------
/**
 * Not supposed to override this method! But we're doing it anyways.
 *
 * @suppress {accessControls}
 * @override
 */
SplitPane.prototype.handleDragStart_ = function(e) {
    goog.base(this, 'handleDragStart_', e);
    this.dispatchEvent(goog.ui.SplitPane.EventType.HANDLE_DRAG_START);
};


/*******************************************************************************************************************/});
