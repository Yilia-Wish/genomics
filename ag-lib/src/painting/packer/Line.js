goog.provide('ag.painting.packer.Line');

goog.require('goog.asserts');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');

goog.require('ag.painting.packer.Block');

/**
 * @constructor
 * @param {number} yOffset
 * @param {goog.math.Size} size
 * @param {number} page
 */
ag.painting.packer.Line = function(yOffset, size, page) {
	goog.asserts.assert(goog.isNumber(page) && page >= 0);
	goog.asserts.assert(goog.isNumber(yOffset) && yOffset >= 0);
	goog.asserts.assert(size.height > 0 && size.width > 0);

	/**
	 * @type {number}
	 * @private
	 */
	this.yOffset_ = yOffset;

	/** 
	 * @type {goog.math.Size}
	 * @public
	 */
	this.size = size;

	/**
	 * @type {number}
	 * @private
	 */
	this.page_ = page;

	/**
	 * @type {Array.<ag.painting.packer.Block>}
	 * @private
	 */
	this.blocks_ = [];

	/**
	 * Rightmost edge of packed block.
	 * 
	 * @type {number}
	 * @private
	 */
	this.xOffset_ = 0;
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var Coordinate = goog.math.Coordinate;
var Size = goog.math.Size;

var Block = ag.painting.packer.Block;
var Line = ag.painting.packer.Line;

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * @param {Size} size
 * @return {Block}
 */
Line.prototype.createBlock = function(size) {
	assert(this.remainingWidth() >= size.width);
	assert(this.size.height >= size.height);

	var blockOrigin = new Coordinate(this.xOffset_, this.yOffset_);
	var block = new Block(blockOrigin, size, this.page_);
	this.blocks_.push(block);
	this.xOffset_ += size.width;
	return block;
};

/** @return {number} */
Line.prototype.height = function() {
	return this.size.height;
};

/** @return {number} */
Line.prototype.remainingWidth = function() {
	return this.size.width - this.xOffset_;
};




/*******************************************************************************************************************/});
