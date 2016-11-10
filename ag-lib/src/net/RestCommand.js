goog.provide('ag.net.RestCommand');

goog.require('ag.undoredo.UndoCommand');

/**
 * @constructor
 * @param {string=} optText
 */
ag.net.RestCommand = function(optText) {
    goog.base(this, optText);
};
goog.inherits(ag.net.RestCommand, ag.undoredo.UndoCommand);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var RestCommand = ag.net.RestCommand;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * Virtual stub for handling the response to a REST request. By default, nothing is done and false is returned to
 * indicate that the owning undo stack may perform its own processing.
 *
 * @param {goog.net.XhrIo} xhrIo
 * @return {boolean}
 */
RestCommand.prototype.handleComplete = function(xhrIo) {
    return false;
};

/**
 * @return {ag.net.RestRequest}
 */
RestCommand.prototype.restRequest = goog.abstractMethod;

/*******************************************************************************************************************/});
