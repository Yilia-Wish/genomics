/**
 * @fileoverview ItemSelectionModel maintains an observable state of selected items and a current index.
 *   It does so using ranges to provide better memory efficiency.
 *
 *   Observes a source model for changes and appropriately updates the selection. Updates are as follows:
 *     o Layout changes: capture all indices as persistent indices and rebuild selection after layout is complete
 *     o Rows removed: simply remove any selection that was removed
 *     o Rows inserted: re-arrange the selection as necessary to accommodate the new rows; for example, if rows
 *       are inserted in the middle of a selection, then split the selection.
 *     o Rows moved: rearrange the item selection to accommodate these changes
 *     o Reset: selection is cleared, but no signal is emitted
 *
 *   No signals are emitted in response to source model changes; however, it is critical to update the
 *   item selection range to accommodate these changes.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.model.ItemSelectionModel');

goog.require('goog.asserts');
goog.require('goog.events');

goog.require('ag.core.AObject');
goog.require('ag.model.AbstractItemModel');
goog.require('ag.model.ItemSelection');
goog.require('ag.model.ModelConstants');

/**
 * @constructor
 * @param {ag.model.AbstractItemModel=} optSourceModel
 * @param {ag.core.AObject=} optParent defaults to null
 * @extends {ag.core.AObject}
 */
ag.model.ItemSelectionModel = function(optSourceModel, optParent) {
	goog.base(this, optParent);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.model.ModelIndex}
	 * @private
	 */
	this.currentIndex_ = new ag.model.ModelIndex();

	/**
	 * @type {ag.model.ItemSelection}
	 * @private
	 */
	this.itemSelection_ = new ag.model.ItemSelection();

	/**
	 * Used to retain the current selection between the source model's LayoutAboutToBeChanged and LayoutChanged
	 * states.
	 *
	 * @type {Array.<ag.model.PersistentModelIndex>}
	 * @private
	 */
	this.persistentSourceIndices_ = null;

	/**
	 * Used to retain the current index whenever the source model's layout changes.
	 *
	 * @type {ag.model.PersistentModelIndex}
	 * @private
	 */
	this.persistentCurrentIndex_ = null;

	/**
	 * @type {ag.model.AbstractItemModel}
	 * @private
	 */
	this.sourceModel_ = null;


	// --------------------------------------------------------------------------------------------------------------------
	// Initialization
	if (goog.isDefAndNotNull(optSourceModel)) {
		goog.asserts.assert(optSourceModel instanceof ag.model.AbstractItemModel);
		this.sourceModel_ = optSourceModel;
		this.attachSourceModelSignals_();
	}
};
goog.inherits(ag.model.ItemSelectionModel, ag.core.AObject);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var events = goog.events;

var AbstractItemModel = ag.model.AbstractItemModel;
var ItemSelection = ag.model.ItemSelection;
var ItemSelectionModel = ag.model.ItemSelectionModel;
var ModelIndex = ag.model.ModelIndex;
var ModelIndexArray = ag.model.ModelIndexArray;
var PersistentModelIndex = ag.model.PersistentModelIndex;

var SelectionFlag = ag.model.ModelConstants.SelectionFlag;

// --------------------------------------------------------------------------------------------------------------------
// Static properties
/** @enum {string} */
ItemSelectionModel.SignalType = {
	CURRENT_CHANGED: events.getUniqueId('current-changed'),
	CURRENT_COLUMN_CHANGED: events.getUniqueId('current-column-changed'),
	CURRENT_ROW_CHANGED: events.getUniqueId('current-row-changed'),
	SELECTION_CHANGED: events.getUniqueId('selection-changed'),
	SELECTION_LAYOUT_ABOUT_TO_BE_CHANGED: events.getUniqueId('selection-layout-about-to-change'),
	SELECTION_LAYOUT_CHANGED: events.getUniqueId('selection-layout-changed')
};

var SignalType = ItemSelectionModel.SignalType;


// --------------------------------------------------------------------------------------------------------------------
// Destructor
/** @override */
ItemSelectionModel.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	this.detachSourceModelSignals_();

	this.currentIndex_ = null;
	this.itemSelection_ = null;
	this.sourceModel_ = null;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {ModelIndex} */
ItemSelectionModel.prototype.currentIndex = function() {
	return this.currentIndex_;
};

/**
 * Useful for operating with the entire selection space (e.g. select all, invert all, deselect all, etc.)
 *
 * @return {ItemSelection}
 */
ItemSelectionModel.prototype.entireSelectionSpace = function() {
	if (this.sourceModel_) {
		var topLeft = this.sourceModel_.index(0, 0);
		var nRows = this.sourceModel_.rowCount();
		var nCols = this.sourceModel_.columnCount();
		var bottomRight = this.sourceModel_.index(nRows - 1, nCols - 1);
		return new ItemSelection(topLeft, bottomRight);
	}

	return new ItemSelection();
};

/** @return {boolean} */
ItemSelectionModel.prototype.hasSelection = function() {
	return !this.itemSelection_.isEmpty();
};

/**
 * @param {number} column
 * @return {boolean}
 */
ItemSelectionModel.prototype.isColumnSelected = function(column) {
	var rowRanges = this.itemSelection_.rowRanges(column);
	if (rowRanges.length !== 1)
		return false;

	var range = rowRanges[0];
	return range.top() === 0 && range.bottom() === this.sourceModel_.rowCount() - 1;
};

/**
 * @param {number} row
 * @return {boolean}
 */
ItemSelectionModel.prototype.isRowSelected = function(row) {
	var columnRanges = this.itemSelection_.columnRanges(row);
	if (columnRanges.length !== 1)
		return false;

	var range = columnRanges[0];
	return range.left() === 0 && range.right() === this.sourceModel_.columnCount() - 1;
};

/**
 * @param {ModelIndex} index
 * @return {boolean}
 */
ItemSelectionModel.prototype.isSelected = function(index) {
	return this.itemSelection_.contains(index);
};

/**
 * Returns the indices for those columns in optRow that are completely selected for all rows. The actual row does not
 * influence the result in terms of column values; however, it does provide
 *
 * @param {number=} optRow defaults to 0
 * @return {ModelIndexArray}
 */
ItemSelectionModel.prototype.selectedColumns = function(optRow) {
	if (!this.sourceModel_)
		return [];

	var row = goog.isNumber(optRow) ? optRow : 0;
	var result = [];
	for (var i=0, z=this.sourceModel_.columnCount(); i<z; i++)
		if (this.isColumnSelected(i))
			result.push(this.sourceModel_.index(row, i));
	return result;
};

/** @return {ModelIndexArray} */
ItemSelectionModel.prototype.selectedIndices = function() {
	return this.itemSelection_.indices();
};

/**
 * @param {number=} optColumn defaults to 0
 * @return {ModelIndexArray}
 */
ItemSelectionModel.prototype.selectedRows = function(optColumn) {
	if (!this.sourceModel_)
		return [];

	var column = goog.isNumber(optColumn) ? optColumn : 0;
	var result = [];
	for (var i=0, z=this.sourceModel_.rowCount(); i<z; i++)
		if (this.isRowSelected(i))
			result.push(this.sourceModel_.index(i, column));
	return result;
};

/** @return {ItemSelection} */
ItemSelectionModel.prototype.selection = function() {
	return this.itemSelection_;
};

/** @return {AbstractItemModel} */
ItemSelectionModel.prototype.sourceModel = function() {
	return this.sourceModel_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public slots
/**
 * Clears the current index and the entire selection.
 */
ItemSelectionModel.prototype.clear = function() {
	this.setCurrentIndex(new ModelIndex(), SelectionFlag.NoChange);
	this.clearSelection();
};

/**
 * Clears the selection in the selection model
 */
ItemSelectionModel.prototype.clearSelection = function() {
	if (this.itemSelection_.isEmpty())
		return;

	var deselected = this.itemSelection_;
	this.itemSelection_ = new ItemSelection();
	this.emitSelectionChanged(this.itemSelection_, deselected);
};

/**
 * @param {ModelIndex} index
 * @param {SelectionFlag} command
 */
ItemSelectionModel.prototype.selectIndex = function(index, command) {
	this.selectSelection(new ItemSelection(index), command)
};

/**
 * Performs command with selection against the existing selection in this model. Even though command is a bit
 * mask and thus may contain multiple instrutions, not all combinations are supported. The commands may be
 * logically grouped into three independent sets, and one instruction per group may arbitrarily combined to
 * achieve a certain effect. If more than one instruction from a single group is provided, precedence is given
 * to the first matching instruction in the group as listed below:
 *
 * Group 1:
 *   o Clear: Clears any existing selection regardless of the input selection
 *
 * Group 2:
 *   o Current: Include the current index
 *   o Columns: Expand to all columns
 *   o Rows: Expand to all rows
 *
 * Group 3 (takes into account a potentially expanded selection from group 2):
 *   o Select: Select all items in selection
 *   o Deselect: Deselect all items in selection
 *   o Toggle: Inverts all items in selection
 *   o NoChange: Do nothing (default)
 *
 * Potential combinations that are not logical (excluding those from within the same group):
 *   o Clear | Deselect ~ equivalent to merely clearing
 *   o Clear | Toggle ~ equivalent to Clear | Select
 *   o Clear | Select the same index
 *
 * In debug mode, an assertion will be thrown if any two instructions from the same group are provided.
 *
 * @param {ItemSelection} selection
 * @param {SelectionFlag} command
 */
ItemSelectionModel.prototype.selectSelection = function(selection, command) {
	assert(selection.isEmpty() || selection.model() === this.sourceModel_);

	var deltaSelected = new ItemSelection();
	var deltaDeselected = new ItemSelection();

	// --------------------------
	// Process the Clear grouping
	var cleared = false;
	if ((command & SelectionFlag.Clear) != 0) {
		cleared = true;
		deltaDeselected = this.itemSelection_;
		this.itemSelection_ = new ItemSelection();
	}

	// --------------------------
	// Depending on the command, the effective selection to work with may very well be
	// different than what the user passed in (see Group 2 instructions in above documentation).
	var effectiveSelection = selection.clone();
	this.adjustEffectiveSelection_(effectiveSelection, command);

	// Special shortcut. Cannot simply return if the selection parameter is empty becuase it is
	// possible that the command supplied will produce a non-empty effective selection. For
	// example, this can occur when the SelectionFlag.Current is supplied with an empty selection.
	if (effectiveSelection.isEmpty() && deltaDeselected.isEmpty())
		return;

	// --------------------------
	// Process Select, Deselect, and Toggle as invididual items in that order
	var mergeCommand = SelectionFlag.NoChange;
	if ((command & SelectionFlag.Select) != 0) {
		// Confirm that this is the only flag set for this group
		assert((command & SelectionFlag.Deselect) === 0);
		assert((command & SelectionFlag.Toggle) === 0);

		mergeCommand = SelectionFlag.Select;

		// Select and toggle are the two cases when it is possible to clear an index and then
		// reselect it later. To avoid sending out multiple signals that essentially nullify
		// the results, calculate those indices that would be re-selected and ignore them.
		if (cleared) {
			this.itemSelection_ = deltaDeselected.intersection(effectiveSelection);
			//                    ^^^^^^^^^^^^^^^ equal to the original item selection; the above
			// operation identifies the re-selection or the selection that was cleared and then
			// re-selected by this operation. In essence, a no-op.
			deltaDeselected.merge(this.itemSelection_, SelectionFlag.Deselect);
		}

		deltaSelected = effectiveSelection.difference(this.itemSelection_);
	}
	else if ((command & SelectionFlag.Deselect) != 0) {
		// Confirm that this is the only flag set for this group
		assert((command & SelectionFlag.Toggle) === 0);

		mergeCommand = SelectionFlag.Deselect;
		if (!cleared)
			deltaDeselected = this.itemSelection_.intersection(effectiveSelection);
	}
	else if ((command & SelectionFlag.Toggle) != 0) {
		mergeCommand = SelectionFlag.Toggle;
		if (cleared) {
			// In this event, this becomes the same operation as a Clear | Select because after
			// clearing, there are no selected items to be toggled "off" or deselected.
			mergeCommand = SelectionFlag.Select;

			this.itemSelection_ = deltaDeselected.intersection(effectiveSelection);
			//                    ^^^^^^^^^^^^^^^ equal to the original item selection; the above
			// operation identifies the re-selection or the selection that was cleared and then
			// re-selected by this operation. In essence, a no-op.
			deltaDeselected.merge(this.itemSelection_, SelectionFlag.Deselect);
		}
		else {
			deltaDeselected = this.itemSelection_.intersection(effectiveSelection);
		}
		deltaSelected = effectiveSelection.difference(this.itemSelection_);
	}

	this.itemSelection_.merge(effectiveSelection, mergeCommand);
	this.emitSelectionChanged(deltaSelected, deltaDeselected);
};

/**
 * @param {ModelIndex} index
 * @param {SelectionFlag=} optCommand defaults to NoChange
 */
ItemSelectionModel.prototype.setCurrentIndex = function(index, optCommand) {
	assert(!index.isValid() || index.model() === this.sourceModel_);
	var command = goog.isNumber(optCommand) ? optCommand : SelectionFlag.NoChange;
	this.updateCurrentIndex_(index);
	this.selectIndex(index, command);
};


// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/**
 * It is important to note that selected does not represent the entire selection as a whole after an operation has
 * completed. Rather, it should reflect the items that have just been added to the previously selected items. The same
 * applies to deselected.
 *
 * @param {ItemSelection} selected
 * @param {ItemSelection} deselected
 * @protected
 */
ItemSelectionModel.prototype.emitSelectionChanged = function(selected, deselected) {
	if (selected.isEmpty() && deselected.isEmpty())
		return;

	this.emit(SignalType.SELECTION_CHANGED, selected, deselected);
};


// --------------------------------------------------------------------------------------------------------------------
// Private funtions
/**
 * Tweaks effective selection for the following (mutually exclusive) commands:
 *
 * Current: add the current index
 * Columns: expand the selection to span all model columns
 * Rows: expand the selection to span all model rows
 *
 * @param {ItemSelection} effectiveSelection
 * @param {SelectionFlag} command
 */
ItemSelectionModel.prototype.adjustEffectiveSelection_ = function(effectiveSelection, command) {
	// Process Current, Rows, Columns as individual items in that order
	if ((command & SelectionFlag.Current) != 0) {
		// Confirm that Rows or Columns is not set
		assert((command & SelectionFlag.Rows) === 0);
		assert((command & SelectionFlag.Columns) === 0);

		effectiveSelection.select(this.currentIndex_);
	}
	else if ((command & SelectionFlag.Columns) != 0) {
		// Confirm that Row and Columns is not set
		assert((command & SelectionFlag.Rows) === 0);

		effectiveSelection.extendToSpanRows();
	}
	else if ((command & SelectionFlag.Rows) != 0) {
		effectiveSelection.extendToSpanColumns();
	}
};

/**
 * @private
 */
ItemSelectionModel.prototype.attachSourceModelSignals_ = function() {
	var model = this.sourceModel_;
	if (!model)
		return;

	this.connect(model, AbstractItemModel.SignalType.LAYOUT_ABOUT_TO_BE_CHANGED, this.onSourceLayoutAboutToBeChanged_);
	this.connect(model, AbstractItemModel.SignalType.LAYOUT_CHANGED, this.onSourceLayoutChanged_);
	this.connect(model, AbstractItemModel.SignalType.MODEL_RESET, this.onSourceModelReset_);
	this.connect(model, AbstractItemModel.SignalType.ROWS_INSERTED, this.onSourceRowsInserted_);
	this.connect(model, AbstractItemModel.SignalType.ROWS_MOVED, this.onSourceRowsMoved_);
	this.connect(model, AbstractItemModel.SignalType.ROWS_REMOVED, this.onSourceRowsRemoved_);
};

/**
 * @private
 */
ItemSelectionModel.prototype.detachSourceModelSignals_ = function() {
	var model = this.sourceModel_;
	if (!model)
		return;

	this.disconnect(model, AbstractItemModel.SignalType.LAYOUT_ABOUT_TO_BE_CHANGED, this.onSourceLayoutAboutToBeChanged_);
	this.disconnect(model, AbstractItemModel.SignalType.LAYOUT_CHANGED, this.onSourceLayoutChanged_);
	this.disconnect(model, AbstractItemModel.SignalType.MODEL_RESET, this.onSourceModelReset_);
	this.disconnect(model, AbstractItemModel.SignalType.ROWS_INSERTED, this.onSourceRowsInserted_);
	this.disconnect(model, AbstractItemModel.SignalType.ROWS_MOVED, this.onSourceRowsMoved_);
	this.disconnect(model, AbstractItemModel.SignalType.ROWS_REMOVED, this.onSourceRowsRemoved_);
};

/**
 * @param {ModelIndex} newCurrentIndex
 * @private
 */
ItemSelectionModel.prototype.updateCurrentIndex_ = function(newCurrentIndex) {
	if (this.currentIndex_.eq(newCurrentIndex))
		return;

	var previousIndex = this.currentIndex_;
	this.currentIndex_ = newCurrentIndex;
	this.emit(SignalType.CURRENT_CHANGED, newCurrentIndex, previousIndex);
	if (previousIndex.row() != newCurrentIndex.row())
		this.emit(SignalType.CURRENT_ROW_CHANGED, newCurrentIndex, previousIndex);
	if (previousIndex.column() != newCurrentIndex.column())
		this.emit(SignalType.CURRENT_COLUMN_CHANGED, newCurrentIndex, previousIndex);
};


// --------------------------------------------------------------------------------------------------------------------
// Private slots
/**
 * @private
 */
ItemSelectionModel.prototype.onSourceLayoutAboutToBeChanged_ = function() {
	this.emit(SignalType.SELECTION_LAYOUT_ABOUT_TO_BE_CHANGED);

	var sourceModel = this.sourceModel_;

	assert(goog.isNull(this.persistentSourceIndices_));
	this.persistentSourceIndices_ = [];
	var selectionIndices = this.itemSelection_.indices();
	for (var i=0, z=selectionIndices.length; i<z; i++) {
		var index = selectionIndices[i];
		this.persistentSourceIndices_.push(new PersistentModelIndex(index));
	}

	if (this.currentIndex_.isValid())
		this.persistentCurrentIndex_ = new PersistentModelIndex(this.currentIndex_);
};

/**
 * @private
 */
ItemSelectionModel.prototype.onSourceLayoutChanged_ = function() {
	assert(goog.isArray(this.persistentSourceIndices_));
	assert(this.persistentSourceIndices_.length === this.itemSelection_.area());

	// Update the selection
	this.itemSelection_ = new ItemSelection();
	for (var i=0, z=this.persistentSourceIndices_.length; i<z; i++) {
		var pIndex = this.persistentSourceIndices_[i];
		this.itemSelection_.select(pIndex);
		pIndex.invalidate();
	}

	this.persistentSourceIndices_ = null;

	// Finally update the current index as necessary
	if (this.persistentCurrentIndex_) {
		this.currentIndex_ = this.sourceModel_.index(this.persistentCurrentIndex_.row(), this.persistentCurrentIndex_.column());
		this.persistentCurrentIndex_.invalidate();
		this.persistentCurrentIndex_ = null;
	}
	else {
		this.currentIndex_ = new ModelIndex();
	}

	// Free up any memory utilized by persistent indices
	this.sourceModel_.clearInvalidPersistentIndices();

	this.emit(SignalType.SELECTION_LAYOUT_CHANGED);
};

/**
 * @private
 */
ItemSelectionModel.prototype.onSourceModelReset_ = function() {
	this.itemSelection_ = new ItemSelection();
	this.currentIndex_ = new ModelIndex();
};

/**
 * @param {number} startRow
 * @param {number} endRow
 * @private
 */
ItemSelectionModel.prototype.onSourceRowsInserted_ = function(startRow, endRow) {
	// Update the selection
	this.itemSelection_.insertRowSpacing(startRow, endRow - startRow + 1);

	// Keep any current index in sync as much as possible
	var currentIndex = this.currentIndex_;
	if (!currentIndex.isValid())
		return;

	var row = currentIndex.row();
	if (row < startRow)
		return;

	var nRowsInserted = endRow - startRow + 1;
	this.currentIndex_ = this.sourceModel_.index(row + nRowsInserted, currentIndex.column());
};

/**
 * The actual selection does not change proxy rows will never change, but the mapping needs to be updated so that the proxy rows properly reference
 * the moved source rows.
 *
 * @param {number} startRow
 * @param {number} endRow
 * @param {number} destRow
 * @private
 */
ItemSelectionModel.prototype.onSourceRowsMoved_ = function(startRow, endRow, destRow) {
	// Update the selection
	this.itemSelection_.moveRows(startRow, endRow, destRow);

	// Keep any current index in sync as much as possible
	var currentIndex = this.currentIndex_;
	if (!currentIndex.isValid())
		return;

	var row = currentIndex.row();
	var newRow = AbstractItemModel.rowNumberAfterMove(row, startRow, endRow, destRow);
	if (row === newRow)
		return;

	this.currentIndex_ = this.sourceModel_.index(newRow, currentIndex.column());
};

/**
 * @param {number} startRow
 * @param {number} endRow
 * @private
 */
ItemSelectionModel.prototype.onSourceRowsRemoved_ = function(startRow, endRow) {
	// Update the selection
	this.itemSelection_.removeRows(startRow, endRow - startRow + 1);

	// Keep any current index in sync as much as possible
	var currentIndex = this.currentIndex_;
	if (!currentIndex.isValid())
		return;

	var row = currentIndex.row();
	if (row < startRow)
		return;

	if (row <= endRow)
		this.currentIndex_ = new ModelIndex();

	var nRowsRemoved = endRow - startRow + 1;
	this.currentIndex_ = this.sourceModel_.index(row - nRowsRemoved, currentIndex.column());
};

/*******************************************************************************************************************/});
