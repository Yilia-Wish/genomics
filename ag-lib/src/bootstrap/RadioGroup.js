goog.provide('bootstrap.RadioGroup');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.dom.TagName');
goog.require('goog.events');

goog.require('ag.core.AObject');

/**
 * @constructor
 * @extends {ag.core.AObject}
 * @param {HTMLElement} listElement
 */
bootstrap.RadioGroup = function(listElement) {
    goog.base(this);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {HTMLElement}
     * @private
     */
    this.listElement_ = listElement;


    // --------------------------------------------------------------------------------------------------------------------
    this.initialize_();
};
goog.inherits(bootstrap.RadioGroup, ag.core.AObject);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var classes = goog.dom.classes;
var dom = goog.dom;
var events = goog.events;
var EventType = events.EventType;
var TagName = dom.TagName;

var RadioGroup = bootstrap.RadioGroup;

/** @enum {string} */
RadioGroup.SignalType = {
    VALUE_CHANGED: events.getUniqueId('value-changed')
};

// --------------------------------------------------------------------------------------------------------------------
// Destructor
RadioGroup.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    events.unlisten(this.listElement_, EventType.CLICK, this.onListElementClick_, false /* optCapture */, this);
    delete this.listElement_;
};


// --------------------------------------------------------------------------------------------------------------------
// Public functions
RadioGroup.prototype.setValue = function(newValue) {
    var activeLi = this.activeLi_();
    var targetLi = this.liWithValue_(newValue);
    if (activeLi === targetLi)
        return;

    this.setActiveItem_(targetLi);
};

// --------------------------------------------------------------------------------------------------------------------
// Private callbacks
RadioGroup.prototype.onListElementClick_ = function(event) {
    var el = event.target;
    var toggleAttribute = el.getAttribute('data-toggle');
    if (!toggleAttribute || toggleAttribute !== 'tab')
        return;

    var li = dom.getAncestorByTagNameAndClass(el, TagName.LI);
    if (!li || classes.has(li, 'active'))
        return;

    this.setActiveItem_(li);
};


// --------------------------------------------------------------------------------------------------------------------
// Private functions
RadioGroup.prototype.activeLi_ = function() {
    return this.listElement_.querySelector('.active');
};

RadioGroup.prototype.initialize_ = function() {
    assert(this.listElement_, 'Invalid list element');

    events.listen(this.listElement_, EventType.CLICK, this.onListElementClick_, false /* optCapture */, this);
};

RadioGroup.prototype.liWithValue_ = function(value) {
    var selector = 'li a[data-toggle="tab"][data-value="' + value + '"]';
    var a = this.listElement_.querySelector(selector);
    if (a)
        return a.parentNode;
};

RadioGroup.prototype.setActiveItem_ = function(newLi) {
    var oldValue;
    var newValue;

    var activeLi = this.activeLi_();
    if (activeLi) {
        classes.remove(activeLi, 'active');
        oldValue = RadioGroup.liValue_(activeLi);
    }

    classes.add(newLi, 'active');
    var newValue = RadioGroup.liValue_(newLi);
    this.emit(RadioGroup.SignalType.VALUE_CHANGED, newValue, oldValue);
};

// --------------------------------------------------------------------------------------------------------------------
// Private static functions
RadioGroup.liValue_ = function(li) {
    if (li) {
        var a = li.querySelector('a[data-toggle="tab"]');
        if (a)
            return a.getAttribute('data-value');
    }
};

/*******************************************************************************************************************/});
