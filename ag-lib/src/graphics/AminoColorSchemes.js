goog.provide('ag.graphics.AminoColorSchemes');

goog.provide('ag.graphics.ClustalAminoColorScheme');
goog.provide('ag.graphics.ZappoAminoColorScheme');

goog.require('ag.core.CharCodes');
goog.require('ag.graphics.CharColorScheme');
goog.require('ag.graphics.SymbolColorScheme');

ag.graphics.ClustalAminoColorScheme = new ag.graphics.SymbolColorScheme();
ag.graphics.ZappoAminoColorScheme = new ag.graphics.CharColorScheme();

// .1  1a
// .2  33
// .3  4d
// .4  66
// .5  80
// .6  99
// .7  b3
// .8  cc
// .9  e6

//         RRGGBB
/** @enum {string} */
ag.graphics.AminoColorSchemes.Colors = {
    black: '000000',
    red: 'e6331a',
    blue: '1a80e6',
    green: '1acc1a',
    cyan: '1ab3b3',
    pink: 'e68080',
    magenta: 'cc4dcc',
    yellow: 'cccc00',
    orange: 'e6994d',
    peach: 'ffafaf',
    yellowOrange: 'ffc800',
    bluePurple: '6464ff'
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var CharCodes = ag.core.CharCodes;
var Colors = ag.graphics.AminoColorSchemes.Colors;

var ClustalAminoColorScheme = ag.graphics.ClustalAminoColorScheme;
var ZappoAminoColorScheme = ag.graphics.ZappoAminoColorScheme;

// Clustal
// ClustalAminoColorScheme.setColors('G'.charCodeAt(0), Colors.black + Colors.orange)
    // .setColors('P'.charCodeAt(0), Colors.black + Colors.yellow);
ClustalAminoColorScheme.setColors(CharCodes['G'], Colors.black + Colors.orange)
    .setColors(CharCodes['P'], Colors.black + Colors.yellow);
ClustalAminoColorScheme.setSymbolColors(CharCodes['T'], 'tST%#', Colors.black + Colors.green)
    .setSymbolColors(CharCodes['S'], "tST#", Colors.black + Colors.green)
    .setSymbolColors(CharCodes['N'], "nND", Colors.black + Colors.green)
    .setSymbolColors(CharCodes['Q'], "qQE+KR", Colors.black + Colors.green)
    .setSymbolColorsForChars('WLVIMFC', "%#ACFHILMVWYPp", Colors.black + Colors.blue)
    .setSymbolColorsForChars('HY', "%#ACFHILMVWYPp", Colors.black + Colors.cyan)
    .setSymbolColorsForChars('DE', "-DEqQ", Colors.black + Colors.magenta)
    .setSymbolColorsForChars('KR', "+KRQ", Colors.black + Colors.red)
    .setSymbolColors(CharCodes['A'], "%#ACFHILMVWYPpTSsG", Colors.black + Colors.blue)
    .setSymbolColors(CharCodes['C'], "C", Colors.black + Colors.pink)

// Zappo
ZappoAminoColorScheme.setColorsForChars('ILVAM', Colors.black + Colors.peach)
    .setColorsForChars('FWY', Colors.black + Colors.yellowOrange)
    .setColorsForChars('KRH', Colors.black + Colors.bluePurple)
    .setColorsForChars('DE', Colors.black + Colors.red)
    .setColorsForChars('STNQ', Colors.black + Colors.green)
    .setColorsForChars('PG', Colors.black + Colors.magenta)
    .setColors(CharCodes['C'], Colors.black + Colors.yellow);

/*******************************************************************************************************************/});
