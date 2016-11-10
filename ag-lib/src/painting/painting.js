goog.provide('ag.painting');

goog.require('goog.asserts');

goog.require('ag.core.UnitRect');

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var painting = ag.painting;
var UnitRect = ag.core.UnitRect;

/**
 * Returns the smallest rectangle that contains all pixels with alpha values that exceed optThreshold or null
 * if there are none.
 *
 * In several places, 3 is added to a variable. This is to properly reference the alpha value which is stored
 * as the last byte of each 4-byte pixel data. The actual order is R, G, B, A.
 *
 * @param {ImageData} imageData
 * @param {number=} optThreshold alpha that must be exceeded to consider non-empty; defaults to 0
 * @return {UnitRect}
 */
painting.boundingRect = function(imageData, optThreshold) {
	if (!imageData || imageData.data.length === 0)
		return null;

	var threshold = goog.isNumber(optThreshold) ? optThreshold : 0;
	assert(threshold >= 0 && threshold <= 255, 'painting.boundingRect() - invalid threshold');

	var pixels = imageData.data;
	var bpp = 4;	// Number of bytes per pixel
	var w = imageData.width;
	var h = imageData.height;

	var bppW = w*bpp;
	var bppH = h*bpp;

	// Initially represented in bpp
	var left = 0;
	var right = bppW - bpp + 3;
	var top = 0;
	var bottom = bppH - bpp + 3;

	// Scan the top
	var i = 0;
	for (i=3; i< pixels.length; i += bpp) {
		if (pixels[i] > threshold) {
			// top = Math.floor(i / bpp / w);
			top = (i / bpp / w) | 0;
			break;
		}
	}

	// Quick test to see if image is empty
	if (i === pixels.length + 3)
		return null;

	// Scan the bottom
	bottom = top; // In case a match is not found in time
	var old_i = i;
	for (i=pixels.length - bpp + 3; i > old_i; i -= bpp) {
		if (pixels[i] > threshold) {
			// bottom = Math.floor(i / bpp / w);
			bottom = (i / bpp / w) | 0;
			break;
		}
	}

	// Scan the left
	LEFT:
	for (i=3; i < bppW; i += bpp) {
		left = i;
		for (var j=left; j<pixels.length; j += bppW) {
			if (pixels[j] > threshold)
				break LEFT;
		}
	}
	// Convert from bpp to pixel space after the next loop

	// Scan the right
	RIGHT:
	for (; right > left; right -= bpp)
		for (i=right; i<pixels.length; i += bppW)
			if (pixels[i] > threshold)
				break RIGHT;

	left = (left - 3) / bpp;
	right = (right - 3) / bpp;

	return new UnitRect(left, top, right - left + 1, bottom - top + 1);
};

/*******************************************************************************************************************/});
