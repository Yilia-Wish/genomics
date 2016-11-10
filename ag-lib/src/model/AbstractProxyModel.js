/**
 * @fileoverview: AbstractProxyModel defines the basic structure necessary for building proxy models to
 *   AbstractItemModel.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.model.AbstractProxyModel');

goog.require('ag.core.AObject');
goog.require('ag.model.AbstractItemModel');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.model.AbstractItemModel}
 * @param {ag.core.AObject=} optParent defaults to null
 */
ag.model.AbstractProxyModel = function(optParent) {
	goog.base(this, optParent);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.model.AbstractProxyModel}
	 * @private
	 */
	this.sourceModel_ = null;
};
goog.inherits(ag.model.AbstractProxyModel, ag.model.AbstractItemModel);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var AbstractItemModel = ag.model.AbstractProxyModel;
var AbstractProxyModel = ag.model.AbstractProxyModel;
var ModelIndex = ag.model.ModelIndex;

// --------------------------------------------------------------------------------------------------------------------
// Destructor
AbstractProxyModel.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	delete this.sourceModel_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public, non-virtual methods
/**
 * Sets the source model to proxy to newSourceModel.
 *
 * @param {AbstractItemModel} newSourceModel
 */
AbstractProxyModel.prototype.setSourceModel = function(newSourceModel) {
	if (newSourceModel === this.sourceModel_)
		return;

	this.beginResetModel();
	var oldSourceModel = this.sourceModel_;
	this.sourceModel_ = newSourceModel;
	// Call the virtual slot
	this.sourceModelChanged(newSourceModel, oldSourceModel);
	this.endResetModel();
};

/** @return {AbstractItemModel} */
AbstractProxyModel.prototype.sourceModel = function() {
	return this.sourceModel_;
};


// --------------------------------------------------------------------------------------------------------------------
// Public virtual methods
/**
 * @param {ModelIndex} sourceIndex
 * @return {ModelIndex}
 */
AbstractProxyModel.prototype.mapFromSource = goog.abstractMethod;

/**
 * @param {ModelIndex} proxyIndex
 * @return {ModelIndex}
 */
AbstractProxyModel.prototype.mapToSource = goog.abstractMethod;


// --------------------------------------------------------------------------------------------------------------------
// Reimplemented public methods
/** @override */
AbstractProxyModel.prototype.data = function(proxyIndex, role) {
	if (!this.sourceModel_)
		return null;

	var sourceIndex = this.mapToSource(proxyIndex);
	return this.sourceModel_.data(sourceIndex, role);
};

/** @override */
AbstractProxyModel.prototype.headerData = function(column) {
	return this.sourceModel_ ? this.sourceModel_.headerData(column) : null;
};

/** @override */
AbstractProxyModel.prototype.setData = function(proxyIndex, newValue, optRole) {
	if (!this.sourceModel_)
		return false;

	var sourceIndex = this.mapToSource(proxyIndex);
	return this.sourceModel_.setData(sourceIndex, newValue, optRole);
};


// --------------------------------------------------------------------------------------------------------------------
// Protected methods
/**
 * This base class implementation does nothing.
 *
 * @param {AbstractItemModel} newSourceModel
 * @param {AbstractItemModel} oldSourceModel
 * @protected
 */
AbstractProxyModel.prototype.sourceModelChanged = function(newSourceModel, oldSourceModel) {}


/*******************************************************************************************************************/});
