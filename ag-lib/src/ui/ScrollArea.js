goog.provide('ag.ui.ScrollArea');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.events.BrowserEvent');
goog.require('goog.events.KeyEvent');
goog.require('goog.events.MouseWheelEvent');
goog.require('goog.events.MouseWheelHandler');
goog.require('goog.math.Box');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');
goog.require('goog.style');
goog.require('goog.ui.Component');

goog.require('ag.meta.MetaObject');
goog.require('ag.ui');
goog.require('ag.ui.ScrollBar');

/**
 * Viewport event handling:
 * o KeyDown, KeyUp, KeyPress
 * o MouseDown (note, MouseMove and MouseUp are not automatically listened to because it is very likely
 *   that the user will want to capture these so that they can still be processed when the mouse is
 *   outside the viewport element. To handle these, simply setup the relevant event listeners in the
 *   subclasses createViewport method.)
 * o MouseWheel
 *
 * Notes:
 * o It is important to define a width and height on the core containing element otherwise, the contents
 *   will shrink/expand vertically to fit the contents.
 *
 * @constructor
 * @extends goog.ui.Component
 */
ag.ui.ScrollArea = function() {
	goog.base(this);

	/**
	 * @type {ag.ui.ScrollBar}
	 * @private
	 */
	this.horizontalScrollBar_ = new ag.ui.ScrollBar(ag.ui.Orientation.HORIZONTAL);

	/**
	 * @type {ag.ui.ScrollBarPolicy}
	 * @private
	 */
	this.horizontalScrollBarPolicy_ = ag.ui.ScrollBarPolicy.Auto;

	/**
	 * @type {ag.ui.ScrollBar}
	 * @private
	 */
	this.verticalScrollBar_ = new ag.ui.ScrollBar(ag.ui.Orientation.VERTICAL);

	/**
	 * @type {ag.ui.ScrollBarPolicy}
	 * @private
	 */
	this.verticalScrollBarPolicy_ = ag.ui.ScrollBarPolicy.Auto;

	/**
	 * @type {goog.math.Box}
	 * @private
	 */
	this.viewportMargins_ = new goog.math.Box(0,0,0,0);

	/**
	 * @type {goog.math.Size}
	 * @private
	 */
	this.size_ = new goog.math.Size(0, 0);

	/**
	 * Defaults to an empty div, but may be replaced with any suitable alternative via overriding
	 * createViewport.
	 * @type {Element}
	 * @protected
	 */
	this.viewport = null;

	/**
	 * @type {goog.math.Size}
	 * @private
	 */
	this.viewportSize_ = new goog.math.Size(0, 0);

	/**
	 * Reports mouse movement via the mouseMoveEvent handler if true.
	 *
	 * @type {boolean}
	 * @private
	 */
	this.mouseTracking_ = false;

	/**
	 * @type {goog.events.MouseWheelHandler}
	 * @private
	 */
	this.mouseWheelHandler_ = null;

	// --------------------------------------------------------------------------------------------------------------------
	// Helper variables
	/**
	 * @type {goog.math.Coordinate}
	 * @private
	 */
	this.tmpPoint_ = new goog.math.Coordinate();
};
goog.inherits(ag.ui.ScrollArea, goog.ui.Component);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var classes = goog.dom.classes;
var events = goog.events;
var style = goog.style;
var Box = goog.math.Box;
var Coordinate = goog.math.Coordinate;
var KeyEvent = goog.events.KeyEvent;
var Size = goog.math.Size;
var TagName = goog.dom.TagName;

var BrowserEvent = events.BrowserEvent;
var EventHandler = events.EventHandler;
var MouseWheelEvent = events.MouseWheelEvent;
var MouseWheelHandler = events.MouseWheelHandler;

var metaObject = ag.meta.MetaObject.getInstance;
var Orientation = ag.ui.Orientation;
var ScrollBar = ag.ui.ScrollBar;
var ScrollBarPolicy = ag.ui.ScrollBarPolicy;
var ScrollArea = ag.ui.ScrollArea;

// --------------------------------------------------------------------------------------------------------------------
// Static properties
ScrollArea.DEFAULT_SIZE = new Size(300, 200);

/** @enum {string} */
ScrollArea.SignalType = {
	// Box
	VIEWPORT_MARGINS_CHANGED: events.getUniqueId('viewport-margins-changed')
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @override */
ScrollArea.prototype.createDom = function() {
	goog.base(this, 'createDom');
    this.decorateInternal(this.getElement());
};

/** @override */
ScrollArea.prototype.canDecorate = function(element) {
	return element.tagName === TagName.DIV.toString();
};

/** @override */
ScrollArea.prototype.decorateInternal = function(element) {
	goog.base(this, 'decorateInternal', element);

	classes.add(element, goog.getCssName('ag-scrollarea'));

	// Hide any overflow - the area to be visualized should be handled dynamically by the viewport widget
	// using position information from the scrollbars
	element.style.overflow = 'hidden';
	element.style.position = 'relative';
	element.style.padding = 0;		// Padding is not allowed on this unit

	// createViewport is virtual method which subclasses may override to provide their own custom
	// widget
	var viewport = this.createViewport();

	// Enable element to receive keyboard events
	this.getDomHelper().setFocusableTabIndex(viewport, true);

	// Order of children is important because we want them to flow from left to right and top to bottom.
	element.appendChild(viewport);
	this.addChild(this.verticalScrollBar_, true /* optRender */);
	this.addChild(this.horizontalScrollBar_, true /* optRender */);

	// The HTML elements behind the styles are only available *after* they have been rendered (previous
	// lines. Position them in their appropriate places.
	var hScrollStyle = this.horizontalScrollBar_.getElement().style;
	var vScrollStyle = this.verticalScrollBar_.getElement().style;
	hScrollStyle.position = vScrollStyle.position = 'absolute';
	hScrollStyle.left = hScrollStyle.bottom = 0;
	vScrollStyle.right = vScrollStyle.top = 0;

	this.mouseWheelHandler_ = new MouseWheelHandler(viewport);

	var eh = this.getHandler();
	eh.listen(this.mouseWheelHandler_, MouseWheelHandler.EventType.MOUSEWHEEL, this.wheelEvent)
		.listen(viewport, events.EventType.KEYDOWN, this.keyDownEvent)
		.listen(viewport, events.EventType.KEYPRESS, this.keyPressEvent)
		.listen(viewport, events.EventType.KEYUP, this.keyUpEvent)
		.listen(viewport, events.EventType.MOUSEDOWN, this.mouseDownEvent);

	if (this.mouseTracking_)
		eh.listen(viewport, events.EventType.MOUSEMOVE, this.mouseMoveEvent);

	this.viewport = viewport;
};

/** @override */
ScrollArea.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	this.mouseWheelHandler_.dispose();
};

/** @override */
ScrollArea.prototype.enterDocument = function() {
	goog.base(this, 'enterDocument');

	// Update the size to reflect its size after rendering (vital to get the content box size to accommodate any
	// defined borders / padding).
	this.size_ = style.getContentBoxSize(this.getElement());

	metaObject().connect(this.horizontalScrollBar_, ScrollBar.SignalType.VALUE_CHANGED, this, this.onHorizontalScrollValueChanged_)
		.connect(this.verticalScrollBar_, ScrollBar.SignalType.VALUE_CHANGED, this, this.onVerticalScrollValueChanged_);

	this.updateChildGeometriesAndVisibility_();
};

/**
 * @param {BrowserEvent} event
 * @return {boolean}
 */
ScrollArea.prototype.viewportContainsEvent = function(event) {
	ag.ui.getRelativePosition(event, this.viewport, this.tmpPoint_);
	var x = this.tmpPoint_.x;
	var y = this.tmpPoint_.y;

	return x >= 0 && y >= 0 &&
		x < this.viewportSize_.width &&
		y < this.viewportSize_.height;
};

/** @override */
ScrollArea.prototype.exitDocument = function() {
	goog.base(this, 'exitDocument');

	metaObject().disconnect(this.horizontalScrollBar_, ScrollBar.SignalType.VALUE_CHANGED, this, this.onHorizontalScrollValueChanged_);
	metaObject().disconnect(this.verticalScrollBar_, ScrollBar.SignalType.VALUE_CHANGED, this, this.onVerticalScrollValueChanged_);
};

/** @return {number} */
ScrollArea.prototype.height = function() {
	return this.size_.height;
};

/** @return {ScrollBar} */
ScrollArea.prototype.horizontalScrollBar = function() {
	return this.horizontalScrollBar_;
};

/** @return {boolean} */
ScrollArea.prototype.mouseTracking = function() {
	return this.mouseTracking_;
};

/** @return {Size} */
ScrollArea.prototype.scrollableSize = function() {
	return new Size(this.horizontalScrollBar_.scrollableSpace(),
		this.verticalScrollBar_.scrollableSpace());
};

/** @return {Coordinate} */
ScrollArea.prototype.scrollPosition = function() {
    return new Coordinate(this.horizontalScrollBar_.value(),
        this.verticalScrollBar_.value());
};

/**
 * @param {number} x
 * @param {number} y
 */
ScrollArea.prototype.scrollTo = function(x, y) {
	this.horizontalScrollBar_.setValue(x);
	this.verticalScrollBar_.setValue(y);
};

/**
 * @param {ScrollBarPolicy} newPolicy
 */
ScrollArea.prototype.setHorizontalScrollBarPolicy = function(newPolicy) {
	if (newPolicy === this.horizontalScrollBarPolicy_)
		return;

	this.horizontalScrollBarPolicy_ = newPolicy;
	this.updateChildGeometriesAndVisibility_();
};

/**
 * @param {boolean} [optTrackMouse] defaults to true
 */
ScrollArea.prototype.setMouseTrackingEnabled = function(optTrackMouse) {
	var trackMouse = goog.isBoolean(optTrackMouse) ? optTrackMouse : true;
	if (trackMouse !== this.mouseTracking_) {
		this.mouseTracking_ = trackMouse;
		if (this.wasDecorated()) {
			var eh = this.getHandler();
			if (trackMouse)
				eh.listen(this.viewport, events.EventType.MOUSEMOVE, this.mouseMoveEvent);
			else
				eh.unlisten(this.viewport, events.EventType.MOUSEMOVE, this.mouseMoveEvent);
		}
	}
};

/**
 * @param {Size} newSize complete size of margins + viewport + scrollbars
 */
ScrollArea.prototype.setSize = function(newSize) {
	assert(newSize.width >= 0);
	assert(newSize.height >= 0);
	if (Size.equals(this.size_, newSize))
		return;

	// Must update the internal size of this component *before* updating the geometries and positions
	// of child widgets because this variable is used in that context.
	this.size_ = newSize;
	style.setSize(this.getElement(), this.size_);

	// Call virtual method
	this.resized(this.size_);

	// Update the scrollbar widgets
	this.updateChildGeometriesAndVisibility_();
};

/**
 * @param {ScrollBarPolicy} newPolicy
 */
ScrollArea.prototype.setVerticalScrollBarPolicy = function(newPolicy) {
	if (newPolicy === this.verticalScrollBarPolicy_)
		return;

	this.verticalScrollBarPolicy_ = newPolicy;
	this.updateChildGeometriesAndVisibility_();
};

/** @return {Size} */
ScrollArea.prototype.size = function() {
	 return this.size_.clone();
};

/** @return {ScrollBar} */
ScrollArea.prototype.verticalScrollBar = function() {
	return this.verticalScrollBar_;
};

/** @return {Box} */
ScrollArea.prototype.viewportMargins = function() {
	return this.viewportMargins_;
};

/** @return {Size} */
ScrollArea.prototype.viewportSize = function() {
	return this.viewportSize_;
};

/** @return {number} */
ScrollArea.prototype.width = function() {
	return this.size_.width;
};

// --------------------------------------------------------------------------------------------------------------------
// Protected non-virtual methods
/**
 * @return {EventHandler}
 * @protected
 */
ScrollArea.prototype.eventHandler = function() {
	return this.getHandler();
};

/**
 * @param {Size} size
 * @protected
 */
ScrollArea.prototype.setScrollableSize = function(size) {
	assert(size.width >= 0);
	assert(size.height >= 0);

	this.horizontalScrollBar_.setScrollableSpace(size.width);
	this.verticalScrollBar_.setScrollableSpace(size.height);

	this.updateChildGeometriesAndVisibility_();
};

/**
 * @param {Box} newMargins
 */
ScrollArea.prototype.setViewportMargins = function(newMargins) {
	if (Box.equals(this.viewportMargins_, newMargins))
		return;

	this.viewportMargins_.left = newMargins.left;
	this.viewportMargins_.right = newMargins.right;
	this.viewportMargins_.top = newMargins.top;
	this.viewportMargins_.bottom = newMargins.bottom;
	this.updateChildGeometriesAndVisibility_();
	metaObject().emit(this, ScrollArea.SignalType.VIEWPORT_MARGINS_CHANGED, newMargins);
};


// --------------------------------------------------------------------------------------------------------------------
// Protected virtual methods
/**
 * Subclasses should override this method and return a custom HTML element. This default method simply
 * returns an empty div.
 *
 * @return {Element}
 * @protected
 */
ScrollArea.prototype.createViewport = function() {
	return this.dom_.createDom(TagName.DIV);
};

/**
 * @param {KeyEvent} event
 * @protected
 */
ScrollArea.prototype.keyDownEvent = function(event) {};

/**
 * @param {KeyEvent} event
 * @protected
 */
ScrollArea.prototype.keyPressEvent = function(event) {};

/**
 * @param {KeyEvent} event
 * @protected
 */
ScrollArea.prototype.keyUpEvent = function(event) {};

/**
 * @param {BrowserEvent} event
 * @protected
 */
ScrollArea.prototype.mouseDownEvent = function(event) {};

/**
 * @param {BrowserEvent} event
 * @protected
 */
ScrollArea.prototype.mouseMoveEvent = function(event) {};

/**
 * Virtual stub for reacting to the ScrollArea itself resizing.
 *
 * @param {Size} size
 * @protected
 */
ScrollArea.prototype.resized = function(size) {};

/**
 * Virtual stub for subclasses to implement when a scroll request has been initiated.
 *
 * @param {number} x
 * @param {number} y
 * @protected
 */
ScrollArea.prototype.scrollContentsTo = function(x, y) {};

/**
 * Virtual stub for reacting to viewport resize events
 *
 * @param {Size} size
 * @protected
 */
ScrollArea.prototype.viewportResized = function(size) {}

/**
 * @param {MouseWheelEvent|goog.events.Event} event
 * @protected
 */
ScrollArea.prototype.wheelEvent = function(event) {
	event.preventDefault();

	var deltaX = event.deltaX / 9;
	var deltaY = event.deltaY / 9;

	var newX = this.horizontalScrollBar_.value() + deltaX * this.horizontalScrollBar_.singleStep();
	var newY = this.verticalScrollBar_.value() + deltaY * this.verticalScrollBar_.singleStep();
	this.scrollTo(newX, newY);
};


// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @param {number} hPos
 * @private
 */
ScrollArea.prototype.onHorizontalScrollValueChanged_ = function(hPos) {
	this.scrollContentsTo(hPos, this.verticalScrollBar_.value());
};

/**
 * @param {number} vPos
 * @private
 */
ScrollArea.prototype.onVerticalScrollValueChanged_ = function(vPos) {
	this.scrollContentsTo(this.horizontalScrollBar_.value(), vPos);
};

/**
 * @private
 */
ScrollArea.prototype.updateChildGeometriesAndVisibility_ = function() {
	if (!this.isInDocument())
		return;

	var size = this.scrollableSize();
	var sbw = ScrollBar.width();

	var needsHScroll = (this.horizontalScrollBarPolicy_ === ScrollBarPolicy.On) ? true : false;
	var maybeNeedsHScroll = false;
	var needsVScroll = (this.verticalScrollBarPolicy_ === ScrollBarPolicy.On) ? true : false;
	var maybeNeedsVScroll = false;

	var margins = this.viewportMargins_;
	if (this.horizontalScrollBarPolicy_ === ScrollBarPolicy.Auto) {
		var viewWidthMinusMargins = this.size_.width - margins.left - margins.right;
		if (size.width > viewWidthMinusMargins)
			needsHScroll = true;
		else if (size.width > viewWidthMinusMargins - sbw)
			maybeNeedsHScroll = true;
	}

	if (this.verticalScrollBarPolicy_ === ScrollBarPolicy.Auto) {
		var viewHeightMinusMargins = this.size_.height - margins.top - margins.bottom;
		if (size.height > viewHeightMinusMargins)
			needsVScroll = true;
		else if (size.height > viewHeightMinusMargins - sbw)
			maybeNeedsVScroll = true;
	}

	if (needsHScroll && maybeNeedsVScroll)
		needsVScroll = true;
	if (needsVScroll && maybeNeedsHScroll)
		needsHScroll = true;

	// Configure the width and height of the viewport; note that after subtracting the scroll bar width and margins,
	// 1 pixel more is added to the width of the viewport. This recaptures the extra pixel needed in the
	// scrollbar definition for it to work properly (to have the browser create a native scrollbar, we
	// must have room for the native scrollbar + 1 pixel for the oversized element). Since both scrollbars
	// in this widget are absolutely positioned, reclaiming this one pixel does not adversely impact anything.
	var newViewportSize = this.size_.clone();
	newViewportSize.width += -margins.left - margins.right;
	newViewportSize.height += -margins.top - margins.bottom;
	if (needsHScroll)
		newViewportSize.height += -sbw + 1;
	if (needsVScroll)
		newViewportSize.width += -sbw + 1;

	if (newViewportSize.width < 0)
		newViewportSize.width = 0;
	if (newViewportSize.height < 0)
		newViewportSize.height = 0;

	if (!Size.equals(newViewportSize, this.viewportSize_)) {
		style.setSize(this.viewport, newViewportSize);
		this.viewportSize_ = newViewportSize;

		// Update the scrollbar dimensions regardless if the scrollbars are visible. This is to ensure that when the
		// scrollable size is updated, the scrollbar ranges are also correct which is dependent upon proper dimensions
		// to determine its maximum value.
		this.horizontalScrollBar_.setWidth(newViewportSize.width);
		this.horizontalScrollBar_.getElement().style.left = margins.left + 'px';

		this.verticalScrollBar_.setHeight(newViewportSize.height);
		this.verticalScrollBar_.getElement().style.top = margins.top + 'px';

		// Call the virtual stub
		this.viewportResized(newViewportSize);
	}

	// Update the viewport margins accordingly
	var rightMargin = margins.right + (needsHScroll) ? sbw : 0;
	var bottomMargin = margins.bottom + (needsVScroll) ? sbw : 0;
	this.viewport.style.margin = margins.top + 'px ' + rightMargin + 'px ' + bottomMargin + 'px ' + margins.left + 'px';

	// And toggle the scrollbar visibility
	this.horizontalScrollBar_.setVisible(needsHScroll);
	this.verticalScrollBar_.setVisible(needsVScroll);
};

/*******************************************************************************************************************/});
