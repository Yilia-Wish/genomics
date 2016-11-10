goog.provide('ag.bio.BioString');

goog.require('goog.array');
goog.require('goog.asserts');

goog.require('ag');
goog.require('ag.bio');
goog.require('ag.bio.grammar');
goog.require('ag.util');
goog.require('ag.core.ClosedIntRange');

/**
 * @constructor
 * @param {string|ag.bio.BioString} [optString]
 * @param {ag.bio.grammar} [optGrammar]; ignored if optString is a BioString
 */
ag.bio.BioString = function(optString, optGrammar) {
    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.bio.grammar}
     * @protected
     */
    this.grammar_ = ag.bio.grammar.UNKNOWN;

    /**
     * @type {number}
     * @protected
     */
    this.length_ = 0;

    /**
     * @type {Uint8Array}
     * @protected
     */
    this.buffer_ = new Uint8Array(0);


    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    if (optString instanceof ag.bio.BioString) {
        this.copyConstructor_(optString);
    }
    else {
        if (goog.isDefAndNotNull(optGrammar))
            this.grammar_ = optGrammar;
        if (goog.isString(optString))
            this.setString_(optString);
            //   ^^^^^^^^^^ Note: we are calling the protected setString. This is to allow us to perform
            // necessary initialization, yet provide for subclasses (e.g. Subseq) to override the public
            // setString method.
    }
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;

var bio = ag.bio;
var grammar = ag.bio.grammar;
var util = ag.util;
var BioString = ag.bio.BioString;
var ClosedIntRange = ag.core.ClosedIntRange;

// Specific method alias
var isGapCharacterCode = bio.isGapCharacterCode;

// --------------------------------------------------------------------------------------------------------------------
// Constants
/** @const {number} */
BioString.APPLY_ARGUMENT_LIMIT = 100;

/** @type {Uint8Array} */
BioString.SWAP_BUFFER = new Uint8Array(512);

/** @type {boolean} */
BioString.IGNORE_QUERY_GAPS = true;

// --------------------------------------------------------------------------------------------------------------------
// Pseudo serialization
/**
 * @param {Object} object
 * @return {BioString}
 */
BioString.fromSerialObject = function(object) {
    return new BioString(object['sequence'], object['grammar']);
};

/** @return {Object} */
BioString.prototype.toSerialObject = function() {
    return {
        '_type': 'BioString',
        'sequence': this.toString(),
        'grammar': this.grammar_
    };
};


// --------------------------------------------------------------------------------------------------------------------
// Static functions
/**
 * @param {string} string
 * @return {string}
 */
BioString.removeGapsFromString = function(string) {
    // OPTIMIZE: Use while loop with indexOf calls
    return string.replace(/[-\.]/g, '');
};

// --------------------------------------------------------------------------------------------------------------------
// Alternative constructors
/**
 * Copy constructor
 *
 * @param {ag.bio.BioString} other
 * @protected
 */
BioString.prototype.copyConstructor_ = function(other) {
    this.buffer_ = new Uint8Array(other.buffer_);
    this.length_ = other.length_;
    this.grammar_ = other.grammar_;
};

// --------------------------------------------------------------------------------------------------------------------
// Operators
/**
 * @param {BioString} other
 * @return {boolean}
 */
BioString.prototype.eq = function(other) {
    if (this.grammar_ !== other.grammar_ || this.length_ !== other.length_)
        return false;

    // Check all characters
    for (var i=0, z=this.length_; i<z; i++)
        if (this.buffer_[i] !== other.buffer_[i])
            return false;

    return true;
};

/**
 * @param {BioString} other
 * @return {boolean}
 */
BioString.prototype.ne = function(other) {
    return !this.eq(other);
};


// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * @param {string} string
 * @return {BioString}
 */
BioString.prototype.append = function(string) {
    return this.insert(this.length_ + 1, string);
};

/**
 * @param {number} position 1-based
 * @return {number}
 */
BioString.prototype.at = function(position) {
    assert(this.isValidPosition(position), 'BioString.at() - position out of range');
    return this.buffer_[position-1];
};

/**
 * @return {BioString}
 */
BioString.prototype.backTranscribe = function() {
    var dna = new BioString(this.toString(), grammar.DNA);
    dna.tr("Uu", "Tt");
    return dna;
};

/**
 * Returns the maximum number of bytes that can be stored without requiring the internal buffer to re-allocate another
 * block of memory.
 *
 * @return {number}
 */
BioString.prototype.capacity = function() {
  return this.buffer_.length - this.length_;
};

/**
 * Removes n characters from the right terminus of the string.
 *
 * @param {number} n
 */
BioString.prototype.chop = function(n) {
    assert(n >= 0, 'n must be greater than or equal to zero');
    if (n)
        this.remove(this.length_ - n + 1, n);
};

/** @return {BioString} */
BioString.prototype.clear = function() {
    if (this.length_ > 0)
        return this.remove(1, this.length_);

    return this;
};

/**
 * @param {ClosedIntRange} range
 * @return {ClosedIntRange}
 */
BioString.prototype.collapseLeft = function(range) {
    assert(this.isValidRange(range), 'BioString.collapseLeft() - range out of range');

    // Cache buffer
    var buffer = this.buffer_;

    // Find first gap
    var firstGap = -1;
    for (var i=range.begin-1; i < range.end; i++) {
        if (isGapCharacterCode(buffer[i])) {
            firstGap = i+1;
            break;
        }
    }

    if (firstGap === -1)
        return new ClosedIntRange();

    var affectedRange = null;
    var swapVar;
    var gapPos = firstGap - 1;
    var yPos = gapPos + 1;  // There is no point in checking that the firstGap character is not a gap character since we already
                            // know this. Furthermore, that is why i is incremented by 1 in the initialization of the following
                            // for loop
    for (var i=firstGap + 1; i<=range.end; i++, yPos++) {
        var yChar = this.buffer_[yPos];
        if (!isGapCharacterCode(yChar)) {
            swapVar = buffer[gapPos];
            buffer[gapPos] = yChar;
            buffer[yPos] = swapVar;

            gapPos++;

            if (!affectedRange)
                affectedRange = new ClosedIntRange(firstGap);
            affectedRange.end = i;
        }
    }

    return affectedRange ? affectedRange : new ClosedIntRange();
};

/**
 * @param {ClosedIntRange} range
 * @return {ClosedIntRange}
 */
BioString.prototype.collapseRight = function(range) {
    assert(this.isValidRange(range), 'BioString.collapseRight() - range out of range');

    // Cache buffer
    var buffer = this.buffer_;

    // Find first gap
    var firstGap = -1;
    for (var i=range.end; i >= range.begin; i--) {
        if (isGapCharacterCode(buffer[i-1])) {
            firstGap = i;
            break;
        }
    }

    if (firstGap === -1)
        return new ClosedIntRange();

    var affectedRange = null;
    var swapVar;
    var gapPos = firstGap - 1;
    var yPos = gapPos - 1;      // There is no point in checking that the firstGap character is not a gap character since we already
                                // know this. Furthermore, that is why i is decremented by 1 in the initialization of the following
                                // for loop
    for (var i=firstGap - 1; i >= range.begin; i--, yPos--) {
        var yChar = this.buffer_[yPos];
        if (!isGapCharacterCode(yChar)) {
            swapVar = buffer[gapPos];
            buffer[gapPos] = yChar;
            buffer[yPos] = swapVar;

            gapPos--;

            if (!affectedRange)
                affectedRange = new ClosedIntRange(firstGap);
            affectedRange.begin = i;
        }
    }

    return affectedRange ? affectedRange : new ClosedIntRange();
};

/**
  * Uses the following complement rules:
  *
  * Symbol      A   B   C   D   G   H   K   M   S   T   V   W   N
  * Complement  T   V   G   H   C   D   M   K   S*  A   B   W*  N*
  *
  * Source: http://www.chem.qmul.ac.uk/iubmb/misc/naseq.html
  *
  * @return {BioString}
  */
BioString.prototype.complement = function() {
    var dna = this.copy();
    dna.tr("ABCDGHKMTVabcdghkmtv", "TVGHCDMKABtvghcdmkab");
    return dna;
};

/**
 * Does not really return a const because no such thing exist in Javascript; however, it conveys the notion
 * that you better not tweak the data returned!
 *
 * @return {Uint8Array}
 */
BioString.prototype.constBuffer = function() {
    return this.buffer_;
};

/**
 * Creates a new copy of this object
 * @return {ag.bio.BioString}
 */
BioString.prototype.copy = function() {
    return new BioString(this);
};

/**
 * Returns the number of times string occurs in this BioString. The number returned may include overlaps.
 *
 * @param {string|BioString} string
 * @return {number}
 */
BioString.prototype.count = function(string) {
    assert(goog.isString(string) || (string && string instanceof BioString));

    var len = 0;
    var stringBuffer = null;
    if (!goog.isString(string)) {
        // This is a bioString object and since we are the bioString class, we can access it's
        // private members.
        len = string.length_;
        stringBuffer = string.buffer_;
    }
    else {
        len = string.length;
        stringBuffer = BioString.typedArrayFromString_(string);
    }

    var n = 0;
    var from = this.indexOfTypedArrayString_(stringBuffer, len, 1);
    while (from != -1) {
        n++;
        from = this.indexOfTypedArrayString_(stringBuffer, len, from+1);
    }
    return n;
};

/**
 * Returns an array of ClosedIntRanges denoting the specific locations that bioString occurs within this BioString.
 *
 * @param {BioString} bioString
 * @return {Array.<ClosedIntRange>}
 */
BioString.prototype.findLocationsOf = function(bioString) {
    var len = bioString.length_;
    var matches = [];
    var from = 0;
    while (true) {
        from = this.indexOf(bioString, from + 1);
        if (from == -1)
            break;

        matches.push(new ClosedIntRange(from, from + len - 1));
    }
    return matches;
};

/**
  * @param {ClosedIntRange} range
  * @returns int
  */
BioString.prototype.gapsBetween = function(range) {
    assert(this.isValidRange(range), 'BioString.gapsBetween() - invalid range');

    var nGaps = 0;
    for (var i=range.begin-1; i< range.end; i++)
        if (isGapCharacterCode(this.buffer_[i]))
            nGaps++;

    return nGaps;
};

/**
 * Does not consider the sequence character at position.
 *
 * @param {number} position
 * @return {number}
 */
BioString.prototype.gapsLeftOf = function(position) {
    assert(this.isValidPosition(position), 'BioString.gapsLeftOf() - position out of range');

    var nGaps = 0;
    var buffer = this.buffer_;
    // Find correct index in char data:
    // -1 because BioString is 1-based but, the char data is zero-based
    // -1 because we are ignoring the character at position
    for (var i=position-1-1; i >= 0 && isGapCharacterCode(buffer[i]); --i)
        ++nGaps;

    return nGaps;
};

/**
 * Does not consider the sequence character at position.
 *
 * @param {number} position
 * @return {number}
 */
BioString.prototype.gapsRightOf = function(position) {
    assert(this.isValidPosition(position), 'BioString.gapsRightOf() - position out of range');

    var nGaps = 0;
    var buffer = this.buffer_;
    // Find correct index in char data:
    // -1 because BioString is 1-based but, the char data is zero-based
    // -1 because we are ignoring the character at position
    for (var i=position, z=this.length_; i < z && isGapCharacterCode(buffer[i]); i++)
        ++nGaps;

    return nGaps;
};

/** @return {grammar} */
BioString.prototype.grammar = function() {
    return this.grammar_;
};

/**
  * @param {number} position
  * @return {boolean}
  */
BioString.prototype.hasGapAt = function(position) {
    assert(this.isValidPosition(position), 'BioString.hasGapAt() - position out of range');

    return isGapCharacterCode(this.buffer_[position-1]);
};

/** @return {boolean} */
BioString.prototype.hasGaps = function() {
    var buffer = this.buffer_;
    for (var i=0, z=this.length_; i<z; i++)
        if (isGapCharacterCode(buffer[i]))
            return true;

    return false;
};

/** @return {boolean} */
BioString.prototype.hasNonGaps = function() {
    var buffer = this.buffer_;
    for (var i=0, z=this.length_; i<z; i++)
        if (!isGapCharacterCode(buffer[i]))
            return true;

    return false;
};

/** @return {number} */
BioString.prototype.headGaps = function() {
    var nGaps = 0;
    var buffer = this.buffer_;
    for (var i=0, z=this.length_; i<z; i++) {
        if (!isGapCharacterCode(buffer[i]))
            break;
        nGaps++;
    }
    return nGaps;
};

/**
 * @param {string|BioString} string
 * @param {number=} optFrom defaults to 1
 * @return {number}
 */
BioString.prototype.indexOf = function(string, optFrom) {
    assert(goog.isString(string) || string instanceof BioString);
    if (this.length_ === 0)
        return -1;

    var from = goog.isNumber(optFrom) ? optFrom : 1;
    assert(this.isValidPosition(from), 'BioString.indexOf() - invalid from');

    return (goog.isString(string))
        ? this.indexOfPureString_(string, from)
        : this.indexOfTypedArrayString_(string.buffer_, string.length(), from);
};

/**
  * Specifically, the valid range is 1..n+1, where n = length of BioString. Insertion is done at the given index, not
  * after the character at this index.
  *
  * ABCDEF
  * insert(1, "XYZ") -> XYZABCDEF
  * insert(6, "---") -> ABCDE---F
  * insert(7, "..")  -> ABCDEF..
  *
  * @param {number} position
  * @param {string} string
  * @return {BioString}
  */
BioString.prototype.insert = function(position, string) {
    assert(position >= 1 && position <= this.length_ + 1, 'BioString.insert() - position out of range');
    var len = string.length;
    if (len === 0)
        return this;

    this.insertSpacing_(position, len);
    this.copyString_(string, position);
    return this;
};

/**
  * The valid range for position is 1..n+1, where n = length of BioString. Insertion is done at the given index, not
  * after the character at this index.
  *
  * Examples:
  * ABCDEF
  * insertGaps(1, 2) -> --ABCDEF
  * insertGaps(3, 0) -> ABCDEF
  *
  * @param {number} position
  * @param {number} nGaps
  * @param {string=} optGapChar defaults to -
  * @return {BioString}
  */
BioString.prototype.insertGaps = function(position, nGaps, optGapChar) {
    var gapCharCode = goog.isString(optGapChar) && optGapChar.length > 0 ? optGapChar.charCodeAt(0) : bio.DEFAULT_GAP_CHARCODE;
    assert(position >= 1 && position <= this.length_ + 1, 'BioString.insertGaps() - position out of range');
    assert(nGaps >= 0, 'BioString.insertGaps() - nGaps must be at least 0');

    if (nGaps > 0) {
        this.insertSpacing_(position, nGaps);
        for (var i=position - 1, z=i+nGaps; i< z; i++)
            this.buffer_[i] = gapCharCode;
    }

    return this;
};

/** @return {boolean} */
BioString.prototype.isEmpty = function() {
    return this.length_ === 0;
};

/** @return {boolean} */
BioString.prototype.isPalindrome = function() {
    return this.length_ > 0 &&
           this.length_ % 2 === 0 &&
           !this.hasGaps() &&
           this.eq(this.reverseComplement());
};

/**
  * @param {number} position
  * @return {boolean}
  */
BioString.prototype.isValidPosition = function(position) {
    return position >= 1 && position <= this.length_;
};

/**
 * @param {ClosedIntRange} range
 * @return {boolean}
 */
BioString.prototype.isValidRange = function(range) {
    return range.begin >= 1 &&
        range.begin <= range.end &&
        range.end <= this.length_;
};

/**
 * @param {string|BioString} string
 * @param {number=} from defaults to 1
 * @return {number}
 */
BioString.prototype.lastIndexOf = function(string, from) {
    if (this.length_ === 0)
        return -1;

    assert(goog.isString(string) || (string && string instanceof BioString));
    from = goog.isNumber(from) ? from : this.length_;
    assert(this.isValidPosition(from), 'BioString.indexOf() - invalid from');

    var len = 0;
    var stringBuffer = null;
    if (!goog.isString(string)) {
        // This is a bioString object and since we are the bioString class, we can access it's
        // private members.
        len = string.length_;
        stringBuffer = string.buffer_;
    }
    else {
        len = string.length;
        stringBuffer = BioString.typedArrayFromString_(string);
    }

    from = Math.min(from, this.length_ - len + 1);

    // from < 1 indicates that the pattern to search for is longer than the length of this bioString.
    if (len === 0 || from < 1)
        return -1;

    // Cache local buffer
    var buffer = this.buffer_;

    for (var i=from-1; i>=0; i--) {
        for (var j=0; j<len; j++) {
            if (buffer[i+j] !== stringBuffer[j])
                break;
            if (j === len - 1)
                return i+1;
        }
    }
    return -1;
};

/**
 * @param {ClosedIntRange} range
 * @return {number}
 */
BioString.prototype.leftSlidablePositions = function(range) {
    assert(this.isValidRange(range), 'BioString.leftSlidablePositions() - range out of range');

    // If range consists entirely of gaps, it should be able to slide fully left or right
    return this.nonGapsBetween(range) ? this.gapsLeftOf(range.begin) : range.begin - 1;
};

/** @return {number} */
BioString.prototype.length = function() {
    return this.length_;
};

/**
 * This method differs from indexOf in that the match has to occur beginning at position. The comparison stops at the
 * first non-matching character, rather than continuing to look for other matches. Empty bioString inputs always return
 * false. If the supplied bioString contains solely gaps and optIgnoreQueryGaps is true, false is returned.
 *
 * @param {number} position
 * @param {BioString} bioString
 * @param {boolean=} optIgnoreQueryGaps defaults to false; refers to gaps within the supplied bioString argument
 * @return {boolean}
 */
BioString.prototype.matchesAt = function(bioString, position, optIgnoreQueryGaps) {
    assert(this.isValidPosition(position), 'position out of range');
    var ignoreQueryGaps = goog.isDef(optIgnoreQueryGaps) ? optIgnoreQueryGaps : false;

    // Short-cut optimization
    if (bioString.isEmpty() || (!ignoreQueryGaps && position + bioString.length_ - 1 > this.length_))
        return false;

    // By placing x and its incrementing outside of the for loop, it is possible to simultaneously determine
    // if bioString contains at least one non-gap character. If x is greater than position - 1,
    // then we know this is the case. This only applies if optIgnoreQueryGaps is true.
    var x = position - 1;
    var maxX = this.length_ - 1;
    for (var y=0, z=bioString.length_; y<z; ++y) {
        var code = bioString.buffer_[y];
        if (ignoreQueryGaps && isGapCharacterCode(code))
            continue;

        if (x > maxX || this.buffer_[x] !== code)
            return false;

        // Only increment x *after* we have checked its position within buffer and if the position
        // of y is not a gap (again assuming optIgnoreQueryGaps is true).
        ++x;
    }

    return x > position - 1;
};

/**
 * @param {ClosedIntRange} range
 * @return {BioString}
 */
BioString.prototype.mid = function(range) {
    assert(this.isValidRange(range), 'BioString.mid() - range out of range');
    return this.substr(range.begin, range.length());
};

/**
  * @param {ClosedIntRange} range
  * @return {number}
  */
BioString.prototype.nonGapsBetween = function(range) {
    return range.length() - this.gapsBetween(range);
};

/**
 * @param {ClosedIntRange=} range defaults to entire sequence
 * @return {boolean}
 */
BioString.prototype.onlyContainsACGT = function(range) {
    if (this.length_ === 0)
        return false;

    if (!goog.isDef(range))
        range = new ClosedIntRange(1, this.length_);
    assert(this.isValidRange(range), 'BioString.onlyContainsACGT() - range out of range');

    var buffer = this.buffer_;
    for (var i=range.begin - 1, z=range.end; i<z; i++) {
        switch (buffer[i]) {
        case 'A'.charCodeAt(0):
        case 'C'.charCodeAt(0):
        case 'G'.charCodeAt(0):
        case 'T'.charCodeAt(0):
            continue;

        default:
            return false;
        }
    }

    return true;
};

/**
 * @param {string} string
 * @return {BioString}
 */
BioString.prototype.prepend = function(string) {
    return this.insert(1, string);
};

/**
 * Removes count characters starting with position (1-based).
 *
 * @param {number} position 1-based
 * @param {number} count
 * @return {BioString}
 */
BioString.prototype.remove = function(position, count) {
    assert(this.isValidPosition(position), 'BioString.remove() - position out of range');
    assert(count >= 0, 'BioString.remove() - count must be at least 0');
    assert(position - 1 + count <= this.length_, 'BioString.remove() - amount to remove is out of range');

    if (count < this.length_)
        BioString.memcpy_(this.buffer_, position - 1, this.buffer_, position - 1 + count, this.length_ - (position - 1 - count));
    this.length_ -= count;

    return this;
};

/**
  * In-place removal of all gaps.
  *
  * @return {BioString}
  */
BioString.prototype.removeAllGaps = function() {
    var buffer = this.buffer_;
    var y = 0;
    for (var i=0, z=this.length_; i<z; i++) {
        if (!isGapCharacterCode(buffer[i])) {
            buffer[y] = buffer[i];
            ++y;
        }
    }

    var nNonGaps = y;
    var targetBufferSize = BioString.idealBufferLength_(nNonGaps);
    if (targetBufferSize !== this.buffer_.length)
        this.resizeBuffer_(targetBufferSize);

    // Important to do this *after* the resizing of the buffer because it also sets the length when
    // truncating the buffer.
    this.length_ = nNonGaps;

    return this;
};

/**
 * Convenience function for removing one or more contiguous gaps starting at position. Position must reside within the
 * sequence bounds and reference a gap character. Moreover, there must be at least nGaps gaps present beginning at
 * position.
 *
 * @param {number} position
 * @param {number} nGaps
 * @return {BioString}
 */
BioString.prototype.removeGaps = function(position, nGaps) {
    assert(this.isValidPosition(position), 'BioString.removeGaps() - position out of range');
    assert(nGaps >= 0, 'BioString.removeGaps() - nGaps must be at least 0');
    assert(nGaps === this.gapsBetween(new ClosedIntRange(position, position + nGaps - 1)));

    if (nGaps > 0)
        this.remove(position, nGaps);

    return this;
};

/**
 * Replace amount characters beginning at position with bioString. Returns a copy of the current object
 *
 * @param {number} position
 * @param {number} amount
 * @param {BioString} bioString
 * @return {BioString}
 */
BioString.prototype.replace = function(position, amount, bioString) {
    assert(position >= 1 && position <= this.length_ + 1, 'position out of range');
    assert(amount >= 0, 'amount must be zero or larger');
    assert(amount === 0 || position + amount - 1 <= this.length_, 'position + amount is out of range');

    var insertLength = bioString.length_;

    // Three cases:
    // 1) bioString length equals amount length; this is a simple buffer copy
    if (insertLength === amount) {
        BioString.memcpy_(this.buffer_, position - 1, bioString.buffer_, 0, insertLength);
    }
    else if (insertLength < amount) {
        // Shrinking the buffer
        // A) Copy bioString to position
        BioString.memcpy_(this.buffer_, position - 1, bioString.buffer_, 0, insertLength);

        // B) Copy the remainder
        BioString.memcpy_(this.buffer_, position + insertLength - 1,
            this.buffer_, position + amount - 1,
            this.length_ - (position + amount) + 1);

        var shrinkage = amount - insertLength;
        this.length_ -= shrinkage;

        // OPTIMIZE: Could shrink buffer capacity as needed
    }
    else {
        // insertLength > amount
        // Ensure that there is room in the typed array for the growth
        var spaceNeeded = insertLength - amount;
        this.increaseBufferAsNeededToFit_(this.length_ + spaceNeeded);

        // A) Move existing data spanning position to current this.length_
        BioString.memcpy_(this.buffer_, position + insertLength - 1,
            this.buffer_, position + amount - 1,
            this.length_ - (position - amount) + 1);

        // B) Copy the relevant bioString into position
        BioString.memcpy_(this.buffer_, position - 1,
            bioString.buffer_, 0,
            insertLength);

        this.length_ += spaceNeeded;
    }

    return this;
};

/** @return {BioString} */
BioString.prototype.reverse = function() {
    var len = this.length_;
    var headPos = 0;
    var tailPos = len - 1;

    var buffer = this.buffer_;
    var swap;
    for (var i=0, z = len/2; i<z; ++i, ++headPos, --tailPos) {
        swap = buffer[headPos];
        buffer[headPos] = buffer[tailPos];
        buffer[tailPos] = swap;
    }

    return this;
};

/** @return {BioString} */
BioString.prototype.reverseComplement = function() {
    // Vital to perform the complement first and then reverse becausee complement
    // creates a copy, but reverse reverses the sequence in place.
    return this.complement().reverse();
};

/**
 * @param {ClosedIntRange} range
 * @return {number}
 */
BioString.prototype.rightSlidablePositions = function(range) {
    assert(this.isValidRange(range), 'BioString.rightSlidablePositions() - range out of range');

    // If range consists entirely of gaps, it should be able to slide fully left or right
    return this.nonGapsBetween(range) ? this.gapsRightOf(range.end) : this.length_ - range.end;
};

/**
 * @param {grammar} newGrammar
 */
BioString.prototype.setGrammar = function(newGrammar) {
    this.grammar_ = newGrammar;
};

/**
 * Equivalent to the operator= in C++ terms.
 *
 * @param {string} newString
 */
BioString.prototype.setString = function(newString) {
    this.setString_(newString);
};

/**
  * A frequent operation while editing multiple sequence alignments is horizontally sliding a set of characters which
  * "displace" or exchange places with gap positions but not any non-gap character data. Thus, during this method the
  * order of sequence characters is not modified - only the gap positions. The delta parameter specifies the maximum
  * number of positions to horizontally slide. A negative delta indicates to slide the characters to the left and vice
  * versa.
  *
  * While sliding is most often considered in light of moving actual sequence characters, it is also possible
  * to slide a set of gap characters which behave slightly differently. Because swapping positions of a gap does not
  * alter the actual ungapped sequence, it is possibly to move a gap anywhere within the sequence bounds.
  *
  * Example:
  * 1234567890123
  * ABC--D-EF--GH
  *
  * slide(6, 9, -1) -> 1, sequence = ABC-D-EF---GH
  * slide(6, 9, -2) -> 2, sequence = ABCD-EF----GH
  * slide(6, 9, -5) -> same thing as above
  *
  * slide(9, 11, 2) -> 0, unchanged sequence
  * slide(9, 10, 2) -> 1, sequence = ABC--D-E-F-GH
  *
  * NOTE: This method is not thread safe because it utilizes a global static swap byte array.
  *
  * @param {ClosedIntRange} range
  * @param {number} delta
  * @returns {number}
  */
BioString.prototype.slide = function(range, delta) {
    assert(this.isValidRange(range), 'BioString.slide() - invalid range');

    var actualDelta = 0;                  // Stores the distance (in characters) segment was successfully moved
    var sourcePos = range.begin - 1;
    if (delta < 0) {  // Slide to the left
        actualDelta = Math.min(-delta, this.leftSlidablePositions(range));
        if (actualDelta) {
            if (actualDelta > BioString.SWAP_BUFFER.length)
                BioString.SWAP_BUFFER = new Uint8Array(actualDelta + 512);

            // A. Get the exact gap representation to the left of the range to be slided
            BioString.memcpy_(BioString.SWAP_BUFFER, 0, this.buffer_, sourcePos - actualDelta, actualDelta);
            // memcpy(swap, source - actualDelta, actualDelta);

            // B. Move the range to the left
            BioString.memcpy_(this.buffer_, sourcePos - actualDelta, this.buffer_, sourcePos, range.length());
            // memmove(source - actualDelta, source, range.length());

            // C. Copy the exact gap representation to the right
            BioString.memcpy_(this.buffer_, sourcePos - actualDelta + range.length(), BioString.SWAP_BUFFER, 0, actualDelta);
            // memcpy(source - actualDelta + range.length(), swap, actualDelta);
        }
    }
    else if (delta > 0) { // -> Slide to the right
        actualDelta = Math.min(delta, this.rightSlidablePositions(range));
        if (actualDelta) {
            if (actualDelta > BioString.SWAP_BUFFER.length)
                BioString.SWAP_BUFFER = new Uint8Array(actualDelta + 512);

            // A. Get the exact gap representation to the right of the range to be slided
            BioString.memcpy_(BioString.SWAP_BUFFER, 0, this.buffer_, sourcePos + range.length(), actualDelta);
            // memcpy(swap, source + range.length(), actualDelta);

            // B. Move the range to the right
            BioString.memcpy_(this.buffer_, sourcePos + actualDelta, this.buffer_, sourcePos, range.length());
            // memmove(source + actualDelta, source, range.length());

            // C. Copy the exact gap representation to the left
            BioString.memcpy_(this.buffer_, sourcePos, BioString.SWAP_BUFFER, 0, actualDelta);
            // memcpy(source, swap, actualDelta);
        }
    }

    return actualDelta;
};

/**
 * @param {number} start
 * @param {number} nBytes
 * @return {BioString}
 */
BioString.prototype.substr = function(start, nBytes) {
    assert(this.isValidPosition(start), 'BioString.substr() - invalid start position');
    assert(nBytes >= 0, 'BioString.substr() - nBytes must be 0 or positive');
    assert(this.isValidPosition(start + nBytes - 1), 'BioString.substr() - start + nBytes out of range');

    var result = new BioString(null, this.grammar_);
    result.length_ = nBytes;
    result.buffer_ = new Uint8Array(BioString.idealBufferLength_(nBytes));
    for (var i=start-1, j=0; j< nBytes; i++, j++)
        result.buffer_[j] = this.buffer_[i];
    return result;
};

/** @return {number} */
BioString.prototype.tailGaps = function() {
    var nGaps = 0;
    var buffer = this.buffer_;
    for (var i=this.length_ - 1; i>=0 && isGapCharacterCode(buffer[i]); i--)
        nGaps++;
    return nGaps;
};

/**
 * @param {ClosedIntRange=} range
 * @return {string}
 */
BioString.prototype.toString = function(range) {
    var result = '';
    var from = 1;
    var to = this.length_;
    if (range && range instanceof ClosedIntRange) {
        assert(this.isValidRange(range), 'BioString.toString() - invalid range');
        from = range.begin;
        to = range.end;
    }

    for (var i=from-1; i< to; i += BioString.APPLY_ARGUMENT_LIMIT)
        result += String.fromCharCode.apply(null, array.slice(this.buffer_, i, Math.min(i + BioString.APPLY_ARGUMENT_LIMIT, to)));

    return result;
};

/**
 * Character-by-character translation of query characters with replacement characters; returns a reference to this object.
 *
 * @param {string} query
 * @param {string} replacement
 * @return {BioString}
 */
BioString.prototype.tr = function(query, replacement) {
    assert(query.length === replacement.length, 'BioString.tr() - Unequal number of chars in query and replacement');

    var queryCharCodes = [];
    for (var i=0, z= query.length; i<z; i++)
        queryCharCodes.push(query.charCodeAt(i));

    var buffer = this.buffer_;
    var l = query.length;
    for (var i=0, z=this.length_; i<z; i++) {
        for (var j=0; j<l; j++) {
            if (buffer[i] === queryCharCodes[j]) {
                buffer[i] = replacement.charCodeAt(j);
                break;
            }
        }
    }

    return this;
};

/** @return {BioString} */
BioString.prototype.transcribe = function() {
// #ifdef QT_DEBUG
//     if (grammar_ != eDnaGrammar)
//         qWarning("%s: unexpected grammar", __FUNCTION__);
// #endif

    var rna = this.copy();
    rna.grammar_ = grammar.RNA;
    return rna.tr("Tt", "Uu");
};

/**
  * @param {string} newChar
  * @return {BioString}
  */
BioString.prototype.translateGaps = function(newChar) {
    assert(newChar.length > 0, 'BioString.translateGaps() - empty newChar');
    var newCharCode = newChar.charCodeAt(0);
    var buffer = this.buffer_;
    for (var i=0, z=this.length_; i<z; i++)
        if (isGapCharacterCode(buffer[i]))
            buffer[i] = newCharCode;

    return this;
};

/** @return {BioString} */
BioString.prototype.ungapped = function() {
    return this.copy().removeAllGaps();
};

/** @return {number} */
BioString.prototype.ungappedLength = function() {
    if (this.length_ > 0)
        return this.length_ - this.gapsBetween(new ClosedIntRange(1, this.length_));

    return 0;
};


// --------------------------------------------------------------------------------------------------------------------
// Private static methods
/**
 * @param {number} neededLength
 * @return {number}
 */
BioString.idealBufferLength_ = function(neededLength) {
    if (neededLength <= 2048)
        return util.nextLargerPowerOf2(neededLength);

    var smallerPow2 = util.nextSmallerPowerOf2(neededLength);
    var n = ((neededLength - smallerPow2) / 1024) + 1;
    return smallerPow2 + (n * 1024);
};

/**
 * Copies nBytes from source to dest beginning at destOffset. Safe to copy overlapping portions
 * from dest to source.
 *
 * @param {Uint8Array} dest
 * @param {number} destOffset 0-based
 * @param {Uint8Array} source
 * @param {number} sourceOffset 0-based
 * @param {number} nBytes
 */
BioString.memcpy_ = function(dest, destOffset, source, sourceOffset, nBytes) {
    var destPos = goog.isNumber(destOffset) ? destOffset : 0;
    var sourcePos = goog.isNumber(sourceOffset) ? sourceOffset : 0;
    assert(destPos >= 0);
    assert(sourcePos >= 0);
    assert(nBytes >= 0);

    if (nBytes === 0 || (dest === source && destOffset === sourceOffset))
        return;

    if (destOffset > sourceOffset) {
        for (var i=sourcePos + nBytes - 1, j=destOffset + nBytes - 1; i >= sourcePos; i--, j--)
            dest[j] = source[i];
    }
    else {
        for (var i=0; i< nBytes; i++, destPos++, sourcePos++)
            dest[destPos] = source[sourcePos];
    }
};

/**
 * Copies the ASCII code of nChars from string to dest beginning at destOffset.
 *
 * @param {Uint8Array} dest
 * @param {string} string
 * @param {number=} nChars defaults to length of string
 * @param {number=} destOffset defaults to 0
 */
BioString.copyStringToTypedArray_ = function(dest, string, nChars, destOffset) {
    assert(goog.isString(string));
    nChars = goog.isNumber(nChars) ? nChars : string.length;
    assert(nChars <= string.length);
    var destPos = goog.isNumber(destOffset) ? destOffset : 0;
    for (var i=0; i< nChars; i++, destPos++)
        dest[destPos] = string.charCodeAt(i);
};

/**
 * @param {string} string
 * @return {Uint8Array}
 */
BioString.typedArrayFromString_ = function(string) {
    assert(goog.isString(string));

    var len = string.length;
    var typedArray = new Uint8Array(len);
    BioString.copyStringToTypedArray_(typedArray, string, len, 0);
    return typedArray;
};

// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * Copies string to the internal buffer beginning at position. No resizing is performed.
 *
 * @private
 * @param {string} string
 * @param {number=} position defaults to 1; 1-based
 */
BioString.prototype.copyString_ = function(string, position) {
    position = goog.isNumber(position) ? position : 1;
    if (string.length === 0)
        return;

    assert(this.isValidPosition(position), 'BioString.copyString_() - invalid position');
    assert(position - 1 + string.length <= this.buffer_.length, 'BioString.copyString_() - buffer too small to accommodate string');

    BioString.copyStringToTypedArray_(this.buffer_, string, string.length, position - 1);
};

/**
 * Slightly optimized version which avoids creating a BioString from string just to perform a search.
 *
 * @param {string} string
 * @param {number} from
 * @return {number}
 */
BioString.prototype.indexOfPureString_ = function(string, from) {
    var len = string.length;
    if (len === 0 || from + len - 1 > this.length_)
        //           ^^^^ 1-based
        return -1;

    // Cache local buffer
    var buffer = this.buffer_;

    for (var i=from-1, z=this.length_ - len + 1; i<z; i++) {
        for (var j=0; j<len; j++) {
            if (buffer[i+j] !== string.charCodeAt(j))
                break;
            if (j === len - 1)
                return i+1;
        }
    }
    return -1;
};

/**
 * @param {Uint8Array} typedArray
 * @param {number} len length of typedArray; cannot simply reference the length parameter of typedArray because it might be a
 * BioString buffer and have extra capacity.
 * @param {number} from
 * @return {number}
 */
BioString.prototype.indexOfTypedArrayString_ = function(typedArray, len, from) {
    if (len === 0 || from + len - 1 > this.length_)
        //           ^^^^ 1-based
        return -1;

    // Cache local buffer
    var buffer = this.buffer_;

    for (var i=from-1, z=this.length_ - len + 1; i<z; i++) {
        for (var j=0; j<len; j++) {
            if (buffer[i+j] !== typedArray[j])
                break;
            if (j === len - 1)
                return i+1;
        }
    }
    return -1;
};

/**
 * Utility method to expand the internal buffer as needed and shift existing sequence characters to the right of position
 * by amount. Useful when performing inserts or the like.
 *
 * @private
 * @param {number} position 1-based
 * @param {number} amount
 */
BioString.prototype.insertSpacing_ = function(position, amount) {
    assert(amount > 0);
    var newLength = this.length_ + amount;
    this.increaseBufferAsNeededToFit_(newLength);
    var rightBytes = this.length_ - position + 1;
    BioString.memcpy_(this.buffer_, position + amount - 1, this.buffer_, position - 1, rightBytes);
    this.length_ = newLength;
};

/**
 * @private
 * @param {number} targetLength
 */
BioString.prototype.increaseBufferAsNeededToFit_ = function(targetLength) {
    if (targetLength < this.buffer_.length)
        return;

    var newBufferLength = BioString.idealBufferLength_(targetLength);
    this.resizeBuffer_(newBufferLength);
};

/**
 * Resizes the current buffer to newSize. To achieve this, a new array must be created and the bytes from the original
 * buffer copied over. If newSize is smaller than the current length, then those bytes will be truncated.
 *
 * @private
 * @param {number} newSize
 */
BioString.prototype.resizeBuffer_ = function(newSize) {
    assert(newSize >= 0, 'BioString.resizeBuffer_() - newSize must be greater than or equal to 0');

    if (newSize >= this.buffer_.length) {
        var newBuffer = new Uint8Array(newSize);
        newBuffer.set(this.buffer_);
        this.buffer_ = newBuffer;
    }
    else {
        this.buffer_ = this.buffer_.subarray(0, newSize);
        this.length_ = newSize;
    }
};

/**
 * @param {string} newString
 * @protected
 */
BioString.prototype.setString_ = function(newString) {
    this.buffer_ = new Uint8Array(BioString.idealBufferLength_(newString.length));
    this.length_ = newString.length;
    this.copyString_(newString);
};

/*******************************************************************************************************************/});