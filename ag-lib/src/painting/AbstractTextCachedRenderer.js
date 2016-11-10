goog.provide('ag.painting.AbstractTextCachedRenderer');

goog.require('ag.painting.GlyphCache');
goog.require('ag.painting.TextRenderer');

/**
 * Hybrid renderer that fills in background using the canvas fillRect command, but renders the glyph from
 * a glyph cache.
 *
 * @constructor
 * @param {string} font
 * @param {ag.core.AObject=} optParent defaults to null
 * @extends {ag.painting.TextRenderer}
 */
ag.painting.AbstractTextCachedRenderer = function(font, optParent) {
    goog.base(this, font, optParent);

    /**
     * @type {ag.painting.GlyphCache}
     * @protected
     */
    this.glyphCache_;
};
goog.inherits(ag.painting.AbstractTextCachedRenderer, ag.painting.TextRenderer);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var AbstractTextCachedRenderer = ag.painting.AbstractTextCachedRenderer;

// --------------------------------------------------------------------------------------------------------------------
// Destructor
/** @override */
AbstractTextCachedRenderer.prototype.disposeInternal = function() {
    goog.base(this, 'disposeInternal');

    this.glyphCache_.clear();
    this.glyphCache_ = null;
};

/**
 * Recalculates all char pixel metrics to reflect newFont
 * @param {string} newFont
 */
AbstractTextCachedRenderer.prototype.setFont = function(newFont) {
    if (this.charPixelMetrics.font() === newFont)
        return;

    this.glyphCache_.clear();

    // Do this last so that the signal is emitted *after* we have cleared the glyph cache
    goog.base(this, 'setFont', newFont);
};

/**
 * @param {number} newScale
 */
AbstractTextCachedRenderer.prototype.setScale = function(newScale) {
    if (goog.math.nearlyEquals(this.charPixelMetrics.scale(), newScale))
        return;

    this.glyphCache_.clear();
    goog.base(this, 'setScale', newScale);
};

/*******************************************************************************************************************/});
