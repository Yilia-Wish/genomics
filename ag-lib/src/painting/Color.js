goog.provide('ag.painting.Color');

goog.require('goog.asserts');
goog.require('goog.color');
goog.require('goog.math');

/**
 * @constructor
 * @param {number=} optR defaults to 0
 * @param {number=} optG defaults to 0
 * @param {number=} optB defaults to 0
 */
ag.painting.Color = function(optR, optG, optB) {
	/**
	 * @type {number}
	 * @public
	 */
	this.r = goog.isNumber(optR) && this.isUnsigned8bit_(optR) ? optR : 0;

	/**
	 * @type {number}
	 * @public
	 */
	this.g = goog.isNumber(optG) && this.isUnsigned8bit_(optG) ? optG : 0;

	/**
	 * @type {number}
	 * @public
	 */
	this.b = goog.isNumber(optB) && this.isUnsigned8bit_(optB) ? optB : 0;
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var color = goog.color;
var math = goog.math;

var Color = ag.painting.Color;

// --------------------------------------------------------------------------------------------------------------------
// Static public methods
/**
 * @param {number} rgbInteger
 * @return {Color}
 */
Color.createFromRgbInteger = function(rgbInteger) {
	assert(goog.isNumber(rgbInteger));
	assert(rgbInteger >= 0);
	var r = (rgbInteger >> 16) & 0xFF;
	var g = (rgbInteger >> 8) & 0xFF;
	var b = rgbInteger & 0xFF;
	return new Color(r, g, b);
};

/** @return {Color} */
Color.random = function() {
	var r = math.randomInt(256);
	var g = math.randomInt(256);
	var b = math.randomInt(256);
	return new Color(r, g, b);
};

/**
 * @param {string} hexColor
 * @return {Color}
 */
Color.createFromHexString = function(hexColor) {
	assert(goog.isString(hexColor));
	var rgbArray = color.hexToRgb(hexColor);
	return new Color(rgbArray[0], rgbArray[1], rgbArray[2]);
};

Color.hexToRgbInteger = function(hexColor) {
	var rgbArray = color.hexToRgb(hexColor);
	return Color.toRgbInteger(rgbArray[0], rgbArray[1], rgbArray[2]);
};

Color.toRgbInteger = function(r, g, b) {
	return (r << 16) + (g << 8) + b;
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @return {number} */
Color.prototype.toRgbInteger = function() {
	return Color.toRgbInteger(this.r, this.g, this.b);
};

/** @return {string} */
Color.prototype.toHexString = function() {
	return color.rgbToHex(this.r, this.g, this.b);
};

// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @param {number} number
 * @return {boolean}
 */
Color.prototype.isUnsigned8bit_ = function(number) {
	return number >= 0 && number <= 255;
};


/*******************************************************************************************************************/});
