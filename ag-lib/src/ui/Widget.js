/**
 * @fileoverview Widget provides a base implementation of common functionality that serves as a good starting point
 *   for all widgets.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.ui.Widget');

goog.require('goog.dom.classes');
goog.require('goog.dom.TagName');
goog.require('goog.ui.Component');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {goog.ui.Component}
 * @param {string} optClass optional class to give this widget
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
ag.ui.Widget = function(optClass, optDomHelper) {
    goog.base(this, optDomHelper);


    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /** 
     * @type {string}
     * @private
     */
    this.rootCssClass_ = optClass || goog.getCssName('ag-widget');
};
goog.inherits(ag.ui.Widget, goog.ui.Component);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var classes = goog.dom.classes;
var TagName = goog.dom.TagName;

var Widget = ag.ui.Widget;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
Widget.prototype.canDecorate = function(element) {
    return element.tagName === TagName.DIV.toString();
};

/** @override */
Widget.prototype.createDom = function() {
    goog.base(this, 'createDom');
    classes.add(this.getElement(), this.rootCssClass_);
};

/** @return {string} */
Widget.prototype.rootCssClass = function() {
    return this.rootCssClass_;
}

// --------------------------------------------------------------------------------------------------------------------
// Protected
/** @override */
Widget.prototype.decorateInternal = function(element) {
    goog.base(this, 'decorateInternal', element);
    classes.add(element, this.rootCssClass_);
};


/*******************************************************************************************************************/});
