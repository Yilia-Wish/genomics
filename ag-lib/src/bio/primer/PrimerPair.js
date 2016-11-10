goog.provide('ag.bio.primer.PrimerPair');

goog.require('goog.asserts');
goog.require('goog.math');

goog.require('ag.bio.BioString');
goog.require('ag.bio.primer.Primer');
goog.require('ag.core.ClosedIntRange');

/**
 * @constructor
 * @param {ag.bio.primer.Primer=} forwardPrimer
 * @param {ag.bio.primer.Primer=} reversePrimer
 * @param {number=} score
 */
ag.bio.primer.PrimerPair = function(forwardPrimer, reversePrimer, score) {
	/**
	 * @type {ag.bio.primer.Primer}
	 * @public
	 */
	this.forwardPrimer = forwardPrimer ? forwardPrimer : new ag.bio.primer.Primer();

	/**
	 * @type {ag.bio.primer.Primer}
	 * @public
	 */
	this.reversePrimer = reversePrimer ? reversePrimer : new ag.bio.primer.Primer();

	/**
	 * @type {number}
	 * @public
	 */
	this.score = goog.isNumber(score) ? score : 0.;

	goog.asserts.assert(this.forwardPrimer instanceof ag.bio.primer.Primer);
	goog.asserts.assert(this.reversePrimer instanceof ag.bio.primer.Primer);
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var math = goog.math;

var BioString = ag.bio.BioString;
var ClosedIntRange = ag.core.ClosedIntRange;
var Primer = ag.bio.primer.Primer;
var PrimerPair = ag.bio.primer.PrimerPair;

// --------------------------------------------------------------------------------------------------------------------
// Pseudo serialization
/**
 * @param {Object} object
 * @return {PrimerPair}
 */
PrimerPair.fromSerialObject = function(object) {
	var forwardPrimer = Primer.fromSerialObject(object['forwardPrimer']);
	var reversePrimer = Primer.fromSerialObject(object['reversePrimer']);
    return new PrimerPair(forwardPrimer, reversePrimer, object['score']);
};

/** @return {Object} */
PrimerPair.prototype.toSerialObject = function() {
    return {
        '_type': 'PrimerPair',
        'forwardPrimer': this.forwardPrimer.toSerialObject(),
        'reversePrimer': this.reversePrimer.toSerialObject(),
        'score': this.score
    };
};

// --------------------------------------------------------------------------------------------------------------------
// Operators
/**
 * @param {PrimerPair} other
 * @return {boolean}
 */
PrimerPair.prototype.eq = function(other) {
	return this.forwardPrimer.eq(other.forwardPrimer) &&
		this.reversePrimer.eq(other.reversePrimer) &&
		math.nearlyEquals(this.score, other.score);
};

/**
 * @param {PrimerPair} other
 * @return {boolean}
 */
PrimerPair.prototype.ne = function(other) {
	return !this.eq(other);
};

// --------------------------------------------------------------------------------------------------------------------
// Static methods
/**
 * @param {Primer} primer1
 * @param {Primer} primer2
 * @return {number}
 */
PrimerPair.deltaTm = function(primer1, primer2) {
	assert(goog.isDefAndNotNull(primer1));
	assert(goog.isDefAndNotNull(primer2));

	return Math.abs(primer1.tm() - primer2.tm());
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @return {number} */
PrimerPair.prototype.deltaTm = function() {
	return PrimerPair.deltaTm(this.forwardPrimer, this.reversePrimer);
};

/**
 * @param {BioString} dnaString
 * @return {number}
 */
PrimerPair.prototype.longestAmpliconLength = function(dnaString) {
    var ampliconLocation = new ClosedIntRange();
    ampliconLocation.begin = this.forwardPrimer.locateCoreSequenceStartIn(dnaString);
    if (ampliconLocation.begin === -1)
        return 0;

    ampliconLocation.end = this.reversePrimer.locateCoreSequenceStopInCognateStrand(dnaString);
    if (ampliconLocation.end === -1)
        return 0;

    return ampliconLocation.length();
};

/*******************************************************************************************************************/});