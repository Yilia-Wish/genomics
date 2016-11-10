/**
 * @fileoverview: SortFilterProxyModel is a proxy model that enables sorting and filtering on a source model.
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.model.SortFilterProxyModel');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.object');

goog.require('ag.model.AbstractItemModel');
goog.require('ag.model.AbstractProxyModel');
goog.require('ag.model.ModelIndex');
goog.require('ag.util');

// --------------------------------------------------------------------------------------------------------------------
/**
 * Filtering always should reset the model. Sorting alone just causes a layout change. Filtering is always active;
 * however, sorting requires that dynamicSort_ being enabled.
 *
 * TODO:
 * o sortRole
 * o column filtering
 *
 * @constructor
 * @extends {ag.model.AbstractProxyModel}
 * @param {ag.core.AObject=} optParent defaults to null
 */
ag.model.SortFilterProxyModel = function(optParent) {
	goog.base(this, optParent);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * Controls whether to dynamically sort the model immediately when the source model data changes.
	 *
	 * @type {boolean}
	 * @private
	 */
	this.dynamicSort_ = false;

	/**
	 * Used to retain the current row ordering between the source model's LayoutAboutToBeChanged and LayoutChanged
	 * states.
	 *
	 * @type {Array.<ag.model.PersistentModelIndex>}
	 * @private
	 */
	this.persistentSourceIndices_ = null;

	/**
	 * Maps proxy rows to source rows
	 *
	 * @type {Array.<number>}
	 * @private
	 */
	this.proxyToSource_ = [];

	/**
	 * @type {number}
	 * @private
	 */
	this.sortColumn_ = 0;

	/**
	 * @type {ag.model.AbstractItemModel.SortOrder}
	 * @private
	 */
	this.sortOrder_ = ag.model.AbstractItemModel.SortOrder.kAsc;

	/**
	 * @type {ag.model.AbstractItemModel.DataRole}
	 * @private
	 */
	this.sortRole_ = ag.model.AbstractItemModel.DataRole.kDisplay;
};
goog.inherits(ag.model.SortFilterProxyModel, ag.model.AbstractProxyModel);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;
var object = goog.object;

var util = ag.util;

var AbstractItemModel = ag.model.AbstractItemModel;
var ModelIndex = ag.model.ModelIndex;
var SortFilterProxyModel = ag.model.SortFilterProxyModel;

var SignalType = AbstractItemModel.SignalType;
var DataRole = AbstractItemModel.DataRole;
var SortOrder = AbstractItemModel.SortOrder;

// --------------------------------------------------------------------------------------------------------------------
// Destructor
/** @override */
SortFilterProxyModel.prototype.disposeInternal = function() {
	this.detachSourceModelSignals_(this.sourceModel());

	// Only after detaching the signals from the source model, do we then call the parent dispose method. This
	// is because the parent dispose method will delete the source model reference.
	goog.base(this, 'disposeInternal');

	delete this.proxyToSource_;

	assert(goog.isNull(this.persistentSourceIndices_), 'SortFilterProxyModel: Unexpected persistent indices remaining');
};


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {boolean} */
SortFilterProxyModel.prototype.dynamicSortFilterEnabled = function() {
	return this.dynamicSort_;
};

/**
 * Invalidates the current sorting and filtering and resets the model to its default state:
 * o No dynamic sort
 * o Sort column becomes 0
 * o Sort order is set to ascending
 * o Sort role is display
 *
 * Note that filtering will still take effect.
 */
SortFilterProxyModel.prototype.invalidate = function() {
	this.sortColumn_ = 0;
	this.sortOrder_ = SortOrder.kAsc;
	this.sortRole_ = DataRole.kDisplay;
	this.dynamicSort_ = false;

	// Resets the model and mappping to its default state
	this.invalidateFilter();
};

/**
 * @param {boolean=} enabled defaults to true
 */
SortFilterProxyModel.prototype.setDynamicSortEnabled = function(enabled) {
	if (!goog.isDefAndNotNull(enabled))
		enabled = true;
	if (this.dynamicSort_ === enabled)
		return;

	this.dynamicSort_ = enabled;
	if (this.dynamicSort_)
		this.sort(this.sortColumn_, this.sortOrder_);
};

/**
 * Does not automatically call sort.
 *
 * @param {DataRole} role
 */
SortFilterProxyModel.prototype.setSortRole = function(newSortRole) {
	this.sortRole_ = newSortRole;
};

/** @return {number} */
SortFilterProxyModel.prototype.sortColumn = function() {
	return this.sortColumn_;
};

/** @return {SortOrder} */
SortFilterProxyModel.prototype.sortOrder = function() {
	return this.sortOrder_;
};

/** @return {DataRole} */
SortFilterProxyModel.prototype.sortRole = function() {
	return this.sortRole_;
};


// --------------------------------------------------------------------------------------------------------------------
// Reimplemented public methods
/** @override */
SortFilterProxyModel.prototype.columnCount = function() {
	return this.sourceModel() ? this.sourceModel().columnCount() : 0;
};

/** @override */
SortFilterProxyModel.prototype.index = function(row, column) {
	if (!this.isValidRow(row) || !this.isValidColumn(column))
		return new ModelIndex();

	return this.createIndex(row, column);
};

/** @override */
SortFilterProxyModel.prototype.mapFromSource = function(sourceIndex) {
	if (!sourceIndex.isValid())
		return new ModelIndex();

	assert(sourceIndex.model() === this.sourceModel());
	// OPTIMIZATION
	var proxyRow = array.indexOf(this.proxyToSource_, sourceIndex.row());
	if (proxyRow === -1)
		return new ModelIndex();

	return this.index(proxyRow, sourceIndex.column());
};

/** @override */
SortFilterProxyModel.prototype.mapToSource = function(proxyIndex) {
	if (!proxyIndex.isValid())
		return new ModelIndex();

	assert(proxyIndex.model() === this);
	var sourceRow = this.proxyToSource_[proxyIndex.row()];
	return this.sourceModel().index(sourceRow, proxyIndex.column());
};

/**
 * Returns the number of rows that have not been filtered by this model
 *
 * @override
 */
SortFilterProxyModel.prototype.rowCount = function() {
	return this.proxyToSource_.length;
};

/**
 * @param {number} column
 * @param {SortOrder=} optSortOrder defaults to ascending order
 */
SortFilterProxyModel.prototype.sort = function(column, optSortOrder) {
	if (!this.sourceModel())
		return;

	assert(this.isValidColumn(column));
	if (!goog.isDefAndNotNull(optSortOrder))
		optSortOrder = SortOrder.kAsc;

	this.sortColumn_ = column;
	this.sortOrder_ = optSortOrder;

	this.emit(AbstractItemModel.SignalType.LAYOUT_ABOUT_TO_BE_CHANGED);

	// Save the persisted source rows so that we can update the persistent indices
	var persistentIndices = this.persistentIndexArray();
	var sourceRowsToPersist = [];
	for (var i=0, z=persistentIndices.length; i<z; i++) {
		var proxyRow = persistentIndices[i].row();
		var sourceRow = this.proxyToSource_[proxyRow];
		sourceRowsToPersist.push(sourceRow);
	}

	// Perform the actual sort
	var self = this;
	var sourceModel = this.sourceModel();
	var sortColumn = this.sortColumn_;
	array.stableSort(this.proxyToSource_, function(leftSourceRow, rightSourceRow) {
		var leftSourceIndex = sourceModel.index(leftSourceRow, sortColumn);
		var rightSourceIndex = sourceModel.index(rightSourceRow, sortColumn);
		return self.compareIndices(leftSourceIndex, rightSourceIndex);
	});

	// Finally, update the persistent indices
	for (var i=0, z=sourceRowsToPersist.length; i<z; i++) {
		var sourceRow = sourceRowsToPersist[i];
		var newProxyRow = array.indexOf(this.proxyToSource_, sourceRow);
		assert(newProxyRow !== -1);

		var newIndex = this.createIndex(newProxyRow, persistentIndices[i].column());
		this.changePersistentIndex(persistentIndices[i], newIndex);
	}

	this.emit(AbstractItemModel.SignalType.LAYOUT_CHANGED);
};

// --------------------------------------------------------------------------------------------------------------------
// Virtual protected functions
/**
 * @param {ModelIndex} lhs
 * @param {ModelIndex} rhs
 * @return {number}
 * @protected
 */
SortFilterProxyModel.prototype.compareIndices = function(lhs, rhs) {
	var lhsData = lhs.data(this.sortRole_);
	var rhsData = rhs.data(this.sortRole_);

	return this.compareData_(lhsData, rhsData);
};

/**
 * By default, all rows are accepted and no filtering is performed.
 *
 * @param {number} sourceRow
 * @return {boolean}
 * @protected
 */
SortFilterProxyModel.prototype.filterAcceptsRow = function(sourceRow) {
	return true;
};

/** @override */
SortFilterProxyModel.prototype.sourceModelChanged = function(newSourceModel, oldSourceModel) {
	this.detachSourceModelSignals_(oldSourceModel);
	this.clearMapping_();
	this.sortColumn_ = 0;
	this.sortOrder_ = SortOrder.kAsc;
	if (newSourceModel) {
		this.attachSourceModelSignals_(newSourceModel);
		this.rebuildMapping_();
	}
};

// --------------------------------------------------------------------------------------------------------------------
// Protected methods
/**
 * Similar to invalidate, but does not change the sort order, column, role, or dynamic sort state. This method should
 * be called if performing custom filtering and the filter parameters have been changed.
 * @protected
 */
SortFilterProxyModel.prototype.invalidateFilter = function() {
	this.beginResetModel();
	this.clearMapping_();
	this.rebuildMapping_();
	this.endResetModel();
};

// --------------------------------------------------------------------------------------------------------------------
// Private slots
/**
 * @param {ModelIndex} index
 * @private
 */
SortFilterProxyModel.prototype.onSourceDataChanged_ = function(sourceIndex) {
	assert(sourceIndex.model() === this.sourceModel());

	var proxyIndex = this.mapFromSource(sourceIndex);
	if (!proxyIndex.isValid()) {
		// Means that no proxy row exists for this sourceIndex, but if perhaps with the data change,
		// it will be accepted in the filter?
		if (this.filterAcceptsRow(sourceIndex.row())) {
			// Indeed, it is now accepted by the filter. Insert this row into the model
			this.addSourceRowsToProxy_([sourceIndex.row()]);
		}
		return;
	}

	// Perhaps the change in data causes the row to no longer match the filter? If not, remove it and do not emit any
	// data changed signal.
	if (!this.filterAcceptsRow(sourceIndex.row())) {
		this.beginRemoveRows(proxyIndex.row());
		array.removeAt(this.proxyToSource_, proxyIndex.row());
		this.endRemoveRows();
		return;
	}

	this.emit(AbstractItemModel.SignalType.DATA_CHANGED, proxyIndex);
	if (!this.dynamicSort_)
		return;

	// Quite possible that this row should be moved if it is in the sort column.
	if (proxyIndex.column() === this.sortColumn_) {
		var destRow = this.findInsertRowForData_(sourceIndex.data(this.sortRole_));
		if (destRow === proxyIndex.row())
			return;

		// The updated source data has changed within the sort column and requires a row move to preserve the
		// current sort order.
		this.beginMoveRows(proxyIndex.row(), proxyIndex.row(), destRow);
		array.removeAt(this.proxyToSource_, proxyIndex.row());
		array.insertAt(this.proxyToSource_, sourceIndex.row(), destRow);
		this.endMoveRows();
	}
};

/**
 * @private
 */
SortFilterProxyModel.prototype.onSourceLayoutAboutToBeChanged_ = function() {
	var sourceModel = this.sourceModel();

	assert(goog.isNull(this.persistentSourceIndices_));
	this.persistentSourceIndices_ = [];
	for (var i=0, z=this.proxyToSource_.length; i<z; i++) {
		var sourceRow = this.proxyToSource_[i];
		var index = sourceModel.index(sourceRow, 0);  // Column doesn't matter since this class
													  // only maps rows at this point.
		this.persistentSourceIndices_.push(new PersistentModelIndex(index));
	}
};

/**
 * @private
 */
SortFilterProxyModel.prototype.onSourceLayoutChanged_ = function() {
	assert(goog.isArray(this.persistentSourceIndices_));
	assert(this.persistentSourceIndices_.length === this.proxyToSource_.length);

	for (var i=0, z=this.persistentSourceIndices_.length; i<z; i++) {
		var pIndex = this.persistentSourceIndices_[i];
		this.proxyToSource_[i] = pIndex.row();
		pIndex.invalidate();
	}

	this.persistentSourceIndices_ = null;
};

/**
 * @private
 */
SortFilterProxyModel.prototype.onSourceModelReset_ = function() {
	this.clearMapping_();
	this.rebuildMapping_();
	this.endResetModel();
};

/**
 * @param {number} startRow
 * @param {number} endRow
 * @private
 */
SortFilterProxyModel.prototype.onSourceRowsAboutToBeRemoved_ = function(startRow, endRow) {
	var proxyRowsToRemove = [];
	for (var i=startRow; i<= endRow; i++) {
		var proxyRow = array.indexOf(this.proxyToSource_, i);
		if (proxyRow !== -1)
			proxyRowsToRemove.push(proxyRow);
	}

	// Update the proxyToSource members to reflect the new source rows
	var nRemoved = endRow - startRow + 1;
	for (var i=0, z=this.proxyToSource_.length; i<z; i++)
		// NOTE: We do not bother updating the proxy rows that will be removed as a result. Thus
		// Only those that reference source rows greater than endRow are updated.
		if (this.proxyToSource_[i] > endRow)
			this.proxyToSource_[i] -= nRemoved;

	// Group into ranges
	var proxyRangesToRemove = util.convertIntArrayToRanges(proxyRowsToRemove);

	// Remoove the ranges in reverse order
	for (var i=proxyRangesToRemove.length-1; i>=0; i--) {
		var range = proxyRangesToRemove[i];
		this.beginRemoveRows(range.begin, range.end);
		array.splice(this.proxyToSource_, range.begin, range.length());
		this.endRemoveRows();
	}
};

/**
 * @param {number} startRow
 * @param {number} endRow
 * @private
 */
SortFilterProxyModel.prototype.onSourceRowsInserted_ = function(startRow, endRow) {
	// A. Update the existing source row mapping
	var nInserted = endRow - startRow + 1;
	for (var i=0, z=this.proxyToSource_.length; i<z; i++) {
		var sourceRow = this.proxyToSource_[i];
		if (sourceRow >= startRow)
			this.proxyToSource_[i] += nInserted;
	}

	// B. Identify compatible rows accepted by this model
	var newSourceRowsToProxy = [];
	for (var i=startRow; i<= endRow; i++) {
		if (!this.filterAcceptsRow(i))
			continue;

		newSourceRowsToProxy.push(i);
	}

	if (newSourceRowsToProxy.length)
		this.addSourceRowsToProxy_(newSourceRowsToProxy, Math.min(startRow, this.rowCount()));
};

/**
 * The proxy rows will never change, but the mapping needs to be updated so that the proxy rows properly reference
 * the moved source rows.
 *
 * @param {number} startRow
 * @param {number} endRow
 * @param {number} destRow
 * @private
 */
SortFilterProxyModel.prototype.onSourceRowsMoved_ = function(startRow, endRow, destRow) {
	for (var i=0, z=this.proxyToSource_.length; i<z; i++)
		this.proxyToSource_[i] = AbstractItemModel.rowNumberAfterMove(this.proxyToSource_[i], startRow, endRow, destRow);
};


// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * Helper function for inserting rows into the proxy model and accounting for the proper placement if dynamic sorting
 * is enabled. Primarily called from onSourceRowsInserted_ and on SourceDataChanged_.
 *
 * @param {Array.<number>} newSourceRowsToProxy
 * @param {number=} optProxyInsertRow defaults to this.rowCount()
 * @private
 */
SortFilterProxyModel.prototype.addSourceRowsToProxy_ = function(newSourceRowsToProxy, optProxyInsertRow) {
	// If this assertion fails, it means that upstream code did not properly check that there were even source rows to proxy.
	assert(newSourceRowsToProxy.length > 0, 'Only a non-empty source rows array permitted');

	// C.1 Dynamic sorting is disabled. Simply insert the new rows as close as possible to the source
	// position
	if (!this.dynamicSort_) {
		var proxyInsertRow = goog.isDefAndNotNull(optProxyInsertRow) ? optProxyInsertRow : this.rowCount();
		assert(proxyInsertRow >= 0 && proxyInsertRow <= this.rowCount());
		var proxyStartRow = proxyInsertRow;
		var proxyEndRow = proxyStartRow + newSourceRowsToProxy.length - 1;
		this.beginInsertRows(proxyStartRow, proxyEndRow);
		array.insertArrayAt(this.proxyToSource_, newSourceRowsToProxy, proxyStartRow);
		this.endInsertRows();
		return;
	}

	// C.2 Dynamic sorting is enabled. Locate insert positions for all the new rows.
	var sourceModel = this.sourceModel();

	// Safe to assume that the rows are sorted on sortColumn and sortOrder. Therefore, we can do a
	// binary search for the appropriate insertion-point.
	var proxyInsertPoints = [];
	var proxyInsertMap = {};		// {proxyInsertPoint -> [{sourceRow, sourceData}, ...]}
	for (var i=0, z=newSourceRowsToProxy.length; i<z; i++) {
		var sourceRow = newSourceRowsToProxy[i];
		var sourceData = sourceModel.index(sourceRow, this.sortColumn_).data(this.sortRole_);
		var destProxyRow = this.findInsertRowForData_(sourceData);
		if (!object.containsKey(proxyInsertMap, destProxyRow)) {
			proxyInsertPoints.push(destProxyRow);
			proxyInsertMap[destProxyRow] = [];
		}
		proxyInsertMap[destProxyRow].push({sourceRow: sourceRow, sourceData: sourceData});
	}

	array.sort(proxyInsertPoints);

	// Reverse insert into the proxyToSource internal array
	for (var i=proxyInsertPoints.length-1; i>=0; i--) {
		var destProxyRow = proxyInsertPoints[i];

		var sourceRowsToInsert = proxyInsertMap[destProxyRow];
		if (sourceRowsToInsert.length > 1) {
			// If multiple rows mapped to the same insertion point, it is vital to determine the local
			// sort of these rows.
			var self = this;
			array.sort(sourceRowsToInsert, function(lhs, rhs) {
				return self.compareData_(lhs.sourceData, rhs.sourceData);
			});
		}

		var sourceRowNumbers = [];
		for (var j=0, z=sourceRowsToInsert.length; j<z; j++)
			sourceRowNumbers.push(sourceRowsToInsert[j].sourceRow);

		// Finally, insert them into the model
		var endInsertRow = destProxyRow + sourceRowsToInsert.length - 1;
		this.beginInsertRows(destProxyRow, endInsertRow);
		array.insertArrayAt(this.proxyToSource_, sourceRowNumbers, destProxyRow);
		this.endInsertRows();
	}
};

/**
 * @param {AbstractItemModel} model
 * @private
 */
SortFilterProxyModel.prototype.attachSourceModelSignals_ = function(model) {
	assert(model);
	this.connect(model, SignalType.DATA_CHANGED, this.onSourceDataChanged_);
	this.connect(model, SignalType.LAYOUT_ABOUT_TO_BE_CHANGED, this.onSourceLayoutAboutToBeChanged_);
	this.connect(model, SignalType.LAYOUT_CHANGED, this.onSourceLayoutChanged_);
	this.connect(model, SignalType.MODEL_ABOUT_TO_BE_RESET, SignalType.MODEL_ABOUT_TO_BE_RESET);
	this.connect(model, SignalType.MODEL_RESET, this.onSourceModelReset_);
	this.connect(model, SignalType.ROWS_ABOUT_TO_BE_REMOVED, this.onSourceRowsAboutToBeRemoved_);
	this.connect(model, SignalType.ROWS_INSERTED, this.onSourceRowsInserted_);
	this.connect(model, SignalType.ROWS_MOVED, this.onSourceRowsMoved_);
};

/**
 * @private
 */
SortFilterProxyModel.prototype.clearMapping_ = function() {
	array.clear(this.proxyToSource_);
};

/**
 * By default, nulls sort to the bottom if the sort order is ascending, and vice versa. Compares the data for lhs and rhs
 * and returns -1, 0, or 1 if lhs is less than rhs, lhs is equal to rhs, or lhs is greater than rhs, respectively.
 *
 * @param {*} lhsData
 * @param {*} rhsData
 * @return {number}
 * @private
 */
SortFilterProxyModel.prototype.compareData_ = function(lhsData, rhsData) {
	// Deal with any null data first
	if (goog.isNull(lhsData))
		return this.sortOrder_ === SortOrder.kAsc ? 1 : -1;
	else if (goog.isNull(rhsData))
		return this.sortOrder_ === SortOrder.kAsc ? -1 : 1;

	// First perform the result assuming ascending order
	var result = 0;

	// Objects
	if (goog.isObject(lhsData) && lhsData.compare)
		result = lhsData.compare(rhsData);
	else if (goog.isObject(rhsData) && rhsData.compare)
		result = -rhsData.compare(lhsData);

	result = util.compareAscending(lhsData, rhsData);

	// Then reverse the result if necessary
	if (this.sortOrder_ === SortOrder.kDesc)
		result = -result;
	return result;
};

/**
 * @param {AbstractItemModel} model
 * @private
 */
SortFilterProxyModel.prototype.detachSourceModelSignals_ = function(model) {
	if (!model)
		return;

	this.disconnect(model, SignalType.DATA_CHANGED, this.onSourceDataChanged_);
	this.disconnect(model, SignalType.LAYOUT_ABOUT_TO_BE_CHANGED, this.onSourceLayoutAboutToBeChanged_);
	this.disconnect(model, SignalType.LAYOUT_CHANGED, this.onSourceLayoutChanged_);
	this.disconnect(model, SignalType.MODEL_ABOUT_TO_BE_RESET, SignalType.MODEL_ABOUT_TO_BE_RESET);
	this.disconnect(model, SignalType.MODEL_RESET, this.onSourceModelReset_);
	this.disconnect(model, SignalType.ROWS_ABOUT_TO_BE_REMOVED, this.onSourceRowsAboutToBeRemoved_);
	this.disconnect(model, SignalType.ROWS_INSERTED, this.onSourceRowsInserted_);
	this.disconnect(model, SignalType.ROWS_MOVED, this.onSourceRowsMoved_);
};

/**
 * Returns the insertion row for the given data.
 *
 * @param {*} data
 * @return {number}
 * @private
 */
SortFilterProxyModel.prototype.findInsertRowForData_ = function(data) {
	if (!this.dynamicSort_)
		return this.rowCount();

	// Assume that the array is sorted
	var compareFunc = goog.bind(this.compareDataToSourceRow_, this);
	var row = array.binarySearch(this.proxyToSource_, data, compareFunc);
	return (row >= 0) ? row : util.transformNegativeInsertionPoint(row);
};

/**
 * @param {*} data
 * @param {number} sourceRow originating from the this.proxyToSource_ member
 * @return {number}
 * @private
 */
SortFilterProxyModel.prototype.compareDataToSourceRow_ = function(data, sourceRow) {
	var sourceData = this.sourceModel().index(sourceRow, this.sortColumn_).data(this.sortRole_);
	return this.compareData_(data, sourceData);
};

/**
 * @private
 */
SortFilterProxyModel.prototype.rebuildMapping_ = function() {
	assert(this.proxyToSource_.length === 0);
	var sourceModel = this.sourceModel();
	if (!sourceModel)
		return;

	var sourceRowCount = sourceModel.rowCount();
	if (!this.dynamicSort_) {
		for (var i=0; i<sourceRowCount; i++)
			if (this.filterAcceptsRow(i))
				this.proxyToSource_.push(i);

		return;
	}

	// Otherwise, go ahead and sort the data
	var sourceIndices = [];
	for (var i=0; i<sourceRowCount; i++) {
		if (!this.filterAcceptsRow(i))
			continue;

		var sourceIndex = sourceModel.index(i, this.sortColumn_);
		if (sourceIndex.isValid())
			sourceIndices.push(sourceIndex);
	}

	// Sort the filtered data using the relevant comparison method
	var boundSortMethod = goog.bind(this.compareIndices, this);
	array.sort(sourceIndices, boundSortMethod);

	// Populate the array of proxyToSource indices
	for (var i=0, z=sourceIndices.length; i< z; i++)
		this.proxyToSource_.push(sourceIndices[i].row());
};

/*******************************************************************************************************************/});
