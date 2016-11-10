goog.provide('ag.bio.io.FastaReader');

goog.require('ag.bio.io');

goog.require('goog.asserts');
goog.require('goog.string');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 */
ag.bio.io.FastaReader = function() {
    // --------------------------------------------------------------------------------------------------------------------
    // Private members
    /**
     * @type {string}
     * @private
     */
    this.buffer_;

    /**
     * Current location within the buffer,
     *
     * @type {number}
     * @private
     */
    this.pos_;
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var string = goog.string;

var FastaReader = ag.bio.io.FastaReader;

var isWhiteSpace = ag.bio.io.isWhiteSpace;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * Rules used to determine if chunk is in the FASTA format:
 * 1. All leading empty lines are ignored
 * 2. First non-whitespace character should be a greater than symbol '>' and be either the first character or the
 *    the first character after a newline.
 *
 * @param {string} chunk
 * @return {boolean}
 */
FastaReader.prototype.isCompatibleString = function(chunk) {
    if (!chunk)
        return false;

    for (var i = 0, z=chunk.length; i<z; i++) {
        var ch = chunk[i];
        if (!isWhiteSpace(ch)) {
            if (ch === '>' && (i === 0 || chunk[i-1] === '\n'))
                return true;

            return false;
        }
    }

    return false;
};

/**
 * Reads the next sequence in the buffer and returns it if there is any.
 *
 * @return {Array.<string>}
 */
FastaReader.prototype.next = function() {
    var buffer = this.buffer_;
    if (!buffer)
        return null;

    var pos = this.pos_;
    var a = buffer.indexOf('\n>', pos);
    if (a !== -1) {
        var header = '';
        var headerTo = buffer.indexOf('\n', pos);
        if (headerTo !== -1)
            header = string.trim(buffer.substr(pos, headerTo - pos));

        var sequence = '';
        if (a !== headerTo)
            sequence = buffer.substr(headerTo + 1, a - headerTo - 1);

        // pos points to the beginning of the \n> search sequence. Thus, we set the next search to begin
        // two characters beyond this point.
        this.pos_ = a + 2;

        return [header, sequence];
    }

    // Process the last sequence
    var header = '';
    var sequence = '';
    var headerTo = buffer.indexOf('\n', pos);
    if (headerTo !== -1) {  // A newline (and consequently header text is present) was found within the buffer
        header = buffer.substr(pos, headerTo - pos);
        if (headerTo !== buffer.length - 1)
            sequence = buffer.substr(headerTo + 1);
    }
    else if (buffer.length > 1)
        // There is no newline in the buffer. Thus, this record consists solely of a header
        header = buffer.substr(pos);

    this.buffer_ = null;
    this.pos_ = 0;

    return [string.trim(header), sequence];
};

/**
 * Replaces the internal buffer with newBuffer.
 *
 * @param {string} newBuffer
 */
FastaReader.prototype.setBuffer = function(newBuffer) {
    var firstCaretPos = newBuffer.indexOf('>');
    if (firstCaretPos === -1)
        throw Error('FASTA data does not contain the header symbol, >');

    if (firstCaretPos > 0 && newBuffer[firstCaretPos-1] !== '\n')
        throw Error('The first non-whitespace character must be the > symbol');

    this.buffer_ = string.trim(newBuffer);
    assert(this.buffer_[0] === '>');
    this.pos_ = 1;
};

/*******************************************************************************************************************/});
