#!/usr/bin/perl

use strict;
use warnings;
use JSON;

my $usage = <<USAGE;
Usage: $0 <aln file> [...]

USAGE

my @alns = ();

foreach my $file (@ARGV) {
    open (IN, "< $file") or die $!;
    undef $/;
    my $data = <IN>;
    close (IN);

    push @alns, [ $file, $data ];
}

print to_json(\@alns, {pretty => 1, space_before => 0, space_after => 1});
