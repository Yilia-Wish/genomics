goog.provide('ag.meta.SignalSpy');

goog.require('goog.array');
goog.require('goog.Disposable');

goog.require('ag.meta.MetaObject');

// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Constructor and destructor
/**
 * @constructor
 */
ag.meta.SignalSpy = function(sourceObj, signalName) {
	goog.base(this);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.core.AObject}
	 * @private
	 */
	this.sourceObj_ = sourceObj;

	/**
	 * @type {string}
	 * @private
	 */
	this.signalName_ = signalName;

	/**
	 * @type {Array}
	 * @private
	 */
	this.signals_ = [];

	// --------------------------------------------------------------------------------------------------------------------
	// Initialization
	ag.meta.MetaObject.getInstance().connect(sourceObj, signalName, this, this.onSignalEmitted_);
};
goog.inherits(ag.meta.SignalSpy, goog.Disposable);

/**
 * Clears internal state and disconnects from the attached sourceObj.signal.
 */
ag.meta.SignalSpy.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	this.clear();
	ag.meta.MetaObject.getInstance().disconnect(this.sourceObj_, this.signalName_, this, this.onSignalEmitted_);
};


// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * Removes all cached signals and restores to a clean state
 */
ag.meta.SignalSpy.prototype.clear = function() {
	goog.array.clear(this.signals_);
};

/** @return {boolean} */
ag.meta.SignalSpy.prototype.isEmpty = function() {
	return this.signals_.length === 0;
};

/** @return {string} */
ag.meta.SignalSpy.prototype.signalName = function() {
	return this.signalName_;
};

/** @return {Array} */
ag.meta.SignalSpy.prototype.signals = function() {
	return this.signals_;
};

/** @return {number} */
ag.meta.SignalSpy.prototype.size = function() {
	return this.signals_.length;
};

/** @return {Object} */
ag.meta.SignalSpy.prototype.sourceObject = function() {
	return this.sourceObj_;
};


// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Private methods
ag.meta.SignalSpy.prototype.onSignalEmitted_ = function() {
	// Convert the arguments object to a pure array
	this.signals_.push(goog.array.slice(arguments, 0));
};

