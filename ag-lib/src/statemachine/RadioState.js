/**
 * @fileoverview: RadioState represents a particular exclusive state among a group of related
 *   states similar to that of an HTML radio group, and is adpated to the State Machine
 *   framework here. Technically, it simply extends the default State object with an identifier
 *   for recognizing it among its sibling RadioStates.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.statemachine.RadioState');

goog.require('ag.statemachine.State');

/**
 * @constructor
 * @extends {ag.statemachine.State}
 * @param {string|number} id
 * @param {string?} optName
 */
ag.statemachine.RadioState = function(id, optName) {
    goog.base(this, optName);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {string|number}
     * @private
     */
    this.id_ = id;
};
goog.inherits(ag.statemachine.RadioState, ag.statemachine.State);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var RadioState = ag.statemachine.RadioState;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
RadioState.prototype.id = function() {
    return this.id_;
};


/*******************************************************************************************************************/});
