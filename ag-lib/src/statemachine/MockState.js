goog.provide('ag.statemachine.MockState');

goog.require('ag.statemachine.State');

// --------------------------------------------------------------------------------------------------------------------
/**
 * Provides for testing that the processEvent function is called.
 *
 * @constructor
 * @param {string?} optName
 * @extends {ag.statemachine.State}
 */
ag.statemachine.MockState = function(optName) {
	goog.base(this, optName);

	// --------------------------------------------------------------------------------------------------------------------
	// Public members
	/**
	 * @type {Array}
	 * @public
	 */
	this.processedEvents = [];

	/**
	 * @type {Array}
	 * @public
	 */
	this.entryEvents = [];

	/**
	 * @type {Array}
	 * @public
	 */
	this.exitEvents = [];
};
goog.inherits(ag.statemachine.MockState, ag.statemachine.State);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var MockState = ag.statemachine.MockState;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 */
MockState.prototype.clear = function() {
	this.processedEvents = [];
	this.entryEvents = [];
	this.exitEvents = [];
};

/** @override */
MockState.prototype.processEvent = function(event) {
	this.processedEvents.push(event);
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
MockState.prototype.onEntry = function(event) {
	goog.base(this, 'onEntry', event);

	this.entryEvents.push(event);
};

/** @override */
MockState.prototype.onExit = function(event) {
	goog.base(this, 'onExit', event);

	this.exitEvents.push(event);
};


/*******************************************************************************************************************/});
