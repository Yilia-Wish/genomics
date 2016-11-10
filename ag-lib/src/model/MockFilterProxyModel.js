/**
 * @fileoverview MockFilterProxyModel provides a mock implementation of the SortFilterProxyModel for testing filtering.
 *   It assumes that the source model will be the MockItemModel.
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.model.MockFilterProxyModel');

goog.require('goog.asserts');

goog.require('ag.model.MockItemModel');
goog.require('ag.model.SortFilterProxyModel');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.model.SortFilterProxyModel}
 */
ag.model.MockFilterProxyModel = function() {
	goog.base(this);

	/**
	 * @type {boolean}
	 * @private
	 */
	this.filterEnabled_ = false;

	/**
	 * @type {ag.model.MockFilterProxyModel.FilterType}
	 * @private
	 */
	this.filterType_ = ag.model.MockFilterProxyModel.FilterType.kEvenRows;

	/**
	 * @type {number}
	 * @private
	 */
	this.filterAge_ = 0;
};
goog.inherits(ag.model.MockFilterProxyModel, ag.model.SortFilterProxyModel);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var MockFilterProxyModel = ag.model.MockFilterProxyModel;
var MockItemModel = ag.model.MockItemModel;
var SortFilterProxyModel = ag.model.SortFilterProxyModel;

var Columns = MockItemModel.Columns;

/** @enum {number} */
MockFilterProxyModel.FilterType = {
	kEvenRows: 0,
	kAgeGt: 1
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * @param {booelan=} enabled defaults to true
 */
MockFilterProxyModel.prototype.setFilterEnabled = function(optEnabled) {
	var enabled = goog.isDefAndNotNull(optEnabled) && goog.isBoolean(optEnabled) ? optEnabled : true;
	if (enabled === this.filterEnabled_)
		return;
	
	this.filterEnabled_ = enabled;

	this.invalidateFilter();
};

/**
 * @param {MockFilterProxyModel.FilterType} filterType
 * @param {number=} optFilterAge
 */
MockFilterProxyModel.prototype.setFilterType = function(filterType, optFilterAge) {
	if (this.filterType_ !== filterType || 
		(this.filterType_ === MockFilterProxyModel.FilterType.kAgeGt && this.filterAge_ !== optFilterAge)) {

		this.filterType_ = filterType;
		if (this.filterType_ === MockFilterProxyModel.FilterType.kAgeGt)
			this.filterAge_ = optFilterAge;

		this.invalidateFilter();
	}
};


// --------------------------------------------------------------------------------------------------------------------
// Reimplemented public methods
/** @override */
MockFilterProxyModel.prototype.setSourceModel = function(newSourceModel) {
	assert(!newSourceModel || newSourceModel instanceof MockItemModel);
	goog.base(this, 'setSourceModel', newSourceModel);
};


// --------------------------------------------------------------------------------------------------------------------
// Re-implemented protected methods
/** @override */
MockFilterProxyModel.prototype.filterAcceptsRow = function(sourceRow) {
	if (!this.filterEnabled_)
		return true;

	switch (this.filterType_) {
	case MockFilterProxyModel.FilterType.kEvenRows:
		return sourceRow % 2 === 0;
	case MockFilterProxyModel.FilterType.kAgeGt:
		return this.getAgeFromRow(sourceRow) > this.filterAge_;

	default:
		return false;
	}
};


// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @param {number} sourceRow
 * @return {number}
 */
MockFilterProxyModel.prototype.getAgeFromRow = function(sourceRow) {
	assert(this.sourceModel());
	var ageIndex = this.sourceModel().index(sourceRow, Columns.AGE);
	return ageIndex.data();
};


/*******************************************************************************************************************/});
