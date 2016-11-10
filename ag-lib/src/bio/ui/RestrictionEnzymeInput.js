/**
 * @fileoverview RestrictionEnzymeInput receives input for a primer finder's restriction enzyme via either manual
 *   input or by calling setRestrictionEnzyme.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.bio.ui.RestrictionEnzymeInput');

goog.require('goog.asserts');
goog.require('goog.dom.classes');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.style');
goog.require('goog.ui.Component');

goog.require('ag.bio.RestrictionEnzyme');
goog.require('ag.bio.validation.DnaSequenceValidator');
goog.require('ag.meta.MetaObject');
goog.require('ag.ui.LineEdit');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {goog.ui.Component}
 * @param {string} optLabel Label for restriction enzyme input
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
ag.bio.ui.RestrictionEnzymeInput = function(optLabel, optDomHelper) {
    goog.base(this, optDomHelper);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {ag.bio.RestrictionEnzyme}
     * @private
     */
    this.enzyme_ = new ag.bio.RestrictionEnzyme();

    /**
     * @type {string}
     * @private
     */
    this.label_ = goog.isString(optLabel) ? optLabel : null;

    /**
     * @type {ag.ui.LineEdit}
     * @private
     */
    this.lineEdit_ = new ag.ui.LineEdit(null, optDomHelper);

    /**
     * @type {HTMLElement}
     * @private
     */
    this.nameSpan_;

    /**
     * @type {HTMLElement}
     * @private
     */
    this.parentSpan_;

    /**
     * @type {HTMLElement}
     * @private
     */
    this.siteSpan_;


    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    this.lineEdit_.setValidator(new ag.bio.validation.DnaSequenceValidator());
};
goog.inherits(ag.bio.ui.RestrictionEnzymeInput, goog.ui.Component);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var classes = goog.dom.classes;
var events = goog.events;
var style = goog.style;
var TagName = goog.dom.TagName;

var DnaSequenceValidator = ag.bio.validation.DnaSequenceValidator;
var LineEdit = ag.ui.LineEdit;
var RestrictionEnzyme = ag.bio.RestrictionEnzyme;
var RestrictionEnzymeInput = ag.bio.ui.RestrictionEnzymeInput;

var metaObject = ag.meta.MetaObject.getInstance;

// --------------------------------------------------------------------------------------------------------------------
// Constants
/** @enum {string} */
RestrictionEnzymeInput.Css = {
    RootClass: goog.getCssName('ag-restrictionEnzymeInput'),
    NameClass: goog.getCssName('name'),
    SiteClass: goog.getCssName('site')
};

var Css = RestrictionEnzymeInput.Css;

/** @enum {string} */
RestrictionEnzymeInput.IdFragment = {
    INPUT: 'inp'
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
RestrictionEnzymeInput.prototype.canDecorate = function(element) {
    return element.tagName === TagName.DIV.toString();
};

/** @override */
RestrictionEnzymeInput.prototype.enterDocument = function() {
    goog.base(this, 'enterDocument');

    this.showRelevantControls_();

    this.getHandler().listen(this.parentSpan_, events.EventType.CLICK, this.onParentSpanClick_);
    metaObject().connect(this.lineEdit_, LineEdit.SignalType.TEXT_CHANGED, this, this.onLineEditTextChanged_);
};

/** @override */
RestrictionEnzymeInput.prototype.exitDocument = function() {
    goog.base(this, 'exitDocument');
    this.getHandler().unlisten(this.parentSpan_, events.EventType.CLICK, this.onParentSpanClick_);
    this.getHandler().unlisten(this.lineEdit_.getElement(), events.EventType.BLUR, this.onLineEditBlur_);
    metaObject().disconnect(this.lineEdit_, LineEdit.SignalType.TEXT_CHANGED, this, this.onLineEditTextChanged_);
};

/** @return {RestrictionEnzyme} */
RestrictionEnzymeInput.prototype.restrictionEnzyme = function() {
    if (!this.enzyme_.isEmpty())
        return this.enzyme_;
    else
        return new RestrictionEnzyme(null, this.lineEdit_.getValue());
};

/**
 * @param {RestrictionEnzyme} newRE
 */
RestrictionEnzymeInput.prototype.setRestrictionEnzyme = function(newRE) {
    // Note: this will trigger a textChanged signal which may/may not update the this.enzyme_ variable. Thus,
    // we clear *before* setting the this.enzyme_ variable.
    this.lineEdit_.clear();
    this.enzyme_ = newRE;
    if (!this.isInDocument())
        return;

    var domHelper = this.getDomHelper();
    var site = newRE.recognitionSite.toString();
    domHelper.setTextContent(this.nameSpan_, newRE.name);
    domHelper.setTextContent(this.siteSpan_, site);
    this.lineEdit_.setValue(site);    

    this.showRelevantControls_();
};

/**
 * @param {string} site
 */
RestrictionEnzymeInput.prototype.setManualSite = function(site) {
    this.lineEdit_.setValue(site);
    this.showLineEdit_();
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
RestrictionEnzymeInput.prototype.decorateInternal = function(element) {
    goog.base(this, 'decorateInternal', element);
    classes.add(element, Css.RootClass);

    var domHelper = this.getDomHelper();
    var childLabels = domHelper.getElementsByTagNameAndClass(TagName.LABEL, null, element);
    var childLabel = childLabels.length ? childLabels[0] : null;

    var lineEditId = this.makeId(RestrictionEnzymeInput.IdFragment.INPUT);
    if (childLabel)
        childLabel.htmlFor = lineEditId;
    else if (this.label_)
        element.appendChild(domHelper.createDom(TagName.LABEL, {'for': lineEditId}, this.label_));

    this.addChild(this.lineEdit_, true /* opt_render */);
    this.lineEdit_.getElement().id = lineEditId;

    this.nameSpan_ = domHelper.createDom(TagName.SPAN);
    classes.add(this.nameSpan_, Css.NameClass);
    this.siteSpan_ = domHelper.createDom(TagName.SPAN);
    classes.add(this.siteSpan_, Css.SiteClass);
    this.parentSpan_ = domHelper.createDom(TagName.SPAN, null, [this.nameSpan_, domHelper.createTextNode(' - '), this.siteSpan_]);
    element.appendChild(this.parentSpan_);
};

/** @override */
RestrictionEnzymeInput.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    delete this.enzyme_;
    if (this.lineEdit_)
        this.lineEdit_.dispose();
    delete this.lineEdit_;
    delete this.nameSpan_;
    delete this.siteSpan_;
    delete this.parentSpan_;
}


// --------------------------------------------------------------------------------------------------------------------
// Private event handlers
/**
 * @param {goog.events.BrowserEvent} event
 * @private
 */
RestrictionEnzymeInput.prototype.onParentSpanClick_ = function(event) {
    assert(!this.enzyme_.isEmpty());
    this.setManualSite(this.enzyme_.recognitionSite.toString());
    var input = this.lineEdit_.getElement();
    input.focus();
    input.select();

    // Watch for blur or escape event in which nothing changes
    this.getHandler().listenOnce(input, events.EventType.BLUR, this.onLineEditBlur_);
};

/**
 * @param {goog.events.BrowserEvent} event
 * @private
 */
RestrictionEnzymeInput.prototype.onLineEditBlur_ = function(event) {
    if (this.manualSiteEqualsRESite_())
        this.showRE_();
};


// --------------------------------------------------------------------------------------------------------------------
// Private slots
/**
 * @param {string} text
 * @private
 */
RestrictionEnzymeInput.prototype.onLineEditTextChanged_ = function(text) {
    if (!this.manualSiteEqualsRESite_())
        this.enzyme_ = new RestrictionEnzyme();
};


// --------------------------------------------------------------------------------------------------------------------
// Private functions
/**
 * @return {boolean}
 * @private
 */
RestrictionEnzymeInput.prototype.manualSiteEqualsRESite_ = function() {
    return !this.enzyme_.isEmpty() && this.lineEdit_.getValue() === this.enzyme_.recognitionSite.toString();
};

/**
 * Shows the line edit if there is no name or recognition site associated with the internal restriction enyzme;
 * otherwise, show the restriction enzyme information.
 *
 * @private
 */
RestrictionEnzymeInput.prototype.showRelevantControls_ = function() {
    assert(this.isInDocument());
    var re = this.enzyme_;
    if (re.isEmpty() || !re.name)
        this.showLineEdit_();
    else
        this.showRE_();
};

/**
 * @private
 */
RestrictionEnzymeInput.prototype.showLineEdit_ = function() {
    style.showElement(this.lineEdit_.getElement(), 1);
    style.showElement(this.parentSpan_, 0);
};

/**
 * @private
 */
RestrictionEnzymeInput.prototype.showRE_ = function() {
    style.showElement(this.lineEdit_.getElement(), 0);
    style.showElement(this.parentSpan_, 1);
};

/*******************************************************************************************************************/});
