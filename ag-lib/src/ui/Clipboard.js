goog.provide('ag.ui.Clipboard');

goog.require('goog.dom');
goog.require('goog.style');

/**
 * An ingenious trick for implementing clipboard operations involves using a hidden text area that is populated
 * with the relevant content just before a copy or paste command is initiated. This is accomplished in an external
 * component by observing for keyDown events and then calling copy/paste in response to the proper key combination.
 *
 * @constructor
 */
ag.ui.Clipboard = function() {
	/**
	 * @type {HTMLTextArea}
	 * @private
	 */
	this.textArea_ = ag.ui.Clipboard.createTextArea_();

	// Must have the textarea in the document for the copy command to take effect.
	document.body.appendChild(this.textArea_);
};
goog.addSingletonGetter(ag.ui.Clipboard);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var dom = goog.dom;
var style = goog.style;

var Clipboard = ag.ui.Clipboard;

// --------------------------------------------------------------------------------------------------------------------
// Static methods
/**
 * Private static factory method for generating a hidden textarea for copy and paste purposes.
 * @return {HTMLTextArea}
 */
Clipboard.createTextArea_ = function() {
	var textarea = dom.createElement('textarea');
	textarea.tabIndex = -1;
	textarea.style.position = 'absolute';
	textarea.style.width = '100px';
	textarea.style.height = '100px';
	textarea.style.left = '-200px';
	textarea.style.top = 0;
	return textarea;
};

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * @param {string} plainText
 * @param {Element} returnFocusElement
 */
Clipboard.prototype.copy = function(plainText, returnFocusElement) {
	this.textArea_.value = plainText;
	if (returnFocusElement)
		this.textArea_.style.top = (style.getRelativePosition(returnFocusElement, document.body).y - 100) + 'px';
	this.textArea_.focus();
	this.textArea_.select();
	Clipboard.returnFocus_(returnFocusElement);
};

/**
 * @param {string} input
 * @param {Element} returnFocusElement
 */
Clipboard.prototype.paste = function(returnFocusElement) {
	this.textArea_.value = 'Pre-paste';
	this.textArea_.focus();
	this.textArea_.select();
	Clipboard.returnFocus_(returnFocusElement);
};

/** @return {string} */
Clipboard.prototype.pastedText = function() {
	return this.textArea_.value;
};


// --------------------------------------------------------------------------------------------------------------------
// Private static methods
Clipboard.returnFocus_ = function(element) {
	if (!element)
		return;

	// Kick off a timer to refocus the original element *after* the potential copy/paste command has finished.
	setTimeout(function() {
		element.focus();
	}, 10);
};

/*******************************************************************************************************************/});
