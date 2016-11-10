/**
 * @fileoverview AObject is the base object class for all core AgObjects. Supports hierarchically tree of AObjects and
 * disposing all children when one is removed.
 * @author ulrich.luke@gmail.com (Luke Ulrich)
 */
goog.provide('ag.core.AObject');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.Disposable');

goog.require('ag.meta.MetaObject');

// --------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @extends {goog.Disposable}
 * @param {ag.core.AObject=} optParent
 */
ag.core.AObject = function(optParent) {
	goog.base(this);

	/**
	 * @type {ag.core.AObject}
	 * @private
	 */
	this.parent_ = null;

	/**
	 * @type {Array.<ag.core.AObject>}
	 * @private
	 */
	this.children_ = [];

	/**
	 * @type {boolean}
	 * @private
	 */
	this.defunct_ = false;

	this.setParent(optParent);
};
goog.inherits(ag.core.AObject, goog.Disposable);


/**********************************************************************************************/ goog.scope(function() {
// Aliases
var array = goog.array;
var assert = goog.asserts.assert;
var AObject = ag.core.AObject;
var metaObject = ag.meta.MetaObject.getInstance;

// --------------------------------------------------------------------------------------------------------------------
// Destructor
/**
 * Free all memory held by child nodes and remove ourselves from any parent list of children. The defunct_ private
 * member serves as an optimization during destruction. If a parent is in the process of being destroyed, it is
 * unnecessary for the child nodes to remove themselves from the parent node. This state is captured using the defunct_
 * flag.
 *
 * @override
 */
AObject.prototype.disposeInternal = function() {
	goog.base(this, 'disposeInternal');

	if (this.parent_ && !this.parent_.defunct_)
		this.removeFromParent_();
	else
		this.parent_ = null;

	this.defunct_ = true;

	this.destroyChildren_();
};


// --------------------------------------------------------------------------------------------------------------------
// Static defines
AObject.ErrorStrings = {
	CANNOT_PARENT_SELF: 'Not allowed to parent oneself',
	CANNOT_PARENT_TO_DESCENDANT: 'Not allowed to make self a child of a descendant'
};


// --------------------------------------------------------------------------------------------------------------------
// Public methods
/** @return {Array.<AObject>} */
AObject.prototype.children = function() {
	return this.children_;
};

/**
 * Convenience method for connecting to signalName emitting by sourceObj to slotOrSignalName of this class.
 *
 * @param {Object} sourceObj
 * @param {string} signalName
 * @param {string|Function} slotOrSignalName
 */
AObject.prototype.connect = function(sourceObj, signalName, slotOrSignalName) {
	metaObject().connect(sourceObj, signalName, this, slotOrSignalName);
};

/**
 * Convenience method for disconnecting to signalName emitting by sourceObj to slotOrSignalName of this class.
 *
 * @param {Object} sourceObj
 * @param {string} signalName
 * @param {string|Function} slotOrSignalName
 */
AObject.prototype.disconnect = function(sourceObj, signalName, slotOrSignalName) {
	metaObject().disconnect(sourceObj, signalName, this, slotOrSignalName);
};

/**
 * Convenience method for emitting signals via the MetaObject singleton. Not the most performant option
 * because a second apply call must be utilized to achieve this functionality. A potential optimization would involve
 * writing several emit# methods that directly called the relevant MetaObject interface. For example:
 *
 * emit0 = function(...) {
 *    metaObject().emit(this, signalName);
 * };
 *
 * emit1 = function(...) {
 *    metaObject().emit(this, signalName, arguments[1]);
 * };
 *
 * Or alternatively, use a switch function.
 *
 * @param {string} signalName
 * @param {...} parameters
 */
AObject.prototype.emit = function(signalName, parameters) {
	// Incurs the overhead of another apply function call. Potential case to optimize in the future.
	var params = [this].concat(array.slice(arguments, 0));
	ag.meta.MetaObject.prototype.emit.apply(metaObject(), params);
};

/**
 * @param {AObject} aObject
 * @return {boolean}
 */
AObject.prototype.isDescendantOf = function(aObject) {
	if (!aObject || aObject === this)
		return false;

	var p = this.parent_;
	while (p) {
		if (p === aObject)
			return true;
		p = p.parent_;
	}

	return false;
};

/** @return {AObject} */
AObject.prototype.parent = function() {
	return this.parent_;
};

/**
 * @param {AObject=} newParent
 */
AObject.prototype.setParent = function(newParent) {
	if (newParent === this.parent_)
		return;

	if (newParent) {
		if (newParent === this)
			throw Error(AObject.ErrorStrings.CANNOT_PARENT_SELF);
		else if (newParent.isDescendantOf(this))
			throw Error(AObject.ErrorStrings.CANNOT_PARENT_TO_DESCENDANT);
	}

	this.removeFromParent_();
	this.parent_ = (newParent) ? newParent : null;
	if (this.parent_)
		this.parent_.children_.push(this);
};


// --------------------------------------------------------------------------------------------------------------------
// Private methods
AObject.prototype.destroyChildren_ = function() {
	for (var i=0, z=this.children_.length; i< z; i++)
		this.children_[i].dispose();
	array.clear(this.children_);
	this.children_ = null;
};

AObject.prototype.removeFromParent_ = function() {
	if (!this.parent_)
		return;

	array.remove(this.parent_.children_, this);
	this.parent_ = null;
};


/*******************************************************************************************************************/});