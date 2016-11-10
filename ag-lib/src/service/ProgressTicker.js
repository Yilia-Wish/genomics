/**
 * @fileoverview ProgressTicker enables a process to delegate sending out progress updates to this
 *   class for others to easily observe. For example, when searching for primer pairs, the primer pair
 *   algorithm does not have to worry about the logistics of sending out signals as it progresses. Rather
 *   it can inform a ProgressTicker, which can then emit the appropriate signals.
 *
 *   At a minimum, the progress ticker must have two ticks - one given at the start and one for the end; 
 *   however, it is possible to specify any number of ticks that may occur between the range as progress
 *   occurs. Specifically, the ticks will occur at intervals equally distributed throughout the possible
 *   value range. Whenever the value exceeds one of these thresholds, a tick signal will be emitted. If
 *   the value crosses several tick thresholds, only one signal will be emitted to represent the latest
 *   update.
 *
 * @author: ulrich.luke@gmail.com ("Luke Ulrich")
 */
goog.provide('ag.service.ProgressTicker');

goog.require('goog.asserts');
goog.require('goog.events');
goog.require('goog.math');

goog.require('ag.core.AObject');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.core.AObject}
 * @param {ag.core.AObject} optParent
 */
ag.service.ProgressTicker = function(optParent) {
    goog.base(this, optParent);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {number}
     * @private
     */
    this.endValue_ = 100;

    /**
     * @type {number}
     * @private
     */
    this.lastTick_ = -1;

    /**
     * @type {number}
     * @private
     */
    this.ticks_ = 100;

    /**
     * @type {number}
     * @private
     */
    this.unitsPerTick_ = 2;

    /**
     * @type {number}
     * @private
     */
    this.value_ = 0;
};
goog.inherits(ag.service.ProgressTicker, ag.core.AObject);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var math = goog.math;

var ProgressTicker = ag.service.ProgressTicker;


// --------------------------------------------------------------------------------------------------------------------
// Constants
/** @enum {string} */
ProgressTicker.SignalType = {
    // Parameter: number denoting fractional percentage of progress changed
    PROGRESS_TICK: goog.events.getUniqueId('progress-tick')
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * Convenience method for setting the value to the end value.
 */
ProgressTicker.prototype.end = function() {
    this.setValue(this.endValue_);
};

/** @return {number} */
ProgressTicker.prototype.endValue = function() {
    return this.endValue_;
};

/** @return {number} */
ProgressTicker.prototype.progress = function() {
    return this.value_ / this.endValue_;
};

/**
 * Convenience function for resetting the ticker to zero.
 */
ProgressTicker.prototype.reset = function() {
    this.setValue(0);
};

/**
 * @param {number} endValue must be some value greater than zero
 */
ProgressTicker.prototype.setEndValue = function(endValue) {
    assert(endValue > 0, 'End value must be greater than zero');
    this.endValue_ = endValue;
    this.updateUnitsPerTick_();
};

/**
 * @param {number} newTicks
 */
ProgressTicker.prototype.setTicks = function(newTicks) {
    assert(newTicks >= 2, 'ProgressTicker.setTicks() - newTicks argument must be greater than 1 (' + newTicks + ')');
    this.ticks_ = newTicks;
    this.updateUnitsPerTick_();

    // Cause a tick signal to be emitted whenever the value changes next.
    this.lastTick_ = -1;
};

/**
 * @param {number} newValue
 */
ProgressTicker.prototype.setValue = function(newValue) {
    this.value_ = math.clamp(0, newValue, this.endValue_);

    var nextTick = (this.value_ / this.unitsPerTick_) | 0;
    if (this.lastTick_ !== nextTick) {
        this.lastTick_ = nextTick;
        this.emit(ProgressTicker.SignalType.PROGRESS_TICK, this.progress());
    }
};

/**
 * While this function may seem redundant, it enables the atomic adjustment of both the value and end value.
 *
 * @param {number} newValue
 * @param {number} endValue
 */
ProgressTicker.prototype.setValueAndEndValue = function(newValue, endValue) {
    assert(endValue > 0, 'End value must be greater than zero');
    this.endValue_ = endValue;
    this.updateUnitsPerTick_();
    this.setValue(newValue);
};

/** @return {number} */
ProgressTicker.prototype.ticks = function() {
    return this.ticks_;
};

/**
 * @param {number=} optDelta defaults to 1
 */
ProgressTicker.prototype.update = function(optDelta) {
    var delta = goog.isNumber(optDelta) ? optDelta : 1;
    this.setValue(this.value_ + delta);
};

/** @return {number} */
ProgressTicker.prototype.value = function() {
    return this.value_;
};


// --------------------------------------------------------------------------------------------------------------------
// Private functions
/** @private */
ProgressTicker.prototype.updateUnitsPerTick_ = function() {
    this.unitsPerTick_ = this.endValue_ / (this.ticks_ - 1);
};

/*******************************************************************************************************************/});
