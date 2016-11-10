goog.provide('ag.meta.MockDestObject');

goog.require('ag.meta.MetaObject');

ag.meta.MockDestObject = function(name) {
	this.clear();

	this.name = name;
};

ag.meta.MockDestObject.callIdSequence = 0;

var metaObject = ag.meta.MetaObject.getInstance;

ag.meta.MockDestObject.prototype.clear = function() {
	this.name = name;
	this.arguments = [];
	this.callList = [];
	this.callId = 0;

	this.signalName = null;
	this.sender = null;
};

ag.meta.MockDestObject.prototype.noArgMethod = function() {
	this.arguments = arguments;
	this.callList.push(0);
	this.assignCallId();
	console.log('[' + this.name + '] MockDestObject.noArgMethod()');

	this.saveSenderSignal();
};

ag.meta.MockDestObject.prototype.oneArgMethod = function(argOne) {
	this.arguments = arguments;
	this.callList.push(1);
	this.assignCallId();
	console.log('[' + this.name + '] MockDestObject.oneArgMethod(' + argOne.toString() + ')');

	this.saveSenderSignal();
};

ag.meta.MockDestObject.prototype.twoArgMethod = function(argOne, argTwo) {
	this.arguments = arguments;
	this.callList.push(2);
	this.assignCallId();
	console.log('[' + this.name + '] MockDestObject.oneArgMethod(' + argOne.toString() + ', ', + argTwo.toString() + ')');

	this.saveSenderSignal();
};


ag.meta.MockDestObject.prototype.assignCallId = function() {
	ag.meta.MockDestObject.callIdSequence++;
	this.callId = ag.meta.MockDestObject.callIdSequence;
};

ag.meta.MockDestObject.prototype.saveSenderSignal = function() {
	this.signalName = metaObject().signalName();
	this.sender = metaObject().sender();
};