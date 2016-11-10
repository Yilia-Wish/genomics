/**
 * @fileoverview ThreePrimeInput creates a user-interface control for constructing a DnaPattern to represent the 
 *   3' input of a primer.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.bio.ui.ThreePrimeInput');

goog.require('goog.array');
goog.require('goog.dom.classes');
goog.require('goog.dom.TagName');
goog.require('goog.ui.Component');

goog.require('ag.bio.DnaPattern');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {goog.ui.Component}
 * @param {string} optLabel Label for restriction enzyme input
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
ag.bio.ui.ThreePrimeInput = function(optLabel, optDomHelper) {
    goog.base(this, optDomHelper);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {string}
     * @private
     */
    this.label_ = goog.isString(optLabel) ? optLabel : null;

    /**
     * @type {Array.<HTMLElement>}
     * @private
     */
    this.selectElements_ = [];
};
goog.inherits(ag.bio.ui.ThreePrimeInput, goog.ui.Component);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var classes = goog.dom.classes;
var TagName = goog.dom.TagName;

var DnaPattern = ag.bio.DnaPattern;
var ThreePrimeInput = ag.bio.ui.ThreePrimeInput;


// --------------------------------------------------------------------------------------------------------------------
// Constants
ThreePrimeInput.Css = {
    RootClass: goog.getCssName('ag-threePrimeInput'),
    BasePosClass: goog.getCssName('position')
};

/** @enum {string} */
ThreePrimeInput.IdFragment = {
    COMBO: 'cmb'
};


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
ThreePrimeInput.prototype.canDecorate = function(element) {
    return element.tagName === TagName.DIV.toString();
};

/** @return {DnaPattern} */
ThreePrimeInput.prototype.dnaPattern = function() {
    var stringPattern = '';
    array.forEach(this.selectElements_, function(selectElement) {
        stringPattern += selectElement.value;
    });
    if (stringPattern === 'NNN')
        stringPattern = null;

    return new DnaPattern(stringPattern);
};

/**
 * @param {DnaPattern} dnaPattern
 */
ThreePrimeInput.prototype.setPattern = function(dnaPattern) {
    array.forEach(this.selectElements_, function(selectElement) {
        selectElement.selectedIndex = 0;
    });

    if (!dnaPattern.isValid())
        return;

    var sel1 = this.selectElements_[0];
    var sel2 = this.selectElements_[1];
    var sel3 = this.selectElements_[2];

    var stringPattern = dnaPattern.pattern();
    var patternLength = dnaPattern.length();
    if (patternLength >= 3) {
        var index = ThreePrimeInput.indexWithValue_(sel1, stringPattern[0]);
        if (index !== -1)
            sel1.selectedIndex = index;
        index = ThreePrimeInput.indexWithValue_(sel2, stringPattern[1]);
        if (index !== -1)
            sel2.selectedIndex = index;
        index = ThreePrimeInput.indexWithValue_(sel2, stringPattern[2]);
        if (index !== -1)
            sel3.selectedIndex = index;
    }
    else if (patternLength === 2) {
        var index = ThreePrimeInput.indexWithValue_(sel2, stringPattern[0]);
        if (index !== -1)
            sel2.selectedIndex = index;
        index = ThreePrimeInput.indexWithValue_(sel3, stringPattern[1]);
        if (index !== -1)
            sel3.selectedIndex = index;
    }
    else {
        var index = ThreePrimeInput.indexWithValue_(sel3, stringPattern[0]);
        if (index !== -1)
            sel3.selectedIndex = index;
    }
};

/** @return {string} */
ThreePrimeInput.prototype.text = function() {
    var result = '';
    array.forEach(this.selectElements_, function(selectElement) {
        switch (selectElement.value) {
        case 'S':
            result += '[C/G]';
            break;
        case 'N':
            result += '*';
            break;

        default:
            result += selectElement.value;
            break;
        }
    });
    return result;
};


// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
ThreePrimeInput.prototype.decorateInternal = function(element) {
    goog.base(this, 'decorateInternal', element);
    var domHelper = this.getDomHelper();
    classes.add(element, ThreePrimeInput.Css.RootClass);

    var childLabels = domHelper.getElementsByTagNameAndClass(TagName.LABEL, null, element);
    var childLabel = childLabels.length ? childLabels[0] : null;

    var firstComboBoxId = this.makeId(ThreePrimeInput.IdFragment.COMBO);
    if (childLabel)
        childLabel.htmlFor = firstComboBoxId;
    else if (this.label_)
        element.appendChild(domHelper.createDom(TagName.LABEL, {'for': firstComboBoxId}, this.label_));

    for (var i=0; i<3; i++) {
        this.selectElements_[i] = ThreePrimeInput.createSpecificationComboBox_(domHelper, i);
        element.appendChild(this.selectElements_[i]);
    }
    this.selectElements_[0].id = firstComboBoxId;
};

/** @override */
ThreePrimeInput.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    delete this.selectElements_;
};

// --------------------------------------------------------------------------------------------------------------------
// Private static methods
/**
 * @return {HTMLElement}
 * @param {goog.dom.DomHelper=} domHelper
 * @param {number} position
 */
ThreePrimeInput.createSpecificationComboBox_ = function(domHelper, position) {
    var select = domHelper.createElement(TagName.SELECT);
    classes.add(select, ThreePrimeInput.Css.BasePosClass + position);

    var options = select.options;
    options[0] = new Option('*', 'N');
    options[1] = new Option('C/G', 'S');
    options[2] = new Option('A', 'A');
    options[3] = new Option('C', 'C');
    options[4] = new Option('G', 'G');
    options[5] = new Option('T', 'T');

    return select;
};

/**
 * @param {HTMLElement} selectElement
 * @param {string} queryValue
 * @return {number}
 */
ThreePrimeInput.indexWithValue_ = function(selectElement, queryValue) {
    for (var i=0, z=selectElement.childNodes.length; i<z; i++) {
        if (selectElement.childNodes[i].value == queryValue)
            return i;
    }

    return -1;
};

/*******************************************************************************************************************/});
