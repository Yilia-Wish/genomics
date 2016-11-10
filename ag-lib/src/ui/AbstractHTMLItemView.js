/**
 * @fileoverview AbstractHTMLItemView abstracts numerous boilerplate functionalities for easing the production of
 *   model-aware views.
 *
 *   The only required function to implement is createHTMLForModelRow, which must return the requisite HTML for the
 *   given row; however, much more functionality may be fine-tuned by overriding the following methods:
 *     - elementForIndex
 *     - clicked
 *     - model handlers: currentChanged, dataChanged, rowsInserted, rowsRemoved
 *     - selection handlers: selectionChanged, selectionLayoutAboutToBeChanged, selectionLayoutChanged, selectionModelChanged
 *
 *   Implementing these functions will provide additional capabilities:
 *     - indexFromEvent (can automatically handle adjusting the selection)
 *
 *   By default, responding to model and selection model changes is already implemented as well as encapsulating the
 *   extraction of cross-platform ctrl and shift keys during clicking.
 *
 *   The structure of child views should consist of a single container element and then the data for each row beneath
 *   this core element must be contained within a single element; otherwise, the default behavior is undefined. A
 *   typical structure will look like the following:
 *
 *   container element (e.g. div or table)
 *     row element (e.g. div or tr)
 *       cell element 1
 *       cell element 2
 *       ...
 *     row element (e.g. div or tr)
 *       cell element 1
 *       cell element 2
 *       ...
 *     ...
 *
 *   On the other hand, the following structure will cause problems:
 *
 *   container element
 *     cell element 1 (of row 1)
 *     cell element 2 (of row 1)
 *     ...
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */

goog.provide('ag.ui.AbstractHTMLItemView');

goog.require('goog.asserts');
goog.require('goog.dom.classes');
goog.require('goog.events');

goog.require('ag.model.AbstractItemModel');
goog.require('ag.ui.AbstractItemView');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {ag.ui.AbstractItemView}
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
ag.ui.AbstractHTMLItemView = function(optDomHelper) {
    goog.base(this, optDomHelper);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {ag.model.PersistentModelIndex}
     * @private
     */
    this.anchorIndex_ = new ag.model.PersistentModelIndex();
};
goog.inherits(ag.ui.AbstractHTMLItemView, ag.ui.AbstractItemView);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var classes = goog.dom.classes;
var events = goog.events;
var TagName = goog.dom.TagName;

var AbstractItemView = ag.ui.AbstractItemView;
var AbstractHTMLItemView = ag.ui.AbstractHTMLItemView;
var ItemSelection = ag.model.ItemSelection;
var ItemSelectionModel = ag.model.ItemSelectionModel;
var ModelIndex = ag.model.ModelIndex;
var ModelSignal = ag.model.AbstractItemModel.SignalType;
var PersistentModelIndex = ag.model.PersistentModelIndex;
var SelectionBehavior = AbstractItemView.SelectionBehavior;
var SelectionFlag = ag.model.ModelConstants.SelectionFlag;
var SelectionMode = AbstractItemView.SelectionMode;

var metaObject = ag.meta.MetaObject.getInstance;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * This base class implementation returns the childnode corresponding to the row of rootElement.
 *
 * @param {ag.model.ModelIndex} index
 * @return {Element}
 */
AbstractHTMLItemView.prototype.elementForIndex = function(index) {
    if (!index.isValid())
        return null;

    return this.elementForRowColumn(index.row(), index.column());
};

/** @override */
AbstractHTMLItemView.prototype.enterDocument = function() {
    goog.base(this, 'enterDocument');

    var h = this.getHandler();
    h.listen(this.rootElement(), events.EventType.CLICK, this.onClick_, true /* capture */);
    h.listen(this.rootElement(), events.EventType.KEYDOWN, this.onKeyDown_);

    if (this.model_) {
        this.createAllHTMLContent();
        this.watchModel_(this.model_);
    }
};

/** @override */
AbstractHTMLItemView.prototype.exitDocument = function() {
    goog.base(this, 'exitDocument');

    var h = this.getHandler();
    h.unlisten(this.getElement(), events.EventType.CLICK, this.onClick_, true /* capture */);
    h.unlisten(this.rootElement(), events.EventType.KEYDOWN, this.onKeyDown_);

    if (this.model_) {
        this.unwatchModel_(this.model_);
        this.clearHTMLContent();
    }
};

/**
 * This base class implementation returns the childnode corresponding to the row of rootElement.
 *
 * @param {number} row
 * @param {number} column
 * @return {Element}
 */
AbstractHTMLItemView.prototype.elementForRowColumn = function(row, column) {
    return this.rootElement().childNodes[row];
};

/**
 * The root element beneath which all important content resides. By default this returns getElement(); however, in some
 * cases (e.g. TableView), this may not be correct. Subclasses with such special needs should override this element and
 * return the proper element.
 *
 * @return {Element}
 */
AbstractHTMLItemView.prototype.rootElement = function() {
    return this.getElement();
};

/**
 * Selects all elements within the view
 */
AbstractHTMLItemView.prototype.selectAll = function() {
    if (!this.isInDocument() || !this.model_)
        return;

    var all = this.selectionModel().entireSelectionSpace();
    this.selectionModel().selectSelection(all, SelectionFlag.Select);
};


// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/**
 * @protected
 */
AbstractHTMLItemView.prototype.clearHTMLContent = function() {
    this.getDomHelper().removeChildren(this.rootElement());
};

/**
 * @param {events.Event} event
 * @param {AbstractItemView.ModifierKeys} modKeys
 * @protected
 */
AbstractHTMLItemView.prototype.clicked = function(event, modKeys) {
    var index = this.indexFromEvent(event);
    if (!index.isValid())
        return;

    this.adjustSelectionTo_(index, modKeys);
};

/**
 * @param {number} row
 * @return {Element}
 * @protected
 */
AbstractHTMLItemView.prototype.createHTMLForModelRow = goog.abstractMethod;

/** @protected */
AbstractHTMLItemView.prototype.createAllHTMLContent = function() {
    var model = this.model_;
    if (!this.model_)
        return;

    var nRows = model.rowCount();
    if (nRows === 0)
        return;

    var fragment = this.createHTMLFragmentForModelRows(0, nRows-1);
    this.rootElement().appendChild(fragment);
};

/**
 * @param {number} startRow
 * @param {number} endRow
 * @return {DocumentFragment}
 * @protected
 */
AbstractHTMLItemView.prototype.createHTMLFragmentForModelRows = function(startRow, endRow) {
    var fragment = document.createDocumentFragment();
    for (var i=startRow; i<=endRow; i++) {
        var rowHtml = this.createHTMLForModelRow(i);
        fragment.appendChild(rowHtml);
    };
    return fragment;
};

/**
 * @param {ModelIndex} newCurrentIndex
 * @param {ModelIndex} previousIndex
 * @protected
 */
AbstractHTMLItemView.prototype.currentChanged = function(newCurrentIndex, previousIndex) {
    var cssClass = AbstractItemView.Css.Current;
    this.removeCssClassForIndex_(previousIndex, cssClass);
    this.addCssClassForIndex_(newCurrentIndex, cssClass);
};

/**
 * Virtual stub for handling data changes.
 *
 * @param {ModelIndex} index
 * @protected
 */
AbstractHTMLItemView.prototype.dataChanged = function(index) {};

/** @override */
AbstractHTMLItemView.prototype.decorateInternal = function(element) {
    goog.base(this, 'decorateInternal', element);

    // Enable keyboard focus - so we can receive events
    element.tabIndex = 0;
};

/** @override */
AbstractHTMLItemView.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    this.anchorIndex_.invalidate();
    this.anchorIndex_ = null;
};

/**
 * @param {events.Event} event
 * @return {ModelIndex}
 * @protected
 */
AbstractHTMLItemView.prototype.indexFromEvent = function(event) {
    return new ModelIndex();
};

/**
 * @param {events.BrowserEvent} keyEvent
 * @param {AbstractItemView.ModifierKeys} modKeys
 * @protected
 */
AbstractHTMLItemView.prototype.keyDown = function(keyEvent, modKeys) {};

/** @override */
AbstractHTMLItemView.prototype.modelChanged = function(newModel, oldModel) {
    if (!this.isInDocument())
        return;

    this.unwatchModel_(oldModel);
    this.clearHTMLContent();
    if (!newModel)
        return;

    this.createAllHTMLContent();
    this.watchModel_(newModel);
};

/** @protected */
AbstractHTMLItemView.prototype.modelReset = function() {
    if (!this.isInDocument())
        return;

    this.clearHTMLContent();
    this.createAllHTMLContent();
};

/**
 * @param {number} startRow
 * @param {number} endRow
 * @protected
 */
AbstractHTMLItemView.prototype.rowsInserted = function(startRow, endRow) {
    assert(this.model_);
    assert(this.model_.isValidRow(startRow));
    assert(this.model_.isValidRow(endRow));
    assert(startRow <= endRow);

    var fragment = this.createHTMLFragmentForModelRows(startRow, endRow);
    this.getDomHelper().insertChildAt(this.rootElement(), fragment, startRow);
};

/**
 * @param {number} startRow
 * @param {number} endRow
 * @protected
 */
AbstractHTMLItemView.prototype.rowsRemoved = function(startRow, endRow) {
    assert(this.model_);
    assert(startRow <= endRow);

    var domHelper = this.getDomHelper();
    var root = this.rootElement();
    for (var i=startRow; i<= endRow; i++)
        domHelper.removeNode(root.childNodes[startRow]);
};

/**
 * @param {ItemSelection} selected
 * @param {ItemSelection} deselected
 * @protected
 */
AbstractHTMLItemView.prototype.selectionChanged = function(selected, deselected) {
    this.removeCssSelectionClass_(deselected);
    this.addCssSelectionClass_(selected);
};

/** @protected */
AbstractHTMLItemView.prototype.selectionLayoutAboutToBeChanged = function() {
    var selModel = this.selectionModel();
    this.removeCssSelectionClass_(selModel.selection());
    this.removeCssClassForIndex_(selModel.currentIndex(), AbstractItemView.Css.Current);
};

/** @protected */
AbstractHTMLItemView.prototype.selectionLayoutChanged = function() {
    var selModel = this.selectionModel();
    this.addCssSelectionClass_(selModel.selection());
    this.addCssClassForIndex_(selModel.currentIndex(), AbstractItemView.Css.Current);
};

/** @override */
AbstractHTMLItemView.prototype.selectionModelChanged = function(newSelectionModel, oldSelectionModel) {
    var newSelection = newSelectionModel.selection();
    var oldSelection = oldSelectionModel.selection();
    var toDeselect = oldSelection.difference(newSelection);
    var toSelect = newSelection.difference(oldSelection);
    this.removeCssSelectionClass_(toDeselect);
    this.addCssSelectionClass_(toSelect);

    this.unwatchSelectionModel_(oldSelectionModel);
    this.watchSelectionModel_(newSelectionModel);

    this.currentChanged(newSelectionModel.currentIndex(), oldSelectionModel.currentIndex());
};


// --------------------------------------------------------------------------------------------------------------------
// Private events
/**
 * @param {events.BrowserEvent} clickEvent
 * @private
 */
AbstractHTMLItemView.prototype.onClick_ = function(clickEvent) {
    var modKeys = AbstractItemView.extractModifiers(clickEvent);
    this.clicked(clickEvent, modKeys);
};

/**
 * @param {goog.events.KeyEvent} keyEvent
 * @private
 */
AbstractHTMLItemView.prototype.onKeyDown_ = function(keyEvent) {
    var modKeys = AbstractItemView.extractModifiers(keyEvent);
    this.keyDown(keyEvent, modKeys);
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
AbstractHTMLItemView.prototype.addCssClassForIndex_ = function(index, className) {
    var el = this.elementForIndex(index);
    if (el)
        classes.add(el, className);
};

/**
 * Adds the appropraite selection css class to all cells represented by itemSelection.
 *
 * @param {ItemSelection} itemSelection
 * @private
 */
AbstractHTMLItemView.prototype.addCssSelectionClass_ = function(itemSelection) {
    var selectedRanges = itemSelection.ranges();
    for (var i=0, z=selectedRanges.length; i<z; i++) {
        var range = selectedRanges[i];
        var left = range.left();
        var right = range.right();
        for (var j=range.top(), y=range.bottom(); j<=y; j++) {
            var row = j;
            for (var k=left; k<=right; k++) {
                var column = k;
                var targetElement = this.elementForRowColumn(row, column);
                if (targetElement)
                    classes.add(targetElement, AbstractItemView.Css.Selected);
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
AbstractHTMLItemView.prototype.adjustSelectionTo_ = function(targetIndex, optModifierKeys) {
    if (!targetIndex.isValid())
        return;

    assert(targetIndex.model() === this.model_, 'AbstractHTMLItemView.adjustSelectionTo_: incompatible model for index');

    var xOsCtrlPressed = false;
    var shiftPressed = false;
    if (optModifierKeys) {
        xOsCtrlPressed = (optModifierKeys & AbstractItemView.ModifierKeys.Ctrl) != 0;
        shiftPressed = (optModifierKeys & AbstractItemView.ModifierKeys.Shift) != 0;
    }

    var selModel = this.selectionModel();
    var behaviorFlags = this.selectionFlagsFromBehavior_();
    var flags = /** @type SelectionFlag */ (SelectionFlag.ClearAndSelect | behaviorFlags);
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
            selModel.selectIndex(targetIndex, /** @type {SelectionFlag} */ (SelectionFlag.Toggle | behaviorFlags));
        else
            selModel.selectIndex(targetIndex, flags);
        break;

    default:
        assert(0, 'Unsupported selection mode');
    }

    this.model_.clearInvalidPersistentIndices();
};

/**
 * @param {ModelIndex} index
 * @param {string} className
 * @private
 */
AbstractHTMLItemView.prototype.removeCssClassForIndex_ = function(index, className) {
    var el = this.elementForIndex(index);
    if (el)
        classes.remove(el, className);
};

/**
 * Removes the appropraite selection css class from all cells represented by itemSelection.
 *
 * @param {ItemSelection} itemSelection
 * @private
 */
AbstractHTMLItemView.prototype.removeCssSelectionClass_ = function(itemSelection) {
    var deselectedRanges = itemSelection.ranges();
    for (var i=0, z=deselectedRanges.length; i<z; i++) {
        var range = deselectedRanges[i];
        var left = range.left();
        var right = range.right();
        for (var j=range.top(), y=range.bottom(); j<=y; j++) {
            var row = j;
            for (var k=left; k<=right; k++) {
                var column = k;
                var targetElement = this.elementForRowColumn(row, column);
                if (targetElement)
                    classes.remove(targetElement, AbstractItemView.Css.Selected);
            }
        }
    }
};

/**
 * @return {SelectionFlag}
 * @private
 */
AbstractHTMLItemView.prototype.selectionFlagsFromBehavior_ = function() {
    var flags = SelectionFlag.NoChange;
    if (this.selectionBehavior_ === SelectionBehavior.Rows)
        flags |= SelectionFlag.Rows;
    else if (this.selectionBehavior_ === SelectionBehavior.Columns)
        flags |= SelectionFlag.Columns;
    return flags;
};

/**
 * @param {ag.model.AbstractItemModel} model
 * @private
 */
AbstractHTMLItemView.prototype.unwatchModel_ = function(model) {
    if (!model)
        return;
    var mo = metaObject();

    mo.disconnect(model, ModelSignal.DATA_CHANGED, this, this.dataChanged);
    mo.disconnect(model, ModelSignal.MODEL_RESET, this, this.modelReset);
    mo.disconnect(model, ModelSignal.ROWS_INSERTED, this, this.rowsInserted);
    mo.disconnect(model, ModelSignal.ROWS_REMOVED, this, this.rowsRemoved);
};

/**
 * @param {ItemSelectionModel} selectionModel
 * @private
 */
AbstractHTMLItemView.prototype.unwatchSelectionModel_ = function(selectionModel) {
    var mo = metaObject();

    mo.disconnect(selectionModel, ItemSelectionModel.SignalType.CURRENT_CHANGED, this, this.currentChanged);
    mo.disconnect(selectionModel, ItemSelectionModel.SignalType.SELECTION_CHANGED, this, this.selectionChanged);
    mo.disconnect(selectionModel, ItemSelectionModel.SignalType.SELECTION_LAYOUT_ABOUT_TO_BE_CHANGED, this, this.selectionLayoutAboutToBeChanged);
    mo.disconnect(selectionModel, ItemSelectionModel.SignalType.SELECTION_LAYOUT_CHANGED, this, this.selectionLayoutChanged);
};

/**
 * @param {ag.model.AbstractItemModel} model
 * @private
 */
AbstractHTMLItemView.prototype.watchModel_ = function(model) {
    if (!model)
        return;

    var mo = metaObject();
    mo.connect(model, ModelSignal.DATA_CHANGED, this, this.dataChanged);
    mo.connect(model, ModelSignal.MODEL_RESET, this, this.modelReset);
    mo.connect(model, ModelSignal.ROWS_INSERTED, this, this.rowsInserted);
    mo.connect(model, ModelSignal.ROWS_REMOVED, this, this.rowsRemoved);
};

/**
 * @param {ItemSelectionModel} selectionModel
 * @private
 */
AbstractHTMLItemView.prototype.watchSelectionModel_ = function(selectionModel) {
    var mo = metaObject();

    mo.connect(selectionModel, ItemSelectionModel.SignalType.CURRENT_CHANGED, this, this.currentChanged);
    mo.connect(selectionModel, ItemSelectionModel.SignalType.SELECTION_CHANGED, this, this.selectionChanged);
    mo.connect(selectionModel, ItemSelectionModel.SignalType.SELECTION_LAYOUT_ABOUT_TO_BE_CHANGED, this, this.selectionLayoutAboutToBeChanged);
    mo.connect(selectionModel, ItemSelectionModel.SignalType.SELECTION_LAYOUT_CHANGED, this, this.selectionLayoutChanged);
};


/*******************************************************************************************************************/});

