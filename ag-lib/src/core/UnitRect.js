/**
 * @fileoverview UnitRect encapsulates an integral rectangle that occupies a minimum area of 1.
 *
 * @author: ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.core.UnitRect');

goog.require('ag.core.BasePoolObject');
goog.require('ag.core.ClosedIntRange');
goog.require('ag.core.Point');

goog.require('goog.asserts');
goog.require('goog.math');
goog.require('goog.math.Size');


/**
 * UnitRect works with integral units to define a specific area. A single unit is represented as the coordinates all having
 * the same values, which corresponds to a width and height of 1. It is possible to reverse the representation as well
 * in which case the x and y positions will be off. It is impossible to define an empty unit rectangle. Rather by definition,
 * it must span at least one unit. All values are 0-based.
 *
 * @constructor
 * @param {number=} optX left position, defaults to 0
 * @param {number=} optY top position, defaults to 0
 * @param {number=} optW right position, defaults to 1
 * @param {number=} optH bottom position, defaults to 1
 * @extends {ag.core.BasePoolObject}
 */
ag.core.UnitRect = function(optX, optY, optW, optH) {
	goog.base(this);

	/** @type {number} */
	this.x1;

	/** @type {number} */
	this.y1;

	/** @type {number} */
	this.x2;

	/** @type {number} */
	this.y2;

	this.constructor_(optX, optY, optW, optH);
};
goog.inherits(ag.core.UnitRect, ag.core.BasePoolObject);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var isInt = goog.math.isInt;
var math = goog.math;

var BasePoolObject = ag.core.BasePoolObject;
var Size = goog.math.Size;

var ClosedIntRange = ag.core.ClosedIntRange;
var Point = ag.core.Point;
var UnitRect = ag.core.UnitRect;

/** @typedef {Array.<UnitRect>} */
ag.core.UnitRectArray;

var UnitRectArray = ag.core.UnitRectArray;


// --------------------------------------------------------------------------------------------------------------------
UnitRect.prototype.constructor_ = function(optX, optY, optW, optH) {
	this.x1 = goog.isNumber(optX) ? Math.floor(optX) : 0;
	this.y1 = goog.isNumber(optY) ? Math.floor(optY) : 0;
	this.x2 = this.x1;
	this.y2 = this.y1;

	if (goog.isNumber(optW))
		this.setWidth(Math.floor(optW));
	if (goog.isNumber(optH))
		this.setHeight(Math.floor(optH));
};


// --------------------------------------------------------------------------------------------------------------------
// Pool functions
UnitRect.pool = BasePoolObject.newObjectPool(UnitRect);

/**
 * @param {number} [optX]
 * @param {number} [optY]
 * @param {number} [optW]
 * @param {number} [optH]
 * @return {UnitRect}
 */
UnitRect.create = function(optX, optY, optW, optH) {
    var r = UnitRect.pool.allocate();
	r.constructor_(optX, optY, optW, optH);
    return r;
};

UnitRect.prototype.pool = function() {
    return UnitRect.pool;
};

// --------------------------------------------------------------------------------------------------------------------
// Debug output
if (goog.DEBUG) {
	/**
	* Returns a nice string representing the box.
	* @return {string} In the form (50t, 73r, 24b, 13l).
	*/
	UnitRect.prototype.toString = function() {
		return '(' + this.x1 + ', ' + this.y1 + ') -> (' + this.x2 + ', ' +
	       	   this.y2 + ') = [' + this.width() + ' x ' + this.height() + ']';
	};
}


// --------------------------------------------------------------------------------------------------------------------
// Static factory methods
/**
 * @param {Point|goog.math.Coordinate} topLeft
 * @param {Point|goog.math.Coordinate} bottomRight
 * @return {UnitRect}
 */
UnitRect.createFromCoordinates = function(topLeft, bottomRight) {
	var rect = new UnitRect(topLeft.x, topLeft.y);
	rect.x2 = bottomRight.x;
	rect.y2 = bottomRight.y;
	return rect;
};

/**
 * @param {Point|goog.math.Coordinate} topLeft
 * @param {Size} size
 * @return {UnitRect}
 */
UnitRect.createFromCoordinateSize = function(topLeft, size) {
	return new UnitRect(topLeft.x, topLeft.y, size.width, size.height);
};


// --------------------------------------------------------------------------------------------------------------------
// Static helper methods
/**
 * Given an array of UnitRect's, return a key-value object where each key indicates an '{X},{Y}'
 * coordinate and the cooresponding value is how many times that point has been "covered" by a given
 * rectangle.
 *
 * @param {UnitRect|UnitRectArray} rects
 * @return {Object.<string,number>}
 */
UnitRect.coverage = function(rects) {
	if (!goog.isArray(rects)) {
		assert(rects instanceof UnitRect);
		rects = [rects];
	}

	var result = {};
	for (var i=0, z=rects.length; i<z; i++) {
		var rect = rects[i];
		if (!rect.isNormal())
			rect = rect.normalized();
		for (var y=rect.y1; y<= rect.y2; y++) {
			for (var x=rect.x1; x<=rect.x2; x++) {
				var key = x + ',' + y;
				if (result.hasOwnProperty(key))
					result[key]++;
				else
					result[key] = 1;
			}
		}
	}

	return result;
};


// --------------------------------------------------------------------------------------------------------------------
// Copy constructor
/** @return {UnitRect} */
UnitRect.prototype.clone = function() {
	var other = new UnitRect();
	other.assign(this);
	return other;
};

// --------------------------------------------------------------------------------------------------------------------
// Operators
/**
 * Assigns the values of other to this.
 *
 * @param {UnitRect} other
 */
UnitRect.prototype.assign = function(other) {
	this.x1 = other.x1;
	this.y1 = other.y1;
	this.x2 = other.x2;
	this.y2 = other.y2;
};

/**
 * Assigns the values of point to the (x1, y1) coordinates.
 *
 * @param {Point|goog.math.Coordinate} point
 */
UnitRect.prototype.assignTopLeft = function(point) {
	this.x1 = point.x;
	this.y1 = point.y;
};

/**
 * Assigns the values of point to the (x2, y2) coordinates.
 *
 * @param {Point|goog.math.Coordinate} point
 */
UnitRect.prototype.assignBottomRight = function(point) {
	this.x2 = point.x;
	this.y2 = point.y;
};

/**
 * @param {UnitRect} other
 * @return {boolean}
 */
UnitRect.prototype.eq = function(other) {
	return this.x1 === other.x1 &&
		this.y1 === other.y1 &&
		this.x2 === other.x2 &&
		this.y2 === other.y2;
};

/**
 * @param {UnitRect} other
 * @return {boolean}
 */
UnitRect.prototype.ne = function(other) {
	return !this.eq(other);
};


// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @return {number} */
UnitRect.prototype.area = function() {
	return Math.abs(this.width() * this.height());
};

/** @return {number} */
UnitRect.prototype.bottom = function() {
	return this.y2;
};

/** @return {Point} */
UnitRect.prototype.bottomLeft = function() {
	return new Point(this.x1, this.y2);
};

/** @return {Point} */
UnitRect.prototype.bottomRight = function() {
	return new Point(this.x2, this.y2);
};

/**
 * Returns the nearest integral unit center.
 *
 * @return {Point}
 */
UnitRect.prototype.center = function() {
	var c = this.centerF();
	c.x = Math.round(c.x);
	c.y = Math.round(c.y);
	return c;
};

/**
 * Returns the real unit center in real coordinates.
 *
 * @return {Point}
 */
UnitRect.prototype.centerF = function() {
	var c = new Point();
	c.x = (!this.hasReversedX()) ? this.x1 + (this.x2 - this.x1) / 2 :
								   this.x2 + (this.x1 - this.x2) / 2;
	c.y = (!this.hasReversedY()) ? this.y1 + (this.y2 - this.y1) / 2 :
								   this.y2 + (this.y1 - this.y2) / 2;
	return c;
};

/**
 * @param {number} x
 * @param {number} y
 * @param {boolean=} optExcludeEdges defaults to false
 * @return {boolean}
 */
UnitRect.prototype.contains = function(x, y, optExcludeEdges) {
	assert(goog.isNumber(x), 'UnitRect.contains: x must be number');
	assert(goog.isNumber(y), 'UnitRect.contains: y must be number');
	var r = this.isNormal() ? this : this.normalized();

	if (!optExcludeEdges) {
		return x >= r.x1 && x <= r.x2 &&
			   y >= r.y1 && y <= r.y2;
	}

	// optExcludeEdges is true, point must lie completely within the rectangle's bounds
	return x > r.x1 && x < r.x2 &&
		   y > r.y1 && y < r.y2;
};

/**
 * Returns true if coordinate is within or on the rectangle's edges (optExcludeEdges = false) or if coordinate is fully inside the rectangle (optExcludeEdges = true); otherwise returns false
 *
 * @param {Point|goog.math.Coordinate} point
 * @param {boolean=} optExcludeEdges defaults to false
 * @return {boolean}
 */
UnitRect.prototype.containsCoordinate = function(point, optExcludeEdges) {
	return this.contains(point.x, point.y, optExcludeEdges);
};

/**
 * @param {UnitRect} other
 * @param {boolean=} optExcludeEdges defaults to false
 * @return {boolean}
 */
UnitRect.prototype.containsUnitRect = function(other, optExcludeEdges) {
	assert(other instanceof UnitRect, 'UnitRect.containsUnitRect: first argument must be a UnitRect');
	return this.contains(other.x1, other.y1, optExcludeEdges) &&
		this.contains(other.x2, other.y2, optExcludeEdges);
};

/**
 * Returns an array of 0 to 4 rectangles representing the area of this UnitRect after subtracting other.
 *
 * @param {UnitRect} other
 * @return {UnitRectArray}
 */
UnitRect.prototype.difference = function(other) {
	assert(goog.isDefAndNotNull(other));
	var self = this.isNormal() ? this : this.normalized();
	var that = other.isNormal() ? other : other.normalized();
	if (!self.intersects(that))
		return [this.normalized()];

	var result = [];
	if (that.containsUnitRect(self))
		return result;

	var ax1 = self.x1;		var bx1 = that.x1;
	var ax2 = self.x2;		var bx2 = that.x2;
	var ay1 = self.y1;		var by1 = that.y1;
	var ay2 = self.y2;		var by2 = that.y2;

	var maxABy1 = Math.max(ay1, by1);
	var minABy2 = Math.min(ay2, by2);
	var AByHeight = minABy2 - maxABy1 + 1;
	var aWidth = self.width();

	// Top side (that intersects lower portion of self)
	if (by1 > ay1 && by1 <= ay2)
		// topLeft() -> (ax2, by1 - 1)
		result.push(new UnitRect(ax1, ay1, aWidth, by1 - ay1));
	// Left side (that intersects right portion of self)
	if (bx1 > ax1 && bx1 <= ax2)
		// (ax1, maxABy1) -> (bx1 - 1, minABy2)
		result.push(new UnitRect(ax1, maxABy1, bx1 - ax1, AByHeight));
	// Right side (that intersects left portion of self)
	if (bx2 < ax2 && bx2 >= ax1)
		// (bx2 + 1, maxABy1) -> (ax2, minABy2)
		result.push(new UnitRect(bx2 + 1, maxABy1, ax2 - (bx2 + 1) + 1, AByHeight));
	// Bottom side (that intersects top portion of self)
	if (by2 < ay2 && by2 >= ay1)
		// (ax1, by2 + 1) -> bottomRight()
		result.push(new UnitRect(ax1, by2 + 1, aWidth, ay2 - (by2 + 1) + 1));

	return result;
};

/** @return {boolean} */
UnitRect.prototype.hasReversedX = function() {
	return this.x2 < this.x1;
};

/** @return {boolean} */
UnitRect.prototype.hasReversedY = function() {
	return this.y2 < this.y1;
};

/** @return {number} */
UnitRect.prototype.height = function() {
	var h = this.y2 - this.y1;
	return (h >= 0) ? h + 1 : h - 1;
};

/** @return {ClosedIntRange} */
UnitRect.prototype.horizontalRange = function() {
	return new ClosedIntRange(this.x1, this.x2);
};

/**
 * @param {UnitRect} other
 * @return {?UnitRect}
 */
UnitRect.prototype.intersection = function(other) {
    var r1 = this.isNormal() ? this : this.normalized();
    var r2 = other.isNormal() ? other : other.normalized();
	if (!r1.intersects(r2))
		return null;

	var x1 = Math.max(r1.x1, r2.x1);
	var y1 = Math.max(r1.y1, r2.y1);
	var x2 = Math.min(r1.x2, r2.x2);
	var y2 = Math.min(r1.y2, r2.y2);

	return UnitRect.createFromCoordinates(new Point(x1, y1), new Point(x2, y2));
};

/**
 * @param {UnitRect} other
 * @return {boolean}
 */
UnitRect.prototype.intersects = function(other) {
    var r1 = this.isNormal() ? this : this.normalized();
    var r2 = other.isNormal() ? other : other.normalized();

    return Math.max(r1.x1, r2.x1) <= Math.min(r1.x2, r2.x2) &&
    	   Math.max(r1.y1, r2.y1) <= Math.min(r1.y2, r2.y2);
};

/**
 * @param {number} x
 * @return {boolean}
 */
UnitRect.prototype.intersectsX = function(x) {
    var r = this.isNormal() ? this : this.normalized();
    return x >= r.x1 && x <= r.x2;
};

/**
 * @param {number} y
 * @return {boolean}
 */
UnitRect.prototype.intersectsY = function(y) {
    var r = this.isNormal() ? this : this.normalized();
    return y >= r.y1 && y <= r.y2;
};

UnitRect.prototype.invert = function() {
	this.invertX();
	this.invertY();
};

UnitRect.prototype.invertX = function() {
	var tmp = this.x2;
	this.x2 = this.x1;
	this.x1 = tmp;
};

UnitRect.prototype.invertY = function() {
	var tmp = this.y2;
	this.y2 = this.y1;
	this.y1 = tmp;
};

/**
 * Returns true if this rect is equivalent to its default constructed state.
 * @return {boolean}
 */
UnitRect.prototype.isDefault = function() {
	return this.x1 === 0 &&
		this.y1 === 0 &&
		this.x2 === 0 &&
		this.y2 === 0;
};

/**
 * A normal UnitRect indicates that the right coordinate is greater than or equal to the left coordinate and
 * the bottom coordinate is greater than or equal to the top coordinate.
 *
 * @return {boolean}
 */
UnitRect.prototype.isNormal = function() {
	return !this.hasReversedX() && !this.hasReversedY();
};

/**
 * Returns true if every value is positive.
 * @return {boolean}
 */
UnitRect.prototype.isPositive = function() {
	return this.x1 > 0 &&
		this.y1 > 0 &&
		this.x2 > 0 &&
		this.y2 > 0;
};

/** @return {number} */
UnitRect.prototype.left = function() {
	return this.x1;
};

/**
 * Moves the bottom edge to y without changing the height
 *
 * @param {number} y
 */
UnitRect.prototype.moveBottom = function(y) {
	assert(isInt(y));
    this.y1 = y - this.height() + 1;
    this.y2 = y;
};

/**
 * Moves the left edge to x without changing the width
 *
 * @param {number} x
 */
UnitRect.prototype.moveLeft = function(x) {
	assert(isInt(x));
    this.x2 = x + this.width() - 1;
    this.x1 = x;
};

/**
 * Moves the right edge to x without changing the width
 *
 * @param {number} x
 */
UnitRect.prototype.moveRight = function(x) {
	assert(isInt(x));
    this.x1 = x - this.width() + 1;
    this.x2 = x;
};

/**
 * Moves the top edge to y without changing the height
 *
 * @param {number} y
 */
UnitRect.prototype.moveTop = function(y) {
	assert(isInt(y));
    this.y2 = y + this.height() - 1;
    this.y1 = y;
};

/**
 * Normalizes this rectangle (one without a negative width or height)
 */
UnitRect.prototype.normalize = function() {
	if (this.hasReversedX())
		this.invertX();

	if (this.hasReversedY())
		this.invertY();

	return this;
};

/**
 * Returns a new copy of a normalized rectangle
 *
 * @return {UnitRect}
 */
UnitRect.prototype.normalized = function() {
    return this.clone().normalize();
};

/** @return {number} */
UnitRect.prototype.right = function() {
	return this.x2;
};

/**
 * Sets the bottom edge to y without changing the top edge (although the height may change)
 *
 * @param {number} y
 */
UnitRect.prototype.setBottom = function(y) {
	assert(isInt(y));
	this.y2 = y;
};

/**
 * Sets the rectangle height to newHeight and moves the bottom edge as necessary; however, the top will not be affected
 *
 * @param {number} newHeight
 */
UnitRect.prototype.setHeight = function(newHeight) {
	assert(isInt(newHeight));
	assert(newHeight != 0);
	this.y2 = this.y1 + (newHeight > 0 ? newHeight - 1 : newHeight + 1);
};

/**
 * Sets the left edge to x without changing the right edge (although the width may change)
 *
 * @param {number} x
 */
UnitRect.prototype.setLeft = function(x) {
	assert(isInt(x));
	this.x1 = x;
};

/**
 * Positions rectangle to (x,y) having newWidth and newHeight
 *
 * @param {number} x1
 * @param {number} y1
 * @param {number} newWidth
 * @param {number} newHeight
 */
UnitRect.prototype.setRect = function(x1, y1, newWidth, newHeight) {
	assert(isInt(x1));
	assert(isInt(y1));
	assert(isInt(newWidth));
	assert(isInt(newHeight));

	this.x1 = x1;
	this.y1 = y1;
	this.setWidth(newWidth);
	this.setHeight(newHeight);
};

/**
 * Sets the rectangle from topLeft to bottomRight
 *
 * @param {Point|goog.math.Coordinate} topLeft
 * @param {Point|goog.math.Coordinate} bottomRight
 */
UnitRect.prototype.setRectFromCoordinates = function(topLeft, bottomRight) {
	assert(isInt(topLeft.x));
	assert(isInt(topLeft.y));
	assert(isInt(bottomRight.x));
	assert(isInt(bottomRight.y));

	this.x1 = topLeft.x;
	this.y1 = topLeft.y;
	this.x2 = bottomRight.x;
	this.y2 = bottomRight.y;
};

/**
 * Sets the right edge to x without changing the left edge (although the width may change)
 *
 * @param {number} x
 */
UnitRect.prototype.setRight = function(x) {
	assert(isInt(x));
	this.x2 = x;
};

/**
 * Sets the size to size; changes the bottom and right edges without changing the top left point
 *
 * @param {Size} newSize
 */
UnitRect.prototype.setSize = function(newSize) {
	assert(isInt(newSize.width));
	assert(isInt(newSize.height));
	this.setWidth(newSize.width);
	this.setHeight(newSize.height);
};


/**
 * Sets the top edge to y without changing the bottom edge (although the height may change)
 *
 * @param {number} y
 */
UnitRect.prototype.setTop = function(y) {
	assert(isInt(y));
	this.y1 = y;
};

/**
 * Sets the width to newWidth and moves the right edge as necessary; however, the left will not be affected
 *
 * @param {number} newWidth
 */
UnitRect.prototype.setWidth = function(newWidth) {
	assert(isInt(newWidth));
	assert(newWidth !== 0);
	this.x2 = this.x1 + (newWidth > 0 ? newWidth - 1 : newWidth + 1);
};

/**
 * Shifts the UnitRect deltaX and deltaY units along the horizontal and vertical axes without changing the width or height.
 *
 * @param {number} deltaX
 * @param {number} deltaY
 * TODO: rename to translate
 */
UnitRect.prototype.shift = function(deltaX, deltaY) {
	this.x1 += deltaX;
	this.x2 += deltaX;
	this.y1 += deltaY;
	this.y2 += deltaY;
};

/** @return {Size} */
UnitRect.prototype.size = function() {
	return new Size(this.width(), this.height());
};

/** @return {number} */
UnitRect.prototype.top = function() {
	return this.y1;
};

/** @return {Point|goog.math.Coordinate} */
UnitRect.prototype.topLeft = function() {
	return new Point(this.x1, this.y1);
};

/** @return {Point|goog.math.Coordinate} */
UnitRect.prototype.topRight = function() {
	return new Point(this.x2, this.y1);
};

/** @return {ClosedIntRange} */
UnitRect.prototype.verticalRange = function() {
	return new ClosedIntRange(this.y1, this.y2);
};

/** @return {number} */
UnitRect.prototype.width = function() {
	var w = this.x2 - this.x1;
	return (w >= 0) ? w + 1 : w - 1;
};

/*******************************************************************************************************************/});
