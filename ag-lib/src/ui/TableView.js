goog.provide('ag.ui.TableView');

goog.require('goog.asserts');
goog.require('goog.dom.classes');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.events.KeyCodes');
goog.require('goog.math');
goog.require('goog.math.Size');
goog.require('goog.style');

goog.require('ag');
goog.require('ag.global');
goog.require('ag.core.UnitRect');
goog.require('ag.meta.MetaObject');
goog.require('ag.model.AbstractItemModel');
goog.require('ag.model.ItemSelection');
goog.require('ag.model.ItemSelectionModel');
goog.require('ag.model.ModelConstants');
goog.require('ag.ui.AbstractItemView');
goog.require('ag.ui.Clipboard');
goog.require('ag.ui.HorizontalHeaderView');


// --------------------------------------------------------------------------------------------------------------------
/**
 * Constructs a table view that combines a horizontal header view with a data view represented as an HTML table. The
 * final html will look like so:
 *
 *   <div class="ag-tableView">
 *     <div class="ag-headerView horizontal">...</div>
 *     <div class="ag-dataView"
 *       <table>
 *         <colgroup>
 *           <col width="50px">
 *           ...
 *         </colgroup>
 *         <tbody>
 *           <tr>
 *             <td>{data}</td>
 *             ...
 *           </tr>
 *           ...
 *         </tbody>
 *       </table>
 *     </div>
 *   </div>
 *
 * The HeaderView controls the size and placement of headers, which cascades to size of the data view columns
 * The DataView table controls the horizontal scroll offset, which cascades to the header offset.
 *
 * For the table view to display properly it is helpful to specify a height via CSS; othwerwise, a default
 * height of 200px will be assigned to the table view.
 *
 * @constructor
 * @extends {ag.ui.AbstractItemView}
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
ag.ui.TableView = function(optDomHelper) {
	goog.base(this, optDomHelper);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.ui.HorizontalHeaderView}
	 * @private
	 */
	this.horizontalHeader_ = new ag.ui.HorizontalHeaderView(optDomHelper);

	/**
	 * @type {HTMLElement}
	 * @private
	 */
	this.table_ = null;

	/**
	 * @type {HTMLElement}
	 * @private
	 */
	this.dataViewDiv_ = null;

	/**
	 * @type {HTMLElement}
	 * @private
	 */
	this.colgroup_ = null;

	/**
	 * @type {HTMLElement}
	 * @private
	 */
	this.tbody_ = null;

	/**
	 * @type {ag.model.PersistentModelIndex}
	 * @private
	 */
	this.anchorIndex_ = new ag.model.PersistentModelIndex();
};
goog.inherits(ag.ui.TableView, ag.ui.AbstractItemView);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var classes = goog.dom.classes;
var events = goog.events;
var math = goog.math;
var style = goog.style;

var Event = goog.events.Event;
var KeyCodes = events.KeyCodes;
var KeyEvent = events.KeyEvent;
var MouseWheelHandler = goog.events.MouseWheelHandler;
var TagName = goog.dom.TagName;

var AbstractHeaderView = ag.ui.AbstractHeaderView;
var AbstractItemView = ag.ui.AbstractItemView;
var AbstractItemModel = ag.model.AbstractItemModel;
var Clipboard = ag.ui.Clipboard.getInstance;
var ItemSelection = ag.model.ItemSelection;
var ItemSelectionModel = ag.model.ItemSelectionModel;
var ModelIndex = ag.model.ModelIndex;
var PersistentModelIndex = ag.model.PersistentModelIndex;
var Size = goog.math.Size;
var TableView = ag.ui.TableView;
var UnitRect = ag.core.UnitRect;

var metaObject = ag.meta.MetaObject.getInstance;
var ScrollHint = AbstractItemView.ScrollHint;
var SelectionBehavior = AbstractItemView.SelectionBehavior;
var SelectionFlag = ag.model.ModelConstants.SelectionFlag;
var SelectionMode = AbstractItemView.SelectionMode;
var SortOrder = ag.global.SortOrder;

var ModelSignal = ag.model.AbstractItemModel.SignalType;

// --------------------------------------------------------------------------------------------------------------------
// Constants
/** @enum {string} */
TableView.Css = {
	RootClass: goog.getCssName('ag-tableView'),
	GridDivClass: goog.getCssName('ag-dataView'),

	CurrentClass: goog.getCssName('current'),
	SelectedClass: goog.getCssName('selected')
};


/** @enum {number} */
TableView.ModifierKeys = {
	Ctrl:  0x0001,
	Shift: 0x0002
};

/** @enum {number} */
TableView.Defaults = {
	kHeight: 200 			// default height of table view if none is defined via CSS.
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
TableView.prototype.enterDocument = function() {
	goog.base(this, 'enterDocument');

	this.updateDataViewHeight_();

	this.createColgroupColsHTML_();
	this.createBodyHTML_();
	this.watchSignals_();

	this.getHandler().listen(this.dataViewDiv_, events.EventType.SCROLL, this.onDataDivScroll_)
					 .listen(this.tbody_, events.EventType.MOUSEDOWN, this.onBodyMouseDown_);

	events.listen(this.tbody_, events.EventType.KEYDOWN, this.onTbodyKeyDown_, false /* capture */, this);

	this.horizontalHeader_.setClickable(this.isSortingEnabled());
};

/** @override */
TableView.prototype.exitDocument = function() {
	goog.base(this, 'exitDocument');

	events.unlisten(this.tbody_, events.EventType.KEYDOWN, this.onTbodyKeyDown_, false /* capture */, this);

	this.getHandler().unlisten(this.dataViewDiv_, events.EventType.SCROLL, this.onDataDivScroll_)
					 .unlisten(this.tbody_, events.EventType.MOUSEDOWN, this.onBodyMouseDown_);

	this.unwatchSignals_();
	this.clearColgroupHTML_();
	this.clearBodyHTML_();
};

/**
 * Focus the tbody element for keyboard input while maintaining the same window scroll position
 */
TableView.prototype.focusWithoutScrolling = function() {
	var oldDocScroll = document.body.scrollTop;
	var oldDataDivScroll = this.dataViewDiv_.scrollTop;
	this.tbody_.focus();
	document.body.scrollTop = oldDocScroll;
	this.dataViewDiv_.scrollTop = oldDataDivScroll;
};

/** @return {HorizontalHeaderView} */
TableView.prototype.horizontalHeader = function() {
	return this.horizontalHeader_;
};

/**
 * @param {ModelIndex} index
 * @param {ScrollHint?} optHint defaults to EnsureVisible
 */
TableView.prototype.scrollTo = function(index, optHint) {
	var td = this.tdForIndex_(index);
	if (!td)
		return;

	var hint = goog.isDefAndNotNull(optHint) ? optHint : ScrollHint.EnsureVisible;

	var tdRect = this.unitRectForTd_(td);
	var viewRect = this.unitRectForViewport_();

	if (hint === ScrollHint.EnsureVisible) {
		if (viewRect.containsUnitRect(tdRect))
			return;

		var viewVertRange = viewRect.verticalRange();
		var tdVertRange = tdRect.verticalRange();
		if (!viewVertRange.containsRange(tdVertRange))
			hint = (tdRect.y1 < viewRect.y1 || tdRect.height() >= viewRect.height()) ? ScrollHint.PositionAtTop : ScrollHint.PositionAtBottom;
	}

	var div = this.dataViewDiv_;
	switch(hint) {
	case ScrollHint.PositionAtTop:
		div.scrollTop = tdRect.y1;
		break;
	case ScrollHint.PositionAtBottom:
		div.scrollTop = div.scrollTop + (tdRect.y2 - viewRect.y2);
		break;
	case ScrollHint.Center:
		div.scrollTop = tdRect.y1 - ((viewRect.height() - tdRect.height()) / 2);
		break;

	default:
		break;
	}

	// Horizontal positioning is independent of the hints. Attempt to fit the entire cell in the view; however,
	// if cell is too large, simply make the left side line up with the left side of the viewport.
	var viewHorzRange = viewRect.horizontalRange();
	var tdHorzRange = tdRect.horizontalRange();
	if (!viewHorzRange.containsRange(tdHorzRange)) {
		var anchorLeft = (tdRect.x1 <= viewRect.x1 || tdRect.width() >= viewRect.width());
		if (anchorLeft)
			div.scrollLeft = tdRect.x1;
		else  // Anchor to the right
			div.scrollLeft = div.scrollLeft + (tdRect.x2 - viewRect.x2);
	}
};

/**
 * Adjust the selection to index if possible.
 *
 * @param {ModelIndex} index
 */
TableView.prototype.selectIndex = function(index) {
	this.adjustSelectionTo_(index);
};

/**
 * Convenience function for selecting a given row.
 *
 * @param {number} row
 */
TableView.prototype.selectRow = function(row) {
	if (!this.model_)
		return;

	var firstVisibleColumn = this.horizontalHeader_.mapToModelColumn(0);
	this.selectIndex(this.model_.index(row, firstVisibleColumn));
};

/**
 * Returns the tbody element for external classes to attach to its events (e.g. double-clicking).
 *
 * @return {Element}
 */
TableView.prototype.tBody = function() {
	return this.tbody_;
}

// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
TableView.prototype.decorateInternal = function(element) {
	goog.base(this, 'decorateInternal', element);

	this.addChild(this.horizontalHeader_, true);
	classes.add(element, TableView.Css.RootClass);

	var domHelper = this.getDomHelper();
	var frag = document.createDocumentFragment();

	var colgroup = domHelper.createDom('colgroup');
	var body = domHelper.createDom('tbody', {'tabIndex': 1});
	//                                       ^^^^^^^^^^^^^ Enable body to receive keyboard focus and events
	var table = domHelper.createDom('table', null, [colgroup, body]);
	var div = domHelper.createDom('div', null, table);
	classes.add(div, TableView.Css.GridDivClass);
	frag.appendChild(div);
	element.appendChild(frag);

	this.dataViewDiv_ = div;
	this.table_= table;
	this.colgroup_ = colgroup;
	this.tbody_ = body;

	style.setUnselectable(div, true);

	// Make sure the clipboard is ready
	Clipboard();
};

/** @override */
TableView.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	this.anchorIndex_.invalidate();
	delete this.anchorIndex_;

	this.horizontalHeader_.dispose();
	delete this.horizontalHeader_;
	delete this.colgroup_;
	delete this.tbody_;
	delete this.table_;
	delete this.dataViewDiv_;
};

/** @override */
TableView.prototype.modelChanged = function(newModel, oldModel) {
	this.horizontalHeader_.setModel(newModel);
	if (!this.isInDocument())
		return;

	this.unwatchModel_(oldModel);
	this.clearColgroupHTML_();
	this.clearBodyHTML_();
	if (!newModel)
		return;

	this.createColgroupColsHTML_();
	this.createBodyHTML_();
	this.watchModel_(newModel);
};

/** @override */
TableView.prototype.selectionModelChanged = function(newSelectionModel, oldSelectionModel) {
	var newSelection = newSelectionModel.selection();
	var oldSelection = oldSelectionModel.selection();
	var toDeselect = oldSelection.difference(newSelection);
	var toSelect = newSelection.difference(oldSelection);
	this.removeCssSelectionClass_(toDeselect);
	this.addCssSelectionClass_(toSelect);

	this.unwatchSelectionModel_(oldSelectionModel);
	this.watchSelectionModel_(newSelectionModel);

	this.onCurrentChanged_(newSelectionModel.currentIndex(), oldSelectionModel.currentIndex());
};


// --------------------------------------------------------------------------------------------------------------------
// Private event handlers
/**
 * @param {BrowserEvent} mouseEvent
 * @private
 */
TableView.prototype.onBodyMouseDown_ = function(mouseEvent) {
	this.focusWithoutScrolling();

	var target = mouseEvent.target;
	var td = (target.tagName === TagName.TD.toString()) ? target : this.dom_.getAncestorByTagNameAndClass(target, TagName.TD);
	if (!td)
		return;

	var tr = this.dom_.getAncestorByTagNameAndClass(td, TagName.TR);
	var row = tr.rowIndex;
	var visualColumn = td.cellIndex;
	var modelColumn = this.horizontalHeader_.mapToModelColumn(visualColumn);

	// Update the current cell index - if successful, the selection model will be updated, which in turn will emit a
	// signal that is subsequently captured by this class that updates the CSS for this index.
	var clickedIndex = this.model_.index(row, modelColumn);
	assert(clickedIndex.isValid(), 'TableView: invalid clickedIndex yet click corresponds to real td: %s', this.dom_.getTextContent(td));
	this.adjustSelectionWithEvent_(clickedIndex, mouseEvent);
	mouseEvent.preventDefault();
};

/**
 * @param {Event} event
 * @private
 */
TableView.prototype.onDataDivScroll_ = function(event) {
	this.horizontalHeader_.setOffset(event.target.scrollLeft);
};

/**
 * @param {KeyEvent} keyEvent
 * @private
 */
TableView.prototype.onTbodyKeyDown_ = function(keyEvent) {
	if (!this.tbody_.childNodes.length === 0)
		return;

	var hh = this.horizontalHeader_;
	var selModel = this.selectionModel();
	var currentIndex = selModel.currentIndex();
	if (!currentIndex.isValid()) {
		var firstVisibleColumn = hh.mapToModelColumn(0);
		selModel.setCurrentIndex(this.model_.index(0, firstVisibleColumn));
	}
	currentIndex = selModel.currentIndex();
	if (!currentIndex.isValid())
		return;

	// Dealing with visual coordinates. For the columns, they must be mapped from the header. Rows
	// at this point are 1:1 and do not require any mapping.
	var oldColumn = hh.mapFromModelColumn(currentIndex.column());
	var oldRow = currentIndex.row();
	var newColumn = oldColumn;
	var newRow = oldRow;

	var xOsCtrlPressed = ag.xOsCtrlPressed(keyEvent);

	var selModel = this.selectionModel();
	var behaviorFlags = this.selectionFlagsFromBehavior_();
	var handledKey = true;
	switch (keyEvent.keyCode) {
	case KeyCodes.A:
		if (xOsCtrlPressed && this.canSelectMultipleIndices_()) {
			//                     ^^^^^^^^^^^^^^^^^^^^^^^^^ false if selection mode is not contiguous or extended
			var all = selModel.entireSelectionSpace();
			//  ^^^
			// TODO: Should this be constrained to those indices visible within the view? Probably so...
			selModel.selectSelection(all, SelectionFlag.Select);
			keyEvent.preventDefault();
			return;
		}
		break;
	case KeyCodes.C:
	case KeyCodes.INSERT:
		if (xOsCtrlPressed) {
			Clipboard().copy(currentIndex.data(), this.getElement());
			return;
		}
		break;
	case KeyCodes.HOME:
		if (xOsCtrlPressed)
			newRow = newColumn = 0;
		else
			handledKey = false;
		break;
	case KeyCodes.END:
		if (xOsCtrlPressed) {
			newRow = this.model_.rowCount() - 1;
			newColumn = hh.count() - 1;
		}
		else
			handledKey = false;
		break;
	case KeyCodes.LEFT:
		newColumn--;
		break;
	case KeyCodes.RIGHT:
		newColumn++;
		break;
	case KeyCodes.UP:
		newRow--;
		break;
	case KeyCodes.DOWN:
		newRow++;
		break;
	case KeyCodes.PAGE_DOWN:
		newRow += Math.max(1, this.rowsPerPage_());
		break;
	case KeyCodes.PAGE_UP:
		newRow -= Math.max(1, this.rowsPerPage_());
		break;
	case KeyCodes.SPACE:
		if (xOsCtrlPressed || keyEvent.ctrlKey)
			selModel.selectIndex(currentIndex, behaviorFlags | SelectionFlag.Toggle);
		break;

	default:
		handledKey = false;
		break;
	}

	if (!handledKey)
		return;

	keyEvent.preventDefault();
	newRow = math.clamp(0, newRow, this.model_.rowCount() - 1);
	newColumn = math.clamp(0, newColumn, this.horizontalHeader_.count() - 1);
	//                                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ It is very likely that some columns
	// are hidden, therefore it is vital to restrict it to those displayed.
	if (newRow != oldRow || newColumn != oldColumn) {
		var targetIndex = this.model_.index(newRow, hh.mapToModelColumn(newColumn));
		if (xOsCtrlPressed)
			selModel.setCurrentIndex(targetIndex);
		else
			this.adjustSelectionWithEvent_(targetIndex, keyEvent);
		this.scrollTo(targetIndex);
	}
};


// --------------------------------------------------------------------------------------------------------------------
// Private slots
/**
 * @param {ModelIndex} newCurrentIndex
 * @param {ModelIndex} previousIndex
 * @private
 */
TableView.prototype.onCurrentChanged_ = function(newCurrentIndex, previousIndex) {
	var name = TableView.Css.CurrentClass;
	this.removeCssClassForIndex_(previousIndex, name);
	this.addCssClassForIndex_(newCurrentIndex, name);
};

/** @private */
TableView.prototype.onLayoutChanged_ = function() {
	// Update all the cell text contents; however, there is no need to rebuild
	// the entire DOM.
	var hh = this.horizontalHeader_;
	var nColumns = hh.count();
	for (var i=0, z=this.model_.rowCount(); i<z; i++) {
		var tr = this.tbody_.childNodes[i];
		for (var j=0; j<nColumns; j++) {
			var modelColumn = hh.mapToModelColumn(j);
			var index = this.model_.index(i, modelColumn);
			var td = tr.childNodes[j];
			td.innerHTML = index.data();
		}
	}
};

/**
 * @private
 */
TableView.prototype.onModelReset_ = function() {
	this.clearBodyHTML_();
	this.createBodyHTML_();
};

/**
 * @param {number} startRow
 * @param {number} endRow
 * @private
 */
TableView.prototype.onRowsInserted_ = function(startRow, endRow) {
	assert(this.model_);
	assert(this.model_.isValidRow(startRow));
	assert(this.model_.isValidRow(endRow));
	assert(startRow <= endRow);

	var rowsFragment = this.createBodyTrsFragmentForModelRows_(startRow, endRow);
	this.dom_.insertChildAt(this.tbody_, rowsFragment, startRow);

	this.updateHeaderDivWidth_();
};

/**
 * @param {number} visualColumn
 * @private
 */
TableView.prototype.onSectionClicked_ = function(visualColumn) {
	if (!this.isSortingEnabled())
		return;

	var hh = this.horizontalHeader_;
	var modelColumn = hh.mapToModelColumn(visualColumn);

	// Is this section already sorted?
	var existingSortSection = hh.sortIndicatorSection();
	var existingSortOrder = hh.sortIndicatorOrder();

	var newSortOrder = SortOrder.kAsc;
	if (existingSortSection === modelColumn && existingSortOrder === SortOrder.kAsc)
		newSortOrder = SortOrder.kDesc;

	hh.setSortIndicator(modelColumn, newSortOrder);
	this.model_.sort(modelColumn, newSortOrder);
};

/**
 * @param {number} visualColumn
 * @param {number} toVisualColumn
 * @param {number} modelColumn
 * @private
 */
TableView.prototype.onSectionMoved_ = function(visualColumn, toVisualColumn, modelColumn) {
	var domHelper = this.getDomHelper();

	// 1) Update the colgroups
	var colgroup = this.colgroup_;
	var node = domHelper.removeNode(colgroup.childNodes[visualColumn]);
	domHelper.insertChildAt(colgroup, node, toVisualColumn);

	// 2) Update all the td elements
	var tbodyChildNodes = this.tbody_.childNodes;
	for (var i=0, z=this.model_.rowCount(); i<z; i++) {
		var row = tbodyChildNodes[i];
		node = domHelper.removeNode(row.childNodes[visualColumn]);
		domHelper.insertChildAt(row, node, toVisualColumn);
	}
};

/**
 * @param {number} modelColumn
 * @param {number} newWidth
 * @param {number} oldWidth
 * @private
 */
TableView.prototype.onSectionResized_ = function(modelColumn, newWidth, oldWidth) {
	assert(this.model_.isValidColumn(modelColumn));

	this.colgroup_.childNodes[modelColumn].style.width = newWidth + 'px';
	this.table_.style.width = this.horizontalHeader_.totalWidthOfColumns() + 'px';

	this.updateHeaderDivWidth_();
};

/**
 * @param {number} visualColumn if visible is false, represents the column that was hidden, vice versa
 * @param {number} modelColumn
 * @param {boolean} visible
 * @private
 */
TableView.prototype.onSectionVisibleChanged_ = function(visualColumn, modelColumn, visible) {
	if (!this.isInDocument())
		return;

	if (visible)
		this.restoreColumn_(visualColumn, modelColumn);
	else
		this.removeColumn_(visualColumn);

	this.updateHeaderDivWidth_();
};

/**
 * @param {ItemSelection} selected
 * @param {ItemSelection} deselected
 * @private
 */
TableView.prototype.onSelectionChanged_ = function(selected, deselected) {
	this.removeCssSelectionClass_(deselected);
	this.addCssSelectionClass_(selected);
};

/** @private */
TableView.prototype.onSelectionLayoutAboutToBeChanged_ = function() {
	var selModel = this.selectionModel();
	this.removeCssSelectionClass_(selModel.selection());
	this.removeCssClassForIndex_(selModel.currentIndex(), TableView.Css.CurrentClass);
};

/** @private */
TableView.prototype.onSelectionLayoutChanged_ = function() {
	var selModel = this.selectionModel();
	this.addCssSelectionClass_(selModel.selection());
	this.addCssClassForIndex_(selModel.currentIndex(), TableView.Css.CurrentClass);
};

/**
 * Removes all HTML for the column at visualColumn.
 *
 * @param {number} visualColumn
 * @private
 */
TableView.prototype.removeColumn_ = function(visualColumn) {
	assert(this.isInDocument());
	assert(this.colgroup_);
	assert(this.tbody_);

	var domHelper = this.getDomHelper();
	domHelper.removeNode(this.colgroup_.childNodes[visualColumn]);

	var tbodyChildNodes = this.tbody_.childNodes;
	for (var i=0, z=this.model_.rowCount(); i<z; i++)
		domHelper.removeNode(tbodyChildNodes[i].childNodes[visualColumn]);
};

/**
 * @param {number} startRow
 * @param {number} endRow
 * @private
 */
TableView.prototype.removeRows_ = function(startRow, endRow) {
	assert(this.model_);
	assert(startRow <= endRow);

	var tbody = this.tbody_;
	for (var i=startRow; i<= endRow; i++)
		this.dom_.removeNode(tbody.childNodes[startRow]);

	this.updateHeaderDivWidth_();
};

/**
 * Recreates the column HTML for modelColumn and inserts at visualColumn.
 *
 * @param {number} visualColumn
 * @param {number} modelColumn
 * @private
 */
TableView.prototype.restoreColumn_ = function(visualColumn, modelColumn) {
	assert(this.isInDocument());
	assert(this.colgroup_);
	assert(this.tbody_);

	var domHelper = this.getDomHelper();
	var col = this.createColHTML_(modelColumn);
	domHelper.insertChildAt(this.colgroup_, col, visualColumn);

	var tbodyChildNodes = this.tbody_.childNodes;
	for (var i=0, z=this.model_.rowCount(); i<z; i++) {
		var td = this.createTdHTML_(i, modelColumn);
		domHelper.insertChildAt(tbodyChildNodes[i], td, visualColumn);
	}
};

/**
 * @param {ModelIndex} index
 * @private
 */
TableView.prototype.updateCellData_ = function(index) {
	var tr = this.tbody_.childNodes(index.row());
	var td = tr.childNodes[index.column()];
	td.innerHTML = index.data();
};

/**
 * To properly enable scrolling, it is vital to specify a height value for the data view div Element. This is
 * equal to the total height of the TableView's root element less any border less the header view height.
 *
 * If the TableView is resized, it will need to update the data view height by calling this function.
 *
 * @private
 */
TableView.prototype.updateDataViewHeight_ = function() {
	var rootEl = this.getElement();
	var totalHeight = style.getSize(rootEl).height;		// Includes any border (assumes box-sizing = border-box)
	var borders = style.getBorderBox(rootEl);
	var headerHeight = style.getSize(this.horizontalHeader_.getElement()).height;

	var newHeight = totalHeight - headerHeight - borders.top - borders.bottom;
	if (newHeight < 5)
	//  ^^^^^^^^^^^^^ Assume this is too small to do anything with. Arbitrarily chose 5 pixels.
		newHeight = TableView.Defaults.kHeight;

	style.setHeight(this.dataViewDiv_, newHeight + 'px');
};


// --------------------------------------------------------------------------------------------------------------------
// Private functions
/**
 * Adds the relevant Css class to the cell representing the current index.
 *
 * @param {ModelIndex} index
 * @param {string} className
 * @private
 */
TableView.prototype.addCssClassForIndex_ = function(index, className) {
	var currentTd = this.tdForIndex_(index);
	if (!currentTd)
		return;

	classes.add(currentTd, className);
};

/**
 * Adds the appropraite selection css class to all cells represented by itemSelection.
 *
 * @param {ItemSelection} itemSelection
 * @private
 */
TableView.prototype.addCssSelectionClass_ = function(itemSelection) {
	var hh = this.horizontalHeader_;
	var selectedRanges = itemSelection.ranges();
	for (var i=0, z=selectedRanges.length; i<z; i++) {
		var range = selectedRanges[i];
		var left = range.left();
		var right = range.right();
		for (var j=range.top(), y=range.bottom(); j<=y; j++) {
			var tr = this.trForRow_(j);
			for (var k=left; k<=right; k++) {
				var modelColumn = k;
				var visualColumn = hh.mapFromModelColumn(modelColumn);
				if (visualColumn === -1)
					continue;

				var td = tr.childNodes[visualColumn];
				classes.add(td, TableView.Css.SelectedClass);
			}
		}
	}
};

/**
 * Adjusts the selection to the cell represented by targetIndex taking into consideration the current selection, anchor
 * index, which modifier keys (e.g. shift/control) are pressed, the selection mode, and selection behavior.
 *
 * @param {ModelIndex} targetIndex
 * @param {number=} optModifierKeys
 */
TableView.prototype.adjustSelectionTo_ = function(targetIndex, optModifierKeys) {
	if (!targetIndex.isValid())
		return;

	assert(targetIndex.model() === this.model_, 'TableView.adjustSelectionTo_: incompatible model for index');

	var xOsCtrlPressed = false;
	var shiftPressed = false;
	if (optModifierKeys) {
		xOsCtrlPressed = (optModifierKeys & TableView.ModifierKeys.Ctrl) != 0;
		shiftPressed = (optModifierKeys & TableView.ModifierKeys.Shift) != 0;
	}

	var selModel = this.selectionModel();
	var behaviorFlags = this.selectionFlagsFromBehavior_();
	var flags = SelectionFlag.ClearAndSelect | behaviorFlags;
	switch (this.selectionMode_) {
	case SelectionMode.None:
		selModel.setCurrentIndex(targetIndex);
		break;

	case SelectionMode.Single:
		selModel.setCurrentIndex(targetIndex, flags);
		break;

	case SelectionMode.Contiguous:
		selModel.setCurrentIndex(targetIndex);

		// Determine the new relevant selection relative to the anchor index (which will be set
		// to the targetIndex if index is invalid or shift is not pressed)
		if (!shiftPressed || !this.anchorIndex_.isValid()) {
			if (this.anchorIndex_.ne(targetIndex))
				this.anchorIndex_.invalidate();
			this.anchorIndex_ = new PersistentModelIndex(targetIndex);
		}
		var newSel = new ItemSelection(this.anchorIndex_, targetIndex);
		selModel.selectSelection(newSel, flags);
		break;

	case SelectionMode.Extended:
		selModel.setCurrentIndex(targetIndex);

		if (!shiftPressed || !this.anchorIndex_.isValid()) {
			if (this.anchorIndex_.ne(targetIndex))
				this.anchorIndex_.invalidate();
			this.anchorIndex_ = new PersistentModelIndex(targetIndex);
		}

		if (shiftPressed)
			selModel.selectSelection(new ItemSelection(this.anchorIndex_, targetIndex), flags);
		else if (xOsCtrlPressed)
			selModel.selectIndex(targetIndex, SelectionFlag.Toggle | behaviorFlags);
		else
			selModel.selectIndex(targetIndex, flags);
		break;

	default:
		assert(0, 'Unsupported selection mode');
	}

	this.model_.clearInvalidPersistentIndices();
};

/**
 * Adjusts the selection to the cell represented by targetIndex using information from event.
 *
 * @param {ModelIndex} targetIndex
 * @param {BrowserEvent} event
 */
TableView.prototype.adjustSelectionWithEvent_ = function(targetIndex, event) {
	var modKeys = 0;
	if (ag.xOsCtrlPressed(event))
		modKeys |= TableView.ModifierKeys.Ctrl;
	if (event.shiftKey)
		modKeys |= TableView.ModifierKeys.Shift;

	this.adjustSelectionTo_(targetIndex, modKeys);
};

/** @return {boolean} */
TableView.prototype.canSelectMultipleIndices_ = function() {
	return this.selectionMode_ === SelectionMode.Contiguous ||
		this.selectionMode_ === SelectionMode.Extended;
};

/**
 * Removes all the TR elements from the tbody.
 *
 * @private
 */
TableView.prototype.clearBodyHTML_ = function() {
	if (this.tbody_)
		this.dom_.removeChildren(this.tbody_);
};

/**
 * Removes all the COL elements from the colgroup.
 *
 * @private
 */
TableView.prototype.clearColgroupHTML_ = function() {
	if (this.colgroup_)
		this.dom_.removeChildren(this.colgroup_);
};

/**
 * @private
 */
TableView.prototype.createBodyHTML_ = function() {
	var model = this.model_;
	if (!this.model_)
		return;

	var nRows = model.rowCount();
	if (nRows === 0)
		return;

	var rowsFragment = this.createBodyTrsFragmentForModelRows_(0, nRows-1);
	assert(goog.isDefAndNotNull(this.tbody_));
	this.tbody_.appendChild(rowsFragment);

	this.updateHeaderDivWidth_();
};

/**
 * @param {number} row
 * @return {HTMLElement}
 */
TableView.prototype.createBodyTrForModelRow_ = function(row) {
	var hh = this.horizontalHeader_;
	var tr = this.dom_.createElement(TagName.TR);
	for (var i=0, z=hh.count(); i<z; i++) {
		var modelColumn = hh.mapToModelColumn(i);
		var td = this.createTdHTML_(row, modelColumn);
		tr.appendChild(td);
	}
	return tr;
};

/**
 * @param {number} startRow
 * @param {number} endRow
 * @return {HTMLDocumentFragment}
 */
TableView.prototype.createBodyTrsFragmentForModelRows_ = function(startRow, endRow) {
	var rowsFragment = document.createDocumentFragment();
	for (var i=startRow; i<=endRow; i++) {
		var tr = this.createBodyTrForModelRow_(i);
		rowsFragment.appendChild(tr);
	};
	return rowsFragment;
};

/**
 * @private
 */
TableView.prototype.createColgroupColsHTML_ = function() {
	assert(goog.isDefAndNotNull(this.colgroup_));

	var hh = this.horizontalHeader_;
	var frag = document.createDocumentFragment();
	for (var i=0, z=hh.count(); i<z; i++) {
		var modelColumn = hh.mapToModelColumn(i);
		var col = this.createColHTML_(modelColumn);
		frag.appendChild(col);
	}

	this.colgroup_.appendChild(frag);
};

/**
 * @param {number} modelColumn
 * @return {Element}
 * @private
 */
TableView.prototype.createColHTML_ = function(modelColumn) {
	var col = this.getDomHelper().createDom(TagName.COL);
	col.style.width = this.horizontalHeader_.sectionSize(modelColumn) + 'px';
	return col;
};

/**
 * @param {number} row
 * @param {number} column Model column, not the visual column
 * @return {Element}
 * @private
 */
TableView.prototype.createTdHTML_ = function(row, column) {
	var index = this.model_.index(row, column);
	var td = this.getDomHelper().createElement(TagName.TD);
	classes.add(td, 'modelColumn-' + column);
	if (this.selectionModel().isSelected(index))
		classes.add(td, TableView.Css.SelectedClass);
	td.innerHTML = index.data();
	return td;
};

/** @return {boolean} */
TableView.prototype.isHorzScrollBarVisible_ = function() {
	var div = this.dataViewDiv_;
	return div.clientWidth < div.scrollWidth;
};

/** @return {boolean} */
TableView.prototype.isVertScrollBarVisible_ = function() {
	var div = this.dataViewDiv_;
	return div.clientHeight < div.scrollHeight;
};

/**
 * @param {ModelIndex} index
 * @param {string} className
 * @private
 */
TableView.prototype.removeCssClassForIndex_ = function(index, className) {
	var currentTd = this.tdForIndex_(index);
	if (!currentTd)
		return;

	classes.remove(currentTd, className);
};

/**
 * Removes the appropraite selection css class from all cells represented by itemSelection.
 *
 * @param {ItemSelection} itemSelection
 * @private
 */
TableView.prototype.removeCssSelectionClass_ = function(itemSelection) {
	var hh = this.horizontalHeader_;
	var deselectedRanges = itemSelection.ranges();
	for (var i=0, z=deselectedRanges.length; i<z; i++) {
		var range = deselectedRanges[i];
		var left = range.left();
		var right = range.right();
		for (var j=range.top(), y=range.bottom(); j<=y; j++) {
			var tr = this.trForRow_(j);
			for (var k=left; k<=right; k++) {
				var modelColumn = k;
				var visualColumn = hh.mapFromModelColumn(modelColumn);
				if (visualColumn === -1)
					continue;

				var td = tr.childNodes[visualColumn];
				classes.remove(td, TableView.Css.SelectedClass);
			}
		}
	}
};

/** @return {number} */
TableView.prototype.rowsPerPage_ = function() {
	if (this.tbody_.childNodes.length === 0)
		return 0;

	var rowHeight = this.rowSize_().height;
	var visibleTbodyHeight = style.getSize(this.dataViewDiv_).height;
	if (this.isHorzScrollBarVisible_())
		visibleTbodyHeight -= style.getScrollbarWidth();
	return visibleTbodyHeight / rowHeight | 0;
};

/** @return {Size} */
TableView.prototype.rowSize_ = function() {
	if (this.tbody_.childNodes.length === 0)
		return new Size();

	return style.getSize(this.trForRow_(0));
};

/**
 * @return {SelectionFlag}
 * @private
 */
TableView.prototype.selectionFlagsFromBehavior_ = function() {
	var flags = SelectionFlag.NoChange;
	if (this.selectionBehavior_ === SelectionBehavior.Rows)
		flags |= SelectionFlag.Rows;
	else if (this.selectionBehavior_ === SelectionBehavior.Columns)
		flags |= SelectionFlag.Columns;
	return flags;
};

/** @override */
TableView.prototype.setSortingEnabled = function(enabled) {
	goog.base(this, 'setSortingEnabled', enabled);
	this.horizontalHeader_.setClickable(enabled);
};

/**
 * @param {ModelIndex} index
 * @return {HTMLElement?}
 * @private
 */
TableView.prototype.tdForIndex_ = function(index) {
	if (!index.isValid())
		return null;

	var tr = this.trForRow_(index.row());
	var visualColumn = this.horizontalHeader_.mapFromModelColumn(index.column());
	if (visualColumn === -1)
		return;

	assert(visualColumn < tr.childNodes.length);
	return tr.childNodes[visualColumn];
};

/**
 * Returns a UnitRect geometry of the current viewport scroll location and size (excluding scrollbars)
 *
 * @return {UnitRect}
 * @private
 */
TableView.prototype.unitRectForViewport_ = function() {
	var div = this.dataViewDiv_;
	var viewSize = style.getSize(div);
	var scrollTop = div.scrollTop;
	if (this.isHorzScrollBarVisible_())
		viewSize.height -= style.getScrollbarWidth();
	var scrollLeft = div.scrollLeft;
	if (this.isVertScrollBarVisible_())
		viewSize.width -= style.getScrollbarWidth();

	return new UnitRect(scrollLeft, scrollTop, viewSize.width, viewSize.height);
};

/**
 * Returns a UnitRect geometry of td relative to the tbody.
 *
 * @param {HTMLElement} td
 * @return {UnitRect}
 * @private
 */
TableView.prototype.unitRectForTd_ = function(td) {
	if (!td)
		return null;

	var topLeft = style.getRelativePosition(td, this.tbody_);
	var size = style.getSize(td);
	return UnitRect.createFromCoordinateSize(topLeft, size);
};

/**
 * @param {number} row
 * @return {HTMLElement}
 * @private
 */
TableView.prototype.trForRow_ = function(row) {
	assert(this.model_.isValidRow(row));

	assert(row < this.tbody_.childNodes.length);
	return this.tbody_.childNodes[row];
};

/**
 * Updates the relevant header and column widths (e.g. stemming from resize event) such that the display
 * and scrolling work properly.
 */
TableView.prototype.updateHeaderDivWidth_ = function() {
	var dataDivWidth = style.getSize(this.dataViewDiv_).width;
	if (!dataDivWidth) {
		if (goog.DEBUG) {
			console.log('[Warning] TableView body has zero width. Is it or one of its parents invisible? If so, think of ways to update header div after it becomes visible.');
		}
		return;
	}

	if (this.isVertScrollBarVisible_())
		this.horizontalHeader_.getElement().style.width = (dataDivWidth - style.getScrollbarWidth()) + 'px';
	else
		this.horizontalHeader_.getElement().style.width = dataDivWidth + 'px';
};

/**
 * @param {AbstractItemModel} model
 * @private
 */
TableView.prototype.unwatchModel_ = function(model) {
	if (!model)
		return;
	var mo = metaObject();

	mo.disconnect(model, ModelSignal.DATA_CHANGED, this, this.updateCellData_);
	mo.disconnect(model, ModelSignal.MODEL_RESET, this, this.onModelReset_);
	mo.disconnect(model, ModelSignal.ROWS_INSERTED, this, this.onRowsInserted_);
	mo.disconnect(model, ModelSignal.ROWS_REMOVED, this, this.removeRows_);

	mo.disconnect(model, ModelSignal.LAYOUT_CHANGED, this, this.onLayoutChanged_);
};

/**
 * @param {ItemSelectionModel} selectionModel
 * @private
 */
TableView.prototype.unwatchSelectionModel_ = function(selectionModel) {
	var mo = metaObject();

	mo.disconnect(selectionModel, ItemSelectionModel.SignalType.CURRENT_CHANGED, this, this.onCurrentChanged_);
	mo.disconnect(selectionModel, ItemSelectionModel.SignalType.SELECTION_CHANGED, this, this.onSelectionChanged_);
	mo.disconnect(selectionModel, ItemSelectionModel.SignalType.SELECTION_LAYOUT_ABOUT_TO_BE_CHANGED, this, this.onSelectionLayoutAboutToBeChanged_);
	mo.disconnect(selectionModel, ItemSelectionModel.SignalType.SELECTION_LAYOUT_CHANGED, this, this.onSelectionLayoutChanged_);
};

/** @private */
TableView.prototype.unwatchSignals_ = function() {
	var mo = metaObject();
	mo.disconnect(this.horizontalHeader_, AbstractHeaderView.SignalType.SECTION_CLICKED, this, this.onSectionClicked_);
	mo.disconnect(this.horizontalHeader_, AbstractHeaderView.SignalType.SECTION_RESIZED, this, this.onSectionResized_);
	mo.disconnect(this.horizontalHeader_, AbstractHeaderView.SignalType.SECTION_VISIBLE_CHANGED, this, this.onSectionVisibleChanged_);
	mo.disconnect(this.horizontalHeader_, AbstractHeaderView.SignalType.SECTION_MOVED, this, this.onSectionMoved_);
	this.unwatchModel_(this.model_);
};

/**
 * @param {AbstractItemModel} model
 * @private
 */
TableView.prototype.watchModel_ = function(model) {
	if (!model)
		return;

	var mo = metaObject();
	mo.connect(model, ModelSignal.DATA_CHANGED, this, this.updateCellData_);
	mo.connect(model, ModelSignal.MODEL_RESET, this, this.onModelReset_);
	mo.connect(model, ModelSignal.ROWS_INSERTED, this, this.onRowsInserted_);
	mo.connect(model, ModelSignal.ROWS_REMOVED, this, this.removeRows_);

	mo.connect(model, ModelSignal.LAYOUT_CHANGED, this, this.onLayoutChanged_);
};

/**
 * @param {ItemSelectionModel} selectionModel
 * @private
 */
TableView.prototype.watchSelectionModel_ = function(selectionModel) {
	var mo = metaObject();

	mo.connect(selectionModel, ItemSelectionModel.SignalType.CURRENT_CHANGED, this, this.onCurrentChanged_);
	mo.connect(selectionModel, ItemSelectionModel.SignalType.SELECTION_CHANGED, this, this.onSelectionChanged_);
	mo.connect(selectionModel, ItemSelectionModel.SignalType.SELECTION_LAYOUT_ABOUT_TO_BE_CHANGED, this, this.onSelectionLayoutAboutToBeChanged_);
	mo.connect(selectionModel, ItemSelectionModel.SignalType.SELECTION_LAYOUT_CHANGED, this, this.onSelectionLayoutChanged_);
};

/** @private */
TableView.prototype.watchSignals_ = function() {
	var mo = metaObject();
	mo.connect(this.horizontalHeader_, AbstractHeaderView.SignalType.SECTION_CLICKED, this, this.onSectionClicked_);
	mo.connect(this.horizontalHeader_, AbstractHeaderView.SignalType.SECTION_RESIZED, this, this.onSectionResized_);
	mo.connect(this.horizontalHeader_, AbstractHeaderView.SignalType.SECTION_VISIBLE_CHANGED, this, this.onSectionVisibleChanged_);
	mo.connect(this.horizontalHeader_, AbstractHeaderView.SignalType.SECTION_MOVED, this, this.onSectionMoved_);
	this.watchModel_(this.model_);
};


/*******************************************************************************************************************/});
