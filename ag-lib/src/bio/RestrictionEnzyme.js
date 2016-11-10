goog.provide('ag.bio.RestrictionEnzyme');

goog.require('goog.array');
goog.require('goog.asserts');

goog.require('ag.bio.grammar');
goog.require('ag.bio.BioString');

/**
 * @constructor
 * @param {?string=} name
 * @param {?ag.bio.BioString|string=} recognitionSite
 * @param {?Array.<number>=} forwardCuts
 * @param {?Array.<number>=} reverseCuts
 */
ag.bio.RestrictionEnzyme = function(name, recognitionSite, forwardCuts, reverseCuts) {
	/**
	 * @type {string}
	 * @public
	 */
	this.name = goog.isString(name) ? name : '';

	/**
	 * @type {ag.bio.BioString}
	 * @public
	*/
	this.recognitionSite = null;
	if (goog.isString(recognitionSite))
		this.recognitionSite = new ag.bio.BioString(recognitionSite, ag.bio.grammar.DNA);
	else if (recognitionSite && recognitionSite instanceof ag.bio.BioString)
		this.recognitionSite = recognitionSite;
	else
		this.recognitionSite = new ag.bio.BioString(null, ag.bio.grammar.DNA);

	/**
	 * @type {Array.<number>}
	 * @public
	 */
	this.forwardCuts = goog.isArray(forwardCuts) ? forwardCuts : [];

	/**
	 * @type {Array.<number>}
	 * @public
	 */
	this.reverseCuts = goog.isArray(reverseCuts) ? reverseCuts : [];

	goog.asserts.assert(this.recognitionSite.grammar() === ag.bio.grammar.DNA);
	goog.asserts.assert(!this.recognitionSite.hasGaps());
	goog.asserts.assert(!goog.array.contains(this.forwardCuts, 0));
	goog.asserts.assert(!goog.array.contains(this.reverseCuts, 0));
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;

var BioString = ag.bio.BioString;
var RestrictionEnzyme = ag.bio.RestrictionEnzyme;

// --------------------------------------------------------------------------------------------------------------------
// Pseudo serialization
/**
 * @param {Object} object
 * @return {RestrictionEnzyme}
 */
RestrictionEnzyme.fromSerialObject = function(object) {
	var recognitionSite = BioString.fromSerialObject(object['recognitionSite']);
	return new RestrictionEnzyme(object['name'],
		recognitionSite,
		object['forwardCuts'],
		object['reverseCuts']);
};

/** @return {Object} */
RestrictionEnzyme.prototype.toSerialObject = function() {
	return {
		'_type': 'RestrictionEnzyme',
		'name': this.name,
		'recognitionSite': this.recognitionSite.toSerialObject(),
		'forwardCuts': this.forwardCuts,
		'reverseCuts': this.reverseCuts
	};
};


// --------------------------------------------------------------------------------------------------------------------
// Operators
/**
 * @param {RestrictionEnzyme} other
 * @return {boolean}
 */
RestrictionEnzyme.prototype.eq = function(other) {
	return this.name === other.name &&
		this.recognitionSite.eq(other.recognitionSite) &&
		array.equals(this.forwardCuts, other.forwardCuts) &&
		array.equals(this.reverseCuts, other.reverseCuts);
};

/**
 * @param {RestrictionEnzyme} other
 * @return {boolean}
 */
RestrictionEnzyme.prototype.ne = function(other) {
	return !this.eq(other);
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * @returns {RestrictionEnzyme}
 */
RestrictionEnzyme.prototype.clone = function() {
	return new RestrictionEnzyme(this.name, this.recognitionSite.copy(), array.clone(this.forwardCuts), array.clone(this.reverseCuts));
};

/**
 * Returns true if only one strand is cut; false otherwise
 *
 * @return {boolean}
 */
RestrictionEnzyme.prototype.cutsOnlyOneStrand = function() {
    return (this.forwardCuts.length === 0 && this.reverseCuts.length > 0) ||
           (this.forwardCuts.length > 0 && this.reverseCuts.length === 0);
};

/** @return {boolean} */
RestrictionEnzyme.prototype.isBlunt = function() {
	return this.forwardCuts.length > 0 && array.equals(this.forwardCuts, this.reverseCuts);
};

/** @return {boolean} */
RestrictionEnzyme.prototype.isEmpty = function() {
	return this.recognitionSite.isEmpty();
};

/** @return {boolean} */
RestrictionEnzyme.prototype.isSticky = function() {
    return this.forwardCuts.length > 0 &&
           this.reverseCuts.length > 0 &&
           !array.equals(this.forwardCuts, this.reverseCuts);
};

/** @return {number} */
RestrictionEnzyme.prototype.numCuts = function() {
	return this.forwardCuts.length + this.reverseCuts.length;
};

/*******************************************************************************************************************/});