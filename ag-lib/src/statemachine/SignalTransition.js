goog.provide('ag.statemachine.SignalTransition');

goog.require('goog.asserts');

goog.require('ag.statemachine.AbstractTransition');

/**
 * @constructor
 * @extends {goog.events.Event}
 * @param {Object} sender
 * @param {string} signalName
 */
ag.statemachine.SignalTransition = function(sender, signalName) {
    goog.base(this);

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

    // --------------------------------------------------------------------------------------------------------------------
    goog.asserts.assert(goog.isObject(sender), 'SignalTransition: sender must be object');
    goog.asserts.assert(goog.isString(signalName), 'SignalTransition: signalName is not a string');
};
goog.inherits(ag.statemachine.SignalTransition, ag.statemachine.AbstractTransition);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var SignalTransition = ag.statemachine.SignalTransition;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {Object} */
SignalTransition.prototype.sender = function() {
    return this.sender_;
};

/** @return {string} */
SignalTransition.prototype.signalName = function() {
    return this.signalName_;
};

// --------------------------------------------------------------------------------------------------------------------
// Reimplemented functions
/** @override */
SignalTransition.prototype.eventTest = function(event) {
    if (event.type !== ag.statemachine.EventType.SIGNAL)
        return false;

    var signalEvent = /** {ag.statemachine.SignalEvent} */ (event);
    return signalEvent.sender() === this.sender_ && signalEvent.signalName() === this.signalName_;
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
SignalTransition.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    delete this.sender_;
};

/*******************************************************************************************************************/});
