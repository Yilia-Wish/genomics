goog.provide('ag.painting.CharMetric');

goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');

/**
 * @constructor
 */
ag.painting.CharMetric = function() {
	/**
	 * @type {goog.math.Coordinate}
	 */
	this.bearing = new goog.math.Coordinate();

	/**
	 * Leftmost column that contains pixel data
	 * @type {number}
	 */
	this.xMin = 0;

	/**
	 * Rightmost column that contains pixel data
	 * @type {number}
	 */
	this.xMax = 0;

	/**
	 * Topmost column that contains pixel data
	 * @type {number}
	 */
	this.yMin = 0;

	/**
	 * Bottommost column that contains pixel data
	 * @type {number}
	 */
	this.yMax = 0;

	/**
	 * Size of ink-only portion of this character
	 * @type {goog.math.Size}
	 */
	this.inkSize = new goog.math.Size(0, 0);

	/**
	 * Distance from (0, 0) to the top left point of the "inkable" rectangular area (relative to the unit block size)
	 * Useful when blitting a pre-rendered ink rectangle.
	 *
	 * @type {goog.math.Coordinate}
	 */
	this.inkTopLeft = new goog.math.Coordinate();

	/**
	 * Represents the location relative to the top left of the block when used by context.fillText() that will center
	 * the character in the block on the baseline.
	 * Useful when calling the fillText method of HTML5 canvas.
	 * 
	 * @type {goog.math.Coordinate}
	 */
	this.blockOrigin = new goog.math.Coordinate();

	/**
	 * Represents the location relative to the top left of the block when used by context.fillText() that will only
	 * render the ink-based portion.
	 * Useful when calling the fillText method of HTML5 canvas.
	 *
	 * @type {goog.math.Coordinate}
	 */
	this.inkOnlyOrigin = new goog.math.Coordinate();

	/**
	 * @type {goog.math.Coordinate}
	 */
	// this.layoutOrigin = new goog.math.Coordinate();
};
