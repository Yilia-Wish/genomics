goog.provide('ag.painting.GlyphCache');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.math');
goog.require('goog.object');

goog.require('ag.painting.CharPixelMetrics');
goog.require('ag.painting.Glyph');
goog.require('ag.painting.packer.BoxPacker');
goog.require('ag.painting.packer.Block');

/**
 * @constructor
 * @param {ag.painting.CharPixelMetrics} charPixelMetrics
 * @param {boolean=} optRenderEntireBlock if true, then the entire block - not just the inkable character portion -
 *   will be rendered.
 */
ag.painting.GlyphCache = function(charPixelMetrics, optRenderEntireBlock) {
	goog.asserts.assert(goog.isDefAndNotNull(charPixelMetrics));
	goog.asserts.assert(charPixelMetrics instanceof ag.painting.CharPixelMetrics);

	/**
	 * @type ag.painting.CharPixelMetrics
	 * @private
	 */
	this.charPixelMetrics_ = charPixelMetrics;

	/**
	 * ASCII code + foreground color (RRGGBB) -> Glyph OR
	 * ASCII code + foreground color (RRGGBB) + background color (RRGGBB) -> Glyph
	 *
	 * @type {Object.<string,ag.painting.Glyph>}
	 * @private
	 */
	this.cachedGlyphs_ = {};

	/**
	 * @type {Array.<HTMLCanvasElement>}
	 * @private
	 */
	this.canvases_ = [];

	// 512 large at a minimum, greater if necessary.
	var sideLength = Math.max(512, charPixelMetrics.blockWidth(), charPixelMetrics.blockHeight());
	/**
	 * @type {ag.painting.packer.BoxPacker}
	 * @private
	 */
	this.boxPacker_ = new ag.painting.packer.BoxPacker(sideLength);

	/**
	 * Default color object for rendering characters
	 * @type {string}
	 */
	this.black_ = '#000';

	/**
	 * @type {boolean}
	 * @private
	 */
	this.renderEntireBlock_ = goog.isDefAndNotNull(optRenderEntireBlock) ? optRenderEntireBlock : false;
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;
var dom = goog.dom;
var math = goog.math;
var object = goog.object;
var TagName = goog.dom.TagName;

var Block = ag.painting.packer.Block;
var CharPixelMetrics = ag.painting.CharPixelMetrics;
var Glyph = ag.painting.Glyph;
var GlyphCache = ag.painting.GlyphCache;

/**
 * @param {number} asciiCh
 * @param {string=} optColors concatenated foreground and background RGB hex codes; defaults to black if not provided
 * @return {Glyph}
 */
GlyphCache.prototype.cachedGlyph = function(asciiCh, optColors) {
	assert(!optColors || optColors.length === 6 || optColors.length === 6 + 6, 'invalid colors (' + optColors + '): length must be either 0, 6, or 12');
	var colors = optColors ? optColors : '000000';
	var key = asciiCh + colors;
	var glyph = this.cachedGlyphs_[key];
	if (glyph)
		return glyph;

	if (!CharPixelMetrics.isValidCharacter(asciiCh))
		return null;

	var fgColor = '#' + colors.substr(0, 6);
	var bgColor;
	if (colors.length > 6)
		bgColor = '#' + colors.substr(6, 6);

	glyph = this.createGlyph_(asciiCh, fgColor, bgColor);
	this.cachedGlyphs_[key] = glyph;
	return glyph;
};

/**
 * Removes all cached glyphs
 */
GlyphCache.prototype.clear = function() {
	this.boxPacker_.reset();
	object.clear(this.cachedGlyphs_);
	array.clear(this.canvases_);
};

// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @param {number} pageNumber
 * @return {HTMLCanvasElement}
 */
GlyphCache.prototype.canvasForPage_ = function(pageNumber) {
	assert(pageNumber <= this.canvases_.length);
	if (pageNumber < this.canvases_.length)
		return this.canvases_[pageNumber];

	// No canvas exists for this page, create it
	var newCanvas = /** @type {HTMLCanvasElement} */(dom.createElement(TagName.CANVAS));
	newCanvas.width = this.boxPacker_.sideLength();
	newCanvas.height = newCanvas.width;
	this.canvases_.push(newCanvas);
	return newCanvas;
};

/**
 * @param {number} asciiCh
 * @param {string} fgColor hex string color
 * @param {string=} optBgColor hex string color; if exluded is transparent
 * @return {Glyph}
 */
GlyphCache.prototype.createGlyph_ = function(asciiCh, fgColor, optBgColor) {
	var size = (this.renderEntireBlock_) ? this.charPixelMetrics_.blockSize() : this.charPixelMetrics_.inkSize(asciiCh);
	var block = this.boxPacker_.createBlock(size);
	var canvas = this.canvasForPage_(block.page);
	this.renderGlyph_(asciiCh, canvas, block, fgColor, optBgColor);
	var offset = this.charPixelMetrics_.inkTopLeft(asciiCh);
	return new Glyph(canvas, block.toUnitRect(), offset);
};

/**
 * @param {number} asciiCh
 * @param {HTMLCanvasElement} canvas
 * @param {Block} block
 * @param {string} fgColor
 * @param {string=} optBgColor hex string color; if exluded is transparent
 */
GlyphCache.prototype.renderGlyph_ = function(asciiCh, canvas, block, fgColor, optBgColor) {
	var context = canvas.getContext('2d');
	if (optBgColor) {
		context.fillStyle = optBgColor;
		context.fillRect(block.origin.x, block.origin.y, block.size.width, block.size.height);
	}

	context.font = this.charPixelMetrics_.font();
	context.textBaseline = 'alphabetic';
	var origin = (this.renderEntireBlock_) ? this.charPixelMetrics_.blockOrigin(asciiCh)
										   : this.charPixelMetrics_.inkOnlyOrigin(asciiCh);
	context.save();
	context.translate(block.origin.x + origin.x, block.origin.y + origin.y);
	var scale = this.charPixelMetrics_.scale();
	if (!math.nearlyEquals(scale, 1))
		context.scale(scale, scale);

	context.fillStyle = fgColor;
	context.fillText(String.fromCharCode(asciiCh), 0, 0);
	context.restore();
};

/*******************************************************************************************************************/});
