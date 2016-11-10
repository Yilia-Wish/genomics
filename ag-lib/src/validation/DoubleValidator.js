goog.provide('ag.validation.DoubleValidator');

goog.require('goog.asserts');
goog.require('goog.math');

goog.require('ag');
goog.require('ag.core.ClosedIntRange');
goog.require('ag.core.ClosedRealRange');
goog.require('ag.validation.AbstractNumberValidator');
goog.require('ag.validation.IntValidator');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends ag.validation.AbstractNumberValidator
 * @param {ag.core.ClosedRealRange=} optRange Optional range defining valid real numbers
 */
ag.validation.DoubleValidator = function(optRange) {
	goog.base(this);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.validation.IntValidator}
	 * @private
	 */
	this.intValidator_ = new ag.validation.IntValidator();

	/**
	 * @type {ag.core.ClosedRealRange}
	 * @private
	 */
	this.range_;

	// --------------------------------------------------------------------------------------------------------------------
	// Initialization
	if (goog.isDefAndNotNull(optRange) && optRange instanceof ag.core.ClosedRealRange)
		this.range_ = optRange.normalized();
	else
		this.range_ = new ag.core.ClosedRealRange(Number.MIN_VALUE, Number.MAX_VALUE);

	this.updateIntValidatorRange_();
};
goog.inherits(ag.validation.DoubleValidator, ag.validation.AbstractNumberValidator);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var math = goog.math;

var ClosedIntRange = ag.core.ClosedIntRange;
var ClosedRealRange = ag.core.ClosedRealRange;
var DoubleValidator = ag.validation.DoubleValidator;
var State = ag.validation.AbstractValidator.State;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
DoubleValidator.prototype.fixup = function(input) {
	if (goog.isNumber(input))
		return input + '';
	else if (!goog.isString(input))
		return '';

	// Remove all but digits, negative signs, periods and leading zeroes
	var result = input.replace(/[^0-9-.]/g, '');
	var leadingNegativeSign = result.substr(0, 1) === '-';
	result = result.replace(/-/g, '');

	// Remove any leading zeroes up to the first period
	result = result.replace(/^0+\./, '0.');

	// Remove all leading zeroes up to the first non-zero digit
	result = result.replace(/^0+([1-9])/, '$1');

	// Replace all leading zeroes with single zero
	result = result.replace(/^0+$/, '0');

	// Remove any extraneous periods
	var firstPeriodPos = result.indexOf('.');
	result = result.replace(/\./g, '');

	// Re-insert any period
	if (firstPeriodPos >= 0)
		result = result.substr(0, firstPeriodPos) + '.' + result.substr(firstPeriodPos);

	if (leadingNegativeSign)
		result = '-' + result;

	return result;
};

/** @override */
DoubleValidator.prototype.range = function() {
	return this.range_;
};

/** @override */
DoubleValidator.prototype.setMaximum = function(newMaximum) {
	this.range_.end = newMaximum;
	if (this.range_.begin > this.range_.end)
		this.range_.begin = this.range_.end;
	this.updateIntValidatorRange_();
};

/** @override */
DoubleValidator.prototype.setMinimum = function(newMinimum) {
	this.range_.begin = newMinimum;
	if (this.range_.end < this.range_.begin)
		this.range_.end = this.range_.begin;
	this.updateIntValidatorRange_();
};

/** @override */
DoubleValidator.prototype.setRange = function(newRange) {
	assert(newRange instanceof ClosedRealRange);
	this.range_ = newRange.normalized();
	this.updateIntValidatorRange_();
};

/** @override */
DoubleValidator.prototype.validate = function(input) {
	if (!goog.isString(input))
		return State.Invalid;

	if (input.length === 0)
		return State.Intermediate;

	var isNegative = input[0] === '-';
	if ((this.range_.end < 0 && !isNegative) || (this.range_.begin >= 0 && isNegative))
		return State.Invalid;
	
	if (/^-?\.?$/.test(input))
		return State.Intermediate;

	if (!/^-?(\d+|\d+\.|\d*\.\d+)$/.test(input))
		return State.Invalid;

	var x = parseFloat(input);
	assert(!isNaN(x));
	if (this.range_.contains(x))
		return State.Acceptable;

	if (this.range_.begin < 0 && this.range_.end > 0)
		return State.Invalid;

	if (this.range_.begin >= 0) {
		if (x < 0)
			return State.Invalid;
		else if (x === 0)
			return State.Intermediate;
	}

	// Split into two parts: handling the left side of the decimal place and then the right side
	// of the decimal place.
	// 1) Left side of decimal place will be handled by the IntValidator
	var intState = this.intValidator_.validate((x | 0) + '');
	if (intState !== State.Acceptable)
		return intState;

	// x < this.range_.begin, but it could be at an intermediate value. Determine if this is the case.
	var cmpRangeBegin = this.range_.begin;
	var cmpRangeEnd = this.range_.end;
	if (cmpRangeEnd < 0) {
		// Translate everything into its positive equivalent
		cmpRangeBegin = -cmpRangeEnd;
		cmpRangeEnd = -this.range_.begin;
		x = -x;
	}
	if (x > cmpRangeEnd)
		return State.Invalid;

	// 2) Now onto the decimal portion
	var stringX = DoubleValidator.extractDecimalString_(x);
	if (!stringX)
		return State.Intermediate;

	var intX = x | 0;
	var intMin = this.range_.begin | 0;
	var intMax = this.range_.end | 0;

	var matchedMin = intX === intMin;
	var matchedMax = intX === intMax;

	var stringMin = DoubleValidator.extractDecimalString_(cmpRangeBegin);
	var stringMax = DoubleValidator.extractDecimalString_(cmpRangeEnd);

	var maxLen = Math.max(stringMin.length, stringMax.length);
	assert(maxLen > 0);
	//     ^^^^^^^^^^ If we get to this point, we can safely assume the following:
	// 1) X is outside of range
	// 2) The integer portion is acceptable
	// Therefore, 3) there has to be a differentiating factor via the decimal portion
	stringMin = DoubleValidator.padWithZeroes_(stringMin, maxLen);
	stringMax = DoubleValidator.padWithZeroes_(stringMax, maxLen);

	var xDigit = parseInt(stringX[0]);
	var minDigit = matchedMin ? parseInt(stringMin[0]) : 0;
	var maxDigit = matchedMax ? parseInt(stringMax[0]) : 9;
	var range = new ClosedIntRange(minDigit, maxDigit);
	if (!range.contains(xDigit))
		return State.Invalid;
	var matchedMin = xDigit === range.begin;
	var matchedMax = xDigit === range.end;
	for (var i=1, z=Math.min(stringMin.length, stringX.length); i<z; i++) {
		xDigit = parseInt(stringX[i]);
		range.begin = matchedMin ? parseInt(stringMin[i]) : 0;
		range.end = matchedMax ? parseInt(stringMax[i]) : 9;
		if (!range.contains(xDigit))
			return State.Invalid;

		matchedMin = matchedMin && xDigit === range.begin;
		matchedMax = matchedMax && xDigit === range.end;
	}

	return State.Intermediate;
};


// --------------------------------------------------------------------------------------------------------------------
// Private functions
/** @private */
DoubleValidator.prototype.updateIntValidatorRange_ = function() {
	this.intValidator_.setMinimum(this.range_.begin | 0);
	this.intValidator_.setMaximum(this.range_.end | 0);
};


// --------------------------------------------------------------------------------------------------------------------
// Private static functions
/**
 * @param {number} num
 * @return {string}
 */
DoubleValidator.extractDecimalString_ = function(num) {
	assert(goog.isNumber(num));
	var stringNum = num + '';

	// First check if it has an e- portion
	var eIndex = stringNum.indexOf('e');
	assert(eIndex === -1, 'Value out of range');

	var decimalIndex = stringNum.indexOf('.');
	if (decimalIndex === -1)
		return '';

	return stringNum.substr(decimalIndex + 1);
};

/**
 * @param {string} stringNumber
 * @param {number} width
 * @return {string}
 */
DoubleValidator.padWithZeroes_ = function(stringNumber, width) {
	return stringNumber + '0'.repeated(width - stringNumber.length);
};


/*******************************************************************************************************************/});
