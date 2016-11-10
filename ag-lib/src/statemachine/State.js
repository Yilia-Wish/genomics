goog.provide('ag.statemachine.State');

goog.require('goog.asserts');

goog.require('ag.statemachine.AbstractState');
goog.require('ag.statemachine.SignalTransition');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @param {string?} optName
 * @extends {ag.statemachine.AbstractState}
 */
ag.statemachine.State = function(optName) {
	goog.base(this);

	// --------------------------------------------------------------------------------------------------------------------
	// Protected members
	/**
	 * @type {ag.statemachine.StateMachine}
	 * @protected
	 */
	this.stateMachine_ = null;


	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {string}
	 * @private
	 */
	this.name_ = goog.isString(optName) ? optName : null;

	/**
	 * @type {Array.<ag.statemachine.AbstractTransition>}
	 * @private
	 */
	this.transitions_ = [];
};
goog.inherits(ag.statemachine.State, ag.statemachine.AbstractState);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var Event = goog.events.Event;

var AbstractState = ag.statemachine.AbstractState;
var SignalTransition = ag.statemachine.SignalTransition;
var State = ag.statemachine.State;

// --------------------------------------------------------------------------------------------------------------------
// Destructor
/** @override */
State.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	var i=this.transitions_.length;
	while (i--)
		this.transitions_[i].dispose();

	delete this.transitions_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * @type {ag.statemachine.AbstractTransition} transition
 */
State.prototype.addTransition = function(transition) {
	assert(goog.isDefAndNotNull(transition));
	assert(goog.isNull(transition.stateMachine()) || transition.stateMachine() === this.stateMachine_);

	this.transitions_.push(transition);
};

/**
 * @param {Object} sender
 * @param {string} signalName
 * @param {ag.statemachine.AbstractState}
 */
State.prototype.addTransitionForSignal = function(sender, signalName, targetState) {
	var transition = new SignalTransition(sender, signalName);
	transition.setTargetState(targetState);
	this.addTransition(transition);
};

/**
 * Because entering and exiting a state is controlled by the state machine and there is no concept of friend
 * classes in JavaScript, it is necessary to make enter and exit functions public; however, they should not be
 * called from the client.
 *
 * @param {Event}
 */
State.prototype.enter = function(event) {
	this.onEntry(event);
	this.emit(AbstractState.SignalType.ENTERED);
};

/**
 * Because entering and exiting a state is controlled by the state machine and there is no concept of friend
 * classes in JavaScript, it is necessary to make enter and exit functions public; however, they should not be
 * called from the client.
 *
 * @param {Event}
 */
State.prototype.exit = function(event) {
	this.onExit(event);
	this.emit(AbstractState.SignalType.EXITED);
};

/** @return {string} */
State.prototype.name = function() {
	return this.name_;
};

/**
 * No-op in this implementation.
 *
 * @override
 */
State.prototype.processEvent = function(event) {};

/** @return {ag.statemachine.StateMachine} */
State.prototype.stateMachine = function() {
	return this.stateMachine_;
};

/** @return {Array.<ag.statemachine.AbstractTransition>} */
State.prototype.transitions = function() {
	return this.transitions_;
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
State.prototype.onEntry = function(event) {
	// console.log('Entering: ' + this.name_);
};

/** @override */
State.prototype.onExit = function(event) {
	// console.log('Exiting: ' + this.name_);
};

/*******************************************************************************************************************/});
