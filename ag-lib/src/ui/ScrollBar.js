goog.provide('ag.ui.ScrollBar');

goog.require('goog.asserts');
goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.math');
goog.require('goog.style');

goog.require('goog.ui.Component');

goog.require('ag.meta.MetaObject');
goog.require('ag.ui');

/**
 * @constructor
 * @extends {goog.ui.Component}
 * @param {ag.ui.Orientation=} optOrientation defaults to vertical
 */
ag.ui.ScrollBar = function(optOrientation) {
	goog.base(this);

	/**
	 * @type {ag.ui.Orientation}
	 * @private
	 */
	this.orientation_ = optOrientation ? optOrientation : ag.ui.Orientation.VERTICAL;

	/**
	 * @type {number}
	 * @private
	 */
	this.singleStep_ = 1;

	/**
	 * @type {number}
	 * @private
	 */
	this.pageStep_ = 10;

	/**
	 * @type {number}
	 * @private
	 */
	this.value_ = 0;

	/**
	 * @type {number}
	 * @private
	 */
	this.maximum_ = 0;

	/**
	 * @type {number}
	 * @private
	 */
	this.scrollableSpace_ = 0;

	/**
	 * The child div element used to create a scrollbar by settings its width/height larger than its
	 * parent div.
	 * @type {Element}
	 * @private
	 */
	this.subDiv_ = null;
};
goog.inherits(ag.ui.ScrollBar, goog.ui.Component);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var classes = goog.dom.classes;
var events = goog.events;
var math = goog.math;
var style = goog.style;

var Component = goog.ui.Component;

var MetaObject = ag.meta.MetaObject.getInstance;
var Orientation = ag.ui.Orientation;
var ScrollBar = ag.ui.ScrollBar;

ScrollBar.DEFAULT_WH = 100;
// ScrollBar.DEFAULT_SCROLLABLE_SPACE = ScrollBar.DEFAULT_WH * 2;

// --------------------------------------------------------------------------------------------------------------------
// Static properties
ScrollBar.SignalType = {
	// RANGE_CHANGED: events.getUniqueId('scrollbar-range-changed'),
	VALUE_CHANGED: events.getUniqueId('scrollbar-value-changed')
};

// --------------------------------------------------------------------------------------------------------------------
// Static methods
ScrollBar.width = function() {
	// If the element solely occupies the scrollbar width space, then the scrolling values do
	// not work in concert with the specified user range. Adding 1 pixel of empty padding fixes
	// this problem.
	//
	// Technically not necessary for horizontal scrollbars; however, for consistency with the
	// vertical scrollbar case where it is necessary, we add it here.
	return (1 + style.getScrollbarWidth());
}

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * @param {number} delta
 */
ScrollBar.prototype.adjustValue = function(delta) {
	this.setValue(this.value_ + delta);
};

/** @override */
ScrollBar.prototype.canDecorate = function(element) {
	return element.tagName === 'DIV';
};

/** @override */
ScrollBar.prototype.createDom = function() {
	goog.base(this, 'createDom');

	this.decorateInternal(this.getDomHelper().createElement('div'));
};

/** @override */
ScrollBar.prototype.decorateInternal = function(element) {
	goog.base(this, 'decorateInternal', element);

	var subDiv = new Component();
	this.addChild(subDiv, true);
	this.subDiv_ = subDiv.getElement();

	classes.add(element, goog.getCssName('ag-scrollbar'));
	classes.add(this.subDiv_, goog.getCssName('ag-slider'));
	if (this.orientation_ === Orientation.VERTICAL) {
		if (!element.style.height)
			this.setHeight(ScrollBar.DEFAULT_WH);

		element.style.width = ScrollBar.width() + 'px';
		element.style.overflowY = 'scroll';
		classes.add(element, goog.getCssName('ag-scrollbar-vertical'));
	}
	else {
		if (!element.style.width)
			this.setWidth(ScrollBar.DEFAULT_WH);

		element.style.height = ScrollBar.width() + 'px';
		element.style.overflowX = 'scroll';
		classes.add(element, goog.getCssName('ag-scrollbar-horizontal'));

		// In Chrome, for a horizontal scrollbar to show properly, it must be at least 1px high.
		// This is not true for its brother, the vertical scrollbar does not have to have a width
		// defined. Go figure.
		this.subDiv_.style.height = '1px';
	}
};

/** @override */
ScrollBar.prototype.enterDocument = function() {
	goog.base(this, 'enterDocument');

	this.setScrollableSpace(this.scrollableSpace_);

	events.listen(this.getElement(), events.EventType.SCROLL, this.onScroll_, true, this);
};

/** @override */
ScrollBar.prototype.exitDocument = function() {
	goog.base(this, 'exitDocument');

	events.unlisten(this.getElement(), events.EventType.SCROLL, this.onScroll_, true, this);
};

/** @return {number} */
ScrollBar.prototype.height = function() {
	return style.getSize(this.getElement()).height;
};

/** @return {boolean} */
ScrollBar.prototype.isVisible = function() {
	return this.getElement().style.display != 'none';
};

/** @return {number} */
ScrollBar.prototype.maximum = function() {
	return this.maximum_;
};

/** @return {Orientation} */
ScrollBar.prototype.orientation = function() {
	return this.orientation_;
};

/** @return {number} */
ScrollBar.prototype.pageStep = function() {
	return this.pageStep_;
};

/** @return {number} */
ScrollBar.prototype.scrollableSpace = function() {
	return this.scrollableSpace_;
};

/**
 * Convenience method for scrolling by a multiple of steps. Positive steps scroll right/down and
 * negative steps scroll left/up.
 * @param {number} steps
 */
ScrollBar.prototype.scrollBySteps = function(steps) {
	steps = Math.floor(steps);
	this.setValue(this.value_ + steps * this.singleStep_);
};

/**
 * Convenience method for scrolling by a multiple of pages. Positive values scroll right/down and
 * negative values scroll left/up.
 * @param {number} pages
 */
ScrollBar.prototype.scrollByPages = function(pages) {
	pages = Math.floor(pages);
	this.setValue(this.value_ + pages * this.pageStep_);
};

/**
 * @param {number} newPageStep
 */
ScrollBar.prototype.setPageStep = function(newPageStep) {
	assert(newPageStep >= 0);

	this.pageStep_ = newPageStep;
};

/**
 * @param {number} space
 */
ScrollBar.prototype.setScrollableSpace = function(space) {
	this.scrollableSpace_ = Math.max(0, space);

	if (!this.isInDocument())
		return;

	if (this.orientation_ === Orientation.VERTICAL)
		this.subDiv_.style.height = this.scrollableSpace_ + 'px';
	else
		this.subDiv_.style.width = this.scrollableSpace_ + 'px';

	this.updateMaximum_();
};

/**
 * @param {number} newSingleStep
 */
ScrollBar.prototype.setSingleStep = function(newSingleStep) {
	assert(newSingleStep >= 0);

	this.singleStep_ = newSingleStep;
};

/** @param {number|string} newHeight */
ScrollBar.prototype.setHeight = function(newHeight) {
	assert(this.orientation_ === Orientation.VERTICAL);
	style.setHeight(this.getElement(), newHeight);
	this.updateMaximum_();
};

/**
 * Transform this request into a scroll event, which will actually handle updating the internal
 * value as needed.
 *
 * @param {number} newValue
 */
ScrollBar.prototype.setValue = function(newValue) {
	var oldValue = this.value_;
	this.updateValue_(newValue);
	if (this.value_ !== oldValue)
		MetaObject().emit(this, ScrollBar.SignalType.VALUE_CHANGED, this.value_);
};

/**
 * @param {boolean=} visible defaults to true
 */
ScrollBar.prototype.setVisible = function(visible) {
	visible = goog.isDef(visible) ? visible : true;

	style.setElementShown(this.getElement(), visible);
};

/** @param {number|string} newWidth */
ScrollBar.prototype.setWidth = function(newWidth) {
	assert(this.orientation_ === Orientation.HORIZONTAL);
	style.setWidth(this.getElement(), newWidth);
	this.updateMaximum_();
};

/** @return {number} */
ScrollBar.prototype.singleStep = function() {
	return this.singleStep_;
};

/** @return {number} */
ScrollBar.prototype.value = function() {
	return this.value_;
};

/** @return {number} */
ScrollBar.prototype.width = function() {
	return style.getSize(this.getElement()).width;
};

// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @private
 */
// ScrollBar.prototype.emitRangeChanged_ = function() {
// 	MetaObject().emit(this, ScrollBar.SignalType.RANGE_CHANGED, this.minimum_, this.maximum_);
// };
/**
 * @param {events.Event} event
 * @private
 */
ScrollBar.prototype.onScroll_ = function(event) {
	if (this.orientation_ === Orientation.VERTICAL) {
		// console.log('Scroll pos: ' + event.target.scrollTop);
		this.setValue(event.target.scrollTop);
	}
	else {
		// console.log('Scroll pos: ' + event.target.scrollLeft);
		this.setValue(event.target.scrollLeft);
	}
};

/**
 * Use the native scrollbar values to determine the maximum. First, attempt to set the scroll bar to a very large
 * value. The browser will ensure it does not exceed the possible maximum. Then retrieve that value and use it.
 * Reset scrollbar to original value.
 *
 * @private */
ScrollBar.prototype.updateMaximum_ = function() {
	var oldValue = this.value_;
	this.updateValue_(2999999999);
	//                ^^^^^^^^^^ Some larger number, guaranteed to be beyond the possible maximum.
	this.maximum_ = this.value_;
	this.updateValue_(oldValue);
};

/**
 * @param {number} newValue
 * @private
 */
ScrollBar.prototype.updateValue_ = function(newValue) {
	var el = this.getElement();
	if (this.orientation_ === Orientation.VERTICAL) {
		el.scrollTop = newValue;
		this.value_ = el.scrollTop;
	}
	else {
		el.scrollLeft = newValue;
		this.value_ = el.scrollLeft;
	}
};

/*******************************************************************************************************************/});
