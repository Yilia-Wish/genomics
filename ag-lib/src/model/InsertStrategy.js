goog.provide('ag.model.InsertStrategy');

goog.require('ag.core.AObject');

/**
 * @constructor
 * @extends {ag.core.AObject}
 * @param {ag.core.AObject=} optParent
 */
ag.model.InsertStrategy = function(optParent) {
	goog.base(this, optParent);

	this.sourceModel_ = null;
};
goog.inherits(ag.model.InsertStrategy, ag.core.AObject);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var InsertStrategy = ag.model.InsertStrategy;

// --------------------------------------------------------------------------------------------------------------------
// Destructor
/**
 * Release the model reference
 */
InsertStrategy.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	/** 
	 * @type {ag.model.AbstractTableModel}
	 * @protected
	 */
	this.sourceModel_ = null;
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * Depending on the insert strategy, it may or may not be possible to optimize searching for a particular value based
 * on the column being searched. By default, there is no optimization.
 *
 * @param {number} column
 * @return {boolean}
 */
InsertStrategy.prototype.canOptimizeFind = function(column) {
	return false;
};

/**
 * @param {ag.model.AbstractTableModel} newModel
 */
InsertStrategy.prototype.setSourceModel = function(newModel) {
	this.sourceModel_ = newModel;
};

/** @return {ag.model.AbstractTableModel} */
InsertStrategy.prototype.sourceModel = function() {
	return this.sourceModel_;
};

// --------------------------------------------------------------------------------------------------------------------
// Virtual methods
/**
 * @param {number} column
 * @param {*} value
 * @return {number}
 */
InsertStrategy.prototype.findRowWithValue = function(column, value) {
	throw Error('unimplemented abstract method');
};

/**
 * @param {Array.<ag.core.Entity>} newEntities
 * @param {number=} optRow
 */
InsertStrategy.prototype.insert = function(newEntities, optRow) {
	throw Error('unimplemented abstract method');
};


/*******************************************************************************************************************/});