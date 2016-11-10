/**
 * @fileoverview Label simply provides a slotted mechanism for updating the text content of a dom element
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.ui.Label');

goog.require('goog.dom.classes');
goog.require('goog.dom.TagName');
goog.require('goog.ui.Component');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {goog.ui.Component}
 * @param {string=} optText The text to show as the label (placeholder text)
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
ag.ui.Label = function(optText, optDomHelper) {
    goog.base(this, optDomHelper);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {string}
     * @private
     */
    this.text_;


    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    this.setText(goog.isString(optText) ? optText : '');
};
goog.inherits(ag.ui.Label, goog.ui.Component);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var classes = goog.dom.classes;
var TagName = goog.dom.TagName;

var Label = ag.ui.Label;


// --------------------------------------------------------------------------------------------------------------------
// Constants
Label.Css = {
    RootClass: goog.getCssName('ag-label')
};


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
Label.prototype.canDecorate = function(element) {
    return element.tagName === TagName.SPAN.toString();
};

/** @override */
Label.prototype.createDom = function() {
    this.setElementInternal(this.getDomHelper().createDom(TagName.SPAN));
};

/** @override */
Label.prototype.enterDocument = function() {
    goog.base(this, 'enterDocument');

    this.updateHTMLText_();
};

/**
 * @param {string} newText
 */
Label.prototype.setText = function(newText) {
    this.text_ = newText;
    this.updateHTMLText_();
};

/** @return {string} */
Label.prototype.text = function() {
    return this.text_;
};


// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
Label.prototype.decorateInternal = function(element) {
    goog.base(this, 'decorateInternal', element);
    classes.add(element, Label.Css.RootClass);

    // Give precedence 
    if (this.text_.length === 0) 
        this.text_ = this.getDomHelper().getTextContent(element);
};


// --------------------------------------------------------------------------------------------------------------------
// Private functions
/**
 * @private
 */
Label.prototype.updateHTMLText_ = function() {
    if (this.isInDocument())
        this.getDomHelper().setTextContent(this.getElement(), this.text_);
};

/*******************************************************************************************************************/});
