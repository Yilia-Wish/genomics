goog.provide('ag.meta.MetaObject');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.object');

// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Constructor and destructor
/**
 * @constructor
 */
ag.meta.MetaObject = function() {
	// --------------------------------------------------------------------------------------------------------------------
	// Private members
	/**
	 * @type {Object}
	 * @private
	 */
	this.connections_ = {};

	/**
	 * @type {string|null}
	 * @private
	 */
	this.signalName_ = null;

	/**
	 * @type {Object|null}
	 * @private
	 */
	this.sender_ = null;

	// OPTIMIZATION
	// this.paramArrays_ = [
	// 	new Array(1),
	// 	new Array(2),
	// 	new Array(3),
	// 	new Array(4)
	// ];
};
goog.addSingletonGetter(ag.meta.MetaObject);


// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Public methods
/**
 * Removes all signal / slot connections.
 */
ag.meta.MetaObject.prototype.clear = function() {
	goog.object.clear(this.connections_);
};

/**
 * Connects a source object method signature with a destination object method and parameters. If connect is
 * called with the same parameters, a duplicate connection will be made.
 *
 * @param {Object} sourceObj
 * @param {string} signalName
 * @param {Object} destObj
 * @param {Function|string} destMethodOrSignal
 */
ag.meta.MetaObject.prototype.connect = function(sourceObj, signalName, destObj, destMethodOrSignal) {
	goog.asserts.assert(goog.isObject(sourceObj), 'MetaObject.connect(): sourceObj must be object');
	goog.asserts.assert(goog.isString(signalName), 'MetaObject.connect(): signalName *' + signalName + '* is not a string');
	goog.asserts.assert(goog.isObject(destObj), 'MetaObject.connect(): destObj must be object');
	goog.asserts.assert(goog.isFunction(destMethodOrSignal) || goog.isString(destMethodOrSignal), 'MetaObject.connect(): destMethod is not a method or signal name (string), ' + destMethodOrSignal.toString());

	var objUid = goog.getUid(sourceObj);
	if (!goog.object.containsKey(this.connections_, objUid))
		this.connections_[objUid] = {};
	if (!goog.object.containsKey(this.connections_[objUid], signalName))
		this.connections_[objUid][signalName] = [];

	var connection = {destObj: destObj};
	if (goog.isFunction(destMethodOrSignal))
		connection.destMethod = destMethodOrSignal;
	else
		connection.destSignal = destMethodOrSignal;
	this.connections_[objUid][signalName].push(connection);

	return this;
};

/**
 * Disconnects a source object method signature with a destination object method and parameters.
 *
 * @param {Object} sourceObj
 * @param {string} signalName
 * @param {Object} destObj
 * @param {Function|string} destMethodOrSignal
 * @return {boolean}
 */
ag.meta.MetaObject.prototype.disconnect = function(sourceObj, signalName, destObj, destMethodOrSignal) {
	goog.asserts.assert(goog.isObject(sourceObj), 'MetaObject.disconnect(): sourceObj must be object');
	goog.asserts.assert(goog.isString(signalName), 'MetaObject.disconnect(): signalName *' + signalName + '* is not a string');
	goog.asserts.assert(goog.isObject(destObj), 'MetaObject.disconnect(): destObj must be object');
	goog.asserts.assert(goog.isFunction(destMethodOrSignal) || goog.isString(destMethodOrSignal), 'MetaObject.disconnect(): destMethod is not a method or signal name (string), ' + destMethodOrSignal.toString());

	var objUid = goog.getUid(sourceObj);
	if (!this.hasSlot_(objUid, signalName))
		return false;

	var attachedSlots = this.connections_[objUid][signalName];
	for (var i=0; i< attachedSlots.length; i++) {
		var attachedSlot = attachedSlots[i];
		var slotIsMethod = goog.isDefAndNotNull(attachedSlot.destMethod);
		var matchingSlot = attachedSlot.destObj === destObj &&
				   	       ((slotIsMethod && attachedSlot.destMethod === destMethodOrSignal) ||
				   	       	(!slotIsMethod && attachedSlot.destSignal === destMethodOrSignal));
		if (!matchingSlot)
			continue;

		goog.array.removeAt(attachedSlots, i);
		if (attachedSlots.length === 0)
			delete this.connections_[objUid][signalName];
		return true;
	}

	return false;
};

/**
 * Calls all attached handlers for this signal.
 *
 * @param {Object} sourceObj
 * @param {string} signalName
 * @param {...} otherParams
 */
ag.meta.MetaObject.prototype.emit = function(sourceObj, signalName, otherParams) {
	// NOTE! otherParams is for documentation purposes only and not explicitly reference in this
	// method definition.
	goog.asserts.assert(goog.isObject(sourceObj), 'MetaObject.emit(): sourceObj must be object');
	goog.asserts.assert(goog.isString(signalName), 'MetaObject.emit(): signalName is not a string');

	var objUid = goog.getUid(sourceObj);
	if (!this.hasSlot_(objUid, signalName))
		return;

	// ------------------------------------------------
	// Optimization: To avoid the memory cost associated with creating a new array everytime a
	//   signal is emitted with at least one argument, we copy the relevant arguments into a
	//   one of several predefined arrays.
	// var params;
	// var i = arguments.length;
	// if (i > 2) {
	// 	// We subtract 3 because:
	// 	// -2 to sidestep the required sourceObj and signalName arguments
	// 	// -1 to index the properly sized array
	// 	params = this.paramArrays_[i-2-1];
	// 	if (!params)
	// 		// This condition indicates that an array of arguments larger than one of the defaults
	// 		// is needed. Therefore, create it now
	// 		params = this.paramArrays_[i-2-1] = new Array(i-2);

	// 	// Copy the arguments into the params array.
	// 	while (i-- > 2)
	// 		params[i-2] = arguments[i];
	// }
	var params = (arguments.length > 2) ? goog.array.slice(arguments, 2) : null;

	// --------------------------------------------------
	// Call the various signals
	var attachedSlots = this.connections_[objUid][signalName];
	for (var i=0, z=attachedSlots.length; i< z; i++) {
		var attachedSlot = attachedSlots[i];
		var destObj = attachedSlot.destObj;
		var destMethod = attachedSlot.destMethod;
		if (destMethod) {
			this.sender_ = sourceObj;
			this.signalName_ = signalName;
			if (!params)
				destMethod.call(destObj);
			else
				destMethod.apply(destObj, params);
			this.sender_ = null;
			this.signalName_ = null;
		}
		else { // Assume signal
			goog.asserts.assert(attachedSlot.destSignal);
			if (!params) {
				this.emit(destObj, attachedSlot.destSignal);
			}
			else {
				params = [destObj, attachedSlot.destSignal].concat(params);
				ag.meta.MetaObject.prototype.emit.apply(this, params);
			}
		}
	}
};

/**
 * Returns the sender object for the current signal being emitted.
 *
 * @return {Object|null}
 */
ag.meta.MetaObject.prototype.sender = function() {
	return this.sender_;
};

/**
 * Returns the signal name for the current signal being emitted.
 *
 * @return {string|null}
 */
ag.meta.MetaObject.prototype.signalName = function() {
	return this.signalName_;
};

// --------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------
// Private methods
/**
 * @param {number} objUid
 * @param {string} signalName
 * @return {boolean}
 */
ag.meta.MetaObject.prototype.hasSlot_ = function(objUid, signalName) {
	return goog.object.containsKey(this.connections_, objUid) &&
		   goog.object.containsKey(this.connections_[objUid], signalName);
};