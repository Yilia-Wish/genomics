goog.provide('ag.bio.io.FastaMsaWriter');

goog.require('ag.bio.io.MsaWriter');

/**
 * @constructor
 * @extends {ag.bio.io.MsaWriter}
 */
ag.bio.io.FastaMsaWriter = function() {
};
goog.inherits(ag.bio.io.FastaMsaWriter, ag.bio.io.MsaWriter);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var FastaMsaWriter = ag.bio.io.FastaMsaWriter;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * @param {ag.bio.Msa} msa
 * @return {string}
 */
FastaMsaWriter.prototype.exportMsa = function(msa) {
    var result = '';
    for (var i=1, z=msa.rowCount(); i<=z; i++) {
        var subseq = msa.at(i);
        result += '>' + subseq.name + '\n' + subseq.toString() + '\n';
    }
    return result;
};

/** @return {string} */
FastaMsaWriter.prototype.extension = function() {
    return 'afa';
};

/*******************************************************************************************************************/});
