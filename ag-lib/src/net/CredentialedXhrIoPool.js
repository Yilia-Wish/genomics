/**
 * @fileoverview Simply creates XhrIo objects that are configured to send credentials with each request.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.net.CredentialedXhrIoPool');

goog.require('goog.net.XhrIoPool');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {goog.net.XhrIoPool}
 * @param {goog.structs.Map=} opt_headers Map of default headers to add to every
 *     request.
 * @param {number=} opt_minCount Minimum number of objects (Default: 1).
 * @param {number=} opt_maxCount Maximum number of objects (Default: 10).
 */
ag.net.CredentialedXhrIoPool = function(opt_headers, opt_minCount, opt_maxCount) {
    goog.base(this, opt_headers, opt_minCount, opt_maxCount);
};
goog.inherits(ag.net.CredentialedXhrIoPool, goog.net.XhrIoPool);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var CredentialedXhrIoPool = ag.net.CredentialedXhrIoPool;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
CredentialedXhrIoPool.prototype.createObject = function() {
    var xhrIo = goog.base(this, 'createObject');
    xhrIo.setWithCredentials(true);
    return xhrIo;
};

/*******************************************************************************************************************/});
