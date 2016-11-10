goog.provide('ag.validation.IntValidator');

goog.require('goog.asserts');
goog.require('goog.math');

goog.require('ag.core.ClosedIntRange');
goog.require('ag.validation.AbstractNumberValidator');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends ag.validation.AbstractNumberValidator
 * @param {ag.core.ClosedIntRange=} optRange Optional range defining valid integers
 */
ag.validation.IntValidator = function(optRange) {
	goog.base(this);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.core.ClosedIntRange}
	 * @private
	 */
	this.range_;


	// --------------------------------------------------------------------------------------------------------------------
	// Initialization
	if (goog.isDefAndNotNull(optRange) && optRange instanceof ag.core.ClosedIntRange)
		this.range_ = optRange.normalized();
	else
		this.range_ = new ag.core.ClosedIntRange(-(-1>>>1)-1, -1>>>1);
};
goog.inherits(ag.validation.IntValidator, ag.validation.AbstractNumberValidator);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var math = goog.math;

var ClosedIntRange = ag.core.ClosedIntRange;
var IntValidator = ag.validation.IntValidator;

var State = ag.validation.AbstractValidator.State;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
IntValidator.prototype.fixup = function(input) {
	if (goog.isNumber(input)) {
		if (math.isInt(input))
			return input + '';
		input = input + '';
	}
	else if (!goog.isString(input)) {
		return '';		
	}

	// Remove all but digits and negative signs and any leading zeroes
	var result = input.replace(/[^0-9-]/g, '')
					  .replace(/^(-?)0+([1-9])/, '$1$2')
					  .replace(/^(-?)0{2,}$/, '$10');
	var leadingNegativeSign = result.substr(0, 1) === '-';
	// Remove any negative signs in the middle of the string
	result = result.replace(/-/g, '');
	if (leadingNegativeSign && this.range_.begin < 0)
		result = '-' + result;
	return result;
};

/** @override */
IntValidator.prototype.range = function() {
	return this.range_;
};

/** @override */
IntValidator.prototype.setMaximum = function(newMaximum) {
	assert(math.isInt(newMaximum));
	this.range_.end = newMaximum;
	if (this.range_.begin > this.range_.end)
		this.range_.begin = this.range_.end;
};

/** @override */
IntValidator.prototype.setMinimum = function(newMinimum) {
	assert(math.isInt(newMinimum));
	this.range_.begin = newMinimum;
	if (this.range_.end < this.range_.begin)
		this.range_.end = this.range_.begin;
};

/** @override */
IntValidator.prototype.setRange = function(newRange) {
	assert(newRange instanceof ClosedIntRange);
	this.range_ = newRange.normalized();
};

/** @override */
IntValidator.prototype.validate = function(input) {
	if (!goog.isString(input) || !/^-?\d*$/.test(input))
		return State.Invalid;

	if (input.length === 0)
		return State.Intermediate;

	if (input.length === 1 && input[0] === '-' && this.range_.begin < 0)
		return State.Intermediate;

	var x = parseInt(input);
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

	var stringX = x + '';
	var stringMin = cmpRangeBegin + '';
	var stringMax = cmpRangeEnd + '';

	if (stringMax.length - stringMin.length >= 2)
		return State.Intermediate;

	var xDigit = parseInt(stringX[0]);
	var range = new ClosedIntRange(parseInt(stringMin[0]), parseInt(stringMax[0]));
	if (stringMax.length - stringMin.length === 1) {
		if (xDigit < range.begin && xDigit > range.end)
			return State.Invalid;
	}
	else if (!range.contains(xDigit))
		return State.Invalid

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


/*******************************************************************************************************************/});
