goog.provide('ag.ui');

goog.require('goog.style');

/** @enum {string} */
ag.ui.Cursor = {
    OpenHand: 'open-hand',
    ClosedHand: 'closed-hand',
    ResizeEW: 'ew-resize',
    ColResize: 'col-resize'
};

/** @enum {number} */
ag.ui.Axis = {
    Horizontal: 0,
    Vertical: 1,
    Both: 2
};

/** @enum {number} */
ag.ui.Orientation = {
	VERTICAL: 0,
	HORIZONTAL: 1,
	kVertical: 2,
	kHorizontal: 3
};

/** @enum {number} */
ag.ui.ScrollBarPolicy = {
    Auto: 0,    // Turned on as needed
    Off: 1,     // Always off
    On: 2       // Always on
}

/** @enum {number} */
ag.ui.KeyModifiers = {
    Ctrl: 0,
    XOsCtrl: 1,
    Shift: 2,
    Meta: 3,
    Alt: 4
};

/** @enum {number} */
ag.ui.Alignment = {
    Left: 0,
    Right: 1
}

ag.ui.ResizeMode = {
	kInteractive: 0,	// Defaults to default section size, may be resized by user or programmatically
	kFixed: 1			// Static, unchanging column size
};

/**
 * An optimized version of styles getRelativePosition that avoids the several object allocations
 *
 * @param {goog.events.BrowserEvent} event
 * @param {Element} element
 * @param {goog.math.Coordinate|ag.core.Point} receiver
 */
ag.ui.getRelativePosition = function(event, element, receiver) {
    var bounds = element.getBoundingClientRect();
    receiver.x = event.clientX - bounds.left;
    receiver.y = event.clientY - bounds.top;
};

/** @param {Element} element */
ag.ui.focusWithoutScroll = function(element) {
    var x = ag.ui.scrollX();
    var y = ag.ui.scrollY();
    element.focus();
    window.scroll(x, y);
};

/**
 * @param {Element} element
 * @return {!goog.math.Size}
 */
ag.ui.getSize = function(element) {
    var isVisible = element && (element.offsetWidth > 0 || element.offsetHeight > 0);
    if (!isVisible) {
        // Find the issuous parent
        var pEl = element.parentElement;
        while (pEl) {
            if (!goog.style.isElementShown(pEl)) {
                var style = pEl.style;

                var oldDisplay = style.display;
                var oldVisibility = style.visibility;
                var oldPosition = style.position;

                style.visibility = 'hidden';
                style.position = 'relative';
                //                ^^^^^^^^ To preserve natural boundaries
                style.display = 'inline';

                var size = goog.style.getSize(element);

                style.visibility = oldVisibility;
                style.position = oldPosition;
                style.display = oldDisplay;

                return size;
            }
            pEl = pEl.parentElement;
        }
    }

    if (goog.DEBUG) {
        window.console.log('ag.ui.getSize: element is not visible, yet no parent was hidden');
    }
    return goog.style.getSize(element);
};

/**
 * return {number}
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/window.scrollX
 */
ag.ui.scrollX = function() {
    return (window.pageXOffset !== undefined) ? window.pageXOffset : (document.documentElement || document.body.parentNode || document.body).scrollLeft;
};

/**
 * return {number}
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/window.scrollX
 */
ag.ui.scrollY = function() {
    return (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;
};