/**
 * @fileoverview ModelConstants enumerates several flags used in conjunction with models such as selecting.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.model.ModelConstants');

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var ModelConstants = ag.model.ModelConstants;

/**
 * While techincally possible to combine all of these flags, it is not logically valid. No two items from the following
 * sets should be combined:
 *
 * (Select, Deselect, Toggle)
 * (Current, Rows, Columns)
 * 
 * @enum {number}
 */
ModelConstants.SelectionFlag = {
	NoChange: 0x0000,
	Clear: 	  0x0001,	// Clear the selection; the clear will be performed before all other flags
	Select:   0x0002,
	Deselect: 0x0004,
	Toggle:   0x0008,
	Current:  0x0010,	// Expand action to include the current index
	Rows:     0x0020,	// Expand action to cover all rows
	Columns:  0x0040	// Expand action to cover all columns
};

// Convenient combinations
ModelConstants.SelectionFlag.ClearAndSelect = ModelConstants.SelectionFlag.Clear | ModelConstants.SelectionFlag.Select;
ModelConstants.SelectionFlag.SelectCurrent = ModelConstants.SelectionFlag.Select | ModelConstants.SelectionFlag.Current;
ModelConstants.SelectionFlag.ToggleCurrent = ModelConstants.SelectionFlag.Toggle | ModelConstants.SelectionFlag.Current;

/*******************************************************************************************************************/});
