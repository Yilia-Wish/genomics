goog.provide('ag.bio.io.ClustalReader');

goog.require('ag.bio.io');
goog.require('ag.meta.MetaObject');

goog.require('goog.asserts');
goog.require('goog.events');
goog.require('goog.string');


// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 */
ag.bio.io.ClustalReader = function() {
    /**
     * @type {number}
     * @private
     */
    this.readPos_;

    /**
     * @type {string}
     * @private
     */
    this.buffer_;
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var events = goog.events;

var ClustalReader = ag.bio.io.ClustalReader;

var isWhiteSpace = ag.bio.io.isWhiteSpace;
var metaObject = ag.meta.MetaObject.getInstance;

// --------------------------------------------------------------------------------------------------------------------
/** @enum {string} */
ClustalReader.SignalType = {
    // read, total
    PROGRESS_CHANGED: events.getUniqueId('progress-changed')
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * Rules used to determine if buffer is in the Clustal format:
 * 1. All leading empty lines are ignored
 * 2. First non-whitespace characters should be CLUSTAL and be either the first few characters or the
 *    the appear just after a newline.
 *
 * @param {string} chunk
 * @return {boolean}
 */
ClustalReader.prototype.isCompatibleString = function(chunk) {
    if (!chunk)
        return false;

    var x = ag.bio.io.indexOfNonWhitespaceCharacter(chunk);
    return (x === 0 || (x > 0 && chunk[x-1] === '\n')) && chunk.substr(x, 7) === 'CLUSTAL';
};

/**
 * Does not use a regular expression for parsing.
 *
 * @param {string} buffer
 * @return {Array.<Array.<string>>}
 */
ClustalReader.prototype.parseString = function(buffer) {
    var x = ag.bio.io.indexOfNonWhitespaceCharacter(buffer);
    if (x === -1)
        throw "Empty file";

    this.readPos_ = x;
    this.buffer_ = buffer;

    // Read until we find the CLUSTAL header line
    var line = this.readNextLine_();
    assert(line);

    if (!goog.string.startsWith(line, 'CLUSTAL'))
        throw "Missing or invalid CLUSTAL header line";

    line = this.readNextLine_();
    if (/\S/.test(line)) {
        throw "A blank line must immediately follow the CLUSTAL header line";
    }

    // Maps id -> 1; used to check if this id has been observed before
    var idTable = {};
    var result;
    while (line) {
        if (!goog.string.trim(line) || ClustalReader.isConsensusLine_(line)) {
            line = this.readNextLine_();
            continue;
        }

        var block = [];
        var endOfBlock = false;
        var blockLength;
        while (!endOfBlock) {
            var matches = ClustalReader.parseAlignmentLine_(line);
            var isAlignmentLine = matches && matches[0];
            if (!isAlignmentLine) {
                // This line contains some non-Empty text. Either:
                // o Consensus line OR
                // o Junk line OR
                // o Malformed data line
                if (!ClustalReader.isConsensusLine_(line))
                    throw "malformed alignment line";
            }
            else {
                var id = matches[0];
                var gappedSequence = matches[1];
                var digits = 0;
                var leadingSpace = false;
                var spaces = 0;

                // Remove any terminal numbers that are preceded by a space
                var i = gappedSequence.length;
                while (i--) {
                    var ch = gappedSequence[i];
                    if (ag.bio.io.isDigit(ch))
                        ++digits;
                    else if (isWhiteSpace(ch)) {
                        ++spaces;
                        if (digits) {
                            leadingSpace = true;
                            break;
                        }
                    }
                }

                if (leadingSpace)
                    gappedSequence = ag.bio.io.chop(gappedSequence, digits + spaces);

                gappedSequence = goog.string.removeAll(gappedSequence, ' ');
                if (blockLength) {
                    if (gappedSequence.length !== blockLength)
                        throw "Alignments within block do not all have the same length";
                }
                else
                    blockLength = gappedSequence.length;

                block.push([id, gappedSequence]);
            }

            line = this.readNextLine_();
            endOfBlock = !line || goog.string.trim(line).length === 0;
            this.emitProgressChanged_();
        }

        // Process this block
        if (result) {
            if (block.length !== result.length)
                throw "Unequal number of sequences between blocks";

            // Make sure we have the same sequences in this block as in the previous blocks
            var i = result.length;
            while (i--) {
                var blockId = block[i][0];
                if (!idTable[blockId])
                    throw "Sequence identifiers are not the same between blocks";

                var previousId = result[i][0];
                if (previousId !== blockId)
                    throw "Sequence identifiers different (or in different order) from previous blocks";

                result[i][1] += block[i][1];
            }
        }
        else {
            result = block;

            var i = result.length;
            while (i--)
                idTable[result[i][0]] = 1;
        }

        line = this.readNextLine_();
        this.emitProgressChanged_();
    }

    this.buffer_ = '';

    if (result.length === 0)
        throw "No sequences found";

    return result;
};

// --------------------------------------------------------------------------------------------------------------------
// Private methods
/** @private */
ClustalReader.prototype.emitProgressChanged_ = function() {
    metaObject().emit(this, ClustalReader.SignalType.PROGRESS_CHANGED, this.readPos_, this.buffer_.length);
};

/**
 * @return {string|undefined}
 * @private
 */
ClustalReader.prototype.readNextLine_ = function() {
    if (this.readPos_ >= this.buffer_.length)
        return;

    var a = this.buffer_.indexOf('\n', this.readPos_);
    var line;
    if (a >= 0) {
        line = this.buffer_.substr(this.readPos_, a-this.readPos_+1);
        this.readPos_ = a+1;
    }
    else {
        line = this.buffer_.substr(this.readPos_);
        this.readPos_ = this.buffer_.length;
    }
    return line;
};



// --------------------------------------------------------------------------------------------------------------------
// Private static methods
/**
 * Equivalent to the following regular expression: ^\\s+[.:*](?:\\s|[.:*])+$
 *
 * @param {string} [optLine]
 * @return {boolean}
 * @private
 */
ClustalReader.isConsensusLine_ = function(optLine) {
    if (!optLine)
        return false;

    // Does the line begin with at least one space
    if (!isWhiteSpace(optLine[0]))
        return false;

    var hasConsensusChar = false;
    for (var i=1, z=optLine.length; i<z; i++) {
        var ch = optLine[i];
        if (isWhiteSpace(ch))
            continue;

        if (ch === '.' || ch === ':' || ch === '*') {
            hasConsensusChar = true;
            continue;
        }

        // All other characters indicate this is not a consensus line
        return false;
    }

    return hasConsensusChar;
};

/**
 * Equivalent to the regular expression: ^(\\S+)\\s+(\\S.*)
 *
 * If a match was not found, the first string in the pair will be empty.
 *
 * @param {string} [optLine]
 * @return {Array.<string>}
 * @private
 */
ClustalReader.parseAlignmentLine_ = function(optLine) {
     var matches = Array(2);
     if (!optLine)
        return matches;

    // Must begin with a non-space character
    if (isWhiteSpace(optLine[0]))
        return matches;

    // Parse out the identifier
    var x = 1;  // Skip the character we already checked
    while (optLine[x] && !isWhiteSpace(optLine[x]))
        ++x;

    matches[0] = optLine.substr(0, x);

    // Skip all the following whitespace
    while (optLine[x] && isWhiteSpace(optLine[x]))
        ++x;

    // If at the end of the line, no alignment section is present, return null
    if (!optLine[x])
        return [];

    matches[1] = goog.string.trim(optLine.substr(x));

    // var start = x;
    // while (line[x] && !isWhiteSpace(line[x]))
    //     ++x;

    // matches[1] = line.substr(start, x - start + 1);

    return matches;
};


/*******************************************************************************************************************/});
