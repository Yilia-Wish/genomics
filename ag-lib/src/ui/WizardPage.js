/**
 * @fileoverview WizardPage is the base class for individual wizard pages.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.ui.WizardPage');
goog.provide('ag.ui.WizardPage.Field');

goog.require('goog.asserts');
goog.require('goog.object');

goog.require('ag.meta.MetaObject');
goog.require('ag.ui.Widget');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.ui.Widget}
 * @param {string} optClass optional class to give this widget
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
ag.ui.WizardPage = function(optClass, optDomHelper) {
    goog.base(this, optClass, optDomHelper);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {boolean}
     * @private
     */
    this.finalPage_ = false;

    /**
     * @type {Object.<string,ag.ui.WizardPage.Field>}
     * @private
     */
    this.registeredFields_ = {};

    /**
     * @type {string}
     * @private
     */
    this.subTitle_ = '';

    /**
     * @type {string}
     * @private
     */
    this.title_ = '';

    /**
     * Internal variable set by Wizard.addPage
     *
     * @type {ag.ui.Wizard}
     * @protected
     */
    this.wizard_;
};
goog.inherits(ag.ui.WizardPage, ag.ui.Widget);

/**
 * @constructor
 * @param {string} name Arbitrary name for identifying this field
 * @param {Object} sourceObject Object whose property is reflected in this field
 * @param {Function} accessor Method of source object for accessing the relevant property representing this field
 * @param {Function=} optSetter Optional method for setting this field's value (should take one argument)
 * @param {boolean=} optMandatory defaults to false
 */
ag.ui.WizardPage.Field = function(name, sourceObject, accessor, optSetter, optMandatory) {
    // --------------------------------------------------------------------------------------------------------------------
    // Public members
    /**
     * @type {string}
     * @public
     */
    this.name_ = name;

    /**
     * @type {Object}
     * @public
     */
    this.sourceObject_ = sourceObject;

    /**
     * @type {Function}
     * @public
     */
    this.accessor_ = accessor;

    /**
     * @type {Function}
     * @public
     */
    this.setter_ = optSetter;

    /**
     * @type {boolean}
     * @public
     */
    this.mandatory_ = goog.isBoolean(optMandatory) ? optMandatory : false;

    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    goog.asserts.assert(goog.isObject(this.sourceObject_));
    goog.asserts.assert(goog.isFunction(this.accessor_));
    goog.asserts.assert(!this.setter_ || goog.isFunction(this.setter_));
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var object = goog.object;

var Field = ag.ui.WizardPage.Field;
var WizardPage = ag.ui.WizardPage;

var metaObject = ag.meta.MetaObject.getInstance;

// --------------------------------------------------------------------------------------------------------------------
// Signals
/** @enum {string} */
WizardPage.SignalType = {
    COMPLETE_CHANGED: goog.getCssName('complete-changed')
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {boolean} */
WizardPage.prototype.acceptCancel = function() {
    return true;
};

/**
 */
WizardPage.prototype.cleanupPage = function() {};

/** @override */
WizardPage.prototype.createDom = function() {
    goog.base(this, 'createDom');
    this.domSetup_();
};

/**
 * @param {string} name
 * @return {*}
 */
WizardPage.prototype.field = function(name) {
    if (this.hasField(name))
        return this.registeredFields_[name].value();

    return null;
};

/**
 * @param {string} name
 * @return {*}
 */
WizardPage.prototype.hasField = function(name) {
    return object.containsKey(this.registeredFields_, name);
};

/** @return {boolean} */
WizardPage.prototype.hasValidInput = function() {
    return true;
};

/** @return {number} */
WizardPage.prototype.initializePage = function() {};

/** @return {boolean} */
WizardPage.prototype.isComplete = function() {
    for (var i=0, z=this.registeredFields_.length; i<z; i++) {
        var f = this.registeredFields_[i];
        if (!f.mandatory_)
            continue;

        if (!f.value())
            return false;
    }

    return true;
};

/** @return {boolean} */
WizardPage.prototype.isFinalPage = function() {
    return this.finalPage_;
};

/**
 * Virtual stub to enable wizard pages to perform last minute customizations when the page is navigated to via the next
 * button.
 */
WizardPage.prototype.onShow = function() {};

/**
 * @param {string} name
 * @param {*} value
 */
WizardPage.prototype.setField = function(name, value) {
    if (!this.hasField(name))
        return;

    this.registeredFields_[name].setValue(value);
};

/**
 * @param {boolean} finalPage
 */
WizardPage.prototype.setFinalPage = function(finalPage) {
    this.finalPage_ = finalPage;
};

/** @param {string} newSubTitle */
WizardPage.prototype.setSubTitle = function(newSubTitle) {
    this.subTitle_ = newSubTitle;
};

/** @param {string} newTitle */
WizardPage.prototype.setTitle = function(newTitle) {
    this.title_ = newTitle;
};

/** @return {string} */
WizardPage.prototype.subTitle = function() {
    return this.subTitle_;
};

/** @return {string} */
WizardPage.prototype.title = function() {
    return this.title_;
};


// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
WizardPage.prototype.decorateInternal = function(element) {
    goog.base(this, 'decorateInternal', element);
    this.domSetup_();
};

/** @override */
WizardPage.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');
    delete this.registeredFields_;
};

/** @protected */
WizardPage.prototype.domSetup_ = function() {};

/** @protected */
WizardPage.prototype.emitCompleteChanged_ = function() {
    metaObject().emit(this, WizardPage.SignalType.COMPLETE_CHANGED);
};

/**
 * @param {Field} newField
 */
WizardPage.prototype.registerField = function(newField) {
    assert(newField instanceof Field);
    this.registeredFields_[newField.name_] = newField;
};


// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Field implementation
/** @return {*} */
Field.prototype.value = function() {
    return this.accessor_.call(this.sourceObject_);
};

/**
 * @param {*} newValue
 */
Field.prototype.setValue = function(newValue) {
    if (this.setter_)
        this.setter_.call(this.sourceObject_, newValue);
};


/*******************************************************************************************************************/});
