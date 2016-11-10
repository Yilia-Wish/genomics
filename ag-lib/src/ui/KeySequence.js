goog.provide('ag.ui.KeySequence');

goog.require('ag.ui.KeyCodeLabels');

goog.require('goog.asserts');

/**
 * @constructor
 * @param {number|Array.<number>} keys at least one key must be present
 */
ag.ui.KeySequence = function(keys) {
    goog.asserts.assert(goog.isNumber(keys) || goog.isArray(keys), 'keys must be an array or scalar number');
    goog.asserts.assert(!goog.isArray(keys) || keys.length > 0, 'keys array must have at least one element');
    goog.asserts.assert(!goog.isArray(keys) || goog.isNumber(keys[0]), 'keys array must consist of numeric values');

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {Array.<number>}
     */
    this.keys = goog.isArray(keys) ? keys : [keys];
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var KeyCodeLabels = ag.ui.KeyCodeLabels;
var KeySequence = ag.ui.KeySequence;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
KeySequence.prototype.text = function() {
    var strings = new Array(this.keys.length);
    for (var i=0, z=this.keys.length; i<z; i++) {
        var key = this.keys[i];
        var label = KeyCodeLabels[key];
        strings[i] = label ? label : String.fromCharCode(key);
    }
    return strings.join('+');
};

/*******************************************************************************************************************/});
