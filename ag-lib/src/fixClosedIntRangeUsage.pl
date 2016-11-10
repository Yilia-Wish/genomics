#!/usr/bin/perl

$| = 1;

use strict;
use warnings;

my $usage = <<USAGE;
Usage: $0 <input file>

  Replaces all old usage of constructing ClosedIntRange with the
  appropriate forms:

  1) new ClosedIntRange(begin, length) -> new ClosedIntRange(begin, end)
  2) ClosedIntRange.createFromValues(begin, end) -> new ClosedIntRange(begin, end)

  ** Note: this assumes that the file is currently using the old style!!

USAGE

my $g_File = shift or die $usage;

open (IN, "< $g_File") or die qq([$0] Unable to open file '$g_File': $!\n);
while (my $line = <IN>) {
	$line =~ s/new ClosedIntRange\((-?\d+),\s*(-?\d+)\)/"new ClosedIntRange($1, " . &calcEnd($1, $2) . ")"/ge;
	$line =~ s/ClosedIntRange.createFromValues\((-?\d+),\s*(-?\d+)\)/new ClosedIntRange($1, $2)/g;
	print $line;
}
close (IN);

sub calcEnd {
	my $begin = shift;
	my $length = shift;

	my $end = $begin + $length;
	if ($length > 0) {
		$end--;
	}
	else {
		$end++;		
	}

	return $end;
}