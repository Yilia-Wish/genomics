goog.provide('ag.statemachine.EventType');

goog.require('goog.events');

/** @enum {string} */
ag.statemachine.EventType = {
    RADIO: goog.events.getUniqueId('radio'),
    SIGNAL: goog.events.getUniqueId('signal')
};
