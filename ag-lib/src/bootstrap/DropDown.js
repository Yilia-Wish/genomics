goog.provide('bootstrap.DropDown');

goog.require('goog.dom.classes');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes');
goog.require('goog.ui.Component');

goog.require('ag.meta.MetaObject');

/**
 * @constructor
 * @extends {goog.ui.Component}
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
bootstrap.DropDown = function(optDomHelper) {
    goog.base(this, optDomHelper);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {Element}
     * @private
     */
    this.dropperEl_;

    /**
     * @type {Element}
     * @private
     */
    this.menuEl_;
};
goog.inherits(bootstrap.DropDown, goog.ui.Component);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var classes = goog.dom.classes;
var events = goog.events;
var EventType = goog.events.EventType;
var KeyCodes = goog.events.KeyCodes;
var TagName = goog.dom.TagName;

var DropDown = bootstrap.DropDown;

var metaObject = ag.meta.MetaObject.getInstance;

// --------------------------------------------------------------------------------------------------------------------
// Constants
DropDown.Css = {
    RootClass: goog.getCssName('dropdown'),
    Open: goog.getCssName('open')
};

DropDown.SignalType = {
    ABOUT_TO_OPEN: events.getUniqueId('about-to-open'),
    OPENED: events.getUniqueId('opened'),
    CLOSED: events.getUniqueId('closed'),
    // target
    SELECTED: events.getUniqueId('selected')
};

var Signals = DropDown.SignalType;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
DropDown.prototype.close = function() {
    this.setActive(false);
};

DropDown.prototype.enterDocument = function() {
    goog.base(this, 'enterDocument');

    if (this.dropperEl_)
        this.getHandler().listen(this.dropperEl_, EventType.CLICK, this.onClick_);

    if (this.menuEl_)
        this.getHandler().listen(this.menuEl_, EventType.CLICK, this.onMenuClick_);
};

DropDown.prototype.exitDocument = function() {
    goog.base(this, 'exitDocument');

    if (this.dropperEl_)
        this.getHandler().unlisten(this.dropperEl_, EventType.CLICK, this.onClick_);
};

DropDown.prototype.isActive = function() {
    return classes.has(this.getElement(), DropDown.Css.Open);
};

DropDown.prototype.setActive = function(optActive) {
    var active = goog.isDef(optActive) ? optActive : true;
    if (classes.has(this.dropperEl_, 'disabled'))
        return;

    var isActive = this.isActive();
    if (active === isActive)
        return;

    var mo = metaObject();
    if (!isActive)
        mo.emit(this, Signals.ABOUT_TO_OPEN);

    classes.enable(this.getElement(), DropDown.Css.Open, active);

    if (active) {
        this.getHandler().listen(this.dom_.getWindow(), EventType.CLICK, this.close)
            .listen(this.getElement(), EventType.KEYDOWN, this.onKeyDown_);
        mo.emit(this, Signals.OPENED);
    }
    else {
        this.getHandler().unlisten(this.dom_.getWindow(), EventType.CLICK, this.close)
            .unlisten(this.getElement(), EventType.KEYDOWN, this.onKeyDown_);
        mo.emit(this, Signals.CLOSED);
    }
};

DropDown.prototype.toggle = function() {
    this.setActive(!this.isActive());
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
DropDown.prototype.decorateInternal = function(element) {
    goog.base(this, 'decorateInternal', element);

    classes.add(element, DropDown.Css.RootClass);
    this.dropperEl_ = element.querySelector('[data-toggle=dropdown]');
    this.menuEl_ = element.querySelector('.dropdown-menu');
};

/** @override */
DropDown.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    delete this.dropperEl_;
};


// --------------------------------------------------------------------------------------------------------------------
DropDown.prototype.onClick_ = function(mouseEvent) {
    mouseEvent.stopPropagation();
    this.toggle();
};

DropDown.prototype.onKeyDown_ = function(event) {
    var keyEvent = /** @type {goog.events.KeyEvent} */ (event);
    if (keyEvent.keyCode === KeyCodes.ESC) {
        this.close();
        event.preventDefault();
    }
};

DropDown.prototype.onMenuClick_ = function(mouseEvent) {
    mouseEvent.preventDefault();
    if (mouseEvent.target.nodeName !== TagName.A)
        return;

    metaObject().emit(this, Signals.SELECTED, mouseEvent.target);
};

/*******************************************************************************************************************/});
