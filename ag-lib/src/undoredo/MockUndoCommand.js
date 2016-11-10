goog.provide('ag.undoredo.MockUndoCommand');

goog.require('ag.undoredo.UndoCommand');

ag.undoredo.MockUndoCommand = function(text, parentCommand) {
	goog.base(this, text, parentCommand);

	this.undoCount = 0;
	this.redoCount = 0;
};
goog.inherits(ag.undoredo.MockUndoCommand, ag.undoredo.UndoCommand);

ag.undoredo.MockUndoCommand.prototype.undo = function() {
	this.undoCount++;	
};

ag.undoredo.MockUndoCommand.prototype.redo = function() {
	this.redoCount++;	
};