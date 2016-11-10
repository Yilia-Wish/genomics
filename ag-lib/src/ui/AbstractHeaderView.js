goog.provide('ag.ui.AbstractHeaderView');

goog.require('goog.asserts');
goog.require('goog.dom.classes');
goog.require('goog.events');

goog.require('ag.ui');
goog.require('ag.ui.AbstractItemView');

/**
 * @constructor
 * @param {ag.ui.Orientation} orientation
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
ag.ui.AbstractHeaderView = function(orientation, optDomHelper) {
	goog.base(this, optDomHelper);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {boolean}
	 * @private
	 */
	this.clickable_ = false;

	/**
	 * @type {boolean}
	 * @private
	 */
	this.movable_ = false;

	/**
	 * @type {ag.ui.Orientation}
	 * @private
	 */
	this.orientation_ = orientation;


	// --------------------------------------------------------------------------------------------------------------------
	// Protected
	/**
	 * @type {number}
	 * @protected
	 */
	this.minimumSectionSize_ = null;
};
goog.inherits(ag.ui.AbstractHeaderView, ag.ui.AbstractItemView);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var classes = goog.dom.classes;
var events = goog.events;

var AbstractHeaderView = ag.ui.AbstractHeaderView;
var Orientation = ag.ui.Orientation;
var ResizeMode = ag.ui.ResizeMode;

// --------------------------------------------------------------------------------------------------------------------
// Constants
/** @enum {string} */
AbstractHeaderView.Css = {
	RootClass: goog.getCssName('ag-headerView'),
	Vertical: goog.getCssName('vertical'),
	Horizontal: goog.getCssName('horizontal'),
	Table: goog.getCssName('ag-headerView-table'),
	Head: goog.getCssName('ag-headerView-head'),
	Row: goog.getCssName('ag-headerView-row'),
	Cell: goog.getCssName('ag-headerView-cell'),

	ResizeHover: goog.getCssName('resize-hover'),
	SectionActive: goog.getCssName('section-active'),   // E.g. when the user has pressed the mouse down on a section,
		 												// but not released it.
	ClickEnabled: goog.getCssName('click-enabled'),
    SortAsc: goog.getCssName('sort-asc'),
    SortDesc: goog.getCssName('sort-desc')
};

/** @enum {number} */
AbstractHeaderView.Constants = {
	kResizeHandleWidth: 9,
	kHalfResizeHandleWidth: 4		// (9 - 1) / 2
};

// --------------------------------------------------------------------------------------------------------------------
// Signals
/** @enum {string} */
AbstractHeaderView.SignalType = {
	// newOffset, oldOffset
	OFFSET_CHANGED: goog.events.getUniqueId('offset-changed'),
	// section (visual index)
	SECTION_CLICKED: goog.events.getUniqueId('section-clicked'),
	// section (visualColumn), newSize, oldSize
	SECTION_RESIZED: goog.events.getUniqueId('section-resized'),
	// section (visualColumn), logicalIndex (modelColumn if horizontal or modelRow if vertical), visible; if visible is false,
	//   then visual index indicates the logicalIndex that was hidden, and vice versa
	SECTION_VISIBLE_CHANGED: goog.events.getUniqueId('section-visible-changed'),
	// oldSection (visualColumn), newSection(visualColumn), logicalIndex
	SECTION_MOVED: goog.events.getUniqueId('section-moved')
};


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {number} */
AbstractHeaderView.prototype.count = goog.abstractMethod;

/** @override */
AbstractHeaderView.prototype.enterDocument = function() {
	goog.base(this, 'enterDocument');
	this.updateClickEnabledCss_();
};

/** @return {boolean} */
AbstractHeaderView.prototype.isClickable = function() {
	return this.clickable_;
};

/** @return {boolean} */
AbstractHeaderView.prototype.isMovable = function() {
	return this.movable_;
};

/** @return {number} */
AbstractHeaderView.prototype.minimumSectionSize = function() {
	return this.minimumSectionSize_;
};

/** @return {number} */
AbstractHeaderView.prototype.offset = goog.abstractMethod;

/** @return {Orientation} */
AbstractHeaderView.prototype.orientation = function() {
	return this.orientation_;
};

/**
 * @param {number} logicalIndex
 * @return {ResizeMode}
 */
AbstractHeaderView.prototype.resizeMode = goog.abstractMethod;

/**
 * @param {number} logicalIndex
 * @param {number} newSize
 */
AbstractHeaderView.prototype.resizeSection = goog.abstractMethod;

/**
 * @param {number} logicalIndex
 * @return {number}
 */
AbstractHeaderView.prototype.sectionSize = goog.abstractMethod;

/** @param {boolean} clickable */
AbstractHeaderView.prototype.setClickable = function(clickable) {
	if (this.clickable_ === clickable) 
		return;
	
	this.clickable_ = clickable;
	if (this.isInDocument())
		this.updateClickEnabledCss_();
};

/**
 * @param {number} newMinimumSectionSize
 */
AbstractHeaderView.prototype.setMinimumSectionSize = function(newMinimumSectionSize) {
	assert(newMinimumSectionSize >= 0);
	if (this.minimumSectionSize_ === newMinimumSectionSize)
		return;

	var oldSize = this.minimumSectionSize_;
	this.minimumSectionSize_ = newMinimumSectionSize;
	this.minimumSectionSizeChanged(newMinimumSectionSize, oldSize);
};

/** @param {boolean} movable */
AbstractHeaderView.prototype.setMovable = function(movable) {
	this.movable_ = movable;
};

/**
 * @param {number} offset
 */
AbstractHeaderView.prototype.setOffset = goog.abstractMethod;

/**
 * @param {number} logicalIndex
 * @param {ResizeMode} mode
 */
AbstractHeaderView.prototype.setResizeMode = goog.abstractMethod;


// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
AbstractHeaderView.prototype.decorateInternal = function(element) {
	goog.base(this, 'decorateInternal', element);

	classes.add(element, AbstractHeaderView.Css.RootClass);
	if (this.isClickable)
		classes.add(element, AbstractHeaderView.Css.ClickEnabled);
};


/**
 * Virtual method indicating that the minimum section size has changed. Subclasses should override this method and
 * react accordingly.
 *
 * @param {number} newSize
 * @param {number} oldSize
 * @protected
 */
AbstractHeaderView.prototype.minimumSectionSizeChanged = function(newSize, oldSize) {};

/**
 * @param {number} modelColumn
 * @return {boolean}
 * @protected
 */
AbstractHeaderView.prototype.isValidModelColumn = function(modelColumn) {
	return this.model_ && this.model_.isValidColumn(modelColumn);
};


// --------------------------------------------------------------------------------------------------------------------
// Private functions
/** @private */
AbstractHeaderView.prototype.updateClickEnabledCss_ = function() {
	assert(this.isInDocument());
	var element = this.getElement();
	if (this.clickable_)
		classes.add(element, AbstractHeaderView.Css.ClickEnabled);
	else
		classes.remove(element, AbstractHeaderView.Css.ClickEnabled);
};


/*******************************************************************************************************************/});

