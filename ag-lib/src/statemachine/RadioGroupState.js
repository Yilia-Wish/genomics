/**
 * @fileoverview: Many cases there are needs for a group of states that are mutually exclusive
 *   and may transition to any other state within this group easily. RadioGroupState does this
 *   by encapsulating multiple RadioStates and passing events to the active RadioState. If a
 *   RadioEvent comes in that signifies moving to another RadioState, then this class handles
 *   making that transition and calls the appropriate enter/exit methods of the child state.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.statemachine.RadioGroupState');

goog.require('goog.asserts');
goog.require('goog.object');

goog.require('ag.statemachine.State');
goog.require('ag.statemachine.EventType');

/**
 * @constructor
 * @param {string?} optName
 * @extends {ag.statemachine.State}
 */
ag.statemachine.RadioGroupState = function(optName) {
    goog.base(this, optName);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {Object.<string|number,ag.statemachine.RadioState>}
     * @private
     */
    this.radioStates_ = {};

    /**
     * @type {string|number}
     * @private
     */
    this.currentRadioId_;
};
goog.inherits(ag.statemachine.RadioGroupState, ag.statemachine.State);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var object = goog.object;

var RadioGroupState = ag.statemachine.RadioGroupState;


// --------------------------------------------------------------------------------------------------------------------
// Destructor
/** @override */
RadioGroupState.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    for (var id in this.radioStates_)
        this.radioStates_[id].dispose();

    delete this.radioStates_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {string|number} */
RadioGroupState.prototype.currentRadioId = function() {
    return this.currentRadioId_;
};

/**
 * @param {ag.statemachine.RadioState} newRadioState
 * @return {ag.statemachine.RadioState}
 */
RadioGroupState.prototype.addRadioState = function(newRadioState) {
    var newId = newRadioState.id();
    assert(!object.containsKey(this.radioStates_, newId), 'Radio state already present with id: ' + newId);
    this.radioStates_[newId] = newRadioState;
    return newRadioState;
};

/** @override */
RadioGroupState.prototype.processEvent = function(event) {
    if (event.type !== ag.statemachine.EventType.RADIO)
        return;

    var radioEvent = /** @type {ag.statemachine.RadioEvent} */ (event);
    var radioId = radioEvent.id;
    if (!object.containsKey(this.radioStates_, radioId) || radioId == this.currentRadioId_)
        return;

    if (goog.isDefAndNotNull(this.currentRadioId_))
        this.radioStates_[this.currentRadioId_].exit(event);
    this.radioStates_[radioId].enter(event);
    this.currentRadioId_ = radioId;
};

/*******************************************************************************************************************/});
