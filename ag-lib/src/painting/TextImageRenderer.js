goog.provide('ag.painting.TextImageRenderer');

goog.require('ag.painting.GlyphCache');
goog.require('ag.painting.AbstractTextCachedRenderer');

/**
 * Hybrid renderer that fills in background using the canvas fillRect command, but renders the glyph from
 * a glyph cache.
 *
 * @constructor
 * @extends {ag.core.AObject}
 * @param {string} font
 * @param {ag.core.AObject=} optParent defaults to null
 */
ag.painting.TextImageRenderer = function(font, optParent) {
	goog.base(this, font, optParent);

	/**
	 * @type {ag.painting.GlyphCache}
	 * @private
	 */
	this.glyphCache_ = new ag.painting.GlyphCache(this.charPixelMetrics);
};
goog.inherits(ag.painting.TextImageRenderer, ag.painting.AbstractTextCachedRenderer);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var events = goog.events;
var math = goog.math;

var Size = goog.math.Size;

var TextColorStyle = ag.painting.TextColorStyle;
var TextRenderer = ag.painting.TextRenderer;
var TextImageRenderer = ag.painting.TextImageRenderer;

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * @param {context} context
 * @param {number} x
 * @param {number} y
 * @param {number} asciiCh
 * @param {string} optColors
 */
TextImageRenderer.prototype.drawChar = function(context, x, y, asciiCh, optColors) {
	if (asciiCh === TextRenderer.SpaceCharCode)
		return;

	// Cache the pixel metrics
	var cpm = this.charPixelMetrics;

	context.save();

	// Background
	if (optColors && optColors.length === 12) {
		context.fillStyle = '#' + optColors.substr(6, 6);
		context.fillRect(x, y, cpm.blockWidth(), cpm.blockHeight());
	}

	var glyph = this.glyphCache_.cachedGlyph(asciiCh, optColors);
    assert(glyph, 'Unrecognized character code: ' + asciiCh);

	var sRect = glyph.sourceRect;
	var sw = sRect.width();
	var sh = sRect.height();
	context.drawImage(glyph.canvas,
		sRect.x1, sRect.y1, sw, sh,
		x + glyph.offset.x, y + glyph.offset.y, sw, sh);

	context.restore();
};

/**
 * @param {Object} context
 * @param {number} x
 * @param {number} y
 * @param {string} string
 * @param {string} optColors
 */
TextImageRenderer.prototype.drawText = function(context, x, y, string, optColors) {
	// Cache some numbers
	var cpm = this.charPixelMetrics;
	var blockWidth = cpm.blockWidth();

	context.save();

	// Background
	if (optColors && optColors.background) {
		context.fillStyle = optColors.background.toHexString()
		context.fillRect(x, y, blockWidth * string.length, cpm.blockHeight());
	}

	// Foreground
	for (var i=0, z=string.length, xPos = x; i<z; i++, xPos += blockWidth) {
		var asciiCh = string.charCodeAt(i);
		// Skip over spaces
		if (string[i] === ' ')
			continue;

		var glyph = this.glyphCache_.cachedGlyph(asciiCh, optColors.foreground.toHexString().substr(1));
	    assert(glyph, 'Unrecognized character code: ' + asciiCh);

		var sRect = glyph.sourceRect;
		var sw = sRect.width();
		var sh = sRect.height();
		context.drawImage(glyph.canvas,
			sRect.x1, sRect.y1, sw, sh,
			xPos + glyph.offset.x, y + glyph.offset.y, sw, sh);
	}

	context.restore();
};

/*******************************************************************************************************************/});
