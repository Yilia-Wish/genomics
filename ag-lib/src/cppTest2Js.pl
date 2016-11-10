#!/usr/bin/perl

use strict;
use warnings;

use Data::Dumper;

my $usage = <<USAGE;
Usage: $0 <cpp test file>

USAGE

my $file = shift or die $usage;

my $rawTests = &readRawTests($file);
my $jsTests = &rawToJs($rawTests);

print &htmlHeader();

foreach my $jsTest (@$jsTests) {
    print '// --------------------------------------------------------------------------------------------------------------------', "\n";
    print 'function test_', $jsTest->{name}, '() {', "\n";
    foreach my $line (@{$jsTest->{lines}}) {
        $line =~ s/\t/    /g;
        print "    ", $line, "\n";
    }
    print "};\n\n";
}

print "\n";
print &htmlFooter();


sub readRawTests {
    my $tests = [];

    open (IN, "< $file") or die $!;
    while (<IN>) {
        chomp;

        next if (!/^void Test.*::(\w+)\(\)/);

        my $testName = $1;
        my $lines = [];

        while (<IN>) {
            chomp;
            next if (/^\{/);
            last if (/^\}/);

            push @$lines, $_;
        }

        push @$tests, {
            name => $testName,
            lines => $lines
        };
    }
    close (IN);

    return $tests;
}

sub rawToJs {
    my $tests = shift or die;
    my @jsTests;
    foreach my $test (@$tests) {
        push @jsTests, &convertRawTestToJs($test);
    }
    return \@jsTests;
}

sub convertRawTestToJs {
    my $rawTest = shift or die;
    my $jsTest = {
        name => $rawTest->{name}
    };

    my %subseqs = ();
    # spyName => takenCount - initially zero
    my %spys = ();
    my %ranges = ();

    my @jsLines;
    foreach my $line (@{$rawTest->{lines}}) {
        # print "Processing: $line\n";

        my $noMatch = 0;
        my $spacing = '';
        $spacing = $1 if ($line =~ s/^(\s+)//);
        if (($spacing =~ s/^\t//) == 0) {
            $spacing =~ s/^\s{4}//;
        }

        my $jsLine = $spacing;

        $line =~ s/SubseqChangePodVector /var /;
        $line =~ s/qVariantValue<.*?>//g;
        $line =~ s/QVector<.*?> /var /;
        if ($line =~ /(\w+)\.at\((\d+)\)/) {
            my $varName = $1;
            my $args = $2;
            if (exists $spys{$varName}) {
                $line =~ s/$varName\.at\(\d+\)/$varName\.signals()[$args]/g;

                # Sometimes, we access another level deep in the signals
                if (defined $args) {
                    $line =~ s/(\[$args\])\.at\((\d+)\)/$1\[$2\]/;
                }
            }
        }

        # Pass comments on through
        if ($line =~ /^\/\//) {
            $jsLine .= $line;
        }
        elsif ($line =~ /Seq (\w+)\((.*)\)/) {
            $jsLine .= "var $1 = $2;";
        }
        elsif ($line =~ /Subseq \*(\w+) = new Subseq\((\w+)\)/) {
            $subseqs{$1} = $2;

            $jsLine .= "//MAYBE var $1 = new Subseq($2);";
        }
        elsif ($line =~ /(\w+)->setBioString\(\s*(.*?)\)/) {
            $jsLine .= "var $1 = new Subseq($2, " . $subseqs{$1} . ");";
        }
        elsif ($line =~ /ClosedIntRange (\w+) = (.*)/) {
            $jsLine .= "var $1 = $2";
            $ranges{$1} = 1;
        }
        elsif ($line =~ /PosiRect (\w+) = (.*)/) {
            $jsLine .= "var $1 = $2";
        }
        elsif ($line =~ /PosiRect (\w+)(.*)/) {
            $jsLine .= "var $1 = new UnitRect$2";
        }
        elsif ($line =~ /QVariantList (\w+)/) {
            $jsLine .= "var $1;";
        }
        elsif ($line =~ /(\w+)\.clear\(\)/) {
            # Allow spies to process clear lines
            if (exists $spys{$1}) {
                $jsLine .= $line;
                $spys{$1} = 0;  # Reduce the taken count to zero
            }
            else {
                $jsLine .= $line;
                $noMatch = 1;
            }
        }
        elsif ($line =~ /QVERIFY\((\w+)\.isEmpty/) {
            if (exists $spys{$1} || $ranges{$1}) {
                $jsLine .= "assertTrue($1.isEmpty());";
            }
            else {
                $jsLine .= 'assertEquals(0, ' . $1 . '.length);';
            }
        }
        elsif ($line =~ /QSignalSpy (\w+)\(&?(\w+), SIGNAL\((\w+)/) {
            my $varName = $1;
            my $sourceObj = $2;
            my $signalName = $3;

            $signalName = &mogrify($signalName);

            $spys{$varName} = 0;

            $jsLine .= "var $varName = new SignalSpy($sourceObj, SignalType.$signalName);";
        }
        elsif ($line =~ /(\w+) = (\w+)\.takeFirst/) {
            my $assignee = $1;
            my $source = $2;

            if (exists $spys{$source}) {
                $jsLine .= "$1 = $2.signals()[" . $spys{$source} . "];";
                $spys{$source}++;
            }
            else {
                $jsLine .= "// $line";
                $noMatch = 1;
            }
        }
        elsif ($line =~ /(ObservableMsa|Msa) \*?(\w+)/) {
            $jsLine .= "var $2 = new $1();";
        }
        elsif ($line =~ /SubseqChangePod (\w+) = (.*)/) {
            $jsLine .= "var $1 = $2;";
        }
        elsif ($line =~ /QVERIFY\(\*(\S+) == (".*?")/) {
            $jsLine .= "assertEquals($2, $1.toString());";
        }
        elsif ($line =~ /QVERIFY\((.*)\)/) {
            $jsLine .= "assertTrue($1);";
        }
        elsif ($line =~ /QCOMPARE\((.*)\)/) {
            my @args = @{ &extractFunctionArgs($1) };
            my $firstArg = $args[0];
            my $secondArg = $args[1];

            # Pre-process the arguments
            my $info = &parseArgument($firstArg);
            if (ref($info) eq 'HASH') {
                if ($info->{method} eq 'size' && !exists $spys{$info->{object}}) {
                    $firstArg =~ s/size\(\)/length/;
                }
            }
            $info = &parseArgument($secondArg);
            if (ref($info) eq 'HASH') {
                if ($info->{method} eq 'size' && !exists $spys{$info->{object}}) {
                    $secondArg =~ s/size\(\)/length/;
                }
            }

            # If its a range, simply use the eq method
            if ($ranges{$firstArg} || $ranges{$secondArg}) {
                $jsLine .= "assertTrue($firstArg.eq($secondArg));";
            }
            elsif ($firstArg eq 'true') {
                $jsLine .= "assertTrue($secondArg);";
            }
            elsif ($firstArg eq 'false') {
                $jsLine .= "assertFalse($secondArg);";
            }
            elsif ($secondArg eq 'true') {
                $jsLine .= "assertTrue($firstArg);";
            }
            elsif ($secondArg eq 'false') {
                $jsLine .= "assertFalse($firstArg);";
            }
            else {
                $jsLine .= "assertEquals($secondArg, $firstArg);";
            }
        }
        else {
            $noMatch = 1;
            if ($line =~ /\S/) {
                $jsLine .= "// $line";
            }
            else {
                $jsLine .= $line;
            }
        }

        if (!$noMatch) {
            $jsLine =~ s/\s<</,/g;
            $jsLine =~ s/\w+Vector\(\)/\[/g;
            $jsLine =~ s/\[, /[/g;
        }
        $jsLine =~ s/Pod/Change/g;
        $jsLine =~ s/pod/change/g;
        $jsLine =~ s/QPoint/new Coordinate/g;
        $jsLine =~ s/new UnitRect\(new Coo/UnitRect.createFromCoordinates\(new Coo/g;
        $jsLine =~ s/ClosedIntRange/new ClosedIntRange/g;
        $jsLine =~ s/PosiRect/new UnitRect/g;

        if ($jsLine =~ /(\w+)\.at\((\d+)\)/) {
            my $obj = $1;
            my $amount = $2;
            $jsLine =~ s/\w+\.at\(\d+\)/$obj\[$amount\]/;
        }

        # Remove extraneous parentheses
        $jsLine =~ s/= \((.*)\);/= $1;/;
        $jsLine =~ s/\.eq\(\(spy(.*)\)\)\)/\.eq(spy$1))/;

        # print "===> $jsLine\n";
        # <STDIN>;

        push @jsLines, $spacing . $jsLine;
    }

    $jsTest->{lines} = \@jsLines;

    return $jsTest;
}

sub mogrify {
    my $signalName = shift or die;

    my @letters = split('', $signalName);

    my @parts = (uc(shift @letters));
    foreach my $letter (@letters) {
        if ($letter =~ /[A-Z]/) {
            push @parts, $letter;
        }
        else {
            $parts[-1] .= uc($letter);
        }
    }

    return join('_', @parts);
}

sub extractFunctionArgs {
    my $string = shift or die;

    my @letters = split('', $string);

    my $buffer = '';
    my @args = ();
    my $parens = 0;
    foreach my $letter (@letters) {
        if ($letter eq ',' && $parens == 0) {
            $buffer =~ s/^\s+//;
            $buffer =~ s/\s+$//;
            push @args, $buffer;
            $buffer = '';
            next;
        }
        if ($letter eq '(') {
            $parens++;
        }
        elsif ($letter eq ')') {
            $parens--;
        }
        $buffer .= $letter;
    }
    $buffer =~ s/^\s+//;
    $buffer =~ s/\s+$//;
    push @args, $buffer;
    return \@args;
}

sub parseArgument {
    my $arg = shift;
    die if (!defined($arg));

    if ($arg =~ /^(\w+)\.(\w+)\((.*)\)/) {
        my $object = $1;
        my $method = $2;
        my $args = $3;

        return {
            object => $object,
            method => $method,
            args => $args
        };
    }
    else {
        return $arg;
    }
}

sub htmlHeader {
    return <<HTML;
<!doctype html>
<html>
<head>
    <title>AG JS Library Unit Tests - ag.bio.</title>
    <meta charset='utf-8'>
</head>

<script src='../goog/base.js'></script>
<script src='../deps.js'></script>
<script>
goog.require('goog.testing.jsunit');
</script>
<body>
<script>
// Aliases

HTML
}

sub htmlFooter {
    return <<HTML;
</script>
</body>
</html>
HTML
}