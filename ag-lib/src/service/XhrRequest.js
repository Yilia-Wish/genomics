/**
 * @fileoverview XhrRequest encapsulates the basic information necessary to make a network request.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.service.XhrRequest');

goog.require('goog.asserts');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @param {string} url Absolute or relative URL of request
 * @param {string?} optMethod defaults to GET; must be one of GET, POST, PUT, or DELETE
 * @param {string?} optBody optional body content
 * @param {Object.<string,string>} optHeaders
 */
ag.service.XhrRequest = function(url, optMethod, optBody, optHeaders) {
    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {number}
     * @private
     */
    this.id_;

    /**
     * @type {boolean}
     * @private
     */
    // this.active_ = false;

    /**
     * @type {string}
     * @private
     */
    this.url_ = url;

    /**
     * @type {string}
     * @private
     */
    this.method_ = goog.isString(optMethod) ? optMethod : 'GET';

    /**
     * @type {string}
     * @private
     */
    this.body_ = optBody;

    /** 
     * @type {Object.<string,string>}
     * @private
     */
    this.headers_ = optHeaders;

    /**
     * @type {Function}
     * @private
     */
    this.callback_;

    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    goog.asserts.assert(this.method_ === 'GET' ||
                        this.method_ === 'POST' ||
                        this.method_ === 'PUT' ||
                        this.method_ === 'DELETE');
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var XhrRequest = ag.service.XhrRequest;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @return {string|undefined|null} */
XhrRequest.prototype.body = function() {
    return this.body_;
};

/** @return {Function=} */
XhrRequest.prototype.callback = function() {
    return this.callback_;
};

/** @return {Object.<string,string>|undefined|null} */
XhrRequest.prototype.headers = function() {
    return this.headers_;
};

/** @return {number?} */
XhrRequest.prototype.id = function() {
    return this.id_;
};

/** @return {string} */
XhrRequest.prototype.method = function() {
    return this.method_;
};

/**
 * @param {boolean?} optActive defaults to true
 */
// XhrRequest.prototype.setActive = function(optActive) {
//     this.active_ = goog.isBoolean(optActive) ? optActive : true;
// };

/**
 * Should only be called from the XhrService
 *
 * @param {number} newId
 */
XhrRequest.prototype.setId = function(newId) {
    this.id_ = newId;
};

/**
 * @param {Function=} newCallback
 */
XhrRequest.prototype.setCallback = function(newCallback) {
    this.callback_ = newCallback;
};

/** @return {string} */
XhrRequest.prototype.url = function() {
    return this.url_;
};

/*******************************************************************************************************************/});
