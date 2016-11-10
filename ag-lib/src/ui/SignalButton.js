goog.provide('ag.ui.SignalButton');

goog.require('goog.events');
goog.require('goog.ui.CustomButton');

goog.require('ag.meta.MetaObject');

// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Constructor and destructor
/**
 * @constructor
 */
ag.ui.SignalButton = function(content) {
	goog.base(this, content);
};
goog.inherits(ag.ui.SignalButton, goog.ui.CustomButton);


// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Signals
/** @enum {string} */
ag.ui.SignalButton.SignalType = {
	ACTION: goog.events.getUniqueId('action')
};


// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Public methods
ag.ui.SignalButton.prototype.enterDocument = function() {
	goog.base(this, 'enterDocument');

	this.getHandler().listen(this, goog.ui.Component.EventType.ACTION, this.onButtonAction_);
};

ag.ui.SignalButton.prototype.exitDocument = function() {
	goog.base(this, 'exitDocument');

	this.getHandler().unlisten(this, goog.ui.Component.EventType.ACTION, this.onButtonAction_);
};


// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Private methods
ag.ui.SignalButton.prototype.onButtonAction_ = function() {
	ag.meta.MetaObject.getInstance().emit(this, ag.ui.SignalButton.SignalType.ACTION);
};