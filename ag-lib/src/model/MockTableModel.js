goog.provide('ag.model.MockTableModel');

goog.require('ag.model.AbstractTableModel');
goog.require('ag.core.MockEntity');
goog.require('ag.validation');

ag.model.MockTableModel = function(optParent) {
	goog.base(this, optParent);
};
goog.inherits(ag.model.MockTableModel, ag.model.AbstractTableModel);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var AbstractItemModel = ag.model.AbstractItemModel;
var AbstractTableModel = ag.model.AbstractTableModel;
var MockTableModel = ag.model.MockTableModel;
var ruleType = ag.validation.ruleType;

var DataRole = AbstractItemModel.DataRole;

// Static defines
/** @enum {number} */
MockTableModel.Column = {
	ID: 0,
	NAME: 1,
	AGE: 2,

	_TOTAL: 3
}

/** @enum {string} */
MockTableModel.ErrorStrings = {
	REQUIRED: 'This field is required.',
	INTEGER: 'Value must be an integer.',
	AGE_GTE_0: 'Age must be greater than or equal to 0.'
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
MockTableModel.prototype.columnCount = function() {
	return MockTableModel.Column._TOTAL;
};

MockTableModel.prototype.headerData = function(column) {
	switch (column) {
	case MockTableModel.Column.ID:
		return 'Id';
	case MockTableModel.Column.NAME:
		return 'Name';
	case MockTableModel.Column.AGE:
		return 'Age';

	default:
		return null;
	}
};

// --------------------------------------------------------------------------------------------------------------------
// Protected virtual methods
MockTableModel.prototype.data_ = function(entity, column, role) {
	if (role === DataRole.kDisplay)
		return this.displayData_(entity, column);

	return this.editData_(entity, column);
};

MockTableModel.prototype.setData_ = function(entity, column, newValue) {
	switch (column) {
	case MockTableModel.Column.ID:
		return false;
	case MockTableModel.Column.NAME:
		entity.name = newValue;
		break;
	case MockTableModel.Column.AGE:
		entity.age = newValue;
		break;

	default:
		return false;
	}

	return true;
};

// --------------------------------------------------------------------------------------------------------------------
// Protected methods
MockTableModel.prototype.validationRules_ = function() {
	var rules = {};
	rules[MockTableModel.Column.NAME] = {
		rule: ruleType.CONTAINS_NON_WHITESPACE,
		message: MockTableModel.ErrorStrings.REQUIRED
	};

	rules[MockTableModel.Column.AGE] = [
		{
			rule: ruleType.CONTAINS_NON_WHITESPACE,
			message: MockTableModel.ErrorStrings.REQUIRED
		},
		{
			rule: ruleType.INTEGER_STRICT,
			message: MockTableModel.ErrorStrings.INTEGER
		},
		{
			rule: [ruleType.NUMERIC_COMPARE, '>=', 0],
			message: MockTableModel.ErrorStrings.AGE_GTE_0
		}
	];

	return rules;
};

// --------------------------------------------------------------------------------------------------------------------
// Private methods
MockTableModel.prototype.displayData_ = function(entity, column) {
	switch (column) {
	case 0:
		return entity.id;
	case 1:
		return entity.name;
	case 2:
		return entity.age;

	default:
		return null;
	}
};

MockTableModel.prototype.editData_ = function(entity, column) {
	switch (column) {
	case 0:
		return 'edit-' + entity.id;
	case 1:
		return 'edit-' + entity.name;
	case 2:
		return 'edit-' + entity.age;

	default:
		return null;
	}
};

/*******************************************************************************************************************/});