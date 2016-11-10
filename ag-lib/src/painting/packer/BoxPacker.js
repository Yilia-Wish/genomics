goog.provide('ag.painting.packer.BoxPacker');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.math.Size');

goog.require('ag.painting.packer.Block');
goog.require('ag.painting.packer.Line');
goog.require('ag.painting.packer.Page');

/**
 * @constructor
 * @param {number=} optSideLength defaults to 512
 */
ag.painting.packer.BoxPacker = function(optSideLength) {
	/**
	 * Width and height of each page.
	 * @type {number}
	 * @private
	 */
	this.sideLength_ = goog.isNumber(optSideLength) && optSideLength > 0 ? Math.ceil(optSideLength) : 512;

	/**
	 * Array of pages containing the packed boxes
	 * @type {Array.<ag.painting.packer.Page>}
	 * @private
	 */
	this.pages_ = [];
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;
var Size = goog.math.Size;

var BoxPacker = ag.painting.packer.BoxPacker;
var Block = ag.painting.packer.Block;
var Line = ag.painting.packer.Line;
var Page = ag.painting.packer.Page;

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * Clears all cached data and resets to initial state
 */
BoxPacker.prototype.reset = function() {
	goog.array.clear(this.pages_);
};

/**
 * Requesting a block of size that is situated on the smallest line that will accommodate its size. Create another page
 * if necessary to accommodate it.
 *
 * @param {Size} size
 * @return {Block}
 */
BoxPacker.prototype.createBlock = function(size) {
	assert(size.width > 0 && size.height > 0);
	assert(size.width <= this.sideLength_ && size.height <= this.sideLength_);

	// Find the best line with the
	var bestLine = this.findBestLineForSize_(size);
	if (bestLine)
		return bestLine.createBlock(size);

	var targetLineHeight = Math.min(this.sideLength_, BoxPacker.extendedHeight_(size.height));
	var page = this.findPageWithSpaceForLine_(targetLineHeight);
	if (!page)
		page = this.addPage_();

	var line = page.createLine(targetLineHeight);
	return line.createBlock(size);
};

/** @return {number} */
BoxPacker.prototype.pageCount = function() {
	return this.pages_.length;
};

/** @return {number} */
BoxPacker.prototype.sideLength = function() {
	return this.sideLength_;
};


// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @return {Page}
 */
BoxPacker.prototype.addPage_ = function() {
	var page = new Page(new Size(this.sideLength_, this.sideLength_), this.pages_.length);
	this.pages_.push(page);
	return page;
};

/**
 * @param {Size} size
 * @return {?Line}
 */
BoxPacker.prototype.findBestLineForSize_ = function(size) {
	var bestRatio = 0;
	var bestLine = null;
	for (var i=0, z=this.pages_.length; i<z; i++) {
		var page = this.pages_[i];
		for (var j=0, y=page.lines.length; j<y; j++) {
			var line = page.lines[j];
			if (line.height() < size.height)
				continue;
			if (line.remainingWidth() < size.width)
				continue;

			var ratio = size.height / line.size.height;
			if (ratio > bestRatio) {
				bestRatio = ratio;
				bestLine = line;
			}
		}
	}

	if (bestRatio >= BoxPacker.ACCEPTABLE_HEIGHT_RATIO_)
		return bestLine;

	return null;
};

/**
 * @param {number} targetLineHeight
 * @return {Page}
 */
BoxPacker.prototype.findPageWithSpaceForLine_ = function(targetLineHeight) {
	for (var i=0, z=this.pages_.length; i<z; i++) {
		var page = this.pages_[i];
		if (page.remainingHeight() >= targetLineHeight)
			return page;
	}

	return null;
};

// --------------------------------------------------------------------------------------------------------------------
// Static private variables and methods
BoxPacker.ACCEPTABLE_HEIGHT_RATIO_ = .7;
BoxPacker.EXTRA_HEIGHT_FACTOR_ = 1.1;

assert(1. / BoxPacker.EXTRA_HEIGHT_FACTOR_ >= BoxPacker.ACCEPTABLE_HEIGHT_RATIO_);
assert(BoxPacker.EXTRA_HEIGHT_FACTOR_ >= 1);

/**
 * Compute an extended height from height that is 1.1 times the requested size. By building in some extra padding, we
 * provide for additional boxes to fit on this line.
 *
 * @param {number} height
 * @return {number}
 */
BoxPacker.extendedHeight_ = function(height) {
	assert(height >= 0);

	if (height === 0)
		return 0;

	var extendedHeight = Math.round(height * BoxPacker.EXTRA_HEIGHT_FACTOR_);
	while (height / extendedHeight < BoxPacker.ACCEPTABLE_HEIGHT_RATIO_)
		--extendedHeight;
	assert(extendedHeight >= height);
	return extendedHeight;
};

/*******************************************************************************************************************/});
