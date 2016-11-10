/**
 * @fileoverview Simple wrapper for facilitating the submission of REST requests. Similar to XhrManager, except
 *   that no timeout option is provided and the user may supply their own XhrIoPool as needed.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.net.RestClient');

goog.require('goog.events');
goog.require('goog.object');
goog.require('goog.net.XhrIoPool');
goog.require('goog.structs.Map');

goog.require('ag.core.AObject');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.core.AObject}
 * @param {boolean=} optXhrIoPool defaults to a default constructed XhrIoPool
 */
ag.net.RestClient = function(optXhrIoPool) {
    goog.base(this);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {boolean}
     * @private
     */
    this.busy_ = false;

    /**
     * @type {goog.structs.Map}
     * @private
     */
    this.requests_ = new goog.structs.Map();

    /**
     * @type {goog.net.XhrIoPool}
     * @private
     */
    this.xhrIoPool_ = goog.isDef(optXhrIoPool) ? optXhrIoPool : new goog.net.XhrIoPool();
};
goog.inherits(ag.net.RestClient, ag.core.AObject);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var events = goog.events;

var RestClient = ag.net.RestClient;

// --------------------------------------------------------------------------------------------------------------------
// Signals
/** @enum {string} */
RestClient.SignalType = {
    BUSY_CHANGED: events.getUniqueId('busy-changed')
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
RestClient.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    this.xhrIoPool_.dispose();
    delete this.xhrIoPool_;

    goog.structs.forEach(this.requests_, function(request, id) {
        request.dispose();
    });
    this.requests_.clear();
    delete this.requests_;
};

/**
 * @param {RestRequest} request
 */
RestClient.prototype.enqueue = function(request) {
    this.setBusy_(true);

    var id = request.id();
    this.requests_.set(id, request);
    this.xhrIoPool_.getObject(goog.bind(this.onAvailableXhrIo_, this, id));
};

// --------------------------------------------------------------------------------------------------------------------
// Private functions
RestClient.prototype.setBusy_ = function(isBusy) {
    if (isBusy === this.busy_)
        return;

    this.busy_ = isBusy;
    this.emit(RestClient.SignalType.BUSY_CHANGED, this.busy_);
};

// --------------------------------------------------------------------------------------------------------------------
// Private callbacks and events
/**
 * @param {number} id
 * @param {goog.net.XhrIo} xhrIo
 */
RestClient.prototype.onAvailableXhrIo_ = function(id, xhrIo) {
    var request = this.requests_.get(id);
    if (!request) {
        this.xhrIoPool_.releaseObject(xhrIo);
        return;
    }

    events.listen(xhrIo, goog.net.EventType.COMPLETE, goog.bind(this.onXhrIoComplete_, this, id));
    if (request.progressCallback) {
        // HACK!
        // It is currently not easily possible to listen in on the XMLHTTPUpload object because the xhr instance is
        // private and inaccessible - except when createXhr is called! Thus, we temporarily provide our own createXhr
        // function, listen to the progress event if it is available, and save a reference so that we can unlisten
        // in the complete handler.
        var oldCreateXhr = xhrIo.createXhr;
        xhrIo.createXhr = function() {
            var xhr = oldCreateXhr();
            if (goog.object.containsKey(xhr, 'upload')) {
                events.listen(xhr.upload, 'progress', request.progressCallback);
                request.__xhrUpload = xhr.upload;
            }
            xhrIo.createXhr = oldCreateXhr;
            return xhr;
        };
    }

    xhrIo.send(request.url, request.method, request.content, request.headers);
};

/**
 * @param {number} id number that ids the particular request that has completed
 * @param {events.Event} event
 */
RestClient.prototype.onXhrIoComplete_ = function(id, event) {
    var xhrIo = event.target;
    var request = this.requests_.get(id);
    if (request) {
        if (request.callback)
            request.callback(xhrIo, request);
            //                      ^^^^^^^ Enable callback to inspect the request on completion

        if (request.__xhrUpload) {
            // HACK! See notes in the onAvailableXhrIo_ method.
            events.removeAll(request.__xhrUpload);
            delete request.__xhrUpload;
        }
        request.dispose();
    }

    this.requests_.remove(id);
    events.removeAll(xhrIo);
    this.xhrIoPool_.releaseObject(xhrIo);

    this.setBusy_(this.requests_.getCount() > 0);
};


/*******************************************************************************************************************/});
