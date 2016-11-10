/**
 * Three sources of input:
 * 1) Local file - drag and drop / file select
 * 2) URL to file
 * 3) POST data
 *
 * Accepted formats: CLUSTAL
 */
goog.provide('AlignShop');

goog.require('ag.bio.MsaCharCountDistribution');
goog.require('ag.bio.ObservableMsa');
goog.require('ag.bio.Subseq');
goog.require('ag.bio.io.ClustalReader');
goog.require('ag.bio.io.ClustalWriter');
goog.require('ag.bio.io.FastaMsaWriter');
goog.require('ag.commands.CollapseCommand');
goog.require('ag.commands.InsertGapColumnsCommand');
goog.require('ag.commands.RemoveAllGapsCommand');
goog.require('ag.commands.SetMsaSelectionCommand');
goog.require('ag.commands.SlideMsaRectCommand');
goog.require('ag.commands.SkipFirstRedoCommand');
goog.require('ag.commands.MsaELTCommand');      // Extend, Level, Trim
goog.require('ag.core.UnitRect');
goog.require('ag.graphics.AminoColorSchemes');
goog.require('ag.graphics.CharColorProvider');
goog.require('ag.graphics.ClustalAminoSymbolGroup');
goog.require('ag.graphics.SymbolColorProvider');
goog.require('ag.meta.MetaObject');
goog.require('ag.model.MsaSubseqModel');
goog.require('ag.service.LiveSymbolString');
goog.require('ag.service.SymbolStringCalculator');

goog.require('ag.ui');
goog.require('ag.ui.Action');
goog.require('ag.ui.ActionGroup');
goog.require('ag.ui.ActionHandler');
goog.require('ag.ui.ActionMenuItem');
goog.require('ag.ui.ActionToolbarButton');
goog.require('ag.ui.KeySequence');
goog.require('ag.ui.MsaSubseqTableView');
goog.require('ag.ui.SingleImageMsaView');
goog.require('ag.ui.SplitPane');
goog.require('ag.undoredo.UndoCommand');
goog.require('ag.undoredo.UndoStack');

goog.require('ag.ui.GapMsaTool');
goog.require('ag.ui.HandMsaTool');
goog.require('ag.ui.SelectMsaTool');

goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.dom.TagName');
goog.require('goog.dom.ViewportSizeMonitor');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.events.EventHandler');
goog.require('goog.events.KeyCodes');
goog.require('goog.net.XhrIo');
goog.require('goog.style');
goog.require('goog.ui.menuBar');
goog.require('goog.ui.Menu');
goog.require('goog.ui.MenuButton');
goog.require('goog.ui.MenuItem');
goog.require('goog.ui.MenuSeparator');
goog.require('goog.ui.SubMenu');
goog.require('goog.ui.Toolbar');
goog.require('goog.ui.ToolbarButton');
goog.require('goog.ui.ToolbarMenuButton');
goog.require('goog.ui.ToolbarRenderer');
goog.require('goog.ui.ToolbarSeparator');
goog.require('goog.ui.ToolbarToggleButton');


goog.require('bootstrap.DropDown');

/**
 * @constructor
 */
AlignShop = function() {
    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {Object.<string,HTMLElement>}
     * @private
     */
    this.els_;

    /**
     * @type {goog.events.EventHandler}
     * @private
     */
    this.eventHandler_;

    // Models
    /**
     * @type {ag.bio.Msa}
     * @private
     */
    this.msa_;
    /**
     * @type {ag.bio.MsaCharCountDistribution}
     * @private
     */
    this.msaCharDist_;
    /**
     * @type {ag.service.LiveSymbolString}
     * @private
     */
    this.liveSymbolString_;
    /**
     * @type {ag.model.MsaSubseqModel}
     * @private
     */
    this.subseqModel_;

    // Views
    /**
     * @type {ag.ui.MsaSubseqTableView}
     * @private
     */
    this.labelView_;
    /**
     * @type {ag.ui.MsaView}
     * @private
     */
    this.msaView_;

    // MSA Helpers
    /**
     * @type {ag.service.SymbolStringCalculator}
     * @private
     */
    this.symbolStringCalculator_;
    /**
     * @type {ag.graphics.SymbolColorProvider}
     * @private
     */
    this.symbolColorProvider_;

    // UI helpers
    /**
     * @type {goog.ui.Container}
     * @private
     */
    this.menubar_;

    /**
     * @type {Object}
     * @private
     */
    this.menus_ = {};    // Object of menus {string,Menu}

    /**
     * @type {goog.dom.ViewportSizeMonitor}
     * @private
     */
    this.vsm_;

    /**
     * @type {ag.ui.SplitPane}
     * @private
     */
    this.splitPane_;

    /**
     * @type {ag.undoredo.UndoStack}
     * @private
     */
    this.undoStack_;

    // Actions
    /**
     * @type {Object}
     * @private
     */
    this.actions_;  // Object

    /**
     * @type {Object}
     * @private
     */
    this.menuActions_;   // Object of action arrays corresponding to the main menu

    /**
     * @type {ag.ui.ActionGroup}
     * @private
     */
    this.visualizationsActionGroup_;

    /**
     * @type {ag.ui.Action}
     * @private
     */
    this.defaultColorProviderAction_;

    // Tools
    /**
     * @type {ag.ui.SelectMsaTool}
     * @private
     */
    this.selectTool_;

    /**
     * @type {ag.ui.HandMsaTool}
     * @private
     */
    this.handTool_;

    /**
     * @type {ag.ui.GapMsaTool}
     * @private
     */
    this.gapTool_;

    // Misc
    /**
     * @type {string}
     * @private
     */
    this.msaFileName_;
    /**
     * @type {ag.core.UnitRect}
     * @private
     */
    this.slideStartRect_ = new ag.core.UnitRect();

    /**
     * @type {bootstrap.DropDown}
     * @private
     */
    this.samplesDropDown_;

    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    this.constructor_();
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var classes = goog.dom.classes;
var dom = goog.dom;
var events = goog.events;
var style = goog.style;
var EventType = goog.events.EventType;
var EventHandler = goog.events.EventHandler;
var KeyCodes = goog.events.KeyCodes;
var Menu = goog.ui.Menu;
var MenuButton = goog.ui.MenuButton;
var MenuItem = goog.ui.MenuItem;
var MenuSeparator = goog.ui.MenuSeparator;
var SubMenu = goog.ui.SubMenu;
var TagName = goog.dom.TagName;
var Toolbar = goog.ui.Toolbar;
var ToolbarButton = goog.ui.ToolbarButton;
var ToolbarSeparator = goog.ui.ToolbarSeparator;
var ViewportSizeMonitor = goog.dom.ViewportSizeMonitor;
var XhrIo = goog.net.XhrIo;

var Action = ag.ui.Action;
var ActionGroup = ag.ui.ActionGroup;
var ActionMenuItem = ag.ui.ActionMenuItem;
var ActionToolbarButton = ag.ui.ActionToolbarButton;
var CharColorProvider = ag.graphics.CharColorProvider;
var ClustalAminoSymbolGroup = ag.graphics.ClustalAminoSymbolGroup;
var ClustalReader = ag.bio.io.ClustalReader;
var ClustalWriter = ag.bio.io.ClustalWriter;
var FastaMsaWriter = ag.bio.io.FastaMsaWriter;
var KeySequence = ag.ui.KeySequence;
var LiveSymbolString = ag.service.LiveSymbolString;
var MsaCharCountDistribution = ag.bio.MsaCharCountDistribution;
var MsaSubseqModel = ag.model.MsaSubseqModel;
var MsaSubseqTableView = ag.ui.MsaSubseqTableView;
var MsaView = ag.ui.MsaView;
var ObservableMsa = ag.bio.ObservableMsa;
var SingleImageMsaView = ag.ui.SingleImageMsaView;
var SplitPane = ag.ui.SplitPane;
var Subseq = ag.bio.Subseq;
var SymbolColorProvider = ag.graphics.SymbolColorProvider;
var SymbolStringCalculator = ag.service.SymbolStringCalculator;
var UndoCommand = ag.undoredo.UndoCommand;
var UndoStack = ag.undoredo.UndoStack;
var UnitRect = ag.core.UnitRect;

var ClustalAminoColorScheme = ag.graphics.ClustalAminoColorScheme;
var ZappoAminoColorScheme = ag.graphics.ZappoAminoColorScheme;

var CollapseCommand = ag.commands.CollapseCommand;
var InsertGapColumnsCommand = ag.commands.InsertGapColumnsCommand;
var RemoveAllGapsCommand = ag.commands.RemoveAllGapsCommand;
var SetMsaSelectionCommand = ag.commands.SetMsaSelectionCommand;
var SlideMsaRectCommand = ag.commands.SlideMsaRectCommand;
var MsaELTCommand = ag.commands.MsaELTCommand;

var GapMsaTool = ag.ui.GapMsaTool;
var HandMsaTool = ag.ui.HandMsaTool;
var SelectMsaTool = ag.ui.SelectMsaTool;

var actionHandler = ag.ui.ActionHandler.getInstance;
var metaObject = ag.meta.MetaObject.getInstance;

// Bootstrap controls
var DropDown = bootstrap.DropDown;

// --------------------------------------------------------------------------------------------------------------------
// Constants
/** @enum {string|number} */
AlignShop.Constants = {
    MinWidth: 500,
    MinHeight: 300,
    ReflectFileUrl: 'reflect.php'
};


// --------------------------------------------------------------------------------------------------------------------
// Constructor initialiation function
/** @private */
AlignShop.prototype.constructor_ = function() {
    this.undoStack_ = new UndoStack();
    this.eventHandler_ = new EventHandler(this);
    this.vsm_ = new ViewportSizeMonitor();
    this.msaView_ = new SingleImageMsaView();
    this.labelView_ = new MsaSubseqTableView(this.msaView_);

    this.gapTool_ = new GapMsaTool(this.msaView_);
    this.handTool_ = new HandMsaTool(this.msaView_);
    this.selectTool_ = new SelectMsaTool(this.msaView_);
    this.selectTool_.setHandTool(this.handTool_);
    this.msaView_.setCurrentTool(this.selectTool_);

    this.setupActions_();

    this.storeElementReferences_();

    this.setupMenu_();
    this.setupSamples_();
    this.setupToolbar_();

    this.symbolStringCalculator_ = new SymbolStringCalculator(ClustalAminoSymbolGroup);

    this.splitPane_ = new SplitPane(this.labelView_, this.msaView_, goog.ui.SplitPane.Orientation.HORIZONTAL);
    this.splitPane_.setInitialSize(150);
    this.splitPane_.setHandleSize(5);

    this.setupListeners_();
    this.setupSlots_();
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
AlignShop.prototype.run = function() {
    this.labelView_.decorate(this.els_.labelView);
    this.msaView_.decorate(this.els_.msaView);
    this.splitPane_.decorate(this.els_.editor);

    this.updateActionStates_();
};

// --------------------------------------------------------------------------------------------------------------------
// Private event handlers
/** @private */
AlignShop.prototype.onInputFileChanged_ = function(event) {
    var files = event.target.files;
    if (files.length === 0)
        return;

    this.msaFileName_ = files[0].name;

    this.loadAlignmentFile_(files[0]);
    this.els_.inputFile.value = null;
};

// -------
// Actions
/** @private */
AlignShop.prototype.onOpenAction_ = function() {
    this.els_.inputFile.click();

    // HACK!
    // The above will open a dialog likely before the ActionHandler has had a chance to process any keyup
    // events. Once the file selection dialog is open, it then absorbs the keyup event leaving the action handler
    // in an inconsistent state. Therefore, tell the action handler that these action keys should be released.
    actionHandler().release(this.actions_.fileOpen);
};

/** @private */
AlignShop.prototype.onDownloadAction_ = function() {
    var action = /** @type {Action} */(metaObject().sender());
    var writer = /** @type {ag.bio.io.MsaWriter} */(action.userData);
    var msa_text = writer.exportMsa(this.msa_);

    var filename = this.msaFileName_.replace(/\.aln$/i, '') + '.' + writer.extension();

    // Bounce off server for download purposes
    var form = document.querySelector('form');
    form.querySelector('input[name="name"]').value = filename;
    form.querySelector('input[name="content"]').value = msa_text;
    form.submit();
    form.reset();
};

/** @private */
AlignShop.prototype.onCollapseAction_ = function() {
    var sel = this.msaView_.selection();
    if (!sel)
        return;

    var action = /** @type {Action} */(metaObject().sender());
    var direction = /** @type {CollapseCommand.Direction} */ (action.userData);
    this.undoStack_.push(new CollapseCommand(this.msa_, sel, direction));
    var rightEnabled = direction === CollapseCommand.Direction.Left;
    this.actions_.editCollapseLeft.setEnabled(!rightEnabled);
    this.actions_.editCollapseRight.setEnabled(rightEnabled);
};

/** @private */
AlignShop.prototype.onELTAction_ = function() {
    var sel = this.msaView_.selection();
    if (!sel)
        return;

    sel = sel.createCopy();
    sel.normalize();
    var action = /** @type {Action} */(metaObject().sender());
    var type = /** @type {MsaELTCommand.Type} */ (action.userData[0]);
    var direction = /** @type {MsaELTCommand.Direction} */ (action.userData[1]);
    var column = direction === MsaELTCommand.Direction.Left ? sel.x1 : sel.x2;
    if (type === MsaELTCommand.Type.Trim)
        column = direction === MsaELTCommand.Direction.Left ? sel.x2 : sel.x1;
    this.undoStack_.push(new MsaELTCommand(type, this.msa_, column, sel.verticalRange(), direction));
    this.enableDisableMsaActions_();
    sel.release();
};

/** @private */
AlignShop.prototype.onRemoveAllGapsAction_ = function() {
    if (!this.msa_)
        return;

    var removedColumnRanges = this.msa_.removeGapColumns();
    if (removedColumnRanges.length)
        this.undoStack_.push(new RemoveAllGapsCommand(this.msa_, removedColumnRanges));
};

/** @private */
AlignShop.prototype.onActionGapTool_ = function() {
    this.msaView_.setCurrentTool(this.gapTool_);
};

/** @private */
AlignShop.prototype.onActionHandTool_ = function() {
    this.msaView_.setCurrentTool(this.handTool_);
};

/** @private */
AlignShop.prototype.onActionSelectTool_ = function() {
    this.msaView_.setCurrentTool(this.selectTool_);
};

// Visualization actions
/** @private */
AlignShop.prototype.onClustalAction_ = function() {
    this.msaView_.setColorProvider(this.symbolColorProvider_);
};

/** @private */
AlignShop.prototype.onColorSchemeAction_ = function() {
    var action = /** @type {Action} */(metaObject().sender());
    var scheme = /** @type {ag.graphics.CharColorScheme} */ (action.userData);
    this.msaView_.setColorProvider(new CharColorProvider(scheme));
};

// --------------------------------------------------------------------------------------------------------------------
// Private slots
/**
 * @param {ag.core.ClosedIntRange} columns
 * @private
 */
AlignShop.prototype.onMsaGapColumnsInsertFinished_ = function(columns) {
    if (columns.isNormal())
        this.undoStack_.push(new InsertGapColumnsCommand(this.msa_, columns.begin, columns.length()));
};

/**
 * @param {ag.core.UnitRect} msaRect
 * @private
 */
AlignShop.prototype.onMsaSlideStarted_ = function(msaRect) {
    this.slideStartRect_.assign(msaRect);
    this.slideStartRect_.normalize();
};

/**
 * @param {ag.core.UnitRect} msaRect
 * @param {number} terminalGaps
 * @private
 */
AlignShop.prototype.onMsaSlideFinished_ = function(msaRect, terminalGaps) {
    var normRect = msaRect.createCopy();
    normRect.normalize();
    var sameRect = this.slideStartRect_.eq(normRect);
    if (!sameRect || terminalGaps) {
        // Delta reflects the amount the selection slid apart from any terminal gaps that were inserted
        var delta = sameRect ? 0 : msaRect.x1 - this.slideStartRect_.x1;
        if (delta > 0)
            delta -= terminalGaps;

        if (terminalGaps === 0)
            this.undoStack_.push(new SlideMsaRectCommand(this.msaView_, this.slideStartRect_, delta));
        else {
            var master = new UndoCommand('Extended slide');
            if (delta)
                new SlideMsaRectCommand(this.msaView_, this.slideStartRect_, delta, master);
            else
                new SetMsaSelectionCommand(this.msaView_, this.slideStartRect_, master);

            var insertCol = terminalGaps < 0 ? 1 : this.msa_.columnCount() - terminalGaps + 1;
            new InsertGapColumnsCommand(this.msa_, insertCol, Math.abs(terminalGaps), master);

            normRect.shift(-terminalGaps, 0);
            if (terminalGaps < 0)
                normRect.x1 = -terminalGaps + 1;
            else
                normRect.x2 = this.msa_.columnCount() - terminalGaps;
            new SlideMsaRectCommand(this.msaView_, normRect, terminalGaps, master);

            normRect.assign(this.slideStartRect_);
            normRect.shift(delta + terminalGaps > 0 ? terminalGaps : 0, 0);
            new SetMsaSelectionCommand(this.msaView_, normRect, master);

            this.undoStack_.push(master);
        }
    }
    normRect.release();
};

/**
 * @param {HTMLElement} target
 * @private
 */
AlignShop.prototype.onSampleSelected_ = function(target) {
    // Fetch the sample file via XHR
    var url = target.href;
    var self = this;
    XhrIo.send(url, function(event) {
        var xhr = event.target;
        if (xhr.isSuccess())
            self.loadClustalString_(xhr.getResponseText());
        else
            alert('Error fetching alignment');
    });
};

// --------------------------------------------------------------------------------------------------------------------
// Private functions
AlignShop.prototype.closeMsa_ = function() {
    this.loadMsa_(undefined);
};

/**
 * @private
 * @return {Element}
 */
AlignShop.prototype.createFileElement_ = function() {
    var input = dom.createDom(TagName.INPUT);
    input.type = 'file';
    return input;
};

/** @private */
AlignShop.prototype.enableDisableMsaActions_ = function() {
    var msa = this.msaView_.msa();
    var selection = this.msaView_.selection();
    var normSelection;
    var rows;
    if (selection) {
        normSelection = UnitRect.create();
        normSelection.assign(selection);
        normSelection.normalize();
        rows = normSelection.verticalRange();
    }

    this.actions_.editExtendRowsLeft.setEnabled(rows && msa.canExtendLeft(normSelection.x1, rows));
    this.actions_.editExtendRowsRight.setEnabled(rows && msa.canExtendRight(normSelection.x2, rows));
    this.actions_.editLevelRowsLeft.setEnabled(rows && msa.canLevelLeft(normSelection.x1, rows));
    this.actions_.editLevelRowsRight.setEnabled(rows && msa.canLevelRight(normSelection.x2, rows));
    this.actions_.editTrimRowsLeft.setEnabled(rows && msa.canTrimLeft(normSelection.x2, rows));
    this.actions_.editTrimRowsRight.setEnabled(rows && msa.canTrimRight(normSelection.x1, rows));
    this.actions_.editCollapseLeft.setEnabled(msa && msa.canCollapseLeft(normSelection));
    this.actions_.editCollapseRight.setEnabled(msa && msa.canCollapseRight(normSelection));

    if (rows)
        normSelection.release();
};

/** @private */
AlignShop.prototype.loadAlignmentFile_ = function(file) {
    var reader = new FileReader();
    var self = this;
    reader.onload = function(readEvent) {
        var fileData = readEvent.target.result;
        self.loadClustalString_(fileData);
    };

    reader.readAsText(file);
};

/** @private */
AlignShop.prototype.loadClustalString_ = function(data) {
    var clustalReader = new ClustalReader();
    var pods;
    try {
        pods = clustalReader.parseString(data);
    }
    catch (errorString) {
        alert(errorString);
        return;
    }

    var msa = AlignShop.msaFromPods_(pods);
    if (msa)
        this.loadMsa_(msa);
};

/** @private */
AlignShop.prototype.loadMsa_ = function(msa) {
    if (this.msa_) {
        this.msaView_.setMsa(null);

        // Clear out old msa variables
        this.symbolColorProvider_ = null;
        this.liveSymbolString_.dispose();
        this.liveSymbolString_ = null;
        this.msaCharDist_ = null;
    }

    this.undoStack_.clear();
    this.msa_ = msa;
    this.updateActionStates_();

    if (!this.subseqModel_) {
        this.subseqModel_ = new MsaSubseqModel();
        this.labelView_.setModel(this.subseqModel_);
    }
    this.subseqModel_.setMsa(msa);

    if (msa) {
        this.msaCharDist_ = new MsaCharCountDistribution(msa);
        this.liveSymbolString_ = new LiveSymbolString(this.msaCharDist_, this.symbolStringCalculator_);
        this.symbolColorProvider_ = new SymbolColorProvider(this.liveSymbolString_, ClustalAminoColorScheme);

        // Must reinitialize the appropriate color provider
        var colorProviderAction = this.visualizationsActionGroup_.checkedAction();
        if (colorProviderAction)
            colorProviderAction.trigger();
        else
            this.defaultColorProviderAction_.setChecked();

        this.msaView_.setMsa(msa);
    }
    this.updateEditorSize_();
    this.enableDisableMsaActions_();
};

/** @private */
AlignShop.prototype.updateActionStates_ = function() {
    var enabled = goog.isDef(this.msa_);

    Action.perform(this.menuActions_.file, Action.prototype.setEnabled, enabled);
    Action.perform(this.menuActions_.edit, Action.prototype.setEnabled, enabled);
    this.actions_.editUndo.setEnabled(this.undoStack_.canUndo());
    this.actions_.editRedo.setEnabled(this.undoStack_.canRedo());
    Action.perform(this.menuActions_.tools, Action.prototype.setEnabled, enabled);
    Action.perform(this.menuActions_.visualizations, Action.prototype.setEnabled, enabled);
    this.menus_.downloadAs.setEnabled(enabled);
    this.actions_.fileOpen.setEnabled();
};

/** @private */
AlignShop.prototype.setupActions_ = function() {
    var actions = {
        // File menu
        fileOpen: new Action([KeyCodes.CTRL, KeyCodes.O], 'Open', 'icons-document-open-16'),
        fileClose: new Action([KeyCodes.CTRL, KeyCodes.SHIFT, KeyCodes.O], 'Close'),

        // --> Download as submenu
        downloadAlignedFasta: new Action(null, 'Aligned FASTA'),
        downloadClustal: new Action(null, 'Clustal'),

        // Edit menu
        editUndo: new Action([KeyCodes.CTRL, KeyCodes.Z], 'Undo', 'icons-edit-undo-16'),
        editRedo: new Action([KeyCodes.CTRL, KeyCodes.SHIFT, KeyCodes.Z], 'Redo', 'icons-edit-redo-16'),
        editExtendSequence: this.selectTool_.extendAction(),
        editTrimSequence: this.selectTool_.trimAction(),
        editExtendRowsLeft: new Action(KeyCodes.E, 'Extend left edge'),
        editExtendRowsRight: new Action(KeyCodes.T, 'Extend right edge'),
        editLevelRowsLeft: new Action(KeyCodes.D, 'Level left edge'),
        editLevelRowsRight: new Action(KeyCodes.G, 'Level right edge'),
        editTrimRowsLeft: new Action(KeyCodes.C, 'Trim left edge'),
        editTrimRowsRight: new Action(KeyCodes.B, 'Trim right edge'),
        editCollapseLeft: new Action(KeyCodes.COMMA, 'Collapse selection left'),
        editCollapseRight: new Action(KeyCodes.PERIOD, 'Collapse selection right'),
        editRemoveAllGapColumns: new Action([KeyCodes.CTRL, KeyCodes.SHIFT, KeyCodes.G], 'Remove all gap columns', 'icons-action-remove-column-16'),
        editSelectAll: new Action([KeyCodes.CTRL, KeyCodes.A], 'Select all'),
        editDeselectAll: new Action(KeyCodes.ESC, 'Deselect all'),

        // View menu
        viewStartPositions: new Action(null, 'Start positions').setCheckable().setChecked(),
        viewStopPositions: new Action(null, 'Stop positions').setCheckable().setChecked(),
        viewRuler: new Action(null, 'Ruler', 'icons-ruler-16').setCheckable().setChecked(),

        // Tools menu
        toolsSelect: new Action(KeyCodes.F1, 'Select tool', 'icons-cursor-arrow-16'),
        toolsHand: new Action(KeyCodes.F2, 'Hand tool', 'icons-cursor-openhand-16'),
        toolsInsertGaps: new Action(KeyCodes.F3, 'Insert gaps tool', 'icons-action-insert-column-16'),

        // Visualiations menu
        visualizationsPlain: new Action([KeyCodes.CTRL, KeyCodes.ZERO], 'Plain'),
        visualizationsClustal: new Action([KeyCodes.CTRL, KeyCodes.ONE], 'Clustal'),
        visualizationsZappo: new Action([KeyCodes.CTRL, KeyCodes.TWO], 'Zappo')
    };
    this.actions_ = actions;

    // Color scheme setup
    actions.downloadClustal.userData = ClustalWriter;
    actions.downloadAlignedFasta.userData = FastaMsaWriter;
    actions.editTrimRowsLeft.userData = [MsaELTCommand.Type.Trim, MsaELTCommand.Direction.Left];
    actions.editTrimRowsRight.userData = [MsaELTCommand.Type.Trim, MsaELTCommand.Direction.Right];
    actions.editExtendRowsLeft.userData = [MsaELTCommand.Type.Extend, MsaELTCommand.Direction.Left];
    actions.editExtendRowsRight.userData = [MsaELTCommand.Type.Extend, MsaELTCommand.Direction.Right];
    actions.editLevelRowsLeft.userData = [MsaELTCommand.Type.Level, MsaELTCommand.Direction.Left];
    actions.editLevelRowsRight.userData = [MsaELTCommand.Type.Level, MsaELTCommand.Direction.Right];
    actions.editCollapseLeft.userData = CollapseCommand.Direction.Left;
    actions.editCollapseRight.userData = CollapseCommand.Direction.Right;
    actions.visualizationsZappo.userData = ZappoAminoColorScheme;

    // By default nothing is enabled, except for file open
    for (var key in actions)
        actionHandler().register(actions[key]);

    // Handy references to the various groups
    this.menuActions_ = {
        file: [actions.fileOpen, actions.fileClose, actions.downloadAlignedFasta, actions.downloadClustal],
        edit: [actions.editUndo, actions.editRedo, actions.editExtendSequence, actions.editTrimSequence, actions.editExtendRowsLeft, actions.editExtendRowsRight, actions.editLevelRowsLeft, actions.editLevelRowsRight, actions.editTrimRowsLeft, actions.editTrimRowsRight, actions.editCollapseLeft, actions.editCollapseRight, actions.editRemoveAllGapColumns, actions.editSelectAll, actions.editDeselectAll],
        view: [actions.viewStartPositions, actions.viewStopPositions, actions.viewRuler],
        tools: [actions.toolsSelect, actions.toolsHand, actions.toolsInsertGaps],
        visualizations: [actions.visualizationsPlain, actions.visualizationsClustal, actions.visualizationsZappo]
    };

    // Setup the tools group
    var toolsGroup = new ActionGroup();
    toolsGroup.setExclusive();
    toolsGroup.addAction(actions.toolsSelect, actions.toolsHand, actions.toolsInsertGaps);
    actions.toolsSelect.setChecked();

    // Setup the visualization group
    var visualizationsGroup = new ActionGroup();
    visualizationsGroup.setExclusive();
    visualizationsGroup.addAction(actions.visualizationsPlain,
        actions.visualizationsClustal,
        actions.visualizationsZappo);
    this.defaultColorProviderAction_ = actions.visualizationsClustal;
    this.visualizationsActionGroup_ = visualizationsGroup;

    // Hook up the actions
    var triggerSignal = Action.SignalType.TRIGGERED;
    var toggleSignal = Action.SignalType.TOGGLED;
    metaObject().connect(actions.fileOpen, triggerSignal, this, this.onOpenAction_)
        .connect(actions.fileClose, triggerSignal, this, this.closeMsa_)
        .connect(actions.downloadClustal, triggerSignal, this, this.onDownloadAction_)
        .connect(actions.downloadAlignedFasta, triggerSignal, this, this.onDownloadAction_)

        .connect(actions.editUndo, triggerSignal, this.undoStack_, this.undoStack_.undo)
        .connect(actions.editRedo, triggerSignal, this.undoStack_, this.undoStack_.redo)
        .connect(actions.editExtendRowsLeft, triggerSignal, this, this.onELTAction_)
        .connect(actions.editExtendRowsRight, triggerSignal, this, this.onELTAction_)
        .connect(actions.editLevelRowsLeft, triggerSignal, this, this.onELTAction_)
        .connect(actions.editLevelRowsRight, triggerSignal, this, this.onELTAction_)
        .connect(actions.editTrimRowsLeft, triggerSignal, this, this.onELTAction_)
        .connect(actions.editTrimRowsRight, triggerSignal, this, this.onELTAction_)
        .connect(actions.editCollapseLeft, triggerSignal, this, this.onCollapseAction_)
        .connect(actions.editCollapseRight, triggerSignal, this, this.onCollapseAction_)
        .connect(actions.editRemoveAllGapColumns, triggerSignal, this, this.onRemoveAllGapsAction_)
        .connect(actions.editSelectAll, triggerSignal, this.msaView_, this.msaView_.selectAll)
        .connect(actions.editSelectAll, triggerSignal, this, this.enableDisableMsaActions_)
        .connect(actions.editDeselectAll, triggerSignal, this.msaView_, this.msaView_.setSelection)
        .connect(actions.editDeselectAll, triggerSignal, this, this.enableDisableMsaActions_)

        .connect(actions.viewRuler, toggleSignal, this.msaView_, this.msaView_.setRulerVisible)
        .connect(actions.viewStartPositions, toggleSignal, this.msaView_, this.msaView_.setStartSideWidgetVisible)
        .connect(actions.viewStopPositions, toggleSignal, this.msaView_, this.msaView_.setStopSideWidgetVisible)

        .connect(actions.toolsInsertGaps, triggerSignal, this, this.onActionGapTool_)
        .connect(actions.toolsHand, triggerSignal, this, this.onActionHandTool_)
        .connect(actions.toolsSelect, triggerSignal, this, this.onActionSelectTool_)

        .connect(actions.visualizationsPlain, triggerSignal, this.msaView_, this.msaView_.setColorProvider)
        .connect(actions.visualizationsClustal, triggerSignal, this, this.onClustalAction_)
        .connect(actions.visualizationsZappo, triggerSignal, this, this.onColorSchemeAction_);
};

/** @private */
AlignShop.prototype.setupListeners_ = function() {
    this.eventHandler_.listen(this.els_.inputFile, EventType.CHANGE, this.onInputFileChanged_)
        .listen(this.vsm_, EventType.RESIZE, this.updateEditorSize_)
        .listen(this.splitPane_, goog.ui.SplitPane.EventType.HANDLE_DRAG_START, function() { document.body.setAttribute('data-cursor', 'col-resize'); })
        .listen(this.splitPane_, goog.ui.SplitPane.EventType.HANDLE_DRAG_END, function() { document.body.removeAttribute('data-cursor'); });
};

/** @private */
AlignShop.prototype.setupMenu_ = function() {
    this.menubar_ = goog.ui.menuBar.create();

    var fileMenu = new Menu();
    var fileButton = new MenuButton('File', fileMenu);
    this.menubar_.addChild(fileButton, true /* optRender */);
    fileMenu.addChild(new ActionMenuItem(this.actions_.fileOpen), true /* optRender */);
    fileMenu.addChild(new ActionMenuItem(this.actions_.fileClose), true /* optRender */);
    fileMenu.addChild(new MenuSeparator(), true /* optRender */);
    var downloadAsMenu = new SubMenu('Download as');
    downloadAsMenu.setMnemonic(KeyCodes.D);
    downloadAsMenu.addItem(new ActionMenuItem(this.actions_.downloadAlignedFasta));
    downloadAsMenu.addItem(new ActionMenuItem(this.actions_.downloadClustal));
    this.menus_.downloadAs = downloadAsMenu;
    fileMenu.addChild(downloadAsMenu, true /* optRender */);
    this.menus_.file = fileMenu;

    var editMenu = new Menu();
    var editButton = new MenuButton('Edit', editMenu);
    this.menubar_.addChild(editButton, true /* optRender */);
    editMenu.addChild(new ActionMenuItem(this.actions_.editUndo), true /* optRender */);
    editMenu.addChild(new ActionMenuItem(this.actions_.editRedo), true /* optRender */);
    editMenu.addChild(new MenuSeparator(), true /* optRender */);
    editMenu.addChild(new ActionMenuItem(this.actions_.editExtendSequence), true /* optRender */);
    editMenu.addChild(new ActionMenuItem(this.actions_.editTrimSequence), true /* optRender */);
    editMenu.addChild(new MenuSeparator(), true /* optRender */);
    editMenu.addChild(new ActionMenuItem(this.actions_.editExtendRowsLeft), true /* optRender */);
    editMenu.addChild(new ActionMenuItem(this.actions_.editExtendRowsRight), true /* optRender */);
    editMenu.addChild(new ActionMenuItem(this.actions_.editLevelRowsLeft), true /* optRender */);
    editMenu.addChild(new ActionMenuItem(this.actions_.editLevelRowsRight), true /* optRender */);
    editMenu.addChild(new ActionMenuItem(this.actions_.editTrimRowsLeft), true /* optRender */);
    editMenu.addChild(new ActionMenuItem(this.actions_.editTrimRowsRight), true /* optRender */);
    editMenu.addChild(new ActionMenuItem(this.actions_.editCollapseLeft), true /* optRender */);
    editMenu.addChild(new ActionMenuItem(this.actions_.editCollapseRight), true /* optRender */);
    editMenu.addChild(new MenuSeparator(), true /* optRender */);
    editMenu.addChild(new ActionMenuItem(this.actions_.editRemoveAllGapColumns), true /* optRender */);
    editMenu.addChild(new MenuSeparator(), true /* optRender */);
    editMenu.addChild(new ActionMenuItem(this.actions_.editSelectAll), true /* optRender */);
    editMenu.addChild(new ActionMenuItem(this.actions_.editDeselectAll), true /* optRender */);
    this.menus_.edit = editMenu;

    var viewMenu = new Menu();
    var viewButton = new MenuButton('View', viewMenu);
    this.menubar_.addChild(viewButton, true /* optRender */);
    viewMenu.addChild(new ActionMenuItem(this.actions_.viewStartPositions), true /* optRender */);
    viewMenu.addChild(new ActionMenuItem(this.actions_.viewStopPositions), true /* optRender */);
    viewMenu.addChild(new ActionMenuItem(this.actions_.viewRuler), true /* optRender */);
    this.menus_.view = viewMenu;

    var toolsMenu = new Menu();
    var toolsButton = new MenuButton('Tools', toolsMenu);
    this.menubar_.addChild(toolsButton, true /* optRender */);
    toolsMenu.addChild(new ActionMenuItem(this.actions_.toolsSelect), true /* optRender */);
    toolsMenu.addChild(new ActionMenuItem(this.actions_.toolsHand), true /* optRender */);
    toolsMenu.addChild(new ActionMenuItem(this.actions_.toolsInsertGaps), true /* optRender */);
    this.menus_.tools = toolsMenu;

    var visualizationsMenu = new Menu();
    var visualizationsButton = new MenuButton('Visualizations', visualizationsMenu);
    this.menubar_.addChild(visualizationsButton, true /* optRender */);
    visualizationsMenu.addChild(new ActionMenuItem(this.actions_.visualizationsPlain), true /* optRender */);
    visualizationsMenu.addChild(new ActionMenuItem(this.actions_.visualizationsClustal), true /* optRender */);
    visualizationsMenu.addChild(new ActionMenuItem(this.actions_.visualizationsZappo), true /* optRender */);
    this.menus_.visualizations = visualizationsMenu;

    this.menubar_.render(this.els_.menubar);
};

/** @private */
AlignShop.prototype.setupSamples_ = function() {
    this.samplesDropDown_ = new DropDown();
    this.samplesDropDown_.decorate(dom.getElement('samples'));
};

/** @private */
AlignShop.prototype.setupSlots_ = function() {
    metaObject().connect(this.undoStack_, UndoStack.SignalType.CAN_REDO_CHANGED, this.actions_.editRedo, this.actions_.editRedo.setEnabled)
        .connect(this.undoStack_, UndoStack.SignalType.CAN_UNDO_CHANGED, this.actions_.editUndo, this.actions_.editUndo.setEnabled)

        .connect(this.gapTool_, GapMsaTool.SignalType.GAP_COLUMNS_INSERT_FINISHED, this, this.onMsaGapColumnsInsertFinished_)

        .connect(this.selectTool_, SelectMsaTool.SignalType.SLIDE_STARTED, this, this.onMsaSlideStarted_)
        .connect(this.selectTool_, SelectMsaTool.SignalType.SLIDE_FINISHED, this, this.onMsaSlideFinished_)

        .connect(this.selectTool_, SelectMsaTool.SignalType.SELECTION_FINISHED, this, this.enableDisableMsaActions_)

        .connect(this.samplesDropDown_, DropDown.SignalType.SELECTED, this, this.onSampleSelected_);
};

/** @private */
AlignShop.prototype.setupToolbar_ = function() {
    var toolbar = new Toolbar();
    var toolbarActions = [
        this.actions_.fileOpen,
        null,
        this.actions_.editUndo,
        this.actions_.editRedo,
        null,
        this.actions_.editRemoveAllGapColumns,
        null,
        this.actions_.toolsSelect,
        this.actions_.toolsHand,
        this.actions_.toolsInsertGaps
    ];
    for (var i=0, z=toolbarActions.length; i<z; i++) {
        var action = toolbarActions[i];
        var child = (action) ? new ActionToolbarButton(action) : new ToolbarSeparator();
        toolbar.addChild(child, true)
    }
    toolbar.render(this.els_.toolbar);
};

/** @private */
AlignShop.prototype.storeElementReferences_ = function() {
    var editor = dom.getElement('editor');
    this.els_ = {
        menubar: dom.getElement('menubar'),
        toolbar: dom.getElement('toolbar'),

        inputFile: this.createFileElement_(),

        editor: editor,
        labelView: dom.getElement('label-view'),
        msaView: dom.getElement('msa-view')
    };
};

/** @private */
AlignShop.prototype.updateEditorSize_ = function() {
    classes.enable(this.els_.editor, 'hidden', !goog.isDef(this.msa_));
    if (!this.msa_)
        return;

    var newEditorSize = this.vsm_.getSize();
    var editorPos = style.getClientPosition(this.els_.editor);
    newEditorSize.height = Math.max(AlignShop.Constants.MinHeight, newEditorSize.height - editorPos.y);
    this.splitPane_.setSize(newEditorSize);
};

// --------------------------------------------------------------------------------------------------------------------
// Private static methods
/** @private */
AlignShop.msaFromPods_ = function(pods) {
    var msa = new ObservableMsa();
    for (var i=0,z=pods.length; i<z; i++) {
        var pod = pods[i];
        var id = pod[0];
        var sequence = pod[1];
        var subseq = new Subseq(sequence);
        subseq.name = id;

        if (!msa.append(subseq)) {
            alert('Incompatible sequence: ' + id);
            return;
        }
    }
    return msa;
};

// --------------------------------------------------------------------------------------------------------------------
goog.exportSymbol('AlignShop', AlignShop);
goog.exportSymbol('AlignShop.prototype.run', AlignShop.prototype.run);

/*******************************************************************************************************************/});
