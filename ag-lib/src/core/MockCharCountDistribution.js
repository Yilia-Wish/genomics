goog.provide('ag.core.MockCharCountDistribution');

goog.require('ag.core.ClosedIntRange');
goog.require('ag.core.CharCountDistribution');
goog.require('ag.meta.MetaObject');

ag.core.MockCharCountDistribution = function(optCharCounts, optDivisor) {
    goog.base(this, optCharCounts, optDivisor);
};
goog.inherits(ag.core.MockCharCountDistribution, ag.core.CharCountDistribution);

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var CharCountDistribution = ag.core.CharCountDistribution;
var ClosedIntRange = ag.core.ClosedIntRange;
var MockCharCountDistribution = ag.core.MockCharCountDistribution;

var metaObject = ag.meta.MetaObject.getInstance;

MockCharCountDistribution.distribution1 = function() {
    var divisor = 10;
    return new MockCharCountDistribution([
        {A: 3, T: 3, C: 4},
        {G: 10},
        {A: 5, C: 1}
    ], divisor);
};

MockCharCountDistribution.distribution2 = function() {
    var divisor = 10;
    return new MockCharCountDistribution([
        {},
        {A: 3},
        {T: 1, A: 5},
        {G: 8, A: 1, T: 1},
        {C: 0, G: 1, A: 7, T: 2},
        {}
    ], divisor);
};

// --------------------------------------------------------------------------------------------------------------------
// Public functions
MockCharCountDistribution.prototype.add = function(data, optOffset) {
    var offset = goog.isDef(optOffset) ? optOffset : 1;
    goog.base(this, 'add', data, offset);
    metaObject().emit(this, CharCountDistribution.SignalType.DATA_CHANGED, new ClosedIntRange(offset, offset + data.length() - 1));
};

MockCharCountDistribution.prototype.remove = function(position, optCount) {
    var count = goog.isDefAndNotNull(optCount) ? optCount : 1;
    goog.base(this, 'remove', position, count);
    metaObject().emit(this, CharCountDistribution.SignalType.COLUMNS_REMOVED, new ClosedIntRange(position, position + count - 1));
};

MockCharCountDistribution.prototype.insert = function(position, optCount) {
    var count = goog.isDefAndNotNull(optCount) ? optCount : 1;
    this.insertBlanks(position, count);
    metaObject().emit(this, CharCountDistribution.SignalType.COLUMNS_INSERTED, new ClosedIntRange(position, position + count - 1));
};

/*******************************************************************************************************************/});
