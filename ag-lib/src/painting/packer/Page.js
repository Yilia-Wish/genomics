goog.provide('ag.painting.packer.Page');

goog.require('goog.asserts');
goog.require('goog.math.Size');

goog.require('ag.painting.packer.Line');

/**
 * @constructor
 * @param {goog.math.Size} size
 * @param {number} number
 */
ag.painting.packer.Page = function(size, number) {
	/** 
	 * @type {goog.math.Size}
	 * @public
	 */
	this.size = size;

	/**
	 * @type {number} number
	 * @private
	 */
	this.number_ = number;

	/**
	 * @type {Array.<ag.painting.packer.Line>}
	 * @public
	 */
	this.lines = [];

	/**
	 * @type {number}
	 * @private
	 */
	this.yOffset_ = 0;
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var Size = goog.math.Size;

var Line = ag.painting.packer.Line;
var Page = ag.painting.packer.Page;

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * @param {number} height
 * @return {Line}
 */
Page.prototype.createLine = function(height) {
	assert(height > 0);
	assert(this.size.height - this.yOffset_ >= height);

	var lineSize = new Size(this.size.width, height);
	var line = new Line(this.yOffset_, lineSize, this.number_);
	this.lines.push(line);
	this.yOffset_ += height;
	return line;
};

/** @return {number} */
Page.prototype.remainingHeight = function() {
	return this.size.height - this.yOffset_;
};

/*******************************************************************************************************************/});
