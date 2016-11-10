/**
 * @fileoverview MockProxyModel proxies a models contents by simply reversing the row data.
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.model.MockProxyModel');

goog.require('ag.core.AObject');
goog.require('ag.model.AbstractProxyModel');

/**
 * @constructor
 * @extends {ag.core.AbstractProxyModel}
 * @param {ag.core.AObject=} optParent defaults to null
 */
ag.model.MockProxyModel = function(optParent) {
	goog.base(this, optParent);

	this.sourceModelChanges_ = [];
};
goog.inherits(ag.model.MockProxyModel, ag.model.AbstractProxyModel);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var MockProxyModel = ag.model.MockProxyModel;

// --------------------------------------------------------------------------------------------------------------------
// Public methods
MockProxyModel.prototype.clearMemory = function() {
	this.sourceModelChanges_ = [];
};

MockProxyModel.prototype.sourceModelChanges = function() {
	return this.sourceModelChanges_;
};


// --------------------------------------------------------------------------------------------------------------------
// Re-implemented virtual public methods
/** @override */
MockProxyModel.prototype.columnCount = function() {
	return this.sourceModel() ? this.sourceModel().columnCount() : 0;
};

/** @override */
MockProxyModel.prototype.index = function(row, column) {
	if (!this.isValidRow(row) || !this.isValidColumn(column))
		return new ModelIndex();

	return this.createIndex(row, column);
};

/** @override */
MockProxyModel.prototype.mapFromSource = function(sourceIndex) {
	assert(!sourceIndex.isValid() || sourceIndex.model() === this.sourceModel());
	if (sourceIndex.isValid())
		return this.createIndex(this.rowCount() - 1 - sourceIndex.row(), sourceIndex.column());

	return new ModelIndex();
};

/** @override */
MockProxyModel.prototype.mapToSource = function(proxyIndex) {
	assert(!proxyIndex.isValid() || proxyIndex.model() === this);
	return this.sourceModel().index(this.rowCount() - 1 - proxyIndex.row(), proxyIndex.column());
};

/** @override */
MockProxyModel.prototype.rowCount = function() {
	return this.sourceModel() ? this.sourceModel().rowCount() : 0;
};


// --------------------------------------------------------------------------------------------------------------------
// Re-implemented virtual protected methods
/** @override */
MockProxyModel.prototype.sourceModelChanged = function(newSourceModel, oldSourceModel) {
	this.sourceModelChanges_.push([newSourceModel, oldSourceModel]);
};


/*******************************************************************************************************************/});
