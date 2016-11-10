goog.provide('ag.statemachine.AbstractTransition');

goog.require('goog.events');

goog.require('ag.core.AObject');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.core.AObject}
 */
ag.statemachine.AbstractTransition = function() {
	goog.base(this);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.statemachine.AbstractState}
	 * @private
	 */
	this.targetState_ = null;
};
goog.inherits(ag.statemachine.AbstractTransition, ag.core.AObject);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var AbstractTransition = ag.statemachine.AbstractTransition;

// --------------------------------------------------------------------------------------------------------------------
// Signals
/** @enum {string} */
AbstractTransition.SignalType = {
	TRIGGERED: goog.events.getUniqueId('triggered')
};

// --------------------------------------------------------------------------------------------------------------------
// Destructor
/** @override */
AbstractTransition.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	delete this.targetState_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * @param {goog.events.Event} event
 * @return {boolean}
 */
AbstractTransition.prototype.eventTest = goog.abstractMethod;

/**
 * @param {ag.statemachine.AbstractState} abstractState
 */
AbstractTransition.prototype.setTargetState = function(abstractState) {
	this.targetState_ = abstractState;
};

/** @return {ag.statemachine.StateMachine} */
AbstractTransition.prototype.stateMachine = function() {
	if (!this.targetState_)
		return null;

	return this.targetState_.stateMachine();
};

/** @return {ag.statemachine.AbstractState} */
AbstractTransition.prototype.targetState = function() {
	return this.targetState_;
};

/**
 * Calls the virtual method onTransition and emits the triggered signal. Should only be called by StateMachine and not
 * directly consumed by the client.
 *
 * @param {goog.events.Event} event
 */
AbstractTransition.prototype.trigger = function(event) {
	this.onTransition(event);
	this.emit(AbstractTransition.SignalType.TRIGGERED);
};


// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/**
 * This base class implementation does nothing.
 *
 * @param {goog.events.Event} event
 * @protected
 */
AbstractTransition.prototype.onTransition = function(event) {};

/*******************************************************************************************************************/});
