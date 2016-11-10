goog.provide('ag.ui.DivSequenceTextView');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.style');
goog.require('goog.math.Size');
goog.require('goog.userAgent');

goog.require('ag');
goog.require('ag.core.ClosedIntRange');
goog.require('ag.core.UnitRect');
goog.require('ag.ui.AbstractSequenceTextView');
goog.require('ag.ui.ISequenceTextView');

/**
 * Uses native HTML elements to model a sequence text view. Requires a monospace font for proper execution.
 *
 * Vital to use the border-box box-sizing model.
 * 
 * @constructor
 * @implements {ag.ui.ISequenceTextView}
 * @extends {ag.ui.AbstractSequenceTextView}
 */
ag.ui.DivSequenceTextView = function() {
	goog.base(this);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {goog.math.Size}
	 * @private
	 */
	this.blockSize_ = ag.ui.DivSequenceTextView.calcBlockSize_(this.font);

	/**
	 * @type {HTMLDivElement}
	 * @private
	 */
	this.leftNumberDiv_ = null;

	/**
	 * Amount of a single line that the view is scrolled upwards. 
	 * 
	 * @type {number}
	 * @private
	 */
	this.yOrigin_ = 0;

	/**
	 * @type {HTMLDivElement}
	 * @private
	 */
	this.rightNumberDiv_ = null;

	/**
	 * Three selection divs for emulating the current user selection.
	 *
	 * @type {Array.<HTMLDivElement>}
	 * @private
	 */
	this.selectionDivs_ = [];

	/**
	 * @type {HTMLDivElement}
	 * @private
	 */
	this.selectionLayerDiv_ = null;

	/**
	 * @type {HTMLDivElement}
	 * @private
	 */
	this.sequenceDiv_ = null;
};
goog.inherits(ag.ui.DivSequenceTextView, ag.ui.AbstractSequenceTextView);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var classes = goog.dom.classes;
var dom = goog.dom;
var style = goog.style;
var userAgent = goog.userAgent;

var Size = goog.math.Size;

var AbstractSequenceTextView = ag.ui.AbstractSequenceTextView;
var ClosedIntRange = ag.core.ClosedIntRange;
var DivSequenceTextView = ag.ui.DivSequenceTextView;

// --------------------------------------------------------------------------------------------------------------------
// Constants
/** @enum {string} */
DivSequenceTextView.Css = {
	SelectionClass: goog.getCssName('selection'),
	NumberMarginClass: goog.getCssName('numbers')
};

var Css = DivSequenceTextView.Css;

// --------------------------------------------------------------------------------------------------------------------
// Private properties
DivSequenceTextView.NBSP_ = String.fromCharCode(160);

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @override */
DivSequenceTextView.prototype.addHighlight = function(highlight) {
	goog.base(this, 'addHighlight', highlight);

	this.buildAssociateAndDisplayDivsForHighlight_(highlight);
};

/** @override */
DivSequenceTextView.prototype.blockSize = function() {
	return this.blockSize_;
};

/** @override */
DivSequenceTextView.prototype.clearHighlights = function() {
	var highlights = this.highlights;
	for (var i=0, z=highlights.length; i<z; i++)
		DivSequenceTextView.removeHighlightFromDom_(highlights[i]);

	goog.base(this, 'clearHighlights');
};

/** @override */
DivSequenceTextView.prototype.clearSelection = function() {
	goog.base(this, 'clearSelection');

	if (!this.isInDocument())
		return;

	for (var i=0; i<3; i++)
		style.showElement(this.selectionDivs_[i], false);
};


// --------------------------------------------------------------------------------------------------------------------
// Protected methods
/** @override */
DivSequenceTextView.prototype.createViewport = function() {
	// --------------------------
	// Viewport
	var viewportDiv = goog.base(this, 'createViewport');

	// So that we can absolutely position layers relative to the viewport div
	viewportDiv.style.position = 'relative';
	viewportDiv.style.font = this.font;

	// Prevent text selection within the viewport div
	classes.add(viewportDiv, 'unselectable');

	// --------------------------
	// Number divs
	var leftNumberDiv = DivSequenceTextView.createAbsoluteDiv_();
	classes.add(leftNumberDiv, Css.NumberMarginClass);
	leftNumberDiv.style.font = this.font;
	this.leftNumberDiv_ = leftNumberDiv;
	viewportDiv.appendChild(leftNumberDiv);

	var rightNumberDiv = DivSequenceTextView.createAbsoluteDiv_();
	classes.add(rightNumberDiv, Css.NumberMarginClass);
	rightNumberDiv.style.font = this.font;
	this.rightNumberDiv_ = rightNumberDiv;
	viewportDiv.appendChild(rightNumberDiv);

	// --------------------------
	// Selection layer
	var selectionLayerDiv = DivSequenceTextView.createAbsoluteDiv_();
	this.selectionLayerDiv_ = selectionLayerDiv;
	viewportDiv.appendChild(selectionLayerDiv);

	// Three child divs corresponding to the active selection:
	// 1) The first covers all the lines that have at least one character selected and provides the background
	// 	  selection color (via CSS).
	// 2 & 3) Act as masks to cover up the relevant portion of the first such that it appears that the user has
	//    only selected what is highlighted.
	var lineHeight = this.blockSize().height;
	for (var i=0; i<3; i++) {
		var selDiv = DivSequenceTextView.createAbsoluteDiv_();
		classes.add(selDiv, Css.SelectionClass);
		selDiv.style.height = lineHeight + 'px';
		style.showElement(selDiv, false);
		this.selectionDivs_.push(selDiv);
		selectionLayerDiv.appendChild(selDiv);
	}

	// --------------------------
	// Sequence text div
	var sequenceDiv = DivSequenceTextView.createAbsoluteDiv_();
	sequenceDiv.style.overflow = 'hidden';
	sequenceDiv.style.font = this.font;
	this.sequenceDiv_ = sequenceDiv;
	viewportDiv.appendChild(sequenceDiv);

	return viewportDiv;
};

/** @override */
DivSequenceTextView.prototype.enterDocument = function() {
	goog.base(this, 'enterDocument');

	this.updateSelectionElements_();
};

/** @override */
DivSequenceTextView.prototype.mouseEventTarget = function() {
	return this.sequenceDiv_;
};

/** @override */
DivSequenceTextView.prototype.mouseTargetEventCoordsToSequenceArea = function(event) {
	var relPos = style.getRelativePosition(event, this.sequenceDiv_);
	relPos.y += this.yOrigin_;
	if (relPos.x < 0)
		relPos.x = 0;
	else if (relPos.x > this.renderData.bodyWidth)
		relPos.x = this.renderData.bodyWidth;
	else
		// Add in the padding that is not included in the event coordinates
		relPos.x += this.renderData.horzPadding;

	return [relPos.x, relPos.y];
};

/** @override */
DivSequenceTextView.prototype.renderDataChanged = function() {
	this.updateElementSizes_();
	this.updateElementPositions_();
	this.updateDisplayText_();
};

/** @override */
DivSequenceTextView.prototype.resized = function(size) {
	goog.base(this, 'resized', size);

	this.updateSelectionElements_();

	// Easiest to simply remove all the previously created divs and recreate them.
	for (var i=0, z=this.highlights.length; i<z; i++) {
		var highlight = this.highlights[i];
		DivSequenceTextView.removeHighlightFromDom_(highlight);
		this.buildAssociateAndDisplayDivsForHighlight_(highlight);
	}
};

/** @override */
DivSequenceTextView.prototype.scrollContentsTo = function(x, y) {
	goog.base(this, 'scrollContentsTo', x, y);

	this.updateElementPositions_();
	this.updateDisplayText_();
};

/** @override */
DivSequenceTextView.prototype.selectionChanged = function() {
	if (this.isSelectionEmpty())
		return;

	this.updateSelectionElements_();
};

// --------------------------------------------------------------------------------------------------------------------
// Private static methods
/**
 * @param {Object} region
 */
DivSequenceTextView.adjustRegionToPreventBleeding_ = function(region) {
	var rects = region.rects;
	assert(rects.length > 0 && rects.length <= 3);

	// Tweak the regions by 1 pixel to prevent showing any background lines from bleeding through as
	// a result of fractional differences. Also toggle whether to show/hide the relevant divs
	switch (region.type) {
	case AbstractSequenceTextView.SELECTION_TYPE.NoLeftArm:
		rects[1].x1--;
		break;
	case AbstractSequenceTextView.SELECTION_TYPE.NoRightArm:
		rects[0].x2++;
		break;
	case AbstractSequenceTextView.SELECTION_TYPE.MultiOverlap:
		rects[0].x2++;
		rects[2].x1--;
		break;
	case AbstractSequenceTextView.SELECTION_TYPE.MultiNoOverlap:
		rects[1].x1--;
		rects[1].x2++;
		break;
	case AbstractSequenceTextView.SELECTION_TYPE.MultiTouchingNoOverlap:
		rects[1].x1--;
		break;	
	}
};

/**
 * Calculates the block size of a div for a single character ('A') using font. Originally used the style.getSize method
 * however, this only reports integer units, which is invalid for FF. Therefore, switched to getComputedStyle which
 * accurately reports the actual size in fractional coordinates.
 *
 * @param {string} font
 * @return {Size}
 */
DivSequenceTextView.calcBlockSize_ = function(font) {
	var div = dom.createElement('div');
	style.setInlineBlock(div);
	div.style.font = font;
	dom.setTextContent(div, 'A');
	document.body.appendChild(div);
	var w = parseFloat(style.getComputedStyle(div, 'width'));
	var h = parseFloat(style.getComputedStyle(div, 'height'));
	dom.removeNode(div);
	assert(w);
	assert(h);
	return new Size(w, h);
};

/**
 * @return {HTMLDivElement}
 */
DivSequenceTextView.createAbsoluteDiv_ = function() {
	var div = dom.createElement('div');
	div.style.position = 'absolute';
	return div;
};

/**
 * @param {number} amount
 * @param {string} cssClass
 * @return {HTMLDivElement}
 */
DivSequenceTextView.createHighlightDivs_ = function(amount, cssClass) {
	assert(amount > 0);
	var divs = [];
	for (var i=0; i<amount; i++) {
		var div = DivSequenceTextView.createAbsoluteDiv_();
		classes.add(div, cssClass);
		// To place the highlight behind the selection.
		// div.style.zIndex = -1;
		divs.push(div);
	}
	return divs;
};

/**
 * @param {Object} region
 * @param {string} cssClass
 * @return {HTMLDivElement}
 */
DivSequenceTextView.createHighlightDivsForRegion_ = function(region, cssClass) {
	var rects = region.rects;
	var amount = rects.length;
	var divs = DivSequenceTextView.createHighlightDivs_(amount, cssClass);
	assert(divs.length === amount);
	for (var i=0; i<amount; i++)
		DivSequenceTextView.setGeometry_(divs[i], rects[i]);
	return divs;
};

/**
 * @param {number} number
 * @param {number} maxPadding
 * @param {boolean} optRightSide
 * @return {string}
 */
DivSequenceTextView.padNumber_ = function(number, maxPadding, optRightSide) {
	var numberString = number + '';
	var padding = DivSequenceTextView.NBSP_.repeated(maxPadding - numberString.length);
	if (optRightSide)
		numberString += padding;
	else
		numberString = padding + numberString;
	return numberString;
};

/**
 * Does not destroy the highlight, but merely removes any associated divs from the dom and removes the divs member if
 * present.
 * 
 * @param {Highlight} highlight
 */
DivSequenceTextView.removeHighlightFromDom_ = function(highlight) {
	for (var j=0, y=highlight.divs.length; j<y; j++)
		dom.removeNode(highlight.divs[j]);
	delete highlight.divs;
};

/**
 * Sets the CSS geometry of element to that in rect.
 *
 * @param {HTMLElement} element
 * @param {UnitRect} rect
 */
DivSequenceTextView.setGeometry_ = function(element, rect) {
	style.setPosition(element, rect.x1, rect.y1);
	style.setSize(element, rect.width(), rect.height());
};


// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @param {Highlight} highlight
 */
DivSequenceTextView.prototype.buildAssociateAndDisplayDivsForHighlight_ = function(highlight) {
	assert(!highlight.divs);
	
	var region = this.verticalRegionFromSeqRange(highlight.location);
	DivSequenceTextView.adjustRegionToPreventBleeding_(region);
	var divs = DivSequenceTextView.createHighlightDivsForRegion_(region, highlight.cssClass);

	// Parent to the selection layer
	for (var i=0, z=divs.length; i<z; i++)
		this.selectionLayerDiv_.appendChild(divs[i]);

	// Associate with the highlight so that we can remove them later
	highlight.divs = divs;
}

/**
 * @param {number} y
 * @return {ClosedIntRange}
 */
DivSequenceTextView.prototype.lineRangeFromY_ = function(y) {
	var vs = this.viewportSize();

	var begin = (y / this.renderData.lineHeight) | 0;
	var end = Math.min(this.renderData.totalLines - 1, begin + (vs.height / this.renderData.lineHeight | 0) + 1);
	return new ClosedIntRange(begin, end);
};

/**
 * Pads the opposing side with the appropriate number of non-breaking spaces so that there is one number
 * per line.
 * 
 * @param {ClosedIntRange} lineRange
 * @param {boolean} optRightSide defaults to false
 * @return {string}
 */
DivSequenceTextView.prototype.paddedNumberTextForRange_ = function(lineRange, optRightSide) {
	var start = lineRange.begin * this.renderData.charsPerLine + 1;
	if (optRightSide)
		start = Math.min(this.sequence.length, start + this.renderData.charsPerLine - 1);

	var maxNumberStringLength = (this.sequence.length + '').length;

	var numberText = DivSequenceTextView.padNumber_(start, maxNumberStringLength, optRightSide);
	var x = start + this.renderData.charsPerLine;
	for (var i=lineRange.begin; i< lineRange.end-1; i++, x+= this.renderData.charsPerLine)
		numberText += ' ' + DivSequenceTextView.padNumber_(x, maxNumberStringLength, optRightSide);

	if (lineRange.begin != lineRange.end) {
		var finalNumber = Math.min(this.sequence.length, x);
		numberText += ' ' + DivSequenceTextView.padNumber_(finalNumber, maxNumberStringLength, optRightSide)
	}

	return numberText;
};

/**
 * @param {ClosedIntRange} lineRange
 * @return {string}
 */
DivSequenceTextView.prototype.sequenceForRange_ = function(lineRange) {
	var renderData = this.renderData;
	var startCell = lineRange.begin * renderData.cellsPerLine;
	var endCell = Math.min(((lineRange.end+1) * renderData.cellsPerLine), renderData.totalCells);
	var spacedSequence = this.sequence.substr(startCell*renderData.charsPerCell, renderData.charsPerCell);
	for (var i=startCell+1, j=i*renderData.charsPerCell; i< endCell; i++, j += renderData.charsPerCell)
		spacedSequence += ' ' + this.sequence.substr(j, renderData.charsPerCell);

	// HACK! Prevent extra line from appearing in space between last cell column and scrollbar
	if (endCell === renderData.totalCells) {
		var remainder = this.sequence.length % renderData.charsPerCell;
		if (remainder)
			spacedSequence += DivSequenceTextView.NBSP_.repeated(renderData.charsPerCell - remainder);
	}

	return spacedSequence;
};

/**
 * @private
 */
DivSequenceTextView.prototype.updateElementSizes_ = function() {
	var renderData = this.renderData;
	// Add a lineheight to the number divs so that their background will always cover the entire view height
	// regardless of its top position.
	var totalWindowHeight = this.viewportSize().height + renderData.lineHeight;

	var paddingString = renderData.vertPadding + 'px ' + renderData.horzPadding + 'px';
	this.leftNumberDiv_.style.padding = paddingString;
	style.setSize(this.leftNumberDiv_, renderData.marginWidth, totalWindowHeight);
	this.sequenceDiv_.style.padding = renderData.vertPadding + 'px 0';	// no horizontal padding
	style.setSize(this.sequenceDiv_, renderData.bodyWidth - 2 * renderData.horzPadding, totalWindowHeight);
	//                                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ in updateElementPositions_,
	// center the sequence data within the total body width; in other words, it is offset by horzPadding. Thus,
	// it is necessary to subtract this padding from the width of the sequence div, otherwise, the calculation of
	// lines will be off.
	this.rightNumberDiv_.style.padding = paddingString;
	style.setSize(this.rightNumberDiv_, renderData.marginWidth, totalWindowHeight);

	// Replace the above setSize lines with the following if the box-sizing model is not border-box.
	// style.setSize(this.leftNumberDiv_, renderData.marginWidth - 2*renderData.horzPadding, totalWindowHeight);
	// style.setSize(this.rightNumberDiv_, renderData.marginWidth - 2*renderData.horzPadding, totalWindowHeight);
};

/**
 * @private
 */
DivSequenceTextView.prototype.updateElementPositions_ = function() {
	var renderData = this.renderData;
	var sequenceLeft = renderData.marginWidth + renderData.horzPadding;
	style.setPosition(this.selectionLayerDiv_, sequenceLeft - renderData.horzPadding, -this.y);
	//                                                      ^^^^^^^^^^^^^^^^^^^^^^^^ to offset the HTML padding

	var yOrigin = -(this.y % renderData.lineHeight);
	style.setPosition(this.leftNumberDiv_, 0, yOrigin);
	style.setPosition(this.sequenceDiv_, sequenceLeft, yOrigin);
	style.setPosition(this.rightNumberDiv_, renderData.marginWidth + renderData.bodyWidth, yOrigin);
	this.yOrigin_ = yOrigin;
};

/**
 * @private
 */
DivSequenceTextView.prototype.updateDisplayText_ = function() {
	var lineRange = this.lineRangeFromY_(this.y);

	// Sequence
	dom.setTextContent(this.sequenceDiv_, this.sequenceForRange_(lineRange));

	// Line numbers
	dom.setTextContent(this.leftNumberDiv_, this.paddedNumberTextForRange_(lineRange));
	dom.setTextContent(this.rightNumberDiv_, this.paddedNumberTextForRange_(lineRange, true));
};

/** @private */
DivSequenceTextView.prototype.updateSelectionElements_ = function() {
	if (!this.isInDocument() || this.selection_.begin === 0)
		return;

	// Update the visual display of the selectionDivs to correspond with the new selection
	var region = this.verticalRegionFromSeqRange(this.selection_);
	DivSequenceTextView.adjustRegionToPreventBleeding_(region);

	var toShow = [true, true, true];
	switch (region.type) {
	case AbstractSequenceTextView.SELECTION_TYPE.Single:
		toShow[1] = toShow[2] = false;
		break;
	case AbstractSequenceTextView.SELECTION_TYPE.DoubleNoOverlap:
		toShow[2] = false;
		break;
	case AbstractSequenceTextView.SELECTION_TYPE.NoLeftArm:
		toShow[2] = false;
		break;
	case AbstractSequenceTextView.SELECTION_TYPE.NoRightArm:
		toShow[2] = false;
		break;
	}

	// Update the corresponding div geometries
	var rects = region.rects;
	for (var i=0; i<rects.length; i++) {
		DivSequenceTextView.setGeometry_(this.selectionDivs_[i], rects[i]);
		// style.setPosition(selDiv, rect.x1, rect.y1);
		// style.setSize(selDiv, rect.width(), rect.height());
	}

 	// Update the selection div visibility
	for (var i=0; i<3; i++) {
		style.showElement(this.selectionDivs_[i], toShow[i]);

		// HACK! To get webkit browsers to redraw properly, must do the following:
		// Thanks: http://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes
		// danorton answer.
		if (toShow[i] && userAgent.WEBKIT) {
			this.selectionDivs_[i].style.display = 'inline-block';
			this.selectionDivs_[i].offsetHeight;
			this.selectionDivs_[i].style.display = 'block';
		}
	}
};


/*******************************************************************************************************************/});

