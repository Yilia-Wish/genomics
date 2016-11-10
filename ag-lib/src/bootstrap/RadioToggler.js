/**
 * @fileoverview: Uses the values returned of a composed RadioGroup value changed signal as dom selectors to
 *   toggle a list of classes supplied during construction. Useful for toggling classes in response to a
 *   radio group changing values.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('bootstrap.RadioToggler');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');

goog.require('ag.core.AObject');
goog.require('bootstrap.RadioGroup');

/**
 * @constructor
 * @extends {ag.core.AObject}
 * @param {bootstrap.RadioGroup} radioGroup
 * @param {string} activeClassList
 * @param {string} inactiveClassList
 */
bootstrap.RadioToggler = function(radioGroup, activeClassList, inactiveClassList) {
    goog.base(this);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {bootstrap.RadioGroup}
     * @private
     */
    this.radioGroup_ = radioGroup;

    /**
     * @type {string}
     * @private
     */
    this.activeClassList_ = activeClassList;

    /**
     * @type {string}
     * @private
     */
    this.inactiveClassList_ = inactiveClassList;

    // --------------------------------------------------------------------------------------------------------------------
    this.initialize_();
};
goog.inherits(bootstrap.RadioToggler, ag.core.AObject);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var classes = goog.dom.classes;
var dom = goog.dom;

var RadioToggler = bootstrap.RadioToggler;

// --------------------------------------------------------------------------------------------------------------------
// Destructor
RadioToggler.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    this.disconnect(this.radioGroup_, bootstrap.RadioGroup.SignalType.VALUE_CHANGED, this.onRadioValueChanged_);

    delete this.radioGroup_;
};

// --------------------------------------------------------------------------------------------------------------------
// Private slots
RadioToggler.prototype.onRadioValueChanged_ = function(newValue, oldValue) {
    var activeClasses = this.activeClassList_;
    var inactiveClasses = this.inactiveClassList_;

    if (oldValue) {
        var targets = document.querySelectorAll(oldValue);
        var i = targets.length;
        while (i--)
            classes.addRemove(targets[i], activeClasses, inactiveClasses);
    }

    if (newValue) {
        var targets = document.querySelectorAll(newValue);
        var i = targets.length;
        while (i--)
            classes.addRemove(targets[i], inactiveClasses, activeClasses);
    }
};

// --------------------------------------------------------------------------------------------------------------------
// Private functions
RadioToggler.prototype.initialize_ = function() {
    assert(this.radioGroup_, 'Invalid radio group');

    this.connect(this.radioGroup_, bootstrap.RadioGroup.SignalType.VALUE_CHANGED, this.onRadioValueChanged_);
};

/*******************************************************************************************************************/});
