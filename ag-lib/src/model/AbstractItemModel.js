/**
 * @fileoverview AbstractItemModel provides the abstract representation of an observable, multi-dimensional dataset. It
 *   is designed similar to the Qt MVC.
 *
 *   ModelIndex represents an index to locate a piece of data associated with a model.
 *
 *   PersistentModelIndex provides persistence to a given model index even if the internal data layout
 *   changes. This is because the model will maintain an internal list of persistent indices and update them as
 *   needed. It is possible, that during a re-organization, the model index will become invalid because the item it
 *   pointed to is not longer accessible by the model (e.g. new filter condition defined).
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.model.AbstractItemModel');
goog.provide('ag.model.ModelIndex');
goog.provide('ag.model.PersistentModelIndex');

goog.require('goog.asserts');
goog.require('goog.events');
goog.require('goog.object');

goog.require('ag.core.AObject');

// --------------------------------------------------------------------------------------------------------------------
/**
 * "Friend" class of ModelIndex because only valid model indices can be generated from models and thus it needs access
 * to the private data members of ModelIndex.
 *
 * @constructor
 * @extends {ag.core.AObject}
 * @param {ag.core.AObject=} optParent defaults to null
 */
ag.model.AbstractItemModel = function(optParent) {
	goog.base(this, optParent);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {Object.<string,ag.model.PersistentModelIndex>}
	 *                ^^^^^^ = uid
	 * @private
	 */
	this.persistentModelIndices_ = {};

	// The following are used during signal emission for the following:
	// beginInsertRows(...), endInsertRows()
	// beginMoveRows(...), endMoveRows()
	// beginRemoveRows(...), endRemoveRows()
	/**
	 * @type {number}
	 * @private
	 */
	this.startRow_ = null;

	/**
	 * @type {number}
	 * @private
	 */
	this.endRow_ = null;

	/**
	 * @type {number}
	 * @private
	 */
	this.destRow_ = null;
};
goog.inherits(ag.model.AbstractItemModel, ag.core.AObject);

/**
 * Only valid indexes can be constructed from the friend class, AbstractItemModel. Slightly deviating from standard
 * document style and making the elements protected named with an underscore suffix.
 *
 * @constructor
 */
ag.model.ModelIndex = function() {
	/**
	 * @type {number}
	 * @protected
	 */
	this.row_ = -1;

	/**
	 * @type {number}
	 * @protected
	 */
	this.column_ = -1;

	/**
	 * @type {ag.model.AbstractItemModel}
	 * @protected
	 */
	this.model_ = null;

	/**
	 * Model helper data that may represent a numeric internal identifier or other Object for whatever purpose.
	 * @type {number|Object|null}
	 * @protected
	 */
	this.internalData_ = null;
};

/** @typedef {Array.<ag.model.ModelIndex>} */
ag.model.ModelIndexArray;

/**
 * To enable the model to track persistent indices, it is necessary to inform the model of which indices to track.
 * By virtue of this classes "friend" status, it can access the private methods of AbstractItemModel and in particular,
 * call persistIndex_, which tells the model to update this index whenever the internal data changes.
 *
 * Similarly, this class is a friend of AbstractItemModel, enabling it direct access to the private members here.
 * This is essential when updating the row, column, and model members when the internal model data changes.
 *
 * @constructor
 * @param {ag.model.ModelIndex} [optIndex] defaults to an invalid ModelIndex
 * @extends {ag.model.ModelIndex}
 */
ag.model.PersistentModelIndex = function(optIndex) {
	goog.base(this);

	var index = goog.isDefAndNotNull(optIndex) ? optIndex : new ag.model.ModelIndex();

	this.row_ = index.row_;
	this.column_ = index.column_;
	this.model_ = index.model_;
	this.internalData_ = index.internalData_;

	if (this.isValid()) {
		// Because this is a friend class to the AbstractItemModel class, it can access its private
		// methods.
		this.model_.persistIndex_(this);
	}
};
goog.inherits(ag.model.PersistentModelIndex, ag.model.ModelIndex);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var events = goog.events;
var object = goog.object;

var AbstractItemModel = ag.model.AbstractItemModel;
var ModelIndex = ag.model.ModelIndex;
var PersistentModelIndex = ag.model.PersistentModelIndex;

// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Class: AbstractItemModel

// --------------------------------------------------------------------------------------------------------------------
// Static properties
/** @enum {string} */
AbstractItemModel.SignalType = {
	DATA_CHANGED: events.getUniqueId('data-changed'),
	LAYOUT_ABOUT_TO_BE_CHANGED: events.getUniqueId('layout-about-to-be-changed'),
	LAYOUT_CHANGED: events.getUniqueId('layout-changed'),
	MODEL_ABOUT_TO_BE_RESET: events.getUniqueId('model-about-to-be-reset'),
	MODEL_RESET: events.getUniqueId('model-reset'),
	ROWS_ABOUT_TO_BE_INSERTED: events.getUniqueId('rows-about-to-be-inserted'),
	ROWS_ABOUT_TO_BE_MOVED: events.getUniqueId('rows-about-to-be-moved'),
	ROWS_ABOUT_TO_BE_REMOVED: events.getUniqueId('rows-about-to-be-removed'),
	ROWS_INSERTED: events.getUniqueId('rows-inserted'),
	ROWS_MOVED: events.getUniqueId('rows-moved'),
	ROWS_REMOVED: events.getUniqueId('rows-removed')
};

/** @enum {number} */
AbstractItemModel.DataRole = {
	kDisplay: 0,
	kEdit: 1
};

/** @enum {number} */
AbstractItemModel.SortOrder = {
	kAsc: 0,
	kDesc: 1
};

// --------------------------------------------------------------------------------------------------------------------
// Static methods
/**
 * Helper function for calculating the position of row x after a moving rows from startRow to endRow inclusive to
 * destRow.
 *
 * @param {number} x
 * @param {number} startRow
 * @param {number} endRow
 * @param {number} destRow
 * @return {number}
 */
AbstractItemModel.rowNumberAfterMove = function(x, startRow, endRow, destRow) {
	var nMoved = endRow - startRow + 1;
	if (x < startRow) {
		if (x >= destRow)
			return x + nMoved;
	}
	else if (x <= endRow) {
		return destRow + x - startRow;
	}
	else if (destRow + nMoved - 1 >= x) {
		return x - nMoved;
	}

	return x;
};

// --------------------------------------------------------------------------------------------------------------------
// Destructor
/**
 * Invalidates and clears all persistent indices.
 */
AbstractItemModel.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	this.invalidateAndClearPersistentIndices_();
	this.persistentModelIndices_ = null;
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * Removes all entities from the model.
 */
AbstractItemModel.prototype.clear = function() {
    if (this.rowCount() === 0)
        return;

    this.removeRows(0, this.rowCount());
};

/**
 * Utility function for removing those persistent indices that are no longer valid (e.g. invalidated externally such as
 * from a view widget).
 */
AbstractItemModel.prototype.clearInvalidPersistentIndices = function() {
	for (var uid in this.persistentModelIndices_) {
		var pIndex = this.persistentModelIndices_[uid];
		if (!pIndex.isValid())
			object.remove(this.persistentModelIndices_, uid);
	}
};

/**
 * @param {number} row
 * @param {number} column
 * @return {ModelIndex}
 */
AbstractItemModel.prototype.index = function(row, column) {
    if (this.isValidRow(row) && this.isValidColumn(column))
        return this.createIndex(row, column);

    return new ModelIndex();
};

/**
 * @param {number} column
 * @return {boolean}
 */
AbstractItemModel.prototype.isValidColumn = function(column) {
	return column >= 0 && column < this.columnCount();
};

/**
 * @param {ModelIndex} index
 * @return {boolean}
 */
AbstractItemModel.prototype.isValidIndex = function(index) {
	return index.model_ === this &&
		   this.isValidRow(index.row_) &&
		   this.isValidColumn(index.column_);
};

/**
 * @param {number} row
 * @return {boolean}
 */
AbstractItemModel.prototype.isValidInsertRow = function(row) {
	return row >= 0 && row <= this.rowCount();
};

/**
 * @param {number} row
 * @return {boolean}
 */
AbstractItemModel.prototype.isValidRow = function(row) {
	return row >= 0 && row < this.rowCount();
};


// --------------------------------------------------------------------------------------------------------------------
// Virtual public methods
/** @return {number} */
AbstractItemModel.prototype.columnCount = goog.abstractMethod;

/**
 * @param {ModelIndex} index
 * @param {AbstractItemModel.DataRole=} role defaults to kDisplay
 * @return {*}
 */
AbstractItemModel.prototype.data = goog.abstractMethod;

/**
 * @param {number} column
 * @return {?string}
 */
AbstractItemModel.prototype.headerData = function(column) {
	return null;
};

/**
 * @param {number} startRow
 * @param {number=} optCount defaults to 1
 */
AbstractItemModel.prototype.removeRows = goog.abstractMethod;

/** @return {number} */
AbstractItemModel.prototype.rowCount = goog.abstractMethod;

/**
 * This base class implementation does nothing and always returns false.
 *
 * @param {ModelIndex} index
 * @param {*} newValue
 * @param {AbstractItemModel.DataRole=} optRole defaults to kEdit
 * @return boolean
 */
AbstractItemModel.prototype.setData = function(index, newValue, optRole) {
	return false;
};

/**
 * Sorts the model on the given column in the specified order. This implementation does nothing.
 *
 * @param {number} column
 * @param {AbstractItemModel.SortOrder} sortOrder
 */
AbstractItemModel.prototype.sort = function(column, sortOrder) {};

// --------------------------------------------------------------------------------------------------------------------
// Protected, non-virtual methods
/**
 * @param {number} startRow
 * @param {number} endRow
 * @protected
 */
AbstractItemModel.prototype.beginInsertRows = function(startRow, endRow) {
	endRow = goog.isDefAndNotNull(endRow) ? endRow : startRow;

	assert(startRow >= 0);
	assert(startRow <= endRow);
	assert(startRow <= this.rowCount());
	assert(goog.isNull(this.startRow_) && goog.isNull(this.endRow_), 'AbstractItemModel.beginInsertRows_() - multiple begin/end operations not allowed');

	this.startRow_ = startRow;
	this.endRow_ = endRow;

	this.emit(AbstractItemModel.SignalType.ROWS_ABOUT_TO_BE_INSERTED, this.startRow_, this.endRow_);
};

/**
 * destRow is the final row position where the elements spanning startRow to endRow will be placed.
 *
 * @param {number} startRow
 * @param {number} endRow
 * @param {number} destRow
 * @protected
 */
AbstractItemModel.prototype.beginMoveRows = function(startRow, endRow, destRow) {
	assert(this.isValidRow(startRow));
	assert(this.isValidRow(endRow));
	assert(startRow <= endRow);
	assert(destRow >= 0);
	// Enforce a valid move
	assert(destRow != startRow && destRow + (endRow - startRow + 1) <= this.rowCount());
	assert(goog.isNull(this.startRow_) && goog.isNull(this.endRow_) && goog.isNull(this.destRow_), 'AbstractItemModel.beginMoveRows_() - multiple begin/end operations not allowed');

	this.startRow_ = startRow;
	this.endRow_ = endRow;
	this.destRow_ = destRow;

	this.emit(AbstractItemModel.SignalType.ROWS_ABOUT_TO_BE_MOVED, this.startRow_, this.endRow_, this.destRow_);
};

/**
 * @param {number} startRow
 * @param {number} endRow
 * @protected
 */
AbstractItemModel.prototype.beginRemoveRows = function(startRow, endRow) {
	endRow = goog.isDefAndNotNull(endRow) ? endRow : startRow;

	assert(startRow <= endRow);
	assert(this.isValidRow(startRow));
	assert(this.isValidRow(endRow));
	assert(goog.isNull(this.startRow_) && goog.isNull(this.endRow_), 'AbstractItemModel.beginRemoveRows_() - multiple begin/end operations not allowed');

	this.startRow_ = startRow;
	this.endRow_ = endRow;

	this.emit(AbstractItemModel.SignalType.ROWS_ABOUT_TO_BE_REMOVED, this.startRow_, this.endRow_);
};

/**
 * @protected
 */
AbstractItemModel.prototype.beginResetModel = function() {
	this.emit(AbstractItemModel.SignalType.MODEL_ABOUT_TO_BE_RESET);
};

/**
 * Replaces the persistent index fromIndex to toIndex. If fromIndex is not found, then nothing changes.
 *
 * @param {PersistentModelIndex} fromIndex
 * @param {ModelIndex} toIndex
 * @protected
 */
AbstractItemModel.prototype.changePersistentIndex = function(fromIndex, toIndex) {
	assert(fromIndex && fromIndex instanceof PersistentModelIndex);
	assert(toIndex && toIndex instanceof ModelIndex);
	assert(!toIndex.model_ || toIndex.model_ === this);

	// 1) Does fromIndex exist in our array of persisted indices?
	var fromUid = fromIndex.uid();
	assert(object.containsKey(this.persistentModelIndices_, fromUid));
	if (!object.containsKey(this.persistentModelIndices_, fromUid))
		return;

	// 2) Replace it with toIndex
	assert(this.persistentModelIndices_[fromUid.toString()] === fromIndex);
	var targetIndex = fromIndex;			// <-- Not an error; essentially making an alias to fromIndex for
											// readability purposes.
	targetIndex.row_ = toIndex.row_;
	targetIndex.column_ = toIndex.column_;
	targetIndex.model_ = toIndex.model_;

	// 3) After the update, Remove from our local store
	if (!targetIndex.isValid())
		object.remove(this.persistentModelIndices_, fromUid);
};

/**
 * Convenience method for updating an entire array of persistent indices (fromIndexArray) to toIndexArray.
 *
 * @param {Array.<PersistentModelIndex>} fromIndexArray
 * @param {Array.<ModelIndex>} toIndexArray
 * @protected
 */
AbstractItemModel.prototype.changePersistentIndexArray = function(fromIndexArray, toIndexArray) {
	assert(fromIndexArray.length === toIndexArray.length);
	for (var i=0, z=fromIndexArray.length; i<z; i++)
		this.changePersistentIndex(fromIndexArray[i], toIndexArray[i]);
};

/**
 * Cannot be static method because it must specify the model member of the index. Pure factory method
 * with no checks regarding the validity of the row and column. Those should be performed within the
 * relevant index method.
 *
 * @param {number} row
 * @param {number} column
 * @param {number|Object} [optInternalData]
 * @return {ModelIndex}
 * @protected
 */
AbstractItemModel.prototype.createIndex = function(row, column, optInternalData) {
	assert(!goog.isDefAndNotNull(optInternalData) || goog.isNumber(optInternalData) || goog.isObject(optInternalData));

	return ModelIndex.create_(row, column, this, optInternalData);
};

/**
 * Emits the final signal for an insertion.
 * @protected
 */
AbstractItemModel.prototype.endInsertRows = function() {
	assert(!goog.isNull(this.startRow_) && !goog.isNull(this.endRow_), 'AbstractItemModel.endInsertRows_() - begin/end operation not started');

	// Update the persistent indices
	var nInserted = this.endRow_ - this.startRow_ + 1;
	for (var uid in this.persistentModelIndices_) {
		var pIndex = this.persistentModelIndices_[uid];
		if (pIndex.row_ < this.startRow_)
			continue;

		pIndex.row_ += nInserted;
	}

	this.emit(AbstractItemModel.SignalType.ROWS_INSERTED, this.startRow_, this.endRow_);
	this.startRow_ = null
	this.endRow_ = null
};

/**
 * Emits the final signal for a move rows operation and updates the persistent indices as needed.
 * @protected
 */
AbstractItemModel.prototype.endMoveRows = function() {
	assert(!goog.isNull(this.startRow_) && !goog.isNull(this.endRow_) && !goog.isNull(this.destRow_), 'AbstractItemModel.endMoveRows_() - begin/end operation not started');

	// Cache the variables
	var startRow = this.startRow_;
	var endRow = this.endRow_;
	var destRow = this.destRow_;

	// Update the persistent indices
	for (var uid in this.persistentModelIndices_) {
		var pIndex = this.persistentModelIndices_[uid];
		pIndex.row_ = AbstractItemModel.rowNumberAfterMove(pIndex.row_, startRow, endRow, destRow);
	}

	this.emit(AbstractItemModel.SignalType.ROWS_MOVED, startRow, endRow, destRow);
	this.startRow_ = null
	this.endRow_ = null
	this.destRow_ = null
};

/**
 * Emits the final signal for a removal.
 * @protected
 */
AbstractItemModel.prototype.endRemoveRows = function() {
	assert(!goog.isNull(this.startRow_) && !goog.isNull(this.endRow_), 'AbstractItemModel.endRemoveRows_() - begin/end operation not started');

	// Update the persistent indices
	var nRemoved = this.endRow_ - this.startRow_ + 1;
	for (var uid in this.persistentModelIndices_) {
		var pIndex = this.persistentModelIndices_[uid];
		if (pIndex.row_ < this.startRow_)
			continue;
		else if (pIndex.row_ <= this.endRow_) {
			pIndex.invalidate();
			object.remove(this.persistentModelIndices_, uid);
			continue;
		}

		pIndex.row_ -= nRemoved;
	}

	this.emit(AbstractItemModel.SignalType.ROWS_REMOVED, this.startRow_, this.endRow_);
	this.startRow_ = null
	this.endRow_ = null
};

/**
 * @protected
 */
AbstractItemModel.prototype.endResetModel = function() {
	this.invalidateAndClearPersistentIndices_();
	this.emit(AbstractItemModel.SignalType.MODEL_RESET);
};

/**
 * @return {Array.<ModelIndex>}
 * @protected
 */
AbstractItemModel.prototype.persistentIndexArray = function() {
	return object.getValues(this.persistentModelIndices_);
};

/**
 * Resets model to its initialize state; however, the preferred approach is to use the beginResetModel / endResetModel,
 * as this properly enables models to update their state accordingly.
 *
 * @protected
 */
AbstractItemModel.prototype.reset = function() {
	this.endResetModel();
};

// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @private
 */
AbstractItemModel.prototype.invalidateAndClearPersistentIndices_ = function() {
	for (var uid in this.persistentModelIndices_)
		this.persistentModelIndices_[uid].invalidate();

	object.clear(this.persistentModelIndices_);
};

/**
 * Adds index to the list of indices to persist. Does nothing if index is not valid.
 * Assertions:
 * 1) index is non-null
 * 2) index is an PersistentModelIndex
 * 3) the index model equals this class
 * 4) the index is not already persisted
 *
 * @param {PersistentModelIndex} index
 */
AbstractItemModel.prototype.persistIndex_ = function(index) {
	assert(index);
	assert(index instanceof PersistentModelIndex);
	assert(index.model_ === this);
	if (!index.isValid())
		return;

	var uid = index.uid();
	assert(!object.containsKey(this.persistentModelIndices_, uid));
	this.persistentModelIndices_[uid.toString()] = index;
};



// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Class: ModelIndex

// --------------------------------------------------------------------------------------------------------------------
// Operators
/**
 * @param {ModelIndex} other
 * @return {boolean}
 */
ModelIndex.prototype.eq = function(other) {
	return this.row_ === other.row_ &&
		this.column_ === other.column_ &&
		this.model_ === other.model_ &&
		this.internalData_ === other.internalData_;
};

/**
 * @param {ModelIndex} other
 * @return {boolean}
 */
ModelIndex.prototype.ne = function(other) {
	return !this.eq(other);
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @return {number} */
ModelIndex.prototype.column = function() {
	return this.column_;
};

/**
 * @param {AbstractItemModel.DataRole} [optRole] defaults to kDisplay
 * @return {*}
 */
ModelIndex.prototype.data = function(optRole) {
	if (!this.model_)
		return null;

	var role = !goog.isDefAndNotNull(optRole) ? AbstractItemModel.DataRole.kDisplay : optRole;
	return this.model_.data(this, role);
};

/**
 * @param {number} column
 * @param {AbstractItemModel.DataRole} [optRole] defaults to kDisplay
 * @return {*}
 */
ModelIndex.prototype.dataForColumn = function(column, optRole) {
	var index = (this.column_ === column) ? this : this.sibling(column);
	return index.data(optRole);
};

/** @return {number|Object|undefined} */
ModelIndex.prototype.internalData = function() {
	return this.internalData_;
};

/** @return {boolean} */
ModelIndex.prototype.isValid = function() {
	return goog.isDefAndNotNull(this.model_) &&
		this.row_ >= 0 &&
		this.column_ >= 0;
};

/** @return {AbstractItemModel} */
ModelIndex.prototype.model = function() {
	return this.model_;
};

/** @return {number} */
ModelIndex.prototype.row = function() {
	return this.row_;
};

/**
 * Convenience method for
 *
 * @param {number} otherColumn
 * @return {ModelIndex}
 */
ModelIndex.prototype.sibling = function(otherColumn) {
	if (!goog.isNumber(otherColumn) || !goog.isDefAndNotNull(this.model_))
		return new ModelIndex();

	if (otherColumn === this.column_)
		return this;

	return this.model_.index(this.row_, otherColumn);
};

// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * Intended to only be called from the AbstractItemModel class.
 *
 * @param {number} optRow defaults to -1
 * @param {number} optColumn defaults to -1
 * @param {AbstractItemModel} [optModel]
 * @param {number|Object} [optInternalData]
 * @return {ModelIndex}
 * @private
 */
ModelIndex.create_ = function(optRow, optColumn, optModel, optInternalData) {
	var row = goog.isNumber(optRow) ? optRow : -1;
	var column = goog.isNumber(optColumn) ? optColumn : -1;
	var model = goog.isDefAndNotNull(optModel) ? optModel : null;
	var internalData = goog.isNumber(optInternalData) || goog.isObject(optInternalData) ? optInternalData : null;

	assert(!model || model instanceof AbstractItemModel);

	var newIndex = new ModelIndex();
	newIndex.row_ = row;
	newIndex.column_ = column;
	newIndex.model_ = model;
	newIndex.internalData_ = internalData;
	return newIndex;
};




// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Class: PersistentModelIndex


// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * Converts the index into an invalid state, which is required for proper release by the associated model.
 */
PersistentModelIndex.prototype.invalidate = function() {
	this.row_ = -1;
	this.column_ = -1;
	this.model_ = null;
	this.internalData_ = null;
};

/** @return {number} */
PersistentModelIndex.prototype.uid = function() {
	return goog.getUid(this);
};


/*******************************************************************************************************************/});
