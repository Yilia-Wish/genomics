/**
 * @fileoverview XhrService manages sending AJAX requests and receiving responses using the XHR protocol.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.service.XhrService');

goog.require('goog.asserts');
goog.require('goog.events');

goog.require('goog.net.XhrManager');

goog.require('ag.core.AObject');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.core.AObject}
 * @param {goog.net.XhrManager?} optXhrManager 
 * @param {ag.core.AObject} optParent
 */
ag.service.XhrService = function(optXhrManager, optParent) {
    goog.base(this, optParent);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {boolean}
     * @private
     */
    this.disposeXhrManager_ = goog.isDefAndNotNull(optXhrManager);

    /**
     * @type {number}
     * @private
     */
    this.lastRequestIdValue_ = 0;

    /**
     * @type {Object.<number,ag.service.XhrRequest>}
     * @private
     */
    // this.requests_ = {};

    /**
     * @type {goog.net.XhrManager}
     * @private
     */
    this.xhrManager_ = optXhrManager;
};
goog.inherits(ag.service.XhrService, ag.core.AObject);
goog.addSingletonGetter(ag.service.XhrService);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
// var ErrorCode = goog.net.ErrorCode;
var XhrManager = goog.net.XhrManager;

var XhrService = ag.service.XhrService;
// var XhrResponse = ag.service.XhrResponse;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * Simply forward the abort request onto the xhr manager instance. Does nothing if request has been aborted.
 * 
 * @param {ag.service.XhrRequest} request
 */
XhrService.prototype.abort = function(request) {
    this.xhrManager_().abort(request.id());
};

/**
 * @param {ag.service.XhrRequest} request
 */
XhrService.prototype.send = function(request) {
    assert(!request.active());

    var requestId = this.nextRequestId_();
    // assert(!this.requests_.hasOwnProperty(requestId));
    // this.requests_[requestId] = request;

    request.setId(requestId);
    var priority = null;
    var manager = this.xhrManager_();
    if (goog.DEBUG) {
        try {
            manager.send(requestId, request.url(), request.method(), request.body(), request.headers(), priority, request.callback());
        }
        catch (error) {
            console.log('Error sending request: ' + error);
            console.log(request);
        }
    }
    else {
        manager.send(requestId, request.url(), request.method(), request.body(), request.headers(), priority, request.callback());
    }
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
XhrService.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    if (this.xhrManager_) {
        // this.unlistenToXhrEvents_();
        if (this.disposeXhrManager_) {
            this.xhrManager_.dispose();
            delete this.xhrManager_;
        }
    }
};

// --------------------------------------------------------------------------------------------------------------------
// Private events
/**
 * @param {goog.net.XhrManager.Event} xhrEvent
 * @private
 */
// XhrService.prototype.onXhrRequestComplete_ = function(xhrEvent) {
//     var finishedRequestId = xhrEvent.id;
//     var request = this.requests_[finishedRequestId];
//     assert(request);
//     delete this.requests_[finishedRequestId];
//     var callback = request.callback();
//     if (!callback)
//         return;

//     var xhr = xhrEvent.xhrIo;

//     // Build the response
//     var response = new XhrResponse();
//     if (xhr.isSuccess()) {

//     }

//     var errorCode = xhr.getLastErrorCode();
//     if (errorCode === ErrorCode.ABORT) {

//     }
//     else if (errorCode === ErrorCode.TIMEOUT) {

//     }

//     callback(response);
// };

// --------------------------------------------------------------------------------------------------------------------
// Private functions
/** @private */
// XhrService.prototype.listenToXhrEvents_ = function() {
//     assert(this.xhrManager_);
//     goog.events.listen(this.xhrManager_, goog.net.EventType.COMPLETE, this.onXhrRequestComplete_, false, this);
// };

/** @return {number} */
XhrService.prototype.nextRequestId_ = function() {
    return ++this.lastRequestIdValue_;
};

/** @private */
// XhrService.prototype.unlistenToXhrEvents_ = function() {
//     assert(this.xhrManager_);
//     goog.events.unlisten(this.xhrManager_, goog.net.EventType.COMPLETE, this.onXhrRequestComplete_, false, this);
// };

/**
 * @return {XhrManager}
 * @private
 */
XhrService.prototype.xhrManager_ = function() {
    if (!this.xhrManager_) {
        // Defaults
        var nRetries = 1;
        var headers = null;
        var minXhrs = 1;
        var maxXhrs = 2;
        var timeout = 5000; // ms

        this.xhrManager_ = new XhrManager(nRetries, headers, minXhrs, maxXhrs, timeout);
        // this.listenToXhrEvents_();
    }

    return this.xhrManager_;
};

/*******************************************************************************************************************/});
