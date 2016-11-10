/**
 * @fileoverview Encapsulates the data common to a REST request.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.net.RestRequest');

goog.require('goog.Disposable');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {goog.Disposable}
 * @param {string} url Full URL to be requested
 * @param {string=} optMethod
 * @param {Object|goog.structs.Map=} optHeaders
 * @param {Function=} optCallback callback to fire when complete event is emitted from the XhrIo
 * @param {Function=} optProgressCallback callback to fire when progress events are emitted from the XhrIo (if supported)
 * @param {*=} optContent
 */
ag.net.RestRequest = function(url, optMethod, optCallback, optHeaders, optContent, optProgressCallback) {
    goog.base(this);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {number}
     * @private
     */
    this.id_ = ag.net.RestRequest.nextId_();

    // --------------------------------------------------------------------------------------------------------------------
    // Public members
    /** @type {string} */
    this.url = url;

    /** @type {string} */
    this.method = optMethod;

    /** @type {Function} */
    this.callback = optCallback;

    /** @type {Object|goog.structs.Map} */
    this.headers = optHeaders;

    /** @type {*} */
    this.content = optContent;

    /**
     * Field for storing arbitrary user information.
     *
     * @type {*}
     */
    this.userData;

    /** @type {Function} */
    this.progressCallback = optProgressCallback;
};
goog.inherits(ag.net.RestRequest, goog.Disposable);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var RestRequest = ag.net.RestRequest;

// --------------------------------------------------------------------------------------------------------------------
// Private static functions
RestRequest.currentId_ = 0;

/** @return {number} */
RestRequest.nextId_ = function() {
    return ++RestRequest.currentId_;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
RestRequest.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    delete this.callback;
    delete this.content;
    delete this.progressCallback;
    delete this.user;
};

/** @return {number} */
RestRequest.prototype.id = function() {
    return this.id_;
};


/*******************************************************************************************************************/});
