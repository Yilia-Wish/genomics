goog.provide('ag.bio.primer.PrimerFactory');

goog.require('goog.asserts');

goog.require('ag.bio.grammar');
goog.require('ag.bio.BioString');
goog.require('ag.bio.RestrictionEnzyme');
goog.require('ag.bio.primer.DimerScoreCalculator');
goog.require('ag.bio.primer.Primer');
goog.require('ag.bio.primer.PrimerSearchParameters');
goog.require('ag.bio.primer.ThermodynamicCalculator');

/**
 * Defaults are also the same as in PrimerSearchParamters.
 *
 * @constructor
 * @param {number=} sodiumConcentration defaults to .2 moles
 * @param {number=} primerDnaConcentration defaults to .000001 moles
 */
ag.bio.primer.PrimerFactory = function(sodiumConcentration, primerDnaConcentration) {
	/**
	 * @type {number}
	 * @private
	 */
	this.sodiumConcentration_ = goog.isNumber(sodiumConcentration) ? sodiumConcentration :
																	 ag.bio.primer.PrimerSearchParameters.Defaults.SODIUM_CONCENTRATION;

	/**
	 * @type {number}
	 * @private
	 */
	this.primerDnaConcentration_ = goog.isNumber(primerDnaConcentration) ? primerDnaConcentration :
																		   ag.bio.primer.PrimerSearchParameters.Defaults.PRIMER_DNA_CONCENTRATION;

	/**
	 * @type {ag.bio.primer.PrimerSearchParameters}
	 * @private
	 */
	this.primerSearchParameters_ = null;

	/**
	 * @type {ag.bio.primer.DimerScoreCalculator}
	 * @private
	 */
	this.dimerScoreCalculator_ = new ag.bio.primer.DimerScoreCalculator();

	goog.asserts.assert(this.sodiumConcentration_ > 0.);
	goog.asserts.assert(this.primerDnaConcentration_ > 0.);
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var grammar = ag.bio.grammar;

var BioString = ag.bio.BioString;
var RestrictionEnzyme = ag.bio.RestrictionEnzyme;
var Primer = ag.bio.primer.Primer;
var PrimerFactory = ag.bio.primer.PrimerFactory;
var PrimerSearchParameters = ag.bio.primer.PrimerSearchParameters;
var ThermodynamicCalculator = ag.bio.primer.ThermodynamicCalculator;

/**
 * @param {BioString} dnaString
 * @param {RestrictionEnzyme} restrictionEnzyme
 * @param {number=} tm if !defined or null, automatically calculated using the ThermodynamicCalculator
 * @return {Primer}
 */
PrimerFactory.prototype.makePrimer = function(dnaString, restrictionEnzyme, tm) {
	assert(dnaString.grammar() === grammar.DNA);
	assert(!dnaString.hasGaps());
	assert(dnaString.isEmpty() || dnaString.onlyContainsACGT());

	var fullPrimerSequence = Primer.sequence(dnaString, restrictionEnzyme);
	if (!goog.isDefAndNotNull(tm))
		tm = ThermodynamicCalculator.meltingTemperature(fullPrimerSequence, this.sodiumConcentration_, this.primerDnaConcentration_);

    var homoDimerScore = this.dimerScoreCalculator_.homoDimerScore(fullPrimerSequence);
    return new Primer(null, dnaString, restrictionEnzyme, tm, homoDimerScore, this.primerSearchParameters_);
}

/** @return {number} */
PrimerFactory.prototype.primerDnaConcentration = function() {
	return this.primerDnaConcentration_;
};

/**
 * Resets all variables to their default values.
 */
PrimerFactory.prototype.reset = function() {
	this.sodiumConcentration_ = PrimerSearchParameters.defaults.SODIUM_CONCENTRATION;
	this.primerDnaConcentration_ = PrimerSearchParameters.defaults.PRIMER_DNA_CONCENTRATION;
	this.primerSearchParameters_ = null;
};

/**
 * @param {number} newPrimerDnaConcentration
 */
PrimerFactory.prototype.setPrimerDnaConcentration = function(newPrimerDnaConcentration) {
	assert(goog.isNumber(newPrimerDnaConcentration));
	this.primerDnaConcentration_ = newPrimerDnaConcentration;
};

/**
 * @param {PrimerSearchParameters} primerSearchParameters
 */
PrimerFactory.prototype.setPrimerSearchParameters = function(primerSearchParameters) {
	assert(!primerSearchParameters || primerSearchParameters instanceof PrimerSearchParameters);
	this.primerSearchParameters_ = primerSearchParameters;
};

/**
 * @param {number} newSodiumDnaConcentration
 */
PrimerFactory.prototype.setSodiumConcentration = function(newSodiumDnaConcentration) {
	assert(goog.isNumber(newSodiumDnaConcentration));
	this.sodiumConcentration_ = newSodiumDnaConcentration;
};

/** @return {number} */
PrimerFactory.prototype.sodiumConcentration = function() {
	return this.sodiumConcentration_;
};

/*******************************************************************************************************************/});
