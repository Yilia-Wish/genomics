/**
 * @fileoverview AbstractValidator defines the base interface for validating strings.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.validation.AbstractValidator');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 */
ag.validation.AbstractValidator = function() {};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var AbstractValidator = ag.validation.AbstractValidator;

// --------------------------------------------------------------------------------------------------------------------
// Constants
AbstractValidator.State = {
	Acceptable: 0,
	Intermediate: 1,
	Invalid: 2
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * @param {string} input
 * @return {string}
 */
AbstractValidator.prototype.fixup = goog.abstractMethod;

/**
 * @param {string} input
 * @return {AbstractValidator.State}
 */
AbstractValidator.prototype.validate = goog.abstractMethod;

/*******************************************************************************************************************/});
