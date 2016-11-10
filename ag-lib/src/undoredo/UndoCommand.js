goog.provide('ag.undoredo.UndoCommand');

goog.require('goog.asserts');
goog.require('goog.Disposable');

/**
 * @constructor
 * @param {?string} optText
 * @param {ag.undoredo.UndoCommand} [optParentCommand]
 * @extends {goog.Disposable}
 */
ag.undoredo.UndoCommand = function(optText, optParentCommand) {
	goog.base(this);

	this.text_ = goog.isDef(optText) ? optText : null;
	this.childCommands_ = [];

	if (goog.isDefAndNotNull(optParentCommand))
		optParentCommand.childCommands_.push(this);
};
goog.inherits(ag.undoredo.UndoCommand, goog.Disposable);

/** @override */
ag.undoredo.UndoCommand.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	for (var i=0; i< this.childCommands_.length; i++)
		this.childCommands_[i].dispose();

	goog.array.clear(this.childCommands_);
	this.childCommands_ = null;
};

/**
  * @param {number} index
  * @return {ag.undoredo.UndoCommand}
  */
ag.undoredo.UndoCommand.prototype.child = function(index) {
	goog.asserts.assert(index >= 0 && index < this.childCount(), 'UndoCommand.child(): index out of range');

	return this.childCommands_[index];
};

/** @returns {number} */
ag.undoredo.UndoCommand.prototype.childCount = function() {
	return this.childCommands_.length;
};

/**
 * Virtual function that performs a particular action.
 */
ag.undoredo.UndoCommand.prototype.redo = function() {
	for (var i=0; i< this.childCommands_.length; i++)
		this.childCommands_[i].redo();

	this.doRedo();
};

/**
 * @param {?string} newText
 */
ag.undoredo.UndoCommand.prototype.setText = function(newText) {
	this.text_ = newText;
};

/** @returns {?string} */
ag.undoredo.UndoCommand.prototype.text = function() {
	return this.text_;
};

/**
 * Virtual function that undoes a particular action.
 */
ag.undoredo.UndoCommand.prototype.undo = function() {
	for (var i=this.childCommands_.length-1; i >= 0; i--)
		this.childCommands_[i].undo();
};

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @protected */
ag.undoredo.UndoCommand.prototype.doRedo = function() {};