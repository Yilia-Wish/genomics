goog.provide('PrimerPairFinderOdometer');

goog.require('ag.bio.grammar');
goog.require('ag.core.ClosedIntRange');
goog.require('ag.bio.BioString');
goog.require('ag.bio.primer.PrimerPairFinder');
goog.require('ag.bio.primer.PrimerSearchParameters');

PrimerPairFinderOdometer = function() {};

/**********************************************************************************************/ goog.scope(function() {
// Aliases
var grammar = ag.bio.grammar;

var BioString = ag.bio.BioString;
var ClosedIntRange = ag.core.ClosedIntRange;
var PrimerPairFinder = ag.bio.primer.PrimerPairFinder;
var PrimerSearchParameters = ag.bio.primer.PrimerSearchParameters;

PrimerPairFinderOdometer.prototype.findPrimers = function(string) {
	var psp = new PrimerSearchParameters();
	var finder = new PrimerPairFinder();

	var bs = new BioString(string, grammar.DNA);
	psp.ampliconLengthRange.begin = bs.length() - 30;
	psp.ampliconLengthRange.end = bs.length();
	return finder.findPrimerPairs(bs, new ClosedIntRange(1, bs.length()), psp);
};


/*******************************************************************************************************************/});

goog.exportSymbol('Odometer', PrimerPairFinderOdometer);
goog.exportSymbol('Odometer.prototype.findPrimers', PrimerPairFinderOdometer.prototype.findPrimers);
