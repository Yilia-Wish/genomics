goog.provide('ag.graphics.ClustalAminoSymbolGroup');

goog.require('ag.bio.BioSymbolGroup');
goog.require('ag.bio.BioSymbol');

ag.graphics.ClustalAminoSymbolGroup = new ag.bio.BioSymbolGroup();

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var BioSymbol = ag.bio.BioSymbol;
var ClustalAminoSymbolGroup = ag.graphics.ClustalAminoSymbolGroup;

ClustalAminoSymbolGroup.add(new BioSymbol('%', "WLVIMAFCYHP", .6))
    .add(new BioSymbol('#', "WLVIMAFCYHP", .8))
    .add(new BioSymbol('-', "DE", .5))
    .add(new BioSymbol('+', "KR", .6))
    .add(new BioSymbol('g', "G", .5))
    .add(new BioSymbol('n', "N", .5))
    .add(new BioSymbol('q', "QE", .5))
    .add(new BioSymbol('p', "P", .5))
    .add(new BioSymbol('t', "ST", .5))
    .add(new BioSymbol('A', "A", .85))
    .add(new BioSymbol('C', "C", .85))
    .add(new BioSymbol('D', "D", .85))
    .add(new BioSymbol('E', "E", .85))
    .add(new BioSymbol('F', "F", .85))
    .add(new BioSymbol('G', "G", .85))
    .add(new BioSymbol('H', "H", .85))
    .add(new BioSymbol('I', "I", .85))
    .add(new BioSymbol('K', "K", .85))
    .add(new BioSymbol('L', "L", .85))
    .add(new BioSymbol('M', "M", .85))
    .add(new BioSymbol('N', "N", .85))
    .add(new BioSymbol('P', "P", .85))
    .add(new BioSymbol('Q', "Q", .85))
    .add(new BioSymbol('R', "R", .85))
    .add(new BioSymbol('S', "S", .85))
    .add(new BioSymbol('T', "T", .85))
    .add(new BioSymbol('V', "V", .85))
    .add(new BioSymbol('W', "W", .85))
    .add(new BioSymbol('Y', "Y", .85));


/*******************************************************************************************************************/});

