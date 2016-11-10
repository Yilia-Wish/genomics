/**
 * @fileoverview AbstractNumberValidator extends the base interface for validating strings for numeric values.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.validation.AbstractNumberValidator');

goog.require('ag.validation.AbstractValidator');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.validation.AbstractValidator}
 */
ag.validation.AbstractNumberValidator = function() {
	goog.base(this);
};
goog.inherits(ag.validation.AbstractNumberValidator, ag.validation.AbstractValidator);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var AbstractNumberValidator = ag.validation.AbstractNumberValidator;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {number} */
AbstractNumberValidator.prototype.maximum = function() {
	return this.range().end;
};

/** @return {number} */
AbstractNumberValidator.prototype.minimum = function() {
	return this.range().begin;
};

/**
 * @return {ag.core.AbstractRange}
 */
AbstractNumberValidator.prototype.range = goog.abstractMethod;

/**
 * @param {number} newMaximum
 */
AbstractNumberValidator.prototype.setMaximum = goog.abstractMethod;

/**
 * @param {number} newMaximum
 */
AbstractNumberValidator.prototype.setMinimum = goog.abstractMethod;

/**
 * @param {ag.core.AbstractRange} newRange
 */
AbstractNumberValidator.prototype.setRange = goog.abstractMethod;

/*******************************************************************************************************************/});
