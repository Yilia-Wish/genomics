goog.provide('ag.ui.AbstractSequenceTextView');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.style');
goog.require('goog.userAgent');

goog.require('goog.dom.Range');
goog.require('goog.events.BrowserEvent');
goog.require('goog.events.KeyCodes');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');
goog.require('goog.Timer');

goog.require('ag');
goog.require('ag.core.ClosedIntRange');
goog.require('ag.core.UnitRect');
goog.require('ag.meta.MetaObject');
goog.require('ag.ui.Clipboard');
goog.require('ag.ui.ISequenceTextView');
goog.require('ag.ui.ISequenceTextView.Highlight');
goog.require('ag.ui.ScrollArea');
goog.require('ag.ui.ScrollBar');

/**
 * @constructor
 * @implements {ag.ui.ISequenceTextView}
 * @extends {ag.ui.ScrollArea}
 */
ag.ui.AbstractSequenceTextView = function() {
	goog.base(this);

	// --------------------------------------------------------------------------------------------------------------------
	// Protected members
	/**
	 * @type {string}
	 * @protected
	 */
	// this.font = '12px LiberationMonoRegular';
	this.font = '12px monospace';

	/**
	 * @type {Array.<ag.ui.ISequenceTextView.Highlight>}
	 * @protected
	 */
	this.highlights = [];

	/**
	 * @type {Object}
	 * @protected
	 */
	this.renderData = {
		lineHeight: 0,
		charWidth: 0,
		halfCharWidth: 0, 		// Stored in fractional coordinates for determining which side of the character the mouse click occurred
		marginWidth: 0,
		bodyWidth: 0,
		charsPerLine: 0,
		totalLines: 0,
		// A cell equals one contiguous block of up to charsPerCell characters
		totalCells: 0,
		horzCellSpacing: 0,
		cellsPerLine: 0,
		// The width of a complete cell including its terminal cell spacing in pixels
		fullCellWidth: 0,

		// Non-computed/user-configurable values are below
		// Horizontal padding between for margins and body
		horzPadding: 4,
		// Vertical padding for all content
		vertPadding: 4,
		charsPerCell: 10
	};

	/**
	 * @type {ag.core.ClosedIntRange}
	 * @protected
	 */
	this.selection_ = new ag.core.ClosedIntRange();

	/**
	 * @type {string}
	 * @protected
	 */
	this.sequence = '';

	/**
	 * @type {number}
	 * @protected
	 */
	this.y = 0;

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {boolean}
	 * @private
	 */
	this.allowEmptySelection_ = true;

	/**
	 * @type {boolean}
	 * @private
	 */
	this.allowSelect_ = true;

	/**
	 * 0-based location of the anchor point for the caret (e.g. during a selection)
	 *
	 * @type {number}
	 * @private
	 */
	this.caretAnchor_ = 0;

	/**
	 * 0-based location of the caret
	 *
	 * @type {number}
	 * @private
	 */
	this.caretPos_ = 0;

	/**
	 * Amount to scroll in pixels per tick of the scroll timer.
	 * 
	 * @type {number}
	 * @private
	 */
	this.deltaYScrollPerTick_ = 0;

	/**
	 * @type {goog.Timer}
	 * @private
	 */
	this.scrollTimer_ = new goog.Timer(ag.ui.AbstractSequenceTextView.SCROLL_TIMER_INTERVAL_);
};
goog.inherits(ag.ui.AbstractSequenceTextView, ag.ui.ScrollArea);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;
var classes = goog.dom.classes;
var dom = goog.dom;
var events = goog.events;
var math = goog.math;
var style = goog.style;
var userAgent = goog.userAgent;

var BrowserEvent = events.BrowserEvent;
var Coordinate = goog.math.Coordinate;
var KeyCodes = events.KeyCodes;
var Size = goog.math.Size;
var Timer = goog.Timer;

var AbstractSequenceTextView = ag.ui.AbstractSequenceTextView;
var Clipboard = ag.ui.Clipboard.getInstance;
var ClosedIntRange = ag.core.ClosedIntRange;
var Highlight = ag.ui.ISequenceTextViewHighlight;
var ScrollBar = ag.ui.ScrollBar;
var UnitRect = ag.core.UnitRect;

var metaObject = ag.meta.MetaObject.getInstance;

// --------------------------------------------------------------------------------------------------------------------
// Static properties
/** @type {number} */
AbstractSequenceTextView.SCROLL_TIMER_INTERVAL_ = 50;		// ms

/** @enum {number} */
AbstractSequenceTextView.SELECTION_TYPE = {
	Single: 0,
	DoubleNoOverlap: 1,
	NoLeftArm: 2,
	NoRightArm: 3,
	MultiOverlap: 4,
	MultiNoOverlap: 5,
	MultiTouchingNoOverlap: 6
};

/** @enum {string} */
AbstractSequenceTextView.SignalType = {
	// selection
	SELECTION_CHANGED: events.getUniqueId('selection-changed')
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @override */
AbstractSequenceTextView.prototype.addHighlight = function(highlight) {
	assert(highlight.location.begin > 0);
	assert(highlight.location.end <= this.sequence.length);
	assert(highlight.location.isNormal());

	this.highlights.push(highlight);
};

/** @return {boolean} */
AbstractSequenceTextView.prototype.allowEmptySelection = function() {
	return this.allowEmptySelection_;
};

/** @override */
AbstractSequenceTextView.prototype.allowSelect = function() {
	return this.allowSelect_;
};

/** @return {Size} */
AbstractSequenceTextView.prototype.blockSize = goog.abstractMethod;

/** @override */
AbstractSequenceTextView.prototype.clearHighlights = function() {
	array.clear(this.highlights);
};

/** @override */
AbstractSequenceTextView.prototype.clearSelection = function() {
	this.setSelection(new ClosedIntRange());
};

/** @override */
AbstractSequenceTextView.prototype.canDecorate = function(element) {
	return element.tagName === 'DIV';
};

/** @override */
AbstractSequenceTextView.prototype.enterDocument = function() {
	goog.base(this, 'enterDocument');

	// It is not possible to get accurate rendering metrics until after the component has been rendered into the
	// document. Therefore, we wait until here to compute the render data.
	this.computeRenderData_();

	this.eventHandler().listen(this.scrollTimer_, Timer.TICK, this.onScrollTimeOut_)
					   .listen(this.getElement(), events.EventType.KEYDOWN, this.onKeyDown_);
};

/** @override */
AbstractSequenceTextView.prototype.exitDocument = function() {
	goog.base(this, 'exitDocument');

	this.eventHandler().unlisten(this.scrollTimer_, Timer.TICK, this.onScrollTimeOut_)
					   .unlisten(this.getElement(), events.EventType.KEYDOWN, this.onKeyDown_);
};

/** @return {boolean} */
AbstractSequenceTextView.prototype.isSelectionEmpty = function() {
	return this.selection_.begin === 0;
};

/** 
 * Selects the entire sequence
 */
AbstractSequenceTextView.prototype.selectAll = function() {
	if (this.sequence.length)
		this.setSelection(new ClosedIntRange(1, this.sequence.length));
};

/** @override */
AbstractSequenceTextView.prototype.selectedSequence = function() {
	return (!this.isSelectionEmpty()) ? this.sequence.substr(this.selection_.begin - 1, this.selection_.length()) : '';
};

/** @override */
AbstractSequenceTextView.prototype.selection = function() {
	return !this.isSelectionEmpty() ? this.selection_.clone() : null;
};

/**
 * @param {boolean} newAllowEmptySelection
 */
AbstractSequenceTextView.prototype.setAllowEmptySelection = function(newAllowEmptySelection) {
	if (this.allowEmptySelection_ === newAllowEmptySelection)
		return;

	this.allowEmptySelection_ = newAllowEmptySelection;
	if (!this.allowEmptySelection_ && this.isSelectionEmpty() && this.sequence.length)
		this.setSelection(new ClosedIntRange(1));
};

/** @override */
AbstractSequenceTextView.prototype.setAllowSelect = function(allowSelect) {
	this.allowSelect_ = allowSelect;
	if (!this.allowSelect_ && !this.isSelectionEmpty())
		this.clearSelection();
};

/** @override */
AbstractSequenceTextView.prototype.setSelection = function(newSelection) {
	assert(newSelection instanceof ClosedIntRange);
	if (this.selection_.normalized().eq(newSelection.normalized()))
		return;

	this.setSelectionValues_(newSelection.begin, newSelection.end);
};

/**
 * @param {number} newSelectionStart
 */
AbstractSequenceTextView.prototype.setSelectionStart = function(newSelectionStart) {
	if (this.selection_.begin === newSelectionStart)
		return;

	this.setSelectionValues_(newSelectionStart, this.selection_.end);
};

/**
 * @param {number} newSelectionStop
 */
AbstractSequenceTextView.prototype.setSelectionStop = function(newSelectionStop) {
	if (this.selection_.end === newSelectionStop)
		return;

	this.setSelectionValues_(this.selection_.begin, newSelectionStop);
};

/**
 * @param {string} newSequence
 */
AbstractSequenceTextView.prototype.setSequence = function(newSequence) {
	assert(goog.isString(newSequence));
	this.y = 0;
	this.sequence = newSequence;
	this.clearHighlights();
	this.clearSelection();
	if (!this.isInDocument())
		return;

	this.computeRenderData_();
};

// --------------------------------------------------------------------------------------------------------------------
// Protected methods
/** @override */
AbstractSequenceTextView.prototype.createViewport = function() {
	var div = this.dom_.createDom('div');

	var blockSize = this.blockSize();
	this.renderData.lineHeight = blockSize.height;
	this.renderData.charWidth = blockSize.width;
	this.renderData.horzCellSpacing = blockSize.width;
	this.renderData.halfCharWidth = this.renderData.charWidth / 2;

	this.verticalScrollBar().setSingleStep(3 * blockSize.height);

	return div;
};

/** @override */
AbstractSequenceTextView.prototype.decorateInternal = function(element) {
	goog.base(this, 'decorateInternal', element);

	classes.add(element, goog.getCssName('ag-sequenceTextView'));

	// Access the clipboard object to ensure that it is available *before* any copy command is issued.
	// This merely instantiates the object if it is not already available so that there is no delay
	// when a copy request is performed.
	Clipboard();
};

/** @override */
AbstractSequenceTextView.prototype.keyDownEvent = function(event) {
	// Test for copy keyboard shortcut = Ctrl-C or Ctrl-Insert on every OS except Mac (in which case Meta = Control)
	var keyCode = event.keyCode;
	if (keyCode === KeyCodes.C || keyCode === KeyCodes.INSERT) {
		var doCopy = !userAgent.MAC ? event.ctrlKey : event.metaKey;
		if (doCopy) {
			var selectedSequence = this.selectedSequence();
			if (selectedSequence.length)
				Clipboard().copy(selectedSequence, this.getElement());
			return;
		}
	}
};

/**
 * Returns the 0-based line corresponding to seqPos.
 *
 * @param {number} seqPos integral 1-based sequence coordinate
 * @return {number}
 * @protected
 */
AbstractSequenceTextView.prototype.lineFromSeqPos = function(seqPos) {
	assert(seqPos > 0);
	assert(seqPos <= this.sequence.length);

	return ((seqPos - 1) / this.renderData.charsPerLine) | 0;
};

/** @override */
AbstractSequenceTextView.prototype.mouseDownEvent = function(event) {
	// Focus the core element so that it can respond to keyboard events. This would normally happen automatically,
	// but since we are preventing the default action, we have to do it manually.
	this.getElement().focus();
	event.preventDefault();
	if (!this.allowSelect_)
		return;

	// Remove any potential existing browser selection. Especially helpful for FF.
	dom.Range.clearSelection();

	// Vital that the handlers capture the mouse events at the body level to handle mouse events when
	// that occur outside the viewport element.
	var eventHandler = this.eventHandler();
	eventHandler.listen(document, events.EventType.MOUSEMOVE, this.onMouseMove_, true /* optCapture */)
				.listen(document, events.EventType.MOUSEUP, this.onMouseUp_, true /* optCapture */);

	// this.clearSelection();

	// Not all subclasses are created equally and therefore it is vital to map the event coordinates to the sequence area space
	// to properly determine the selection.
	var sequenceAreaCoords = this.mouseTargetEventCoordsToSequenceArea(event);
	this.caretAnchor_ = this.caretPos_ = this.caretPosFromViewPosition_(sequenceAreaCoords[0], sequenceAreaCoords[1]);
	this.setSelectionFromCaretRange_();
};

/**
 * Specialized function for mapping coordinate in mouse target space to the relevant sequence area space. For subclass
 * implementations that include the sequence area as part of the mousable area (e.g. canvas), then it will be necessary
 * to provide the relevant translation here. The default implementation simply returns the coordinates as is.
 * 
 * @param {BrowserEvent} event
 * @return {Array.<number>}
 * @protected
 */
AbstractSequenceTextView.prototype.mouseTargetEventCoordsToSequenceArea = function(event) {
	return [event.offsetX, event.offsetY];
};

/**
 * Returns the HTMLElement responsible for dealing with mouse events.
 *
 * @return {HTMLElement}
 * @protected
 */
AbstractSequenceTextView.prototype.mouseEventTarget = goog.abstractMethod;

/**
 * @protected
 */
AbstractSequenceTextView.prototype.renderDataChanged = function() {};

/** @override */
AbstractSequenceTextView.prototype.scrollContentsTo = function(x, y) {
	this.y = y;
};

/**
 * Computes the set of UnitRect's in scrollable space and the body rectangle that correspond to a specific sequence
 * range. More specifically, an X coordinate of 0 refers to the leftmost edge of the content space.
 *
 * @param {ClosedIntRange} seqLocation
 * @return {Array.<UnitRect>}
 * @protected
 */
AbstractSequenceTextView.prototype.regionFromSeqRange = function(seqLocation) {
	var startLine = this.lineFromSeqPos(seqLocation.begin);
	var stopLine = this.lineFromSeqPos(seqLocation.end);

	var renderData = this.renderData;
	var x1 = this.offsetXForSeqPos_(seqLocation.begin);
	var y = renderData.vertPadding + startLine * renderData.lineHeight;
	var x2 = this.offsetXForSeqPos_(seqLocation.end) + renderData.charWidth;

	var rects = [];
	if (startLine === stopLine) {
		rects.push(new UnitRect(x1, y, x2 - x1, renderData.lineHeight));
	}
	else {
		rects.push(new UnitRect(x1, y, renderData.maxRightX - x1 - renderData.horzPadding, renderData.lineHeight));
		y += renderData.lineHeight;
		if (startLine + 1 < stopLine) {
			var h = renderData.lineHeight * (stopLine - startLine + 1 - 2);
			//                                                        ^^^ skip the first and last lines, which are separately calculated
			rects.push(new UnitRect(renderData.horzPadding, y, renderData.maxRightX - 2*renderData.horzPadding, h));
			y += h;
		}
		rects.push(new UnitRect(renderData.horzPadding, y, x2 - renderData.horzPadding, renderData.lineHeight));
	}
	return rects;
};

/**
 * Virtual stub for downstream classes to react to selection changes.
 * @protected
 */
AbstractSequenceTextView.prototype.selectionChanged = function() {};

/**
 *
 * Cases:
 * 1) Single block:  ooooooooooo (can be multi line)
 * 2) Adjacent lines, not-overlapping:
 *    L1:             ooooooo
 *    L2:  ooooooo
 * 3) No left arm:
 *    L1:  oooooooooooooooooooooooo
 *    L2:  oooooooooo
 * 4) No right arm:
 *    L1:                    oooooo
 *    L2: ooooooooooooooooooooooooo
 * 5) Multi line overlap
 *    L1:            oooooooooooooo
 *    L2: oooooooooooooooooo
 * 6) Multi line no overlap
 *    L1:            oooooooooooooo
 *    L2: ooooooooooooooooooooooooo
 *    L3: oooooo
 * 7) Multi line touching no overlap
 *    L1:            oooooooooooooo
 *    L2: ooooooooooooooooooooooooo
 *    L3: ooooooooooo
 *
 * @param {ClosedIntRange} seqLocation
 * @return {Object}
 * @protected
 */
AbstractSequenceTextView.prototype.verticalRegionFromSeqRange = function(seqLocation) {
	var startLine = this.lineFromSeqPos(seqLocation.begin);
	var stopLine = this.lineFromSeqPos(seqLocation.end);

	var renderData = this.renderData;
	var horzPadding = renderData.horzPadding;
	var lineHeight = renderData.lineHeight;
	var x1 = Math.round(this.offsetXForSeqPos_(seqLocation.begin));
	var y1 = renderData.vertPadding + startLine * lineHeight;
	var x2 = Math.round(this.offsetXForSeqPos_(seqLocation.end) + renderData.charWidth);
	var y2 = Math.round(y1 + (stopLine - startLine + 1) * lineHeight);
	//       ^^^^^^^^^^ For browsers with fractional values for their font widths, this prevents any jittering when
	// the selection is changing rapidly
	// Note: we round y1 only after its unrounded version has been used in the calculation of y2
	y1 = Math.round(y1);
	var xW = x2 - x1;
	var yH = y2 - y1;
	lineHeight = Math.round(lineHeight);

	var x1AtFarLeft = x1 === horzPadding;
	var x2AtFarRight = x2 === renderData.maxRightX - horzPadding;

	var type = -1;
	var rects = [];
	var baseRect = (xW != 0) ? new UnitRect(x1, y1, xW, yH) : null;
	// Case 1: single block
	if (startLine === stopLine || (x1AtFarLeft && x2AtFarRight)) {
		assert(baseRect);
		rects.push(baseRect);
		type = AbstractSequenceTextView.SELECTION_TYPE.Single;
	}
	else {
		var overlaps = x1 < x2;
		var adjacent = startLine + 1 === stopLine;
		// Case 2: adjacent, non-overlapping lines
		if (adjacent && !overlaps) {
			type = AbstractSequenceTextView.SELECTION_TYPE.DoubleNoOverlap;
			rects.push(new UnitRect(horzPadding, y1 + lineHeight, x2 - horzPadding, lineHeight));
			rects.push(new UnitRect(x1, y1, renderData.maxRightX - horzPadding - x1, lineHeight));
		}
		// Case 3: no left arm
		else if (x1AtFarLeft) {
			assert(baseRect);
			type = AbstractSequenceTextView.SELECTION_TYPE.NoLeftArm;
			rects.push(baseRect);
			rects.push(new UnitRect(x2, y1, renderData.maxRightX - x2 - horzPadding, yH - lineHeight));
		}
		// Case 4: no right arm
		else if (x2AtFarRight) {
			assert(baseRect);
			type = AbstractSequenceTextView.SELECTION_TYPE.NoRightArm;
			rects.push(new UnitRect(horzPadding, y1 + lineHeight, x1 - horzPadding, yH - lineHeight));
			rects.push(baseRect);
		}
		else  {
			var midX1;
			var midX2;
			if (overlaps) {
				midX1 = x1;
				midX2 = x2;
			}
			else {
				midX1 = x2;
				midX2 = x1;
			}
			var midW = midX2 - midX1;
			// Cases 5 & 6: overlapping vertical spread in middle
			rects.push(new UnitRect(horzPadding, y1 + lineHeight, midX1 - horzPadding, yH - lineHeight));
			if (overlaps) {
				type = AbstractSequenceTextView.SELECTION_TYPE.MultiOverlap;
				rects.push(new UnitRect(midX1, y1, midW, yH));
			}
			else {
				type = (midW > 0) ? AbstractSequenceTextView.SELECTION_TYPE.MultiNoOverlap : AbstractSequenceTextView.SELECTION_TYPE.MultiTouchingNoOverlap;
				rects.push(new UnitRect(midX1, y1 + lineHeight, Math.max(1, midW), yH - 2*lineHeight));
			}
			rects.push(new UnitRect(midX2, y1, renderData.maxRightX - horzPadding - midX2, yH - lineHeight));
		}
	}
	return {
		rects: rects,
		type: type
	};
};

/** @override */
AbstractSequenceTextView.prototype.resized = function(size) {
	this.computeRenderData_();
};


// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @param {number} x relative to top left of sequence area
 * @param {number} y relative to top left of sequence area
 * @return {number}
 */
AbstractSequenceTextView.prototype.caretPosFromViewPosition_ = function(x, y) {
	var xPos = x;
	if (this.allowEmptySelection_)
		// When we allow empty selection, shift the xpos by half a char width to simulate
		// clicking between letters.
		xPos += this.renderData.halfCharWidth;
		//      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ makes it possible to determine which side of the character was clicked
		// because the charsLeftOf_ will floor the value.

	return Math.min(this.sequence.length - 1, this.charsAbove_(y) + this.charsLeftOf_(xPos));
	//              ^^^^^^^^^^^^^^^^^^^^^^^^ = zero-based
};

/**
 * @param {number} y pixel coordinate in body space (should include any padding)
 * @return {number}
 */
AbstractSequenceTextView.prototype.charsAbove_ = function(y) {
	var renderData = this.renderData;
	y = Math.max(0, y - renderData.vertPadding);
	y += this.y;
	var linesAbove = (y / renderData.lineHeight) | 0;
	return linesAbove * renderData.charsPerLine;
};

/**
 * @param {number} x pixel coordinate in body space (should include any padding)
 * @return {number}
 */
AbstractSequenceTextView.prototype.charsLeftOf_ = function(x) {
	var renderData = this.renderData;
	x -= renderData.horzPadding;

	var chars = (x / renderData.charWidth) | 0;
	var nSpaces = (x / renderData.fullCellWidth) | 0;
	return math.clamp(0, chars - nSpaces, renderData.charsPerLine);
};

/**
 * @return {number}
 * @private
 */
AbstractSequenceTextView.prototype.computeLineCounts_ = function() {
	var contentWidth = this.contentWidth_();

	var renderData = this.renderData;
	if (renderData.totalCells !== 0) {
		var columnPx = renderData.charWidth * renderData.charsPerCell;
		var columnWithSpacingPx = columnPx + renderData.horzCellSpacing;
		// var cellsPerLine = Math.max(1, Math.floor(contentWidth / columnWithSpacingPx));
		var cellsPerLine = Math.max(1, (contentWidth / columnWithSpacingPx) | 0);
		//                 ^^^^^^^^^^  at least one cell per line, period.
		// If we removed the terminal horzCellSpacing, could we fit another column? This would be
		// desirable
		if (contentWidth - (cellsPerLine * columnWithSpacingPx) >= columnPx)
			cellsPerLine++;

		renderData.fullCellWidth = columnWithSpacingPx;
		renderData.cellsPerLine = cellsPerLine;
		renderData.charsPerLine = renderData.cellsPerLine * renderData.charsPerCell;
		renderData.totalLines = Math.ceil(renderData.totalCells / renderData.cellsPerLine);
	}
	else {
		renderData.cellsPerLine = 1;
		renderData.charsPerLine = (contentWidth / renderData.charWidth) | 0;
		renderData.fullCellWidth = renderData.charsPerLine * renderData.charWidth;
		renderData.totalCells = renderData.totalLines = Math.ceil(this.sequence.length / renderData.charsPerLine);
	}
};

/**
 * Body and margin widths include horizontal padding.
 *
 * @private
 */
AbstractSequenceTextView.prototype.computeRenderData_ = function() {
	var widgetSize = this.size();
	if (!widgetSize.width || !widgetSize.height) {
		if (goog.DEBUG)
			console.log('Warning! Sequence text view tried to compute render data, but has invalid width/height');		
		return;
	}

	var renderData = this.renderData;

	// Determine variables without scrollbar
	renderData.totalCells = renderData.charsPerCell > 0 ? Math.ceil(this.sequence.length / renderData.charsPerCell) : 0;
	renderData.marginWidth = (this.sequence.length + '').length * renderData.charWidth + 2*renderData.horzPadding;
	renderData.bodyWidth = Math.max(0, widgetSize.width - 2*renderData.marginWidth);
	//         ^^^^^^^^^ This is the full width available to be used by the sequence area.
	this.computeLineCounts_();

	var totalHeightWithoutScrollBar = renderData.totalLines * renderData.lineHeight + 2*renderData.vertPadding;
	if (totalHeightWithoutScrollBar > this.height()) {
		renderData.bodyWidth = Math.max(0, renderData.bodyWidth - ScrollBar.width());
		this.computeLineCounts_();
	}
	renderData.maxRightX = Math.ceil(2*renderData.horzPadding + renderData.charWidth * renderData.charsPerLine + renderData.horzCellSpacing*(renderData.cellsPerLine-1));

	var totalHeight = renderData.totalLines*renderData.lineHeight + 2*renderData.vertPadding;
	this.setScrollableSize(new Size(renderData.bodyWidth, totalHeight));

	// Call virtual stub
	this.renderDataChanged();
};

/**
 * Returns the width of the body area minus any horizontal padding
 *
 * @return {number}
 * @private
 */
AbstractSequenceTextView.prototype.contentWidth_ = function() {
	return this.renderData.bodyWidth - 2*this.renderData.horzPadding;
};

/**
 * @param {BrowserEvent} event
 * @private
 */
AbstractSequenceTextView.prototype.onMouseMove_ = function(event) {
	event.preventDefault();

	var mouseEventTarget = this.mouseEventTarget();
	var widget = this.viewport;
	if (event.target === mouseEventTarget || dom.getAncestor(event.target, function(node) { return node === widget; }, false, 2)) {
		//                                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
		// Check if we are inside the viewport but not directly on the mouse target
		this.scrollTimer_.stop();
		var sequenceAreaCoords = this.mouseTargetEventCoordsToSequenceArea(event);
		this.caretPos_ = this.caretPosFromViewPosition_(sequenceAreaCoords[0], sequenceAreaCoords[1]);
		this.setSelectionFromCaretRange_();
	}
	else {
		var relPos = style.getRelativePosition(event, widget);
		var widgetHeight = this.size().height;
		// A: is it above the canvas?
		if (relPos.y < 0) {
			this.deltaScrollY_ = relPos.y;
			this.scrollTimer_.start();
		}
		// B: Below the canvas?
		else if (relPos.y > widgetHeight) {
			this.deltaScrollY_ = relPos.y - widgetHeight;
			this.scrollTimer_.start();
		}
		// C: Beside the canvas?
		else {
			this.scrollTimer_.stop();
		}
	}
};

/**
 * @param {BrowserEvent} event
 * @private
 */
AbstractSequenceTextView.prototype.onMouseUp_ = function(event) {
	this.scrollTimer_.stop();

	var eventHandler = this.eventHandler();
	eventHandler.unlisten(document, events.EventType.MOUSEMOVE, this.onMouseMove_, true /* optCapture */)
				.unlisten(document, events.EventType.MOUSEUP, this.onMouseUp_, true /* optCapture */);
};

/**
 * @param {number} seqPos integral, 1-based sequence coordinate
 * @return {number}
 * @private
 */
AbstractSequenceTextView.prototype.offsetXForSeqPos_ = function(seqPos) {
	assert(seqPos > 0);
	assert(seqPos <= this.sequence.length);

	var renderData = this.renderData;
	var posForLine = (seqPos-1) % renderData.charsPerLine;
	//                ^^^^^^^^ convert to zero-based
	var nSpaces = (posForLine / renderData.charsPerCell) | 0;
	return renderData.horzPadding + renderData.charWidth * (posForLine + nSpaces);
};

/**
 * @param {goog.events.BrowserEvent} keyEvent
 * @private
 */
AbstractSequenceTextView.prototype.onKeyDown_ = function(keyEvent) {
	if (keyEvent.keyCode === KeyCodes.A && ag.xOsCtrlPressed(keyEvent)) {
		this.selectAll();
		keyEvent.preventDefault();
	}
};

/**
 * @param {goog.events.BrowserEvent} event
 * @private
 */
AbstractSequenceTextView.prototype.onScrollTimeOut_ = function(event) {
	this.verticalScrollBar().setValue(this.verticalScrollBar().value() + this.deltaScrollY_);

	// Update the selection
	if (this.deltaScrollY_ < 0) {
		// Scrolling up
		this.caretPos_ = this.caretPosFromViewPosition_(0, 0);
	}
	else {
		var viewSize = this.viewportSize();
		this.caretPos_ = this.caretPosFromViewPosition_(viewSize.width, viewSize.height);
	}

	this.setSelectionFromCaretRange_();
};

/** @private */
AbstractSequenceTextView.prototype.setSelectionFromCaretRange_ = function() {
	var start, stop;
	if (this.allowEmptySelection_) {
		if (this.caretPos_ === this.caretAnchor_) {
			this.clearSelection();
			return;
		}
		else if (this.caretPos_ < this.caretAnchor_) {
			start = this.caretPos_ + 1;
			stop = this.caretAnchor_;
		}
		else {	// caretPos > this.caretAnchor
			start = this.caretAnchor_ + 1;
			stop = this.caretPos_;
		}
	}
	else {
		if (this.caretPos_ === this.caretAnchor_) {
			start = stop = this.caretPos_ + 1;
		}
		else if (this.caretPos_ < this.caretAnchor_) {
			start = this.caretPos_ + 1;
			stop = this.caretAnchor_ + 1;
		}
		else {	// caretPos > this.caretAnchor
			start = this.caretAnchor_ + 1;
			stop = this.caretPos_ + 1;
		}
	}

	this.setSelectionValues_(start, stop);
};

/**
 * @param {number} start
 * @param {number} stop
 * @private
 */
AbstractSequenceTextView.prototype.setSelectionValues_ = function(start, stop) {
	this.selection_.begin = start;
	this.selection_.end = stop;
	if (!this.selection_.isNormal())
		this.selection_ = this.selection_.normalized();

	// Allow subclasses to respond to this signal first
	this.selectionChanged();

	// and then tell the rest of the world
	metaObject().emit(this, AbstractSequenceTextView.SignalType.SELECTION_CHANGED, this.selection());
	// Call the function because if the selection is empty, we want to emit null        ^^^^^^^^^^^
	// rather than the internal selection instance which is always non-null.
};


/*******************************************************************************************************************/});
