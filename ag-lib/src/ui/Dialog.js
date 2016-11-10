/**
 * @fileoverview Dialog extends the base google UI dialog with signal/slots and does not automatically close
 *   whenever a button is pressed.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.ui.Dialog');

goog.require('goog.events');
goog.require('goog.ui.Dialog');

goog.require('ag.meta.MetaObject');

// --------------------------------------------------------------------------------------------------------------------
/**
 * While the base class methods are still accessible, the intended use is to finish the 
 *
 * @constructor
 * @extends goog.ui.Dialog
 * @param {string=} opt_class CSS class name for the dialog element, also used
 *     as a class name prefix for related elements; defaults to modal-dialog.
 * @param {boolean=} opt_useIframeMask Work around windowed controls z-index
 *     issue by using an iframe instead of a div for bg element.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper; see {@link
 *     goog.ui.Component} for semantics.
 */
ag.ui.Dialog = function(optClass, optUseIframeMask, optDomHelper) {
    goog.base(this, optClass, optUseIframeMask, optDomHelper);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {number}
     * @private
     */
    this.result_;
};
goog.inherits(ag.ui.Dialog, goog.ui.Dialog);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var events = goog.events;

var ButtonSet = goog.ui.Dialog.ButtonSet;
var DefaultButtons = ButtonSet.DefaultButtons;

var Dialog = ag.ui.Dialog;

var metaObject = ag.meta.MetaObject.getInstance;

/** @enum {number} */
Dialog.Result = {
    Accepted: 1,
    Rejected: 0
};

/** @enum {string} */
Dialog.SignalType = {
    ACCEPTED: goog.events.getUniqueId('accepted'),  // Emitted when the wizard is accepted
    // result code
    FINISHED: goog.events.getUniqueId('finished'),
    REJECTED: goog.events.getUniqueId('rejected')   // Emitted when the wizard is rejected
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * Closes (hides) the dialog and sets the result to Accepted. Emits the Accepted signal.
 */
Dialog.prototype.accept = function() {
    this.done(Dialog.Result.Accepted);
    metaObject().emit(this, Dialog.SignalType.ACCEPTED);
};

/** @override */
Dialog.prototype.createDom = function() {
    goog.base(this, 'createDom')
    this.domSetup();
};

/**
 * Closes (hides) the dialog and sets the result to newResult. Emits the Finished signal.
 *
 * @param {number} result
 */
Dialog.prototype.done = function(result) {
    this.setVisible(false);
    this.setResult(result);
    metaObject().emit(this, Dialog.SignalType.FINISHED, result);
};

/** @override */
Dialog.prototype.enterDocument = function() {
    goog.base(this, 'enterDocument');

    this.getHandler().listen(this, goog.ui.Dialog.EventType.SELECT, this.onButtonSelect_);
};

/** @override */
Dialog.prototype.exitDocument = function() {
    goog.base(this, 'exitDocument');

    this.getHandler().unlisten(this, goog.ui.Dialog.EventType.SELECT, this.onButtonSelect_);
}

/**
 * Closes (hides) the dialog and sets the result to Rejected. Emits the Rejected signal.
 */
Dialog.prototype.reject = function() {
    this.done(Dialog.Result.Rejected);
    metaObject().emit(this, Dialog.SignalType.REJECTED);
};

/** @return {number} */
Dialog.prototype.result = function() {
    return this.result_;
};

/**
 * @param {number} newResult
 */
Dialog.prototype.setResult = function(newResult) {
    this.result_ = newResult;
};


// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/**
 * Virtual stub for responding to button presses which by default accepts if OK is pressed, or rejects if cancel is
 * pressed.
 *
 * @param {string} key
 * @protected
 */
Dialog.prototype.buttonPressed = function(key) {
    if (key === DefaultButtons.OK.key)
        this.accept();
    else if (key === DefaultButtons.CANCEL.key)
        this.reject();
};

/** @override */
Dialog.prototype.decorateInternal = function(element) {
    goog.base(this, 'decorateInternal', element);
    this.domSetup();
};

/**
 * Single virtual stub for configuring the DOM in subclasses. Invoked from either decorateInternal or createDom.
 * 
 * @protected
 */
Dialog.prototype.domSetup = function() {};


// --------------------------------------------------------------------------------------------------------------------
// Private functions
/**
 * @param {goog.ui.Dialog.Event} event
 * @private
 */
Dialog.prototype.onButtonSelect_ = function(event) {
    event.preventDefault();
    this.buttonPressed(event.key);
};

/*******************************************************************************************************************/});
