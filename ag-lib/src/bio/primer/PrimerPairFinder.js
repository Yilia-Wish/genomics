goog.provide('ag.bio.primer.PrimerPairFinder');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.object');

goog.require('ag.bio.grammar');
goog.require('ag.bio.primer.PrimerPair');
goog.require('ag.bio.primer.PrimerFactory');
goog.require('ag.bio.primer.PrimerPairFactory');
goog.require('ag.bio.primer.PrimerSearchParameters');
goog.require('ag.bio.primer.ThermodynamicCalculator');
goog.require('ag.bio.BioString');
goog.require('ag.bio.DnaPattern');
goog.require('ag.bio.RestrictionEnzyme');
goog.require('ag.core.AObject');
goog.require('ag.core.ClosedIntRange');
goog.require('ag.service.ProgressTicker');

/**
 * Worker class that finds compatible primers with respect to a PrimerSearchParameters specification in
 * stretches of DNA containing only ACGT.
 *
 * @constructor
 * @extends {ag.core.AObject}
 * @param {ag.core.AObject=} optParent 
 */
ag.bio.primer.PrimerPairFinder = function(optParent) {
    goog.base(this, optParent);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
	/**
	 * Flag indicating whether the current search has been canceled.
	 *
	 * @type {boolean}
	 * @private
	 */
	this.canceled_ = false;

	/**
	 * Local copy of primer search parameters used by algorithm.
	 * 
	 * @type {ag.bio.primer.PrimerSearchParameters}
	 * @private
	 */
	this.primerSearchParameters_ = null;

    /**
     * @type {ag.service.ProgressTicker}
     * @private
     */
    this.progressTicker_ = new ag.service.ProgressTicker(this);
};
goog.inherits(ag.bio.primer.PrimerPairFinder, ag.core.AObject);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;
var object = goog.object;

var grammar = ag.bio.grammar;

var BioString = ag.bio.BioString;
var ClosedIntRange = ag.core.ClosedIntRange;
var DnaPattern = ag.bio.DnaPattern;
var NullProgressTicker = ag.service.NullProgressTicker;
var PrimerFactory = ag.bio.primer.PrimerFactory;
var PrimerPair = ag.bio.primer.PrimerPair;
var PrimerPairFactory = ag.bio.primer.PrimerPairFactory;
var PrimerPairFinder = ag.bio.primer.PrimerPairFinder;
var PrimerSearchParameters = ag.bio.primer.PrimerSearchParameters;
var ProgressTicker = ag.service.ProgressTicker;
var RestrictionEnzyme = ag.bio.RestrictionEnzyme;
var ThermodynamicCalculator = ag.bio.primer.ThermodynamicCalculator;

/** @typedef {{tm: number, location: ClosedIntRange}} */
PrimerPairFinder.LitePrimer;

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * Notifies the algorithm to cancel
 */
PrimerPairFinder.prototype.cancel = function() {
	this.canceled_ = true;
};

/**
 * @param {BioString} dnaString
 * @param {ClosedIntRange} range
 * @param {PrimerSearchParameters} primerSearchParameters
 * @return {Array.<PrimerPair>}
 */
PrimerPairFinder.prototype.findPrimerPairs = function(dnaString, range, primerSearchParameters) {
    assert(dnaString.grammar() === grammar.DNA);
    assert(dnaString.isValidRange(range));
    assert(!dnaString.hasGaps());
    assert(primerSearchParameters && primerSearchParameters instanceof PrimerSearchParameters);
    assert(primerSearchParameters.isValid());

    // The entire amplicon range must fit within the requested range
    assert(primerSearchParameters.ampliconLengthRange.end <= range.length());

    this.canceled_ = false;
    this.primerSearchParameters_ = primerSearchParameters;

    var acgtRanges = this.findACGTRangesWithin_(dnaString, range);
    acgtRanges = this.rangesAtLeastMinimumPrimerLength_(acgtRanges);
    var dnaStringLength = dnaString.length();
    var absMaxPrimerStart = this.absoluteMaxPrimerStart_(range);
    var forwardLitePrimers = [];	// Array.<LitePrimer>
    var reverseLitePrimers = [];	// Array.<LitePrimer>

    var result = [];
    var part1Iterations = this.countCompatiblePrimerSearchIterations_(acgtRanges, absMaxPrimerStart);
    if (part1Iterations) {
        // Since we do not know how many iterations are required for part 2 (finding compatible primer pairs),
        // we simply double this amount so that it will be at 50% when this phase is completed.
        this.progressTicker_.setValueAndEndValue(0, part1Iterations * 2);

        for (var i=0, z=acgtRanges.length; i<z; i++) {
        	var acgtRange = acgtRanges[i];
            assert(!this.rangeIsLessThanMinimumPrimerLength_(acgtRange));

            var newForwardLitePrimers = this.findCompatibleLitePrimers(dnaString,
                                             	 	                   acgtRange,
                                                  	              	   absMaxPrimerStart,
                                                            	  	   this.primerSearchParameters_.forwardRestrictionEnzyme,
                                                         	      	   this.primerSearchParameters_.forwardTerminalPattern);
            forwardLitePrimers = forwardLitePrimers.concat(newForwardLitePrimers);

            // Invert the range for the reverse direction
            var reverseRange = new ClosedIntRange(dnaStringLength - acgtRange.end + 1,
                                        		  dnaStringLength - acgtRange.begin + 1);
            var newReverseLitePrimers = this.findCompatibleLitePrimers(dnaString.reverseComplement(),
                                        	                      	   reverseRange,
                                              	                  	   absMaxPrimerStart,
                                                    	          	   primerSearchParameters.reverseRestrictionEnzyme,
                                                          		  	   primerSearchParameters.reverseTerminalPattern);
            reverseLitePrimers = reverseLitePrimers.concat(newReverseLitePrimers);
            if (this.canceled_)
                return result;
        }

        var part2Iterations = forwardLitePrimers.length * reverseLitePrimers.length;
        if (part2Iterations) {
            this.progressTicker_.setValueAndEndValue(part2Iterations, 2 * part2Iterations);

            result = this.findCompatiblePrimerPairs(forwardLitePrimers,
                                         	  reverseLitePrimers,
                                              dnaString);
        }
    }

    this.progressTicker_.end();
    return result;
};

/** @return {ProgressTicker} */
PrimerPairFinder.prototype.progressTicker = function() {
    return this.progressTicker_;
};


// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @param {ClosedIntRange} range
 * @return {number}
 */
PrimerPairFinder.prototype.absoluteMaxPrimerStart_ = function(range) {
    var minAmpliconLength = this.primerSearchParameters_.ampliconLengthRange.begin;
    return range.length() - minAmpliconLength + 1;
};

/**
 * Tallies the number of iterations that will be needed to complete part 1 (finding compatible primers).
 *
 * @param {ag.core.ClosedIntRangeArray} ranges
 * @param {number} absMaxPrimerStart
 * @return {number}
 */
PrimerPairFinder.prototype.countCompatiblePrimerSearchIterations_ = function(ranges, absMaxPrimerStart) {
    var primerLengthRange = this.primerSearchParameters_.primerLengthRange;

    var total = 0;
    for (var i=0, z=ranges.length; i<z; i++) {
        var range = ranges[i];
        for (var j=primerLengthRange.begin; j<=primerLengthRange.end; j++) {
            total += Math.min(absMaxPrimerStart, range.length() - j);
        }
    }

    // The above calculates the amount for just one strand. Since we search for primers on both strands,
    // double the amount.
    return 2 * total;
};

/**
 * @param {BioString} dnaString
 * @param {ClosedIntRange} range
 * @return {Array.<ClosedIntRange>}
 */
PrimerPairFinder.prototype.findACGTRangesWithin_ = function(dnaString, range) {
    var acgtRanges = [];

    for (var i=range.begin; i<=range.end; i++) {
        if (!this.isACGT_(dnaString.at(i)))
            continue;

        if (acgtRanges.length > 0 && acgtRanges.last().end + 1 === i)
        	acgtRanges.last().end++;
        else
            acgtRanges.push(new ClosedIntRange(i, i));
    }

    return acgtRanges;
};

/**
 * Note, only dnaString.mid(range) is searched for compatible primers; however, the entire dnaString is searched for
 * uniqueness constraints.
 *
 * dnaString must be in the 5' -> 3' orientation! Similarly, range must also be relevant to the 5' -> 3' direction.
 *
 * @param {BioString} dnaBioString
 * @param {ClosedIntRange} range
 * @param {number} absoluteMaxPrimerStart
 * @param {RestrictionEnzyme} restrictionEnzyme
 * @param {DnaPattern} terminalPattern
 * @return {Array.<PrimerPairFinder.LitePrimer>}
 */
PrimerPairFinder.prototype.findCompatibleLitePrimers = function(dnaBioString, range, absoluteMaxPrimerStart, restrictionEnzyme, terminalPattern) {
    var primerLengthRange = this.primerSearchParameters_.primerLengthRange;
    var tmRange = this.primerSearchParameters_.individualPrimerTmRange;
    var sodiumConcentration = this.primerSearchParameters_.sodiumConcentration;
    var primerDnaConcentration = this.primerSearchParameters_.primerDnaConcentration;

    var dnaString = dnaBioString.toString();
    var searchString = dnaBioString.mid(range).toString();
    var fullRCString = dnaBioString.reverseComplement().toString(); // Used for searching for unique primers

    // Translation is the amount to add to both positions of a compatible primer to map its coordinates back to
    // the original sequence (assuming 5' -> 3').
    var translation = range.begin - 1;

    var reSiteLength = restrictionEnzyme.recognitionSite.length();
    var hasEndPattern = !terminalPattern.isEmpty();

    var compatiblePrimers = []; // Array.<LitePrimer>
    for (var primerLength = primerLengthRange.begin; !this.canceled_ && primerLength <= primerLengthRange.end; primerLength++) {
        var reString = '';
        if (reSiteLength > 0)
        	reString = restrictionEnzyme.recognitionSite.toString();

        var localMaxPrimerStart = Math.min(absoluteMaxPrimerStart, range.length() - primerLength);
        for (var j=1; !this.canceled_ && j<= localMaxPrimerStart; ++j) {
            // Copy the relevant sequence characters from the search string to the working primer string
            var corePrimerString = searchString.substr(j - 1, primerLength);
        	var primerString = reString + corePrimerString;

        	var primerBioString = new BioString(primerString, grammar.DNA);
            if (hasEndPattern && !terminalPattern.matchesAtEnd(primerBioString))
                continue;

            var tm = ThermodynamicCalculator.meltingTemperature(primerBioString, sodiumConcentration, primerDnaConcentration);
            if (tm < tmRange.begin || tm > tmRange.end)
                continue;

            // Make sure the core primer sequence only occurs once in both strands
            if (dnaString.count(corePrimerString) + fullRCString.count(corePrimerString) != 1)
                continue;

            compatiblePrimers.push(this.makeLitePrimer_(tm, new ClosedIntRange(j + translation, (j + primerLength - 1) + translation)));
        }

        this.progressTicker_.update(localMaxPrimerStart);
    }

    // Each of the locations in LitePrimer is with respect to searchString - not the original dnaString (unless the
    // range spanned the entire dnaString).
    return compatiblePrimers;
};

/**
  * @param {Array.<PrimerPairFinder.LitePrimer>} forwardLitePrimers
  * @param {Array.<PrimerPairFinder.LitePrimer>} reverseLitePrimers
  * @param {BioString} dnaString
  * @return {Array.<PrimerPair>}
  */
PrimerPairFinder.prototype.findCompatiblePrimerPairs = function(forwardLitePrimers, reverseLitePrimers, dnaString) {
    var forwardRestrictionEnzyme = this.primerSearchParameters_.forwardRestrictionEnzyme;
    var reverseRestrictionEnzyme = this.primerSearchParameters_.reverseRestrictionEnzyme;
    var ampliconLengthRange = this.primerSearchParameters_.ampliconLengthRange;
    var maximumDeltaTm = this.primerSearchParameters_.maximumPrimerPairDeltaTm;
    var dnaStringLen = dnaString.length();

    var primerFactory = new PrimerFactory();
    var searchParameters = this.primerSearchParameters_.copy();
    primerFactory.setPrimerSearchParameters(searchParameters);
    var primerPairFactory = new PrimerPairFactory();
    var compatiblePrimerPairs = [];	// PrimerPair
    for (var i=0, z=forwardLitePrimers.length; i<z; i++) {
    	var forwardLitePrimer = forwardLitePrimers[i];
        for (var j=0, y=reverseLitePrimers.length; j<y; j++) {
            if (this.canceled_)
                return compatiblePrimerPairs;

            var reverseLitePrimer = reverseLitePrimers[j];

            // Important to note that the reverseLitePrimer's coordinates are reversed!
            // Check 1: is the difference in tm's significant?
            var deltaTm = Math.abs(forwardLitePrimer.tm - reverseLitePrimer.tm);
            if (deltaTm > maximumDeltaTm)
                continue;

            // Normalize the locations of the reverse primer sequence
            var reverseSenseLocation = new ClosedIntRange(dnaStringLen - reverseLitePrimer.location.end + 1,
                                                		  dnaStringLen - reverseLitePrimer.location.begin + 1);

            // Check 2: Do the primer location's amplify a region that falls within the acceptable range
            var ampliconSize = reverseSenseLocation.end - forwardLitePrimer.location.begin + 1;

            if (!ampliconLengthRange.contains(ampliconSize))
                continue;

            // Check 3: Do these primers overlap at all?
            if (forwardLitePrimer.location.end >= reverseSenseLocation.begin)
                continue;

            // All good to go, make the primer pair
            var forwardPrimerSequence = dnaString.mid(forwardLitePrimer.location);
            var reversePrimerSequence = dnaString.mid(reverseSenseLocation).reverseComplement();
            var forwardPrimer = primerFactory.makePrimer(forwardPrimerSequence, forwardRestrictionEnzyme, forwardLitePrimer.tm);
            var reversePrimer = primerFactory.makePrimer(reversePrimerSequence, reverseRestrictionEnzyme, reverseLitePrimer.tm);
            compatiblePrimerPairs.push(primerPairFactory.makePrimerPair(forwardPrimer, reversePrimer));
        }

        this.progressTicker_.update(reverseLitePrimers.length);
    }

    return compatiblePrimerPairs;
};

/**
 * The nucleotide character is encoded as its ASCII representation.
 *
 * @param {number} nucleotide
 * @return {boolean}
 */
PrimerPairFinder.prototype.isACGT_ = function(nucleotide) {
	return nucleotide === 65 ||
		   nucleotide === 67 ||
		   nucleotide === 71 ||
		   nucleotide === 84;
};

/**
 * @param {number} tm
 * @param {ClosedIntRange} location
 * @return {PrimerPairFinder.LitePrimer}
 */
PrimerPairFinder.prototype.makeLitePrimer_ = function(tm, location) {
	return {
		tm: tm,
		location: location
	};
};

/**
 * @param {ClosedIntRange} range
 * @return {boolean}
 */
PrimerPairFinder.prototype.rangeIsLessThanMinimumPrimerLength_ = function(range) {
    return range.length() < this.primerSearchParameters_.primerLengthRange.begin;
};

/**
 * @param {ag.core.ClosedIntRangeArray} ranges
 * @return ClosedIntRangeArray
 */
PrimerPairFinder.prototype.rangesAtLeastMinimumPrimerLength_ = function(ranges) {
    var goodRanges = [];
    for (var i=0, z=ranges.length; i<z; i++)
        if (!this.rangeIsLessThanMinimumPrimerLength_(ranges[i]))
            goodRanges.push(ranges[i]);
    return goodRanges;
};


/*******************************************************************************************************************/});
