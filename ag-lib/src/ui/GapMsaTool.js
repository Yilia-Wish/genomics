/**
 * @fileoverview: GapMsaTool is quite complicated given that it supports adding gaps in either direction of the
 * mouse movement. Inserting gaps to the right of the origin (where the user clicks and then begins the drag), is
 * very straightforward - simply add the gaps and increase the scroll bar as necessary. It is also relatively easy to
 * maintain expectations when the Msa is larger than the current view and thus a horizontal scrollbar is present.
 * Simply insert the gaps and then adjust the scrollbar so that it appears like gaps are being inserted to the left of
 * the origin.
 *
 * The most complicated case occurs when the Msa fits completely within the viewport and there are no scrollbars. It is
 * not immediately clear how to handle the situation where the user drags the mouse to the left. The current solution
 * is as follows:
 * 1) Detect if the horizontal scroll bar is present when the user clicks the left mouse button
 * 2) If yes, continue as before, if no:
 *    a) Prevent the scrollbar from appearing
 *    b) Do not update the scrollbar during mouse move events
 *    c) Calculate the amount to translate the view rendering when gaps are being added or removed from the left of the
 *       origin such that it appears as though the gaps are being inserted to the left
 *    d) On release of the left mouse button, turn on the scrollbar, set the translation amount to zero and re-render
 *
 * To make the above happen it is necessary to provide the ability to tweak the actual rendering origin of the
 * MsaView (done through renderXShift).
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.ui.GapMsaTool');

goog.require('ag');
goog.require('ag.core.ClosedIntRange');
goog.require('ag.core.Point');
goog.require('ag.meta.MetaObject');
goog.require('ag.ui');
goog.require('ag.ui.AbstractMsaTool');

goog.require('goog.events');
goog.require('goog.math');
goog.require('goog.math.Coordinate');

/**
 * @constructor
 * @extends {ag.ui.AbstractMsaTool}
 * @param {ag.ui.MsaView} msaView
 */
ag.ui.GapMsaTool = function(msaView) {
    goog.base(this, msaView, ag.ui.AbstractMsaTool.Type.Gap);

    // --------------------------------------------------------------------------------------------------------------------
    // Class members
    /**
     * @type {boolean}
     * @private
     */
    this.ctrlPressed_ = false;

    /**
     * @type {number}
     * @private
     */
    this.gapInsertionAnchorX_ = 0;

    /**
     * @type {number}
     * @private
     */
    this.gapStartViewX_;

    /**
     * @type {number}
     * @private
     */
    this.gapLastViewX_;

    /**
     * @type {number}
     * @private
     */
    this.gapsAdded_;

    /**
     * @type {boolean}
     * @private
     */
    this.horizScrollBarVisible_ = false;

    /**
     * @type {number}
     * @private
     */
    this.lastGapInsertionColumn_ = 0;

    /**
     * @type {boolean}
     * @private
     */
    this.mouseOutsideViewport_ = true;
};
goog.inherits(ag.ui.GapMsaTool, ag.ui.AbstractMsaTool);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var events = goog.events;
var math = goog.math;
var Coordinate = goog.math.Coordinate;
var MouseButton = events.BrowserEvent.MouseButton;

var ClosedIntRange = ag.core.ClosedIntRange;
var GapMsaTool = ag.ui.GapMsaTool;
var Point = ag.core.Point;

var Cursor = ag.ui.Cursor;
var metaObject = ag.meta.MetaObject.getInstance;

// --------------------------------------------------------------------------------------------------------------------
// Signals
/** @enum {string} */
GapMsaTool.SignalType = {
    // ClosedIntRange, {boolean} normal: range is normally positive; mouse started at point that was less than the end;
    //   vice versa
    GAP_COLUMNS_INSERT_STARTED: events.getUniqueId('gap-columns-insert-started'),

    // number
    GAP_INSERTION_COLUMN_CHANGED: events.getUniqueId('gap-insertion-column-changed'),

    // ClosedIntRange, {boolean} normal
    GAP_COLUMNS_INTERMEDIATE: events.getUniqueId('gap-columns-intermediate'),

    // ClosedIntRange, {boolean} normal
    GAP_COLUMNS_INSERT_FINISHED: events.getUniqueId('gap-columns-insert-finished')
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
/** @override */
GapMsaTool.prototype.activate = function() {
    this.ctrlPressed_ = false;

    this.msaView_.setCursor(Cursor.ColResize);
    goog.base(this, 'activate');
};

// --------------------------------------------------------------------------------------------------------------------
// Protected event handlers
/** @override */
GapMsaTool.prototype.viewportKeyDown = function(keyEvent) {
    goog.base(this, 'viewportKeyDown', keyEvent);

    this.ctrlPressed_ = ag.xOsCtrlPressed(keyEvent);
};

/** @override */
GapMsaTool.prototype.viewportKeyUp = function(keyEvent) {
    this.ctrlPressed_ = ag.xOsCtrlPressed(keyEvent);
};

/** @override */
GapMsaTool.prototype.viewportMouseDown = function(mouseEvent) {
    if (!mouseEvent.isButton(MouseButton.LEFT))
        return;

    this.isActive_ = true;
    document.body.setAttribute('data-cursor', Cursor.ColResize);
    var pos = this.msaView_.viewportMousePos();
    this.gapInsertionAnchorX_ = this.gapInsertionColumn_(pos);

    // Note, as of this point, we have not inserted any gaps, but merely started the process, thus we set the end
    // to one less than the start - effectively making it "empty"
    metaObject().emit(this, GapMsaTool.SignalType.GAP_COLUMNS_INSERT_STARTED, new ClosedIntRange(this.gapInsertionAnchorX_), true /* normal */);

    var msaPointF = this.msaView_.pointRectMapper().viewPointToMsaPointF(pos);
    this.gapStartViewX_ = this.gapPlotX(msaPointF.x + .5);
    this.gapLastViewX_ = pos.x;
    this.gapsAdded_ = 0;

    // Temporarily diable the scroll bar during the move
    this.horizScrollBarVisible_ = this.msaView_.horizontalScrollBar().isVisible();
    if (!this.horizScrollBarVisible_)
        this.msaView_.setHorizontalScrollBarPolicy(ag.ui.ScrollBarPolicy.Off);

    // ----------------------------------------------------------------------------------------------------------
    // Special case: user presses left mouse button in area to the right of the alignment. Result: go ahead and
    //               create gap columns up to this point but keep the anchor in its original position (at the end
    //               of the alignment before the click).
    var clickPointIsBeyondRightOfAlignment = pos.x > this.gapStartViewX_;
    if (clickPointIsBeyondRightOfAlignment) {
        var blockWidth = this.msaView_.blockSize().width;
        var halfBlockWidth = blockWidth / 2.;
        var colsToAdd = Math.floor((pos.x - this.gapStartViewX_ + halfBlockWidth) / blockWidth);
        if (colsToAdd) {
            this.msaView_.msa().insertGapColumns(this.gapInsertionAnchorX_, colsToAdd);
            this.gapsAdded_ += colsToAdd;
        }
    }

    this.msaView_.update();

    msaPointF.release();
    msaPointF = null;
};

/** @override */
GapMsaTool.prototype.viewportMouseMove = function(mouseEvent) {
    this.mouseOutsideViewport_ = false;

    if (this.isActive_)
        this.activeMouseMove(mouseEvent);
    else
        this.inactiveMouseMove(mouseEvent);

    this.msaView_.update();
    // To remove any potential visual artifacts that may remain
    this.msaView_.stopSideWidget().update();
};

/** @override */
GapMsaTool.prototype.viewportMouseOut = function(mouseEvent) {
    this.mouseOutsideViewport_ = true;
    // To remove the boundary lines in case the user has not yet moved the mouse, refresh the screen
    this.msaView_.update();
};

/** @override */
GapMsaTool.prototype.viewportMouseUp = function(mouseEvent) {
    if (this.isActive_) {
        this.isActive_ = false;
        document.body.removeAttribute('data-cursor');
        metaObject().emit(this, GapMsaTool.SignalType.GAP_COLUMNS_INSERT_FINISHED,
            new ClosedIntRange(this.gapInsertionAnchorX_, this.gapInsertionAnchorX_ + Math.abs(this.gapsAdded_) - 1), this.gapsAdded_ >= 0);

        // Since we have finished, update the gap insertion column for the next insertion
        if (this.gapsAdded_ > 0)
            // If no gaps have been added, then the mouse position would be in the same place and thus this signal would
            // not need to be emitted. Or if the number of gaps added is negative, then insertion column also would not
            // have changed.
            metaObject().emit(this, GapMsaTool.SignalType.GAP_INSERTION_COLUMN_CHANGED, this.gapInsertionColumn_());

        if (!this.horizScrollBarVisible_) {
            this.msaView_.setRenderXShift(0);
            this.msaView_.setHorizontalScrollBarPolicy(ag.ui.ScrollBarPolicy.Auto);
        }

        // Special case: if the user has added gaps to the left of the viewable area - scroll those gaps that were
        // added into view. Same for the right side.
        var bw = this.msaView_.blockSize().width;
        var msaClip = this.msaView_.msaClipRect();
        if (this.gapsAdded_ < 0) {
            var originalClipX1 = msaClip.x1 + this.gapsAdded_;
            var gapsAddedLeftOfClip = Math.abs(this.gapsAdded_) - (this.gapInsertionAnchorX_ - originalClipX1);
            if (gapsAddedLeftOfClip > 0)
                // Add in one extra block for context                                ||
                this.msaView_.horizontalScrollBar().adjustValue(-(gapsAddedLeftOfClip+1) * bw);
        }
        else if (this.gapsAdded_ > 0) {
            var finalGapColumn = this.gapInsertionAnchorX_ + this.gapsAdded_ - 1;
            // Cheater gap added because when rendering the MSA the clip rect extends one beyond the right and
            // and bottom dimensions. Therefore, add pseudo gap    ||| to accommodate this rendering "extra"
            var gapsAddedRightOfClip = finalGapColumn - msaClip.x2 + 1;
            if (gapsAddedRightOfClip > 0)
                this.msaView_.horizontalScrollBar().adjustValue((gapsAddedRightOfClip) * bw);
        }
    }

    this.msaView_.update();
};

/** @override */
GapMsaTool.prototype.viewportPaint = function(context, origin, msaRect) {
    if (!this.isActive_ && this.mouseOutsideViewport_)
        return;

    context.save();
    context.lineWidth = 2;
    var renderSize = this.msaView_.renderSize();
    var height = renderSize.height;
    var maxWidth = renderSize.width;
    if (this.isActive_) {
        var tmpPoint = Point.create(this.gapStartViewX_, 1);
        var msaPointF = this.msaView_.pointRectMapper().viewPointToMsaPointF(tmpPoint);
        tmpPoint.release();
        tmpPoint = null;
        var originPlotX = this.gapPlotX(msaPointF.x + .5);

        if (this.gapsAdded_) {
            var boundaryPlotX = originPlotX + this.msaView_.blockSize().width * this.gapsAdded_;
            var gapColumnsInsideRenderSpace = boundaryPlotX < maxWidth;

            // 1) Draw the filled rectangle
            context.fillStyle = 'rgba(0,0,0,.375)';
            if (gapColumnsInsideRenderSpace) {
                context.fillRect(originPlotX, 0, boundaryPlotX - originPlotX, height);

                // 2) Draw the terminal boundary line
                context.beginPath();
                context.moveTo(boundaryPlotX, 0);
                context.lineTo(boundaryPlotX, height);
                context.stroke();
            }
            else
                // Clamp shaded gap columns to maximum width.
                context.fillRect(originPlotX, 0, maxWidth - originPlotX, height);
        }

        // 3) The origin line
        context.beginPath();
        context.moveTo(originPlotX, 0);
        context.lineTo(originPlotX, height);
        context.strokeStyle = 'rgba(0,0,0,.375)';
        context.stroke();

        msaPointF.release();
        msaPointF = null;
    }
    else {
        var x = this.gapPlotX(this.gapInsertionColumn_());
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
    }
    context.restore();
};


// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @param {Point=} optViewPoint
 * @return {number}
 * @private
 */
GapMsaTool.prototype.gapInsertionColumn_ = function(optViewPoint) {
    var coordinate = optViewPoint ? optViewPoint : this.msaView_.viewportMousePos();
    var msaPointF = this.msaView_.pointRectMapper().viewPointToMsaPointF(coordinate);
    var result = Math.floor(msaPointF.x + .5);
    //                                  ^^^^
    // If click started halfway or more into the current characters box, insertion
    // column is increased by one. Otherwise, insert before this character.

    msaPointF.release();
    msaPointF = null;
    return result;
};

/**
 * @param {number} msaColumnF
 * @return {number}
 * @private
 */
GapMsaTool.prototype.gapPlotX = function(msaColumnF) {
    var msaColumn = Math.floor(msaColumnF);

    // Important! in the msaPointToViewPoint calculation, we add or subtract .0001 in case we are attempting to
    // add at the boundary of the alignment. This prevents an assertion from being thrown. Also, we really
    // only need the x value; however, the msaPointToViewPoint method takes a Point. Thus we supply a dummy
    // value of 1 for the y position
    var msaPoint = Point.create(Math.max(1, msaColumn - .0001), 1);
    var viewPoint = this.msaView_.pointRectMapper().msaPointToViewPoint(msaPoint);
    msaPoint.release();
    var x = viewPoint.x;
    viewPoint.release();

    // Move the rendering position inside, if the gap is being inserted at either end of the alignment
    if (msaColumn === 1)
        x += 1;
    else if (msaColumn === this.msaView_.msa().columnCount()+1)
        x -= 1;

    return x;
};

/**
 * @param {goog.events.BrowserEvent} mouseEvent
 * @private
 */
GapMsaTool.prototype.activeMouseMove = function(mouseEvent) {
    // It is desirable that when the mouse has crossed over half of a block's width, to insert a gap at that
    // position. To achieve this and because of integer arithmetic, it is necessary to add half of the block width
    // to the calculations of how many gaps to add. For instance, any X greater than 0 but less than the block width
    // when divided by the block width will return zero. Adding half of the block width to X addresses this problem.
    var blockWidth = this.msaView_.blockSize().width;
    var halfCharWidth = blockWidth / 2.;

    var mouseX = this.msaView_.viewportMousePos().x;
    var deltaMouseX = mouseX - this.gapLastViewX_;
    var hScrollBar = this.msaView_.horizontalScrollBar();
    var msa = this.msaView_.msa();
    if (deltaMouseX > 0) {
        // Moving in positive direction left of origin
        if (mouseX <= this.gapStartViewX_) {
            //          |
            //          |
            //   o----> |
            //          |
            // ---------|++++++++
            var finalGapCount = Math.floor((this.gapStartViewX_ - mouseX + halfCharWidth) / blockWidth);
            var colsToRemove = -this.gapsAdded_ - finalGapCount;

            if (colsToRemove) {
                // Unfortunately, there is a coupling between removing the gap columns, rendering, and the x render
                // shift that requires a specific order when updating the view parameters. More specifically, when
                // removeGapColumns is called, it emits a direct signal with this information. The MsaView,
                // connected to this signal, then immediately issues a queued viewport update and currently updates
                // the margin widget geometries. The queued viewport update is no problem because this method will
                // complete before the visual update is performed. But positioning of the margin widget geometries
                // which depends upon the x render shift will occur immediately. Thus, it is important to first
                // update the render x shift, then remove the gap columns, and then update the horizontal scroll bar
                // if necessary.
                if (!this.horizScrollBarVisible_)
                    // the scroll bar is off, but the number of gaps left of the origin is decreasing ==> adjust the
                    // msaView's shift amount accordingly - again to keep the right portion of the alignment fixed.
                    this.msaView_.setRenderXShift(-finalGapCount * blockWidth);

                msa.removeGapColumns(new ClosedIntRange(this.gapInsertionAnchorX_, this.gapInsertionAnchorX_ + colsToRemove - 1));
                if (this.horizScrollBarVisible_)
                    // The horizontal scroll bar is visible ==> adjust the scrollbar such that the right half of the
                    // visible alignment stays in place.
                    hScrollBar.adjustValue(-colsToRemove * blockWidth);

                this.gapsAdded_ = -finalGapCount;

                metaObject().emit(this, GapMsaTool.SignalType.GAP_COLUMNS_INTERMEDIATE,
                    new ClosedIntRange(this.gapInsertionAnchorX_, this.gapInsertionAnchorX_ + finalGapCount - 1), false);
            }
        }
        else {
            //          |
            //          |
            //          | o----->
            //          |
            // ---------|++++++++

            if (this.gapLastViewX_ <= this.gapStartViewX_) {
                //          |
                //          |
                //        o-|--->
                //          |
                // ---------|++++++++

                // User has dragged the mouse from left of origin to right of origin in one fell swoop:
                // 1) Remove the columns added to the left of origin
                // 2) Add columns to right of origin
                var colsToRemove = -this.gapsAdded_;
                if (colsToRemove) {
                    // Again, the order of execution here is vital for proper rendering. See the above for details.
                    if (!this.horizScrollBarVisible_)
                        // No scroll bar and we are back on the right side of the origin; reset the view shift factor
                        this.msaView_.setRenderXShift(0);

                    msa.removeGapColumns(new ClosedIntRange(this.gapInsertionAnchorX_, this.gapInsertionAnchorX_ + colsToRemove - 1));
                    if (this.horizScrollBarVisible_)
                        hScrollBar.adjustValue(-colsToRemove * blockWidth);

                    this.gapsAdded_ = 0;
                }
            }

            var finalGapCount = Math.floor((mouseX - this.gapStartViewX_ + halfCharWidth) / blockWidth);
            var colsToAdd = finalGapCount - this.gapsAdded_;
            if (colsToAdd) {
                msa.insertGapColumns(this.gapInsertionAnchorX_, colsToAdd);
                this.gapsAdded_ += colsToAdd;
            }

            metaObject().emit(this, GapMsaTool.SignalType.GAP_COLUMNS_INTERMEDIATE,
                new ClosedIntRange(this.gapInsertionAnchorX_, this.gapInsertionAnchorX_ + finalGapCount - 1), true);
        }
    }
    else if (deltaMouseX < 0) {
        // Mouse is on right side of origin, simply removing columns
        if (mouseX >= this.gapStartViewX_) {
            //          |
            //          |
            //          |  <----o
            //          |
            // ---------|++++++++
            var finalGapCount = Math.floor((mouseX - this.gapStartViewX_ + halfCharWidth) / blockWidth);
            var colsToRemove = this.gapsAdded_ - finalGapCount;
            if (colsToRemove) {
                msa.removeGapColumns(new ClosedIntRange(this.gapInsertionAnchorX_, this.gapInsertionAnchorX_ + colsToRemove - 1));
                this.gapsAdded_ = finalGapCount;

                metaObject().emit(this, GapMsaTool.SignalType.GAP_COLUMNS_INTERMEDIATE,
                    new ClosedIntRange(this.gapInsertionAnchorX_, this.gapInsertionAnchorX_ + finalGapCount - 1), true);
            }
        }
        else {
            //          |
            //          |
            //   <---o  |
            //          |
            // ---------|++++++++

            // Mouse is on left side of origin
            // Case 1: Was it previously on the right side of origin? If so, remove some of those columns
            if (this.gapLastViewX_ >= this.gapStartViewX_) {
                //          |
                //          |
                //      <---|--o
                //          |
                // ---------|++++++++
                var colsToRemove = this.gapsAdded_;
                if (colsToRemove){
                    msa.removeGapColumns(new ClosedIntRange(this.gapInsertionAnchorX_, this.gapInsertionAnchorX_ + colsToRemove - 1));
                    this.gapsAdded_ = 0;
                }
            }

            var finalGapCount = Math.floor((this.gapStartViewX_ - mouseX + halfCharWidth) / blockWidth);
            if (!this.horizScrollBarVisible_)
                // The user is dragging the gap insertions left of the origin but there is not scroll bar. Emulate
                // inserting gap columns to the left by translating the view rendering origin.
                this.msaView_.setRenderXShift(-finalGapCount * blockWidth);

            var colsToAdd = finalGapCount - -this.gapsAdded_;
            if (colsToAdd) {
                msa.insertGapColumns(this.gapInsertionAnchorX_, colsToAdd);
                if (this.horizScrollBarVisible_)
                    hScrollBar.adjustValue(colsToAdd * blockWidth);

                this.gapsAdded_ = -finalGapCount;
            }
            metaObject().emit(this, GapMsaTool.SignalType.GAP_COLUMNS_INTERMEDIATE,
                new ClosedIntRange(this.gapInsertionAnchorX_, this.gapInsertionAnchorX_ + finalGapCount - 1), false);
        }
    }

    this.gapLastViewX_ = mouseX;
};

/**
 * @param {goog.events.BrowserEvent} mouseEvent
 * @private
 */
GapMsaTool.prototype.inactiveMouseMove = function(mouseEvent) {
    var gapInsertionColumn = this.gapInsertionColumn_();
    if (gapInsertionColumn !== this.lastGapInsertionColumn_) {
        metaObject().emit(this, GapMsaTool.SignalType.GAP_INSERTION_COLUMN_CHANGED, gapInsertionColumn);
        this.lastGapInsertionColumn_ = gapInsertionColumn;
    }
};


/*******************************************************************************************************************/});
