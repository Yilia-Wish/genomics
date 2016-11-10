goog.provide('ag.ui.HeaderViewMachine.HeaderViewMouseTransition');

goog.require('goog.asserts');

goog.require('ag.statemachine.AbstractTransition');
goog.require('ag.ui');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.statemachine.AbstractTransition}
 * @param {goog.events.EventType} eventType
 * @param {boolean=} optMouseOverHandle defaults to undefined
 */
ag.ui.HeaderViewMachine.HeaderViewMouseTransition = function(eventType, optMouseOverHandle) {
	goog.base(this);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {goog.events.EventType}
	 * @private
	 */
	this.type_ = eventType;

	/**
	 * @type {boolean}
	 * @private
	 */
	this.mouseOverHandle_ = null;

	// --------------------------------------------------------------------------------------------------------------------
	// Initialization
	if (goog.isBoolean(optMouseOverHandle))
		this.mouseOverHandle_ = optMouseOverHandle;
};
goog.inherits(ag.ui.HeaderViewMachine.HeaderViewMouseTransition, ag.statemachine.AbstractTransition);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var ResizeMode = ag.ui.ResizeMode;
var HeaderViewMouseTransition = ag.ui.HeaderViewMachine.HeaderViewMouseTransition;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
HeaderViewMouseTransition.prototype.eventTest = function(event) {
	if (event.type !== this.type_)
		return false;

	if (!goog.isDefAndNotNull(this.mouseOverHandle_))
		return true;

	// A specific mouse over handle status has been provided. Therefore, check the placement
	// of the current mouse position relative to a handle status.
	var userData = event.hasOwnProperty('userData') ? event['userData'] : null;
	var mouseIsOverAHandle = (userData && userData['mouseOverHandle']);
	if (this.mouseOverHandle_ && mouseIsOverAHandle) {
		var headerViewMachine = /** @type {ag.ui.HeaderViewMachine.HeaderViewMachine} */ (this.stateMachine());
		var headerView = headerViewMachine.headerView();
		assert(userData.hasOwnProperty('column'));
		var column = userData['column'];
		assert(column !== -1);

		// One final test: does this handle support resizing?
		return headerView.resizeMode(column) === ResizeMode.kInteractive;
	}
	else if (goog.isDefAndNotNull(this.mouseOverHandle_) && !this.mouseOverHandle_ && !mouseIsOverAHandle)
		return true;

	return false;
};

/*******************************************************************************************************************/});
