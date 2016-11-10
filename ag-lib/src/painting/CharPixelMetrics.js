goog.provide('ag.painting.CharPixelMetrics');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.TagName');

goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');

goog.require('ag.core.UnitRect');
goog.require('ag.painting');
goog.require('ag.painting.CharMetric');

/**
 * @constructor
 * @param {string} font
 * @param {number=} optScale defaults to 1; must be greater than 0
 * @param {string=} optCharacters defaults to all ascii characters between 33 and 126
 * @param {number=} optThreshold represents the alpha threshold a pixel must exceed to be considered non-empty;
 *                  defaults to 0
 */
ag.painting.CharPixelMetrics = function(font, optScale, optCharacters, optThreshold) {
	/**
	 * Must be a valid font string
	 * @type {string}
	 * @private
	 */
	this.font_ = font;

	/**
	 * Scaling factor of all characters
	 * @type {number}
	 * @private
	 */
	this.scale_ = goog.isNumber(optScale) && optScale > 0 ? optScale : 1.;

	/**
	 * Metrics for the following characters
	 * @type {string}
	 * @private
	 */
	this.characters_ = goog.isString(optCharacters) ? optCharacters : ag.painting.CharPixelMetrics.VALID_ASCII_CHARACTERS;

	/**
	 * @type {number}
	 * @private
	 */
	this.threshold_ = goog.isNumber(optThreshold) && optThreshold >= 0 && optThreshold <= 255 ? Math.floor(optThreshold) : 0;

	/**
	 * @type {goog.math.Size}
	 * @private
	 */
	this.blockSize_ = new goog.math.Size(0, 0);

	/**
	 * Real baseline reflecting true font baseline. Should not be used when rendering characters.
	 *
	 * @type {number}
	 * @private
	 */
	this.baseline_ = 0;

	/**
	 * Use this baseline in conjunction with the inkOnlyOrigin to render only the "inkable" pixels
	 *
	 * @type {number}
	 * @private
	 */
	this.inkOnlyBaseline_ = 0;

	/**
	 * Use this baseline in conjunction with the blockOrigin to render to the appropriate position within the block space.
	 *
	 * @type {number}
	 * @private
	 */
	this.blockOnlyBaseline_ = 0;

	/**
	 * @type {Array.<ag.painting.CharMetric>}
	 * @private
	 */
	this.metrics_;

	this.initializeMetrics_();
	this.computeMetrics_();
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var dom = goog.dom;
var Coordinate = goog.math.Coordinate;
var Size = goog.math.Size;
var TagName = goog.dom.TagName;

var boundingRect = ag.painting.boundingRect;

var CharMetric = ag.painting.CharMetric;
var CharPixelMetrics = ag.painting.CharPixelMetrics;

// --------------------------------------------------------------------------------------------------------------------
// Constants
/** @const */
CharPixelMetrics.MAX_CHARACTERS = 94;

/** @const */
CharPixelMetrics.VALID_ASCII_CHARACTERS = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';


// --------------------------------------------------------------------------------------------------------------------
// Static public methods
/**
 * @param {number} ch
 * @return {boolean}
 */
CharPixelMetrics.isValidCharacter = function(ch) {
	return ch >= 33 && ch < 127;
};

/**
 * @param {number} ch
 * @return {number}
 */
CharPixelMetrics.mapAsciiToIndex = function(ch) {
	return ch - 33;
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @return {number} */
CharPixelMetrics.prototype.baseline = function() {
	return this.baseline_;
};

/** @return {number} */
CharPixelMetrics.prototype.blockHeight = function() {
	return this.blockSize_.height;
};

/** @return {number} */
CharPixelMetrics.prototype.blockOnlyBaseline = function() {
	return this.blockOnlyBaseline_;
};

/**
 * @param {number} ch ASCII code
 * @return {Coordinate}
 */
CharPixelMetrics.prototype.blockOrigin = function(ch) {
	assert(CharPixelMetrics.isValidCharacter(ch));
	var index = CharPixelMetrics.mapAsciiToIndex(ch);
	var metric = this.metrics_[index];
	return metric.blockOrigin;
};

/** @return {Size} */
CharPixelMetrics.prototype.blockSize = function() {
	return this.blockSize_;
};

/** @return {number} */
CharPixelMetrics.prototype.blockWidth = function() {
	return this.blockSize_.width;
};

/** @return {string} */
CharPixelMetrics.prototype.characters = function() {
	return this.characters_;
};

/** @return {string} */
CharPixelMetrics.prototype.font = function() {
	return this.font_;
};

/**
 * @param {number} ch ASCII code
 * @return {number}
 */
CharPixelMetrics.prototype.inkHeight = function(ch) {
	assert(CharPixelMetrics.isValidCharacter(ch));
	var index = CharPixelMetrics.mapAsciiToIndex(ch);
	var metric = this.metrics_[index];
	return metric.inkSize.height;
};

/** @return {number} */
CharPixelMetrics.prototype.inkOnlyBaseline = function() {
	return this.inkOnlyBaseline_;
};

/**
 * @param {number} ch ASCII code
 * @return {Coordinate}
 */
CharPixelMetrics.prototype.inkOnlyOrigin = function(ch) {
	assert(CharPixelMetrics.isValidCharacter(ch));
	var index = CharPixelMetrics.mapAsciiToIndex(ch);
	var metric = this.metrics_[index];
	return metric.inkOnlyOrigin;
};

/**
 * @param {number} ch ASCII code
 * @return {Size}
 */
CharPixelMetrics.prototype.inkSize = function(ch) {
	assert(CharPixelMetrics.isValidCharacter(ch));
	var index = CharPixelMetrics.mapAsciiToIndex(ch);
	var metric = this.metrics_[index];
	return metric.inkSize;
};

/** @return {Coordinate} */
CharPixelMetrics.prototype.inkTopLeft = function(ch) {
	assert(CharPixelMetrics.isValidCharacter(ch));
	var index = CharPixelMetrics.mapAsciiToIndex(ch);
	var metric = this.metrics_[index];
	return metric.inkTopLeft;
};

/**
 * @param {number} ch ASCII code
 * @return {number}
 */
CharPixelMetrics.prototype.inkWidth = function(ch) {
	assert(CharPixelMetrics.isValidCharacter(ch));
	var index = CharPixelMetrics.mapAsciiToIndex(ch);
	var metric = this.metrics_[index];
	return metric.inkSize.width;
};

/** @return {number} */
CharPixelMetrics.prototype.scale = function() {
	return this.scale_;
};

/**
 * Recalculates all char pixel metrics to reflect newFont
 * @param {string} newFont
 */
CharPixelMetrics.prototype.setFont = function(newFont) {
	assert(goog.isString(newFont));
	if (this.font_ === newFont)
		return;

	this.font_ = newFont;
	this.computeMetrics_();
};

/**
 * @param {number} newScale
 */
CharPixelMetrics.prototype.setScale = function(newScale) {
	assert(goog.isNumber(newScale), 'CharPixelMetrics.setScale() - newScale must be a number');
	assert(newScale > 0);
	if (goog.math.nearlyEquals(this.scale_, newScale))
		return;

	this.scale_ = newScale;
	this.computeMetrics_();
};


// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * Core method that determines the exact rendering font metrics for all relevant characters by actually rendering them
 * one by one and measuring their characteristics.
 */
CharPixelMetrics.prototype.computeMetrics_ = function() {
	this.blockSize_.width = 0;
	this.blockSize_.height = 0;

	var heightMetrics = this.fontHeightMetrics_();
	var leftPadding = 2;
	// 19 June 2012: Increase the right padding in proportion to the overall font height to compensate
	// for some funky fonts like Segoe script ('m') not properly reporting its width and not knowing
	// the true x bearing.
	var rightPadding = Math.max(2, Math.ceil(heightMetrics.height / 10));
	var maxAscent = 0;
	var maxDescent = 0;
	var baseline = heightMetrics.ascent;
	var scaledBaseline = this.scale_ * baseline;
	var minInkY = scaledBaseline;

	// Create a canvas buffer for rendering purposes
	var canvas = dom.createElement(TagName.CANVAS);
	canvas.width = leftPadding + Math.ceil(this.scale_ * this.maxWidth_()) + rightPadding;
	canvas.height = Math.ceil(this.scale_ * heightMetrics.height);
	var context = canvas.getContext('2d');
	context.font = this.font_;
	context.textBaseline = 'alphabetic';
	context.textAlign = 'left';

	// Render each character, measure and store the extents
	for (var i=0, z=this.characters_.length; i<z; i++) {
		var ascii = this.characters_.charCodeAt(i);
		if (!CharPixelMetrics.isValidCharacter(ascii))
			continue;

		context.save();
		context.translate(leftPadding, scaledBaseline);
		context.scale(this.scale_, this.scale_);
		var ch = this.characters_.charAt(i);
		context.fillText(ch, 0, 0);
		context.restore();

		var inkRect = boundingRect(context.getImageData(0, 0, canvas.width, canvas.height), this.threshold_);
		var metricIndex = CharPixelMetrics.mapAsciiToIndex(ascii);
		var metric = this.metrics_[metricIndex];
		metric.bearing.x = inkRect.left() - leftPadding;
		metric.bearing.y = inkRect.top() - scaledBaseline;
		metric.xMin = inkRect.left() - leftPadding;
		metric.xMax = inkRect.right() - leftPadding;
		metric.yMin = inkRect.top() - scaledBaseline;
		metric.yMax = inkRect.bottom() - scaledBaseline;
		metric.inkSize = inkRect.size();

		// Update the maximum block width
		if (inkRect.width() > this.blockSize_.width)
			this.blockSize_.width = inkRect.width();

		// Check for an increase in either the ascent or descent
		if (metric.yMin < maxAscent)
			maxAscent = metric.yMin;
		if (metric.yMax > maxDescent)
			maxDescent = metric.yMax;

		if (inkRect.top() < minInkY)
			minInkY = inkRect.top();

		metric.inkOnlyOrigin.x = -metric.xMin;
		metric.inkOnlyOrigin.y = -inkRect.top() + scaledBaseline;
		context.clearRect(0, 0, canvas.width, canvas.height);
	}

    // Finish calculating the width and height at this scale
    this.baseline_ = -maxAscent;
	this.inkOnlyBaseline_ = scaledBaseline;
	this.blockOnlyBaseline_ = -minInkY + scaledBaseline;

    // Manually verified that we should add 1 to the height. Specifically, when testing with 144px monospace,
    // the underscore is the lowest character. And without the + 1 here, one of its pixels is rendered outside
    // the canvas on the bottom. I checked with the tallest character (/) and using the layoutOrigin.y was dead
    // on. Therefore, it must be that the height is invalid. After adding 1 here, everything worked like a charm.
    this.blockSize_.height = this.baseline_ + maxDescent + 1;

    // Having examined each individual character, it is now possible to finalize the remaining
    // class members and the appropriate layout drawing origin and ink top left
	for (var i=0, z=this.characters_.length; i<z; i++) {
		var ascii = this.characters_.charCodeAt(i);
		if (!CharPixelMetrics.isValidCharacter(ascii))
			continue;

		var metricIndex = CharPixelMetrics.mapAsciiToIndex(ascii);
		var metric = this.metrics_[metricIndex];
		// 22 June 2012
		// Round the x offset otherwise this will produce blurry results (the price of accuracy)
		metric.inkTopLeft.x = Math.round((this.blockSize_.width - metric.inkSize.width) / 2);
		//                         inkRect.top()
		//                    |<------------------------>|
		metric.inkTopLeft.y = metric.yMin + scaledBaseline - minInkY;

		metric.blockOrigin.x = metric.inkTopLeft.x - metric.bearing.x;
		// Not sure this is correct                ^^^^^^^^^^^^^^^^^^
		metric.blockOrigin.y = this.blockOnlyBaseline_;
	}
};

/**
 * Approach taken from: http://stackoverflow.com/questions/1134586/how-can-you-find-the-height-of-text-on-an-html-canvas
 * By Daniel Earwicker (13 June 2012)
 *
 * @return {Object.<string,number>}
 */
CharPixelMetrics.prototype.fontHeightMetrics_ = function() {
	var span = dom.createDom(TagName.SPAN, undefined, CharPixelMetrics.VALID_ASCII_CHARACTERS);
	span.style.font = this.font_;
	var inlineBlock = dom.createElement(TagName.DIV);
	inlineBlock.style.display = 'inline-block';
	inlineBlock.style.width = '1px';
	inlineBlock.style.height = 0;
	var parentDiv = dom.createDom(TagName.DIV, undefined, span, inlineBlock);
	parentDiv.style.position = 'absolute';	// Position it off-screen so that all measurements are not visible - even
	                                        // for a microsecond
	parentDiv.style.left = (dom.getViewportSize().width + 100) + 'px';
	parentDiv.style.whiteSpace = 'nowrap';	// If the div wraps, then the height metrics will be off by a factor equal
											// to the number of lines.
	parentDiv.style.width = '10000px';		// We still give it a generous width to avoid wrapping with smaller sizes
	document.body.appendChild(parentDiv);

	// Perform the calculation
	inlineBlock.style.verticalAlign = 'baseline';
	var ascent = inlineBlock.offsetTop - span.offsetTop;
	inlineBlock.style.verticalAlign = 'bottom';
	var height = inlineBlock.offsetTop - span.offsetTop;
	var descent = height - ascent;

	dom.removeNode(parentDiv);

	return {
		ascent: ascent,
		descent: descent,
		height: height
	};
};

/**
 * Initializes all possible character metrics with a default constructed CharMetric.
 */
CharPixelMetrics.prototype.initializeMetrics_ = function() {
	this.metrics_ = Array(CharPixelMetrics.MAX_CHARACTERS);
	for (var i=0; i< CharPixelMetrics.MAX_CHARACTERS; i++)
		this.metrics_[i] = new CharMetric();
};

/**
 * Measures the width of every character in characters using the context measureText method, and returns the
 * maximum width found.
 * @return {number}
 */
CharPixelMetrics.prototype.maxWidth_ = function() {
	var canvas = dom.createElement(TagName.CANVAS);
	var context = canvas.getContext('2d');
	context.font = this.font_;
	var maxWidth = 0;
	for (var i=0, z=this.characters_.length; i<z; i++) {
		var ch = this.characters_.charAt(i);
		var charWidth = context.measureText(ch).width;
		if (charWidth > maxWidth)
			maxWidth = charWidth
	}
	return maxWidth;
};

/*******************************************************************************************************************/});
