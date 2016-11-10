goog.provide('ag.statemachine.MockTransition');

goog.require('ag.statemachine.AbstractTransition');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @param {string?} optEventType
 * @extends {ag.statemachine.AbstractTransition}
 */
ag.statemachine.MockTransition = function(optEventType) {
	goog.base(this);
	
	// --------------------------------------------------------------------------------------------------------------------
	// Public members
	/**
	 * @type {Array}
	 * @public
	 */
	this.transitionEventLog = [];


	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	this.transitionOnType_ = goog.isString(optEventType) ? optEventType : null;
};
goog.inherits(ag.statemachine.MockTransition, ag.statemachine.AbstractTransition);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var MockTransition = ag.statemachine.MockTransition;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
MockTransition.prototype.eventTest = function(event) {
	return (!goog.isNull(this.transitionOnType_) &&
		event.type === this.transitionOnType_);
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
MockTransition.prototype.onTransition = function(event) {
	this.transitionEventLog.push(event);
};

/*******************************************************************************************************************/});
