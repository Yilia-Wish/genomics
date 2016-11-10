goog.provide('ag.ui.CanvasSequenceTextView');

goog.require('goog.array');

goog.require('goog.math.Size');

goog.require('ag.core.UnitRect');
goog.require('ag.painting.Color');
goog.require('ag.painting.TextColorStyle');
goog.require('ag.painting.TextImageRenderer');
goog.require('ag.ui.AbstractSequenceTextView');
goog.require('ag.ui.ISequenceTextView');

goog.require('polyfill.rAF');

/**
 * @constructor
 * @implements {ag.ui.ISequenceTextView}
 * @extends {ag.ui.AbstractSequenceTextView}
 */
ag.ui.CanvasSequenceTextView = function() {
	goog.base(this);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {goog.math.Size}
	 * @private
	 */
	this.blockSize_ = null;

	/**
	 * @type {HTMLCanvasElement}
	 * @private
	 */
	this.canvas_ = null;

	/**
	 * @type {Object}
	 * @private
	 */
	this.context_ = null;

	/**
	 * @type {boolean}
	 * @private
	 */
	this.drawRequested_ = false;

	/**
	 * @type {ag.painting.TextImageRenderer}
	 * @private
	 */
	this.textRenderer_ = new ag.painting.TextImageRenderer(this.font);
};
goog.inherits(ag.ui.CanvasSequenceTextView, ag.ui.AbstractSequenceTextView);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;

var CanvasSequenceTextView = ag.ui.CanvasSequenceTextView;
var Color = ag.painting.Color;
var Highlight = ag.ui.ISequenceTextView.Highlight;
var TextColorStyle = ag.painting.TextColorStyle;
var TextImageRenderer = ag.painting.TextImageRenderer;

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @override */
CanvasSequenceTextView.prototype.blockSize = function() {
	return this.textRenderer_.blockSize();
};

/** @override */
CanvasSequenceTextView.prototype.addHighlight = function(highlight) {
	goog.base(this, 'addHighlight', highlight);
	highlight.regions = this.regionFromSeqRange(highlight.location);
	this.update();
};

/** @override */
CanvasSequenceTextView.prototype.clearHighlights = function() {
	goog.base(this, 'clearHighlights');
	this.update();
};

/** @override */
CanvasSequenceTextView.prototype.clearSelection = function() {
	goog.base(this, 'clearSelection');
	this.update();
};

/**
 * Requests that the sequence view redraw itself at the next possible time.
 */
CanvasSequenceTextView.prototype.update = function() {
	if (!this.isInDocument()) {
		this.drawRequested_ = false;
		return;
	}

	if (this.drawRequested_)
		return;

	var draw = goog.bind(this.draw_, this);
	window.requestAnimationFrame(draw);
};


// --------------------------------------------------------------------------------------------------------------------
// Protected methods
/**
 * Setup a specialized HTML canvas object for manually drawing the sequence characters.
 *
 * @override
 */
CanvasSequenceTextView.prototype.createViewport = function() {
	var div = goog.base(this, 'createViewport');

	var canvas = this.dom_.createDom('canvas');
	canvas.style.cursor = 'text';
	this.context_ = canvas.getContext('2d');
	div.appendChild(canvas);
	this.canvas_ = canvas;

	this.tcs1 = new TextColorStyle(new Color(0, 0, 0));
	this.tcs2 = new TextColorStyle(new Color(119, 119, 119));

	return div;
};

/** @override */
CanvasSequenceTextView.prototype.mouseTargetEventCoordsToSequenceArea = function(event) {
	// Add in the padding that is not included in the event coordinates
	return [event.offsetX - this.renderData.marginWidth, event.offsetY];
};

/** @override */
CanvasSequenceTextView.prototype.mouseEventTarget = function() {
	return this.canvas_;
};

/** @override */
CanvasSequenceTextView.prototype.renderDataChanged = function() {
	this.update();
};

/** @override */
CanvasSequenceTextView.prototype.scrollContentsTo = function(x, y) {
	goog.base(this, 'scrollContentsTo', x, y);
	this.update();
};

/** @override */
CanvasSequenceTextView.prototype.updateSelection = function() {
	goog.base(this, 'updateSelection');
	this.update();
};

/** @override */
CanvasSequenceTextView.prototype.viewportResized = function(size) {
	this.canvas_.width = size.width;
	this.canvas_.height = size.height;
};


// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @private
 */
CanvasSequenceTextView.prototype.clearCanvas_ = function() {
	// Chrome requires the canvas to be reset to display properly
	this.context_.clearRect(0, 0, this.canvas_.width, this.canvas_.height);
};

/**
 * Core drawing routine
 * @private
 */
CanvasSequenceTextView.prototype.draw_ = function() {
	this.clearCanvas_();
	if (this.sequence.length === 0)
		return;

	var renderData = this.renderData;
	var viewSize = this.viewportSize();

	// Background
	this.context_.fillStyle = '#ddd';
	this.context_.fillRect(0, 0, renderData.marginWidth, viewSize.height);
	this.context_.fillRect(viewSize.width - renderData.marginWidth, 0, renderData.marginWidth, viewSize.height);

	// Highlights
	for (var i=0, z= this.highlights.length; i<z; i++) {
		var highlight = this.highlights[i];
		this.drawHighlight_(highlight);
	}

	// Selection
	if (this.selection_.begin !== 0 && this.selection_.end !== 0)
		this.drawHighlight_({regions: this.regionFromSeqRange(this.selection_), color: '#a8cdf1'});

	// Sequence data
	var firstLine = (this.y / renderData.lineHeight) | 0;
	var lastLine = Math.min(firstLine + Math.ceil(viewSize.height / renderData.lineHeight), renderData.totalLines-1);
	var actualY = renderData.vertPadding + -(this.y % renderData.lineHeight);
	for (var i=firstLine; i<= lastLine; i++) {
		var xPos = renderData.horzPadding + renderData.marginWidth;
		var seqStart = i * renderData.charsPerLine;
		for (var j=0, k=seqStart, z=renderData.cellsPerLine; j<z; j++, k += renderData.charsPerCell) {
			var cellString = this.sequence.substr(k, renderData.charsPerCell);
			this.textRenderer_.drawText(this.context_, xPos, actualY, cellString, this.tcs1);
			xPos += renderData.fullCellWidth;
		}

		// Draw the left index position - right aligned
		var leftIndexStr = seqStart + 1 + '';
		var leftIndexWidth = leftIndexStr.length * renderData.charWidth;
		this.textRenderer_.drawText(this.context_, renderData.marginWidth - renderData.horzPadding - leftIndexWidth, actualY, leftIndexStr, this.tcs2);

		// Draw the right index position
		var amount = Math.min(renderData.charsPerLine, this.sequence.length - seqStart);
		this.textRenderer_.drawText(this.context_, renderData.horzPadding + viewSize.width - renderData.marginWidth, actualY, seqStart + amount + '', this.tcs2);

		actualY += renderData.lineHeight;
	}


	this.drawRequested_ = false;
};

/**
 * @param {Highlight} highlight
 * @private
 */
CanvasSequenceTextView.prototype.drawHighlight_ = function(highlight) {
	var viewHeight = this.viewportSize().height;
	this.context_.fillStyle = goog.isString(highlight.color) ? highlight.color : highlight.color.toHexString();
	for (var j=0, y=highlight.regions.length; j<y; j++) {
		var rect = highlight.regions[j];
		if (rect.y2 < this.y)
			continue;
		if (rect.y1 > this.y + viewHeight)
			continue;

		this.context_.fillRect(this.renderData.marginWidth + rect.x1, rect.y1 - this.y - 1, rect.width(), rect.height());
		// HACK!!                                                                       ^^^ Positions highlight 1 pixel above tallest letter
	}
};

/*******************************************************************************************************************/});
