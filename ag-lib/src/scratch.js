function() {
	var msa = this.msaView_.msa();
    var rect = /** @type {UnitRect} */(this.msaView_.selection());
	if (this.terminalGaps_ > 0 && dx < 0) {
		var cols = msa.columnCount();
		var toRemove = Math.min(this.terminalGaps_, -dx);
		var tmp = UnitRect.create(rect.x1, rect.y1, cols - rect.x1 + 1, rect.height());
		msa.slideRect(tmp, -toRemove);
		msa.removeGapColumns(new ClosedIntRange(cols - toRemove + 1, cols));
		this.terminalGaps_ -= toRemove;
		dx += toRemove;

		// Need to update selection
		rect.x1 -= toRemove;
		rect.x2 -= toRemove;
	}
	else if (this.terminalGaps_ < 0 && dx > 0) {
		var toRemove = Math.min(-this.terminalGaps_, dx);
		var tmp = UnitRect.create(1, rect.y1, rect.x2, rect.height());
		msa.slideRect(tmp, toRemove);
		msa.removeGapColumns(new ClosedIntRange(1, toRemove - 1));
		this.terminalGaps_ += toRemove;
		dx -= toRemove;

		// Need to update selection
		rect.x1 += toRemove;
		rect.x2 += toRemove;
	}

	if (dx) {

	}
};





var active = [];
var output = [];
var current = [];

function handleOpenRect(rect) {
	var x = rect.left();
	var y1 = rect.top();
	var y2 = rect.bottom();
	current.push(rect);
	assert(y1 <= y2);

	for (var i=0; i<active.length; i++) {
		var r = active[i];

		// Skip fully-enclosed rects
		if (y1 >= r.y1 && y2 <= r.y2)
			return;

		if (y1..y2 intersects r.y1..r.y2) {
			if (x === r.left()) {
				// Rect opening at same x position as previously opened rectangle and overlapping
				// y region.
				if (y1 > r.y1)
					y1 = r.y2 + 1;
				else {
					assert(y1 < r.y1);
					y2 = r.y1 - 1;
				}
				continue;
			}

			r.setRight(x)
			output.push(r);
			array.splice(active, i, 1);

			// Does it intersect fully or partly?
			if (y1 > r.y1) {
				// Partly - create a new rectangle with the difference
				active.push(new Rect(x, r.y1, x, y1 - 1));
			}
			else if (y1 < r.y1) {
				// Partly - create a new rectangle with the difference
				active.push(new Rect(x, y2 + 1, x, r.y2));
			}
		}
	}

	active.push(new Rect(x, y1, x, y2));
}

function handleCloseRect(rect) {
	var x = rect.left();
	var y1 = rect.top();
	var y2 = rect.bottom();
	assert(y1 <= y2);

	for (var i=0; i<active.length; i++) {
		var r = active[i];
		if (y1..y2 intersects r.y1..r.y2) {
			if (y1 <= r.y1 && y2 >= r.y2) {
				// Close out this rectangle
				r.setRight(x);
				output.push(r);
				array.splice(active, i, 1);
				continue;
			}
		}
	}

	// Remove rect from current
	array.remove(current, rect);

	// Now check if there are any that need to be opened (we're fully enclosed by previously active rectangle but
	// extend beyond the rectangle that just closed
	for (var i=0; i<current.length; i++) {
		var r = current[i];
		if (y1..y2 intersects r.y1..r.y2) {
			active.push(new Rect(x, y1Intersect, x, y2Intersect));
		}

		// if (y1 <= r.y1 && y2 >= r.y2) {
		// 	// Need to re-open the baby
		// 	active.push(new Rect(x, r.y1, x, r.y2));
		// }
	}
}