goog.provide('ag.statemachine.StateMachine');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.events');

goog.require('ag.statemachine.AbstractTransition');
goog.require('ag.statemachine.State');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.statemachine.State}
 */
ag.statemachine.StateMachine = function() {
	goog.base(this);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.statemachine.AbstractState}
	 * @private
	 */
	this.currentState_ = null;

	/**
	 * @type {ag.statemachine.AbstractState}
	 * @private
	 */
	this.initialState_ = null;

	/**
	 * @type {boolean}
	 * @private
	 */
	this.running_ = false;

	/**
	 * @type {Array.<AbstractState>}
	 * @private
	 */
	this.states_ = [];
};
goog.inherits(ag.statemachine.StateMachine, ag.statemachine.State);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;

var Event = goog.events.Event;

var AbstractState = ag.statemachine.AbstractState;
var AbstractTransition = ag.statemachine.AbstractTransition;
var StateMachine = ag.statemachine.StateMachine;

// --------------------------------------------------------------------------------------------------------------------
// Signals
/** @enum {string} */
StateMachine.SignalType = {
	STARTED: goog.events.getUniqueId('started'),
	STOPPED: goog.events.getUniqueId('stopped')
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * @param {AbstractState} state
 * @return {AbstractState}
 */
StateMachine.prototype.addState = function(state) {
	assert(this.running_ === false);
	assert(goog.isDefAndNotNull(state));
	assert(state instanceof AbstractState);
	assert(!array.contains(this.states_, state));
	assert(state.stateMachine_ === null);

	state.stateMachine_ = this;
	this.states_.push(state);

	return state;
};

/**
 * Destructor
 */
StateMachine.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	delete this.currentState_;
	delete this.initialState_;
	array.forEach(this.states_, function(state) {
		state.dispose();
	});
	delete this.states_;
};

/** @return {AbstractState} */
StateMachine.prototype.initialState = function() {
	return this.initialState_;
}

/** @return {boolean} */
StateMachine.prototype.isRunning = function() {
	return this.running_;
};

/**
 * If multiple transitions match the given event, then only the first matching one is accepted.
 *
 * @param {Event} event
 */
StateMachine.prototype.postEvent = function(event) {
	if (!this.running_)
		return;

	var transitions = this.currentState_.transitions();
	for (var i=0, z=transitions.length; i<z; i++) {
		var transition = transitions[i];
		if (transition.eventTest(event)) {
			this.currentState_.exit(event);
			transition.trigger(event);
			var target = transition.targetState();
			// Targetless transitions stay in the current state.
			if (!goog.isDefAndNotNull(target))
				target = this.currentState_;
			assert(array.contains(this.states_, target), 'Target state ("%s") does not belong to host state machine', target.name());
			target.enter(event);
			this.currentState_ = target;
			break;
		}
	}

	assert(this.currentState_);
	this.currentState_.processEvent(event);
};

/**
 * When the machine is started, it is assumed to already be in the initial state and therefore no signal for entering
 * this initial state is emitted.
 *
 * @param {AbstractState} state
 */
StateMachine.prototype.setInitialState = function(state) {
	assert(this.running_ === false);
	assert(goog.isDefAndNotNull(state));
	assert(state instanceof AbstractState);
	assert(array.contains(this.states_, state));

	this.initialState_ = state;
};

/**
 * Convenience function for stopping and then starting the machine again.
 */
StateMachine.prototype.restart = function() {
	this.stop();
	this.start();
};

/**
 */
StateMachine.prototype.start = function() {
	assert(this.running_ === false);
	assert(goog.isDefAndNotNull(this.initialState_), 'StateMachine: missing initial state');

	this.currentState_ = this.initialState_;
	this.running_ = true;
	this.emit(StateMachine.SignalType.STARTED);
};

/**
 */
StateMachine.prototype.stop = function() {
	if (!this.running_)
		return;

	this.running_ = false;
	this.currentState_ = null;
	this.emit(StateMachine.SignalType.STOPPED);
};

/*******************************************************************************************************************/});
