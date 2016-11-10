goog.provide('ag.net.RestUndoStack');

goog.require('goog.array');

goog.require('ag.net.RestClient');
goog.require('ag.undoredo.UndoStack');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @param {ag.net.RestClient} optRestClient a default constructed client will be used if none is provided
 * @extends {ag.undoredo.UndoStack}
 */
ag.net.RestUndoStack = function(optRestClient) {
    goog.base(this);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {ag.net.RestClient}
     * @private
     */
    this.restClient_ = optRestClient || new ag.net.RestClient();

    /**
     * @type {boolean}
     * @private
     */
    this.waitingForResponse_ = false;

    /**
     * @type {Function}
     * @private
     */
    this.completeCallback_ = goog.bind(this.onRestComplete_, this);
};
goog.inherits(ag.net.RestUndoStack, ag.undoredo.UndoStack);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;

var RestUndoStack = ag.net.RestUndoStack;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
RestUndoStack.prototype.canRedo = function() {
    if (!goog.base(this, 'canRedo'))
        return false;

    return true;
};

/** @override */
RestUndoStack.prototype.canUndo = function() {
    if (!goog.base(this, 'canUndo'))
        return false;

    return true;
};

/**
 * @param {ag.net.RestCommand} command
 * @override
 */
RestUndoStack.prototype.push = function(command) {
    goog.base(this, 'push', command);
    this.processNextRestRequest_();
};

/** @override */
RestUndoStack.prototype.redo = function() {
    assert(false, 'Redo not implemented');
};

/** @override */
RestUndoStack.prototype.undo = function() {
    assert(false, 'Undo not implemented');
};

// --------------------------------------------------------------------------------------------------------------------
// Protected handlers
/**
 * @param {goog.net.XhrIo} xhrIo
 * @protected
 */
RestUndoStack.prototype.handleComplete = function(xhrIo) {
    // Put logic here to handle various complete cases. For example, if the user is no longer authorized, could
    // display a login box, which after it is completed, resume all commands on the stack.
    //
    // Currently, nothing is implemented here.
};


// --------------------------------------------------------------------------------------------------------------------
// Private event handlers
RestUndoStack.prototype.onRestComplete_ = function(xhrIo) {
    var command = this.undoCommands_[0];
    this.waitingForResponse_ = false;
    if (!command.handleComplete(xhrIo))
        this.handleComplete(xhrIo);
    this.shift();
    this.processNextRestRequest_();
};


// --------------------------------------------------------------------------------------------------------------------
// Private functions
/** @private */
RestUndoStack.prototype.processNextRestRequest_ = function() {
    if (this.waitingForResponse_ || this.count() === 0)
        return;

    while (this.count()) {
        var command = this.undoCommands_[0];
        var restRequest = command.restRequest();
        if (!restRequest) {
            this.shift();
            continue;
        }

        restRequest.callback = this.completeCallback_;
        this.waitingForResponse_ = true;
        this.restClient_.enqueue(restRequest);
        break;
    }
};


/*******************************************************************************************************************/});
