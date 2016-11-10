/**
 * @fileoverview SpinBox extends AbstractSpinBox to input a value constrained to an integral range.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.ui.SpinBox');

goog.require('goog.asserts');

goog.require('ag.ui.AbstractSpinBox');
goog.require('ag.core.ClosedIntRange');
goog.require('ag.validation.IntValidator');


// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.ui.AbstractSpinBox}
 * @param {ag.validation.IntValidator=} optValidator Defaults to default constructed IntValidator
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
ag.ui.SpinBox = function(optValidator, optDomHelper) {
	goog.asserts.assert(!optValidator || optValidator instanceof ag.validation.IntValidator);
	var validator = optValidator;
	if (!validator) {
		var range = new ag.core.ClosedIntRange(0, 99);
		validator = new ag.validation.IntValidator(range);
	}
	goog.base(this, validator, optDomHelper);
};
goog.inherits(ag.ui.SpinBox, ag.ui.AbstractSpinBox);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var SpinBox = ag.ui.SpinBox;


// --------------------------------------------------------------------------------------------------------------------
// Constants
SpinBox.Css = {
	RootClass: goog.getCssName('ag-spinBox')
};


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
SpinBox.prototype.rootCssClass = function() {
	return SpinBox.Css.RootClass;
};

/** @override */
SpinBox.prototype.setMaximum = function(newMaximum) {
	goog.base(this, 'setMaximum', newMaximum | 0);
};

/** @override */
SpinBox.prototype.setMinimum = function(newMinimum) {
	goog.base(this, 'setMinimum', newMinimum | 0);
};

/** @override */
SpinBox.prototype.setSingleStep = function(newSingleStep) {
	goog.base(this, 'setSingleStep', newSingleStep | 0);
};


// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
SpinBox.prototype.convertValidStringValueToNumber = function(value) {
	return parseInt(value);
};


/*******************************************************************************************************************/});
