/**
 * @fileoverview: Encapsulates the construction of RestRequests for several the common REST methods.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.net.RestRequestFactory');

goog.require('goog.uri.utils');

goog.require('ag.net.RestRequest');

/**
 * @constructor
 */
ag.net.RestRequestFactory = function() {
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var RestRequest = ag.net.RestRequest;
var RestRequestFactory = ag.net.RestRequestFactory;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * @param {string} url
 * @param {Function=} optCallback
 * @return {RestRequest}
 */
RestRequestFactory.createDelete = function(url, optCallback) {
    return new RestRequest(url, 'DELETE', optCallback);
};

/**
 * @param {string} url
 * @param {Object=} optParams defaults to null; these will be converted to a query string format
 * @param {Function=} optCallback Called when the request is completed (either successfully or unsuccessfully)
 * @return {RestRequest}
 */
RestRequestFactory.createGet = function(url, optParams, optCallback) {
    var urlWithParams = url;
    if (optParams)
        urlWithParams += '?' + goog.uri.utils.buildQueryDataFromMap(optParams);
    return new RestRequest(urlWithParams, 'GET', optCallback);
};

/**
 * @param {string} url
 * @param {*} content
 * @param {Function=} optCallback
 * @return {RestRequest}
 */
RestRequestFactory.createPost = function(url, content, optCallback, optProgressCallback) {
    return new RestRequest(url, 'POST', optCallback, null, content, optProgressCallback);
};

/**
 * @param {string} url
 * @param {*} content
 * @param {Function=} optCallback Called when the request is completed (either successfully or unsuccessfully)
 * @return {RestRequest}
 */
RestRequestFactory.createPut = function(url, content, optCallback) {
    return new RestRequest(url, 'PUT', optCallback, null, content);
};


/*******************************************************************************************************************/});
