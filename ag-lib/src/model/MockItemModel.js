goog.provide('ag.model.MockItemModel');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.math');
goog.require('goog.string');

goog.require('ag.model.AbstractItemModel');
goog.require('ag.model.ModelIndex');

ag.model.MockItemModel = function() {
	goog.base(this);

	this.data_ = ag.model.MockItemModel.mockData();
};
goog.inherits(ag.model.MockItemModel, ag.model.AbstractItemModel);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;
var math = goog.math;
var string = goog.string;

var MockItemModel = ag.model.MockItemModel;
var ModelIndex = ag.model.ModelIndex;
var PersistentModelIndex = ag.model.PersistentModelIndex;

// --------------------------------------------------------------------------------------------------------------------
// Static methods
/**
 * @return {Array.<Object>}
 */
MockItemModel.mockData = function() {
	return [
		{id: 0,		name: 'Luke',		age: 32},
		{id: 1,		name: 'Igor',		age: 52},
		{id: 2,		name: 'Paul',		age: 33},
		{id: 3,		name: 'Chris',		age: 29}
	];
};

MockItemModel.moreMockData = function() {
	return [
		{id: 4,		name: 'Matt',		age: 24},
		{id: 5,		name: 'Kyle',		age: 28},
		{id: 6,		name: 'Dan',		age: 37},
		{id: 7,		name: 'Bart',		age: 31}
	];
};

MockItemModel.mockDataColumnCount = 3;

/** @type {number} */
MockItemModel.counter_ = 3;

/**
 * @return {Object}
 */
MockItemModel.randomInsertRow = function() {
	MockItemModel.counter_++;
	return {id: MockItemModel.counter_, name: string.getRandomString(), age: math.randomInt(100)};
}

/** @enum {number} */
MockItemModel.Columns = {
	ID: 0,
	NAME: 1,
	AGE: 2
};

var Columns = MockItemModel.Columns;

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @override */
MockItemModel.prototype.columnCount = function() {
	return 3;
};

/** @override */
MockItemModel.prototype.data = function(index, role) {
	if (!this.isValidIndex(index))
		return null;

	var result = null;
	var obj = this.data_[index.row()];
	switch (index.column()) {
	case 0:
		result = obj.id;
		break;
	case 1:
		result = obj.name;
		break;
	case 2:
		result = obj.age;
		break;
	}

	if (!goog.isDefAndNotNull(role))
		role = AbstractItemModel.DataRole.kDisplay;

	if (role === AbstractItemModel.DataRole.kDisplay)
		return result;
	else if (role === AbstractItemModel.DataRole.kEdit)
		return 'edit-' + result;

	return null;
};

/** @override */
MockItemModel.prototype.headerData = function(column) {
	switch (column) {
	case Columns.ID:
		return 'ID';
	case Columns.NAME:
		return 'Name';
	case Columns.AGE:
		return 'Age';

	default:
		return null;
	};
};

/**
 * Simply calls the base class headerData method for testing that it always returns null. This does not correspond
 * to a real function in the AbstractItemModel class.
 *
 * @param {number} column
 * @return {?string}
 */
MockItemModel.prototype.headerDataBase = function(column) {
	return this.constructor.superClass_['headerData'].call(this, column);
};

// /** @override */
// MockItemModel.prototype.index = function(row, column) {
// 	if (!this.isValidRow(row) || !this.isValidColumn(column))
// 		return new ModelIndex();

// 	return this.createIndex(row, column);
// };

/**
 * @param {Object} newDataRow
 * @param {number} pos
 */
MockItemModel.prototype.insertRow = function(newDataRow, pos) {
	assert(pos >= 0 && pos <= this.rowCount());
	assert(goog.isObject(newDataRow));

	this.beginInsertRows(pos, pos);
	array.insertAt(this.data_, newDataRow, pos);
	this.endInsertRows();
};

/**
 * @param {number} pos
 */
MockItemModel.prototype.insertNullRow = function(pos) {
	assert(pos >= 0 && pos <= this.rowCount());
	this.beginInsertRows(pos, pos);
	array.insertAt(this.data_, {id: null, name: null, age: null}, pos);
	this.endInsertRows();
};

/**
 * @param {Array.<Object>} newDataRow
 * @param {number} pos
 */
MockItemModel.prototype.insertRows = function(newDataRows, pos) {
	assert(pos >= 0 && pos <= this.rowCount());

	this.beginInsertRows(pos, pos + newDataRows.length - 1);
	array.insertArrayAt(this.data_, newDataRows, pos);
	this.endInsertRows();
};

/**
 * @param {number} startRow
 * @param {number} endRow
 * @param {number} destRow
 */
MockItemModel.prototype.moveRows = function(startRow, endRow, destRow) {
	assert(this.isValidRow(startRow));
	assert(this.isValidRow(endRow));
	assert(startRow <= endRow);

	assert(destRow >= 0);
	// Enforce a valid move
	assert(destRow + (endRow - startRow + 1) <= this.rowCount());
	if (destRow === startRow)
		return;

	this.beginMoveRows(startRow, endRow, destRow);
	var removed = array.splice(this.data_, startRow, endRow - startRow + 1);
	array.insertArrayAt(this.data_, removed, destRow);
	this.endMoveRows();
};

/**
 * @param {number} startRow
 * @param {number=} optAmount defaults to 1
 */
MockItemModel.prototype.removeRows = function(startRow, optAmount) {
	assert(this.isValidRow(startRow));
	var amount = goog.isNumber(optAmount) ? optAmount : 1;
	assert(amount > 0);
	var endRow = startRow + amount - 1;

	this.beginRemoveRows(startRow, endRow);
	array.splice(this.data_, startRow, amount);
	this.endRemoveRows();
};

MockItemModel.prototype.reset = function() {
	this.beginResetModel();
	this.data_ = MockItemModel.mockData();
	this.endResetModel();
};

/**
 * Reverse the model rows as a means of emitting layout changed signals.
 */
MockItemModel.prototype.reverseRows = function() {
	var nRows = this.rowCount();

	this.emit(AbstractItemModel.SignalType.LAYOUT_ABOUT_TO_BE_CHANGED);

	var persistentIndices = this.persistentIndexArray();

	var newData = [];
	for (var i=0; i<nRows; i++)
		newData[i] = this.data_[nRows - 1 - i];
	this.data_ = newData;

	for (var i=0; i<persistentIndices.length; i++) {
		var pIndex = persistentIndices[i];
		var column = pIndex.column();
		var oldRow = pIndex.row();
		var newRow = nRows - 1 - oldRow;
		var newIndex = this.createIndex(newRow, column);
		this.changePersistentIndex(pIndex, newIndex);
	}

	this.emit(AbstractItemModel.SignalType.LAYOUT_CHANGED);
};

/** @override */
MockItemModel.prototype.rowCount = function() {
	return this.data_.length;
};

/** @override */
MockItemModel.prototype.setData = function(index, newValue, optRole) {
	var role = goog.isDefAndNotNull(optRole) ? optRole : AbstractItemModel.DataRole.kEdit;
	if (!this.isValidIndex(index) || role !== AbstractItemModel.DataRole.kEdit)
		return false;

	var obj = this.data_[index.row()];
	switch (index.column()) {
	case 0:
		obj.id = newValue;
		break;
	case 1:
		obj.name = newValue;
		break;
	case 2:
		obj.age = newValue;
		break;

	default:
		return false;
	}

	this.emit(AbstractItemModel.SignalType.DATA_CHANGED, index);
	return true;
};

/**
 * Simply calls the base class setData method for testing that it always returns null. This does not correspond
 * to a real function in the AbstractItemModel class.
 *
 * @param {ModelIndex} index
 * @param {*} newValue
 * @param {AbstractItemModel.DataRole=} optRole defaults to kEdit
 * @return boolean
 */
MockItemModel.prototype.setDataBase = function(index, newValue, optRole) {
	return this.constructor.superClass_['setData'].call(this, index, newValue, optRole);
};




/*******************************************************************************************************************/});
