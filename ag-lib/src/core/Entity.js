goog.provide('ag.core.Entity');

/**
 * @constructor
 * @param {string|number} id
 */
ag.core.Entity = function(id) {
	/**
	 * @type {string|number}
	 * @public
	 */
	this.id = (goog.isString(id) || goog.isNumber(id)) ? id : 0;
};
