/**
 * @fileoverview AbstractTableModel provides an abstract representation of an observable array of
 * entities.
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.model.AbstractTableModel');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.object');

goog.require('ag.validation');
goog.require('ag.model.AbstractItemModel');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.model.AbstractItemModel}
 * @param {ag.core.AObject=} optParent defaults to null
 */
ag.model.AbstractTableModel = function(optParent) {
	goog.base(this, optParent);

	/**
	 * @type {Array}
	 * @protected
	 */
	this.entities_ = [];

	/**
	 * @type {Object}
	 * @private
	 */
	this.invalidFields_ = null;

	/**
	 * @type {ag.model.InsertStrategy}
	 * @private
	 */
	this.insertStrategy_ = null;
};
goog.inherits(ag.model.AbstractTableModel, ag.model.AbstractItemModel);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;
var object = goog.object;

var AbstractItemModel = ag.model.AbstractItemModel;
var AbstractTableModel = ag.model.AbstractTableModel;
var ModelIndex = ag.model.ModelIndex;
var validation = ag.validation;

var DataRole = AbstractItemModel.DataRole;
var SignalType = AbstractItemModel.SignalType;

// --------------------------------------------------------------------------------------------------------------------
// Destructor
/** @override */
AbstractTableModel.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	this.clear();
	this.entities_ = null;
	object.clear(this.invalidFields_);
	this.invalidFields_ = null;

	// Even though any defined insert strategy is a child object and will be disposed in conjunction with this classes
	// destruction, null the reference.
	this.insertStrategy_ = null;
};

// --------------------------------------------------------------------------------------------------------------------
// Virtual methods
/**
 * Convenience method for appending one or more entities to the model.
 *
 * @param {*|Array} entities
 * @return {boolean}
 */
AbstractTableModel.prototype.append = function(entities) {
	return this.insert(entities, this.rowCount());
};

/**
 * @param {ModelIndex} index
 * @param {AbstractTableModel.DataRole=} role defaults to kDisplay
 * @return {*}
 */
AbstractTableModel.prototype.data = function(index, role) {
	if (!this.isValidIndex(index))
		return null;
	role = goog.isNumber(role) ? role : DataRole.kDisplay;

	var entity = this.entityAtRow(index.row());
	return this.data_(entity, index.column(), role);
};

/**
 * @return {Array}
 */
AbstractTableModel.prototype.entities = function() {
	return this.entities_;
};

/**
 * @param {number} row
 * @return {*}
 */
AbstractTableModel.prototype.entityAtRow = function(row) {
	assert(this.isValidRow(row), 'AbstractTableModel.entityAtRow() - invalid row ' + row);

	return this.entities_[row];
};

/**
 * @param {ModelIndex} index
 * @return {*}
 */
AbstractTableModel.prototype.entityForIndex = function(index) {
	if (!index.isValid())
		return null;

	return this.entityAtRow(index.row());
};

/**
 * @param {number} startRow
 * @param {nubmer} endRow
 * @return {Array}
 */
AbstractTableModel.prototype.entitySlice = function(startRow, endRow) {
	assert(this.isValidRow(startRow), 'AbstractTableModel.entitySlice(): startRow out of range');
	assert(this.isValidRow(endRow), 'AbstractTableModel.entitySlice(): endRow out of range');
	assert(startRow <= endRow, 'AbstractTableModel.entitySlice(): invalid range');

	return array.slice(this.entities_, startRow, endRow + 1);
};

/**
 * Convenience method for retrieving an entity from its id.
 *
 * @param {string|number} id
 * @return {*}
 */
// AbstractTableModel.prototype.entityWithId = function(id) {
// 	var row = this.findRowById(id);
// 	if (row === -1)
// 		return null;

// 	return this.entityAtRow(row);
// };

/**
 * Convenience method for retrieving an entity that has a specific value for a given column.
 *
 * @param {number} column
 * @param {*} value
 * @return {*}
 */
AbstractTableModel.prototype.entityWithValue = function(column, value) {
	var row = this.findRowWithValue(column, value);
	if (row === -1)
		return null;

	return this.entityAtRow(row);
};

/**
 * Returns -1 if no entity is found that has the supplied id.
 *
 * @param {string|number} id
 * @return {number}
 */
// AbstractTableModel.prototype.findRowById = function(id) {
// 	assert(goog.isString(id) || goog.isNumber(id), 'AbstractTableModel.findRowById() - id must be a string or number');

// 	for (var i=0; i< this.rowCount(); i++)
// 		if (this.entities_[i].id === id)
// 			return i;

// 	return -1;
// };

/**
 * Returns -1 if no entity is found that has a value in the given column. Returns the first match if multiple
 * rows have the same value in column.
 *
 * @param {number} column
 * @param {*} value
 * @return {number}
 */
AbstractTableModel.prototype.findRowWithValue = function(column, value) {
	assert(this.isValidColumn(column), 'AbstractTableModel.findRowWithValue() - invalid column');

	if (goog.isDefAndNotNull(this.insertStrategy_) && this.insertStrategy_.canOptimizeFind(column))
		return this.insertStrategy_.findRowWithValue(column, value);

	for (var i=0; i< this.rowCount(); i++) {
		var entity = this.entityAtRow(i);
		if (this.data_(entity, column, DataRole.kDisplay) === value)
			return i;
	}

	return -1;
};

/**
 * @param {*|Array} newEntities
 * @param {number=} optRow defaults to 0
 * @return {boolean}
 */
AbstractTableModel.prototype.insert = function(newEntities, optRow) {
	var row = goog.isNumber(optRow) ? optRow : 0;
	assert(this.isValidInsertRow(row), 'AbstractTableModel.insertRows() - invalid insert row ' + optRow);

	if (!newEntities)
		return false;

	if (!goog.isArray(newEntities))
		newEntities = [newEntities];
	else if (newEntities.length === 0)
		return false;

	if (goog.isDefAndNotNull(this.insertStrategy_))
		return this.insertStrategy_.insert(newEntities, row);

	// No alternative insert strategy provided - simply insert where requested.
	this.beginInsertRows(row, row + newEntities.length - 1);
	array.insertArrayAt(this.entities_, newEntities, row);
	this.endInsertRows();

	return true;
};

/** @return {Object} */
AbstractTableModel.prototype.invalidFields = function() {
	return this.invalidFields_;
};

/**
 * Convenience method for prepending one or more entities to the model.
 *
 * @param {*|Array} entities
 * @return {boolean}
 */
AbstractTableModel.prototype.prepend = function(entities) {
	return this.insert(entities, 0);
};

/**
 * @param {string|number} id
 * @return {boolean}
 */
// AbstractTableModel.prototype.removeById = function(id) {
// 	var row = this.findRowById(id);
// 	if (row == -1)
// 		return false;

// 	this.removeRows(row);
// 	return true;
// };

/** @override */
AbstractTableModel.prototype.removeRows = function(startRow, optCount) {
	assert(this.isValidRow(startRow), 'AbstractTableModel.removeRows() - invalid start row, ' + startRow);

	var count = goog.isNumber(optCount) ? optCount : 1;
	assert(count >= 0, 'AbstractTableModel.removeRows() - optCount must be greater than or equal to 0');
	assert(startRow + count - 1 < this.rowCount(), 'AbstractTableModel.removeRows() - startRow + optCount - 1 must be less than the number of rows');

	if (count === 0)
		return;

	this.beginRemoveRows(startRow, startRow + count - 1);
	array.splice(this.entities_, startRow, count);
	this.endRemoveRows();
};

/** @return {number} */
AbstractTableModel.prototype.rowCount = function() {
	return this.entities_.length;
};

/**
 * @param {ModelIndex} index
 * @param {*} newValue
 * @return boolean
 */
AbstractTableModel.prototype.setData = function(index, newValue) {
	assert(this.isValidIndex(index), 'AbstractTableModel.setData() - invalid index');

	var entity = this.entityAtRow(index.row());
	if (!entity)
		return false;

	var column = index.column();
	if (this.data_(entity, column, DataRole.kDisplay) === newValue)
		return true;

	if (!this.setData_(entity, column, newValue))
		return false;

	this.emit(SignalType.DATA_CHANGED, index);
	return true;
};

/**
 * Resets the model with newEntities
 *
 * @param {*|Array} newEntities
 * @return {boolean}
 */
AbstractTableModel.prototype.setEntities = function(newEntities) {
	this.beginResetModel();
	if (!newEntities)
		newEntities = [];
	else if (!goog.isArray(newEntities))
		newEntities = [newEntities];
	this.entities_ = newEntities;
	this.endResetModel();
};

/**
 * Takes ownership of newInsertStrategy, freeing any previously associated insert strategy.
 *
 * @param {ag.model.InsertStrategy}
 */
AbstractTableModel.prototype.setInsertStrategy = function(newInsertStrategy) {
	if (newInsertStrategy === this.insertStrategy_)
		return;

	if (goog.isDefAndNotNull(this.insertStrategy_))
		this.insertStrategy_.dispose();

	this.insertStrategy_ = newInsertStrategy;

	if (goog.isDefAndNotNull(this.insertStrategy_)) {
		// Take ownership, so that when this object is freed, the strategy will be freed as well.
		this.insertStrategy_.setParent(this);
		this.insertStrategy_.setSourceModel(this);
	}
};

/**
 * Validates a value for a specific column.
 *
 * @param {*} value
 * @param {number} column
 * @return {boolean}
 */
AbstractTableModel.prototype.validateValue = function(value, column) {
	assert(this.isValidColumn(column), 'AbstractTableModel.validateValue() - invalid column');

	this.invalidFields_ = {};
	var rules = this.validationRules_();
	if (!object.containsKey(rules, column))
		return true;

	return validation.validateValue(value, rules[column], column, this.invalidFields_);
};

/**
 * Validates rawObject based on the rules returned by validationRules_() and returns true if the data
 * represented by rawObject is valid or false otherwise. In the event that rawObject is invalid, the
 * invalid fields may be retrieved via the invalidFields method.
 *
 * If there is no rule for a given value, accept it.
 *
 * @param {Object} rawObject
 * @return {boolean}
 */
AbstractTableModel.prototype.validates = function(rawEntity) {
	this.invalidFields_ = {};

	return validation.validateObject(rawEntity, this.validationRules_(), this.invalidFields_);
};


// --------------------------------------------------------------------------------------------------------------------
// Protected methods
/**
 * @param {*} entity
 * @param {number} column
 * @param {AbstractTableModel.DataRole} role
 * @return {*}
 * @protected
 */
AbstractTableModel.prototype.data_ = goog.abstractMethod;

/**
 * @param {*} entity
 * @param {number} column
 * @param {*} newValue
 * @return {boolean}
 * @protected
 */
AbstractTableModel.prototype.setData_ = goog.abstractMethod;

/**
 * @return {Object}
 * @protected
 */
AbstractTableModel.prototype.validationRules_ = goog.abstractMethod;

/*******************************************************************************************************************/});
