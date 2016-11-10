goog.provide('ag.model.ItemSelectionRange');

goog.require('goog.asserts');

goog.require('ag.core.UnitRect');
goog.require('ag.model.AbstractItemModel');

/**
 * No matter the order of arguments specifying the selection range, the internal state will always reflect a normalized
 * UnitRect. It will always refer to at least one index even if that is the invalid index itself.
 *
 * If either optTopLeft or optBottomRight is non-null but invalid, then the entire range is invalid with the model taken
 * from optTopLeft.
 *
 * @constructor
 * @param {ag.model.ModelIndex=} optTopLeft defaults to null
 * @param {ag.model.ModelIndex=} optBottomRight defaults to topLeft
 */
ag.model.ItemSelectionRange = function(optTopLeft, optBottomRight) {
	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.model.AbstractItemModel}
	 * @private
	 */
	this.model_ = null;

	/**
	 * By default, the range rectangle refers to an invalid index location of -1, -1.
	 *
	 * @type {ag.core.UnitRect}
	 * @private
	 */
	this.rect_ = new ag.core.UnitRect(-1, -1);


	// --------------------------------------------------------------------------------------------------------------------
	// Initialization
	if (goog.isDefAndNotNull(optTopLeft)) {
		goog.asserts.assert(optTopLeft instanceof ag.model.ModelIndex);

		this.model_ = optTopLeft.model();
		this.rect_.y1 = this.rect_.y2 = optTopLeft.row();
		this.rect_.x1 = this.rect_.x2 = optTopLeft.column();

		if (optTopLeft.isValid() &&
			goog.isDefAndNotNull(optBottomRight)) {
			goog.asserts.assert(optBottomRight instanceof ag.model.ModelIndex);
			goog.asserts.assert(!optBottomRight.isValid() || this.model_ === optBottomRight.model());

			if (optBottomRight.isValid()) {
				this.rect_.y2 = optBottomRight.row();
				this.rect_.x2 = optBottomRight.column();
				if (!this.rect_.isNormal())
					this.rect_ = this.rect_.normalized();
			}
			else {
				this.rect_.y1 = this.rect_.y2 = -1;
				this.rect_.x1 = this.rect_.x2 = -1;
			}
		}
	}
};


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var AbstractItemModel = ag.model.AbstractItemModel;
var ItemSelectionRange = ag.model.ItemSelectionRange;
var ModelIndex = ag.model.ModelIndex;
var ModelIndexArray = ag.model.ModelIndexArray;
var UnitRect = ag.core.UnitRect;


// --------------------------------------------------------------------------------------------------------------------
// Copy constructor
/**
 * @return {ItemSelectionRange}
 */
ItemSelectionRange.prototype.clone = function() {
	var copy = new ItemSelectionRange();
	copy.model_ = this.model_;
	copy.rect_.assign(this.rect_);
	return copy;
};


// --------------------------------------------------------------------------------------------------------------------
// Operators
/**
 * @param {ItemSelectionRange} other
 * @return {boolean}
 */
ItemSelectionRange.prototype.eq = function(other) {
	return this.model_ === other.model_ &&
		this.rect_.eq(other.rect_);
};

/**
 * A smaller range is defined as having first a smaller height and then secondly, a smaller width. These correspond to
 * the row and column range, respectively.
 *
 * @param {ItemSelectionRange} other
 * @return {boolean}
 */
ItemSelectionRange.prototype.lt = function(other) {
	return this.rect_.height() < other.rect_.height() ||
		   this.rect_.width() < other.rect_.width();
};

/**
 * @param {ItemSelectionRange} other
 * @return {boolean}
 */
ItemSelectionRange.prototype.ne = function(other) {
	return !this.eq(other);
};


// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @return {number} */
ItemSelectionRange.prototype.area = function() {
	if (this.isValid())
		return this.width() * this.height();

	return 0;
};

/** @return {number} */
ItemSelectionRange.prototype.bottom = function() {
	return this.rect_.bottom();
};

/** @return {ModelIndex} */
ItemSelectionRange.prototype.bottomRight = function() {
	if (this.model_)
		return this.model_.index(this.rect_.y2, this.rect_.x2);

	return new ModelIndex();
};

/**
 * @param {ModelIndex} index
 * @return {boolean}
 */
ItemSelectionRange.prototype.contains = function(index) {
	if (this.model_ && this.model_ === index.model())
		return this.rect_.contains(index.column(), index.row());

	return false;
};

/**
 * @param {number} row
 * @param {number} column
 * @return {boolean}
 */
ItemSelectionRange.prototype.containsSpot = function(row, column) {
	return this.rect_.contains(column, row);
};

/** @return {number} */
ItemSelectionRange.prototype.height = function() {
	return this.rect_.height();
};

/** @return {ModelIndexArray} */
ItemSelectionRange.prototype.indices = function() {
	if (!this.model_)
		return [];

	var result = [];
	for (var i=this.rect_.y1; i<=this.rect_.y2; i++)
		for (var j=this.rect_.x1; j<=this.rect_.x2; j++)
			result.push(this.model_.index(i, j));
	return result;
};

/**
 * If the model of this instance is not the same model as other, then the returned result will be an invalid range
 * with the model of this instance.
 *
 * @param {ItemSelectionRange} other
 * @return {ItemSelectionRange}
 */
ItemSelectionRange.prototype.intersection = function(other) {
	var result = this.clone();
	result.rect_ = (this.model_ === other.model_) ? this.rect_.intersection(other.rect_) : null;
	if (!result.rect_)
		result.rect_ = new UnitRect(-1, -1);
	return result;
};

/**
 * @param {ItemSelectionRange} other
 * @return {boolean}
 */
ItemSelectionRange.prototype.intersects = function(other) {
	return this.model_ === other.model_ && this.rect_.intersects(other.rect_);
};

/**
 * True if the specified range contains no selectable item.
 *
 * @return {boolean}
 */
// ItemSelectionRange.prototype.isEmpty = function() {

// };

/**
 * True if the range corresponds to a valid range within the model.
 *
 * @return {boolean}
 */
ItemSelectionRange.prototype.isValid = function() {
	if (this.model_) {
		var topLeftValid = this.model_.isValidRow(this.rect_.y1) && this.model_.isValidColumn(this.rect_.x1);
		var bottomRightValid = this.model_.isValidRow(this.rect_.y2) && this.model_.isValidColumn(this.rect_.x2);
		return topLeftValid && bottomRightValid;
	}

	return false;
};

/** @return {number} */
ItemSelectionRange.prototype.left = function() {
	return this.rect_.x1;
};

/** @return {AbstractItemModel} */
ItemSelectionRange.prototype.model = function() {
	return this.model_;
};

/** @return {number} */
ItemSelectionRange.prototype.right = function() {
	return this.rect_.x2;
};

/** @return {number} */
ItemSelectionRange.prototype.top = function() {
	return this.rect_.y1;
};

/** @return {ModelIndex} */
ItemSelectionRange.prototype.topLeft = function() {
	if (this.model_)
		return this.model_.index(this.rect_.y1, this.rect_.x1);

	return new ModelIndex();
};

/** @return {number} */
ItemSelectionRange.prototype.width = function() {
	return this.rect_.width();
};


/*******************************************************************************************************************/});
