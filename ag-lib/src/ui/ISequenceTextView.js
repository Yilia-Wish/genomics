goog.provide('ag.ui.ISequenceTextView');
goog.provide('ag.ui.ISequenceTextView.Highlight');

goog.require('ag.painting.Color');

/**
 * An interface for common and core SequenceTextView functionality.
 * @interface
 */
ag.ui.ISequenceTextView = function() {};

/**
 * Typedef to represent a region with a particular color.
 *
 * @typedef { {
 *   location: ag.core.ClosedIntRange,
 *   cssClass: string
 * } }
 */
ag.ui.ISequenceTextView.Highlight;


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var ISequenceTextView = ag.ui.ISequenceTextView;


/**
 * Adds highlight to the view, which is immediately visible (if in the viewport).
 *
 * @param {ag.ui.ISequenceTextView.Highlight} highlight
 */
ISequenceTextView.prototype.addHighlight = function(higlight) {};

/** @return {boolean} */
ISequenceTextView.prototype.allowSelect = function() {};

/**
 * Removes all higlights from the view
 */
ISequenceTextView.prototype.clearHighlights = function() {};

/**
 * Removes any selection if it exists.
 */
ISequenceTextView.prototype.clearSelection = function() {};

/** @return {string} */
ISequenceTextView.prototype.selectedSequence = function() {};

/**
 * Returns the location in 1-based sequence space of the current selection.
 *
 * @return {ag.core.ClosedIntRange}
 */
ISequenceTextView.prototype.selection = function() {};

/**
 * Turns selecting capabilities to allowSelect. If allowSelect is false and a selection is currently present,
 * it will be cleared.
 *
 * @param {boolean} allowSelect
 */
ISequenceTextView.prototype.setAllowSelect = function(allowSelect) {}; 

/**
 * @param {ag.core.ClosedIntRange} newSelection
 */
ISequenceTextView.prototype.setSelection = function(newSelection) {};

/**
 * Sets the displayed sequence to newSequence. Also clears any existing selection or highlights.
 *
 * @param {string} newSequence
 */
ISequenceTextView.prototype.setSequence = function(newSequence) {};

/*******************************************************************************************************************/});
