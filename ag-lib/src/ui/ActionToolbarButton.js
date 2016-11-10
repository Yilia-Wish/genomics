goog.provide('ag.ui.ActionToolbarButton');

goog.require('ag.meta.MetaObject');
goog.require('ag.ui.Action');

goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.dom.TagName');
goog.require('goog.ui.ToolbarButton');

/**
 * @constructor
 * @param {ag.ui.Action} action
 * @param {goog.ui.ButtonRenderer=} opt_renderer Optional renderer used to
 *     render or decorate the button; defaults to
 *     {@link goog.ui.ToolbarButtonRenderer}.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM hepler, used for
 *     document interaction.
 * @extends {goog.ui.ToolbarButton}
 */
ag.ui.ActionToolbarButton = function(action, opt_renderer, opt_domHelper) {
    goog.base(this, '', opt_renderer, opt_domHelper);

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
    this.update_();
};
goog.inherits(ag.ui.ActionToolbarButton, goog.ui.ToolbarButton);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var classes = goog.dom.classes;
var dom = goog.dom;
var TagName = goog.dom.TagName;

var Action = ag.ui.Action;
var ActionToolbarButton = ag.ui.ActionToolbarButton;

var metaObject = ag.meta.MetaObject.getInstance;

// --------------------------------------------------------------------------------------------------------------------
// Destructor
/** @override */
ActionToolbarButton.prototype.disposeInternal = function() {
    this.unwatchAction_();
    delete this.action_;
};

// --------------------------------------------------------------------------------------------------------------------
// Reimplemented public functions
/** @override */
ActionToolbarButton.prototype.enterDocument = function() {
    goog.base(this, 'enterDocument');
    this.update_();
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {ag.ui.Action} */
ActionToolbarButton.prototype.action = function() {
    return this.action_;
};

/**
 * @param {Action} newAction
 */
ActionToolbarButton.prototype.setAction = function(newAction) {
    if (this.action_ === newAction)
        return;

    this.unwatchAction_();
    this.action_ = newAction;
    this.watchAction_();
    this.update_();
};

// --------------------------------------------------------------------------------------------------------------------
// Private slots
/** @private */
ActionToolbarButton.prototype.update_ = function() {
    this.setContent(this.contentForAction_());
    this.setTooltip(this.action_.tooltip());
    this.setEnabled(this.action_.isEnabled());
    this.setVisible(this.action_.isVisible());

    if (this.action_.isCheckable()) {
        this.setChecked(this.action_.isChecked());
        if (this.isInDocument()) {
            var el = this.getElement();
            classes.add(el, 'goog-toolbar-toggle-button');
            classes.enable(el, 'goog-toolbar-button-checked', this.action_.isChecked());
        }
    }
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
ActionToolbarButton.prototype.performActionInternal = function(e) {
    if (this.action_.isCheckable()) {
        // This code handles exclusive action groups by only allowing the toggle action
        // to go through if the action is toggled.
        var oldChecked = this.action_.isChecked();
        this.action_.toggle();
        if (oldChecked !== this.action_.isChecked()) {
            goog.base(this, 'performActionInternal', e);
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
// Private functions
/** @private */
ActionToolbarButton.prototype.contentForAction_ = function() {
    return this.action_.icon() ? dom.createDom(TagName.DIV, 'icon ' + this.action_.icon())
        : this.action_.text();
};

/** @private */
ActionToolbarButton.prototype.unwatchAction_ = function() {
    metaObject().disconnect(this.action_, Action.SignalType.CHANGED, this, this.update_);
};

/** @private */
ActionToolbarButton.prototype.watchAction_ = function() {
    metaObject().connect(this.action_, Action.SignalType.CHANGED, this, this.update_);
};

/*******************************************************************************************************************/});
