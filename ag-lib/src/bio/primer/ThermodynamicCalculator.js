goog.provide('ag.bio.primer.ThermodynamicCalculator');

goog.require('goog.asserts');

goog.require('ag.bio.BioString');
goog.require('ag.bio.primer.ThermodynamicConstants');

// By defining this outside of the goog.scope block, we are able to reference it from inside other
// goog.scope blocks.
ag.bio.primer.ThermodynamicCalculator = {};

/**
  * ThermodynamicCalculator estimates thermodynamic parameters (enthalpy, entropy, melting temperature/Tm) of DNA
  * sequences.
  *
  * Uses the nearest-neighbor algorithm to calculate enthalpy and entropy characteristics of a given sequence.
  * Nearest-neighbor thermodynamic values were taken from Santa Lucia(1998) and are identical to those presented
  * by Allawi and Santa Lucia (1997).
  *
  * Constraints:
  * All input sequences must only contain ATCG. Degenerate sequences in any form are not supported.
  *
  * Definitions:
  * o Palindrome - ungapped dna sequence which has the same sequence as its reverse complement
  * o Inverted repeat - a palindrome that is split in the middle by one ore more unpaired bases
  * o Complementary - the complement of a dna sequence
  * o Self-complementary - synonym for palindrome
  * o Symmetrical - synonym for palindrome
  *
  * In the context of primer design, palindromes do not make good primers because they would stick to itself rather than
  * the target amplicon.
  *
  * Two cases:
  * 1) Input sequence is not a palindrome (most frequent case). The melting temperature is calculated with the
  *    following:
  *
  *    Tm = 1000 cal kcal-1 * H°[1 M Na+] / (S°[x M Na+] + R ln (C/2)) - 273.15
  *
  *    Where:
  *    1) H°[1 M Na+]: sum of enthalpy values for all nearest neighbor pairs (dimers) and terminal monomers at a sodium
  *       concentration of 1 molar
  *    2) S°[x M Na+]: salt corrected sum of entropy values for all nearest neighbor pairs (dimers) and terminal
  *       monomers at a sodium concentration of x molar.
  *
  *       This value may be derived from the entropy values at 1 molar as follows:
  *
  *       S°[x M Na+] = S°[1 M Na+] + 0.368 * (N-1) * ln [Na+]            (Santa Lucia, 1998)
  *
  *       where N = length of DNA sequence and [Na+] is the molar concentration of sodium.
  *
  *    3) R: universal gas constant, which equals 1.987 cal per Kelvin per mole
  *    4) C: molar concentration of primer DNA (typically 1 micromolar)
  *
  * 2) Input sequence is a palindrome (or self-complementary). In this case, the melting temperature is calculated with
  *    the following:
  *
  *    Tm = 1000 cal kcal-1 * H°[1 M Na+] / (S°[x M Na+] + R ln (C)) - 273.15
  */

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var grammar = ag.bio.grammar;

var BioString = ag.bio.BioString;
var ThermodynamicCalculator = ag.bio.primer.ThermodynamicCalculator;

var ThermodynamicConstants = ag.bio.primer.ThermodynamicConstants;
var ENTHALPY_MONOMER_KCAL_PER_MOLE = ThermodynamicConstants.ENTHALPY_MONOMER_KCAL_PER_MOLE;
var ENTHALPY_DIMER_KCAL_PER_MOLE = ThermodynamicConstants.ENTHALPY_DIMER_KCAL_PER_MOLE;
var ENTROPY_MONOMER_CAL_PER_K_PER_MOLE = ThermodynamicConstants.ENTROPY_MONOMER_CAL_PER_K_PER_MOLE;
var ENTROPY_DIMER_CAL_PER_K_PER_MOLE = ThermodynamicConstants.ENTROPY_DIMER_CAL_PER_K_PER_MOLE;

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * @param {BioString} dnaString
 * @return {number}
 */
ThermodynamicCalculator.enthalpy = function(dnaString) {
	assert(dnaString.grammar() === grammar.DNA, 'ThermodynamicCalculator.enthalpy() - dnaString must have dna grammar');
    if (dnaString.isEmpty())
        return 0.;

	assert(dnaString.onlyContainsACGT(), 'ThermodynamicCalculator.enthalpy() - dnaString may not contain other characters than ACGT');


    var len = dnaString.length();
    var nt1 = dnaString.at(1);
    var sum = ENTHALPY_MONOMER_KCAL_PER_MOLE[nt1];
    if (len === 1)
    	return sum;

    var nt2 = nt1;
    for (var i=2; i<=len; i++) {
    	nt1 = nt2;
    	nt2 = dnaString.at(i);
    	sum += ENTHALPY_DIMER_KCAL_PER_MOLE[nt1][nt2];
    };
    sum += ENTHALPY_MONOMER_KCAL_PER_MOLE[nt2];
    if (dnaString.isPalindrome())
        sum += ThermodynamicConstants.ENTHALPY_SYMMETRY_CORRECTION;

    return sum;
};

/**
 * @param {BioString} dnaString
 * @return {number}
 */
ThermodynamicCalculator.entropy = function(dnaString) {
	assert(dnaString.grammar() === grammar.DNA, 'ThermodynamicCalculator.entropy() - dnaString must have dna grammar');
    if (dnaString.isEmpty())
        return 0.;

	assert(dnaString.onlyContainsACGT(), 'ThermodynamicCalculator.entropy() - dnaString may not contain other characters than ACGT');


    var len = dnaString.length();
    var nt1 = dnaString.at(1);
    var sum = ENTROPY_MONOMER_CAL_PER_K_PER_MOLE[nt1];
    if (len === 1)
    	return sum;

    var nt2 = nt1;
    for (var i=2; i<=len; i++) {
    	nt1 = nt2;
    	nt2 = dnaString.at(i);
    	sum += ENTROPY_DIMER_CAL_PER_K_PER_MOLE[nt1][nt2];
    };
    sum += ENTROPY_MONOMER_CAL_PER_K_PER_MOLE[nt2];
    if (dnaString.isPalindrome())
        sum += ThermodynamicConstants.ENTROPY_SYMMETRY_CORRECTION;

    return sum;
};

/**
 * @param {BioString} dnaString
 * @param {number} sodiumConcentration (in moles)
 * @param {number} primerDnaConcentration (in moles)
 * @return {number}
 */
ThermodynamicCalculator.meltingTemperature = function(dnaString, sodiumConcentration, primerDnaConcentration) {
	assert(sodiumConcentration > 0.);
	assert(primerDnaConcentration > 0.);

	if (dnaString.isEmpty())
		return 0.;

	var enthalpy = ThermodynamicCalculator.enthalpy(dnaString);
	var entropy = ThermodynamicCalculator.entropy(dnaString);
	var naCorrectedEntropy = ThermodynamicCalculator.sodiumCorrectedEntropy(entropy, dnaString.length(), sodiumConcentration);

	return ThermodynamicCalculator.meltingTemperatureFromEnthalpy(enthalpy, naCorrectedEntropy, primerDnaConcentration, dnaString.isPalindrome());
};

/**
 * @param {number} enthalpy
 * @param {number} sodiumCorrectedEntropy
 * @param {number} primerDnaConcentration (in moles)
 * @param {boolean} isPalindrome
 * @return {number}
 */
ThermodynamicCalculator.meltingTemperatureFromEnthalpy = function(enthalpy, sodiumCorrectedEntropy, primerDnaConcentration, isPalindrome) {
	assert(primerDnaConcentration > 0.);

    var adjustedPrimerConcentration = (!isPalindrome) ? primerDnaConcentration / 2.
                                                      : primerDnaConcentration;

    return 1000. * enthalpy / (sodiumCorrectedEntropy + ThermodynamicConstants.R *  Math.log(adjustedPrimerConcentration)) - 273.15;
};

/**
 */
ThermodynamicCalculator.sodiumCorrectedEntropy = function(entropy, sequenceLength, sodiumConcentration) {
	assert(sequenceLength > 0);
	assert(sodiumConcentration > 0.);

    return entropy + 0.368 * (sequenceLength - 1) * Math.log(sodiumConcentration);	
};


/*******************************************************************************************************************/});
