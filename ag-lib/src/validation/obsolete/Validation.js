/**
 * @param {Object} objectToValidate
 * @param {Object} rules validation object description
 * @param {Object=} optRefForInvalidFields reference to object to store any validation errors
 * @returns {boolean}
 */
ag.validation.validates = function(objectToValidate, ruleSet, optRefForInvalidFields) {
	var propertyNames = goog.object.getKeys(ruleSet);
	var valid = true;	// Assume valid unless provide otherwise
	for (var i=0; i<propertyNames.length; i++) {
		var propertyName = propertyNames[i];
		if (!ag.validation.validateProperty_(objectToValidate, ruleSet[propertyName], propertyName, optRefForInvalidFields))
			valid = false;
	}
	return valid;
};

/**
 * Validates propertyName of objectToValidate using the single rule and if invalid, storing the relevant
 * errors message in optRefForInvalidFields.
 *
 * @param {Object} objectToValidate
 * @param {Object|Array.Object} rule
 * @param {string} propertyName
 * @param {!Object=} optRefForInvalidFields
 * @return boolean
 */
ag.validation.validateProperty_ = function(objectToValidate, rule, propertyName, optRefForInvalidFields) {
	if (!goog.isArray(rule)) {
		var propertyIsValid = ag.validation.validatePropertyWithRule_(objectToValidate, propertyName, rule);
		if (propertyIsValid === false) {
			if (goog.isDef(optRefForInvalidFields)) {
				if (goog.isDefAndNotNull(rule.message))
					optRefForInvalidFields[propertyName] = rule.message;
				else
					optRefForInvalidFields[propertyName] = 'Invalid';
			}
		}
		return propertyIsValid;
	}
	else {
		// Call this method for all rules
		for (var i=0; i< rule.length; i++) {
			goog.asserts.assert(!goog.isArray(rule[i]), "Rules may not be nested");

			var result = ag.validation.validateProperty_(objectToValidate, rule[i], propertyName, optRefForInvalidFields);
			if (result === false)
				return false;
		}
		return true;
	}
};

/**
 * Validate propertyName of objectToValidate using ruleObj
 *
 * @param {Object} objectToValidate
 * @param {string} propertyName
 * @param {Object|Array.Object} ruleObj
 * @return boolean
 */
ag.validation.validatePropertyWithRule_ = function(objectToValidate, propertyName, ruleObj) {
	goog.asserts.assert(goog.object.containsKey(ruleObj, 'rule'), 'Each rule must have a rule member');

	// Does it exist? Note: not dealing with null cases here.
	if (!goog.isDef(objectToValidate[propertyName]))
		return goog.isDefAndNotNull(ruleObj.allowEmpty) && ruleObj.allowEmpty === true;

	// Value exists and may or may not be null
	var ruleType = (!goog.isArray(ruleObj.rule)) ? ruleObj.rule : ruleObj.rule[0];
	switch (ruleType) {
	case ag.validation.ruleType.ALPHA_NUMERIC:
		return ag.validation.alphaNumeric(objectToValidate[propertyName]);
	case ag.validation.ruleType.BOOLEAN:
		return ag.validation.bool(objectToValidate[propertyName]);
	case ag.validation.ruleType.CONTAINS_NON_WHITESPACE:
		return ag.validation.containsNonWhitespace(objectToValidate[propertyName]);
	case ag.validation.ruleType.DATE:
		var format = (goog.isArray(ruleObj.rule)) ? ruleObj.rule[1] : null;
		return ag.validation.date(objectToValidate[propertyName], format);
	case ag.validation.ruleType.INTEGER:
		return ag.validation.integer(objectToValidate[propertyName]);
	case ag.validation.ruleType.LENGTH_BETWEEN:
		goog.asserts.assert(goog.isArray(ruleObj.rule), "LENGTH_BETWEEN rule must be in array");
		return ag.validation.lengthBetween(objectToValidate[propertyName], ruleObj.rule[1], ruleObj.rule[2]);
	case ag.validation.ruleType.MAX_LENGTH:
		goog.asserts.assert(goog.isArray(ruleObj.rule), "MAX_LENGTH must be in array");
		return ag.validation.maxLength(objectToValidate[propertyName], ruleObj.rule[1]);
	case ag.validation.ruleType.MIN_LENGTH:
		goog.asserts.assert(goog.isArray(ruleObj.rule), "MIN_LENGTH must be in array");
		return ag.validation.minLength(objectToValidate[propertyName], ruleObj.rule[1]);
	case ag.validation.ruleType.NUMERIC_COMPARE:
		return ag.validation.numericCompare(objectToValidate[propertyName], ruleObj.rule[1], ruleObj.rule[2]);

	default:
		return false;
	}
};
