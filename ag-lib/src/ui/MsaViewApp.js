goog.provide('MsaViewApp');

goog.require('ag.ui.MsaView');
goog.require('ag.ui.SingleImageMsaView');
goog.require('ag.bio.ObservableMsa');
goog.require('ag.bio.Subseq');

goog.require('ag.bio.MsaCharCountDistribution');
goog.require('ag.service.LiveSymbolString');
goog.require('ag.graphics.ClustalAminoColorScheme');
goog.require('ag.graphics.ClustalAminoSymbolGroup');
goog.require('ag.graphics.SymbolColorProvider');
goog.require('ag.service.SymbolStringCalculator');

MsaViewApp = function() {};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var MsaView = ag.ui.MsaView;
var SingleImageMsaView = ag.ui.SingleImageMsaView;
var ObservableMsa = ag.bio.ObservableMsa;
var Subseq = ag.bio.Subseq;

var MsaCharCountDistribution = ag.bio.MsaCharCountDistribution;
var LiveSymbolString = ag.service.LiveSymbolString;
var ClustalAminoColorScheme = ag.graphics.ClustalAminoColorScheme;
var ClustalAminoSymbolGroup = ag.graphics.ClustalAminoSymbolGroup;
var SymbolColorProvider = ag.graphics.SymbolColorProvider;
var SymbolStringCalculator = ag.service.SymbolStringCalculator;

MsaViewApp.prototype.launch = function(element, subseqs) {
    var msa = new ObservableMsa();
    for (var i=0,z=subseqs.length; i<z; i++)
        msa.append(new Subseq(subseqs[i]));

    var calculator = new SymbolStringCalculator(ClustalAminoSymbolGroup);
    var dist = new MsaCharCountDistribution(msa);
    var liveSymbolString = new LiveSymbolString(dist, calculator);
    var colorProvider = new SymbolColorProvider(liveSymbolString, ClustalAminoColorScheme);

    var y = new SingleImageMsaView();
    y.setColorProvider(colorProvider);

    y.decorate(element);
    y.setMsa(msa);
    y.setSize(new goog.math.Size(1200, 600));
};

goog.exportSymbol('MsaViewApp', MsaViewApp);
goog.exportSymbol('MsaViewApp.prototype.launch', MsaViewApp.prototype.launch);

/*******************************************************************************************************************/});
