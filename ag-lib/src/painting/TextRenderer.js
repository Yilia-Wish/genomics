goog.provide('ag.painting.TextRenderer');

goog.require('goog.asserts');
goog.require('goog.events');
goog.require('goog.math');

goog.require('goog.math.Size');

goog.require('ag.core.AObject');
goog.require('ag.painting.CharPixelMetrics');
goog.require('ag.painting.TextColorStyle');

/**
 * @constructor
 * @param {string} font
 * @param {ag.core.AObject=} optParent defaults to null
 * @extends {ag.core.AObject}
 */
ag.painting.TextRenderer = function(font, optParent) {
	goog.base(this, optParent);

	/**
	 * @type {ag.painting.CharPixelMetrics}
	 * @protected
	 */
	// this.charPixelMetrics = new ag.painting.CharPixelMetrics(font, 1 /** scale */, 'ACGTj1234567890', 25 /** threshold */);
	this.charPixelMetrics = new ag.painting.CharPixelMetrics(font, 1 /** scale */, undefined, 25 /** threshold */);
};
goog.inherits(ag.painting.TextRenderer, ag.core.AObject);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var events = goog.events;
var math = goog.math;

var Size = goog.math.Size;

var TextColorStyle = ag.painting.TextColorStyle;
var TextRenderer = ag.painting.TextRenderer;

// --------------------------------------------------------------------------------------------------------------------
// Static properties
/** @enum {string} */
TextRenderer.SignalType = {
	FONT_CHANGED: events.getUniqueId('font-changed'),
	SCALE_CHANGED: events.getUniqueId('scale-changed')
};

/** @const {number} */
TextRenderer.SpaceCharCode = ' '.charCodeAt(0);

// --------------------------------------------------------------------------------------------------------------------
// Destructor
/** @override */
TextRenderer.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	this.charPixelMetrics = null;
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @return {number} */
TextRenderer.prototype.baseline = function() {
	return this.charPixelMetrics.baseline();
};

/** @return {Size} */
TextRenderer.prototype.blockSize = function() {
	return this.charPixelMetrics.blockSize();
};

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} x
 * @param {number} y
 * @param {number} asciiCh
 * @param {string} [optColors]
 */
TextRenderer.prototype.drawChar = function(context, x, y, asciiCh, optColors) {
	if (asciiCh === TextRenderer.SpaceCharCode)
		return;

	// Cache the pixel metrics
	var cpm = this.charPixelMetrics;

	context.save();

	// Background
	if (optColors && optColors.background) {
		context.fillStyle = optColors.background.toHexString();
		context.fillRect(x, y, cpm.blockWidth(), cpm.blockHeight());
	}

	context.font = this.charPixelMetrics.font();
	if (optColors && optColors.foreground)
		context.fillStyle = optColors.foreground.toHexString();
	var blockOrigin = this.charPixelMetrics.blockOrigin(asciiCh);
	context.fillText(String.fromCharCode(asciiCh), x + blockOrigin.x, y + blockOrigin.y);

	context.restore();
};

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} x
 * @param {number} y
 * @param {string} string
 * @param {string} [optColors]
 */
TextRenderer.prototype.drawText = function(context, x, y, string, optColors) {
	// Cache the pixel metrics
	var cpm = this.charPixelMetrics;
	var blockWidth = cpm.blockWidth();

	context.save();

	// Background
	if (optColors && optColors.background) {
		context.fillStyle = optColors.background.toHexString();
		context.fillRect(x, y, blockWidth * string.length, cpm.blockHeight());
	}

	// Foreground
	context.font = this.charPixelMetrics.font();
	if (optColors && optColors.foreground)
		context.fillStyle = optColors.foreground.toHexString();
	for (var i=0, z=string.length, xPos = x; i<z; i++, xPos += blockWidth) {
		var asciiCh = string.charCodeAt(i);
		// Skip over spaces
		if (string[i] === ' ')
			continue;

		var blockOrigin = this.charPixelMetrics.blockOrigin(asciiCh);
		context.fillText(string[i], xPos + blockOrigin.x, y + blockOrigin.y);
	}

	context.restore();
};

/** @return {string} */
TextRenderer.prototype.font = function() {
	return this.charPixelMetrics.font();
};

/** @return {number} */
TextRenderer.prototype.scale = function() {
	return this.charPixelMetrics.scale();
};

/**
 * Recalculates all char pixel metrics to reflect newFont
 * @param {string} newFont
 */
TextRenderer.prototype.setFont = function(newFont) {
	assert(goog.isString(newFont));
	if (this.charPixelMetrics.font() === newFont)
		return;

	this.charPixelMetrics.setFont(newFont);
	this.emit(TextRenderer.SignalType.FONT_CHANGED, newFont);
};

/**
 * @param {number} newScale
 */
TextRenderer.prototype.setScale = function(newScale) {
	assert(goog.isNumber(newScale), 'TextRenderer.setScale() - newScale must be a number');
	assert(newScale > 0);
	if (goog.math.nearlyEquals(this.charPixelMetrics.scale(), newScale))
		return;

	this.charPixelMetrics.setScale(newScale);
	this.emit(TextRenderer.SignalType.SCALE_CHANGED, newScale);
};

/*******************************************************************************************************************/});
