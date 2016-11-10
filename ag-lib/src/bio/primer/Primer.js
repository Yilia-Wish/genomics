goog.provide('ag.bio.primer.Primer');

goog.require('goog.asserts');
goog.require('goog.math');

goog.require('ag.bio.BioString');
goog.require('ag.bio.RestrictionEnzyme');
goog.require('ag.bio.primer.PrimerSearchParameters');
goog.require('ag.bio.grammar');

/**
 * @constructor
 * @param {?string=} name
 * @param {ag.bio.BioString=} coreSequence,
 * @param {ag.bio.RestrictionEnzyme=} restrictionEnzyme
 * @param {number=} tm
 * @param {number=} homoDimerScore
 * @param {ag.bio.primer.PrimerSearchParameters=} primerSearchParameters
 */
ag.bio.primer.Primer = function(name, coreSequence, restrictionEnzyme, tm, homoDimerScore, primerSearchParameters) {
	/**
	 * @type {string}
	 * @public
	 */
	this.name = goog.isString(name) ? name : '';

	/**
	 * @type {ag.bio.BioString}
	 * @private
	 */
	this.coreSequence_ = coreSequence ? coreSequence : new ag.bio.BioString(null, ag.bio.grammar.DNA);

	/**
	 * @type {ag.bio.RestrictionEnzyme}
	 * @private
	 */
	this.restrictionEnzyme_ = restrictionEnzyme ? restrictionEnzyme : new ag.bio.RestrictionEnzyme();

	/**
	 * @type {number}
	 * @private
	 */
	this.tm_ = goog.isNumber(tm) ? tm : 0;

	/**
	 * @type {number}
	 * @private
	 */
	this.homoDimerScore_ = goog.isNumber(homoDimerScore) ? homoDimerScore : 0;

	/**
	 * @type {ag.bio.primer.PrimerSearchParameters}
	 * @private
	 */
	this.primerSearchParameters_ = primerSearchParameters ? primerSearchParameters : new ag.bio.primer.PrimerSearchParameters();

	goog.asserts.assert(this.coreSequence_ instanceof ag.bio.BioString);
	goog.asserts.assert(this.coreSequence_.grammar() === ag.bio.grammar.DNA);
	goog.asserts.assert(!this.coreSequence_.hasGaps());
	goog.asserts.assert(this.restrictionEnzyme_ instanceof ag.bio.RestrictionEnzyme);
	goog.asserts.assert(this.primerSearchParameters_ instanceof ag.bio.primer.PrimerSearchParameters);
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var math = goog.math;

var grammar = ag.bio.grammar;

var BioString = ag.bio.BioString;
var ClosedIntRange = ag.core.ClosedIntRange;
var Primer = ag.bio.primer.Primer;
var PrimerSearchParameters = ag.bio.primer.PrimerSearchParameters;
var RestrictionEnzyme = ag.bio.RestrictionEnzyme;

// --------------------------------------------------------------------------------------------------------------------
// Pseudo serialization
/**
 * @param {Object} object
 * @return {Primer}
 */
Primer.fromSerialObject = function(object) {
	var coreSequence = BioString.fromSerialObject(object['coreSequence']);
	var restrictionEnzyme = RestrictionEnzyme.fromSerialObject(object['restrictionEnzyme']);
	var psp = PrimerSearchParameters.fromSerialObject(object['primerSearchParameters']);
    return new Primer(object['name'], coreSequence, restrictionEnzyme, object['tm'], object['homoDimerScore'], psp);
};

/** @return {Object} */
Primer.prototype.toSerialObject = function() {
    return {
        '_type': 'Primer',
        'name': this.name,
        'coreSequence': this.coreSequence_.toSerialObject(),
        'restrictionEnzyme': this.restrictionEnzyme_.toSerialObject(),
        'tm': this.tm_,
        'homoDimerScore': this.homoDimerScore_,
        'primerSearchParameters': this.primerSearchParameters_.toSerialObject()
    };
};

// --------------------------------------------------------------------------------------------------------------------
// Static public methods
/**
 * @param {BioString} bioString
 * @param {RestrictionEnzyme} restrictionEnzyme
 * @return {BioString}
 */
Primer.sequence = function(bioString, restrictionEnzyme) {
	assert(goog.isDefAndNotNull(bioString), 'Primer.sequence() - bioString is not defined');

	if (restrictionEnzyme)
		return new BioString(restrictionEnzyme.recognitionSite.toString() + bioString.toString(), grammar.DNA);

	return bioString.copy();
};


// --------------------------------------------------------------------------------------------------------------------
// Operators
/**
 * @param {Primer} other
 * @return {boolean}
 */
Primer.prototype.eq = function(other) {
	if (this === other)
		return true;

	return this.name === other.name &&
		this.coreSequence_.eq(other.coreSequence_) &&
		this.restrictionEnzyme_.eq(other.restrictionEnzyme_) &&
		math.nearlyEquals(this.tm_, other.tm_) &&
		math.nearlyEquals(this.homoDimerScore_, other.homoDimerScore_);
};

/**
 * @param {Primer} other
 * @return {boolean}
 */
Primer.prototype.ne = function(other) {
	return !this.eq(other);
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @return {BioString} */
Primer.prototype.coreSequence = function() {
	return this.coreSequence_;
};

/**
 * @param {BioString} dnaString
 * @return {number}
 */
Primer.prototype.countCoreSequenceForwardMatchesIn = function(dnaString) {
	assert(dnaString.grammar() === grammar.DNA);
	return dnaString.count(this.coreSequence_);
};

/**
 * @param {BioString} dnaString
 * @return {number}
 */
Primer.prototype.countCoreSequenceMatchesIn = function(dnaString) {
	assert(dnaString.grammar() === grammar.DNA);
	return this.countCoreSequenceForwardMatchesIn(dnaString) +
		this.countCoreSequenceReverseMatchesIn(dnaString);
};

/**
 * @param {BioString} dnaString
 * @return {number}
 */
Primer.prototype.countCoreSequenceReverseMatchesIn = function(dnaString) {
	assert(dnaString.grammar() === grammar.DNA);
	return dnaString.reverseComplement().count(this.coreSequence_);
};

/**
 * @param {BioString} dnaString
 * @return {Array.<ClosedIntRange>}
 */
Primer.prototype.coreSequenceForwardLocationsIn = function(dnaString) {
	return dnaString.findLocationsOf(this.coreSequence_);
};

/**
 * @param {BioString} dnaString
 * @return {Array.<ClosedIntRange>}
 */
Primer.prototype.coreSequenceReverseLocationsIn = function(dnaString) {
	var rcCoreSequence = this.coreSequence_.reverseComplement();
	return dnaString.findLocationsOf(rcCoreSequence);
};

/** @return {number} */
Primer.prototype.homoDimerScore = function() {
	return this.homoDimerScore_;
};

/** @return {boolean} */
Primer.prototype.isNull = function() {
	return this.coreSequence_.isEmpty();
};

/**
 * @param {BioString} dnaString
 * @return {?ClosedIntRange}
 */
Primer.prototype.locateCoreSequenceIn = function(dnaString) {
    var start = this.locateCoreSequenceStartIn(dnaString);
    if (start === -1)
        return null;

    var stop = start + this.coreSequence_.length() - 1;
    return new ClosedIntRange(start, stop);
};

/**
 * Because this method deals with the reverse complement, the first occurrence is relative to the right most position
 * in dnaString.
 *
 * @param {BioString} dnaString
 * @return {?ClosedIntRange}
 */
Primer.prototype.locateCoreSequenceInCognateStrand = function(dnaString) {
    var start = this.locateCoreSequenceStartInCognateStrand(dnaString);
    if (start === -1)
        return null;

    var stop = start + this.coreSequence_.length() - 1;
    return new ClosedIntRange(start, stop);
};

/**
 * @param {BioString} dnaString
 * @return {number}
 */
Primer.prototype.locateCoreSequenceStartIn = function(dnaString) {
	return dnaString.indexOf(this.coreSequence_);
};

/**
 * @param {BioString} dnaString
 * @return {number}
 */
Primer.prototype.locateCoreSequenceStartInCognateStrand = function(dnaString) {
	var rcCoreSequence = this.coreSequence_.reverseComplement();
	return dnaString.lastIndexOf(rcCoreSequence);
};

/**
 * @param {BioString} dnaString
 * @return {number}
 */
Primer.prototype.locateCoreSequenceStopIn = function(dnaString) {
    var start = this.locateCoreSequenceStartIn(dnaString);
    if (start === -1)
        return -1;

    var stop = start + this.coreSequence_.length() - 1;
    return stop;
};

/**
 * @param {BioString} dnaString
 * @return {number}
 */
Primer.prototype.locateCoreSequenceStopInCognateStrand = function(dnaString) {
    var start = this.locateCoreSequenceStartInCognateStrand(dnaString);
    if (start === -1)
        return -1;

    var stop = start + this.coreSequence_.length() - 1;
    return stop;
};

/** @return {PrimerSearchParameters} */
Primer.prototype.primerSearchParameters = function() {
	return this.primerSearchParameters_;
};

/** @return {RestrictionEnzyme} */
Primer.prototype.restrictionEnzyme = function() {
	return this.restrictionEnzyme_;
};

/** @return {BioString} */
Primer.prototype.sequence = function() {
	return Primer.sequence(this.coreSequence_, this.restrictionEnzyme_);
};

/** @return {string} */
Primer.prototype.sequenceString = function() {
	var result = '';
	if (this.restrictionEnzyme_)
		result += this.restrictionEnzyme_.recognitionSite.toString();

	result += this.coreSequence_.toString();
	return result;
};

/** @return {number} */
Primer.prototype.tm = function() {
	return this.tm_;
};

/*******************************************************************************************************************/});
