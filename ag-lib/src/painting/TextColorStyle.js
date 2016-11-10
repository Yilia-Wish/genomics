goog.provide('ag.painting.TextColorStyle');

goog.require('goog.asserts');

goog.require('ag.painting.Color');

/**
 * @constructor
 * @param {ag.painting.Color=} optForeground defaults to black
 * @param {ag.painting.Color=} optBackground defaults to null
 */
ag.painting.TextColorStyle = function(optForeground, optBackground) {
	/**
	 * @type {ag.painting.Color}
	 * @public
	 */
	this.foreground = optForeground ? optForeground : new ag.painting.Color();

	/**
	 * @type {ag.painting.Color}
	 * @public
	 */
	this.background = optBackground ? optBackground : null;

	goog.asserts.assert(this.foreground instanceof ag.painting.Color);
	goog.asserts.assert(!this.background || this.background instanceof ag.painting.Color);
};