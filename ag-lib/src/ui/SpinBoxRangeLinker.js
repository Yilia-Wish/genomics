/**
 * @fileoverview: SpinBoxRangeLinker connects two related SpinBoxes by making sure that the first one never has a
 *   value greater than the second and vice versa. If one of the SpinBox values exceeds the other, the other SpinBox
 *   value is adjusted accordingly.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.ui.SpinBoxRangeLinker');

goog.require('goog.asserts');

goog.require('ag.core.AObject');
goog.require('ag.ui.AbstractSpinBox');

// --------------------------------------------------------------------------------------------------------------------
/**
 * To ensure that the controls may be properly linked, it is assumed that the lower SpinBox's min and max values are
 * less than or equals to the upper SpinBox's min and max values.
 *
 * @constructor
 * @param {ag.ui.AbstractSpinBox} lowerSpinBox spin box that contains the lower range value
 * @param {ag.ui.AbstractSpinBox} upperSpinBox spin box that contains the upper range value
 * @param {ag.core.AObject} optParent
 * @extends {ag.core.AObject}
 */
ag.ui.SpinBoxRangeLinker = function(lowerSpinBox, upperSpinBox, optParent) {
    goog.base(this, optParent);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {ag.ui.AbstractSpinBox}
     * @private
     */
    this.lowerSpinBox_ = lowerSpinBox;

    /**
     * @type {ag.ui.AbstractSpinBox}
     * @private
     */
    this.upperSpinBox_ = upperSpinBox;

    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    goog.asserts.assert(this.lowerSpinBox_ instanceof ag.ui.AbstractSpinBox);
    goog.asserts.assert(this.upperSpinBox_ instanceof ag.ui.AbstractSpinBox);

    goog.asserts.assert(this.lowerSpinBox_.minimum() <= this.upperSpinBox_.minimum());
    goog.asserts.assert(this.lowerSpinBox_.maximum() <= this.upperSpinBox_.maximum());

    this.setupConnections_();
};
goog.inherits(ag.ui.SpinBoxRangeLinker, ag.core.AObject);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var AbstractSpinBox = ag.ui.AbstractSpinBox;
var SpinBoxRangeLinker = ag.ui.SpinBoxRangeLinker;


// --------------------------------------------------------------------------------------------------------------------
// Private slots
/**
 * @param {number} newValue
 * @private
 */
SpinBoxRangeLinker.prototype.onLowerValueChanged_ = function(newValue) {
    if (newValue > this.upperSpinBox_.value())
        this.upperSpinBox_.setValue(newValue);
};

/**
 * @param {number} newValue
 * @private
 */
SpinBoxRangeLinker.prototype.onUpperValueChanged_ = function(newValue) {
    if (newValue < this.lowerSpinBox_.value())
        this.lowerSpinBox_.setValue(newValue);
};

// --------------------------------------------------------------------------------------------------------------------
// Private functions
/** @override */
SpinBoxRangeLinker.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    this.disconnect(this.lowerSpinBox_, AbstractSpinBox.SignalType.VALUE_CHANGED, this.onLowerValueChanged_);
    this.disconnect(this.upperSpinBox_, AbstractSpinBox.SignalType.VALUE_CHANGED, this.onUpperValueChanged_);

    delete this.lowerSpinBox_;
    delete this.upperSpinBox_;
};

/** @private */
SpinBoxRangeLinker.prototype.setupConnections_ = function() {
    this.connect(this.lowerSpinBox_, AbstractSpinBox.SignalType.VALUE_CHANGED, this.onLowerValueChanged_);
    this.connect(this.upperSpinBox_, AbstractSpinBox.SignalType.VALUE_CHANGED, this.onUpperValueChanged_);
};

/*******************************************************************************************************************/});
