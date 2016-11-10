/**
 * @fileoverview Msa models multiple sequence alignments.
 *
 *   A Msa consists of an array of aligned Subseqs. Many of the methods for manipulating arrays have been provided here
 *   for manipulating the array of Subseqs (e.g. moving, inserting, removing, etc) while maintaining the Msa integrity.
 *   The set of model operations thus boils down to the following major categories:
 *   1) Managing the list of Subseqs
 *   2) Alignment specific operations:
 *      o inserting and removing gap columns
 *      o horizontally sliding character data
 *      o collapsing sequence data
 *      o extending subseqs within the constraints of their parent sequences
 *      o trimming subseqs within the constraints of their parent sequences
 *
 *   No gap columns will be automatically inserted. This must be done separately if needed to accommodate additional
 *   characters.
 *
 *   All subseq members must possess the same grammar as the Msa. Any subseqs with a different grammar will be rejected.
 *
 *   Msa strictly models the underlying data necessary to adequately represent a multiple sequence alignment. To adhere
 *   to a MVC-style approach, no visualization or view parameters are part of this class. Moreover, derived data such as
 *   the predicted secondary structure and/or domains, etc. are managed in other classes. The same applies to all annotation
 *   data.
 *
 *   Both rows and columns are accessed using a 1-based indices rather than the standard 0-based. This is to make it
 *   easier when dealing with the 1-based nature of sequence data.
 *
 *   NOTE: Msa takes ownership and manages all member Subseq instances. Thus, it is vital that no member Subseq pointer
 *   is externally deleted, modified, and/or stored permanently as this will cause undefined behavior.
 *
 *   Msa does not emit any signals nor possess any slots. For these capabilities, use ObservableMsa which inherits from
 *   Msa and wraps the relevant methods to provide an observable infrastructure.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.bio.Msa');

goog.require('ag.bio');
goog.require('ag.bio.Subseq');
goog.require('ag.bio.MsaSubseqChange');
goog.require('ag.core.ClosedIntRange');
goog.require('ag.core.UnitRect');

goog.require('goog.array');
goog.require('goog.asserts');

/**
 * @constructor
 * @param {ag.bio.grammar=} optGrammar
 */
ag.bio.Msa = function(optGrammar) {
    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.bio.grammar}
     * @protected
     */
    this.grammar_ = goog.isNumber(optGrammar) ? optGrammar : ag.bio.grammar.UNKNOWN;

    /**
     * @type {Array.<ag.bio.Subseq>}
     * @protected
     */
    this.subseqs_ = [];
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;

var bio = ag.bio;

var Msa = ag.bio.Msa;
var MsaSubseqChange = ag.bio.MsaSubseqChange;
var MsaSubseqChangeArray = ag.bio.MsaSubseqChangeArray;
var TrimExtOp = MsaSubseqChange.TrimExtOp;
var Subseq = ag.bio.Subseq;

var ClosedIntRange = ag.core.ClosedIntRange;
var ClosedIntRangeArray = ag.core.ClosedIntRangeArray;
var UnitRect = ag.core.UnitRect;

var isGapCharacterCode = bio.isGapCharacterCode;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/**
 * @param {Subseq|Array.<Subseq>} subseqs
 */
Msa.prototype.append = function(subseqs) {
    return this.insert(subseqs, this.rowCount()+1);
};

/**
 * @param {number} row
 * @return {Subseq}
 */
Msa.prototype.at = function(row) {
    assert(this.isValidRow(row), 'row out of range');

    return this.subseqs_[row-1];
};

/**
 * @param {UnitRect|undefined} rect
 * @return {boolean}
 */
Msa.prototype.canCollapseLeft = function(rect) {
    if (rect) {
        var normRect = rect.normalized();
        assert(this.isValidRect(rect));
        for (var row=normRect.y1, z=normRect.y2; row<=z; row++) {
            var buffer = this.at(row).constBuffer();
            // Find the first gap character in this range
            var firstGap = 0;
            for (var i=normRect.x1 - 1, y=normRect.x2; i< y; ++i) {
                var isGap = isGapCharacterCode(buffer[i]);
                if (firstGap) {
                    if (!isGap)
                        return true;
                }
                else if (isGap) {
                    firstGap = i;
                }
            }
        }
    }

    return false;
};

/**
 * @param {UnitRect|undefined} rect
 * @return {boolean}
 */
Msa.prototype.canCollapseRight = function(rect) {
    if (rect) {
        var normRect = rect.normalized();
        assert(this.isValidRect(rect));
        for (var row=normRect.y1, z=normRect.y2; row<=z; row++) {
            var buffer = this.at(row).constBuffer();
            // Find the first gap character in this range
            var firstGap = 0;
            for (var i=normRect.x2 - 1, y=normRect.x1 - 1; i>=y; --i) {
                var isGap = isGapCharacterCode(buffer[i]);
                if (firstGap) {
                    if (!isGap)
                        return true;
                }
                else if (isGap) {
                    firstGap = i;
                }
            }
        }
    }

    return false;
};

/**
 * @param {number} column
 * @param {ClosedIntRange} rows
 * @return {boolean}
 */
Msa.prototype.canExtendLeft = function(column, rows) {
    assert(this.isValidColumn(column));
    assert(this.isValidRowRange(rows));

    for (var i=rows.begin; i<=rows.end; i++)
        if (this.at(i).leftExtendableLength(column) > 0)
            return true;

    return false;
};

/**
 * @param {number} column
 * @param {ClosedIntRange} rows
 * @return {boolean}
 */
Msa.prototype.canExtendRight = function(column, rows) {
    assert(this.isValidColumn(column));
    assert(this.isValidRowRange(rows));

    for (var i=rows.begin; i<=rows.end; i++)
        if (this.at(i).rightExtendableLength(column) > 0)
            return true;

    return false;
};

/**
 * @param {number} column
 * @param {ClosedIntRange} rows
 * @return {boolean}
 */
Msa.prototype.canLevelLeft = function(column, rows) {
    assert(this.isValidColumn(column));
    assert(this.isValidRowRange(rows));

    var canExtendLeft = this.canExtendLeft(column, rows);
    return canExtendLeft || (column > 1 && this.canTrimLeft(column - 1, rows));
};

/**
 * @param {number} column
 * @param {ClosedIntRange} rows
 * @return {boolean}
 */
Msa.prototype.canLevelRight = function(column, rows) {
    assert(this.isValidColumn(column));
    assert(this.isValidRowRange(rows));

    var canExtendRight = this.canExtendRight(column, rows);
    return canExtendRight || (column < this.columnCount() && this.canTrimRight(column + 1, rows));
};

/**
 * @param {number} column
 * @param {ClosedIntRange} rows
 * @return {boolean}
 */
Msa.prototype.canTrimLeft = function(column, rows) {
    assert(this.isValidColumn(column));
    assert(this.isValidRowRange(rows));

    for (var i=rows.begin; i<=rows.end; i++)
        if (this.at(i).leftTrimmableLength(column) > 0)
            return true;

    return false;
};

/**
 * @param {number} column
 * @param {ClosedIntRange} rows
 * @return {boolean}
 */
Msa.prototype.canTrimRight = function(column, rows) {
    assert(this.isValidColumn(column));
    assert(this.isValidRowRange(rows));

    for (var i=rows.begin; i<=rows.end; i++)
        if (this.at(i).rightTrimmableLength(column) > 0)
            return true;

    return false;
};

/**
 * Removes all member subseqs.
 */
Msa.prototype.clear = function() {
    this.subseqs_.length = 0;
};

/**
 * @param {UnitRect} rect
 * @return {ag.bio.MsaSubseqChangeArray}
 */
Msa.prototype.collapseLeft = function(rect) {
    var normRect = rect.normalized();
    assert(this.isValidRect(rect), 'rect is not valid');

    var horizRange = normRect.horizontalRange();
    var changes = [];
    for (var row=normRect.y1, bottom=normRect.y2; row <= bottom; row++) {
        var subseq = this.at(row);
        var difference = subseq.mid(horizRange);
        var collapseRange = subseq.collapseLeft(horizRange);
        if (collapseRange.isDefault())
            continue;

        if (collapseRange.begin > horizRange.begin)
            difference = difference.substr(collapseRange.begin - horizRange.begin + 1, collapseRange.length());
        else
            difference.chop(horizRange.end - collapseRange.end);

        changes.push(new MsaSubseqChange(row, collapseRange, TrimExtOp.eInternal, difference));
    }
    return changes;
};

/**
 * @param {UnitRect} rect
 * @return {ag.bio.MsaSubseqChangeArray}
 */
Msa.prototype.collapseRight = function(rect) {
    var normRect = rect.normalized();
    assert(this.isValidRect(rect), 'rect is not valid');

    var horizRange = normRect.horizontalRange();
    var changes = [];
    for (var row=normRect.y1, bottom=normRect.y2; row <= bottom; row++) {
        var subseq = this.at(row);
        var difference = subseq.mid(horizRange);
        var collapseRange = subseq.collapseRight(horizRange);
        if (collapseRange.isDefault())
            continue;

        if (collapseRange.begin > horizRange.begin)
            difference = difference.substr(collapseRange.begin - horizRange.begin + 1, collapseRange.length());
        else if (collapseRange.end < horizRange.end)
            difference.chop(horizRange.end - collapseRange.end);

        changes.push(new MsaSubseqChange(row, collapseRange, TrimExtOp.eInternal, difference));
    }
    return changes;
};

/** @return {number} */
Msa.prototype.columnCount = function() {
    return (this.rowCount() > 0) ? this.subseqs_[0].length() : 0;
};

/**
 * Maximally extends (if any) leftwards the subseqs in rows to column.
 *
 * Each subseq may only be extended if:
 * 1) column references a valid column
 * 2) Zero or more contiguous gaps occur before column (the extension occurs on the terminus of the subseq)
 * 3) There is at least one gap at or downstream of column
 *
 * Examples:
 * 123456789
 * --C-DEF--
 * -XY-ZZZ-W
 *
 * msa.extendLeft(2, ClosedIntRange(1, 2));
 * -BC-DEF--
 * -XY-ZZZ-W
 *
 * msa.extendLeft(1, ClosedIntRange(1, 2));
 * ABC-DEF--
 * WXY-ZZZ-W
 *
 * Only can add characters to the alignment by decreasing the start position of individual subseqs. Obviously extending
 * the subseqs is constrained by the actual subseqs length and current position. In other words, if a subseq begins at
 * position 1, it cannot be extended more at its leftmost terminus.
 *
 * @param {number} column
 * @param {ClosedIntRange} rows
 * @return {ag.bio.MsaSubseqChangeArray}
 */
Msa.prototype.extendLeft = function(column, rows) {
    // See trimRight for explanation of why we delegate the work to this method
    return this.doExtendLeft_(column, rows);
};

/**
* Performs similarly to extendLeft except applies to the right boundary of the alignment.
 *
 * @param {number} column
 * @param {ClosedIntRange} rows
 * @return {ag.bio.MsaSubseqChangeArray}
 */
Msa.prototype.extendRight = function(column, rows) {
    // See trimRight for explanation of why we delegate the work to this method
    return this.doExtendRight_(column, rows);
};

/** @return {ag.bio.grammar} */
Msa.prototype.grammar = function() {
    return this.grammar_;
};

/**
 * When optRow is excluded, this is equivalent to prepend - thus no prepend method.
 *
 * @param {Subseq|Array.<Subseq>} subseqs
 * @param {number} [optRow]
 * @return {boolean}
 */
Msa.prototype.insert = function(subseqs, optRow) {
    var row = goog.isNumber(optRow) ? optRow : 1;
    assert(row > 0 && row <= this.rowCount() + 1, 'row out of range');
    if (!this.isCompatible(subseqs))
        return false;

    if (!goog.isArray(subseqs))
        subseqs = [subseqs];

    array.insertArrayAt(this.subseqs_, subseqs, row - 1);
    return true;
};

/**
 * @param {number} column
 * @param {number} count
 * @param {string=} optGapChar defaults to the default configured gap character
 */
Msa.prototype.insertGapColumns = function(column, count, optGapChar) {
    assert(column > 0 && column <= this.columnCount() + 1, 'column out of range');
    assert(count >= 0, 'count must be positive');
    assert(!this.isEmpty(), 'At least one sequence is required');

    var i = this.rowCount();
    while (i--)
        this.subseqs_[i].insertGaps(column, count, optGapChar);
};

/**
 * @param {Subseq|Array.<Subseq>} subseqs
 * @return {boolean}
 */
Msa.prototype.isCompatible = function(subseqs) {
    if (!goog.isArray(subseqs))
        return this.isCompatibleSubseq_(subseqs);

    var i = subseqs.length;
    var targetLength = (i > 0) ? subseqs[0].length() : 0;
    while (i--) {
        var subseq = subseqs[i];
        if (subseq.length() !== targetLength ||
        //  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Checks that all subseqs in this vector have the same length
            !this.isCompatibleSubseq_(subseq))
            return false;
    }

    return true;
};

/** @return {boolean} */
Msa.prototype.isEmpty = function() {
    return this.rowCount() === 0;
};

/**
 * @param {number} column
 * @return {boolean}
 */
Msa.prototype.isValidColumn = function(column) {
    return column > 0 && column <= this.columnCount();
};

/**
 * @param {ClosedIntRange} columns
 * @return {boolean}
 */
Msa.prototype.isValidColumnRange = function(columns) {
    return columns.begin <= columns.end &&
        this.isValidColumn(columns.begin) &&
        this.isValidColumn(columns.end);
};

/**
 * @param {UnitRect} rect
 * @return {boolean}
 */
Msa.prototype.isValidRect = function(rect) {
    return this.isValidRow(rect.y1) &&
        this.isValidRow(rect.y2) &&
        this.isValidColumn(rect.x1) &&
        this.isValidColumn(rect.x2);
};

/**
 * @param {number} row
 * @return {boolean}
 */
Msa.prototype.isValidRow = function(row) {
    return row > 0 && row <= this.rowCount();
};

/**
 * @param {ClosedIntRange} rows
 * @return {boolean}
 */
Msa.prototype.isValidRowRange = function(rows) {
    return rows.begin <= rows.end &&
        this.isValidRow(rows.begin) &&
        this.isValidRow(rows.end);
};

/**
 * Maximally level the start positions of rows up to and including column; return a vector changes
 *
 * @param {number} column
 * @param {ClosedIntRange} rows
 * @return {MsaSubseqChangeArray}
 */
Msa.prototype.levelLeft = function(column, rows) {
    assert(this.isValidColumn(column), 'column out of range');
    assert(this.isValidRowRange(rows), 'rows out of range');

    if (column > 1)
        return this.doTrimLeft_(column - 1, rows).concat(this.doExtendLeft_(column, rows));

    // Special case: column == 1
    return this.doExtendLeft_(column, rows);
};

/**
 * Maximally level the stop positions of rows up to and including column; return a vector changes
 *
 * @param {number} column
 * @param {ClosedIntRange} rows
 * @return {MsaSubseqChangeArray}
 */
Msa.prototype.levelRight = function(column, rows) {
    assert(this.isValidColumn(column), 'column out of range');
    assert(this.isValidRowRange(rows), 'rows out of range');

    if (column < this.columnCount())
        return this.doTrimRight_(column + 1, rows).concat(this.doExtendRight_(column, rows));

    // Special case: column == length()
    return this.doExtendRight_(column, rows);
};

/** @return {Array.<Subseq>} */
Msa.prototype.members = function() {
    return this.subseqs_;
};

/**
 * Moves the subseq at index position, from, to index position, to.
 *
 * @param {number} from
 * @param {number} to
 */
Msa.prototype.moveRow = function(from, to) {
    assert(this.isValidRow(from), 'from out of range');
    assert(to > 0 && to < this.rowCount() + 1, 'to out of range');
    if (from !== to) {
        var fromSubseq = this.at(from);
        array.removeAt(this.subseqs_, from - 1);
        array.insertAt(this.subseqs_, fromSubseq, to - 1);
    }
};

/**
 * Moves rows to the index position, to.
 *
 * @param {ClosedIntRange} rows
 * @param {number} to
 */
Msa.prototype.moveRowRange = function(rows, to) {
    assert(this.isValidRowRange(rows), 'rows out of range');
    assert(to > 0 && to <= this.rowCount() + 1, 'to out of range');
    if (to === rows.begin)
        return;

    var subseqs = array.splice(this.subseqs_, rows.begin - 1, rows.length());
    array.insertArrayAt(this.subseqs_, subseqs, to - 1);
};

/**
 * Moves rows delta positions.
 *
 * @param {ClosedIntRange} rows
 * @param {number} delta
 */
Msa.prototype.moveRowRangeRelative = function(rows, delta) {
    this.moveRowRange(rows, rows.begin + delta);
};

/**
 * Moves the Subseq at index delta positions (negative indicates upwards, positive indicates downwards).
 *
 * @param {number} from
 * @param {number} delta
 */
Msa.prototype.moveRowRelative = function(from, delta) {
    this.moveRow(from, from + delta);
};

/**
 * @param {UnitRect} rect
 * @return {boolean}
 */
Msa.prototype.rectAllGaps = function(rect) {
    assert(this.isValidRect(rect), 'rect out of range');
    var left = rect.x1;
    var right = rect.x2;
    if (left > right) {
        left = rect.x2;
        right = rect.x1;
    }
    var top = rect.y1;
    var bottom = rect.y2;
    if (top > bottom) {
        top = rect.y2;
        bottom = rect.y1;
    }

    for (var y=top; y<=bottom; ++y) {
        var buffer = this.at(y).constBuffer();
        for (var x=left-1; x<right; ++x)
            if (!isGapCharacterCode(buffer[x]))
                return false;
    }

    return true;
};

/** @param {number} row */
Msa.prototype.removeAt = function(row) {
    assert(this.isValidRow(row), 'row out of range');
    array.removeAt(this.subseqs_, row - 1);
};

/**
 * Remove any gap columns within columns and return an ordered vector of the gap ranges removed. If columns
 * is empty, removes all gap columns present in the entire alignment.
 *
 * @param {ClosedIntRange=} optColumns
 * @return {ClosedIntRangeArray}
 */
Msa.prototype.removeGapColumns = function(optColumns) {
    if (!optColumns && this.isEmpty())
        return [];

    var columns = optColumns ? optColumns : new ClosedIntRange(1, this.columnCount());
    assert(this.isValidColumnRange(columns), 'columns out of range');
    var contiguousGapRanges = this.findGapColumns_(columns);
    var i = contiguousGapRanges.length;
    var nRows = this.rowCount();
    while (i--) {
        var range = contiguousGapRanges[i];
        var first = range.begin;
        var amount = range.length();
        for (var j=0; j<nRows; ++j)
            this.subseqs_[j].removeGaps(first, amount);
    }
    return contiguousGapRanges;
};

/** @param {ClosedIntRange} rows */
Msa.prototype.removeRows = function(rows) {
    assert(this.isValidRowRange(rows), 'rows out of range');
    array.splice(this.subseqs_, rows.begin - 1, rows.length());
};

/** @return {number} */
Msa.prototype.rowCount = function() {
    return this.subseqs_.length;
};

/**
 * Changes are simply extensions (replacing gaps with characters) or trims (replacing characters with gaps).
 * For example,
 * ABC-- >>> --C-- (trim)
 * --C-- >>> ABC-- (extension)
 *
 * Setting the start position beyond the current stop position is not allowed.
 *
 * @param {number} row
 * @param {number} newStart
 * @return {MsaSubseqChange}
 */
Msa.prototype.setSubseqStart = function(row, newStart) {
    assert(this.isValidRow(row), 'row out of range');
    assert(newStart <= this.at(row).stop(), 'Moving start beyond the current stop is not permitted');

    var subseq = this.at(row);
    var start = subseq.start();
    if (newStart < start) {
        var nToExtend = start - newStart;
        var column = subseq.extendLeft(nToExtend);
        var extensionRange = new ClosedIntRange(column, column + nToExtend - 1);
        return new MsaSubseqChange(row, extensionRange, TrimExtOp.eExtendLeft, subseq.mid(extensionRange));
    }
    else if (newStart > start) {
        var nToChop = newStart - start;
        var change = Msa.trimSubseqLeft_(subseq, nToChop);
        change.row = row;
        return change;
    }

    return new MsaSubseqChange();
};

/**
 * Changes are simply extensions (replacing gaps with characters) or trims (replacing characters with gaps).
 * For example,
 * --CDE >>> --C-- (trim)
 * --C-- >>> --CDE (extension)
 *
 * Setting the stop position before the current start position is not allowed.
 * @param {number} row
 * @param {number} newStop
 * @return {MsaSubseqChange}
 */
Msa.prototype.setSubseqStop = function(row, newStop) {
    assert(this.isValidRow(row), 'row out of range');
    assert(newStop >= this.at(row).start(), 'Moving stop before the current start is not permitted');

    var subseq = this.at(row);
    var stop = subseq.stop();
    if (newStop < stop) {
        var nToChop = stop - newStop;
        var change = Msa.trimSubseqRight_(subseq, nToChop, this.columnCount());
        change.row = row;
        return change;
    }
    else if (newStop > stop) {
        var nToExtend = newStop - stop;
        var column = subseq.extendRight(nToExtend);
        var extensionRange = new ClosedIntRange(column, column + nToExtend - 1);
        return new MsaSubseqChange(row, extensionRange, TrimExtOp.eExtendRight, subseq.mid(extensionRange));
    }

    return new MsaSubseqChange();
};

/**
 * Horizontally slide the characters in msaRect, delta positions and return the direction (negative to the left,
 * positive to the right) and number of positions successfully moved.
 *
 * Core editing routine for manipulating the characters within a Msa. In essence, all editing operations boil down
 * to horizontally sliding a block of characters within the limits of the alignment. Left/top+ right/bottom denotes a
 * rectangular set of coordinates which may be in any order and positive or negative given that each point is within
 * the Msa boundaries. delta may not be zero and is the number of positions to slide left (negative delta) or right
 * (positive delta).
 *
 * If the rectangular region contains non-gap characters, will horizontally slide the characters until the region is
 * immediately adjacent to other non-gap characters at any point along the vertical edge of region. On the other hand,
 * if region is solely comprised of gap characters, this may be moved to any extent up to the alignment bounds.
 *
 * The delta emitted corresponds to the actual delta and not the requested delta.
 *
 * @param {UnitRect} rect
 * @param {number} delta
 * @return {number}
 */
Msa.prototype.slideRect = function(rect, delta) {
    assert(this.isValidRect(rect), 'rect out of range');
    if (delta === 0)
        return 0;

    var normRect = rect.normalized();
    var sourceHorizontalRange = normRect.horizontalRange();

    var top = normRect.y1;
    var bottom = normRect.y2;

    var actualDelta = 0;
    if (delta < 0) {  // Slide to the left
        actualDelta = this.at(top).leftSlidablePositions(sourceHorizontalRange);
        for (var i=top+1; actualDelta > 0 && i<= bottom; ++i) {
            var tmp = this.at(i).leftSlidablePositions(sourceHorizontalRange);
            if (tmp < actualDelta)
                actualDelta = tmp;
        }

        // Negate actualDelta because we are sliding to the left
        actualDelta = -actualDelta;

        // If actualDelta can slide more spots than requested, limit to the number of spots requested
        if (actualDelta < delta)
            actualDelta = delta;
    }
    else {    // (delta > 0) slide to the right
        actualDelta = this.at(top).rightSlidablePositions(sourceHorizontalRange);
        for (var i=top+1; actualDelta > 0 && i<= bottom; ++i) {
            var tmp = this.at(i).rightSlidablePositions(sourceHorizontalRange);
            if (tmp < actualDelta)
                actualDelta = tmp;
        }

        // If actualDelta can slide more spots than requested, limit to the number of spots requested
        if (actualDelta > delta)
            actualDelta = delta;
    }

    if (actualDelta)
        this.doSlide_(top, bottom, sourceHorizontalRange, actualDelta, rect);
        //                                                             ^^^^
        // This is actually not used in this class, but the derived ObservableMsa class
        // utilizes this to emit the exact user rectangle slid (should this be relevant)

    return actualDelta;
};

/**
 * @param {number} top
 * @param {number} bottom
 * @param {ClosedIntRange} columns
 * @param {number} delta
 * @param {UnitRect} sourceRect Not used in this class, but possibly useful in subclasses (e.g. ObservableMsa)
 * @protected
 */
Msa.prototype.doSlide_ = function(top, bottom, columns, delta, sourceRect) {
    for (; top<= bottom; ++top)
        this.at(top).slide(columns, delta);
};

/**
 * Sorts the subseqs using the comparison function callback.
 *
 * @param {Function} callback
 */
Msa.prototype.sort = function(callback) {
    array.stableSort(this.subseqs_, callback);
};

/**
 * Extracts and returns an array of the subseqs spanning rows.
 *
 * @param {ClosedIntRange} rows
 * @return {Array.<Subseq>}
 */
Msa.prototype.takeRows = function(rows) {
    assert(this.isValidRowRange(rows), 'rows out of range');

    return array.splice(this.subseqs_, rows.begin - 1, rows.length());
};

/**
 * @param {number} column
 * @param {ClosedIntRange} rows
 * @return {MsaSubseqChangeArray}
 */
Msa.prototype.trimLeft = function(column, rows) {
    // To accommodate the ObservableMsa class, we push the action of this method to a
    // private method. This way when ObservableMsa instances call one of the level
    // methods (which utilize this functionality), the trim/extend calls will not
    // call the virtual methods on ObservableMsa and cause undesired duplicate messages.
    return this.doTrimLeft_(column, rows);
};

/**
 * @param {number} column
 * @param {ClosedIntRange} rows
 * @return {MsaSubseqChangeArray}
 */
Msa.prototype.trimRight = function(column, rows) {
    return this.doTrimRight_(column, rows);
};

/**
 * Performs the inverse of each change in changes and returns a equivalently sized vector of the inverses.
 *
 * If the changes only contains one change per subseq, then the order in which the changes are undone
 * would not matter; however, sometimes there will be multiple changes for a given subseq (e.g. from levelLeft or
 * levelRight commands) in which their order of application is significant. Therefore, it is vital to treat this
 * vector of changes like a stack and undo them in the reverse order.
 *
 * @param {MsaSubseqChangeArray} changes
 * @return {MsaSubseqChangeArray}
 */
Msa.prototype.undo = function(changes) {
    var undoneChanges = [];
    var i = changes.length;
    while (i--) {
        var change = changes[i];
        if (change.row === 0)
            continue;

        var subseq = this.at(change.row);

        // This is the operation that we are "undo'ing"
        switch(change.operation) {
        case TrimExtOp.eExtendLeft:
            subseq.trimLeft(change.columns);
            change.operation = TrimExtOp.eTrimLeft;
            break;
        case TrimExtOp.eExtendRight:
            subseq.trimRight(change.columns);
            change.operation = TrimExtOp.eTrimRight;
            break;
        case TrimExtOp.eTrimLeft:
            subseq.extendLeftWith(change.difference, change.columns.begin);
            change.operation = TrimExtOp.eExtendLeft
            break;
        case TrimExtOp.eTrimRight:
            subseq.extendRightWith(change.difference, change.columns.begin);
            change.operation = TrimExtOp.eExtendRight;
            break;
        case TrimExtOp.eInternal:
            var old = subseq.mid(change.columns);
            subseq.rearrange(change.columns, change.difference);
            change.difference = old;
            break;

        default:
            assert(false, "Unimplemented switch condition");
            break;
        }

        undoneChanges.push(change);
    }

    return undoneChanges;
};

// --------------------------------------------------------------------------------------------------------------------
// Private actionable methods
/**
 * @param {number} column
 * @param {ClosedIntRange} rows
 * @return {ag.bio.MsaSubseqChangeArray}
 * @private
 */
Msa.prototype.doExtendLeft_ = function(column, rows) {
    assert(this.isValidColumn(column), 'column out of range');
    assert(this.isValidRowRange(rows), 'rows out of range');

    var changes = [];
    for (var row=rows.begin, end=rows.end; row <= end; ++row) {
        var subseq = this.at(row);
        var nNewCharacters = subseq.leftExtendableLength(column);
        if (nNewCharacters) {
            var effectiveColumn = subseq.extendLeft(nNewCharacters);
            var extensionRange = new ClosedIntRange(effectiveColumn, effectiveColumn + nNewCharacters - 1);
            var change = new MsaSubseqChange(row, extensionRange, TrimExtOp.eExtendLeft, subseq.mid(extensionRange));
            changes.push(change);
        }
    }
    return changes;
};

/**
 * @param {number} column
 * @param {ClosedIntRange} rows
 * @return {ag.bio.MsaSubseqChangeArray}
 * @private
 */
Msa.prototype.doExtendRight_ = function(column, rows) {
    assert(this.isValidColumn(column), 'column out of range');
    assert(this.isValidRowRange(rows), 'rows out of range');

    var changes = [];
    for (var row=rows.begin, end=rows.end; row <= end; ++row) {
        var subseq = this.at(row);
        var nNewCharacters = subseq.rightExtendableLength(column);
        if (nNewCharacters) {
            var effectiveColumn = subseq.extendRight(nNewCharacters);
            var extensionRange = new ClosedIntRange(effectiveColumn, effectiveColumn + nNewCharacters - 1);
            var change = new MsaSubseqChange(row, extensionRange, TrimExtOp.eExtendRight, subseq.mid(extensionRange));
            changes.push(change);
        }
    }
    return changes;
};

/**
 * @param {number} column
 * @param {ClosedIntRange} rows
 * @return {MsaSubseqChangeArray}
 * @private
 */
Msa.prototype.doTrimLeft_ = function(column, rows) {
    assert(this.isValidColumn(column), 'column out of range');
    assert(this.isValidRowRange(rows), 'rows out of range');

    var changes = [];
    for (var row=rows.begin, end=rows.end; row <= end; ++row) {
        var subseq = this.at(row);
        var nHeadGaps = subseq.headGaps();
        if (column <= nHeadGaps)
            continue;

        var trimRange = new ClosedIntRange(nHeadGaps + 1, column);
        var nTrimmableChars = subseq.nonGapsBetween(trimRange);

        var buffer = subseq.constBuffer();

        // Prevent trim operations from removing all characters so we reduce the number of trimmable characters by one.
        // Additionally, adjust the trim range at the same time
        if (subseq.ungappedLength() - nTrimmableChars < 1) {
            var i = trimRange.end - 1; // -1 to map to 0-based indices
            while (1) {
                --trimRange.end;
                if (!isGapCharacterCode(buffer[i]))
                    break;

                --i;
            }
            --nTrimmableChars;
        }
        if (nTrimmableChars === 0)
            continue;

        // Could simply call the trimLeft(i, nCharsToTrim) method; however, that would require looping through the
        // sequence again looking for the exact range to trim. This would duplicate effort, since we already know
        // the exact range to trim. The only complication is that the trimRange.end might have trailing gap characters.
        // Thus, we remove these in this loop.
        var i = trimRange.end - 1;
        while (isGapCharacterCode(buffer[i])) {
            --i;
            --trimRange.end;
        }

        var difference = subseq.mid(trimRange);
        subseq.trimLeft(trimRange);
        changes.push(new MsaSubseqChange(row, trimRange, TrimExtOp.eTrimLeft, difference));
    }
    return changes;
};

/**
 * @param {number} column
 * @param {ClosedIntRange} rows
 * @return {MsaSubseqChangeArray}
 * @private
 */
Msa.prototype.doTrimRight_ = function(column, rows) {
    assert(this.isValidColumn(column), 'column out of range');
    assert(this.isValidRowRange(rows), 'rows out of range');

    var changes = [];
    for (var row=rows.begin, end=rows.end; row <= end; ++row) {
        var subseq = this.at(row);
        var firstTailGap = this.columnCount() - subseq.tailGaps() + 1;
        if (column >= firstTailGap)
            continue;

        var trimRange = new ClosedIntRange(column, firstTailGap - 1);
        var nTrimmableChars = subseq.nonGapsBetween(trimRange);

        var buffer = subseq.constBuffer();

        // Prevent trim operations from removing all characters so we reduce the number of trimmable characters by one.
        // Additionally, adjust the trim range at the same time
        if (subseq.ungappedLength() - nTrimmableChars < 1) {
            var i = trimRange.begin - 1; // -1 to map to 0-based indices
            while (1) {
                ++trimRange.begin;
                if (!isGapCharacterCode(buffer[i]))
                    break;

                ++i;
            }
            --nTrimmableChars;
        }
        if (nTrimmableChars === 0)
            continue;

        // Could simply call the trimRight(i, nCharsToTrim) method; however, that would require looping through the
        // sequence again looking for the exact range to trim. This would duplicate effort, since we already know
        // the exact range to trim. The only complication is that the trimRange.begin might have leading gap characters.
        // Thus, we remove these in this loop.
        var i = trimRange.begin - 1;
        while (isGapCharacterCode(buffer[i])) {
            ++i;
            ++trimRange.begin;
        }

        var difference = subseq.mid(trimRange);
        subseq.trimRight(trimRange);
        changes.push(new MsaSubseqChange(row, trimRange, TrimExtOp.eTrimRight, difference));
    }
    return changes;
};



// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * Row-based strategy for finding columns containing purely gaps. The approach follows the given rules (X
 * indicates columns currently recognized as all-gaps, and * indicates a column that has just been identified with a
 * non-gap character):
 *
 * ___X___ | X___ | ___X
 *    *      *         *
 * Result: remove this gap range
 *
 * __XXX__
 *    *
 * Result: split the one gap range (3 -> 5) into two separate gap ranges: (3 -> 3) and (5 -> 5)
 *
 * __XX__ | __XX__
 *   *         *
 * Result: shrink the range by increasing the beginning by one or decreasing the end by one, respectively.
 *
 * The above should capture all possible situations and the algorithm begins with one gap range that spans the specified
 * columns. This one gap range may be reduced to nothing as non-gap characters are located.
 *
 * By iterating over the rows instead of the columns, we more efficiently access the memory which should result in
 * increased performance because the sequence will likely remain in the cache. In contrast, moving column by column
 * requires jumping to a new memory location with each character lookup.
 *
 * @param {ClosedIntRange} columns
 * @return {ClosedIntRangeArray}
 * @private
 */
Msa.prototype.findGapColumns_ = function(columns) {
    assert(this.isValidColumnRange(columns), 'columns out of range');

    var rows = this.rowCount();
    var contiguousGapRanges = [columns];
    for (var i=0; i< rows; ++i) {
        var subseq = this.subseqs_[i];

        // Traverse all gap ranges
        for (var j=0; j<contiguousGapRanges.length; ++j) {
            //        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Because we insert new ranges in this process
            // it is vital that we always check for this condition rather than caching it.
            var gapRange = contiguousGapRanges[j];
            if (!gapRange)
                // This occurs when a previously created gap range has been erased
                continue;

            // Walk each character in the buffer that spans gapRange
            var buffer = subseq.constBuffer();
            var x = gapRange.begin - 1;
            for (var k=gapRange.begin; k<= gapRange.end; ++k, ++x) {
                if (!isGapCharacterCode(buffer[x])) {
                    // Case A: We found a non-gap character at the very beginning of this range
                    if (k === gapRange.begin) {
                        ++gapRange.begin;
                        if (gapRange.begin > gapRange.end) {
                            contiguousGapRanges[j] = null;
                            break;
                        }
                    }
                    // Case B: Non-gap character at the end of the range
                    else if (k === gapRange.end) {
                        --gapRange.end;
                        assert(gapRange.end >= gapRange.begin);
                    }
                    // Case C: Non-gap character in the middle of the range => split this group
                    else {
                        array.insertAt(contiguousGapRanges, new ClosedIntRange(gapRange.begin, k - 1), j);
                        ++j;
                        gapRange.begin = k + 1;
                    }
                }
            }
        }
    }

    var nonNullRanges = contiguousGapRanges.grep(function(range) { return range; });
    return nonNullRanges;
};

/**
 * @param {Subseq} subseq
 * @return {boolean}
 * @private
 */
Msa.prototype.isCompatibleSubseq_ = function(subseq) {
    return goog.isDefAndNotNull(subseq) &&
        subseq.grammar() === this.grammar_ &&
        subseq.hasNonGaps() &&
        (this.rowCount() === 0 || subseq.length() === this.columnCount());
};

/**
 * At least one non-gap character must remain after the trim operation.
 *
 * Why not simply have this functionality in Subseq?
 * 1) Because it would have to return the relevant changes in some new custom structure
 * 2) Given #1, capture the difference *before* the trim operation takes place
 * 3) the trimLeft operation is actually quite fast because it simply utilizes memcpy with a gap buffer
 *
 * @param {Subseq} subseq
 * @param {number} nCharsToRemove
 * @return {MsaSubseqChange}
 */
Msa.trimSubseqLeft_ = function(subseq, nCharsToRemove) {
    assert(nCharsToRemove > 0, 'nCharsToRemove must be positive');
    assert(subseq.ungappedLength() > nCharsToRemove, 'Removing all non-gap characters is not allowed');

    var nHeadGaps = subseq.headGaps();
    var range = new ClosedIntRange(nHeadGaps + 1);
    --nCharsToRemove;

    var i = range.begin;
    var buffer = subseq.constBuffer();
    while (nCharsToRemove) {
        if (!isGapCharacterCode(buffer[i]))
            --nCharsToRemove;

        ++range.end;
        ++i;
    }

    var difference = subseq.mid(range);
    subseq.trimLeft(range);
    return new MsaSubseqChange(0, range, TrimExtOp.eTrimLeft, difference);
};

/**
 * At least one non-gap character must remain after the trim operation.
 *
 * Why not simply have this functionality in Subseq?
 * 1) Because it would have to return the relevant changes in some new custom structure
 * 2) Given #1, capture the difference *before* the trim operation takes place
 * 3) the trimLeft operation is actually quite fast because it simply utilizes memcpy with a gap buffer
 *
 * @param {Subseq} subseq
 * @param {number} nCharsToRemove
 * @param {number} columnCount
 * @return {MsaSubseqChange}
 */
Msa.trimSubseqRight_ = function(subseq, nCharsToRemove, columnCount) {
    assert(nCharsToRemove > 0, 'nCharsToRemove must be positive');
    assert(subseq.ungappedLength() > nCharsToRemove, 'Removing all non-gap characters is not allowed');

    var nTailGaps = subseq.tailGaps();
    var range = new ClosedIntRange(columnCount - nTailGaps);
    --nCharsToRemove;

    var i = range.end - 2;
    var buffer = subseq.constBuffer();
    while (nCharsToRemove) {
        if (!isGapCharacterCode(buffer[i]))
            --nCharsToRemove;

        --range.begin;
        --i;
    }

    var difference = subseq.mid(range);
    subseq.trimRight(range);
    return new MsaSubseqChange(0, range, TrimExtOp.eTrimRight, difference);
};

/*******************************************************************************************************************/});
