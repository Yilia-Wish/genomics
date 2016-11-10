goog.provide('ag.core.CharCodes');

/** @enum {number} */
ag.core.CharCodes = {};

for (var i=0; i<128; i++) {
    var letter = String.fromCharCode(i);
    if (letter)
        ag.core.CharCodes[letter] = i;
};