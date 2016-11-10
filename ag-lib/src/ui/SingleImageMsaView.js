goog.provide('ag.ui.SingleImageMsaView');

goog.require('ag.ui.MsaView');
goog.require('ag.core.ClosedIntRange');
goog.require('ag.core.Point');
goog.require('ag.core.RangeSet');
goog.require('ag.core.UnitRect');

goog.require('goog.asserts');
goog.require('goog.dom.TagName');
goog.require('goog.math.Coordinate');

/**
 * @constructor
 * @extends {ag.ui.MsaView}
 */
ag.ui.SingleImageMsaView = function() {
    goog.base(this);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {ag.core.UnitRect}
     * @private
     */
    this.cachedMsaRect_ = new ag.core.UnitRect();

    /**
     * @type {HTMLCanvasElement}
     * @private
     */
    this.cachedCanvas_;

    /**
     * @type {CanvasRenderingContext2D}
     * @private
     */
    this.cachedContext_;

    /**
     * @type {number}
     * @private
     */
    this.width_ = 0;

    /**
     * @type {number}
     * @private
     */
    this.height_ = 0;
};
goog.inherits(ag.ui.SingleImageMsaView, ag.ui.MsaView);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var TagName = goog.dom.TagName;

var ClosedIntRange = ag.core.ClosedIntRange;
var Coordinate = goog.math.Coordinate;
var Point = ag.core.Point;
var RangeSet = ag.core.RangeSet;
var UnitRect = ag.core.UnitRect;

var SingleImageMsaView = ag.ui.SingleImageMsaView;


// --------------------------------------------------------------------------------------------------------------------
// Public functions
SingleImageMsaView.prototype.clearCache = function() {
    var r = this.cachedMsaRect_;
    r.x1 = 0;
    r.x2 = 0;
    r.y1 = 0;
    r.y1 = 0;
};

/** @override */
SingleImageMsaView.prototype.drawMsa = function(context, origin, msaRect) {
    if (msaRect.ne(this.cachedMsaRect_))
        this.updateCanvas_(msaRect);

    context.drawImage(this.cachedCanvas_, 0, 0, this.width_, this.height_, origin.x, origin.y, this.width_, this.height_);
};

/** @override */
SingleImageMsaView.prototype.decorateInternal = function(element) {
    goog.base(this, 'decorateInternal', element);

    this.cachedCanvas_ = /** @type {HTMLCanvasElement} */ (this.dom_.createElement(TagName.CANVAS));
    this.cachedContext_ = /** @type {CanvasRenderingContext2D} */ (this.cachedCanvas_.getContext('2d'));
};

/** @override */
SingleImageMsaView.prototype.setColorProvider = function(colorProvider) {
    goog.base(this, 'setColorProvider', colorProvider);
    this.clearCache();
};

/** @override */
SingleImageMsaView.prototype.setFont = function(newFont) {
    if (goog.base(this, 'setFont', newFont)) {
        this.clearCache();
        return true;
    }

    return false;
};

/** @override */
SingleImageMsaView.prototype.setMsa = function(newMsa) {
    goog.base(this, 'setMsa', newMsa);
    this.clearCache();
};

// --------------------------------------------------------------------------------------------------------------------
// Reimplemented protected slots
/** @override */
SingleImageMsaView.prototype.onMsaCollapsedLeft = function(rect) {
    this.repaintColumns_(rect.normalized().horizontalRange());
};

/** @override */
SingleImageMsaView.prototype.onMsaCollapsedRight = function(rect) {
    this.repaintColumns_(rect.normalized().horizontalRange());
};

/** @override */
SingleImageMsaView.prototype.onMsaGapColumnsInserted = function(columns) {
    goog.base(this, 'onMsaGapColumnsInserted', columns);

    if (columns.begin > this.cachedMsaRect_.x2)
        return;

    var columnsLength = columns.length();
    if (columns.begin < this.cachedMsaRect_.x1) {
        // Update the cached msa rect and then return
        this.cachedMsaRect_.moveLeft(this.cachedMsaRect_.x1 + columnsLength);
        return;
    }

    // Copy old area and then render the new gap columns
    var blockSize = this.blockSize();
    var bw = blockSize.width;
    var bh = blockSize.height;
    var srcX = (columns.begin - this.cachedMsaRect_.x1) * bw;
    var srcY = 0;
    if (columns.begin < this.cachedMsaRect_.x2 - columnsLength + 1) {
        var srcW = (this.cachedMsaRect_.x2 - columns.begin - columnsLength + 1) * bw;
        var srcH = this.cachedMsaRect_.height() * bh;

        assert(srcW > 0);

        var dstX = (columns.begin + columnsLength - this.cachedMsaRect_.x1) * bw;
        var dstY = 0;

        this.cachedContext_.drawImage(this.cachedCanvas_, srcX, srcY, srcW, srcH, dstX, dstY, srcW, srcH);
    }

    // Now render the new gap columns
    var origin = Point.create(srcX, srcY);
    var rect = UnitRect.create(columns.begin, this.cachedMsaRect_.y1, columnsLength, this.cachedMsaRect_.height());
    this.renderMsaRegion(this.cachedContext_, origin, rect);
    origin.release();
    rect.release();
};

/** @override */
SingleImageMsaView.prototype.onMsaGapColumnsRemoved = function(columnRanges) {
    goog.base(this, 'onMsaGapColumnsRemoved', columnRanges);

    var preservedSet = new RangeSet(this.cachedMsaRect_.horizontalRange());
    preservedSet.subtract(columnRanges);
    if (preservedSet.isEmpty()) {
        this.clearCache();
        return;
    }

    var blockSize = this.blockSize();
    var bw = blockSize.width;
    var bh = blockSize.height;
    var srcY = 0;
    var srcH = this.cachedMsaRect_.height() * bh;
    var dstY = 0;
    var ranges = preservedSet.ranges();
    // -----------------------------------------
    // 1) Copy the old area that has not changed
    var i = (this.cachedMsaRect_.x1 !== ranges[0].begin) ? 0 : 1;
    var dstX = (i === 0) ? 0 : ranges[0].length() * bw;
    for (var z=ranges.length; i<z; i++) {
        var columns = ranges[i];

        var srcX = (columns.begin - this.cachedMsaRect_.x1) * bw;
        var srcW = columns.length() * bw;
        this.cachedContext_.drawImage(this.cachedCanvas_, srcX, srcY, srcW, srcH, dstX, dstY, srcW, srcH);

        dstX += srcW;
    }

    // -----------------------------------------
    // 2) Adjust the cached msa rect x positions
    var nColumnsRemovedAtLeftTerminus = 0;
    i=0;
    for (var z=columnRanges.length; i<z; i++) {
        var columns = columnRanges[i];
        if (columns.end < this.cachedMsaRect_.x1)
            nColumnsRemovedAtLeftTerminus += columns.length();
        else if (columns.begin < this.cachedMsaRect_.x1)
            nColumnsRemovedAtLeftTerminus += this.cachedMsaRect_.x1 - columns.begin;
        else
            break;
    }
    this.cachedMsaRect_.x1 -= nColumnsRemovedAtLeftTerminus;
    this.cachedMsaRect_.x2 = Math.min(this.cachedMsaRect_.x1 + preservedSet.summedLength() - 1, this.msa().columnCount());

    // -----------------------------------------
    // 3) All new columns to be painted will be rendered appropriatel in the update function - no
    //    need to do that calculation here.

    // -----------------------------------------
    // 4) Update the width and height variables used to determine which portion of the canvas to render
    //    Technically, should resize the canvas, but we are skipping that for now.
    //    TODO: update the canvas size here?
    this.width_ = this.cachedMsaRect_.width() * bw;
    this.height_ = this.cachedMsaRect_.height() * bh;
};

/** @override */
SingleImageMsaView.prototype.onMsaSlid = function(rect, delta, finalRange) {
    goog.base(this, 'onMsaSlid', rect, delta, finalRange);

    var normRect = rect.normalized();
    var start = Math.min(normRect.x1, finalRange.begin);
    var stop = Math.max(normRect.x2, finalRange.end);
    this.repaintColumns_(new ClosedIntRange(start, stop));
};

/** @override */
SingleImageMsaView.prototype.onMsaSubseqsChanged = function(changes) {
    goog.base(this, 'onMsaSubseqsChanged', changes);

    // Extract the minimum and maximum columns affected
    var affectedColumns = new ClosedIntRange(9999999, 0);
    var i = changes.length;
    if (i === 0)
        return;

    while (i--) {
        var columns = changes[i].columns;
        if (columns.begin < affectedColumns.begin)
            affectedColumns.begin = columns.begin;

        if (columns.end > affectedColumns.end)
            affectedColumns.end = columns.end;
    }

    this.repaintColumns_(affectedColumns);
};

// --------------------------------------------------------------------------------------------------------------------
// Private functions
/**
 * @param {ClosedIntRange} columns
 * @private
 */
SingleImageMsaView.prototype.repaintColumns_ = function(columns) {
    if (columns.begin > this.cachedMsaRect_.x2 || columns.end < this.cachedMsaRect_.x1)
        return;

    var start = Math.max(columns.begin, this.cachedMsaRect_.x1);
    var stop = Math.min(columns.end, this.cachedMsaRect_.x2);

    var blockSize = this.blockSize();
    var origin = Point.create((start - this.cachedMsaRect_.x1) * blockSize.width, 0);
    var rect = UnitRect.create(start, this.cachedMsaRect_.y1, stop - start + 1, this.cachedMsaRect_.height());
    this.renderMsaRegion(this.cachedContext_, origin, rect);
    origin.release();
    rect.release();
    this.update();
};

/**
 * @param {UnitRect} msaRect
 * @private
 */
SingleImageMsaView.prototype.updateCanvas_ = function(msaRect) {
    var blockSize = this.blockSize();
    var bw = blockSize.width;
    var bh = blockSize.height;

    if (this.cachedMsaRect_.containsUnitRect(msaRect)) {
        // Copy existing part to top left corner of canvas and adjust dimensions accordingly
        var sx = (msaRect.x1 - this.cachedMsaRect_.x1) * bw;
        var sy = (msaRect.y1 - this.cachedMsaRect_.y1) * bh;
        var w = msaRect.width() * bw;
        var h = msaRect.height() * bh;
        this.cachedContext_.drawImage(this.cachedCanvas_, sx, sy, w, h, 0, 0, w, h);
        this.width_ = w;
        this.height_ = h;
        this.cachedMsaRect_.assign(msaRect);
        return;
    }

    var regionCanvas = this.cachedCanvas_;
    var regionContext = this.cachedContext_;

    var deltaWidth = msaRect.width() - this.cachedMsaRect_.width();
    var deltaHeight = msaRect.height() - this.cachedMsaRect_.height();
    if (deltaWidth || deltaHeight) {
        // Create a new canvas and context
        regionCanvas = this.dom_.createElement(TagName.CANVAS);
        regionCanvas.width = Math.max(msaRect.width(), this.cachedMsaRect_.width()) * bw;
        regionCanvas.height = Math.max(msaRect.height(), this.cachedMsaRect_.height()) * bh;
        regionContext = regionCanvas.getContext('2d');
    }

    var tmpPoint = Point.create(0, 0);
    var intersection = this.cachedMsaRect_.intersection(msaRect);
    if (intersection) {
        var tmpRect = UnitRect.create();
        tmpRect.assign(msaRect);

        var nTopRows = Math.max(0, intersection.y1 - msaRect.y1);
        var nLeftRows = intersection.x1 - msaRect.x1;
        var nBottomRows = msaRect.y2 - intersection.y2;
        var nRightRows = msaRect.x2 - intersection.x2;

        var dx = msaRect.x1 - this.cachedMsaRect_.x1;
        var dy = msaRect.y1 - this.cachedMsaRect_.y1;

        // Draw the intersection - must do this first because the cached image (still points to the old
        // rendering) likely contains other obsolete data
        regionContext.drawImage(this.cachedCanvas_, 0, 0, this.width_, this.height_, -dx*bw, -dy*bh, this.width_, this.height_);

        if (nTopRows > 0) {
            tmpRect.setHeight(nTopRows);
            this.renderMsaRegion(regionContext, tmpPoint, tmpRect);
            // new UnitRect(msaRect.x1, msaRect.y1, msaRect.width(), nTopRows)
        }

        if (nLeftRows > 0) {
            tmpPoint.y = nTopRows * bh;
            tmpRect.y1 = intersection.y1;
            tmpRect.setWidth(nLeftRows);
            tmpRect.setHeight(intersection.height());
            this.renderMsaRegion(regionContext, tmpPoint, tmpRect);
            // this.renderMsaRegion(regionContext, tmpPoint, new UnitRect(msaRect.x1, intersection.y1, nLeftRows, intersection.height()));
        }

        if (nRightRows > 0) {
            assert(intersection.right() >= msaRect.left());
            tmpPoint.x = (intersection.x2 - msaRect.x1 + 1)*bw;
            tmpPoint.y = nTopRows * bh;

            tmpRect.x1 = intersection.x2 + 1;
            tmpRect.y1 = intersection.y1;
            tmpRect.setWidth(nRightRows);
            tmpRect.setHeight(intersection.height());
            this.renderMsaRegion(regionContext, tmpPoint, tmpRect);
            // this.renderMsaRegion(regionContext, new Coordinate((intersection.x2 - msaRect.x1 + 1)*bw, nTopRows * bh),
            //     new UnitRect(intersection.x2 + 1, intersection.y1, nRightRows, intersection.height()));
        }

        if (nBottomRows > 0) {
            assert(intersection.bottom() >= msaRect.top());
            tmpPoint.x = 0;
            tmpPoint.y = (intersection.y2 - msaRect.y1 + 1)*bh;

            tmpRect.x1 = msaRect.x1;
            tmpRect.y1 = intersection.y2 + 1;
            tmpRect.setWidth(msaRect.width());
            tmpRect.setHeight(nBottomRows);

            this.renderMsaRegion(regionContext, tmpPoint, tmpRect);
            // this.renderMsaRegion(regionContext, new Coordinate(0, (intersection.y2 - msaRect.y1 + 1)*bh),
            //     new UnitRect(msaRect.x1, intersection.y2 + 1, msaRect.width(), nBottomRows));
        }

        tmpRect.release();
    }
    else {
        // Completely new rendering!!
        this.renderMsaRegion(regionContext, tmpPoint, msaRect);
    }

    this.cachedCanvas_ = /** @type {HTMLCanvasElement} */ (regionCanvas);
    this.cachedContext_ = regionContext;
    this.cachedMsaRect_.assign(msaRect);
    this.width_ = msaRect.width() * bw;
    this.height_ = msaRect.height() * bh;

    tmpPoint.release();
};

/*******************************************************************************************************************/});
