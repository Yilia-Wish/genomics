goog.provide('ag');

goog.require('goog.asserts');
goog.require('goog.userAgent');

if (!Array.prototype.last) {
    Array.prototype.last = function() {
        return this[this.length - 1];
    };
}

Array.prototype.grep = function(callback) {
    goog.asserts.assert(goog.isFunction(callback), 'callback not defined');
    var result = [];

    for (var i=0, z=this.length; i<z; i++)
        if (callback(this[i], i))
            result.push(this[i]);

    return result;
};

/**
 * Performs a deep clone of entire array contents.
 *
 * @return {Array.<Object>}
 */
Array.prototype.clone = function() {
    var result = [];
    for (var i=0, z=this.length; i<z; i++)
        result.push(this[i].clone());
    return result;
};

/** @return {boolean} */
Array.prototype.isEmpty = function() {
    return this.length === 0;
};

String.prototype.count = function(query) {
    var n = 0;
    var from = this.indexOf(query);
    while (from != -1) {
        n++;
        from = this.indexOf(query, from+1);
    }
    return n;
};

String.prototype.left = function(n) {
	return this.substr(0, n);
};

String.prototype.repeated = function(n) {
    return Array(n+1).join(this);
};

String.prototype.right = function(n) {
	return this.substr(-n, n);
};

// --------------------------------------------------------------------------------------------------------------------
// Random utility functions
/**
 * @param {goog.events.BrowserEvent} event
 * @return {boolean}
 */
ag.xOsCtrlPressed = function(event) {
    return (!goog.userAgent.MAC && event.ctrlKey) ||
        (goog.userAgent.MAC && event.metaKey)
};

ag.hiddenMethod = function() {
    throw Error("hidden method: out of scope");
};