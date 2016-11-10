goog.provide('ag.ui.HeaderViewMachine.ResizingColumnState');

goog.require('goog.asserts');

goog.require('goog.events.EventType');

goog.require('ag.statemachine.State');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.statemachine.State}
 */
ag.ui.HeaderViewMachine.ResizingColumnState = function(optName) {
	goog.base(this, optName);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {number}
	 * @private
	 */
	this.activeColumn_ = -1;

	/**
	 * @type {number}
	 * @private
	 */
	this.mouseDownX_ = 0;

	/**
	 * @type {number}
	 * @private
	 */
	this.savedColumnWidth_ = 0;
};
goog.inherits(ag.ui.HeaderViewMachine.ResizingColumnState, ag.statemachine.State);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var EventType = goog.events.EventType;

var ResizingColumnState = ag.ui.HeaderViewMachine.ResizingColumnState;

// --------------------------------------------------------------------------------------------------------------------
// Reimplemented protected functions
/** @override */
ResizingColumnState.prototype.onEntry = function(event) {
	assert(event.hasOwnProperty('userData') && goog.isDefAndNotNull(event['userData']['column']));
	this.activeColumn_ = event['userData']['column'];
	assert(this.activeColumn_ !== -1);

	var headerViewMachine = /** @type {ag.ui.HeaderViewMachine} */ (this.stateMachine());
	var headerView = headerViewMachine.headerView();

	this.savedColumnWidth_ = headerView.sectionSize(this.activeColumn_);
	this.mouseDownX_ = event.screenX;

	goog.base(this, 'onEntry', event);
};

/** @override */
ResizingColumnState.prototype.processEvent = function(event) {
	if (event.type !== EventType.MOUSEMOVE)
		return;

	var curX = event.screenX;
	var delta = curX - this.mouseDownX_;
	var newWidth = this.savedColumnWidth_ + delta;
	var headerViewMachine = /** @type {ag.ui.HeaderViewMachine} */ (this.stateMachine());
	var headerView = headerViewMachine.headerView();
	headerView.resizeSection(this.activeColumn_, newWidth);
};


/*******************************************************************************************************************/});
