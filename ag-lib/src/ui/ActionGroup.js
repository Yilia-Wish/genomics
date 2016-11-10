goog.provide('ag.ui.ActionGroup');

goog.require('ag.meta.MetaObject');
goog.require('ag.ui.Action');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.Disposable');

/**
 * @constructor
 * @extends {goog.Disposable}
 */
ag.ui.ActionGroup = function() {
    goog.base(this);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {Array.<ag.ui.Action>}
     * @private
     */
    this.actions_ = [];

    /**
     * @type {boolean}
     * @private
     */
    this.enabled_ = true;

    /**
     * @type {boolean}
     * @private
     */
    this.exclusive_ = true;

    /**
     * @type {boolean}
     * @private
     */
    this.visible_ = true;
};
goog.inherits(ag.ui.ActionGroup, goog.Disposable);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;

var Action = ag.ui.Action;
var ActionGroup = ag.ui.ActionGroup;

var metaObject = ag.meta.MetaObject.getInstance;

// --------------------------------------------------------------------------------------------------------------------
// Destructor
/** @override */
ActionGroup.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    this.clear();
    delete this.actions_;
};


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {Array.<ag.ui.Action>} */
ActionGroup.prototype.actions = function() {
    return this.actions_;
};

/**
 * @param {...ag.ui.Action} actions
 * @return {ActionGroup}
 */
ActionGroup.prototype.addAction = function(actions) {
    var i = arguments.length;
    while (i--) {
        var action = arguments[i];
        assert(this.actions_.indexOf(action) === -1, 'Action already exists in group');

        action.setCheckable(true);
        if (this.exclusive_ && this.checkedAction() && action.isChecked())
            action.setChecked(false);

        this.actions_.push(action);
        action.setExclusive(this.exclusive_);
        this.watch_(action);
    }
    return this;
};

/**
 * Returns the first checked action.
 *
 * @return {ag.ui.Action|undefined}
 */
ActionGroup.prototype.checkedAction = function() {
    for (var i=0, z=this.actions_.length; i<z; i++)
        if (this.actions_[i].isChecked())
            return this.actions_[i];
};

ActionGroup.prototype.clear = function() {
    var i = this.actions_.length;
    while (i--)
        this.unwatch_(this.actions_[i]);
    this.actions_.length = 0;
};

/** @return {boolean} */
ActionGroup.prototype.isEnabled = function() {
    return this.enabled_;
};

/** @return {boolean} */
ActionGroup.prototype.isExclusive = function() {
    return this.exclusive_;
};

/** @return {boolean} */
ActionGroup.prototype.isVisible = function() {
    return this.visible_;
};

/**
 * @param {ag.ui.Action} action
 * @return {ActionGroup}
 */
ActionGroup.prototype.removeAction = function(action) {
    var i = this.actions_.indexOf(action);
    if (i >= 0) {
        this.unwatch_(this.actions_[i]);
        array.splice(this.actions_, i, 1);
    }

    return this;
};

/**
 * @param {boolean=} optEnabled defaults to true
 * @return {ActionGroup}
 */
ActionGroup.prototype.setEnabled = function(optEnabled) {
    var enabled = goog.isDef(optEnabled) ? optEnabled : true;
    if (enabled !== this.enabled_) {
        this.enabled_ = enabled;
        array.forEach(this.actions_, function(action) {
            action.setEnabled(enabled);
        });
    }

    return this;
};

/**
 * @param {boolean=} optExclusive defaults to true
 * @return {ActionGroup}
 */
ActionGroup.prototype.setExclusive = function(optExclusive) {
    var exclusive = goog.isDef(optExclusive) ? optExclusive : true;
    if (exclusive !== this.exclusive_) {
        this.exclusive_ = exclusive;

        // Update exclusivity of the actions
        var i = this.actions_.length;
        while (i--)
            this.actions_[i].setExclusive(exclusive);

        if (exclusive)
            this.uncheckAllButOne_();
    }

    return this;
};

/**
 * @param {boolean=} optVisible defaults to true
 * @return {ActionGroup}
 */
ActionGroup.prototype.setVisible = function(optVisible) {
    var visible = goog.isDef(optVisible) ? optVisible : true;
    if (visible !== this.visible_) {
        this.visible_ = visible;
        array.forEach(this.actions_, function(action) {
            action.setVisible(visible);
        });
    }

    return this;
};

// --------------------------------------------------------------------------------------------------------------------
// Private slots
/**
 * @param {boolean} checked
 * @private
 */
ActionGroup.prototype.onActionToggled_ = function(checked) {
    if (!this.exclusive_ || !checked)
        return;

    // Get the action that was toggled
    var action = /** @type {Action} */ (metaObject().sender());
    assert(action.isChecked());
    assert(this.actions_.indexOf(action) >= 0, 'Action belonging to group was toggled, but somehow does not exist in the internal array');

    // Uncheck all the others
    var i = this.actions_.length;
    while (i--)
        if (this.actions_[i] !== action)
            this.actions_[i].setChecked(false);
};

// --------------------------------------------------------------------------------------------------------------------
// Private functions
/** @private */
ActionGroup.prototype.uncheckAllButOne_ = function() {
    var foundChecked = false;
    var i=this.actions_.length;
    while (i--) {
        var action = this.actions_[i];
        if (action.isChecked()) {
            if (foundChecked)
                action.setChecked(false);
            else
                foundChecked = true;
        }
    }
};

/**
 * @param {ag.ui.Action} action
 * @private
 */
ActionGroup.prototype.unwatch_ = function(action) {
    metaObject().disconnect(action, Action.SignalType.TOGGLED, this, this.onActionToggled_);
};

/**
 * @param {ag.ui.Action} action
 * @private
 */
ActionGroup.prototype.watch_ = function(action) {
    metaObject().connect(action, Action.SignalType.TOGGLED, this, this.onActionToggled_);
};

/*******************************************************************************************************************/});
