/**
 * @fileoverview AbstractSpinBox provides an input control for inputting numeric values within a user-defined range.
 *   AbstractSpinBox supports interaction with the mouse wheel and keyboard to easily adjust the current value. The
 *   type of input that is processed is determined by the supplied validator.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.ui.AbstractSpinBox');

goog.require('goog.asserts');
goog.require('goog.dom.classes');
goog.require('goog.dom.selection');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.events.KeyCodes');
goog.require('goog.events.MouseWheelHandler');
goog.require('goog.math');
goog.require('goog.ui.Component');

goog.require('ag.meta.MetaObject');
goog.require('ag.validation.AbstractNumberValidator');


// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {goog.ui.Component}
 * @param {ag.validation.AbstractNumberValidator} validator
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
ag.ui.AbstractSpinBox = function(validator, optDomHelper) {
	goog.base(this, optDomHelper);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.validation.AbstractNumberValidator}
	 * @private
	 */
	this.validator_ = validator;

	/**
	 * @type {string}
	 * @private
	 */
	this.lastGoodStringValue_;

	/**
	 * @type {goog.events.MouseWheelHandler}
	 * @private
	 */
	this.mouseWheelHandler_;

	/**
	 * @type {number}
	 * @private
	 */
	this.singleStep_ = 1;

	/**
	 * @type {number}
	 * @private
	 */ 
	this.value_;


	// --------------------------------------------------------------------------------------------------------------------
	// Initialization
	goog.asserts.assert(goog.isDefAndNotNull(this.validator_));
	this.setValue(this.minimum());
};
goog.inherits(ag.ui.AbstractSpinBox, goog.ui.Component);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var classes = goog.dom.classes;
var events = goog.events;
var math = goog.math;
var selection = goog.dom.selection;
var KeyCodes = events.KeyCodes;
var KeyEvent = events.KeyEvent;
var MouseWheelHandler = events.MouseWheelHandler;
var TagName = goog.dom.TagName;

var AbstractNumberValidator = ag.validation.AbstractNumberValidator;
var AbstractSpinBox = ag.ui.AbstractSpinBox;

var metaObject = ag.meta.MetaObject.getInstance;
var State = ag.validation.AbstractValidator.State;


// --------------------------------------------------------------------------------------------------------------------
// Signals
/** @enum {string} */
AbstractSpinBox.SignalType = {
	// newText
	VALUE_CHANGED: goog.events.getUniqueId('value-changed')
};


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
AbstractSpinBox.prototype.canDecorate = function(element) {
	return element.tagName === TagName.INPUT.toString();
};

/** @override */
AbstractSpinBox.prototype.createDom = function() {
  this.setElementInternal(this.getDomHelper().createDom(TagName.INPUT, {'type': 'text'}));
  this.decorateInternal(this.element_);
};

/** @override */
AbstractSpinBox.prototype.enterDocument = function() {
	goog.base(this, 'enterDocument');

	var input = this.getElement();
	input.value = this.value_;
	this.getHandler().listen(input, events.EventType.INPUT, this.onInput_)
					 .listen(input, events.EventType.BLUR, this.onBlur_)
					 .listen(input, events.EventType.KEYDOWN, this.onKeyDown_)
					 .listen(this.mouseWheelHandler_, MouseWheelHandler.EventType.MOUSEWHEEL, this.onMouseWheel_);
};

/** @override */
AbstractSpinBox.prototype.exitDocument = function() {
	goog.base(this, 'exitDocument');

	var input = this.getElement();
	this.getHandler().unlisten(input, events.EventType.INPUT, this.onInput_)
					 .unlisten(input, events.EventType.BLUR, this.onBlur_)
					 .unlisten(input, events.EventType.KEYDOWN, this.onKeyDown_)
					 .unlisten(this.mouseWheelHandler_, MouseWheelHandler.EventType.MOUSEWHEEL, this.onMouseWheel_);
};

/** @return {number} */
AbstractSpinBox.prototype.maximum = function() {
	return this.range().end;
};

/** @return {number} */
AbstractSpinBox.prototype.minimum = function() {
	return this.range().begin;
};

/** @return {AbstractRange} */
AbstractSpinBox.prototype.range = function() {
	return this.validator_.range();
};

/** @return {string} */
AbstractSpinBox.prototype.rootCssClass = goog.abstractMethod;

/**
 */
AbstractSpinBox.prototype.selectAll = function() {
	var input = this.getElement();
	input.focus();
	input.select();
};

/**
 * @param {number} newMaximum
 */
AbstractSpinBox.prototype.setMaximum = function(newMaximum) {
	this.validator_.setMaximum(newMaximum);
	this.constrainValueToRange_();
};

/**
 * @param {number} newMaximum
 */
AbstractSpinBox.prototype.setMinimum = function(newMinimum) {
	this.validator_.setMinimum(newMinimum);
	this.constrainValueToRange_();
};

/**
 * @param {ClosedIntRange} newRange
 */
AbstractSpinBox.prototype.setRange = function(newRange) {
	this.validator_.setRange(newRange);
	this.constrainValueToRange_();
};

/** @return {number} */
AbstractSpinBox.prototype.singleStep = function() {
	return this.singleStep_;
};

/**
 * @param {number} newSingleStep
 */
AbstractSpinBox.prototype.setSingleStep = function(newSingleStep) {
	this.singleStep_ = newSingleStep;
};

/**
 * @param {string|number} newValue
 */
AbstractSpinBox.prototype.setValue = function(newValue) {
	var effectiveValue = this.validator_.fixup(newValue);
	var validationState = this.validator_.validate(effectiveValue);

	// console.log('SetValue: ' + newValue + ' => ' + effectiveValue + ' ==> ' + validationState);

	var input = this.getElement();
	if (validationState === State.Invalid) {
		assert(goog.isDefAndNotNull(this.lastGoodStringValue_));
		if (input)
			input.value = this.lastGoodStringValue_;
		return;
	}

	if (input)
		input.value = effectiveValue;
	this.lastGoodStringValue_ = effectiveValue;
	if (this.value_ == effectiveValue)
		return;

	if (validationState === State.Acceptable) {
		this.value_ = this.convertValidStringValueToNumber(effectiveValue);
		metaObject().emit(this, AbstractSpinBox.SignalType.VALUE_CHANGED, this.value_);
	}
};

/**
 * If it is not possible to make a complete step because this will exit the valid range, clamp to the nearest
 * range terminus.
 *
 * @param {number} steps
 */
AbstractSpinBox.prototype.stepBy = function(steps) {
	var newValue = this.value_ + steps * this.singleStep_;
	if (newValue < this.minimum())
		this.setValue(this.minimum());
	else if (newValue > this.maximum())
		this.setValue(this.maximum())
	else
		this.setValue(newValue);
	this.valueChangedViaStep();
};

/**
 * Equivalent to calling stepBy(-1)
 */
AbstractSpinBox.prototype.stepDown = function() {
	this.stepBy(-1);
};

/**
 * Equivalent to calling stepBy(1)
 */
AbstractSpinBox.prototype.stepUp = function() {
	this.stepBy(1);
};

/** @return {AbstractNumberValidator} */
AbstractSpinBox.prototype.validator = function() {
	return this.validator_;
};

/** @return {number} */
AbstractSpinBox.prototype.value = function() {
	return this.value_;
};


// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
AbstractSpinBox.prototype.decorateInternal = function(element) {
	goog.base(this, 'decorateInternal', element);
	classes.add(element, this.rootCssClass());
	this.setValue(element.value);

	this.mouseWheelHandler_ = new MouseWheelHandler(element);
};

/** @override */
AbstractSpinBox.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	this.mouseWheelHandler_.dispose();

	delete this.mouseWheelHandler_;
	delete this.validator_;
};

/**
 * @param {string} value
 * @return {string}
 * @protected
 */
AbstractSpinBox.prototype.convertValidStringValueToNumber = goog.abstractMethod;

/**
 * Virtual stub for further processing after the value has changed from calling stepBy.
 *
 * @protected
 */
AbstractSpinBox.prototype.valueChangedViaStep = function() {};

/**
 * Virtual stub that allows further processing after an editing operation has finished (e.g. after a blur).
 *
 * @protected
 */
AbstractSpinBox.prototype.editingFinished = function() {};


// --------------------------------------------------------------------------------------------------------------------
// Private functions
/**
 */
AbstractSpinBox.prototype.constrainValueToRange_ = function() {
	var range = this.range();

	// Tweak the current value to a compatible value within this range (if necessary)
	if (this.value_ < range.begin)
		this.setValue(range.begin);
	else if (this.value_ > range.end)
		this.setValue(range.end);
};

/**
 * @param {goog.events.BrowserEvent} event
 * @private
 */
AbstractSpinBox.prototype.onBlur_ = function(event) {
	var input = this.getElement();
	this.setValue(this.value_);
	this.editingFinished();
};

/**
 * @param {goog.events.BrowserEvent} event
 * @private
 */
AbstractSpinBox.prototype.onInput_ = function(event) {
	var input = this.getElement();
	this.setValue(input.value);
};

/**
 * @param {goog.events.KeyEvent} keyEvent
 * @private
 */
AbstractSpinBox.prototype.onKeyDown_ = function(keyEvent) {
	var handledKey = true;
	switch (keyEvent.keyCode) {
	case KeyCodes.UP:
		this.stepUp();
		break;
	case KeyCodes.DOWN:
		this.stepDown();
		break;
	case KeyCodes.ENTER:
		this.editingFinished();
		break;
	case KeyCodes.DASH:
		// Only process dash keys if caret is at the beginning and a negative range is permitted
		var caretPos = selection.getStart(this.getElement());
		if (caretPos > 0 || this.range().begin >= 0) {
			handledKey = true;
			break;
		}

	default:
		handledKey = false;
		break;
	};

	if (handledKey)
		keyEvent.preventDefault();
};

/**
 * @param {MouseWheelEvent} wheelEvent
 */
AbstractSpinBox.prototype.onMouseWheel_ = function(wheelEvent) {
	this.stepBy((-wheelEvent.deltaY / 3) | 0);
	wheelEvent.preventDefault();
};

/*******************************************************************************************************************/});
