goog.provide('ag.bio.io.ClustalWriter');

goog.require('ag.bio.io.MsaWriter');

/**
 * @constructor
 * @extends {ag.bio.io.MsaWriter}
 */
ag.bio.io.ClustalWriter = function() {
};
goog.inherits(ag.bio.io.ClustalWriter, ag.bio.io.MsaWriter);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;

var ClustalWriter = ag.bio.io.ClustalWriter;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
ClustalWriter.prototype.exportMsa = function(msa) {
    var targetLength = ClustalWriter.lengthOfLongestName_(msa);

    var result = 'CLUSTALW - AlignShop\n\n';
    for (var i=1, z=msa.rowCount(); i<=z; i++) {
        var subseq = msa.at(i);
        result += ClustalWriter.paddedName_(subseq.name, targetLength) + ' ' +
            subseq.toString() + '\n';
    }
    return result;
};

/** @override */
ClustalWriter.prototype.extension = function() {
    return 'aln';
};

// --------------------------------------------------------------------------------------------------------------------
// Private static methods
/**
 * @param {ag.bio.Msa} msa
 * @return {number}
 */
ClustalWriter.lengthOfLongestName_ = function(msa) {
    var longest = 0;
    for (var i=1, z=msa.rowCount(); i<=z; i++) {
        var name = msa.at(i).name;
        if (name.length > longest)
            longest = name.length;
    }
    return longest;
};

/**
 * @param {string} name
 * @param {number} targetLength
 * @return {string}
 */
ClustalWriter.paddedName_ = function(name, targetLength) {
    return name + ' '.repeated(targetLength - name.length);
};

/*******************************************************************************************************************/});
