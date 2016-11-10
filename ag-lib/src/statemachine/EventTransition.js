goog.provide('ag.statemachine.EventTransition');

goog.require('goog.asserts');

goog.require('ag.statemachine.AbstractTransition');

/**
 * @constructor
 * @extends {goog.events.Event}
 * @param {string} type
 * @param {Object|null|undefined} optSender
 */
ag.statemachine.EventTransition = function(type, optSender) {
    goog.base(this);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {Object}
     * @private
     */
    this.sender_ = optSender;

    /**
     * @type {string}
     * @private
     */
    this.type_ = type;

    // --------------------------------------------------------------------------------------------------------------------
    goog.asserts.assert(goog.isString(type), 'EventTransition: type is not a string');
    goog.asserts.assert(!optSender || goog.isObject(optSender), 'EventTransition: sender must be object or undefined');
};
goog.inherits(ag.statemachine.EventTransition, ag.statemachine.AbstractTransition);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var EventTransition = ag.statemachine.EventTransition;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {Object} */
EventTransition.prototype.sender = function() {
    return this.sender_;
};

/** @return {string} */
EventTransition.prototype.type = function() {
    return this.type_;
};

// --------------------------------------------------------------------------------------------------------------------
// Reimplemented functions
/** @override */
EventTransition.prototype.eventTest = function(event) {
    return event.type === this.type_ && (!this.sender_ || this.sender_ === event.currentTarget);
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
EventTransition.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    delete this.sender_;
};

/*******************************************************************************************************************/});
