goog.provide('ag.bio.primer.ThermodynamicConstants');

ag.bio.primer.ThermodynamicConstants = {
	// ----------------
	// General
	/** @const */
	R: 1.987,

    // The following thermodynamic characteristics are taken from Allawi and Santa Lucia, 1997

    // --------------
    // Enthalpy table
	ENTHALPY_MONOMER_KCAL_PER_MOLE: {
		// A
		65: 2.3,

		// C
		67: 0.1,

		// G
		71: 0.1,

		// T
		84: 2.3
	},

	ENTHALPY_DIMER_KCAL_PER_MOLE: {
		//    AA			AC			AG          AT
		65: { 65: -7.9,		67: -8.4,	71: -7.8,	84: -7.2  },
		//	  CA            CC          CG          CT
		67: { 65: -8.5,		67: -8.0,	71: -10.6,	84: -7.8  },
		//    GA            GC          GG          GT
		71: { 65: -8.2,		67: -9.8,	71: -8.0,	84: -8.4  },
		//    CA            CC          CG          CT
		84: { 65: -7.2,		67: -8.2,	71: -8.5,	84: -7.9  }
	},

	ENTHALPY_SYMMETRY_CORRECTION: 0.,

    // --------------
    // Entropy tables
    ENTROPY_MONOMER_CAL_PER_K_PER_MOLE: {
		// A
		65: 4.1,

		// C
		67: -2.8,

		// G
		71: -2.8,

		// T
		84: 4.1
	},

	ENTROPY_DIMER_CAL_PER_K_PER_MOLE: {
		//    AA			AC			AG          AT
		65: { 65: -22.2,	67: -22.4,	71: -21.0,	84: -20.4 },
		//	  CA            CC          CG          CT
		67: { 65: -22.7,	67: -19.9,	71: -27.2,	84: -21.0 },
		//    GA            GC          GG          GT
		71: { 65: -22.2,	67: -24.4,	71: -19.9,	84: -22.4 },
		//    CA            CC          CG          CT
		84: { 65: -21.3,	67: -22.2,	71: -22.7,	84: -22.2 }
	},
	
	/** @const */
	ENTROPY_SYMMETRY_CORRECTION: -1.4
};