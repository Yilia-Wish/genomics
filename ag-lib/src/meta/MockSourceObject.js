goog.provide('ag.meta.MockSourceObject');

ag.meta.MockSourceObject = function(name) {
	this.name = name;
};

ag.meta.MockSourceObject.prototype.noArgMethod = function() {
	console.log('[' + this.name + '] MockSourceObject.noArgMethod()');
};

ag.meta.MockSourceObject.prototype.oneArgMethod = function(argOne) {
	console.log('[' + this.name + '] MockSourceObject.oneArgMethod(' + argOne.toString() + ')');
};

ag.meta.MockSourceObject.prototype.twoArgMethod = function(argOne, argTwo) {
	console.log('[' + this.name + '] MockSourceObject.oneArgMethod(' + argOne.toString() + ', ', + argTwo.toString() + ')');
};