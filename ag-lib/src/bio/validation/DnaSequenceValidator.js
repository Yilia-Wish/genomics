/**
 * @fileoverview DnaSequenceValidator validates DNA sequence character strings
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.bio.validation.DnaSequenceValidator');

goog.require('ag.validation.AbstractValidator');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.validation.AbstractValidator}
 */
ag.bio.validation.DnaSequenceValidator = function() {
    goog.base(this);
};
goog.inherits(ag.bio.validation.DnaSequenceValidator, ag.validation.AbstractValidator);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var AbstractValidator = ag.validation.AbstractValidator;
var DnaSequenceValidator = ag.bio.validation.DnaSequenceValidator;

var State = AbstractValidator.State;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
DnaSequenceValidator.prototype.fixup = function(string) {
    return string ? string.toUpperCase().replace(/\s+/g, '') : '';
};

/** @override */
DnaSequenceValidator.prototype.validate = function(string) {
    if (!string || string.length === 0)
        return State.Intermediate;
    
    return /[^ACGT]/.test(string) ? State.Invalid : State.Acceptable;
};

/*******************************************************************************************************************/});
