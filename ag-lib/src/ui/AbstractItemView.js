/**
 * @fileoverview AbstractItemView encapsulates many of the features common to all item vies that
 *   adhere to the AbstractItemModel interface.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.ui.AbstractItemView');

goog.require('goog.asserts');
goog.require('goog.dom.TagName');
goog.require('goog.ui.Component');
goog.require('goog.userAgent');

goog.require('ag');
goog.require('ag.model.ItemSelectionModel');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {goog.ui.Component}
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
ag.ui.AbstractItemView = function(optDomHelper) {
	goog.base(this, optDomHelper);

	// --------------------------------------------------------------------------------------------------------------------
	// Protected members
	/**
	 * @type {ag.model.AbstractItemModel}
	 * @protected
	 */
	this.model_;

	/**
	 * @type {ag.ui.AbstractItemView.SelectionBehavior}
	 * @protected
	 */
	this.selectionBehavior_ = ag.ui.AbstractItemView.SelectionBehavior.Items;

	/**
	 * @type {ag.ui.AbstractItemView.SelectionMode}
	 * @protected
	 */
	this.selectionMode_ = ag.ui.AbstractItemView.SelectionMode.Extended;


	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.model.ItemSelectionModel}
	 * @private
	 */
	this.selectionModel_ = new ag.model.ItemSelectionModel();

	/**
	 * @type {boolean}
	 * @private
	 */
	this.sortingEnabled_ = true;
};
goog.inherits(ag.ui.AbstractItemView, goog.ui.Component);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var userAgent = goog.userAgent;

var TagName = goog.dom.TagName;

var AbstractItemModel = ag.model.AbstractItemModel;
var AbstractItemView = ag.ui.AbstractItemView;
var ItemSelectionModel = ag.model.ItemSelectionModel;
var ModelIndex = ag.model.ModelIndex;

// --------------------------------------------------------------------------------------------------------------------
// Constants
/** @enum {string} */
AbstractItemView.Css = {
	Current: goog.getCssName('current'),
	Selected: goog.getCssName('selected')
};

/** @enum {number} */
AbstractItemView.ModifierKeys = {
	Ctrl:  0x0001,
	Shift: 0x0002
};

/**
 * Defines the exact view placement when scrolling to a particular position.
 *
 * @enum {number}
 */
AbstractItemView.ScrollHint = {
	EnsureVisible: 0,		// If not visible at all, scroll view such that index is at least partially visible; otherwise do nothing
	PositionAtTop: 1,
	PositionAtBottom: 2,
	Center: 3				// Vertically and horizontally center the view around the index
};

/**
 * Defines how the view should handle selecting single or multiple items per action.
 *
 * @enum {number}
 */
AbstractItemView.SelectionBehavior = {
	Items: 0,
	Rows: 1,		/* Select all columns for a given row */
	Columns: 2		/* Select all rows for a given column */
};

/**
 * Defines what kinds of selection may be made.
 *
 * @enum {number}
 */
AbstractItemView.SelectionMode = {
	None: 0,
	Single: 1,			// Only one item/row/column may be selected at any given time
	Contiguous: 2,		// Multiple items may be selected given that they are contigous in the view
	Extended: 3			// Any number of items may be selected even if not contiguous
};

var ScrollHint = AbstractItemView.ScrollHint;
var SelectionBehavior = AbstractItemView.SelectionBehavior;
var SelectionMode = AbstractItemView.SelectionMode;

// --------------------------------------------------------------------------------------------------------------------
// Public static functions
/**
 * @param {goog.events.BrowserEvent} event
 * @return {AbstractItemView.ModifierKeys}
 */
AbstractItemView.extractModifiers = function(event) {
    var modKeys = 0;
    if (ag.xOsCtrlPressed(event))
        modKeys |= AbstractItemView.ModifierKeys.Ctrl;
    if (event.shiftKey)
        modKeys |= AbstractItemView.ModifierKeys.Shift;
    return /** @type {AbstractItemView.ModifierKeys} */ (modKeys);
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
AbstractItemView.prototype.canDecorate = function(element) {
	return element.tagName === TagName.DIV.toString();
};

/** @override */
AbstractItemView.prototype.createDom = function() {
	goog.base(this, 'createDom');

	this.decorateInternal(this.getDomHelper().createElement('div'));
};

/**
 */
AbstractItemView.prototype.focus = function() {
	if (this.isInDocument())
		this.getElement().focus();
};

/** @return {boolean} */
AbstractItemView.prototype.isSortingEnabled = function() {
	return this.sortingEnabled_;
};

/** @return {AbstractItemModel} */
AbstractItemView.prototype.model = function() {
	return this.model_;
};

/**
 * No-op in this base class implementation.
 *
 * @param {ModelIndex} index
 * @param {ScrollHint} hint
 */
AbstractItemView.prototype.scrollTo = function(index, hint) {};

/** @return {ItemSelectionModel} */
AbstractItemView.prototype.selectionModel = function() {
	return this.selectionModel_;
};

/**
 * @override
 */
AbstractItemView.prototype.setModel = function(newModel) {
	if (newModel === this.model_)
		return;

	var oldModel = this.model_;
	this.model_ = /** @type {AbstractItemModel} */ (newModel);
	this.modelChanged(/** @type {AbstractItemModel} */(this.model_), /** @type {AbstractItemModel} */(oldModel));

	var oldSelectionModel = this.selectionModel_;
	this.setSelectionModel(new ItemSelectionModel(/** @type {AbstractItemModel} */(newModel)));
	oldSelectionModel.dispose();
};

/**
 * @param {SelectionBehavior} newSelectionBehavior
 */
AbstractItemView.prototype.setSelectionBehavior = function(newSelectionBehavior) {
	if (this.selectionBehavior_ === newSelectionBehavior)
		return;

	this.selectionBehavior_ = newSelectionBehavior;
	this.selectionModel_.clearSelection();
};

/**
 * @param {SelectionMode} newSelectionMode
 */
AbstractItemView.prototype.setSelectionMode = function(newSelectionMode) {
	if (this.selectionMode_ === newSelectionMode)
		return;

	this.selectionMode_ = newSelectionMode;
	this.selectionModel_.clearSelection();
};

/**
 * It is up to the application to delete the old selection model. If setModel is called after changing the selection model,
 * it will be replaced with a default view-created one.
 *
 * It is also important that the old selection model be deleted *after* calling this method and not before because
 * subclasses may utilize the old selection model during the change (e.g. remove classes from HTML using the old selection
 * models selection; TableView).
 *
 * @param {ItemSelectionModel} newSelectionModel
 */
AbstractItemView.prototype.setSelectionModel = function(newSelectionModel) {
	assert(newSelectionModel);
	assert(newSelectionModel.sourceModel() === this.model_);

	var oldSelectionModel = this.selectionModel_;
	if (newSelectionModel === oldSelectionModel)
		return;

	// Call virtual stub for subclasses to react accordingly
	this.selectionModel_ = newSelectionModel;
	this.selectionModelChanged(newSelectionModel, oldSelectionModel);
};

/**
 * @param {boolean=} enabled defaults to true
 */
AbstractItemView.prototype.setSortingEnabled = function(enabled) {
	this.sortingEnabled_ = (goog.isDefAndNotNull(enabled)) ? enabled : true;
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
AbstractItemView.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	this.selectionModel_.dispose();

	delete this.model_;
	delete this.selectionModel_;
};

/**
 * Virtual stub for subclasses to utilize when the model has changed.
 *
 * @param {AbstractItemModel} newModel
 * @param {AbstractItemModel} oldModel
 * @protected
 */
AbstractItemView.prototype.modelChanged = function(newModel, oldModel) {};

/**
 * Virtual stub for subclasses to utilize when the selection model has changed.
 * @param {ItemSelectionModel} newSelectionModel
 * @param {ItemSelectionModel} oldSelectionModel
 * @protected
 */
AbstractItemView.prototype.selectionModelChanged = function(newSelectionModel, oldSelectionModel) {};


/*******************************************************************************************************************/});
