goog.provide('ag.statemachine.RadioEvent');

goog.require('goog.asserts');
goog.require('goog.events.Event');

goog.require('ag.statemachine.EventType');

/**
 * @constructor
 * @extends {goog.events.Event}
 * @param {string|number} id
 */
ag.statemachine.RadioEvent = function(id) {
    goog.base(this, ag.statemachine.EventType.RADIO);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {string|number}
     * @public
     */
    this.id = id;
};
goog.inherits(ag.statemachine.RadioEvent, goog.events.Event);
