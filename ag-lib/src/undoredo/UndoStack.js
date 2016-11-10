goog.provide('ag.undoredo.UndoStack');

goog.require('goog.Disposable');
goog.require('goog.events');
goog.require('goog.array');

goog.require('ag.meta.MetaObject');

// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Constructor and destructors
/**
 * @constructor
 * @extends {goog.Disposable}
 */
ag.undoredo.UndoStack = function() {
	/**
	 * @type {Array.<ag.undoredo.UndoCommand>}
	 * @protected
	 */
	this.undoCommands_ = [];

	/**
	 * @type {number}
	 * @private
	 */
	this.index_ = 0;

	/**
	 * @type {number}
	 * @private
	 */
	this.cleanIndex_ = 0;

	// State variables; the canUndo/canRedo methods still determine the process dynamically
	/**
	 * @type {boolean}
	 * @private
	 */
	this.canUndo_ = false;

	/**
	 * @type {boolean}
	 * @private
	 */
	this.canRedo_ = false;
};
goog.inherits(ag.undoredo.UndoStack, goog.Disposable);

/**
 * @override
 */
ag.undoredo.UndoStack.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	this.clear();
};


// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Signals
/** @enum {string} */
ag.undoredo.UndoStack.SignalType = {
	CAN_REDO_CHANGED: goog.events.getUniqueId('can-redo-changed'),
	CAN_UNDO_CHANGED: goog.events.getUniqueId('can-undo-changed')
};


// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @return {boolean} */
ag.undoredo.UndoStack.prototype.canRedo = function() {
	return this.index_ < this.undoCommands_.length;
};

/** @return {boolean} */
ag.undoredo.UndoStack.prototype.canUndo = function() {
	return this.index_ > 0;
};

/** @returns {number} */
ag.undoredo.UndoStack.prototype.cleanIndex = function() {
	return this.cleanIndex_;
};

/**
 * Clears the stack of all undo commands. None of the undo commands are redone or undone.
 */
ag.undoredo.UndoStack.prototype.clear = function() {
	for (var i=0, z= this.undoCommands_.length; i<z; i++)
		this.undoCommands_[i].dispose();

	goog.array.clear(this.undoCommands_);
	this.index_ = 0;
	this.setClean();
};

/** @returns {number} */
ag.undoredo.UndoStack.prototype.count = function() {
	return this.undoCommands_.length;
};

/** @returns {number} */
ag.undoredo.UndoStack.prototype.index = function() {
	return this.index_;
};

/** @returns {boolean} */
ag.undoredo.UndoStack.prototype.isClean = function() {
	return this.cleanIndex_ === this.index_;
};

/**
 * @param {ag.undoredo.UndoCommand} command
 */
ag.undoredo.UndoStack.prototype.push = function(command) {
	// Perform the redo command before changing any internal state to accommodate any exception handling in
	// client code that may result from performing the command.
	command.redo();
	this.saveundoredoState_();
	this.removeUndoneCommands_();
	this.undoCommands_.push(command);
	this.index_++;
	this.updateCanundoredoState_();
};

/**
 * Redoes the current command by calling UndoCommand.redo(). Increases the command index accordingly.
 * Does nothing if the stack is empty or at the top of the stack.
 */
ag.undoredo.UndoStack.prototype.redo = function() {
	if (!this.canRedo())
		return;

	this.saveundoredoState_();
	this.redoWithoutSignals_();
	this.updateCanundoredoState_();
};

/**
 * Sets the current index as the clean index.
 */
ag.undoredo.UndoStack.prototype.setClean = function() {
	this.cleanIndex_ = this.index_;
};

/**
 * Repeatedly calls undo or redo until the current index reaches the user-supplied index. This method
 * may be used to roll the document forward or backward several commands at a time.
 *
 * @param {number} targetIndex
 */
ag.undoredo.UndoStack.prototype.setIndex = function(targetIndex) {
	goog.asserts.assert(targetIndex >= 0, 'UndoStack.setIndex: targetIndex must be >= 0');
	goog.asserts.assert(targetIndex <= this.count(), 'UndoStack.setIndex: targetIndex out of range');

	if (targetIndex == this.index_)
		return;

	this.saveundoredoState_();
	if (targetIndex < this.index_) {
		while (targetIndex !== this.index_)
			this.undoWithoutSignals_();
	}
	else { // if (targetIndex > this.index_)
		while (targetIndex !== this.index_)
			this.redoWithoutSignals_();
	}
	this.updateCanundoredoState_();
};

/**
 * Undoes the command below the current command by calling UndoCommand.undo(). Decreases the command
 * index accordingly. Does nothing if the stack is already empty or at the bottom of the stack.
 */
ag.undoredo.UndoStack.prototype.undo = function() {
	if (!this.canUndo())
		return;

	this.saveundoredoState_();
	this.undoWithoutSignals_();
	this.updateCanundoredoState_();
};


// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Protected methods
/**
 * @protected
 */
ag.undoredo.UndoStack.prototype.shift = function() {
	if (this.count() === 0)
		return;

	this.undoCommands_[0].dispose();
    goog.array.removeAt(this.undoCommands_, 0);
    this.index_--;

    if (this.cleanIndex_ > 0)
    	this.cleanIndex_--;
};

// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Private methods
/** @return {boolean} */
ag.undoredo.UndoStack.prototype.areSomeCommandsUndone_ = function() {
	return this.numberOfUndoneCommands_() > 0;
};

/**
 * Private version of undo that does not emit signals.
 */
ag.undoredo.UndoStack.prototype.redoWithoutSignals_ = function() {
	goog.asserts.assert(this.canRedo(), 'UndoStack.redoWithoutSignals_(): canRedo returned false');

	this.undoCommands_[this.index_].redo();
	this.index_++;
};

/** @return {number} */
ag.undoredo.UndoStack.prototype.numberOfUndoneCommands_ = function() {
	return this.undoCommands_.length - this.index_;
};

/**
 * Removes all commands starting with index.
 */
ag.undoredo.UndoStack.prototype.removeUndoneCommands_ = function() {
	var nToRemove = this.numberOfUndoneCommands_();
	if (nToRemove == 0)
		return;

	for (var i=this.count() - nToRemove; i< this.count(); i++)
		this.undoCommands_[i].dispose();
	this.undoCommands_.splice(this.index_, nToRemove);
};

/**
 * Saves the current state of undo/redo.
 */
ag.undoredo.UndoStack.prototype.saveundoredoState_ = function() {
	this.canUndo_ = this.canUndo();
	this.canRedo_ = this.canRedo();
};

/**
 * Private version of undo that does not emit signals.
 */
ag.undoredo.UndoStack.prototype.undoWithoutSignals_ = function() {
	goog.asserts.assert(this.canUndo(), 'UndoStack.undoWithoutSignals_(): canUndo returned false');

	this.index_--;
	this.undoCommands_[this.index_].undo();
};

/**
 * Updates the can redo and can undo local variables and emits the relevant signals if they have changed.
 */
ag.undoredo.UndoStack.prototype.updateCanundoredoState_ = function() {
	var currentCanUndo = this.canUndo();
	if (currentCanUndo != this.canUndo_)
		ag.meta.MetaObject.getInstance().emit(this, ag.undoredo.UndoStack.SignalType.CAN_UNDO_CHANGED, currentCanUndo);

	var currentCanRedo = this.canRedo();
	if (currentCanRedo != this.canRedo_)
		ag.meta.MetaObject.getInstance().emit(this, ag.undoredo.UndoStack.SignalType.CAN_REDO_CHANGED, currentCanRedo);
};