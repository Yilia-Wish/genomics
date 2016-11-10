goog.provide('ag.painting.TextBlockRenderer');

goog.require('ag.painting.GlyphCache');
goog.require('ag.painting.AbstractTextCachedRenderer');

/**
 * Hybrid renderer that fills in background using the canvas fillRect command, but renders the glyph from
 * a glyph cache.
 *
 * @constructor
 * @param {string} font
 * @param {ag.core.AObject=} optParent defaults to null
 * @extends {ag.painting.AbstractTextCachedRenderer}
 */
ag.painting.TextBlockRenderer = function(font, optParent) {
    goog.base(this, font, optParent);

    this.glyphCache_ = new ag.painting.GlyphCache(this.charPixelMetrics, true /* optRenderFullBlock */);
};
goog.inherits(ag.painting.TextBlockRenderer, ag.painting.AbstractTextCachedRenderer);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var assert = goog.asserts.assert;
var events = goog.events;
var math = goog.math;

var Size = goog.math.Size;

var TextColorStyle = ag.painting.TextColorStyle;
var TextRenderer = ag.painting.TextRenderer;
var TextBlockRenderer = ag.painting.TextBlockRenderer;

// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @override */
TextBlockRenderer.prototype.drawChar = function(context, x, y, asciiCh, optColors) {
    if (asciiCh === TextRenderer.SpaceCharCode)
        return;

    var glyph = this.glyphCache_.cachedGlyph(asciiCh, optColors);
    assert(glyph, 'Unrecognized character code: ' + asciiCh);
    var sRect = glyph.sourceRect;
    var sw = sRect.width();
    var sh = sRect.height();
    context.drawImage(glyph.canvas,
        sRect.x1, sRect.y1, sw, sh,
        x, y, sw, sh);
};

/** @override */
TextBlockRenderer.prototype.drawText = function(context, x, y, string, optColors) {
    // Cache some numbers
    var cpm = this.charPixelMetrics;
    var blockWidth = cpm.blockWidth();

    // Foreground
    for (var i=0, z=string.length, xPos = x; i<z; i++, xPos += blockWidth) {
        var asciiCh = string.charCodeAt(i);
        // Skip over spaces
        if (string[i] === ' ')
            continue;

        var glyph = this.glyphCache_.cachedGlyph(asciiCh, optColors);
        assert(glyph, 'Unrecognized character code: ' + asciiCh);

        var sRect = glyph.sourceRect;
        var sw = sRect.width();
        var sh = sRect.height();
        context.drawImage(glyph.canvas,
            sRect.x1, sRect.y1, sw, sh,
            xPos, y, sw, sh);
    }
};

/*******************************************************************************************************************/});
