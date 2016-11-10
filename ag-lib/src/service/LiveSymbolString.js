/**
 * @fileoverview: LiveSymbolString provides an observable symbol string computed from a AbstractLiveCharCountDistribution and
 * BioSymbolGroup.
 *
 * It is not possible to change the source LiveCharCountDistribution or BioSymbolGroup after construction; however,
 * "getter" functions are provided to retrieve the current values.
 *
 * LiveSymbolString optimally updates the symbol string in response to changes in the LiveCharCountDistribution. If
 * only a fraction of the CharCountDistribution columns have been updated, then only the symbols for that region will
 * be recomputed.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.service.LiveSymbolString');

goog.require('ag.core.CharCountDistribution');
goog.require('ag.core.ClosedIntRange');
goog.require('ag.meta.MetaObject');

goog.require('goog.asserts');
goog.require('goog.events');

/**
 * @constructor
 * @param {ag.core.CharCountDistribution} distribution
 * @param {ag.service.SymbolStringCalculator} symbolStringCalculator
 */
ag.service.LiveSymbolString = function(distribution, symbolStringCalculator) {
    goog.asserts.assert(distribution instanceof ag.core.CharCountDistribution, 'Invalid char count distribution');
    goog.asserts.assert(symbolStringCalculator, 'Invalid symbol string calculator');

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.core.CharCountDistribution}
     * @private
     */
    this.distribution_ = distribution;

    /**
     * @type {ag.service.SymbolStringCalculator}
     * @private
     */
    this.calculator_ = symbolStringCalculator;

    /**
     * @type {string}
     * @private
     */
    this.symbolString_ = '';

    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    this.constructor_();
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var events = goog.events;

var ClosedIntRange = ag.core.ClosedIntRange;
var LiveSymbolString = ag.service.LiveSymbolString;

var metaObject = ag.meta.MetaObject.getInstance;

var DistSignals = ag.core.CharCountDistribution.SignalType;

// --------------------------------------------------------------------------------------------------------------------
// Static properties
/** @enum {string} */
LiveSymbolString.SignalType = {
    // ClosedIntRange
    SYMBOLS_INSERTED: events.getUniqueId('symbols-inserted'),
    // ClosedIntRange
    SYMBOLS_REMOVED: events.getUniqueId('symbols-removed'),
    // ClosedIntRange; emitted when any of the symbols in range have changed
    DATA_CHANGED: events.getUniqueId('data-changed')
};

// --------------------------------------------------------------------------------------------------------------------
// Constructor and destructor
/** @private */
LiveSymbolString.prototype.constructor_ = function() {
    metaObject().connect(this.distribution_, DistSignals.COLUMNS_INSERTED, this, this.onColumnsInserted_)
        .connect(this.distribution_, DistSignals.COLUMNS_REMOVED, this, this.onColumnsRemoved_)
        .connect(this.distribution_, DistSignals.DATA_CHANGED, this, this.onDataChanged_);

    var l = this.distribution_.length();
    if (l)
        this.symbolString_ = this.computeSymbolString_(new ClosedIntRange(1, l));
};

LiveSymbolString.prototype.dispose = function() {
    var mo = metaObject();
    mo.disconnect(this.distribution_, DistSignals.COLUMNS_INSERTED, this, this.onColumnsInserted_);
    mo.disconnect(this.distribution_, DistSignals.COLUMNS_REMOVED, this, this.onColumnsRemoved_);
    mo.disconnect(this.distribution_, DistSignals.DATA_CHANGED, this, this.onDataChanged_);

    delete this.distribution_;
    delete this.calculator_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {string} */
LiveSymbolString.prototype.symbolString = function() {
    return this.symbolString_;
};

// --------------------------------------------------------------------------------------------------------------------
// Private handlers
/**
 * @param {ag.core.ClosedIntRange} columns
 * @private
 */
LiveSymbolString.prototype.onColumnsInserted_ = function(columns) {
    var str = this.symbolString_;

    var newString = '';
    if (columns.begin > 1)
        newString = str.substr(0, columns.begin-1);
    newString += this.computeSymbolString_(columns)
    if (columns.begin <= str.length)
        newString += str.substr(columns.begin-1);
    this.symbolString_ = newString;

    metaObject().emit(this, LiveSymbolString.SignalType.SYMBOLS_INSERTED, columns);
};

/**
 * @param {ag.core.ClosedIntRange} columns
 * @private
 */
LiveSymbolString.prototype.onColumnsRemoved_ = function(columns) {
    var str = this.symbolString_;
    this.symbolString_ = str.substr(0, columns.begin-1) + str.substr(columns.end);

    metaObject().emit(this, LiveSymbolString.SignalType.SYMBOLS_REMOVED, columns);
};

/**
 * @param {ag.core.ClosedIntRange} columns
 * @private
 */
LiveSymbolString.prototype.onDataChanged_ = function(columns) {
    var oldSymbols = this.symbolString_.substr(columns.begin-1, columns.length());
    var newSymbols = this.computeSymbolString_(columns);
    if (oldSymbols === newSymbols)
        return;

    var str = this.symbolString_;
    this.symbolString_ = str.substr(0, columns.begin-1) + newSymbols + str.substr(columns.end);
    metaObject().emit(this, LiveSymbolString.SignalType.DATA_CHANGED, columns);
};

// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @param {ag.core.ClosedIntRange} columns
 * @return {string}
 * @private
 */
LiveSymbolString.prototype.computeSymbolString_ = function(columns) {
    var divisor = this.distribution_.divisor();
    var subCharFractions = this.distribution_.divide(divisor, columns);
    return this.calculator_.computeSymbolString(subCharFractions);
};


/*******************************************************************************************************************/});
