goog.provide('ag.ui.ActionMenuItem');

goog.require('ag.meta.MetaObject');
goog.require('ag.ui.Action');

goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.dom.TagName');
goog.require('goog.ui.MenuItem');

/**
 * @constructor
 * @param {ag.ui.Action} action
 * @param {*=} opt_model Data/model associated with the menu item.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper used for
 *     document interactions.
 * @param {goog.ui.MenuItemRenderer=} opt_renderer Optional renderer.
 * @extends {goog.ui.MenuItem}
 */
ag.ui.ActionMenuItem = function(action, opt_model, opt_domHelper, opt_renderer) {
    goog.base(this, '', opt_model, opt_domHelper, opt_renderer);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.ui.Action}
     * @private
     */
    this.action_ = action;

    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    this.watchAction_();
};
goog.inherits(ag.ui.ActionMenuItem, goog.ui.MenuItem);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var classes = goog.dom.classes;
var dom = goog.dom;
var TagName = goog.dom.TagName;

var Action = ag.ui.Action;
var ActionMenuItem = ag.ui.ActionMenuItem;

var metaObject = ag.meta.MetaObject.getInstance;

// --------------------------------------------------------------------------------------------------------------------
// Destructor
/** @override */
ActionMenuItem.prototype.disposeInternal = function() {
    this.unwatchAction_();
    delete this.action_;
};

// --------------------------------------------------------------------------------------------------------------------
// Reimplemented public functions
/** @override */
ActionMenuItem.prototype.enterDocument = function() {
    goog.base(this, 'enterDocument');
    this.update_();
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {ag.ui.Action} */
ActionMenuItem.prototype.action = function() {
    return this.action_;
};

/**
 * @param {Action} newAction
 */
ActionMenuItem.prototype.setAction = function(newAction) {
    if (this.action_ === newAction)
        return;

    this.unwatchAction_();
    this.action_ = newAction;
    this.watchAction_();
    this.update_();
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
ActionMenuItem.prototype.performActionInternal = function(e) {
    if (this.action_.isCheckable()) {
        if (this.action_.canToggle() && goog.base(this, 'performActionInternal', e)) {
            this.action_.toggle();
            return true;
        }
    }
    else if (goog.base(this, 'performActionInternal', e)) {
        this.action_.trigger();
        return true;
    }

    return false;
};

// --------------------------------------------------------------------------------------------------------------------
// Private slots
/** @private */
ActionMenuItem.prototype.update_ = function() {
    this.setContent(this.contentForAction_());
    this.setEnabled(this.action_.isEnabled());
    this.setVisible(this.action_.isVisible());
    this.setCheckable(this.action_.isCheckable());
    this.setChecked(this.action_.isCheckable() ? this.action_.isChecked() : false);

    classes.enable(this.getElement(), 'ag-menuitem-icon', goog.isDef(this.action_.icon()));
};

// --------------------------------------------------------------------------------------------------------------------
// Private functions
/** @private */
ActionMenuItem.prototype.contentForAction_ = function() {
    if (!this.action_.icon() && !this.action_.shortcut())
        return this.action_.text();

    var content = [];
    if (this.action_.icon()) {
        if (this.action_.isCheckable()) {
            var outerBox = dom.createDom(TagName.DIV, 'goog-inline-block ag-menuitem-outer-box');
            var innerBox = dom.createDom(TagName.DIV, 'goog-inline-block ag-menuitem-inner-box');
            var icon = dom.createDom(TagName.DIV, 'icon ' + this.action_.icon());
            innerBox.appendChild(icon);
            outerBox.appendChild(innerBox);
            content.push(outerBox);
        }
        else {
            content.push(dom.createDom(TagName.DIV, 'icon goog-menuitem-icon ' + this.action_.icon()));
        }
    }
    if (this.action_.text())
        content.push(dom.createDom(TagName.SPAN, undefined, this.action_.text()));
    if (this.action_.shortcut())
        content.push(dom.createDom(TagName.SPAN, 'goog-menuitem-accel', this.action_.shortcut().text()));

    return content;
};

/** @private */
ActionMenuItem.prototype.unwatchAction_ = function() {
    metaObject().disconnect(this.action_, Action.SignalType.CHANGED, this, this.update_);
};

/** @private */
ActionMenuItem.prototype.watchAction_ = function() {
    metaObject().connect(this.action_, Action.SignalType.CHANGED, this, this.update_);
};

/*******************************************************************************************************************/});
