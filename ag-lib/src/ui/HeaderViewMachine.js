goog.provide('ag.ui.HeaderViewMachine');

goog.require('goog.asserts');

goog.require('ag.statemachine.StateMachine');

/**
 * @constructor
 * @extends {StateMachine}
 * @param {HeaderView} headerView
 */
ag.ui.HeaderViewMachine = function(headerView) {
	goog.base(this);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.ui.AbstractHeaderView}
	 * @private
	 */
	this.headerView_ = null;

	// --------------------------------------------------------------------------------------------------------------------
	// Initialization
	goog.asserts.assert(goog.isDefAndNotNull(headerView));
	goog.asserts.assert(headerView instanceof ag.ui.AbstractHeaderView);
	this.headerView_ = headerView;
};
goog.inherits(ag.ui.HeaderViewMachine, ag.statemachine.StateMachine);



/**********************************************************************************************/ goog.scope(function() {
// Aliases
var HeaderViewMachine = ag.ui.HeaderViewMachine;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {ag.ui.HeaderView} */
HeaderViewMachine.prototype.headerView = function() {
	return this.headerView_;
};

/*******************************************************************************************************************/});
