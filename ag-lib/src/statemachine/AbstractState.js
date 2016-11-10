goog.provide('ag.statemachine.AbstractState');

goog.require('goog.events');

goog.require('ag.core.AObject');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.core.AObject}
 */
ag.statemachine.AbstractState = function() {
	goog.base(this);
};
goog.inherits(ag.statemachine.AbstractState, ag.core.AObject);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var events = goog.events;

var Event = goog.events.Event;

var AbstractState = ag.statemachine.AbstractState;

AbstractState.SignalType = {
	ENTERED: events.getUniqueId('entered'),
	EXITED: events.getUniqueId('exited')
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * This method is called from the StateMachine.postEvent() loop and consequently must be public; however,
 * it is not intended to be called directly by the client.
 *
 * @param {Event} event
 */
AbstractState.prototype.processEvent = goog.abstractMethod;

/** @return {ag.statemachine.StateMachine} */
AbstractState.prototype.stateMachine = function() {
	return null;
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/**
 * @param {Event} event
 * @protected
 */
AbstractState.prototype.onEntry = goog.abstractMethod;

/**
 * @param {Event} event
 * @protected
 */
AbstractState.prototype.onExit = goog.abstractMethod;



/*******************************************************************************************************************/});
