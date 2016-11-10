goog.provide('ag.bio.io.ClustalStringsGood');

ag.bio.io.ClustalStringsGood = [
    ["Single block, no numbers or tabs",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1\tABC\n" +
               "2\tA-C\n" +
               "3\t--C\n",
            [
                ["1", "ABC"],
                ["2", "A-C"],
                ["3", "--C"] ] ],

    ["Spaces instead of tabs",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1   ABC\n" +
               "2   A-C\n" +
               "3   --C\n",
            [
                ["1", "ABC"],
                ["2", "A-C"],
                ["3", "--C"] ] ],

    ["2 blocks, spaces instead of tabs",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1   ABC\n" +
               "2   A-C\n" +
               "3   --C\n" +
               "\n" +
               "1   DEF\n" +
               "2   -E-\n" +
               "3   D--\n",
            [
                ["1", "ABCDEF"],
                ["2", "A-C-E-"],
                ["3", "--CD--"] ] ],

    ["2 blocks, spaces in one block, tabs in the other",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1\tABC\n" +
               "2\tA-C\n" +
               "3\t--C\n" +
               "\n" +
               "1   DEF\n" +
               "2   -E-\n" +
               "3   D--\n",
            [
                ["1", "ABCDEF"],
                ["2", "A-C-E-"],
                ["3", "--CD--"] ] ],

    ["2 blocks, arbitrary, unusual spacing between identifier and alignment",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1\t ABC\n" +
               "2\t   A-C\n" +
               "3 --C\n" +
               "\n" +
               "1       DEF\n" +
               "2  \t \t -E-\n" +
               "3           D--\n",
            [
                ["1", "ABCDEF"],
                ["2", "A-C-E-"],
                ["3", "--CD--"] ] ],

    ["2 blocks, spaces within alignment",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1   A BC \n" +
               "2   A-  C\n" +
               "3  --C\n" +
               "\n" +
               "1   D E F\n" +
               "2   -E -\n" +
               "3   D- -\n",
            [
                ["1", "ABCDEF"],
                ["2", "A-C-E-"],
                ["3", "--CD--"] ] ],

    ["2 blocks, numbers at end of alignment",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1   ABC 234\n" +
               "2   A-C 012\n" +
               "3   --C 678\n" +
               "\n" +
               "1   DEF 9\n" +
               "2   -E-\n" +
               "3   D-- 00030203401\n",
            [
                ["1", "ABCDEF"],
                ["2", "A-C-E-"],
                ["3", "--CD--"] ] ],

    ["2 blocks, spaces inside alignment and numbers at end of alignment",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1   A BC 12\n" +
               "2   A-  C 34\n" +
               "3   --C  56\n" +
               "\n" +
               "1     DEF 78\n" +
               "2   -E-\n" +
               "3   D  -  - 90\n",
            [
                ["1", "ABCDEF"],
                ["2", "A-C-E-"],
                ["3", "--CD--"] ] ],

    ["5 blocks",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1   ABC\n" +
               "2   A-C\n" +
               "3   --C\n" +
               "\n" +
               "1   DEF\n" +
               "2   -E-\n" +
               "3   D--\n" +
               "\n" +
               "1   ---\n" +
               "2   GH-\n" +
               "3   G-I\n" +
               "\n" +
               "1   JKLMNO\n" +
               "2   J--M-O\n" +
               "3   --LMNO\n" +
               "\n" +
               "1   P\n" +
               "2   -\n" +
               "3   P\n",
            [
                ["1", "ABCDEF---JKLMNOP"],
                ["2", "A-C-E-GH-J--M-O-"],
                ["3", "--CD--G-I--LMNOP"] ] ],

    ["4 blocks, single letter per block",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1   A\n" +
               "2   A\n" +
               "3   -\n" +
               "\n" +
               "1   D\n" +
               "2   -\n" +
               "3   D\n" +
               "\n" +
               "1   -\n" +
               "2   G\n" +
               "3   G\n" +
               "\n" +
               "1   J\n" +
               "2   J\n" +
               "3   -\n" +
               "\n" +
               "1   P\n" +
               "2   -\n" +
               "3   P\n",
            [
                ["1", "AD-JP"],
                ["2", "A-GJ-"],
                ["3", "-DG-P"] ] ],

    ["1 block",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1   A\n" +
               "2   A\n" +
               "3   -\n",
            [
                ["1", "A"],
                ["2", "A"],
                ["3", "-"] ] ],

    ["1 block, no newline at end of file",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1   A\n" +
               "2   A\n" +
               "3   -",
            [
                ["1", "A"],
                ["2", "A"],
                ["3", "-"] ] ],

    ["1 block, fancy ids, many newlines at end of file",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1234_345-234_Paer   A\n" +
               "567_12-200_Ecol   B\n" +
               "890_456-323_Rleg   -\n\n\n",
            [
                ["1234_345-234_Paer", "A"],
                ["567_12-200_Ecol", "B"],
                ["890_456-323_Rleg", "-"] ] ],

    ["1 block with consensus line",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1   ABC---DEF\n" +
               "2   A-C----EF\n" +
               "3   AB----DE-\n" +
               "    *:   .: *\n",
            [
                ["1", "ABC---DEF"],
                ["2", "A-C----EF"],
                ["3", "AB----DE-"] ] ],

    ["2 blocks separated by consensus line and newline",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1   ABC---DEF\n" +
               "2   A-C----EF\n" +
               "3   AB----DE-\n" +
               "    *:   .: *\n\n" +
               "1   GH-\n" +
               "2   G-I\n" +
               "3   GHI\n",
            [
                ["1", "ABC---DEFGH-"],
                ["2", "A-C----EFG-I"],
                ["3", "AB----DE-GHI"] ] ],

    ["2 blocks both with consensus lines",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1   ABC---DEF\n" +
               "2   A-C----EF\n" +
               "3   AB----DE-\n" +
               "    *:   .: *\n\n" +
               "1   GH-\n" +
               "2   G-I\n" +
               "3   GHI\n" +
               "    *:.\n",
            [
                ["1", "ABC---DEFGH-"],
                ["2", "A-C----EFG-I"],
                ["3", "AB----DE-GHI"] ] ],

    ["2 blocks separated by many newlines and whitespace",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1   ABC---DEF\n" +
               "2   A-C----EF\n" +
               "3   AB----DE-\n" +
               "     \n    \n\n\n  \n" +
               "1   GH-\n" +
               "2   G-I\n" +
               "3   GHI\n",
            [
                ["1", "ABC---DEFGH-"],
                ["2", "A-C----EFG-I"],
                ["3", "AB----DE-GHI"] ] ],

    ["2 blocks with duplicate identifiers",
            "CLUSTAL W(1.83) - multiple sequence alignment\n\n" +
               "1   ABC---DEF\n" +
               "1   ABC-----F\n" +
               "2   A-C----EF\n" +
               "3   AB----DE-\n" +
               "\n" +
               "1   GH-\n" +
               "1   G--\n" +
               "2   G-I\n" +
               "3   GHI\n",
            [
                ["1", "ABC---DEFGH-"],
                ["1", "ABC-----FG--"],
                ["2", "A-C----EFG-I"],
                ["3", "AB----DE-GHI"] ] ]
];