goog.provide('ag.ui.HeaderViewMachine.ClickingColumnState');

goog.require('goog.asserts');
goog.require('goog.events');
goog.require('goog.events.EventType');

goog.require('ag.statemachine.State');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.statemachine.State}
 */
ag.ui.HeaderViewMachine.ClickingColumnState = function(optName) {
	goog.base(this, optName);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {number}
	 * @private
	 */
	this.initialColumn_ = -1;

	/**
	 * @type {number}
	 * @private
	 */
	this.finalColumn_ = -1;
};
goog.inherits(ag.ui.HeaderViewMachine.ClickingColumnState, ag.statemachine.State);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var EventType = goog.events.EventType;

var ClickingColumnState = ag.ui.HeaderViewMachine.ClickingColumnState;

// --------------------------------------------------------------------------------------------------------------------
// Signals
/** @enum {string} */
ClickingColumnState.SignalType = {
	COLUMN_CHANGED: goog.events.getUniqueId('column-changed')
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * Returns the current column that will be / has been clicked if both the initial and final column are equivalent;
 * otherwise -1 is returned.
 *
 * @return {number}
 */
ClickingColumnState.prototype.column = function() {
	return (this.initialColumn_ === this.finalColumn_) ? this.initialColumn_ : -1;
};

// --------------------------------------------------------------------------------------------------------------------
// Reimplemented protected functions
/** @override */
ClickingColumnState.prototype.onEntry = function(event) {
	assert(event.hasOwnProperty('userData') && goog.isDefAndNotNull(event['userData']['column']));
	this.initialColumn_ = this.finalColumn_ = event['userData']['column'];

	this.emitColumnChangedSignal_();

	goog.base(this, 'onEntry', event);
};

/** @override */
ClickingColumnState.prototype.processEvent = function(event) {
	if (event.type !== EventType.MOUSEMOVE)
		return;

	if (event.hasOwnProperty('userData') && goog.isDefAndNotNull(event['userData']['column'])) {
		var column = event['userData']['column'];
		if (column !== this.finalColumn_) {
			this.finalColumn_ = column;
			this.emitColumnChangedSignal_();
		}
	}
};

// --------------------------------------------------------------------------------------------------------------------
// Private functions
/**
 * @private
 */
ClickingColumnState.prototype.emitColumnChangedSignal_ = function() {
	this.emit(ClickingColumnState.SignalType.COLUMN_CHANGED, this.column(), this.initialColumn_);
};

/*******************************************************************************************************************/});
