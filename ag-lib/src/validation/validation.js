goog.provide('ag.validation');

goog.require('goog.array');
goog.require('goog.object');
goog.require('goog.asserts');

/** @enum {number} */
ag.validation.ruleType = {
	ALPHA_NUMERIC: 0,
	BOOLEAN: 1,
	CONTAINS_NON_WHITESPACE: 2,
	DATE: 3,
	INTEGER: 4,
	INTEGER_STRICT: 5,
	LENGTH_BETWEEN: 6,
	MAX_LENGTH: 7,
	MIN_LENGTH: 8,
	NUMERIC_COMPARE: 9
};

/**
 * @type {string}
 * @const
 */
var HOST_NAME_REGEX_PATTERN_ = '(?:[a-z0-9][-a-z0-9]*\\.)*(?:[a-z0-9][-a-z0-9]{0,62})\\.(?:(?:[a-z]{2}\\.)?[a-z]{2,4}|museum|travel)';

/**
 * Equivalent implemention of the PHP empty function
 *
 * @param {string|number|undefined|null|Object|Array}
 * @return {boolean}
 */
ag.validation.empty = function(value) {
	if (!goog.isDef(value) ||
		goog.isNull(value) ||
		value === '' ||
		value === 0 ||
		value === '0' ||
		value === false) {
		return true;
	}

	if (goog.isObject(value))
		return goog.object.isEmpty(value);

	return false;
};

/**
 * Returns true if value contains only integers or latin letters; false otherwise
 *
 * @param {?string|undefined} value
 * @return {boolean}
 */
ag.validation.alphaNumeric = function(value) {
	if (!goog.isDefAndNotNull(value))
		return false;

	return /^\w+$/.test(value);
};

/**
 * Returns true if input value is boolean integer or true/false
 *
 * @param {?string|number|boolean|undefined}
 * @return {boolean}
 */
ag.validation.bool = function(value) {
	if (!goog.isDefAndNotNull(value))
		return false;

	if (goog.isBoolean(value))
		return true;

	if (goog.isNumber(value))
		return value === 0 || value === 1;

	if (goog.isString(value))
		return value === '0' || value === '1';

	return false;
};

/**
 * Checks that a string contains something other than whitespace; false otherwise.
 *
 * @param {?string|undefined} value
 * @return {boolean}
 */
ag.validation.containsNonWhitespace = function(value) {
	if (!goog.isDefAndNotNull(value))
		return false;

	return /\S/.test(value);
};

/**
 * Returns true if value is a valid date. Those with full month, day, and year will validate leap years as well.
 *
 * @param {?string|undefined} value
 * @param {Array.<string>|string=} format Defaults to ymd
 * @return {boolean}
 */
ag.validation.date = function(value, format) {
	if (!goog.isDefAndNotNull(value))
		return false;

	var formats = format || ['ymd'];
	if (!goog.isArray(formats))
		formats = [ format ];
	for (var i=0; i<formats.length; i++) {
		switch (formats[i]) {
		case 'dmy':
			if (/^(?:(?:31(\/|-|\.|\x20)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.|\x20)(?:0?[1,3-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.|\x20)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.|\x20)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/.test(value))
				return true;
			break;
		case 'mdy':
			if (/^(?:(?:(?:0?[13578]|1[02])(\/|-|\.|\x20)31)\1|(?:(?:0?[13-9]|1[0-2])(\/|-|\.|\x20)(?:29|30)\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:0?2(\/|-|\.|\x20)29\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:(?:0?[1-9])|(?:1[0-2]))(\/|-|\.|\x20)(?:0?[1-9]|1\d|2[0-8])\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/.test(value))
				return true;
			break;
		case 'ymd':
			if (/^(?:(?:(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00)))(\/|-|\.|\x20)(?:0?2\1(?:29)))|(?:(?:(?:1[6-9]|[2-9]\d)?\d{2})(\/|-|\.|\x20)(?:(?:(?:0?[13578]|1[02])\2(?:31))|(?:(?:0?[1,3-9]|1[0-2])\2(29|30))|(?:(?:0?[1-9])|(?:1[0-2]))\2(?:0?[1-9]|1\d|2[0-8]))))$/.test(value))
				return true;
			break;
		case 'dMy':
			if (/^((31(?!\ (Feb(ruary)?|Apr(il)?|June?|(Sep(?=\b|t)t?|Nov)(ember)?)))|((30|29)(?!\ Feb(ruary)?))|(29(?=\ Feb(ruary)?\ (((1[6-9]|[2-9]\d)(0[48]|[2468][048]|[13579][26])|((16|[2468][048]|[3579][26])00)))))|(0?[1-9])|1\d|2[0-8])\ (Jan(uary)?|Feb(ruary)?|Ma(r(ch)?|y)|Apr(il)?|Ju((ly?)|(ne?))|Aug(ust)?|Oct(ober)?|(Sep(?=\b|t)t?|Nov|Dec)(ember)?)\ ((1[6-9]|[2-9]\d)\d{2})$/.test(value))
				return true;
			break;
		case 'Mdy':
			if (/^(?:(((Jan(uary)?|Ma(r(ch)?|y)|Jul(y)?|Aug(ust)?|Oct(ober)?|Dec(ember)?)\ 31)|((Jan(uary)?|Ma(r(ch)?|y)|Apr(il)?|Ju((ly?)|(ne?))|Aug(ust)?|Oct(ober)?|(Sep)(tember)?|(Nov|Dec)(ember)?)\ (0?[1-9]|([12]\d)|30))|(Feb(ruary)?\ (0?[1-9]|1\d|2[0-8]|(29(?=,?\ ((1[6-9]|[2-9]\d)(0[48]|[2468][048]|[13579][26])|((16|[2468][048]|[3579][26])00)))))))\,?\ ((1[6-9]|[2-9]\d)\d{2}))$/.test(value))
				return true;
			break;
		case 'My':
			if (/^(Jan(uary)?|Feb(ruary)?|Ma(r(ch)?|y)|Apr(il)?|Ju((ly?)|(ne?))|Aug(ust)?|Oct(ober)?|(Sep(?=\b|t)t?|Nov|Dec)(ember)?)[ \/]((1[6-9]|[2-9]\d)\d{2})$/.test(value))
				return true;
			break;
		case 'my':
			if (/^(((0[123456789]|10|11|12)([- \/.])(([1][9][0-9][0-9])|([2][0-9][0-9][0-9]))))$/.test(value))
				return true;
			break;

		default:
			goog.asserts.assert(false, 'ag.Validate.date(): unsuppored format');
			break;
		}
	}

	return false;
};

/**
 * Validates an email address.
 *
 * @param {?string|undefined} valuel
 * @return {boolean}
 */
ag.validation.email = function(value) {
	if (!goog.isDefAndNotNull(value))
		return false;

	var regex = new RegExp('^[a-z0-9!#$%&\\\'*+\\/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\\\'*+\\/=?^_`{|}~-]+)*@' + HOST_NAME_REGEX_PATTERN_ + '$', 'i');
	return regex.test(value);
};

/**
 * Returns true if value is an integer or false otherwise.
 *
 * @param {?string|number|undefined} value
 * @return boolean
 */
ag.validation.integer = function(value) {
	if (goog.isString(value))
		return /^-?\d+$/.test(value);

	return ag.validation.integerStrict(value);
};

/**
 * Returns true if value is an integer or false otherwise.
 *
 * @param {?number|null|undefined} value
 * @return boolean
 */
ag.validation.integerStrict = function(value) {
	// Reference: http://stackoverflow.com/questions/3885817/how-to-check-if-a-number-is-float-or-integer
	return goog.isNumber(value) &&
		value === +value &&
		value === (value|0);
};

/**
 * Returns true if value is a string and has a length between min and max inclusive; false otherwise.
 *
 * @param {?string|undefined} value
 * @param {number} min
 * @param {number} max
 * @return {boolean}
 */
ag.validation.lengthBetween = function(value, min, max) {
	goog.asserts.assert(min >= 0, 'ag.validation.lengthBetween(): min must be greater than or equal to 0');
	goog.asserts.assert(min <= max, 'ag.validation.lengthBetween(): min must be less than or equal to max');

	if (!goog.isDefAndNotNull(value))
		return false;

	return (value.length >= min && value.length <= max);
};

/**
 * Checks whether string is less than or equal to a maximum length.
 *
 * @param {?string|undefined} value
 * @param {number} max
 * @return {boolean}
 */
ag.validation.maxLength = function(value, max) {
	goog.asserts.assert(max >= 0, 'ag.validation.maxLength(): max must be greater than or equal to 0');

	if (!goog.isDefAndNotNull(value))
		return false;

	return value.length <= max;
};

/**
 * Checks whether string is greater than or equal to a minimum length.
 *
 * @param {?string|undefined} value
 * @param {number} min
 * @return {boolean}
 */
ag.validation.minLength = function(value, min) {
	goog.asserts.assert(min >= 0, 'ag.validation.minLength(): min must be greater than or equal to 0');

	if (!goog.isDefAndNotNull(value))
		return false;

	return value.length >= min;
};

/**
 * Compares two numbers with a user-supplied operator. Possible values for operator include:
 * >, <, >=, <=, ==, !=
 *
 * @param {number} value1
 * @param {string} operator
 * @param {number} value2
 * @return {boolean}
 */
ag.validation.numericCompare = function(value1, operator, value2) {
	goog.asserts.assert(goog.isDefAndNotNull(operator), 'ag.validation.numericCompare(): operator may not be null');

	switch(operator) {
	case '>':
		return value1 > value2;
	case '>=':
		return value1 >= value2;
	case '<':
		return value1 < value2;
	case '<=':
		return value1 <= value2;
	case '==':
		return value1 == value2;
	case '!=':
		return value1 != value2;

	default:
		goog.asserts.assert(false, 'ag.validation.numericCompare(): unsupported operator');
		break;
	}

	return false;
};

/**
 * @param {Object} objectToValidate
 * @param {Object} rules validation object description
 * @param {Object=} optRefForInvalidFields reference to object to store any validation errors
 * @returns {boolean}
 */
ag.validation.validateObject = function(objectToValidate, ruleSet, optRefForInvalidFields, optFields) {
	var propertyNames = optFields || goog.object.getKeys(ruleSet);
	var valid = true;	// Assume valid unless provide otherwise
	for (var i=0; i<propertyNames.length; i++) {
		var propertyName = propertyNames[i];
		if (!goog.object.containsKey(ruleSet, propertyName))
			continue;
		var testValue = (goog.object.containsKey(objectToValidate, propertyName)) ? objectToValidate[propertyName] : undefined;
		if (!ag.validation.validateValue(testValue, ruleSet[propertyName], propertyName, optRefForInvalidFields))
			valid = false;
	}
	return valid;
};

ag.validation.validateValue = function(value, rule, propertyName, optRefForInvalidFields) {
	if (!goog.isArray(rule)) {
		// Special handling for non-scalar properties
		var isScalar = !goog.isObject(value) || !goog.isDefAndNotNull(value);
		var propertyIsValid = isScalar && ag.validation.validateValueWithRule_(value, rule);
		if (propertyIsValid === false) {
			if (goog.isDef(optRefForInvalidFields)) {
				if (!isScalar)
					optRefForInvalidFields[propertyName] = 'None-scalar value';
				else if (goog.isDefAndNotNull(rule.message))
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

			var result = ag.validation.validateValue(value, rule[i], propertyName, optRefForInvalidFields);
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
ag.validation.validateValueWithRule_ = function(value, ruleObj) {
	goog.asserts.assert(goog.object.containsKey(ruleObj, 'rule'), 'Each rule must have a rule member');

	// Does it exist? Note: not dealing with null cases here.
	if (!goog.isDef(value))
		return goog.isDefAndNotNull(ruleObj.allowEmpty) && ruleObj.allowEmpty === true;

	// Value exists and may or may not be null
	var ruleType = (!goog.isArray(ruleObj.rule)) ? ruleObj.rule : ruleObj.rule[0];
	switch (ruleType) {
	case ag.validation.ruleType.ALPHA_NUMERIC:
		return ag.validation.alphaNumeric(value);
	case ag.validation.ruleType.BOOLEAN:
		return ag.validation.bool(value);
	case ag.validation.ruleType.CONTAINS_NON_WHITESPACE:
		return ag.validation.containsNonWhitespace(value);
	case ag.validation.ruleType.DATE:
		var format = (goog.isArray(ruleObj.rule)) ? ruleObj.rule[1] : null;
		return ag.validation.date(value, format);
	case ag.validation.ruleType.INTEGER:
		return ag.validation.integer(value);
	case ag.validation.ruleType.INTEGER_STRICT:
		return ag.validation.integerStrict(value);
	case ag.validation.ruleType.LENGTH_BETWEEN:
		goog.asserts.assert(goog.isArray(ruleObj.rule), "LENGTH_BETWEEN rule must be in array");
		return ag.validation.lengthBetween(value, ruleObj.rule[1], ruleObj.rule[2]);
	case ag.validation.ruleType.MAX_LENGTH:
		goog.asserts.assert(goog.isArray(ruleObj.rule), "MAX_LENGTH must be in array");
		return ag.validation.maxLength(value, ruleObj.rule[1]);
	case ag.validation.ruleType.MIN_LENGTH:
		goog.asserts.assert(goog.isArray(ruleObj.rule), "MIN_LENGTH must be in array");
		return ag.validation.minLength(value, ruleObj.rule[1]);
	case ag.validation.ruleType.NUMERIC_COMPARE:
		return ag.validation.numericCompare(value, ruleObj.rule[1], ruleObj.rule[2]);

	default:
		return false;
	}
};
