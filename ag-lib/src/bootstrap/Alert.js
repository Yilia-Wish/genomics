/**
 * @fileoverview: Alert encapsulates the Bootstrap JS capability needed for producing alerts.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('bootstrap.Alert');

goog.require('goog.dom.classes');
goog.require('goog.dom.TagName');
goog.require('goog.events.EventType');
goog.require('goog.ui.Component');

// Content with data-dismiss="alert" will close the alert when clicked.
/**
 * @constructor
 * @extends {goog.ui.Component}
 * @param {*}
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
bootstrap.Alert = function(optContent, optDomHelper) {
    goog.base(this, optDomHelper);

    // --------------------------------------------------------------------------------------------------------------------
    /**
     * @type {*}
     * @private
     */
    this.content_;

    // --------------------------------------------------------------------------------------------------------------------
    this.setContent(optContent);
};
goog.inherits(bootstrap.Alert, goog.ui.Component);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var classes = goog.dom.classes;
var EventType = goog.events.EventType;
var TagName = goog.dom.TagName;

var Alert = bootstrap.Alert;

// --------------------------------------------------------------------------------------------------------------------
// Constants
Alert.Css = {
    RootClass: goog.getCssName('alert')
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
Alert.prototype.canDecorate = function(element) {
    return element.tagName === TagName.DIV.toString();
};

Alert.prototype.createDom = function() {
    goog.base(this, 'createDom');

    this.decorateInternal(this.getElement());
};

Alert.prototype.close = function() {
    this.dispose();
};

Alert.prototype.enterDocument = function() {
    goog.base(this, 'enterDocument');

    this.getHandler().listen(this.getElement(), EventType.CLICK, this.onClick_);
};

Alert.prototype.exitDocument = function() {
    goog.base(this, 'exitDocument');

    this.getHandler().unlisten(this.getElement(), EventType.CLICK, this.onClick_);
};

Alert.prototype.setContent = function(content) {
    this.content_ = content;
    if (this.isInDocument())
        this.getElement().innerHTML = content;
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
Alert.prototype.decorateInternal = function(element) {
    goog.base(this, 'decorateInternal', element);
    classes.add(element, Alert.Css.RootClass);
    element.innerHTML = this.content_;
};

Alert.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    delete this.content_;
};

// --------------------------------------------------------------------------------------------------------------------
// Event handlers
Alert.prototype.onClick_ = function(event) {
    var el = event.target;

    var dismissAttribute = el.getAttribute('data-dismiss');
    if (dismissAttribute && dismissAttribute === 'alert')
        this.close();
};

// --------------------------------------------------------------------------------------------------------------------
// Private methods
Alert.prototype.updateHTMLContent_ = function() {
    if (!this.isInDocument())
        return;

    this.getElement().innerHTML = this.content_;
};

/*******************************************************************************************************************/});

