goog.provide('ag.statemachine.SignalEvent');

goog.require('goog.asserts');
goog.require('goog.events.Event');

goog.require('ag.statemachine.EventType');

/**
 * @constructor
 * @extends {goog.events.Event}
 * @param {Object} sender
 * @param {string} signalName
 * @param {...} otherParams
 */
ag.statemachine.SignalEvent = function(sender, signalName, otherParams) {
    goog.base(this, ag.statemachine.EventType.SIGNAL);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {Object}
     * @private
     */
    this.sender_ = sender;

    /**
     * @type {string}
     * @private
     */
    this.signalName_ = signalName;

    /**
     * @type {...}
     * @private
     */
    this.otherParams_ = otherParams;

    // --------------------------------------------------------------------------------------------------------------------
    goog.asserts.assert(goog.isObject(sender), 'SignalTransition: sender must be object');
    goog.asserts.assert(goog.isString(signalName), 'SignalTransition: signalName is not a string');
};
goog.inherits(ag.statemachine.SignalEvent, goog.events.Event);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var SignalEvent = ag.statemachine.SignalEvent;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {Object} */
SignalEvent.prototype.sender = function() {
    return this.sender_;
};

/** @return {string} */
SignalEvent.prototype.signalName = function() {
    return this.signalName_;
};

/** @return {*} */
SignalEvent.prototype.otherParams = function() {
    return this.otherParams_;
};


/*******************************************************************************************************************/});
