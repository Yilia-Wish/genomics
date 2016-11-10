goog.provide('ag.core.MockEntity');

goog.require('ag.core.Entity');

/**
 * @constructor
 * @param {string|number} id
 */
ag.core.MockEntity = function(id, name, age) {
	goog.base(this, id);

	this.name = goog.isString(name) ? name : null;
	this.age = goog.isNumber(age) ? age : 0;
};
goog.inherits(ag.core.MockEntity, ag.core.Entity);