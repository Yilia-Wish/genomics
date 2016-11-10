/**
 * @fileoverview BioSymbol associates a single arbitrary biological symbol with a unique set of characters along with a threshold
 * (i.e. percentage) that these characters must surpass in quantity for the representative symbol to be deemed
 * significant.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.bio.BioSymbol');

goog.require('goog.asserts');
goog.require('goog.math');
goog.require('goog.structs.Set');

/**
 * @constructor
 * @param {string} [optSymbol] only the first character is processed, defaults to zero
 * @param {string} [optCharacters] characters associated with symbol
 * @param {number} [optThreshold] defaults to zero
 * @param {string} [optLabel]
 */
ag.bio.BioSymbol = function(optSymbol, optCharacters, optThreshold, optLabel) {
    goog.asserts.assert(!optSymbol || (goog.isString(optSymbol) && optSymbol.length === 1));

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {string}
     * @private
     */
    this.symbol_ = optSymbol ? optSymbol[0] : ' ';

    /**
     * @type {goog.structs.Set}
     * @private
     */
    this.characterSet_ = new goog.structs.Set();

    /**
     * @type {string}
     */
    this.label = goog.isString(optLabel) ? optLabel : '';

    /**
     * @type {number}
     * @private
     */
    this.threshold_ = goog.isNumber(optThreshold) ? goog.math.clamp(0, optThreshold, 1) : 0;

    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    this.setCharacters(optCharacters);
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var math = goog.math;
var Set = goog.structs.Set;

var BioSymbol = ag.bio.BioSymbol;

// --------------------------------------------------------------------------------------------------------------------
// Operators
/**
 * @param {BioSymbol} other
 * @return {boolean}
 */
BioSymbol.prototype.eq = function(other) {
    if (this === other)
        return true;

    return this.symbol_ === other.symbol_ &&
        math.nearlyEquals(this.threshold_, other.threshold_) &&
        this.label === other.label &&
        this.characterSet_.equals(other.characterSet_);
};

/**
 * @param {BioSymbol} other
 * @return {boolean}
 */
BioSymbol.prototype.ne = function(other) {
    return !this.eq(other);
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * Walks through each character in characters and adds its ascii code to the internal set. Obviously, duplicates are
 * ignored by virtue of the Set container class.
 *
 * @param {string} characters
 */
BioSymbol.prototype.addCharacters = function(characters) {
    // Split all characters and add their character code
    var i = characters.length;
    while (i--)
        this.characterSet_.add(characters.charCodeAt(i));
};

/** @return {string} */
BioSymbol.prototype.characters = function() {
    var result = '';

    var codes = this.characterSet_.getValues();
    var i = codes.length;
    while (i--)
        result += String.fromCharCode(codes[i]);

    return result;
};

/** @return {Set} */
BioSymbol.prototype.characterSet = function() {
    return this.characterSet_;
};

/**
 * @param {string} ch
 * @return {boolean}
 */
BioSymbol.prototype.hasCharacter = function(ch) {
    assert(ch.length === 1);
    return this.characterSet_.contains(ch.charCodeAt(0));
};

/**
 * @param {number} asciiCh
 * @return {boolean}
 */
BioSymbol.prototype.hasCode = function(asciiCh) {
    return this.characterSet_.contains(asciiCh);
};

/**
 * @param {string} characters
 */
BioSymbol.prototype.removeCharacters = function(characters) {
    var i = characters.length;
    while (i--)
        this.characterSet_.remove(characters.charCodeAt(i));
};

/**
 * @param {string} [optCharacters]
 */
BioSymbol.prototype.setCharacters = function(optCharacters) {
    this.characterSet_ = new Set();
    if (optCharacters)
        this.addCharacters(optCharacters);
};

/**
 * @param {string} newSymbol
 */
BioSymbol.prototype.setSymbol = function(newSymbol) {
    assert(newSymbol.length === 1);
    this.symbol_ = newSymbol[0];
};

/**
 * @param {number} newThreshold
 */
BioSymbol.prototype.setThreshold = function(newThreshold) {
    assert(newThreshold >= 0 && newThreshold <= 1);
    this.threshold_ = newThreshold;
};

/** @return {number} */
BioSymbol.prototype.size = function() {
    return this.characterSet_.getCount();
};

/** @return {string} */
BioSymbol.prototype.symbol = function() {
    return this.symbol_;
};

/** @return {number} */
BioSymbol.prototype.threshold = function() {
    return this.threshold_;
};



/*******************************************************************************************************************/});
