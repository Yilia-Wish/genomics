goog.provide('ag.bio.primer.PrimerPairFactory');

goog.require('goog.asserts');

goog.require('ag.bio.primer.DimerScoreCalculator');
goog.require('ag.bio.primer.Primer');
goog.require('ag.bio.primer.PrimerPair');

/**
  * PrimerPairFactory encapsulates creating PrimerPair properly initialized objects and in particular deriving their
  * score.
  *
  * @constructor
  */
ag.bio.primer.PrimerPairFactory = function() {
    /**
	 * @type {ag.bio.primer.DimerScoreCalculator}
	 * @private
	 */
	this.dimerScoreCalculator_ = new ag.bio.primer.DimerScoreCalculator();
};


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var DimerScoreCalculator = ag.bio.primer.DimerScoreCalculator;
var Primer = ag.bio.primer.Primer;
var PrimerPair = ag.bio.primer.PrimerPair;
var PrimerPairFactory = ag.bio.primer.PrimerPairFactory;

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * @param {Primer} forwardPrimer
 * @param {Primer} reversePrimer
 * @return {PrimerPair}
 */
PrimerPairFactory.prototype.makePrimerPair = function(forwardPrimer, reversePrimer) {
	assert(goog.isDefAndNotNull(forwardPrimer) && forwardPrimer instanceof Primer);
	assert(goog.isDefAndNotNull(reversePrimer) && reversePrimer instanceof Primer);

    var heteroDimerScore = this.dimerScoreCalculator_.dimerScore(forwardPrimer.sequence(), reversePrimer.sequence());
	var finalScore = PrimerPair.deltaTm(forwardPrimer, reversePrimer) +
    	             forwardPrimer.homoDimerScore() +
                     reversePrimer.homoDimerScore() +
                     heteroDimerScore;
    return new PrimerPair(forwardPrimer, reversePrimer, finalScore);
};

/*******************************************************************************************************************/});
