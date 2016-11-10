/**
 * @fileoverview LineEdit extends LabelInput with the text changed signal.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.ui.LineEdit');

goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.ui.LabelInput');

goog.require('ag.meta.MetaObject');
goog.require('ag.validation.AbstractValidator');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {goog.ui.LabelInput}
 * @param {string=} optLabel The text to show as the label (placeholder text)
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
ag.ui.LineEdit = function(optLabel, optDomHelper) {
	goog.base(this, optLabel, optDomHelper);


	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {string|null}
	 * @private
	 */ 
	this.oldValue_ = null;

	/**
	 * @type {ag.validation.AbstractValidator}
	 * @private
	 */
	this.validator_ = null;
};
goog.inherits(ag.ui.LineEdit, goog.ui.LabelInput);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var classes = goog.dom.classes;
var events = goog.events;

var AbstractValidator = ag.validation.AbstractValidator;
var LineEdit = ag.ui.LineEdit;

var metaObject = ag.meta.MetaObject.getInstance;


// --------------------------------------------------------------------------------------------------------------------
// Constants
LineEdit.Css = {
    RootClass: goog.getCssName('ag-lineEdit')
};

var Css = LineEdit.Css;


// --------------------------------------------------------------------------------------------------------------------
// Signals
/** @enum {string} */
LineEdit.SignalType = {
	// newText
	TEXT_CHANGED: goog.events.getUniqueId('text-changed')
};


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * Clears the line edit
 */
LineEdit.prototype.clear = function() {
	this.setValue();
};

/** @override */
LineEdit.prototype.createDom = function() {
	goog.base(this, 'createDom');
	classes.add(this.getElement(), Css.RootClass);
};

/** @override */
LineEdit.prototype.enterDocument = function() {
	goog.base(this, 'enterDocument');

	this.oldValue_ = '';
	var input = this.getElement();
	// Call setValue to trigger any validator processing
	this.setValue(input.value);
	this.getHandler().listen(input, events.EventType.INPUT, this.onInput_);
};

/** @override */
LineEdit.prototype.exitDocument = function() {
	goog.base(this, 'exitDocument');

	var input = this.getElement();
	this.getHandler().unlisten(input, events.EventType.INPUT, this.onInput_);
};

/** @param {AbstractValidator} newValidator */
LineEdit.prototype.setValidator = function(newValidator) {
	this.validator_ = newValidator;
	this.setValue(this.oldValue_);
};

/** @override */
LineEdit.prototype.setValue = function(newValue) {
	var effectiveValue = newValue;
	if (this.validator_) {
		effectiveValue = this.validator_.fixup(effectiveValue);
		var validationState = this.validator_.validate(effectiveValue);
		if (validationState === AbstractValidator.State.Invalid)
			effectiveValue = this.oldValue_;
	}

	if (this.isInDocument())
		goog.base(this, 'setValue', effectiveValue);
	
	if (effectiveValue === this.oldValue_)
		return;

	metaObject().emit(this, LineEdit.SignalType.TEXT_CHANGED, effectiveValue);
	this.oldValue_ = effectiveValue;
};

/** @return {AbstractValidator} */
LineEdit.prototype.validator = function() {
	return this.validator_;
};


// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
LineEdit.prototype.decorateInternal = function(element) {
	goog.base(this, 'decorateInternal', element);
	classes.add(element, Css.RootClass);
};

/** @override */
LineEdit.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	delete this.validator_;
};


// --------------------------------------------------------------------------------------------------------------------
// Private functions
/**
 * @param {goog.events.BrowserEvent} event
 * @private
 */
LineEdit.prototype.onInput_ = function(event) {
	var input = this.getElement();
	this.setValue(input.value);
};

/*******************************************************************************************************************/});
