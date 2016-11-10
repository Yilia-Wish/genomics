goog.provide('ag.ui.HorizontalHeaderView');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('goog.style');
goog.require('goog.userAgent');

goog.require('ag.global');
goog.require('ag.meta.MetaObject');
goog.require('ag.statemachine.State');
goog.require('ag.ui');
goog.require('ag.ui.AbstractHeaderView');
goog.require('ag.ui.HeaderViewMachine');
goog.require('ag.ui.HeaderViewMachine.ClickingColumnState');
goog.require('ag.ui.HeaderViewMachine.ResizingColumnState');
goog.require('ag.ui.HeaderViewMachine.HeaderViewMouseTransition');

/**
 * Constructs a horizontal header view as an HTML table wrapped in a DIV, with one header item per table header cell.
 *
 *   <div class="ag-headerView horizontal">
 *     <table class="ag-headerView-table">
 *       <thead class="ag-headerView-head">
 *         <tr class="ag-headerView-row">
 *           <th class="col1 ag-headerView-cell">ID</th>
 *           <th class="col2 ag-headerView-cell">Name</th>
 *           ...
 *         </tr>
 *       </thead>
 *     </table>
 *   </div>
 *
 * The main element div is given a user-defined width. The child table's total size varies as the sections are resized
 * and provide for scrolling as necessary.
 *
 * Width of headers may be specified via CSS, by using the col# classes. The initial widths will be taken from the CSS
 * and thus it is recommended to specify a default column width in the CSS:
 *
 * .ag-headerView-table th {
 *   width: 125px;
 * }
 *
 * Note that defining specific widths for specific columns involves defining a more specific rule than the default. For
 * example:
 *
 * .ag-headerView-table th.col2 {
 *   width: 50px;
 * }
 *
 * @constructor
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
ag.ui.HorizontalHeaderView = function(optDomHelper) {
	goog.base(this, ag.ui.Orientation.kHorizontal, optDomHelper);

	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {ag.ui.HeaderViewMachine.ClickingColumnState}
	 * @private
	 */
	this.clickingColumnState_ = null;

	/** 
	 * @type {ag.ui.HeaderViewMachine.ResizingColumnState}
	 * @private
	 */
	this.resizeReadyState_ = null;

	/**
	 * @type {ag.statemachine.State}
	 * @private
	 */
	this.idleState_ = null;

	/**
	 * @type {Array.<number>}
	 * @private
	 */
	this.columnWidths_ = [];

	/**
	 * @type {ag.ui.HeaderView.HeaderViewMachine}
	 * @private
	 */
	this.machine_ = null;

	/**
	 * One for each section.
	 *
	 * @type {Array.<ag.ui.ResizeMode>}
	 * @private
	 */
	this.resizeModes_ = [];

	/**
	 * Model column variable.
	 *
	 * @type {number}
	 * @private
	 */
	this.sortIndicatorSection_ = -1;

	/**
	 * @type {boolean}
	 * @private
	 */
	this.sortIndicatorShown_ = true;

	/**
	 * @type {ag.global.SortOrder}
	 * @private
	 */
	this.sortIndicatorOrder_ = null;

	/**
	 * @type {HTMLElement}
	 * @private
	 */
	this.table_ = null;

	/**
	 * @type {HTMLElement}
	 * @private
	 */
	this.theadRow_ = null;

	/**
	 * Array of column visual details with similar length as source model, with visible columns ordered according to their
	 * display, but possibly interleaved with invisible columns.
	 *
	 * [{modelColumn, visible: true,  width: 125, resizeMode },
	 *  ...
	 *  {modelColumn, visible: false, width: 50,  resizeMode: }]
	 *
	 * @type {Array.<Object{string, number|boolean}>}
	 * @private
	 */
	this.columnDetails_ = [];

	/**
	 * Array of model columns that may be used as indices into the columnDetails_ array. This structure is ordered
	 * according to the visual position of each visible model column.
	 *
	 * The index position indicates its visual position, the value in the array corresponds to the model column, which also
	 * serves as an index into the columnDetails_ array.
	 *
	 * @type {Array.<number>}
	 * @private
	 */
	this.visibleColumns_ = [];

	// --------------------------------------------------------------------------------------------------------------------
	// Initialization
	this.minimumSectionSize_ = ag.ui.HorizontalHeaderView.Defaults.kMinimumSectionSize;
	this.setClickable(true);

	this.setupMachine_();
};
goog.inherits(ag.ui.HorizontalHeaderView, ag.ui.AbstractHeaderView);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;
var classes = goog.dom.classes;
var dom = goog.dom;
var style = goog.style;
var userAgent = goog.userAgent;

var EventType = goog.events.EventType;

var AbstractHeaderView = ag.ui.AbstractHeaderView;
var AbstractState = ag.statemachine.AbstractState;
var ClickingColumnState = ag.ui.HeaderViewMachine.ClickingColumnState;
var Css = ag.ui.AbstractHeaderView.Css;
var HeaderViewMachine = ag.ui.HeaderViewMachine;
var HeaderViewMouseTransition = ag.ui.HeaderViewMachine.HeaderViewMouseTransition;
var HorizontalHeaderView = ag.ui.HorizontalHeaderView;
var ResizeMode = ag.ui.ResizeMode;
var ResizingColumnState = ag.ui.HeaderViewMachine.ResizingColumnState;
var SignalType = ag.ui.AbstractHeaderView.SignalType;
var State = ag.statemachine.State;

var SortOrder = ag.global.SortOrder;
var metaObject = ag.meta.MetaObject.getInstance;

// --------------------------------------------------------------------------------------------------------------------
// Constants
/** @enum {number} */
HorizontalHeaderView.Defaults = {
	kMinimumSectionSize: 20
};


// --------------------------------------------------------------------------------------------------------------------
// Reimplemented public functions
/** @override */
HorizontalHeaderView.prototype.enterDocument = function() {
	goog.base(this, 'enterDocument');

	this.initializeHTMLFromModel_();
	this.machine_.start();
};

/** @override */
HorizontalHeaderView.prototype.exitDocument = function() {
	goog.base(this, 'exitDocument');

	this.machine_.stop();
	this.disposeHtmlColumns_();
};


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
HorizontalHeaderView.prototype.count = function() {
	return this.visibleColumns_.length;
};

/** @override */
HorizontalHeaderView.prototype.offset = function() {
	return this.isInDocument() ? this.getElement().scrollLeft : 0;
};

/** @return {boolean} */
HorizontalHeaderView.prototype.hasHiddenSection = function() {
	return this.hiddenSectionCount() > 0;
};

/** @return {boolean} */
HorizontalHeaderView.prototype.hasMovedSection = function() {
	var lastColumn = -1;
	for (var i=0, z=this.visibleColumns_.length; i<z; i++) {
		var modelColumn = this.visibleColumns_[i];
		if (modelColumn < lastColumn)
			return true;
		lastColumn = modelColumn;
	}

	return false;
};

/** @return {number} */
HorizontalHeaderView.prototype.hiddenSectionCount = function() {
	return this.columnDetails_.length - this.visibleColumns_.length;
};

/**
 * @param {number} modelColumn
 * @return {boolean}
 */
HorizontalHeaderView.prototype.isSectionVisible = function(modelColumn) {
	assert(this.isValidModelColumn(modelColumn));
	return this.mapFromModelColumn(modelColumn) >= 0;
};

/** @return {boolean} */
HorizontalHeaderView.prototype.isSortIndicatorShown = function() {
	return this.sortIndicatorShown_;
};

/**
 * Returns the visual column corresponding to modelColumn or -1 if modelColumn is not visible.
 *
 * @param {number} modelColumn
 * @return {number}
 */
HorizontalHeaderView.prototype.mapFromModelColumn = function(modelColumn) {
	assert(this.isValidModelColumn(modelColumn));
	return this.visibleColumns_.indexOf(modelColumn);
};

/**
 * @param {number} visualColumn
 * @return {number}
 */
HorizontalHeaderView.prototype.mapToModelColumn = function(visualColumn) {
	assert(this.isValidVisualColumn_(visualColumn));
	return this.visibleColumns_[visualColumn];
};

/**
 * @param {number} visualColumn
 * @param {number} toVisualColumn
 */
HorizontalHeaderView.prototype.moveColumn = function(visualColumn, toVisualColumn) {
	assert(this.isValidVisualColumn_(visualColumn));
	assert(this.isValidVisualColumn_(toVisualColumn));
	if (!this.isMovable() || visualColumn === toVisualColumn)
		return;

	assert(this.visibleColumns_.length > 1);

	var modelColumn = this.visibleColumns_[visualColumn];
	// Four action items:
	// 1) Update the visible column structure
	array.removeAt(this.visibleColumns_, visualColumn);
	array.insertAt(this.visibleColumns_, modelColumn, toVisualColumn);

	// 2) Update the columnDetails_ structure
	var detailsIndex = this.detailsIndexForModelColumn_(modelColumn);
	var details = this.columnDetails_[detailsIndex];
	array.removeAt(this.columnDetails_, detailsIndex);

	var insertPoint;
	if (toVisualColumn < visualColumn) {
		// Moving leftward
		var beforeModelIndex = this.visibleColumns_[toVisualColumn+1];
		insertPoint = this.detailsIndexForModelColumn_(beforeModelIndex);
	}
	else { // toVisualColumn > visualColumn
		var afterModelIndex = this.visibleColumns_[toVisualColumn-1];
		insertPoint = this.detailsIndexForModelColumn_(afterModelIndex) + 1;
	}
	array.insertAt(this.columnDetails_, details, insertPoint);

	// 3) Update the HTML
	if (this.isInDocument()) {
		var domHelper = this.getDomHelper();
		var theadRow = this.theadRow_;
		assert(visualColumn < theadRow.childNodes.length);
		var node = domHelper.removeNode(theadRow.childNodes[visualColumn]);
		domHelper.insertChildAt(theadRow, node, toVisualColumn);
	}

	// 4) Emit the section moved signal
	metaObject().emit(this, AbstractHeaderView.SignalType.SECTION_MOVED, visualColumn, toVisualColumn, modelColumn);
};

/** @override */
HorizontalHeaderView.prototype.resizeMode = function(modelColumn) {
	assert(this.isValidModelColumn(modelColumn));

	return this.detailsForModelColumn_(modelColumn).resizeMode;
};

/** @override */
HorizontalHeaderView.prototype.resizeSection = function(modelColumn, newSize) {
	assert(this.isValidModelColumn(modelColumn));
	if (this.resizeMode(modelColumn) === ResizeMode.kFixed)
		return;

	this.resizeSectionInternal_(modelColumn, Math.max(this.minimumSectionSize_, newSize));
};

/** @override */
HorizontalHeaderView.prototype.sectionSize = function(modelColumn) {
	assert(this.isValidModelColumn(modelColumn));
	return this.detailsForModelColumn_(modelColumn).width;
};

/** @override */
HorizontalHeaderView.prototype.setOffset = function(newOffset) {
	if (!this.isInDocument())
		return;

	assert(newOffset >= 0);

	var oldOffset = this.offset();
	this.getElement().scrollLeft = newOffset;
	if (this.offset() != oldOffset) {
	//  ^^^^^^^^^^^^^ Recalculate the offset from the HTML in
	//  case newOffset is beyond the maximum possible scroll value.
		metaObject().emit(this, SignalType.OFFSET_CHANGED, this.offset(), oldOffset);
	}
};

/** @override */
HorizontalHeaderView.prototype.setResizeMode = function(modelColumn, mode) {
	assert(this.isValidModelColumn(modelColumn));
	this.detailsForModelColumn_(modelColumn).resizeMode = mode;
};

/**
 * Responsible for checking that the visible status for a modelColumn is different, calling the appropriate
 * show/hide method, and emitting the relevant signal.
 *
 * @param {number} modelColumn
 * @param {boolean} newVisible
 */
HorizontalHeaderView.prototype.setSectionVisible = function(modelColumn, newVisible) {
	assert(this.isValidModelColumn(modelColumn));
	if (this.isSectionVisible(modelColumn) === newVisible)
		return;

	this.detailsForModelColumn_(modelColumn).visible = newVisible;
	var visualColumn = newVisible ? this.showModelColumn_(modelColumn)
								  : this.hideModelColumn_(modelColumn);
	if (this.isInDocument())
		this.updateHeaderWidth(); // Because the header has either grown or shrunk, sync change with the total header width
	metaObject().emit(this, SignalType.SECTION_VISIBLE_CHANGED, visualColumn, modelColumn, newVisible);
};

/**
 * @param {number} modelColumn
 * @param {SortOrder} sortOrder
 */
HorizontalHeaderView.prototype.setSortIndicator = function(modelColumn, sortOrder) {
	assert(this.isValidModelColumn(modelColumn));

	this.sortIndicatorSection_ = modelColumn;
	this.sortIndicatorOrder_ = sortOrder;
	this.updateSortIndicator_();
};

/**
 * @param {boolean} show
 */
HorizontalHeaderView.prototype.setSortIndicatorShown = function(show) {
	if (this.sortIndicatorShown_ === show)
		return;

	this.sortIndicatorShown_ = show;
	this.updateSortIndicator_();
};

/** @return {SortOrder} */
HorizontalHeaderView.prototype.sortIndicatorOrder = function() {
	return this.sortIndicatorOrder_;
};

/** @return {number} */
HorizontalHeaderView.prototype.sortIndicatorSection = function() {
	return this.sortIndicatorSection_;
};

/**
 * Only returns the total width of visible columns.
 *
 * @return {number}
 */
HorizontalHeaderView.prototype.totalWidthOfColumns = function() {
	var sum = 0;
	for (var i=0, z=this.columnDetails_.length; i<z; i++) {
		var column = this.columnDetails_[i];
		if (column.visible)
			sum += column.width;
	}
	return sum;
};

/**
 * Recalculates the width of the table element based on the total widths of all the columns. Necessary
 * for proper scrolling.
 */
HorizontalHeaderView.prototype.updateHeaderWidth = function() {
	assert(this.table_);
	this.table_.style.width = this.totalWidthOfColumns() + 'px';
};


// --------------------------------------------------------------------------------------------------------------------
// Reimplemented protected methods
/** @override */
HorizontalHeaderView.prototype.decorateInternal = function(element) {
	goog.base(this, 'decorateInternal', element);
	var domHelper = this.getDomHelper();

	classes.add(element, Css.Horizontal);

	var frag = document.createDocumentFragment();
	var tr = domHelper.createDom('tr', Css.Row);
	var head = domHelper.createDom('thead', Css.Head, tr);
	var table = domHelper.createDom('table', Css.Table, head);
	frag.appendChild(table);
	element.appendChild(frag);

	this.table_= table;
	this.theadRow_ = tr;

	// Prevent selection events from occurring on the header view (which otherwise would confuse
	// the UI when performing resize events).
	style.setUnselectable(tr, true);

	return element;
};

/** @override */
HorizontalHeaderView.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	delete this.theadRow_;
	delete this.table_;

	metaObject().disconnect(this.clickingColumnState_, ClickingColumnState.SignalType.COLUMN_CHANGED, this, this.onClickingColumnChanged_);
	metaObject().disconnect(this.clickingColumnState_, AbstractState.SignalType.EXITED, this, this.onClickingColumnStateExit_);

	metaObject().disconnect(this.resizeReadyState_, AbstractState.SignalType.ENTERED, this, this.onResizeReadyStateEnter_);
	metaObject().disconnect(this.idleState_, AbstractState.SignalType.ENTERED, this, this.onIdleStateEnter_);

	delete this.clickingColumnState_;
	delete this.resizeReadyState_;
	delete this.idleState_;
	delete this.machine_;
};

/** @override */
HorizontalHeaderView.prototype.minimumSectionSizeChanged = function(newMinimumSize, oldSize) {
	var columns = this.columnDetails_;
	for (var i=0, z=columns.length; i<z; i++)
		if (columns[i].width < newMinimumSize)
			this.resizeSectionInternal_(i, newMinimumSize);
};

/** @override */
HorizontalHeaderView.prototype.modelChanged = function(newModel, oldModel) {
	array.clear(this.columnDetails_);
	array.clear(this.visibleColumns_);

	if (newModel) {
		// Reset the resize modes for all columns and set column widths to indicate that it should be
		// determined next time the header data is initialized.
		for (var i=0, z=newModel.columnCount(); i<z; i++) {
			var details = {
				modelColumn: i,
				resizeMode: ResizeMode.kInteractive,
				width: 0,
				visible: true
			};
			this.columnDetails_.push(details);
			this.visibleColumns_.push(i);
		}
	}

	if (!this.isInDocument())
		return;

	this.disposeHtmlColumns_();
	if (!newModel)
		return;

	this.initializeHTMLFromModel_();

	this.machine_.restart();
};


// --------------------------------------------------------------------------------------------------------------------
// Private functions
/**
 * @param {number} section
 * @param {string} className
 * @private
 */
HorizontalHeaderView.prototype.addCssClassToSection_ = function(section, className) {
	var th = this.thForSection_(section);
	classes.add(th, className);
};

/**
 * @param {goog.events.BrowserEvent} event
 * @private
 */
HorizontalHeaderView.prototype.addUserDataToEvent_ = function(event) {
	// Give precedence to resizing columns
	var resizeColumn = this.columnToResizeFromEvent_(event);
	var userData = {
		'mouseOverHandle': resizeColumn !== -1
	};
	userData['column'] = (userData['mouseOverHandle']) ? resizeColumn : this.columnFromEvent_(event);
	event['userData'] = userData;
};

/** @private */
HorizontalHeaderView.prototype.attachEventListeners_ = function() {
	if (!this.isInDocument())
		return;

	var handler = this.getHandler();
	handler.listen(this.theadRow_, EventType.MOUSEDOWN, this.onMouseDown_)
		   .listen(this.dom_.getWindow(), EventType.MOUSEMOVE, this.onWindowMouseMove_, true)
		   .listen(this.theadRow_, EventType.MOUSEOUT, this.onMouseOut_);
};

/**
 * @param {goog.events.BrowserEvent} event
 * @return {number}
 * @private
 */
HorizontalHeaderView.prototype.columnFromEvent_ = function(event) {
	var pos = style.getRelativePosition(event, this.theadRow_);
	if (!this.eventYWithinVerticalSpace_(pos.y))
		return -1;

	var details = this.columnDetails_;
	var xPos = pos.x;
	var rightSide = 0;
	for (var i=0, z=this.visibleColumns_.length; i<z; i++) {
		var modelColumn = this.visibleColumns_[i];
		rightSide += details[modelColumn].width;
		if (xPos <= rightSide)
			return i;
	}
	return -1;
};

/**
 * @param {goog.events.BrowserEvent} event
 * @return {number}
 * @private
 */
HorizontalHeaderView.prototype.columnToResizeFromEvent_ = function(event) {
	assert(this.isInDocument());

	var pos = style.getRelativePosition(event, this.theadRow_);
	if (!this.eventYWithinVerticalSpace_(pos.y))
		return -1;

	return this.columnToResizeFromXPos_(pos.x);
};

/**
 * @return {number}
 * @private
 */
HorizontalHeaderView.prototype.columnToResizeFromXPos_ = function(xPos) {
	var columnCenter = 0;
	for (var i=0, z=this.visibleColumns_.length; i<z; i++) {
		var modelColumn = this.visibleColumns_[i];
		var details = this.detailsForModelColumn_(modelColumn);
		columnCenter += details.width;
		var left = columnCenter - AbstractHeaderView.Constants.kHalfResizeHandleWidth;
		var right = columnCenter + AbstractHeaderView.Constants.kHalfResizeHandleWidth;
		if (xPos >= left && xPos <= right)
			return modelColumn;
	}
	return -1;
};

/**
 * @param {number} modelColumn
 * @return {Element}
 */
HorizontalHeaderView.prototype.createThForModelColumn_ = function(modelColumn) {
	var th = this.getDomHelper().createDom('th', [Css.Cell, 'modelColumn-' + modelColumn]);
	th.innerHTML = this.model_.headerData(modelColumn);
	return th;
};

/** @private */
HorizontalHeaderView.prototype.detachEventListeners_ = function() {
	if (!this.isInDocument())
		return;

	var handler = this.getHandler();
	handler.unlisten(this.theadRow_, EventType.MOUSEDOWN, this.onMouseDown_)
		   .unlisten(this.dom_.getWindow(), EventType.MOUSEMOVE, this.onWindowMouseMove_, true)
		   .unlisten(this.theadRow_, EventType.MOUSEOUT, this.onMouseOut_);
};

/**
 * @param {number} modelColumn
 * @return {Object.<string,number|boolean>}
 * @private
 */
HorizontalHeaderView.prototype.detailsForModelColumn_ = function(modelColumn) {
	return this.columnDetails_[this.detailsIndexForModelColumn_(modelColumn)];
};

/**
 * Returns the index within the columnDetails_ structure that corresponds to modelColumn.
 *
 * @param {number} modelColumn
 * @return {number}
 * @private
 */
HorizontalHeaderView.prototype.detailsIndexForModelColumn_ = function(modelColumn) {
	assert(this.isValidModelColumn(modelColumn));
	var columnDetails = this.columnDetails_;
	for (var i=0, z=columnDetails.length; i<z; i++) {
		var x = columnDetails[i];
		if (x.modelColumn === modelColumn)
			return i;
	}
	assert(false, 'Impossible condition');
};

/** @private */
HorizontalHeaderView.prototype.disposeHtmlColumns_ = function() {
	this.detachEventListeners_();

	if (this.theadRow_)
		this.dom_.removeChildren(this.theadRow_);
};

/**
 * @param {number} yPos should be relative to theadRow_.
 * @return {number}
 * @private
 */
HorizontalHeaderView.prototype.eventYWithinVerticalSpace_ = function(yPos) {
	return yPos >= 0 && yPos < style.getSize(this.theadRow_).height;
};

/**
 * @param {number} modelColumn
 * @return {number} The visual column hidden by this function.
 * @private
 */
HorizontalHeaderView.prototype.hideModelColumn_ = function(modelColumn) {
	var visualColumn = this.mapFromModelColumn(modelColumn);
	assert(visualColumn >= 0);

	if (this.isInDocument()) {
		var theadRow = this.theadRow_;
		assert(visualColumn < theadRow.childNodes.length);
		this.getDomHelper().removeNode(theadRow.childNodes[visualColumn]);
	}

	array.removeAt(this.visibleColumns_, visualColumn);

	return visualColumn;
};

/** @private */
HorizontalHeaderView.prototype.initializeHTMLFromModel_ = function() {
	if (!this.model_)
		return;

	this.initializeHTMLTableHeaders_();
	this.storeStyledColumnWidths_();
	this.updateHeaderWidth();
	this.setColumnsToStoredWidths_();
	this.attachEventListeners_();
};

/**
 * Builds the HTML table header data from the current model.
 *
 * @private
 */
HorizontalHeaderView.prototype.initializeHTMLTableHeaders_ = function() {
	var frag = document.createDocumentFragment();
	for (var i=0, z=this.visibleColumns_.length; i<z; i++) {
		var modelColumn = this.visibleColumns_[i];
		var th = this.createThForModelColumn_(modelColumn);
		frag.appendChild(th);
	}

	this.theadRow_.appendChild(frag);
};

/**
 * @param {number} visualColumn
 * @return {boolean}
 * @private
 */
HorizontalHeaderView.prototype.isValidVisualColumn_ = function(visualColumn) {
	return visualColumn >= 0 && visualColumn < this.visibleColumns_.length;
};

/**
 * @param {goog.events.BrowserEvent} mouseEvent
 * @private
 */
HorizontalHeaderView.prototype.onMouseDown_ = function(mouseEvent) {
	var handler = this.getHandler();
	handler.listenOnce(this.dom_.getWindow(), EventType.MOUSEUP, this.onWindowMouseUp_);
	// TODO: It's possible that this event could be listened to multiple times if the
	//       user clicks down on the header and then mouses up outside the browser window.
	// Possible fix: set a timeout that removes the event handler after X number of seconds.

	this.addUserDataToEvent_(mouseEvent);
	this.machine_.postEvent(mouseEvent);
};

/**
 * @param {goog.events.BrowserEvent} mouseEvent
 * @private
 */
HorizontalHeaderView.prototype.onMouseOut_ = function(mouseEvent) {
	// Transform this event into a mouseleave event only.
	var isMouseWithinHeader = !!mouseEvent.relatedTarget && dom.contains(this.table_, mouseEvent.relatedTarget);
	if (!isMouseWithinHeader) {
		this.addUserDataToEvent_(mouseEvent);
		this.machine_.postEvent(mouseEvent);
	}
};

/**
 * @param {goog.events.BrowseEvent} mouseEvent
 * @private
 */
HorizontalHeaderView.prototype.onWindowMouseMove_ = function(mouseEvent) {
	this.addUserDataToEvent_(mouseEvent);
	this.machine_.postEvent(mouseEvent);
};

/**
 * @param {goog.events.BrowseEvent} mouseEvent
 * @private
 */
HorizontalHeaderView.prototype.onWindowMouseUp_ = function(mouseEvent) {
	this.addUserDataToEvent_(mouseEvent);
	this.machine_.postEvent(mouseEvent);
};

/**
 * @param {number} section
 * @param {string} className
 * @private
 */
HorizontalHeaderView.prototype.removeCssClassFromSection_ = function(section, className) {
	var th = this.thForSection_(section);
	classes.remove(th, className);
};

/**
 * @param {number} modelColumn
 * @param {number} newWidth
 * @private
 */
HorizontalHeaderView.prototype.resizeSectionInternal_ = function(modelColumn, newWidth) {
	assert(this.isValidModelColumn(modelColumn));
	assert(newWidth >= 0);

	var visualColumnDetails = this.detailsForModelColumn_(modelColumn);
	var oldWidth = visualColumnDetails.width;
	if (newWidth === oldWidth)
		return;

	visualColumnDetails.width = newWidth;
	if (visualColumnDetails.visible && this.isInDocument()) {
		var theadRow = this.theadRow_;
		var visualColumn = this.mapFromModelColumn(modelColumn);
		assert(visualColumn >= 0 && visualColumn < theadRow.cells.length);
		var cell = theadRow.cells[visualColumn];
		cell.style.width = newWidth + 'px';
		this.updateHeaderWidth();
		metaObject().emit(this, SignalType.SECTION_RESIZED, visualColumn, newWidth, oldWidth);
	}
};

/**
 * Sets the pixel width of all columns to that which was stored.
 *
 * @private
 */
HorizontalHeaderView.prototype.setColumnsToStoredWidths_ = function() {
	var theadRow = this.theadRow_;
	assert(theadRow);
	var details = this.columnDetails_;
	var columnNodes = theadRow.childNodes;
	for (var i=0, z=columnNodes.length; i<z; i++) {
		var modelColumn = this.mapToModelColumn(i);
		columnNodes[i].style.width = details[modelColumn].width + 'px';
	}
};

/**
 * @param {number} modelColumn
 * @return {number} The visual column shown by this function.
 * @private
 */
HorizontalHeaderView.prototype.showModelColumn_ = function(modelColumn) {
	// Find where the column will be displayed
	var visualColumn = 0;
	var columnDetails = this.columnDetails_;
	var details;
	for (var i=0, z=columnDetails.length; i<z; i++) {
		details = columnDetails[i];
		if (details.modelColumn === modelColumn)
			break;
		if (details.visible)
			visualColumn++;
	}

	var newTh = this.createThForModelColumn_(modelColumn);

	// A couple scenarios may occur;
	// 1) The column has been hidden before and is now being shown. In this case, any CSS-defined width property
	//    will have already been read and stored in details.width.
	//    --> Simply restore this width to the newTh
	//
	// 2) The column was hidden before any rendering. Details.width will equal 0 (its default value). It is necessary
	//    to first let the browser render it and apply any CSS rules. Afterwards, it is necessary to store its width.
	var hasBeenRendered = details.width !== 0;

	// Redefine the width from whatever it was before it was hidden or at the very least the minimum size.
	if (hasBeenRendered)
		newTh.style.width = details.width + 'px';
	this.getDomHelper().insertChildAt(this.theadRow_, newTh, visualColumn);
	if (!hasBeenRendered)
		details.width = style.getSize(newTh).width;

	array.insertAt(this.visibleColumns_, modelColumn, visualColumn);

	return visualColumn;
};

/**
 * Captures the browser or user styled column widths in pixels for later use.
 *
 * @private
 */
HorizontalHeaderView.prototype.storeStyledColumnWidths_ = function() {
	var details = this.columnDetails_;
	var columnNodes = this.theadRow_.childNodes;
	var nCols = this.visibleColumns_.length;
	for (var i=0; i<nCols; i++) {
		var modelColumn = this.visibleColumns_[i];
		var visualDetails = this.detailsForModelColumn_(modelColumn);
		if (visualDetails.width === 0) {
			visualDetails.width = Math.max(this.minimumSectionSize_, style.getSize(columnNodes[i]).width);

			// HACK! Take one away from the very last column so that a scrollbar will not appear unnecessarily in
			// IE and FF.
			if (i === nCols-1 && (userAgent.GECKO || userAgent.IE))
			 	visualDetails.width--;
		}
	}
};

/**
 * Returns the th element for the given section (visual column space, not model based).
 *
 * @param {number} visualColumn
 * @return {HTMLElement}
 * @private
 */
HorizontalHeaderView.prototype.thForSection_ = function(visualColumn) {
	assert(visualColumn >= 0 && visualColumn < this.theadRow_.childNodes.length);
	return this.theadRow_.childNodes[visualColumn];
};

/**
 * @private
 */
HorizontalHeaderView.prototype.updateSortIndicator_ = function() {
	// Extract previous sort order from the HTML
	var oldSortIndicatorSection = -1;
	var oldSortIndicatorOrder = null;
	var oldSortThNode = null;

	for (var i=0, z=this.count(); i<z; i++) {
		var th = this.theadRow_.childNodes[i];
		var hasSortAsc = classes.has(th, AbstractHeaderView.Css.SortAsc);
		var hasSortDesc = classes.has(th, AbstractHeaderView.Css.SortDesc);
		if (hasSortAsc || hasSortDesc) {
			oldSortIndicatorOrder = (hasSortAsc) ? SortOrder.kAsc : SortOrder.kDesc;
			oldSortIndicatorSection = this.mapToModelColumn(i);
			oldSortThNode = th;
			break;
		}
	}

	var validSortState = this.sortIndicatorShown_ &&
		!goog.isNull(this.sortIndicatorOrder_) &&
		this.sortIndicatorOrder_ !== -1;
	var validAndDifferent = validSortState &&
		(this.sortIndicatorOrder_ !== oldSortIndicatorOrder ||
		 this.sortIndicatorSection_ !== oldSortIndicatorSection);

	if ((validAndDifferent || !validSortState) && oldSortThNode) {
		var visualColumn = this.mapFromModelColumn(oldSortIndicatorSection);
		if (visualColumn !== -1) {
			// Remove all CSS classes relating to the sort status
			var th = this.thForSection_(visualColumn);
			var className = (oldSortIndicatorOrder === SortOrder.kAsc) ? AbstractHeaderView.Css.SortAsc : AbstractHeaderView.Css.SortDesc;
			classes.remove(th, className);
		}
	}

	if (validAndDifferent) {
		var visualColumn = this.mapFromModelColumn(this.sortIndicatorSection_);
		if (visualColumn === -1)
			return;

		var th = this.thForSection_(visualColumn);
		var className = (this.sortIndicatorOrder_ === SortOrder.kAsc) ? AbstractHeaderView.Css.SortAsc : AbstractHeaderView.Css.SortDesc;
		classes.add(th, className);
	}
};


// --------------------------------------------------------------------------------------------------------------------
// Private machine functions
/** @private */
HorizontalHeaderView.prototype.onIdleStateEnter_ = function() {
	classes.remove(this.table_, Css.ResizeHover);
};

/** @private */
HorizontalHeaderView.prototype.onResizeReadyStateEnter_ = function() {
	classes.add(this.table_, Css.ResizeHover);
};

/**
 * @param {number} currentColumn in visual space
 * @param {number} originalColumn in visual space
 * @private
 */
HorizontalHeaderView.prototype.onClickingColumnChanged_ = function(currentColumn, originalColumn) {
	if (currentColumn !== -1)
		this.addCssClassToSection_(currentColumn, AbstractHeaderView.Css.SectionActive);
	else if (originalColumn !== -1)
		this.removeCssClassFromSection_(originalColumn, AbstractHeaderView.Css.SectionActive);
};

/** @private */
HorizontalHeaderView.prototype.onClickingColumnStateExit_ = function() {
	var column = this.clickingColumnState_.column();
	if (column === -1)
		return;

	this.removeCssClassFromSection_(column, AbstractHeaderView.Css.SectionActive);
	metaObject().emit(this, SignalType.SECTION_CLICKED, column);
};

/** @private */
HorizontalHeaderView.prototype.setupMachine_ = function() {
	var idle = new State('Idle');
	this.idleState_ = idle;
	var clickingColumn = new ClickingColumnState('Clicking');
	this.clickingColumnState_ = clickingColumn;
	var resizeReady = new State('Resize ready');
	this.resizeReadyState_ = resizeReady;
	var resizing = new ResizingColumnState('Resizing');

	this.machine_ = new HeaderViewMachine(this);
	this.machine_.addState(idle);
	this.machine_.addState(clickingColumn);
	this.machine_.addState(resizeReady);
	this.machine_.addState(resizing);
	this.machine_.setInitialState(idle);

	var t = new HeaderViewMouseTransition(EventType.MOUSEDOWN,  /* optMouseOverHandle */ false);
	t.setTargetState(clickingColumn);
	idle.addTransition(t);

	t = new HeaderViewMouseTransition(EventType.MOUSEUP);
	t.setTargetState(idle);
	clickingColumn.addTransition(t);

	t = new HeaderViewMouseTransition(EventType.MOUSEOUT);
	//                                          ^^^^^^^^ Because of the way we regulate posting of
	// events to the machine in the onMouseOut method, in reality this is a mouseleave event. Unfortunately,
	// Closure does not have native support for this event type.
	t.setTargetState(idle);
	clickingColumn.addTransition(t);

	t = new HeaderViewMouseTransition(EventType.MOUSEMOVE, /* optMouseOverHandle */ true);
	t.setTargetState(resizeReady);
	idle.addTransition(t);

	t = new HeaderViewMouseTransition(EventType.MOUSEMOVE, /* optMouseOverHandle */ false);
	t.setTargetState(idle);
	resizeReady.addTransition(t);

	t = new HeaderViewMouseTransition(EventType.MOUSEDOWN);
	t.setTargetState(resizing);
	resizeReady.addTransition(t);

	t = new HeaderViewMouseTransition(EventType.MOUSEUP, /* optMouseOverHandle */ true);
	t.setTargetState(resizeReady);
	resizing.addTransition(t);

	t = new HeaderViewMouseTransition(EventType.MOUSEUP, /* optMouseOverHandle */ false);
	t.setTargetState(resizeReady);
	resizing.addTransition(t);

	// Update the CSS status relative to the states
	metaObject().connect(clickingColumn, ClickingColumnState.SignalType.COLUMN_CHANGED, this, this.onClickingColumnChanged_);
	metaObject().connect(clickingColumn, AbstractState.SignalType.EXITED, this, this.onClickingColumnStateExit_);

	metaObject().connect(resizeReady, AbstractState.SignalType.ENTERED, this, this.onResizeReadyStateEnter_);
	metaObject().connect(idle, AbstractState.SignalType.ENTERED, this, this.onIdleStateEnter_);
};


/*******************************************************************************************************************/});
