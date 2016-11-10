goog.provide('ag.ui.PointRectMapper');

goog.require('ag.core.Point');
goog.require('ag.core.UnitRect');

goog.require('goog.asserts');
goog.require('goog.math');

/**
 * @constructor
 * @param {ag.ui.MsaView} msaView
 */
ag.ui.PointRectMapper = function(msaView) {
    /**
     * @type {ag.ui.MsaView}
     */
    this.msaView = msaView;
};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var math = goog.math;

var Point = ag.core.Point;
var PointRectMapper = ag.ui.PointRectMapper;
var UnitRect = ag.core.UnitRect;

// --------------------------------------------------------------------------------------------------------------------
// Public functions
// ---------------------
// Msa <-> Canvas
PointRectMapper.prototype.canvasPointToMsaPoint = function(canvasPoint) {
    assert(this.msaView);
    assert(canvasPoint.x >= 0 && canvasPoint.x < this.msaView.canvasSize().width, "canvasPoint.x out of range");
    assert(canvasPoint.y >= 0 && canvasPoint.y < this.msaView.canvasSize().height, "canvasPoint.y out of range");

    return this.unboundedCanvasPointToMsaPoint_(canvasPoint);
};

PointRectMapper.prototype.canvasPointToMsaPointF = function(canvasPoint) {
    assert(this.msaView);
    assert(canvasPoint.x >= 0 && canvasPoint.x < this.msaView.canvasSize().width, "canvasPoint.x out of range");
    assert(canvasPoint.y >= 0 && canvasPoint.y < this.msaView.canvasSize().height, "canvasPoint.y out of range");

    return this.unboundedCanvasPointToMsaPointF_(canvasPoint);
};

PointRectMapper.prototype.msaPointToCanvasPoint = function(msaPoint) {
    assert(this.msaView);
    assert(msaPoint.x > 0 && msaPoint.y > 0, "msaPoint out of range");

    var blockSize = this.msaView.blockSize();
    return Point.create((msaPoint.x - 1) * blockSize.width,
            (msaPoint.y - 1) * blockSize.height);
};

PointRectMapper.prototype.msaPointToCanvasRect = function(msaPoint) {
    var canvasPoint = this.msaPointToCanvasPoint(msaPoint);
    var blockSize = this.msaView.blockSize();
    var result = UnitRect.create(canvasPoint.x, canvasPoint.y, blockSize.width, blockSize.height);
    canvasPoint.release();
    return result;
};

/**
 * @param {UnitRect} canvasRect
 * @return {UnitRect}
 */
PointRectMapper.prototype.canvasRectToMsaRect = function(canvasRect) {
    assert(this.msaView);

    var normRect = UnitRect.create();
    normRect.assign(canvasRect);
    normRect.normalize();
    if (normRect.width() === 1 || normRect.height() === 1) {
        normRect.release();
        return UnitRect.create();
    }

    // Ensure that we are within the proper canvas boundaries
    assert(UnitRect.createFromCoordinateSize(
        new Point(0, 0),
        this.msaView.canvasSize()).containsUnitRect(normRect),
            'canvasRect outside of canvas boundaries');

    var blockSize = this.msaView.blockSize();
    var msaRect = UnitRect.create();

    var normTopLeft = Point.create(normRect.x1, normRect.y1);
    var newTopLeft = this.unboundedCanvasPointToMsaPoint_(normTopLeft);
    msaRect.x1 = newTopLeft.x;
    msaRect.y1 = newTopLeft.y;
    msaRect.x2 = Math.ceil(normRect.x2 / blockSize.width);
    msaRect.y2 = Math.ceil(normRect.y2 / blockSize.height);
    normTopLeft.release();
    newTopLeft.release();
    normRect.release();
    return msaRect;
};

/**
 * msaRect must have x and y greater than 0 and x + width > 0 and y + height > 0. No other checking is performed to
 * ensure that it is a valid rectangle within the alignment.
 *
 * All rectangular coordinates in any quadrant are converted into a normalized representation and a valid rectangle is
 * returned.
 */
PointRectMapper.prototype.msaRectToCanvasRect = function(msaRect) {
    assert(this.msaView);

    var normRect = UnitRect.create();
    normRect.assign(msaRect);
    normRect.normalize();
    assert(normRect.x1 > 0 && normRect.y1 > 0, 'left and top must both be positive');
    assert(normRect.x2 > 0 && normRect.y2 > 0, 'right and bottom must both be positive');

    var blockSize = this.msaView.blockSize();
    var result = UnitRect.create(
        (normRect.x1-1) * blockSize.width,
        (normRect.y1-1) * blockSize.height,
        normRect.width() * blockSize.width,
        normRect.height() * blockSize.height
    );
    normRect.release();
    return result;
};

// ---------------------
// Canvas <-> View
PointRectMapper.prototype.canvasPointToViewPoint = function(canvasPoint) {
    assert(this.msaView);
    assert(canvasPoint.x >= 0 && canvasPoint.x < this.msaView.canvasSize().width, "canvasPoint.x out of range");
    assert(canvasPoint.y >= 0 && canvasPoint.y < this.msaView.canvasSize().height, "canvasPoint.y out of range");

    return Point.create(
        canvasPoint.x - this.msaView.horizontalScrollBar().value(),
        canvasPoint.y - this.msaView.verticalScrollBar().value()
    );
};

PointRectMapper.prototype.canvasRectToViewRect = function(canvasRect) {
    assert(this.msaView);
    var normRect = UnitRect.create();
    normRect.assign(canvasRect);
    normRect.normalize();

    var canvasTopLeft = Point.create(normRect.x1, normRect.y1);
    var topLeft = this.canvasPointToViewPoint(canvasTopLeft);
    var result = UnitRect.create(topLeft.x, topLeft.y, canvasRect.width(), canvasRect.height());
    canvasTopLeft.release();
    topLeft.release();
    normRect.release();
    return result;
};

PointRectMapper.prototype.viewPointToCanvasPoint = function(viewPoint) {
    assert(this.msaView);

    var view = this.msaView;

    var canvasSize = view.canvasSize();
    var x = math.clamp(0, viewPoint.x + view.horizontalScrollBar().value(), canvasSize.width - 1);
    var y = math.clamp(0, viewPoint.y + view.verticalScrollBar().value(), canvasSize.height - 1);
    return Point.create(x, y);
};

PointRectMapper.prototype.viewRectToCanvasRect = function(viewRect) {
    assert(this.msaView);

    var normRect = UnitRect.create();
    normRect.assign(viewRect);
    normRect.normalize();

    // Do the top-left
    var viewP = Point.create(normRect.x1, normRect.y1);
    var canvasP = this.viewPointToCanvasPoint(viewP);
    normRect.x1 = canvasP.x;
    normRect.y1 = canvasP.y;
    canvasP.release();

    // And the bottom right
    viewP.x = normRect.x2;
    viewP.y = normRect.y2;
    canvasP = this.viewPointToCanvasPoint(viewP);
    normRect.x2 = canvasP.x;
    normRect.y2 = canvasP.y;

    viewP.release();
    canvasP.release();

    return normRect;
};

// ---------------------
// Convenience functions
// View <-> Msa
/**
 * @param {Point} msaPoint
 * @return {Point}
 */
PointRectMapper.prototype.msaPointToViewPoint = function(msaPoint) {
    var canvasPoint = this.msaPointToCanvasPoint(msaPoint);
    var viewPoint = this.canvasPointToViewPoint(canvasPoint);
    canvasPoint.release();
    return viewPoint;
};

/**
 * @param {Point} msaPoint
 * @return {UnitRect}
 */
PointRectMapper.prototype.msaPointToViewRect = function(msaPoint) {
    var canvasRect = this.msaPointToCanvasRect(msaPoint);
    var viewRect = this.canvasRectToViewRect(canvasRect);
    canvasRect.release();
    return viewRect;
};

/**
 * @param {UnitRect} msaRect
 * @return {UnitRect}
 */
PointRectMapper.prototype.msaRectToViewRect = function(msaRect) {
    var canvasRect = this.msaRectToCanvasRect(msaRect);
    var viewRect = this.canvasRectToViewRect(canvasRect);
    canvasRect.release();
    return viewRect;
};

/**
 * @param {Point} viewPoint
 * @return {Point}
 */
PointRectMapper.prototype.viewPointToMsaPoint = function(viewPoint) {
    var canvasPoint = this.viewPointToCanvasPoint(viewPoint);
    var msaPoint = this.canvasPointToMsaPoint(canvasPoint);
    canvasPoint.release();
    return msaPoint;
};

/**
 * Returns the fractional location of viewpoint relative to the Msa space. Useful for determining which quadrant of a
 * letter was clicked.
 *
 * @param {Point} viewPoint
 * @return {Point}
 */
PointRectMapper.prototype.viewPointToMsaPointF = function(viewPoint) {
    var canvasPoint = this.viewPointToCanvasPoint(viewPoint);
    var msaPointF = this.canvasPointToMsaPointF(canvasPoint);
    canvasPoint.release();
    return msaPointF;
};

/**
 * @param {UnitRect} viewRect
 * @return {UnitRect}
 */
PointRectMapper.prototype.viewRectToMsaRect = function(viewRect) {
    var canvasRect = this.viewRectToCanvasRect(viewRect);
    var msaRect = this.canvasRectToMsaRect(canvasRect);
    canvasRect.release();
    return msaRect;
};

// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @param {Point} canvasPoint
 * @return {Point};
 * @private
 */
PointRectMapper.prototype.unboundedCanvasPointToMsaPoint_ = function(canvasPoint) {
    var msaPoint = this.unboundedCanvasPointToMsaPointF_(canvasPoint);
    msaPoint.x = Math.floor(msaPoint.x);
    msaPoint.y = Math.floor(msaPoint.y);
    return msaPoint;
};

/**
 * @param {Point} canvasPoint
 * @return {Point};
 * @private
 */
PointRectMapper.prototype.unboundedCanvasPointToMsaPointF_ = function(canvasPoint) {
    var blockSize = this.msaView.blockSize();
    var msaPoint = Point.create(1 + canvasPoint.x / blockSize.width,
        1 + canvasPoint.y / blockSize.height);
    return msaPoint;
};

/*******************************************************************************************************************/});
