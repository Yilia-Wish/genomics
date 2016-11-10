goog.provide('ag.bio.io.ClustalStringsWithErrors');

ag.bio.io.ClustalStringsWithErrors = [
   [
      "clustal_header_at_eof.aln",
      "1\tABC\n2\tA-C\n3\t-BC\n\n1\tDEF\n2\tD-F\n3\t-EF\n\nCLUSTAL W (1.83) - multiple sequence alignment\n"
   ],
   [
      "clustal_header_in_identifier.aln",
      "CLUSTAL\tABC\n2\tA-C\n3\t-BC\n\nCLUSTAL\tDEF\n2\tD-F\n3\t-EF\n"
   ],
   [
      "clustal_header_mispelled.aln",
      "CLSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\tDEF\n2\tD-F\n3\t-EF\n"
   ],
   [
      "clustal_header_missing.aln",
      "1\tABC\n2\tA-C\n3\t-BC\n\n1\tDEF\n2\tD-F\n3\t-EF\n"
   ],
   [
      "clustal_header_without_empty_line.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n1\tABC\n2\tA-C\n3\t-BC\n\n1\tDEF\n2\tD-F\n3\t-EF\n"
   ],
   [
      "clustal_header_wrong_place.aln",
      "1\tABC\n2\tA-C\n3\t-BC\n\nCLUSTAL W (1.83) - multiple sequence alignment\n\n1\tDEF\n2\tD-F\n3\t-EF\n"
   ],
   [
      "diflen_1block_1seq.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABCD\n2\tA-C\n3\t-BC\n"
   ],
   [
      "diflen_1block_1seq_b.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C-\n3\t-BC\n"
   ],
   [
      "diflen_1block_1seq_c.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC.\n"
   ],
   [
      "diflen_1block_2seq.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABCD\n2\tA-C-\n3\t-BC\n"
   ],
   [
      "diflen_1block_2seq_b.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABCD\n2\tA-C\n3\t-BC-\n"
   ],
   [
      "diflen_1block_2seq_c.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C-\n3\t-BCD\n"
   ],
   [
      "diflen_2block_1seq.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABCD\n2\tA-C\n3\t-BC\n\n1\t-GHI\n2\tD--I\n3\t-GH-\n"
   ],
   [
      "diflen_2block_1seq_alt.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\t-GHI\n2\tD--\n3\t-GH\n"
   ],
   [
      "diflen_2block_1seq_alt_b.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\t-GH\n2\tD--I\n3\t-GH\n"
   ],
   [
      "diflen_2block_1seq_alt_c.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\t-GH\n2\tD--\n3\t-GH-\n"
   ],
   [
      "diflen_2block_1seq_b.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C-\n3\t-BC\n\n1\t-GHI\n2\tD--I\n3\t-GH-\n"
   ],
   [
      "diflen_2block_1seq_c.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC.\n\n1\t-GHI\n2\tD--I\n3\t-GH-\n"
   ],
   [
      "diflen_2block_2seq.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABCD\n2\tA-C-\n3\t-BC\n\n1\t-GHI\n2\tD--I\n3\t-GH-\n"
   ],
   [
      "diflen_2block_2seq_alt.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\t-GHI\n2\tD--I\n3\t-GH\n"
   ],
   [
      "diflen_2block_2seq_alt_b.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\t-GHI\n2\tD--\n3\t-GH-\n"
   ],
   [
      "diflen_2block_2seq_alt_c.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\t-GH\n2\tD--I\n3\t-GH-\n"
   ],
   [
      "diflen_2block_2seq_b.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABCD\n2\tA-C\n3\t-BC-\n\n1\t-GHI\n2\tD--I\n3\t-GH-\n"
   ],
   [
      "diflen_2block_2seq_c.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C-\n3\t-BCD\n\n1\t-GHI\n2\tD--I\n3\t-GH-\n"
   ],
   [
      "distinct_ids_1_of_3.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\tDEF\n4\tD-F\n5\t-EF\n"
   ],
   [
      "distinct_ids_1_of_3b.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n4\tDEF\n2\tD-F\n5\t-EF\n"
   ],
   [
      "distinct_ids_1_of_3c.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n4\tDEF\n5\tD-F\n3\t-EF\n"
   ],
   [
      "distinct_ids_2_of_3.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\tDEF\n2\tD-F\n4\t-EF\n"
   ],
   [
      "distinct_ids_2_of_3b.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\tDEF\n4\tD-F\n3\t-EF\n"
   ],
   [
      "distinct_ids_2_of_3c.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n4\tDEF\n2\tD-F\n3\t-EF\n"
   ],
   [
      "distinct_ids_no_common.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n4\tDEF\n5\tD-F\n6\t-EF\n"
   ],
   [
      "empty",
      ""
   ],
   [
      "inconsistent_spacing_1.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\t ABC\n2\tA-C\n3\t-BC\n"
   ],
   [
      "inconsistent_spacing_2.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\t ABC\n2\t A-C\n3\t-BC\n\n1\tDEF\n2\tD-F\n3\t-EF\n"
   ],
   [
      "inconsistent_spacing_3.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t -BC\n"
   ],
   [
      "inconsistent_spacing_4.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\t   A-C\n3\t -BC\n"
   ],
   [
      "inconsistent_spacing_5.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\tDEF\n2\t   D-F\n3\t-EF\n"
   ],
   [
      "inconsistent_spacing_6.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\tDEF\n2\tD-F\n3\t  -EF\n"
   ],
   [
      "malformed_1.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\nJUNKDATA\n1\tABC\n2\tA-C\n3\t-BC\n\n1\tDEF\n2\tD-F\n3\t-EF\n"
   ],
   [
      "malformed_2.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\nJUNKDATA\n2\tA-C\n3\t-BC\n\n1\tDEF\n2\tD-F\n3\t-EF\n"
   ],
   [
      "malformed_3.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\nJUNKDATA\n3\t-BC\n\n1\tDEF\n2\tD-F\n3\t-EF\n"
   ],
   [
      "malformed_4.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\nJUNKDATA\n\n1\tDEF\n2\tD-F\n3\t-EF\n"
   ],
   [
      "malformed_5.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\nJUNKDATA\n1\tDEF\n2\tD-F\n3\t-EF\n"
   ],
   [
      "malformed_6.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\tDEF\nJUNKDATA\n2\tD-F\n3\t-EF\n"
   ],
   [
      "misordered_1.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n2\tD-F\n1\tDEF\n3\t-EF\n"
   ],
   [
      "misordered_2.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n3\t-EF\n2\tD-F\n1\tDEF\n"
   ],
   [
      "unequal_seqblock_1-3-3.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n\n1\tDEF\n2\tD-F\n3\t-F-\n\n1\tG-I\n2\tGHI\n3\t--I\n"
   ],
   [
      "unequal_seqblock_2-3.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n\n1\tDEF\n2\tD-F\n3\t-EF\n"
   ],
   [
      "unequal_seqblock_3-2-3.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\tDEF\n2\tD-F\n\n1\tG-I\n2\tGHI\n3\t--I\n"
   ],
   [
      "unequal_seqblock_3-2-3b.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\tDEF\n3\tD--\n\n1\tG-I\n2\tGHI\n3\t--I\n"
   ],
   [
      "unequal_seqblock_3-2.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\tDEF\n2\tD-F\n"
   ],
   [
      "unequal_seqblock_3-3-2.aln",
      "CLUSTAL W (1.83) - multiple sequence alignment\n\n1\tABC\n2\tA-C\n3\t-BC\n\n1\tDEF\n2\tD-F\n3\tD-F\n\n1\tG-I\n2\tGHI\n"
   ],
   [
      "whitespace",
      "  \n\n\t\n\n"
   ]
];
