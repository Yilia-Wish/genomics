goog.provide('ag.ui.ActionHandler');

goog.require('ag');
goog.require('ag.ui');

goog.require('goog.events');

/**
 * Cannot have additional keys pressed - must match exactly.
 * @constructor
 */
ag.ui.ActionHandler = function() {
    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {Array.<ag.ui.Action>}
     * @private
     */
    this.actions_ = [];

    /**
     * @type {Object.<string,number>}
     * @private
     */
    this.actionIds_ = {};

    /**
     * @type {Object.<string,number>}
     * @private
     */
    this.keysDown_ = {};

    /**
     * @type {number}
     * @private
     */
    this.numKeysDown_ = 0;

    // --------------------------------------------------------------------------------------------------------------------
    this.constructor_();
};
goog.addSingletonGetter(ag.ui.ActionHandler);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var events = goog.events;
var KeyCodes = goog.events.KeyCodes;

var ActionHandler = ag.ui.ActionHandler;

// --------------------------------------------------------------------------------------------------------------------
// Constructor
/** @private */
ActionHandler.prototype.constructor_ = function() {
    events.listen(document.body, events.EventType.KEYDOWN, this.onKeyDown, false /* optCapture */, this);
    events.listen(document.body, events.EventType.KEYUP, this.onKeyUp, false /* optCapture */, this);
};

ActionHandler.prototype.dispose = function() {
    events.unlisten(document.body, events.EventType.KEYDOWN, this.onKeyDown, false /* optCapture */, this);
    events.unlisten(document.body, events.EventType.KEYUP, this.onKeyUp, false /* optCapture */, this);

    delete this.actions_;
    delete this.actionIds_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * Manually release the keys associated with action. Useful when keyup events are not fired as expected (i.e. when
 * opening a file selection dialog).
 *
 * @param {ag.ui.Action} action
 * @suppress {checkTypes}
 */
ActionHandler.prototype.release = function(action) {
    var shortcut = action.shortcut();
    if (shortcut) {
        var isRegistered = this.actions_.indexOf(action) >= 0;
        if (isRegistered) {
            var i = shortcut.keys.length;
            while (i--) {
                var keycode = shortcut.keys[i];
                var old = this.keysDown_[keycode];
                if (old && old > 0) {
                    this.numKeysDown_--;
                    this.keysDown_[keycode] = 0;
                }
            }
        }
    }
};

/**
 * @param {ag.ui.Action} action
 * @return {ActionHandler}
 */
ActionHandler.prototype.register = function(action) {
    var id = goog.getUid(action).toString();
    if (!this.actionIds_[id]) {
        this.actions_.push(action);
        this.actionIds_[id] = 1;
    }
    return this;
};

/**
 * @param {ag.ui.Action} action
 * @return {ActionHandler}
 */
ActionHandler.prototype.unregister = function(action) {
    var id = goog.getUid(action).toString();
    if (this.actionIds_[id]) {
        delete this.actionIds_[id];
        this.removeFromActionArray_(action);
    }
    return this;
};

// --------------------------------------------------------------------------------------------------------------------
// Private slots
/**
 * @param {goog.events.BrowserEvent} keyEvent
 * @private
 * @suppress {checkTypes}
 */
ActionHandler.prototype.onKeyDown = function(keyEvent) {
    var old = this.keysDown_[keyEvent.keyCode];
    if (!goog.isDef(old) || old === 0)
        this.numKeysDown_++;

    this.keysDown_[keyEvent.keyCode] = 1;

    if (this.triggerMatchingActions_()) {
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
    }
};

/**
 * @param {goog.events.BrowserEvent} keyEvent
 * @private
 * @suppress {checkTypes}
 */
ActionHandler.prototype.onKeyUp = function(keyEvent) {
    var old = this.keysDown_[keyEvent.keyCode];
    if (old > 0)
        this.numKeysDown_--;
    this.keysDown_[keyEvent.keyCode] = 0;

    keyEvent.preventDefault();
    keyEvent.stopPropagation();
};

// --------------------------------------------------------------------------------------------------------------------
// Private functions
/**
 * @param {ag.ui.Action} action
 * @return {boolean}
 * @private
 */
ActionHandler.prototype.keyboardShortcutPressed_ = function(action) {
    var shortcut = action.shortcut();
    return goog.isDef(shortcut) &&
        this.shortcutKeysPressed_(shortcut.keys);
};

/**
 * @param {ag.ui.Action} action
 * @private
 */
ActionHandler.prototype.removeFromActionArray_ = function(action) {
    var index = this.actions_.indexOf(action);
    if (index >= 0)
        this.actions_.splice(index, 1);
};

/**
 * @param {Array.<number>} keys
 * @return {boolean}
 * @private
 * @suppress {checkTypes}
 */
ActionHandler.prototype.shortcutKeysPressed_ = function(keys) {
    var i = keys.length;
    if (i === this.numKeysDown_) {
        while (i--)
            if (!this.keysDown_[keys[i]])
                return false;

        return true;
    }

    return false;
};

/**
 * @return {boolean}
 * @private
 */
ActionHandler.prototype.triggerMatchingActions_ = function() {
    var matchedAction = false;
    for (var i=0, z=this.actions_.length; i<z; i++) {
        var action = this.actions_[i];
        if (this.keyboardShortcutPressed_(action)) {
            if (action.isCheckable())
                action.toggle();
            else
                action.trigger();   // Only fires if the action is enabled
            matchedAction = true;
        }
    }
    return matchedAction;
};

/*******************************************************************************************************************/});
