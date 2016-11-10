/**
 * @fileoverview Wizard provides a multi-page structure for performing a certain task.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.ui.Wizard');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom.classes');
goog.require('goog.dom.TagName');
goog.require('goog.object');
goog.require('goog.style');

goog.require('ag.meta.MetaObject');
goog.require('ag.ui.Dialog');
goog.require('ag.ui.WizardPage');

// --------------------------------------------------------------------------------------------------------------------
/**
 * Creates a DOM structure within the main dialog content element as follows:
 * 
 * <div class="ag-wizard-header">
 *   <p class="title">
 *   <p class="subtitle">
 * </div>
 * <div class="ag-wizard-content">
 *   {Wizard Page content}
 * </div>
 *
 * @constructor
 * @extends {ag.ui.Dialog}
 * @param {string} optClass optional class to give this widget
 * @param {boolean=} opt_useIframeMask Work around windowed controls z-index
 *     issue by using an iframe instead of a div for bg element.
 * @param {goog.dom.DomHelper=} optDomHelper Optional DOM helper used for document interaction
 */
ag.ui.Wizard = function(optClass, optUseIframeMask, optDomHelper) {
    goog.base(this, optClass, optUseIframeMask, optDomHelper);

    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {number}
     * @private
     */
    this.currentId_ = -1;

    /**
     * @type {Object.<HTMLElement>}
     * @private
     */
    this.domRefs_ = {};

    /**
     * Represents the next id to give pages as they are added.
     *
     * @type {number}
     * @private
     */
    this.nextIdValue_ = 0;

    /**
     * @type {Object.<number, ag.ui.WizardPage>}
     * @private
     */
    this.pages_ = {};

    /**
     * Array of page ids in the order they were added to this wizard.
     *
     * @type {Array.<number>}
     * @private
     */
    this.pageIds_ = [];

    /**
     * @type {number}
     * @private
     */
    this.startId_ = -1;

    /**
     * Stack of the pages visited in the order they were visited.
     *
     * @type {Array.<number>}
     * @private
     */
    this.visitedPages_ = [];


    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    this.setupButtons_();
};
goog.inherits(ag.ui.Wizard, ag.ui.Dialog);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;
var classes = goog.dom.classes;
var object = goog.object;
var style = goog.style;

var ButtonSet = goog.ui.Dialog.ButtonSet;
var Dialog = goog.ui.Dialog;
var TagName = goog.dom.TagName;

var Wizard = ag.ui.Wizard;
var WizardPage = ag.ui.WizardPage;

var metaObject = ag.meta.MetaObject.getInstance;

// --------------------------------------------------------------------------------------------------------------------
// Constants
/** @enum {!{key: string, caption: string}} */
Wizard.BasicButtons = {
    BACK:   {key: 'back', caption: '< Back'},
    NEXT:   {key: 'next', caption: 'Next >'}
};

/** @enum {string} */
Wizard.Css = {
    Header: goog.getCssName('ag-wizard-header'),
    Title: goog.getCssName('title'),
    Subtitle: goog.getCssName('subtitle'),
    Content: goog.getCssName('ag-wizard-content')
};

var Css = Wizard.Css;


// --------------------------------------------------------------------------------------------------------------------
// Static helper functions
/**
 * @param {HTMLElement} element
 * @return {Object.<string, HTMLElement.}
 */
Wizard.findChildControls = function(element) {
    var controls = element.querySelectorAll('[data-control_id]');
    var hash = {};
    for (var i=0, z=controls.length; i<z; i++) {
        var control = controls[i];
        var id = control.getAttribute('data-control_id');
        hash[id] = control;
    }
    return hash;
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * @param {WizardPage} newPage
 * @return {number}
 */
Wizard.prototype.addPage = function(newPage) {
    assert(!object.containsValue(this.pages_, newPage), 'Page already added to wizard');

    var pageId = this.nextIdValue_;
    this.pages_[pageId] = newPage;
    this.pageIds_.push(pageId);
    newPage.wizard_ = this;

    if (this.startId_ === -1)
        this.startId_ = pageId;

    this.nextIdValue_++;

    this.addChild(newPage, false /* optRender */);
    if (this.isInDocument()) {
        assert(object.containsKey(this.domRefs_, 'contentDiv'));
        newPage.render(this.domRefs_.contentDiv);
        style.showElement(newPage.getElement(), false);
    }
};

/**
 * Goes back to the previous page
 */
Wizard.prototype.back = function() {
    if (this.visitedPages_.length === 0)
        return;

    this.currentPage().cleanupPage();
    //                 ^^^^^^^^^^^ Call the virtual stub for the page to tweak its values

    var lastPageId = this.visitedPages_.pop();
    this.gotoPage_(lastPageId);
};

/** @return {number} */
Wizard.prototype.currentId = function() {
    return this.currentId_;
};

/** @return {WizardPage} */
Wizard.prototype.currentPage = function() {
    if (this.containsPageId_(this.currentId_))
        return this.pages_[this.currentId_];

    return null;
};

/**
 * Returns the value of the first field with name that is defined in child pages. If two or more pages have the same
 * field name the value of the field belonging to whichever page was added first will be returned.
 *
 * @param {string} name
 * @return {*}
 */
Wizard.prototype.field = function(name) {
    for (var i=0, z=this.pageIds_.length; i<z; i++) {
        var pageId = this.pageIds_[i];
        assert(this.containsPageId_(pageId));
        var page = this.pages_[pageId];
        if (page.hasField(name))
            return page.field(name);
    }

    return null;
};

/**
 * @param {number} pageId
 * @return {boolean}
 */
Wizard.prototype.hasVisitedPage = function(pageId) {
    return array.contains(this.visitedPages_, pageId);
};

/** @return {boolean} */
Wizard.prototype.isCurrentPageValid = function() {
    var page = this.currentPage();
    return page ? page.hasValidInput() : false;
};

/** @return {boolean} */
Wizard.prototype.isOnFinalPage = function() {
    return this.isVisible() && this.pageIds_.length &&
        (this.currentPage().isFinalPage() || this.nextId() === -1);
};

/**
 * Goes forward to the next page
 */
Wizard.prototype.next = function() {
    var nextPageId = this.nextId();
    if (nextPageId === -1)
        return;

    if (this.currentId_ !== -1)
        this.visitedPages_.push(this.currentId_);
    var nextPage = this.pages_[nextPageId];
    nextPage.initializePage();
    //       ^^^^^^^^^^^^^^ Virtual stub to let the page configure itself just before it is shown
    this.gotoPage_(nextPageId);
    nextPage.onShow();
};

/** @return {number} */
Wizard.prototype.nextId = function() {
    if (this.currentId_ === -1)
        return this.startId_;

    // Return the next higher id value greater than the current id
    var pageIds = this.pageIds();
    array.sort(pageIds);
    for (var i=0, z=pageIds.length; i<z; i++) {
        if (this.currentId_ < pageIds[i])
            return pageIds[i];
    }

    // No pages remaining
    return -1;
};

/** @return {Array.<number>} */
Wizard.prototype.pageIds = function() {
    return this.pageIds_;
};

/**
 * Restarts the wizard at the start page if in the document. Called automatically when the wizard is shown.
 */
Wizard.prototype.restart = function() {
    if (!this.isInDocument())
        return;

    array.clear(this.visitedPages_);
    this.gotoPage_(this.startId_);
};

/**
 * Sets the value of the first field with name that is defined by child pages. If two or more pages have the same
 * field name, the value of the field belonging to whichever page was added first will be set.
 *
 * @param {string} name
 * @return {*}
 */
Wizard.prototype.setField = function(name, value) {
    for (var i=0, z=this.pageIds_.length; i<z; i++) {
        var pageId = this.pageIds_[i];
        assert(this.containsPageId_(pageId));
        var page = this.pages_[pageId];
        if (page.hasField(name)) {
            page.setField(name, value);            
            return;
        }
    }
};

/** @param {number} newStartId */
Wizard.prototype.setStartId = function(newStartId) {
    if (this.containsPageId_(newStartId))
        this.startId_ = newStartId;
};

/** @override */
Wizard.prototype.setVisible = function(visible) {
    var renderPages = !this.isInDocument();
    goog.base(this, 'setVisible', visible);

    if (renderPages) {
        // Because some of the controls on these pages require rendering information (e.g. SequenceTextView) it
        // is best to render them *after* the wizard has already been made visible.
        var contentDiv = this.domRefs_.contentDiv;
        object.forEach(this.pages_, function(page) {
            page.render(contentDiv);
            style.showElement(page.getElement(), false);
        });
    }

    if (visible)
        this.restart();
};

/** @return {number} */
Wizard.prototype.startId = function() {
    return this.startId_;
};

/** @return {Array.<number>} */
Wizard.prototype.visitedPages = function() {
    return this.visitedPages_;
};


// --------------------------------------------------------------------------------------------------------------------
// Protected functions
/** @override */
Wizard.prototype.buttonPressed = function(key) {
    switch (key) {
    case Wizard.BasicButtons.NEXT.key:
        if (!this.isOnFinalPage()) {
            this.next();
        }
        else {
            this.accept();
            return;     // To avoid preventing the event default, which will trigger the dialog to hide.
        }
        break;
    case Wizard.BasicButtons.BACK.key:
        this.back();
        break;
    case Dialog.DefaultButtonKeys.CANCEL:
        if (this.currentPage().acceptCancel()) {
            this.currentPage().cleanupPage();
            this.reject();
            return;
        }
        break;

    default:
        break;
    }    
};

/** @override */
Wizard.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    if (this.currentPage())
        metaObject().disconnect(this.currentPage(), WizardPage.SignalType.COMPLETE_CHANGED, this, this.enableDisableNextFinishButton_);

    object.forEach(this.pages_, function(page) {
        page.dispose();
    });
    delete this.pages_;
    delete this.pageIds_;
    delete this.domRefs_;
    delete this.visitedPages_;
};

/** @override */
Wizard.prototype.domSetup = function() {
    var dialogContentEl = this.getContentElement();
    var domHelper = this.getDomHelper();

    // Header div
    var headerDiv = domHelper.createDom(TagName.DIV);
    classes.add(headerDiv, Css.Header);
    var title = domHelper.createDom(TagName.H5);
    classes.add(title, Css.Title);
    headerDiv.appendChild(title);
    var pSubtitle = domHelper.createDom(TagName.P);
    classes.add(pSubtitle, Css.Subtitle);
    headerDiv.appendChild(pSubtitle);
    dialogContentEl.appendChild(headerDiv);

    dialogContentEl.appendChild(domHelper.createDom(TagName.HR));

    var contentDiv = domHelper.createDom(TagName.DIV);
    classes.add(contentDiv, Css.Content);
    dialogContentEl.appendChild(contentDiv);

    dialogContentEl.appendChild(domHelper.createDom(TagName.HR));

    this.domRefs_.headerDiv = headerDiv;
    this.domRefs_.title = title;
    this.domRefs_.subtitleP = pSubtitle;
    this.domRefs_.contentDiv = contentDiv;

    // Group all buttons except the cancel button.
    var buttonSet = this.getButtonSet();
    var buttonEl = this.getButtonElement();

    var cancelButton = buttonSet.getButton(ButtonSet.DefaultButtons.CANCEL.key);
    domHelper.removeNode(cancelButton);

    var group = domHelper.createDom(TagName.DIV);
    for (var i=0, z=buttonEl.childNodes.length; i<z; i++)
        group.appendChild(buttonEl.childNodes[0]);
    buttonEl.appendChild(cancelButton);
    buttonEl.appendChild(group);
};


// --------------------------------------------------------------------------------------------------------------------
// Private functions
/**
 * Does the following:
 * 1) Enables/disables the back button based on the wizard page position
 * 2) Sets the next button text to next or finish depending on how many pages remain
 *
 * @private
 */
Wizard.prototype.adjustNavigationButtons_ = function() {
    var buttonSet = this.getButtonSet();
    buttonSet.setButtonEnabled(Wizard.BasicButtons.BACK.key, this.visitedPages_.length > 0);

    var isFinalPage = this.isOnFinalPage();
    var nextKey = Wizard.BasicButtons.NEXT.key;
    var nextText = !isFinalPage ? Wizard.BasicButtons.NEXT.caption : 'Finish';
    this.getDomHelper().setTextContent(buttonSet.getButton(nextKey), nextText);
    this.enableDisableNextFinishButton_();
};

/**
 * @param {number} pageId
 * @return {boolean}
 * @private
 */
Wizard.prototype.containsPageId_ = function(pageId) {
    return object.containsKey(this.pages_, pageId);
};

/**
 * Called whenever a wizard page updates its complete changed status and is used to enable/disable the next button.
 *
 * @private
 */
Wizard.prototype.enableDisableNextFinishButton_ = function() {
    this.getButtonSet().setButtonEnabled(Wizard.BasicButtons.NEXT.key, this.currentPage().isComplete());
};

/**
 * Sets the current page to pageId.
 *
 * @param {number} pageId
 * @private
 */
Wizard.prototype.gotoPage_ = function(pageId) {
    assert(this.isInDocument());
    assert(this.containsPageId_(pageId));
    assert(pageId !== -1);
    if (this.currentId_ === pageId)
        return;

    var mo = metaObject();
    if (this.currentId_ !== -1) {
        this.setPageVisible_(this.currentId_, false);
        mo.disconnect(this.currentPage(), WizardPage.SignalType.COMPLETE_CHANGED, this, this.enableDisableNextFinishButton_);
    }
    this.currentId_ = pageId;

    // Update the title and subtitle
    var curPage = this.currentPage();
    var domHelper = this.getDomHelper();
    domHelper.setTextContent(this.domRefs_.title, curPage.title());
    domHelper.setTextContent(this.domRefs_.subtitleP, curPage.subTitle());
    this.setPageVisible_(this.currentId_);
    mo.connect(curPage, WizardPage.SignalType.COMPLETE_CHANGED, this, this.enableDisableNextFinishButton_);

    this.adjustNavigationButtons_();
};

/**
 * @param {number} pageId
 * @param {boolean=} optVisible defaults to true
 * @private
 */
Wizard.prototype.setPageVisible_ = function(pageId, optVisible) {
    var visible = goog.isDefAndNotNull(optVisible) ? optVisible : true;
    var page = this.pages_[pageId];
    assert(page);
    style.showElement(page.getElement(), visible);
};

/** @private */
Wizard.prototype.setupButtons_ = function() {
    var buttonSet = new ButtonSet();
    buttonSet.addButton(ButtonSet.DefaultButtons.CANCEL, false /* opt_isDefault */, true /* opt_isCancel */)
             .addButton(Wizard.BasicButtons.BACK)
             .addButton(Wizard.BasicButtons.NEXT, true /* opt_isDefault */);
    this.setButtonSet(buttonSet);
};

/*******************************************************************************************************************/});
