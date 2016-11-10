/**
 * @fileoverview Subseqs are sequence substrings associated with an immutable parent sequence.
 *
 *   A Subseq is nothing more than a particular segment that may contain gaps and corresponds to a linear region of a
 *   sequence. It is useful for manipulating sequences in a controlled fashion relative to its parent sequence.
 *
 *   While Subseq is directly related to a parent sequence, it may have a different length and contain gap characters.
 *
 *   The actual Subseq sequence may be tweaked by adjusting its start and stop positions (relative to its parent
 *   sequence). A Subseq must have at least one non-gap character and have a length of at least 1
 *   It is important to note that extending the sequence will simply append ungapped character(s) immediately
 *   previous (N-terminal) or subsequent (C-terminal) to the terminal-most, non-gap character:
 *
 *   ---B-CD--- (add N-terminal 'A') ==> --AB-CD---
 *   ---B-CD--- (add C-terminal 'E') ==> ---B-CDE--
 *
 *   Similarly, shrinking the sequence will remove 1 or more non-gap characters from the approriate terminus, but neither
 *   of these operations will remove the last non gap character remaining in the Subseq. By definition, a subseq must
 *   contain at least on non-gap character.
 *
 *   On the other hand, the trim and extend methods replace existing characters - gap columns will not be inserted to
 *   accomodate a particular extension.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.bio.Subseq');

goog.require('ag');
goog.require('ag.bio');
goog.require('ag.bio.grammar');
goog.require('ag.bio.BioString');
goog.require('ag.core.ClosedIntRange');

goog.require('goog.asserts');
goog.require('goog.math');

/**
 * @constructor
 * @extends {ag.bio.BioString}
 * @param {string|ag.bio.BioString} sequence
 * @param {string|ag.bio.BioString} [optParentSeq] defaults to the ungapped version of sequence
 * @param {number} [optStart] defaults to 1, otherwise should reflect the beginning position of this subsequence within
 *   optParentSeq; 1-based!
 */
ag.bio.Subseq = function(sequence, optParentSeq, optStart) {
    var compatibleGrammars = goog.isString(sequence) ||
        !optParentSeq ||
        goog.isString(optParentSeq) ||
        sequence.grammar_ === optParentSeq.grammar_;
    goog.asserts.assert(!goog.isDefAndNotNull(optStart) || goog.isDefAndNotNull(optParentSeq), 'optStart argument not permitted without optParentSeq argument');
    goog.asserts.assert(compatibleGrammars, 'incompatible grammars during construction');
    goog.asserts.assert(!goog.isDef(optStart) || optStart > 0, 'optStart must be a positive integer');

    goog.base(this, sequence);

    goog.asserts.assert(this.hasNonGaps(), 'sequence must contain at least one non-gap character');

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.bio.BioString}
     * @private
     */
    this.parentSeq_;

    /**
     * @type {number}
     * @private
     */
    this.start_;

    /**
     * @type {number}
     * @private
     */
    this.stop_;

    /**
     * @type {string}
     */
    this.name;

    // --------------------------------------------------------------------------------------------------------------------
    // Initialization
    if (optParentSeq) {
        // -----------------------------
        // Part 1: Assign this.parentSeq
        // Small optimization if optParentSeq is a string
        if (goog.isString(optParentSeq)) {
            var ungappedString = ag.bio.BioString.removeGapsFromString(optParentSeq);
            this.parentSeq_ = new ag.bio.BioString(ungappedString, this.grammar_);
        }
        else {
            // Otherwise we have a BioString, make a copy without gaps
            this.parentSeq_ = optParentSeq.ungapped();

            // In the event, that sequence is a string, get the grammar from the optParentSeq
            if (goog.isString(sequence))
                this.grammar_ = optParentSeq.grammar_;
        }

        goog.asserts.assert(this.parentSeq_.hasNonGaps(), 'parent sequence must contain at least one non-gap character');

        // -----------------------------
        // Part 2: Determine the start and stop position of the subsequence within the provided parent sequence
        // Double-check that sequence is a subsequence of optParentSeq and take optStart into account
        if (optStart) {
            // The subsequence must match here exactly!
            goog.asserts.assert(this.parentSeq_.matchesAt(this, optStart, ag.bio.BioString.IGNORE_QUERY_GAPS), 'Subequence not found at the provided position: ' + optStart);
            this.start_ = optStart;
        }
        else {
            this.start_ = this.parentSeq_.indexOf(this.ungapped());
            goog.asserts.assert(this.start_ >= 0, 'Subsequence not found anywhere within the parent sequence');
        }
    }
    else {
        // No optParentSeq
        this.parentSeq_ = this.ungapped();
        this.start_ = 1;
    }

    this.stop_ = this.start_ + ag.bio.Subseq.superClass_.ungappedLength.call(this) - 1;
};
goog.inherits(ag.bio.Subseq, ag.bio.BioString);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var math = goog.math;

var bio = ag.bio;
var grammar = ag.bio.grammar;
var BioString = ag.bio.BioString;
var ClosedIntRange = ag.core.ClosedIntRange;
var Subseq = ag.bio.Subseq;

var isGapCharacterCode = bio.isGapCharacterCode;

// --------------------------------------------------------------------------------------------------------------------
// Hidden methods from parent class
Subseq.prototype.append = ag.hiddenMethod;
Subseq.prototype.backTranscribe = ag.hiddenMethod;
Subseq.prototype.complement = ag.hiddenMethod;
Subseq.prototype.clear = ag.hiddenMethod;
Subseq.prototype.complement = ag.hiddenMethod;
Subseq.prototype.insert = ag.hiddenMethod;
Subseq.prototype.prepend = ag.hiddenMethod;
// Remove is necessary for access to the removeGaps method
// Subseq.prototype.remove = ag.hiddenMethod;
Subseq.prototype.reverse = ag.hiddenMethod;
Subseq.prototype.reverseComplement = ag.hiddenMethod;
Subseq.prototype.setString = ag.hiddenMethod;
Subseq.prototype.tr = ag.hiddenMethod;



// --------------------------------------------------------------------------------------------------------------------
// Operators
/** @override */
Subseq.prototype.eq = function(other) {
    return this === other || (
        this.start_     === other.start_ &&
        this.stop_      === other.stop_ &&
        this.parentSeq_.eq(other.parentSeq_) &&
        goog.base(this, 'eq', other)
    );
};

/** @override */
Subseq.prototype.ne = function(other) {
    return !this.eq(other);
};


// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * This is a slightly optimized and specialized version of setStart and/or the replace operation. This operation
 * requires the following:
 * o bioString must contain at least one non-gap character
 * o The non-gap characters in bioString must be an exact match of those characters preceding the start position
 * o bioString must be able to replace those characters beginning at position without overlapping the first non-gap
 *   character (current start)
 *
 * @param {BioString} bioString
 * @param {number} position
 */
Subseq.prototype.extendLeftWith = function(bioString, position) {
    var ul = bioString.ungappedLength();
    assert(this.isValidPosition(position), 'position out of range');
    assert(ul > 0, 'bioString does not contain any non-gap characters');
    assert(position + bioString.length_ - 1 <= this.headGaps(), 'bioString does not fit when placed in at position');
    assert(this.parentSeq_.matchesAt(bioString, this.start_ - ul, BioString.IGNORE_QUERY_GAPS), 'bioString does not match parent sequence');

    BioString.memcpy_(this.buffer_, position - 1, bioString.buffer_, 0, bioString.length_);
    this.start_ -= ul;

    assert(this.start_ > 0, 'Start must not be zero!');
};

/**
 * @param {number} nCharsToExtend
 * @return {number}
 */
Subseq.prototype.extendLeft = function(nCharsToExtend) {
    assert(nCharsToExtend >= 0, 'nCharsToExtend must be zero or greater');
    assert(this.headGaps() >= nCharsToExtend, 'Not enough head gaps to accommodate extension');
    assert(nCharsToExtend <= this.leftUnusedSpace(), 'nCharsToExtend exceeds number of parent sequence characters to the left of the start position');

    var column = this.headGaps() - nCharsToExtend + 1;
    BioString.memcpy_(this.buffer_, column - 1,
        this.parentSeq_.buffer_, this.start_ - nCharsToExtend - 1,
        nCharsToExtend);
    this.start_ -= nCharsToExtend;

    assert(this.start_ > 0, 'Start must not be zero!');
    return column;
};

/**
 * This is a slightly optimized and specialized version of setStop and/or the replace operation. This operation
 * requires the following:
 * o bioString must contain at least one non-gap character
 * o The non-gap characters in bioString must be an exact match of those characters following the stop position
 * o bioString must be able to replace those characters beginning at position without overlapping the last non-gap
 *   character (current start)
 *
 * @param {BioString} bioString
 * @param {number} position
 */
Subseq.prototype.extendRightWith = function(bioString, position) {
    var ul = bioString.ungappedLength();
    assert(this.isValidPosition(position), 'position out of range');
    assert(ul > 0, 'bioString does not contain any non-gap characters');
    assert(position >= this.length_ - this.tailGaps() + 1, 'bioString does not fit when placed in at position');
    assert(this.parentSeq_.matchesAt(bioString, this.stop_ + 1, BioString.IGNORE_QUERY_GAPS), 'bioString does not match parent sequence');

    BioString.memcpy_(this.buffer_, position - 1, bioString.buffer_, 0, bioString.length_);
    this.stop_ += ul;
};

/**
 * @param {number} nCharsToExtend
 * @return {number}
 */
Subseq.prototype.extendRight = function(nCharsToExtend) {
    assert(nCharsToExtend >= 0, 'nCharsToExtend must be zero or greater');
    assert(this.tailGaps() >= nCharsToExtend, 'Not enough tail gaps to accommodate extension');
    assert(nCharsToExtend <= this.rightUnusedSpace(), 'nCharsToExtend exceeds number of parent sequence characters to the right of the stop position');

    var column = this.length_ - this.tailGaps() + 1;
    BioString.memcpy_(this.buffer_, column - 1,
        this.parentSeq_.buffer_, this.stop_,
        nCharsToExtend);
    this.stop_ += nCharsToExtend;
    return column;
};

/**
 * For example:
 *
 *             12345678
 * Parent Seq: ABCDEFGH
 *
 *         34  56
 * Subseq: CD--EF
 *
 * Would return: -6
 *
 * @return {number}
 */
Subseq.prototype.inverseStart = function() {
    return -this.parentSeq_.length_ + this.start_ - 1;
};

/**
 * For example:
 *
 *             12345678
 * Parent Seq: ABCDEFGH
 *
 *         34  56
 * Subseq: CD--EF
 *
 * Would return: -3
 *
 * @return {number}
 */
Subseq.prototype.inverseStop = function() {
    return -this.parentSeq_.length_ + this.stop_ - 1;
};

/**
 * Returns the maximum number of characters that may be extended leftward to position.
 *
 * @param {number} position
 * @return {number}
 */
Subseq.prototype.leftExtendableLength = function(position) {
    assert(this.isValidPosition(position), 'position out of range');

    var nFillableGaps = this.headGaps() - position + 1;
    if (nFillableGaps < 1)
        return 0;

    var oldStart = this.start_;
    var newStart = Math.max(1, oldStart - nFillableGaps);
    return oldStart - newStart;
};

/**
 * Returns the maximum number of characters that may be trimmed leftward to position.
 *
 * @param {number} position
 * @return {number}
 */
Subseq.prototype.leftTrimmableLength = function(position) {
    assert(this.isValidPosition(position), 'position out of range');

    var nHeadGaps = this.headGaps();
    if (position <= nHeadGaps)
        return 0;

    var nTrimmableChars = this.nonGapsBetween(new ClosedIntRange(nHeadGaps + 1, position));
    if (this.ungappedLength() - nTrimmableChars < 1)
        --nTrimmableChars;

    return nTrimmableChars;
};

/**
 * Because a Subseq must always have at least one non-gap character, this method will not return a range that includes
 * all non-gap characters regardless of position. Note the returned ClosedIntRange is relative to the Subseq
 * coordinates.
 *
 * Examples:
 * 1234567890
 * --A-B-CD--
 * leftTrimRange(1) -> empty
 * leftTrimRange(2) -> empty
 * leftTrimRange(3) -> [3, 3]
 * leftTrimRange(4) -> [3, 3]
 * leftTrimRange(5) -> [3, 5]
 * leftTrimRange(6) -> [3, 5]
 * leftTrimRange(7) -> [3, 7]
 * leftTrimRange(8 -> 10) -> [3, 7] :: Note, that even though position 8 is a non-gap character, trimming it would
 *                                     remove the last non-gap character from the subseq, which is not allowed.
 *
 * @param {number} position
 * @return {ClosedIntRange}
 */
Subseq.prototype.leftTrimRange = function(position) {
    assert(this.isValidPosition(position), 'position out of range');

    var range = new ClosedIntRange();
    var lastNonGapPos = 0;  // In case position includes the last non-gap character, we can easily
                            // move the range back to this position
    for (var i=0; i< position; i++) {
        if (!isGapCharacterCode(this.buffer_[i])) {
            if (range.begin === 0)
                range.begin = i + 1;
            else
                lastNonGapPos = range.end;
            range.end = i + 1;
        }
    }

    // If we have not found at least one non-gap by position, then return an empty range
    var emptyRange = range.begin === 0;
    if (emptyRange)
        return range;

    // Now check that there is at least one more non-gap beyond position
    var hasExtraNonGap = false;
    for (var i=position; i<this.length_; ++i) {
        if (!isGapCharacterCode(this.buffer_[i])) {
            hasExtraNonGap = true;
            break;
        }
    }

    if (!hasExtraNonGap) {
        if (lastNonGapPos == 0)
            return new ClosedIntRange();

        range.end = lastNonGapPos;
    }

    return range;
};

/** @return {number} */
Subseq.prototype.leftUnusedSpace = function() {
    return this.start_ - 1;
};

/**
 * Maps position in subseq space to its corresponding position in the parent sequence; returns -1 if position corresponds to a gap character.
 *
 * @param {number} position
 * @return {number}
 */
Subseq.prototype.mapToSeq = function(position) {
    if (this.hasGapAt(position))
        return -1;

    return this.start_ + this.nonGapsBetween(new ClosedIntRange(1, position)) - 1;
};

/**
 * Moves start up to a maximum of delta characters as is possible. If delta equals zero, nothing will be changed.
 *
 * @param {number} delta
 * @return {number}
 * UNTESTED
 */
Subseq.prototype.moveStart = function(delta) {
    var oldStart = this.start_;
    var newStart = math.clamp(this.start_ + delta, 1, this.parentSeq_.length());
    this.setStart(newStart);
    return Math.abs(this.start_ - oldStart);
};

/**
 * Moves stop up to a maximum of delta characters as is possible. If delta equals zero, nothing will be changed.
 *
 * @param {number} delta
 * @return {number}
 * UNTESTED
 */
Subseq.prototype.moveStop = function(delta) {
    var oldStop = this.stop_;
    var newStop = math.clamp(this.stop_ + delta, 1, this.parentSeq_.length());
    this.setStop(newStop);
    return Math.abs(this.stop_ - oldStop);
};

/**
 * @return {ag.bio.BioString}
 * UNTESTED
 */
Subseq.prototype.constParentSeq = function() {
    return this.parentSeq_;
};

/**
 * A memory efficient version of replace that substitutes bioString for the characters in range. Requires that range
 * and bioString have equivalent lengths and all non-gap characters in bioString are equiavlent in order and type.
 *
 * @param {ClosedIntRange} range
 * @param {BioString} bioString
 */
Subseq.prototype.rearrange = function(range, bioString) {
    assert(this.isValidRange(range), 'range out of range');
    assert(range.length() === bioString.length_, 'range and biostring lengths must be equal');
    assert(this.mid(range).ungapped().eq(bioString.ungapped()), 'different ungapped values between subseq range and biostring');

    BioString.prototype.replace.call(this, range.begin, range.length(), bioString);
};

/**
 * Returns the maximum number of characters that may be extended rightward to position.
 *
 * @param {number} position
 * @return {number}
 */
Subseq.prototype.rightExtendableLength = function(position) {
    assert(this.isValidPosition(position), 'position out of range');

    var nFillableGaps = position - (this.length_ - this.tailGaps());
    if (nFillableGaps < 1)
        return 0;

    var oldStop = this.stop_;
    var newStop = Math.min(this.parentSeq_.length_, oldStop + nFillableGaps);
    return newStop - oldStop;
};

/**
 * @param {number} position
 * @return {number}
 */
Subseq.prototype.rightTrimmableLength = function(position) {
    assert(this.isValidPosition(position), 'position out of range');

    var firstTailGap = this.length_ - this.tailGaps() + 1;
    if (position >= firstTailGap)
        return 0;

    var nTrimmableChars = this.nonGapsBetween(new ClosedIntRange(position, firstTailGap - 1));

    // Prevent trim operations from removing all characters so we reduce the number of trimmable characters by one
    if (this.ungappedLength() - nTrimmableChars < 1)
        --nTrimmableChars;

    return nTrimmableChars;
};

/** @return {number} */
Subseq.prototype.rightUnusedSpace = function() {
    return this.parentSeq_.length_ - this.stop_;
};

/**
 * Because a Subseq must always have at least one non-gap character, this method will not return a range that includes
 * all non-gap characters regardless of position. Note the returned ClosedIntRange is relative to the Subseq
 * coordinates.
 *
 * Examples:
 * 1234567890
 * --A-B-CD--
 * rightTrimRange(10) -> empty
 * rightTrimRange(9) -> empty
 * rightTrimRange(8) -> [8, 8]
 * rightTrimRange(7) -> [7, 8]
 * rightTrimRange(6) -> [7, 8]
 * rightTrimRange(5) -> [5, 8]
 * rightTrimRange(4) -> [5, 8]
 * rightTrimRange(3 -> 1) -> [5, 8] :: Note, that even though position 3 is a non-gap character, trimming it would
 *                                     remove the last non-gap character from the subseq, which is not allowed.
 *
 * @param {number} position
 * @return {ClosedIntRange}
 */
Subseq.prototype.rightTrimRange = function(position) {
    assert(this.isValidPosition(position), 'position out of range');

    var range = new ClosedIntRange();
    var lastNonGapPos = 0;  // In case position includes the last non-gap character, we can easily
                            // move the range back to this position
    for (var i=this.length_-1; i>= position-1; i--) {
        if (!isGapCharacterCode(this.buffer_[i])) {
            if (range.end === 0)
                range.end = i + 1;
            else
                lastNonGapPos = range.begin;
            range.begin = i + 1;
        }
    }

    // If we have not found at least one non-gap by position, then return an empty range
    var emptyRange = range.begin === 0;
    if (emptyRange)
        return range;

    // Now check that there is at least one more non-gap beyond position
    var hasExtraNonGap = false;
    for (var i=position-2; i>=0; i--) {
        if (!isGapCharacterCode(this.buffer_[i])) {
            hasExtraNonGap = true;
            break;
        }
    }

    if (!hasExtraNonGap) {
        if (lastNonGapPos == 0)
            return new ClosedIntRange();

        range.begin = lastNonGapPos;
    }

    return range;
};

/**
 * Only updates the start position if it references a valid index within the parent sequence. If start
 * is valid and greater than stop, the stop position is also updated. Both start and stop positions only relate to
 * the actual sequence characters. In other words, gap positions are not considered when updating the start and stop.
 *
 * Because a Subseq may contain gaps, it is important to understand how adjusting the start_ position impacts the
 * underlying sequence. Assuming a valid newStart:
 *
 * o If newStart > start_, then all sequence characters in bioString_ < newStart will be replaced with gap characters
 * o If newStart < start_, then start_ - newStart next ungapped, characters will be immediately prepended to bioString_
 *   replacing any gap characters that may precede start_
 * o If newStart > stop_, then stop_ is set to newStart
 *
 * >>> Examples
 * 123456
 * ABCDEF     (parent Seq)
 *
 * -C---DE--  (Subseq's bioString_, start = 3, stop = 5)
 *
 * setStart(2)  -> BC---DE--
 * setStart(1)  -> ABC---DE--   **Note: the bioString_ was extended by one character to fit A
 * setStart(4)  -> -----DE--    **Note: after operating on original subseq bioString_ (-C---DE--)
 * setStart(4) and then setStart(1) -> --ABCDE--
 * setStart(6)  -> -------F-
 *
 * @param {number} newStart
 */
Subseq.prototype.setStart = function(newStart) {
    assert(this.parentSeq_.isValidPosition(newStart), 'newStart out of range');

    if (newStart === this.start_)
        return;

    var nHeadGaps = this.headGaps();

    // Case 1
    if (newStart < this.start_) {
        var nNewChars = this.start_ - newStart;
        BioString.prototype.replace.call(this, Math.max(1, nHeadGaps - nNewChars + 1),
                           Math.min(nHeadGaps, nNewChars),
                           this.parentSeq_.mid(new ClosedIntRange(newStart, this.start_ - 1)));
    }
    // Case 2: newStart > start_ && newStart <= stop_
    else if (newStart <= this.stop_) {
        var i = nHeadGaps;
        var nCharsToRemove = newStart - this.start_;
        while (nCharsToRemove) {
            if (!isGapCharacterCode(this.buffer_[i])) {
                this.buffer_[i] = bio.DEFAULT_GAP_CHARCODE;
                --nCharsToRemove;
            }
            ++i;
        }
    }
    // Case 3: newStart > stop_
    else {
        var nTailGaps = this.tailGaps(); // Capture number of tail gaps *before* removing characters

        // Step A: Replace all non-gap characters with gaps until we reach the current stop_
        var i = nHeadGaps;
        var nCharsToRemove = this.stop_ - this.start_ + 1;
        while (nCharsToRemove) {
            // Check for non-gap character
            if (!isGapCharacterCode(this.buffer_[i])) {
                this.buffer_[i] = bio.DEFAULT_GAP_CHARCODE;
                --nCharsToRemove;
            }
            ++i;
        }

        // Step B: Skip over and add (if necessary) intermediate gaps and add newStart character
        var nIntermediateGaps = newStart - this.stop_ - 1;
        if (nTailGaps >= nIntermediateGaps + 1) {
            i += nIntermediateGaps;
            this.buffer_[i] = this.parentSeq_.at(newStart);
        }
        else {
            // Append any remainining gaps along with the appropriate new start character
            // We add one extra gap character when calling insert so that space will be present
            // for the last non-gap character.
            var nGaps = nIntermediateGaps - nTailGaps + 1;
            //                                        ^^^ See previous comment.
            this.insertGaps(this.length_ + 1, nGaps);
            this.buffer_[this.length_-1] = this.parentSeq_.at(newStart);
        }

        this.stop_ = newStart;
    }

    // Update the start position to the new position
    this.start_ = newStart;
};

/**
 * Only updates the stop position if newStop references a valid index within the parent sequence. If newStop
 * is valid and less than start_, start_ is also updated. Both start and stop positions only relate to the actual
 * sequence characters. In other words, gap positions are not considered when updating the start and stop.
 *
 * Because a Subseq may contain gaps, it is important to understand how adjusting the stop position impacts the
 * underlying sequence. Assuming a valid newStop:
 *
 * o If newStop < stop_, then all sequence characters in bioString_ > stop_ will be replaced with the default gap character
 * o If newStop > stop_, then the next stop_ - newStop ungapped characters will be immediately appended to bioString_
 *   replacing any gap characters that may succeed stop_
 * o If newStop < start_, then start_ is set to newStop
 *
 * >>> Examples
 * 123456
 * ABCDEF     (parent Seq)
 *
 * -C---DE--  (Subseq's bioString_, start = 3, stop = 5)
 *
 * setStop(6)  -> -C---DEF-
 * setStop(1)  -> A---------   **Note: the bioString_ was extended by one character to fit A
 * setStop(3)  -> -C-------
 * setStop(3) and then setStop(6) -> -CDEF----
 *
 * @param {number} newStop
 */
Subseq.prototype.setStop = function(newStop) {
    assert(this.parentSeq_.isValidPosition(newStop), 'newStop out of range');

    // Slight optimization
    if (newStop == this.stop_)
        return;

    var nTailGaps = this.tailGaps();

    // Case 1
    if (newStop > this.stop_) {
        var nNewChars = newStop - this.stop_;
        BioString.prototype.replace.call(this, this.length_ - nTailGaps + 1,
                           Math.min(nNewChars, nTailGaps),
                           this.parentSeq_.mid(new ClosedIntRange(this.stop_ + 1, newStop)));
    }
    // Case 2: newStop < stop_ && newStop >= start_
    else if (newStop >= this.start_) {
        // Simply need to replace non-gap characters with gaps until we reach the newStop
        var i = this.length_ - 1 - nTailGaps;
        var nCharsToRemove = this.stop_ - newStop;
        while (nCharsToRemove) {
            if (!isGapCharacterCode(this.buffer_[i])) {
                this.buffer_[i] = bio.DEFAULT_GAP_CHARCODE;
                --nCharsToRemove;
            }
            --i;
        }
    }
    // Case 3: newStop < start_
    else {
        var nHeadGaps = this.headGaps();     // Note this amount is captured *before* we remove characters

        // Step A: Replace all non-gap characters with gaps until we reach the current start_
        var i = this.length_ - 1 - nTailGaps;
        var nCharsToRemove = this.stop_ - this.start_ + 1;
        while (nCharsToRemove) {
            if (!isGapCharacterCode(this.buffer_[i])) {
                this.buffer_[i] = bio.DEFAULT_GAP_CHARCODE;
                --nCharsToRemove;
            }
            --i;
        }

        // Step B: Skip over and add (if necessary) intermediate gaps and add newStop character
        var nIntermediateGaps = this.start_ - newStop - 1;
        if (nHeadGaps >= nIntermediateGaps + 1) {
            i -= nIntermediateGaps;
            this.buffer_[i] = this.parentSeq_.at(newStop);
        }
        else {
            // Prepend any remainining gaps along with the appropriate new start character
            // We add one extra gap character when calling insert so that space will be present
            // for the last non-gap character.
            var nGaps = nIntermediateGaps - nHeadGaps + 1;
            //                                        ^^^ See previous comment.

            this.insertGaps(1, nGaps);
            this.buffer_[0] = this.parentSeq_.at(newStop);
        }

        this.start_ = newStop;
    }

    // Update the stop position to the new position
    this.stop_ = newStop;
};

/** @return {number} */
Subseq.prototype.start = function() {
    return this.start_;
};

/** @return {number} */
Subseq.prototype.stop = function() {
    return this.stop_;
};

/**
 * Trims range from the left end of the subseq replacing the trimmed characters with gap characters
 *
 * This operation
 * requires the following:
 * o range must not be empty
 * o The characters in range must contain at least one non-gap character
 * o There must be no non-gap characters before range.begin
 * o There must be at least one non-gap character after range.end
 *
 * @param {ClosedIntRange} range
 */
Subseq.prototype.trimLeft = function(range) {
    assert(this.isValidRange(range), 'range out of range');
    assert(range.begin === 1 || this.nonGapsBetween(new ClosedIntRange(1, range.begin - 1)) === 0,
        'Non-gap present left of range.begin');
    assert(this.nonGapsBetween(new ClosedIntRange(range.end + 1, this.length_)) > 0,
        'No non-gap characters located after range.end');

    for (var i=range.begin-1; i<range.end; i++) {
        if (!isGapCharacterCode(this.buffer_[i])) {
            this.start_++;
            this.buffer_[i] = bio.DEFAULT_GAP_CHARCODE;
        }
    }
};

/**
 * Trims range from the right end of the subseq replacing the trimmed characters with gap characters
 *
 * This operation
 * requires the following:
 * o range must not be empty
 * o The characters in range must contain at least one non-gap character
 * o There must be no non-gap characters after range.end
 * o There must be at least one non-gap character before range.begin
 *
 * @param {ClosedIntRange} range
 */
Subseq.prototype.trimRight = function(range) {
    assert(this.isValidRange(range), 'range out of range');
    assert(range.end === this.length_ || this.nonGapsBetween(new ClosedIntRange(range.end + 1, this.length_)) === 0,
        'Non-gap present right of range.end');
    assert(this.nonGapsBetween(new ClosedIntRange(1, range.begin - 1)) > 0,
        'No non-gap characters located before range.begin');

    for (var i=range.begin-1; i<range.end; i++) {
        if (!isGapCharacterCode(this.buffer_[i])) {
            this.stop_--;
            this.buffer_[i] = bio.DEFAULT_GAP_CHARCODE;
        }
    }
};

/** @override */
Subseq.prototype.ungappedLength = function() {
    return this.stop_ - this.start_ + 1;
};

/*******************************************************************************************************************/});
