goog.provide('ag.ui.DoubleSpinBox');

goog.require('goog.asserts');

goog.require('ag');
goog.require('ag.ui.AbstractSpinBox');
goog.require('ag.core.ClosedRealRange');
goog.require('ag.validation.DoubleValidator');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.ui.AbstractSpinBox}
 * @param {ag.validation.DoubleValidator=} optValidator Defaults to a default constructed DoubleValidator
 * @param {number=} optVisibleDecimals optional number of decimals to display at any given time; defaults to 1
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
ag.ui.DoubleSpinBox = function(optValidator, optVisibleDecimals, optDomHelper) {
	goog.asserts.assert(!optValidator || optValidator instanceof ag.validation.DoubleValidator);
	var validator = optValidator;
	if (!validator) {
		var range = new ag.core.ClosedRealRange(0, 100);
		validator = new ag.validation.DoubleValidator(range);
	}
	goog.base(this, validator, optDomHelper);


	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	this.visibleDecimals_ = 1;


	// --------------------------------------------------------------------------------------------------------------------
	// Initialization
	if (goog.isNumber(optVisibleDecimals))
		this.setVisibleDecimals(optVisibleDecimals);
};
goog.inherits(ag.ui.DoubleSpinBox, ag.ui.AbstractSpinBox);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var format = goog.format;

var DoubleSpinBox = ag.ui.DoubleSpinBox;


// --------------------------------------------------------------------------------------------------------------------
// Constants
DoubleSpinBox.Css = {
	RootClass: goog.getCssName('ag-doubleSpinBox')
};


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
DoubleSpinBox.prototype.enterDocument = function() {
	goog.base(this, 'enterDocument');

	this.showHideExtraDecimalPlaces_();
};

/** @override */
DoubleSpinBox.prototype.rootCssClass = function() {
	return DoubleSpinBox.Css.RootClass;
};

/**
 * @param {number} decimals
 */
DoubleSpinBox.prototype.setVisibleDecimals = function(decimals) {
	assert(decimals >= 0);
	this.visibleDecimals_ = decimals;

	// Update the display if necessary
	if (this.isInDocument())
		this.editingFinished();
};

/** @return {number} */
DoubleSpinBox.prototype.visibleDecimals = function() {
	return this.visibleDecimals_;
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
DoubleSpinBox.prototype.convertValidStringValueToNumber = function(value) {
	return parseFloat(value);
};

/** @override */
DoubleSpinBox.prototype.editingFinished = function() {
	this.showHideExtraDecimalPlaces_();
};

/** @override */
DoubleSpinBox.prototype.valueChangedViaStep = function() {
	this.showHideExtraDecimalPlaces_();
};

// --------------------------------------------------------------------------------------------------------------------
// Private functions
/**
 * Updates the display value to only show the relevant number of decimal places. No rounding is performed during this
 * operation.
 *
 * @private
 */
DoubleSpinBox.prototype.showHideExtraDecimalPlaces_ = function() {
	if (!this.isInDocument())
		return;

	// Limit display to the specified number of decimals
	var input = this.getElement();
	var strValue = this.value() + '';

	if (this.visibleDecimals_ > 0) {
		var periodPos = strValue.indexOf('.');
		var curDecimals = (periodPos !== -1) ? strValue.length - periodPos - 1 : 0;
		if (curDecimals > this.visibleDecimals_) {
			var nToChop = curDecimals - this.visibleDecimals_;
			strValue = strValue.substr(0, strValue.length - nToChop);
		}
		else if (this.visibleDecimals_ > curDecimals) {
			var nZeroesToAdd = this.visibleDecimals_ - curDecimals;
			if (curDecimals === 0)
				strValue += '.';
			strValue += '0'.repeated(nZeroesToAdd);
		}
	}
	else {
		// Do not show any decimal places
		strValue = strValue.replace(/\.\d*$/, '');
	}

	input.value = strValue;
};

/*******************************************************************************************************************/});
