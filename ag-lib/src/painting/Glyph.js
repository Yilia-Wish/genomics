goog.provide('ag.painting.Glyph');

goog.require('ag.core.UnitRect');
goog.require('goog.math.Coordinate');

/**
 * @constructor
 * @param {HTMLCanvasElement} canvas
 * @param {ag.core.UnitRect} sourceRect
 * @param {goog.math.Coordinate=} offset defaults to 0, 0
 */
ag.painting.Glyph = function(canvas, sourceRect, offset) {
	/**
	 * @type {HTMLCanvasElement}
	 * @public
	 */
	this.canvas = canvas;

	/**
	 * @type {ag.core.UnitRect}
	 * @public
	 */
	this.sourceRect = sourceRect;

	/**
	 * @type {goog.math.Coordinate}
	 * @public
	 */
	this.offset = (offset && offset instanceof goog.math.Coordinate) ? offset : new goog.math.Coordinate();
};
