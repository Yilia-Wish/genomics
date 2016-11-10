goog.provide('ag.bio.io');

goog.require('goog.asserts');

/**
 * @param {string} string
 * @param {number} nToRemove
 * @return {string}
 */
ag.bio.io.chop = function(string, nToRemove) {
    goog.asserts.assert(nToRemove >= 0);
    goog.asserts.assert(string.length >= nToRemove);

    return string.substr(0, string.length - nToRemove);
};

/**
 * @param {string} ch
 * @return {boolean}
 */
ag.bio.io.isWhiteSpace = function(ch) {
    switch (ch) {
    case ' ':
    case '\n':
    case '\t':
    case '\r':
    case '\f':
    case '\v':
        return true;

    default:
        return false;
    }
};

/**
 * @param {string} ch
 * @return {boolean}
 */
ag.bio.io.isDigit = function(ch) {
    goog.asserts.assert(ch.length === 1);

    return ch >= '0' && ch <= '9';
};

/**
 * If string is empty or entirely whitespace, then -1 is returned.
 *
 * @param {string} string
 * @return {number}
 */
ag.bio.io.indexOfNonWhitespaceCharacter = function(string) {
    if (!string)
        return -1;

    var i = 0;
    while (ag.bio.io.isWhiteSpace(string[i]))
        ++i;

    return string[i] ? i : -1;
};