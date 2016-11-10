goog.provide('ag.bio.io.MsaWriter');

/**
 * @constructor
 */
ag.bio.io.MsaWriter = function() {};

/**
 * @param {ag.bio.Msa} msa
 * @return {string}
 */
ag.bio.io.MsaWriter.prototype.exportMsa = goog.abstractMethod;

/** @return {string} */
ag.bio.io.MsaWriter.prototype.extension = goog.abstractMethod;
