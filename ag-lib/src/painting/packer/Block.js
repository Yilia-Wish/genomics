goog.provide('ag.painting.packer.Block');

goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');

goog.require('ag.core.UnitRect');

/**
 * @constructor
 * @param {goog.math.Coordinate} origin
 * @param {goog.math.Size} size
 * @param {number} page
 */
ag.painting.packer.Block = function(origin, size, page) {
	/**
	 * @type {goog.math.Coordinate}
	 * @public
	 */
	this.origin = origin;

	/**
	 * @type {goog.math.Size}
	 * @public
	 */
	this.size = size;

	/**
	 * @type {number}
	 * @public
	 */
	this.page = goog.isNumber(page) ? page : 0;
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var Block = ag.painting.packer.Block;
var UnitRect = ag.core.UnitRect;

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * @return {UnitRect}
 */
Block.prototype.toUnitRect = function() {
	return new UnitRect(this.origin.x, this.origin.y, this.size.width, this.size.height);
};

/*******************************************************************************************************************/});
