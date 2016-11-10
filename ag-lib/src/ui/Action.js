goog.provide('ag.ui.Action');

goog.require('ag.meta.MetaObject');
goog.require('ag.ui.KeySequence');

goog.require('goog.asserts');
goog.require('goog.events');

/**
 * @constructor
 * @param {number|Array.<number>|ag.ui.KeySequence} [optShortcut]
 * @param {string=} optText
 * @param {string=} optIcon
 */
ag.ui.Action = function(optShortcut, optText, optIcon) {
    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {boolean}
     * @private
     */
    this.checked_ = false;

    /**
     * @type {boolean}
     * @private
     */
    this.checkable_ = false;

    /**
     * @type {ag.ui.KeySequence|undefined}
     * @private
     */
    this.shortcut_;

    /**
     * @type {string}
     * @private
     */
    this.text_ = goog.isString(optText) ? optText : '';

    /**
     * @type {string|undefined}
     * @private
     */
    this.icon_ = optIcon;

    /**
     * @type {boolean}
     * @private
     */
    this.enabled_ = true;

    /**
     * @type {boolean}
     * @private
     */
    this.exclusive_ = false;

    /**
     * @type {string}
     * @private
     */
    this.tooltip_ = '';

    /**
     * @type {boolean}
     * @private
     */
    this.visible_ = true;

    /**
     * Handle for whatever data user wants to associate with this action
     *
     * @type {*}
     */
    this.userData = null;

    // --------------------------------------------------------------------------------------------------------------------
    if (optShortcut)
        this.shortcut_ = optShortcut instanceof ag.ui.KeySequence ? optShortcut : new ag.ui.KeySequence(optShortcut);
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var events = goog.events;

var Action = ag.ui.Action;

var metaObject = ag.meta.MetaObject.getInstance;

/** @enum {string} */
Action.SignalType = {
    // boolean
    TOGGLED: events.getUniqueId('toggled'),
    TRIGGERED: events.getUniqueId('triggered'),
    CHANGED: events.getUniqueId('changed')
};

Action.perform = function(actionArray, method, otherParams) {
    var params = goog.array.slice(arguments, 2);
    for (var i=0, z=actionArray.length; i<z; i++)
        method.apply(actionArray[i], params);
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {boolean} */
Action.prototype.canToggle = function() {
    return this.enabled_ && this.checkable_ && (!this.exclusive_ || !this.checked_);
};

/** @return {string|undefined} */
Action.prototype.icon = function() {
    return this.icon_;
};

/** @return {boolean} */
Action.prototype.isCheckable = function() {
    return this.checkable_;
};

/** @return {boolean} */
Action.prototype.isChecked = function() {
    return this.checked_;
};

/** @return {boolean} */
Action.prototype.isEnabled = function() {
    return this.enabled_;
};

/** @return {boolean} */
Action.prototype.isExclusive_ = function() {
    return this.exclusive_;
};

/** @return {boolean} */
Action.prototype.isVisible = function() {
    return this.visible_;
};

/** @param {boolean=} optCheckable defaults to true */
Action.prototype.setCheckable = function(optCheckable) {
    var checkable = goog.isDef(optCheckable) ? optCheckable : true;
    if (checkable !== this.checkable_) {
        this.checkable_ = checkable;
        metaObject().emit(this, Action.SignalType.CHANGED);
    }

    return this;
};

/** @param {boolean=} optChecked defaults to true */
Action.prototype.setChecked = function(optChecked) {
    var checked = goog.isDef(optChecked) ? optChecked : true;
    if (checked !== this.checked_) {
        this.checked_ = checked;
        var mo = metaObject();
        mo.emit(this, Action.SignalType.CHANGED);
        mo.emit(this, Action.SignalType.TOGGLED, this.checked_);
        if (checked)
            this.trigger();
    }
    return this;
};

/**
 * @param {boolean=} optEnabled defaults to true
 */
Action.prototype.setEnabled = function(optEnabled) {
    var enabled = goog.isDef(optEnabled) ? optEnabled : true;
    if (enabled !== this.enabled_) {
        this.enabled_ = enabled;
        metaObject().emit(this, Action.SignalType.CHANGED);
    }

    return this;
};

/** @param {boolean=} optExclusive defaults to true */
Action.prototype.setExclusive = function(optExclusive) {
    this.exclusive_ = goog.isDef(optExclusive) ? optExclusive : true;
};

/**
 * @param {string|undefined} [optIcon]
 */
Action.prototype.setIcon = function(optIcon) {
    if (this.icon_ !== optIcon) {
        this.icon_ = optIcon;
        metaObject().emit(this, Action.SignalType.CHANGED);
    }

    return this;
};

/** @param {ag.ui.KeySequence} [optShortcut] */
Action.prototype.setShortcut = function(optShortcut) {
    if (this.shortcut_ !== optShortcut) {
        this.shortcut_ = optShortcut;
        metaObject().emit(this, Action.SignalType.CHANGED);
    }

    return this;
};

/**
 * @param {boolean=} optVisible defaults to true
 */
Action.prototype.setVisible = function(optVisible) {
    var visible = goog.isDef(optVisible) ? optVisible : true;
    if (visible !== this.visible_) {
        this.visible_ = visible;
        metaObject().emit(this, Action.SignalType.CHANGED);
    }

    return this;
};

/** @return {ag.ui.KeySequence|undefined} */
Action.prototype.shortcut = function() {
    return this.shortcut_;
};

/** @return {string} */
Action.prototype.text = function() {
    return this.text_;
};

/** @return {string} */
Action.prototype.tooltip = function() {
    if (!this.tooltip_)
        return this.tooltip_;

    var tip = '';
    if (this.text_ || this.shortcut_) {
        tip = '';
        if (this.text_) {
            tip = this.text_;
            if (this.shortcut_)
                tip += ' (' + this.shortcut_.text() + ')';
        }
    }
    return tip;
};

/**
 * @param {string} newText
 */
Action.prototype.setText = function(newText) {
    if (this.text_ !== newText) {
        this.text_ = newText;
        metaObject().emit(this, Action.SignalType.CHANGED);
    }

    return this;
};

/**
 * @param {string} tooltip
 */
Action.prototype.setTooltip = function(tooltip) {
    if (this.tooltip_ !== tooltip) {
        this.tooltip_ = tooltip;
        metaObject().emit(this, Action.SignalType.CHANGED);
    }

    return this;
};

/**
 * Can only toggle exclusive actions on.
 */
Action.prototype.toggle = function() {
    if (this.canToggle())
        this.setChecked(!this.checked_);

    return this;
};

Action.prototype.trigger = function() {
    if (this.enabled_)
        metaObject().emit(this, Action.SignalType.TRIGGERED);

    return this;
};

/*******************************************************************************************************************/});
