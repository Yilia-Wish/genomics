goog.provide('ag.bio.primer.PrimerSearchParameters');

goog.require('ag.bio.DnaPattern');
goog.require('ag.bio.RestrictionEnzyme');
goog.require('ag.core.ClosedRealRange');
goog.require('ag.core.ClosedIntRange');

/**
 * Parameters used by primer finder.
 *
 * @constructor
 */
ag.bio.primer.PrimerSearchParameters = function() {
	/**
	 * Range of acceptable amplicon sizes
	 * @type {ag.core.ClosedIntRange}
	 * @public
	 */
	this.ampliconLengthRange = new ag.core.ClosedIntRange();

	/**
	 * Range of allowed primer lengths
	 * @type {ag.core.ClosedIntRange}
	 * @public
	 */
	this.primerLengthRange = new ag.core.ClosedIntRange(20, 25);

	/**
	 * The forward prefix or restriction enzyme site; 5' addition
	 * @type {ag.bio.RestrictionEnzyme}
	 * @public
	 */
	this.forwardRestrictionEnzyme = new ag.bio.RestrictionEnzyme();

	/**
	 * The reverse prefix or restriction enzyme site; 5' addition
	 * @type {ag.bio.RestrictionEnzyme}
	 * @public
	 */
	this.reverseRestrictionEnzyme = new ag.bio.RestrictionEnzyme();

	/**
	 * The forward suffix that must be present; 3' specification
	 * @type {ag.bio.DnaPattern}
	 * @public
	 */
	this.forwardTerminalPattern = new ag.bio.DnaPattern();

	/**
	 * The reverse suffix that must be present; 3' specification
	 * @type {ag.bio.DnaPattern}
	 * @public
	 */
	this.reverseTerminalPattern = new ag.bio.DnaPattern();

	/**
	 * Acceptable melting temperature range for individual primers; degress Celsius
	 * @type {ag.core.ClosedRealRange}
	 * @public
	 */
	this.individualPrimerTmRange = new ag.core.ClosedRealRange(55.0, 65.0);

	/**
	 * Molar sodium concentration
	 * @type {number}
	 * @public
	 */
	this.sodiumConcentration = ag.bio.primer.PrimerSearchParameters.Defaults.SODIUM_CONCENTRATION;

	/**
	 * Molar primer dna concentration
	 * @type {number}
	 * @public
	 */
    this.primerDnaConcentration = ag.bio.primer.PrimerSearchParameters.Defaults.PRIMER_DNA_CONCENTRATION;

	/**
	 * Maximum difference in melting temperatures for any given pair of primers; degress Celsius
	 * @type {number}
	 * @public
	 */
    this.maximumPrimerPairDeltaTm = 5;

    /**
     * @type {?string}
     * @private
     */
    this.errorMessage_ = null;
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var ClosedIntRange = ag.core.ClosedIntRange;
var ClosedRealRange = ag.core.ClosedRealRange;
var DnaPattern = ag.bio.DnaPattern;
var PrimerSearchParameters = ag.bio.primer.PrimerSearchParameters;
var RestrictionEnzyme = ag.bio.RestrictionEnzyme;


// --------------------------------------------------------------------------------------------------------------------
// Constants
/** @enum {number} */
PrimerSearchParameters.Defaults = {
	SODIUM_CONCENTRATION: .2,
	PRIMER_DNA_CONCENTRATION: .000001
};

/** @enum {string} */
PrimerSearchParameters.SerialLabels = {
    ampliconLengthRange: 'a',
    primerLengthRange: 'p',
    forwardRestrictionEnzyme: 'fe',
    reverseRestrictionEnzyme: 're',
    forwardTerminalPattern: 'fp',
    reverseTerminalPattern: 'rp',
    individualPrimerTmRange: 'r',
    sodiumConcentration: 'na',
    primerDnaConcentration: 'pd',
    maximumPrimerPairDeltaTm: 'd'
};

var SerialLabels = PrimerSearchParameters.SerialLabels;

// --------------------------------------------------------------------------------------------------------------------
// Pseudo serialization
/**
 * @param {Object} object
 * @return {PrimerSearchParameters}
 */
PrimerSearchParameters.fromSerialObject = function(object) {
    var psp = new PrimerSearchParameters();
    psp.ampliconLengthRange         = ClosedIntRange.fromSerialObject(object[SerialLabels.ampliconLengthRange]);
    psp.primerLengthRange           = ClosedIntRange.fromSerialObject(object[SerialLabels.primerLengthRange]);
    psp.forwardRestrictionEnzyme    = RestrictionEnzyme.fromSerialObject(object[SerialLabels.forwardRestrictionEnzyme]);
    psp.reverseRestrictionEnzyme    = RestrictionEnzyme.fromSerialObject(object[SerialLabels.reverseRestrictionEnzyme]);
    psp.forwardTerminalPattern      = DnaPattern.fromSerialObject(object[SerialLabels.forwardTerminalPattern]);
    psp.reverseTerminalPattern      = DnaPattern.fromSerialObject(object[SerialLabels.reverseTerminalPattern]);
    psp.individualPrimerTmRange     = ClosedRealRange.fromSerialObject(object[SerialLabels.individualPrimerTmRange]);
    psp.sodiumConcentration         = object[SerialLabels.sodiumConcentration];
    psp.primerDnaConcentration      = object[SerialLabels.primerDnaConcentration];
    psp.maximumPrimerPairDeltaTm    = object[SerialLabels.maximumPrimerPairDeltaTm];
    return psp;
};

/** @return {Object} */
PrimerSearchParameters.prototype.toSerialObject = function() {
    var result = {};
    result[SerialLabels.ampliconLengthRange]        = this.ampliconLengthRange.toSerialObject();
    result[SerialLabels.primerLengthRange]          = this.primerLengthRange.toSerialObject();
    result[SerialLabels.forwardRestrictionEnzyme]   = this.forwardRestrictionEnzyme.toSerialObject();
    result[SerialLabels.reverseRestrictionEnzyme]   = this.reverseRestrictionEnzyme.toSerialObject();
    result[SerialLabels.forwardTerminalPattern]     = this.forwardTerminalPattern.toSerialObject();
    result[SerialLabels.reverseTerminalPattern]     = this.reverseTerminalPattern.toSerialObject();
    result[SerialLabels.individualPrimerTmRange]    = this.individualPrimerTmRange.toSerialObject();
    result[SerialLabels.sodiumConcentration]        = this.sodiumConcentration;
    result[SerialLabels.primerDnaConcentration]     = this.primerDnaConcentration;
    result[SerialLabels.maximumPrimerPairDeltaTm]   = this.maximumPrimerPairDeltaTm;
    return result;
};


// --------------------------------------------------------------------------------------------------------------------
// Operators
/** @return {PrimerSearchParameters} */
PrimerSearchParameters.prototype.copy = function() {
    var psp = new PrimerSearchParameters();
    psp.ampliconLengthRange = this.ampliconLengthRange;
    psp.primerLengthRange = this.primerLengthRange;
    psp.forwardRestrictionEnzyme = this.forwardRestrictionEnzyme;
    psp.reverseRestrictionEnzyme = this.reverseRestrictionEnzyme;
    psp.forwardTerminalPattern = this.forwardTerminalPattern;
    psp.reverseTerminalPattern = this.reverseTerminalPattern;
    psp.individualPrimerTmRange = this.individualPrimerTmRange;
    psp.sodiumConcentration = this.sodiumConcentration;
    psp.primerDnaConcentration = this.primerDnaConcentration;
    psp.maximumPrimerPairDeltaTm = this.maximumPrimerPairDeltaTm;
    psp.errorMessage_ = this.errorMessage_;
    return psp;	
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * Checks all the parameters and returns true if valid; false otherwise. If invalid, errorMessage is set to the most
 * recent error or cleared otherwise.
 *
 * @return {boolean}
 */
PrimerSearchParameters.prototype.isValid = function() {
    this.errorMessage_ = null;

    if (this.ampliconLengthRange.begin === 0 || !this.ampliconLengthRange.isNormal())
        this.errorMessage_ = "Invalid amplicon length range. The start value must be less than or equal to the stop value.";
    else if (this.ampliconLengthRange.begin < 1)
        this.errorMessage_ = "The amplicon length minimum must be greater than or equal to 1.";
    else if (this.primerLengthRange.begin === 0 || !this.primerLengthRange.isNormal())
        this.errorMessage_ = "Invalid primer length range. The start value must be less than or equal to the stop value.";
    else if (this.primerLengthRange.begin < 1)
        this.errorMessage_ = "The minimum primer length must be greater than or equal to 1.";
    else if (this.primerLengthRange.begin * 2 > this.ampliconLengthRange.end)
        this.errorMessage_ = "The amplicon size that you have selected is too small. The maximum amplicon size must be at least 2 times longer than the minimum primer length.";
    else if (this.individualPrimerTmRange.begin > this.individualPrimerTmRange.end)
        this.errorMessage_ = "Invalid melting point range. The start value must be less than or equal to the stop value.";
    else if (this.sodiumConcentration < 0.)
        this.errorMessage_ = "Sodium concentration must be a positive molar value.";
    else if (this.primerDnaConcentration < 0.)
        this.errorMessage_ = "Primer DNA concentration must be a positive molar value.";
    else if (this.maximumPrimerPairDeltaTm < 0)
        this.errorMessage_ = "The maximum melting temperature difference for a given primer pair must be positive.";

    return goog.isNull(this.errorMessage_);
};

/** @return {number} */
PrimerSearchParameters.prototype.milliMolarSodiumConcentration = function() {
    return this.sodiumConcentration * 1000;
};

/** @return {number} */
PrimerSearchParameters.prototype.microMolarDnaConcentration = function() {
    return this.primerDnaConcentration * 1000000;
};

/**
 * @param {number} milliMolarSodiumConcentration
 */
PrimerSearchParameters.prototype.setSodiumConcentrationFromMilliMoles = function(milliMolarSodiumConcentration) {
    this.sodiumConcentration = milliMolarSodiumConcentration / 1000;
};

/**
 * @param {number} microMolarDnaConcentration
 */
PrimerSearchParameters.prototype.setPrimerDnaConcentrationFromMicroMoles = function(microMolarDnaConcentration) {
    this.primerDnaConcentration = microMolarDnaConcentration / 1000000;
};


/*******************************************************************************************************************/});