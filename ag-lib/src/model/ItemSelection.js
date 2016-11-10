/**
 * @fileoverview ItemSelection represents a 2D non-overlapping selection for a model. It does not currently support tree
 *   selections because ModelIndex does not have a concept of parent indices.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.model.ItemSelection');

goog.require('goog.array');
goog.require('goog.asserts');

goog.require('ag.core.UnitRect');
goog.require('ag.core.UnitRectSet');
goog.require('ag.model.AbstractItemModel');		// For ModelIndex
goog.require('ag.model.ItemSelectionRange');
goog.require('ag.model.ModelConstants');

/**
 * The model is forever taken from the first valid index that is selected. All future modifications must utilize the same model
 * or the result is undefined. In debug mode, assertions will be thrown.
 *
 * @constructor
 * @param {ag.model.ModelIndex=} optTopLeft defaults to null
 * @param {ag.model.ModelIndex=} optBottomRight defaults to topLeft
 */
ag.model.ItemSelection = function(optTopLeft, optBottomRight) {
	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.model.AbstractItemModel}
	 * @private
	 */
	this.model_ = null;

	/**
	 * @type {ag.core.UnitRectSet}
	 * @private
	 */
	this.selectedArea_ = new ag.core.UnitRectSet();


	// --------------------------------------------------------------------------------------------------------------------
	// Initialization
	if (goog.isDefAndNotNull(optTopLeft))
		this.select(optTopLeft, optBottomRight);
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;

var AbstractItemModel = ag.model.AbstractItemModel;
var ItemSelection = ag.model.ItemSelection;
var ItemSelectionFlags = ag.model.ItemSelectionFlags;
var ItemSelectionRange = ag.model.ItemSelectionRange;
var ModelIndex = ag.model.ModelIndex;
var ModelIndexArray = ag.model.ModelIndexArray;
var UnitRect = ag.core.UnitRect;
var UnitRectSet = ag.core.UnitRectSet;

var SelectionFlag = ag.model.ModelConstants.SelectionFlag;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {number} */
ItemSelection.prototype.area = function() {
	return this.selectedArea_.area();
};

/** @return {ItemSelection} */
ItemSelection.prototype.clone = function() {
	var copy = new ItemSelection();
	copy.model_ = this.model_;
	copy.selectedArea_ = this.selectedArea_.clone();
	return copy;
};

/**
 * Returns an array of ItemSelectionRanges that uniquely cover those indices in optRow that are
 * in this selection.
 *
 * @param {?number} optRow defaults to zero.
 * @return {Array.<ItemSelectionRange>}
 */
ItemSelection.prototype.columnRanges = function(optRow) {
	var row = goog.isNumber(optRow) ? optRow : 0;
	var horzRangeSet = this.selectedArea_.horizontalRanges(row);
	var horzRanges = horzRangeSet.ranges();
	var itemRanges = [];
	for (var i=0, z=horzRanges.length; i<z; i++) {
		var horzRange = horzRanges[i];
		var topLeft = this.model_.index(row, horzRange.begin);
		var bottomRight = this.model_.index(row, horzRange.end);
		itemRanges.push(new ItemSelectionRange(topLeft, bottomRight));
	}
	return itemRanges;
};

/**
 * Returns all indices in optRow that are in this selection.
 *
 * @param {?number} optRow defaults to zero.
 * @return {ModelIndexArray}
 */
ItemSelection.prototype.columns = function(optRow) {
	var row = goog.isNumber(optRow) ? optRow : 0;

	var indices = [];
	var ranges = this.columnRanges(row);
	for (var i=0, z=ranges.length; i<z; i++)
		indices = indices.concat(ranges[i].indices());
	return indices;
};

/**
 * @param {ModelIndex} index
 * @return {boolean}
 */
ItemSelection.prototype.contains = function(index) {
	if (!index.isValid())
		return false;

	if (index.model() !== this.model_)
		return false;

	return this.selectedArea_.contains(index.column(), index.row());
};

/**
 * @param {ItemSelection} other
 * @return {ItemSelection}
 */
ItemSelection.prototype.difference = function(other) {
	var copy = this.clone();
	if (this.model_ === other.model_)
		copy.selectedArea_.subtract(other.selectedArea_);
	return copy;
};

/**
 * Extends all columns in the selection to span all model columns.
 */
ItemSelection.prototype.extendToSpanColumns = function() {
	if (!this.model_)
		return;

	var firstColumn = 0;
	var lastColumn = this.model_.columnCount() - 1;
	var rects = this.selectedArea_.rectangles().clone();
	for (var i=0, z=rects.length; i<z; i++) {
		var rect = rects[i];
		rect.x1 = firstColumn;
		rect.x2 = lastColumn;
	}
	this.selectedArea_ = new UnitRectSet(rects);
};

/**
 * Extends all rows in the selection to span all model rows.
 */
ItemSelection.prototype.extendToSpanRows = function() {
	if (!this.model_)
		return;

	var firstRow = 0;
	var lastRow = this.model_.rowCount() - 1;
	var rects = this.selectedArea_.rectangles().clone();
	for (var i=0, z=rects.length; i<z; i++) {
		var rect = rects[i];
		rect.y1 = firstRow;
		rect.y2 = lastRow;
	}
	this.selectedArea_ = new UnitRectSet(rects);
};

/** @return {ModelIndexArray} */
ItemSelection.prototype.indices = function() {
	var modelIndices = [];
	var rects = this.selectedArea_.rectangles();
	for (var i=0, z=rects.length; i<z; i++) {
		var rect = rects[i];
		for (var row=rect.y1; row<=rect.y2; row++)
			for (var col=rect.x1; col<=rect.x2; col++)
				modelIndices.push(this.model_.index(row, col));
	}
	return modelIndices;
};

/**
 * @param {ItemSelection} other
 * @return {ItemSelection}
 */
ItemSelection.prototype.intersection = function(other) {
	var result = new ItemSelection();
	if (this.model_ && other.model_) {
		assert(this.model_ === other.model_);

		result.model_ = this.model_;
		result.selectedArea_ = this.selectedArea_.intersection(other.selectedArea_);
	}
	return result;
};

/**
 * UNTESTED (passthrough)
 *
 * @param {number} startRow
 * @param {number=} optCount defaults to 1
 */
ItemSelection.prototype.insertRowSpacing = function(startRow, optCount) {
	var count = goog.isNumber(optCount) ? optCount : 1;

	if (goog.DEBUG && !this.isEmpty()) {
		// Check that the increased space will not make the ranges invalid with respect to the
		// model.
		var bottomMostRow = this.selectedArea_.boundingRect().bottom();
		if (startRow <= bottomMostRow)
			assert(bottomMostRow + count < this.model_.rowCount());
	}

	this.selectedArea_.insertRowSpacing(startRow, count);
};

/** @return {boolean} */
ItemSelection.prototype.isEmpty = function() {
	return this.selectedArea_.isEmpty();
};

/**
 * Only supports select, deselect, and toggle commands. Guarantees that no-overlapping ranges are present. If
 * this is empty, will take on any model being merged.
 *
 * @param {ItemSelection} other
 * @param {SelectionFlag} command
 */
ItemSelection.prototype.merge = function(other, command) {
	// Special case of merging a default constructed (empty without any model) selection
	if (!other.model_)
		return;

	if (!this.model_)
		this.model_ = other.model_;
	assert(other.model_ === this.model_);

	switch (command) {
	case SelectionFlag.Select:
		this.selectedArea_.merge(other.selectedArea_);
		break;
	case SelectionFlag.Deselect:
		this.selectedArea_.subtract(other.selectedArea_);
		break;
	case SelectionFlag.Toggle:
		this.selectedArea_.invert(other.selectedArea_);
		break;

	case SelectionFlag.NoChange:
		return;

	default:
		assert(false);
	}
};

/** @return {AbstractItemModel} */
ItemSelection.prototype.model = function() {
	return this.model_;
};

/**
 * UNTESTED (passthrough)
 *
 * @param {number} startRow
 * @param {number} endRow
 * @param {number} destRow
 */
ItemSelection.prototype.moveRows = function(startRow, endRow, destRow) {
	this.selectedArea_.moveRows(startRow, endRow, destRow);
};

/** @return {number} */
ItemSelection.prototype.numberOfRowsWithSelection = function() {
	return this.selectedArea_.verticalRanges().summedLength();
};

/** @return {Array.<ItemSelectionRange>} */
ItemSelection.prototype.ranges = function() {
	var result = [];

	var rects = this.selectedArea_.rectangles();
	for (var i=0, z=rects.length; i<z; i++) {
		var rect = rects[i];
		if (!rect.isNormal())
			rect = rect.normalized();
		var topLeft = this.model_.index(rect.y1, rect.x1);
		var bottomRight = this.model_.index(rect.y2, rect.x2);
		result.push(new ItemSelectionRange(topLeft, bottomRight));
	}

	return result;
};

/**
 * UNTESTED (passthrough)
 *
 * @param {number} startRow
 * @param {number=} optCount defaults to 1
 */
ItemSelection.prototype.removeRows = function(startRow, optCount) {
	var count = goog.isNumber(optCount) ? optCount : 1;
	this.selectedArea_.removeRows(startRow, count);
};

/**
 * Returns an array of ItemSelectionRanges that uniquely cover those indices in optColumn that are
 * in this selection.
 *
 * @param {?number} optColumn defaults to zero.
 * @return {Array.<ItemSelectionRange>}
 */
ItemSelection.prototype.rowRanges = function(optColumn) {
	var column = goog.isNumber(optColumn) ? optColumn : 0;

	var vertRangeSet = this.selectedArea_.verticalRanges(column);
	var vertRanges = vertRangeSet.ranges();
	var itemRanges = [];
	for (var i=0, z=vertRanges.length; i<z; i++) {
		var vertRange = vertRanges[i];
		assert(vertRange.isNormal());
		var topLeft = this.model_.index(vertRange.begin, column);
		var bottomRight = this.model_.index(vertRange.end, column);
		itemRanges.push(new ItemSelectionRange(topLeft, bottomRight));

	}
	return itemRanges;
};

/**
 * Returns all indices in optColumn that are in this selection.
 *
 * @param {number} [optColumn] defaults to zero.
 * @return {ModelIndexArray}
 */
ItemSelection.prototype.rows = function(optColumn) {
	var column = goog.isNumber(optColumn) ? optColumn : 0;

	var indices = [];
	var ranges = this.rowRanges(column);
	for (var i=0, z=ranges.length; i<z; i++)
		indices = indices.concat(ranges[i].indices());
	return indices;
};

/**
 * If either topLeft or bottomRight is invalid, then nothing is added to the selection and the model is not updated.
 * It may also be used with a single parameter, topLeft. If optBottomRight is supplied it may or may not reflect a
 * "normal" rectangle - either will be accepted.
 *
 * @param {ModelIndex} topLeft
 * @param {ModelIndex=} optBottomRight defaults to undefined
 */
ItemSelection.prototype.select = function(topLeft, optBottomRight) {
	if (!topLeft.isValid())
		return;

	var newSelRect = new UnitRect(topLeft.column(), topLeft.row());
	if (goog.isDefAndNotNull(optBottomRight)) {
		assert(optBottomRight instanceof ModelIndex);
		if (!optBottomRight.isValid())
			return;

		assert(optBottomRight.model() === topLeft.model());

		newSelRect.setRight(optBottomRight.column());
		newSelRect.setBottom(optBottomRight.row());
	}

	if (!this.model_)
		this.model_ = topLeft.model();
	assert(topLeft.model() === this.model_);
	this.selectedArea_.merge(newSelRect);
};

/*******************************************************************************************************************/});
