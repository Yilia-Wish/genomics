goog.provide('ag.bio.primer.DimerScoreCalculator');

goog.require('goog.asserts');
goog.require('goog.object');

goog.require('ag.bio.grammar');
goog.require('ag.bio.BioString');

/**
 * @constructor
 */
ag.bio.primer.DimerScoreCalculator = function() {};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var object = goog.object;

var grammar = ag.bio.grammar;

var BioString = ag.bio.BioString;
var DimerScoreCalculator = ag.bio.primer.DimerScoreCalculator;

// --------------------------------------------------------------------------------------------------------------------
// Static defines
DimerScoreCalculator.STANDARD_PRIMER_LENGTH = 10;
DimerScoreCalculator.COMPLEMENTARY_NUCLEOTIDES_ = {
	65: 84,	 // A -> T
	97: 84,  // a -> T
	67: 71,  // C -> G
	99: 71,  // c -> G
	71: 67,  // G -> C
	103: 67, // g -> C
	84: 65,  // T -> A
	116: 65  // t -> A
};
DimerScoreCalculator.NUCLEOTIDE_HYDROGEN_BONDS_ = {
	65: 2,	// A
	67: 3,	// C
	71: 3,	// G
	84: 2 	// T
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * @param {BioString} dnaStringA
 * @param {BioString} dnaStringB
 * @return {number}
 */
DimerScoreCalculator.prototype.dimerScore = function(dnaStringA, dnaStringB) {
	assert(dnaStringA.grammar() === grammar.DNA);
	assert(dnaStringB.grammar() === grammar.DNA);

	if (dnaStringA.isEmpty() || dnaStringB.isEmpty())
		return 0.;

	var hydrogenBonds = this.maximumHydrogenBonds(dnaStringA, dnaStringB);
	var shorterPrimerLength = Math.min(dnaStringA.length(), dnaStringB.length());

	return this.scoreFromHydrogenBondCount_(hydrogenBonds, shorterPrimerLength);
};

/**
 * @param {BioString} dnaString
 * @return {number}
 */
DimerScoreCalculator.prototype.homoDimerScore = function(dnaString) {
	assert(dnaString.grammar() === grammar.DNA);

	return this.dimerScore(dnaString, dnaString);
};

/**
 * The sliding window algorithm works as follows:
 *
 * Given dnaStringA: 5' ATATG 3'
 *       dnaStringB: 5' ATATG 3' (homodimer test, but doesn't matter for our purposes)
 *
 * threeToFiveString = 3' GTATA 5'
 *
 * Position dnaStringA such that it only overlaps with one character in threeToFiveString:
 *
 * 1234567890123
 *     ATATG         [i = 1]
 * GTATA
 *
 *     ATATG         [i = 2]
 *  GTATA
 *
 *     ATATG         [i = 3]
 *   GTATA
 *
 * ...
 *
 *     ATATG         [i = 9] (finalSlidePosition)
 *         GTATA
 *
 * The threeToFiveString will progressively slide along the "fixed" dnaStringA, which is virtually positioned at the
 * fifth column. A for loop then iterates over all characters in threeToFiveString and if there is a valid character in
 * both sequences, sums any potential hydrogen bonds it may form to the existing score.
 *
 * @param {BioString} dnaStringA
 * @param {BioString} dnaStringB
 * @returns {number}
 */
DimerScoreCalculator.prototype.maximumHydrogenBonds = function(dnaStringA, dnaStringB) {
	assert(dnaStringA.grammar() === grammar.DNA);
	assert(dnaStringB.grammar() === grammar.DNA);

	var aLen = dnaStringA.length();
	var bLen = dnaStringB.length();

	// Instead of making a reverse copy of dnaStringB, simply access its character data as though it
	// was reversed (e.g. length - pos + 1).
    var aOffset = aLen;
    var finalSlidePosition = aLen + bLen - 1;

    var maxHydrogenBonds = 0;
    for (var i=1; i< finalSlidePosition; ++i) {
        var hydrogenBonds = 0;
        for (var j=i, z=i+bLen; j<z; ++j) {
            var aIndex = j - aOffset + 1;
            if (aIndex < 1 || aIndex > aLen)
                continue;

            var bIndex = j - i + 1;     // Add one to account for 1-based values
            var reversedBIndex = bLen - bIndex + 1;
            hydrogenBonds += this.hydrogenBondsBetween_(dnaStringA.at(aIndex), dnaStringB.at(reversedBIndex));
        }

        if (hydrogenBonds > maxHydrogenBonds)
            maxHydrogenBonds = hydrogenBonds;
    }

    return maxHydrogenBonds;
};

// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @param {number} nucleotide ASCII character code
 * @return {number} ASCII character code
 */
DimerScoreCalculator.prototype.complementaryNucleotide_ = function(nucleotide) {
	return DimerScoreCalculator.COMPLEMENTARY_NUCLEOTIDES_[nucleotide] || 0;
};

/**
 * @param {number} nucleotide1 ASCII character code
 * @param {number} nucleotide2 ASCII character code
 * @return {number}
 */
DimerScoreCalculator.prototype.hydrogenBondsBetween_ = function(nucleotide1, nucleotide2) {
	if (nucleotide1 === this.complementaryNucleotide_(nucleotide2))
		return DimerScoreCalculator.NUCLEOTIDE_HYDROGEN_BONDS_[nucleotide1] || 0;

	return 0;
};

/**
 * @param {number} hydrogenBonds
 * @param {number} shorterPrimerLength
 * @return {number}
 */
DimerScoreCalculator.prototype.scoreFromHydrogenBondCount_ = function(hydrogenBonds, shorterPrimerLength) {
	assert(hydrogenBonds >= 0);
	assert(shorterPrimerLength > 0);

	return hydrogenBonds * DimerScoreCalculator.STANDARD_PRIMER_LENGTH / shorterPrimerLength;
};


/*******************************************************************************************************************/});
