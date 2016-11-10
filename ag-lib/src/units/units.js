goog.provide('ag.units');

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var units = ag.units;

// --------------------------------------------------------------------------------------------------------------------
// Static defines
units.MetricPrefix = {
	// YOTTA:
	// ZETA:
	// EXA:
	PETA: 1e15,
	TERA: 1e12,
	GIGA: 1e9,
	MEGA: 1e6,
	KILO: 1e3,
	HECTO: 1e2,
	DECA: 1e1,

	DECI: 1e-1,
	CENTI: 1e-2,
	MILLI: 1e-3,
	MICRO: 1e-6,
	NANO: 1e-9,
	PICO: 1e-12,
	FEMTO: 1e-15
	// ATTO:
	// ZEPTO:
	// YOCTO:
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * Converts value of a specific multiple to its non-prefixed amount of units. For example,
 *
 * var mM = 980; // milliMoles
 * var M = units.fromMultiple(mM, units.MetricPrefix.MILLI);
 * // M = .980
 *
 * @param {number} value
 * @param {number} factor
 * @return {number}
 */
units.fromMultiple = function(value, factor) {
	return value * factor;
};

/**
 * Converts value in a specific multiple (fromFactor) to its equivalent value of a different multiple (toFactor).
 *
 * var mM = 980; // milliMoles
 * var uM = units.fromToMultiple(mM, units.MetricPrefix.MILLI, units.MetricPrefix.MICRO);
 * // uM = 980000
 *
 * @param {number} nUnits
 * @param {number} factor
 * @return {number}
 */
units.fromToMultiple = function(value, fromFactor, toFactor) {
	return value * fromFactor / toFactor;
};

/**
 * Converts nUnits to its a prefixed amount. For example,
 *
 * var M = .980; // Moles
 * var mM = units.toMultiple(mM, units.MetricPrefix.MILLI);
 * // mM = 980
 *
 * @param {number} nUnits
 * @param {number} factor
 * @return {number}
 */
units.toMultiple = function(nUnits, factor) {
	return nUnits / factor;
};


/*******************************************************************************************************************/});