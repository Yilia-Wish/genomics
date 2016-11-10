goog.provide('ag.model.BinaryInsertStrategy');

goog.require('goog.array');
goog.require('goog.asserts');

goog.require('ag.core.AObject');
goog.require('ag.model.AbstractItemModel');
goog.require('ag.model.InsertStrategy');
goog.require('ag.util');

/**
 * Utilizes a binary insertion algorithm to insert new records into an array. Column denotes the reference column in the
 * model to utilize when comparing records.
 *
 * @constructor
 * @extends {ag.model.InsertStrategy}
 * @param {number} column
 * @param {ag.core.AObject=} optParent
 */
ag.model.BinaryInsertStrategy = function(column, optParent) {
	goog.base(this, optParent);

	/**
	 * @type {number}
	 * @private
	 */
	this.column_ = column;

	/**
	 * @type {number}
	 * @private
	 */
	// Cache the data role
	this.role_ = ag.model.AbstractItemModel.DataRole.kDisplay;
};
goog.inherits(ag.model.BinaryInsertStrategy, ag.model.InsertStrategy);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;

var util = ag.util;
var BinaryInsertStrategy = ag.model.BinaryInsertStrategy;

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @inheritDoc */
BinaryInsertStrategy.prototype.canOptimizeFind = function(column) {
	return column === this.column_;
};

/** @return {number} */
BinaryInsertStrategy.prototype.column = function() {
	return this.column_;
};

// --------------------------------------------------------------------------------------------------------------------
// Virtual methods
/** @inheritDoc */
BinaryInsertStrategy.prototype.findRowWithValue = function(column, value) {
	assert(goog.isDefAndNotNull(this.sourceModel_), 'BinaryInsertStrategy.findRowWithValue() - source model is not defined');
	assert(this.sourceModel_.isValidColumn(this.column_), 'BinaryInsertStrategy.findRowWithValue() - invalid column for source model');
	assert(column === this.column_);

	var row = array.binarySearch(this.sourceModel_.entities(), value, goog.bind(this.compareValueAgainstColumn_, this));
	return row >= 0 ? row : -1;
};

/**
 * @inheritDoc
 */
BinaryInsertStrategy.prototype.insert = function(newEntities, optRow) {
	assert(goog.isDefAndNotNull(this.sourceModel_), 'BinaryInsertStrategy.insert() - source model is not defined');
	assert(this.sourceModel_.isValidColumn(this.column_), 'BinaryInsertStrategy.insert() - invalid column for source model');

	var destArray = this.sourceModel_.entities();
	for (var i=0; i< newEntities.length; i++) {
		var searchIndex = array.binarySearch(destArray, newEntities[i], goog.bind(this.compareByColumn_, this));
		// A 0+ search index indicates that another row was found with this exact value. Simply insert before that one
		// if that happens.
		var insertRow = (searchIndex >= 0) ? searchIndex : -(searchIndex + 1);

		this.sourceModel_.beginInsertRows(insertRow, insertRow);
		array.insertAt(destArray, newEntities[i], insertRow);
		this.sourceModel_.endInsertRows();
	}

	return true;
};


// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @param {ag.core.Entity} leftEntity
 * @param {ag.core.Entity} rightEntity
 * @return {number}
 */
BinaryInsertStrategy.prototype.compareByColumn_ = function(leftEntity, rightEntity) {
	var leftData = this.sourceModel_.data_(leftEntity, this.column_, this.role_);
	var rightData = this.sourceModel_.data_(rightEntity, this.column_, this.role_);

	return util.compareAscending(leftData, rightData);
};

/**
 * @param {*} value
 * @param {ag.core.Entity} rightEntity
 * @return {number}
 */
BinaryInsertStrategy.prototype.compareValueAgainstColumn_ = function(value, entity) {
	var data = this.sourceModel_.data_(entity, this.column_, this.role_);

	return util.compareAscending(value, data);
};


/*******************************************************************************************************************/});
