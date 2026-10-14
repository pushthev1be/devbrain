'use strict';

const require$$0 = require('stream');
const mongodb1 = require('./mongodb-1.js');
const mongodb4 = require('./mongodb-4.js');
const mongodb5 = require('./mongodb-5.js');
const mongodb7 = require('./mongodb-7.js');
const mongodb6 = require('./mongodb-6.js');
const require$$3 = require('url');
const require$$0$2 = require('dns');
const mongodbConnectionStringUrl1 = require('./mongodb-connection-string-url-1.js');
const require$$0$1 = require('process');
const mongodb2 = require('./mongodb-2.js');

var constants = {};

var hasRequiredConstants;

function requireConstants () {
	if (hasRequiredConstants) return constants;
	hasRequiredConstants = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.END = exports.CHANGE = exports.INIT = exports.MORE = exports.RESPONSE = exports.SERVER_HEARTBEAT_FAILED = exports.SERVER_HEARTBEAT_SUCCEEDED = exports.SERVER_HEARTBEAT_STARTED = exports.COMMAND_FAILED = exports.COMMAND_SUCCEEDED = exports.COMMAND_STARTED = exports.CLUSTER_TIME_RECEIVED = exports.CONNECTION_CHECKED_IN = exports.CONNECTION_CHECKED_OUT = exports.CONNECTION_CHECK_OUT_FAILED = exports.CONNECTION_CHECK_OUT_STARTED = exports.CONNECTION_CLOSED = exports.CONNECTION_READY = exports.CONNECTION_CREATED = exports.CONNECTION_POOL_READY = exports.CONNECTION_POOL_CLEARED = exports.CONNECTION_POOL_CLOSED = exports.CONNECTION_POOL_CREATED = exports.WAITING_FOR_SUITABLE_SERVER = exports.SERVER_SELECTION_SUCCEEDED = exports.SERVER_SELECTION_FAILED = exports.SERVER_SELECTION_STARTED = exports.TOPOLOGY_DESCRIPTION_CHANGED = exports.TOPOLOGY_CLOSED = exports.TOPOLOGY_OPENING = exports.SERVER_DESCRIPTION_CHANGED = exports.SERVER_CLOSED = exports.SERVER_OPENING = exports.DESCRIPTION_RECEIVED = exports.UNPINNED = exports.PINNED = exports.MESSAGE = exports.ENDED = exports.CLOSED = exports.CONNECT = exports.OPEN = exports.CLOSE = exports.TIMEOUT = exports.ERROR = exports.SYSTEM_JS_COLLECTION = exports.SYSTEM_COMMAND_COLLECTION = exports.SYSTEM_USER_COLLECTION = exports.SYSTEM_PROFILE_COLLECTION = exports.SYSTEM_INDEX_COLLECTION = exports.SYSTEM_NAMESPACE_COLLECTION = void 0;
		exports.kDecoratedKeys = exports.kDecorateResult = exports.LEGACY_HELLO_COMMAND_CAMEL_CASE = exports.LEGACY_HELLO_COMMAND = exports.MONGO_CLIENT_EVENTS = exports.LOCAL_SERVER_EVENTS = exports.SERVER_RELAY_EVENTS = exports.APM_EVENTS = exports.TOPOLOGY_EVENTS = exports.CMAP_EVENTS = exports.HEARTBEAT_EVENTS = exports.RESUME_TOKEN_CHANGED = void 0;
		exports.SYSTEM_NAMESPACE_COLLECTION = 'system.namespaces';
		exports.SYSTEM_INDEX_COLLECTION = 'system.indexes';
		exports.SYSTEM_PROFILE_COLLECTION = 'system.profile';
		exports.SYSTEM_USER_COLLECTION = 'system.users';
		exports.SYSTEM_COMMAND_COLLECTION = '$cmd';
		exports.SYSTEM_JS_COLLECTION = 'system.js';
		// events
		exports.ERROR = 'error';
		exports.TIMEOUT = 'timeout';
		exports.CLOSE = 'close';
		exports.OPEN = 'open';
		exports.CONNECT = 'connect';
		exports.CLOSED = 'closed';
		exports.ENDED = 'ended';
		exports.MESSAGE = 'message';
		exports.PINNED = 'pinned';
		exports.UNPINNED = 'unpinned';
		exports.DESCRIPTION_RECEIVED = 'descriptionReceived';
		/** @internal */
		exports.SERVER_OPENING = 'serverOpening';
		/** @internal */
		exports.SERVER_CLOSED = 'serverClosed';
		/** @internal */
		exports.SERVER_DESCRIPTION_CHANGED = 'serverDescriptionChanged';
		/** @internal */
		exports.TOPOLOGY_OPENING = 'topologyOpening';
		/** @internal */
		exports.TOPOLOGY_CLOSED = 'topologyClosed';
		/** @internal */
		exports.TOPOLOGY_DESCRIPTION_CHANGED = 'topologyDescriptionChanged';
		/** @internal */
		exports.SERVER_SELECTION_STARTED = 'serverSelectionStarted';
		/** @internal */
		exports.SERVER_SELECTION_FAILED = 'serverSelectionFailed';
		/** @internal */
		exports.SERVER_SELECTION_SUCCEEDED = 'serverSelectionSucceeded';
		/** @internal */
		exports.WAITING_FOR_SUITABLE_SERVER = 'waitingForSuitableServer';
		/** @internal */
		exports.CONNECTION_POOL_CREATED = 'connectionPoolCreated';
		/** @internal */
		exports.CONNECTION_POOL_CLOSED = 'connectionPoolClosed';
		/** @internal */
		exports.CONNECTION_POOL_CLEARED = 'connectionPoolCleared';
		/** @internal */
		exports.CONNECTION_POOL_READY = 'connectionPoolReady';
		/** @internal */
		exports.CONNECTION_CREATED = 'connectionCreated';
		/** @internal */
		exports.CONNECTION_READY = 'connectionReady';
		/** @internal */
		exports.CONNECTION_CLOSED = 'connectionClosed';
		/** @internal */
		exports.CONNECTION_CHECK_OUT_STARTED = 'connectionCheckOutStarted';
		/** @internal */
		exports.CONNECTION_CHECK_OUT_FAILED = 'connectionCheckOutFailed';
		/** @internal */
		exports.CONNECTION_CHECKED_OUT = 'connectionCheckedOut';
		/** @internal */
		exports.CONNECTION_CHECKED_IN = 'connectionCheckedIn';
		exports.CLUSTER_TIME_RECEIVED = 'clusterTimeReceived';
		/** @internal */
		exports.COMMAND_STARTED = 'commandStarted';
		/** @internal */
		exports.COMMAND_SUCCEEDED = 'commandSucceeded';
		/** @internal */
		exports.COMMAND_FAILED = 'commandFailed';
		/** @internal */
		exports.SERVER_HEARTBEAT_STARTED = 'serverHeartbeatStarted';
		/** @internal */
		exports.SERVER_HEARTBEAT_SUCCEEDED = 'serverHeartbeatSucceeded';
		/** @internal */
		exports.SERVER_HEARTBEAT_FAILED = 'serverHeartbeatFailed';
		exports.RESPONSE = 'response';
		exports.MORE = 'more';
		exports.INIT = 'init';
		exports.CHANGE = 'change';
		exports.END = 'end';
		exports.RESUME_TOKEN_CHANGED = 'resumeTokenChanged';
		/** @public */
		exports.HEARTBEAT_EVENTS = Object.freeze([
		    exports.SERVER_HEARTBEAT_STARTED,
		    exports.SERVER_HEARTBEAT_SUCCEEDED,
		    exports.SERVER_HEARTBEAT_FAILED
		]);
		/** @public */
		exports.CMAP_EVENTS = Object.freeze([
		    exports.CONNECTION_POOL_CREATED,
		    exports.CONNECTION_POOL_READY,
		    exports.CONNECTION_POOL_CLEARED,
		    exports.CONNECTION_POOL_CLOSED,
		    exports.CONNECTION_CREATED,
		    exports.CONNECTION_READY,
		    exports.CONNECTION_CLOSED,
		    exports.CONNECTION_CHECK_OUT_STARTED,
		    exports.CONNECTION_CHECK_OUT_FAILED,
		    exports.CONNECTION_CHECKED_OUT,
		    exports.CONNECTION_CHECKED_IN
		]);
		/** @public */
		exports.TOPOLOGY_EVENTS = Object.freeze([
		    exports.SERVER_OPENING,
		    exports.SERVER_CLOSED,
		    exports.SERVER_DESCRIPTION_CHANGED,
		    exports.TOPOLOGY_OPENING,
		    exports.TOPOLOGY_CLOSED,
		    exports.TOPOLOGY_DESCRIPTION_CHANGED,
		    exports.ERROR,
		    exports.TIMEOUT,
		    exports.CLOSE
		]);
		/** @public */
		exports.APM_EVENTS = Object.freeze([
		    exports.COMMAND_STARTED,
		    exports.COMMAND_SUCCEEDED,
		    exports.COMMAND_FAILED
		]);
		/**
		 * All events that we relay to the `Topology`
		 * @internal
		 */
		exports.SERVER_RELAY_EVENTS = Object.freeze([
		    exports.SERVER_HEARTBEAT_STARTED,
		    exports.SERVER_HEARTBEAT_SUCCEEDED,
		    exports.SERVER_HEARTBEAT_FAILED,
		    exports.COMMAND_STARTED,
		    exports.COMMAND_SUCCEEDED,
		    exports.COMMAND_FAILED,
		    ...exports.CMAP_EVENTS
		]);
		/**
		 * All events we listen to from `Server` instances, but do not forward to the client
		 * @internal
		 */
		exports.LOCAL_SERVER_EVENTS = Object.freeze([
		    exports.CONNECT,
		    exports.DESCRIPTION_RECEIVED,
		    exports.CLOSED,
		    exports.ENDED
		]);
		/** @public */
		exports.MONGO_CLIENT_EVENTS = Object.freeze([
		    ...exports.CMAP_EVENTS,
		    ...exports.APM_EVENTS,
		    ...exports.TOPOLOGY_EVENTS,
		    ...exports.HEARTBEAT_EVENTS
		]);
		/**
		 * @internal
		 * The legacy hello command that was deprecated in MongoDB 5.0.
		 */
		exports.LEGACY_HELLO_COMMAND = 'ismaster';
		/**
		 * @internal
		 * The legacy hello command that was deprecated in MongoDB 5.0.
		 */
		exports.LEGACY_HELLO_COMMAND_CAMEL_CASE = 'isMaster';
		// Typescript errors if we index objects with `Symbol.for(...)`, so
		// to avoid TS errors we pull them out into variables.  Then we can type
		// the objects (and class) that we expect to see them on and prevent TS
		// errors.
		/** @internal */
		exports.kDecorateResult = Symbol.for('@@mdb.decorateDecryptionResult');
		/** @internal */
		exports.kDecoratedKeys = Symbol.for('@@mdb.decryptedKeys');
		
	} (constants));
	return constants;
}

var responses = {};

var document = {};

var hasRequiredDocument;

function requireDocument () {
	if (hasRequiredDocument) return document;
	hasRequiredDocument = 1;
	Object.defineProperty(document, "__esModule", { value: true });
	document.OnDemandDocument = void 0;
	const bson_1 = mongodb1.requireBson();
	const BSONElementOffset = {
	    type: 0,
	    nameOffset: 1,
	    nameLength: 2,
	    offset: 3,
	    length: 4
	};
	/** @internal */
	class OnDemandDocument {
	    constructor(bson, offset = 0, isArray = false, 
	    /** If elements was already calculated */
	    elements) {
	        /**
	         * Maps JS strings to elements and jsValues for speeding up subsequent lookups.
	         * - If `false` then name does not exist in the BSON document
	         * - If `CachedBSONElement` instance name exists
	         * - If `cache[name].value == null` jsValue has not yet been parsed
	         *   - Null/Undefined values do not get cached because they are zero-length values.
	         */
	        this.cache = Object.create(null);
	        /** Caches the index of elements that have been named */
	        this.indexFound = Object.create(null);
	        this.bson = bson;
	        this.offset = offset;
	        this.isArray = isArray;
	        this.elements = elements ?? (0, bson_1.parseToElementsToArray)(this.bson, offset);
	    }
	    /** Only supports basic latin strings */
	    isElementName(name, element) {
	        const nameLength = element[BSONElementOffset.nameLength];
	        const nameOffset = element[BSONElementOffset.nameOffset];
	        if (name.length !== nameLength)
	            return false;
	        const nameEnd = nameOffset + nameLength;
	        for (let byteIndex = nameOffset, charIndex = 0; charIndex < name.length && byteIndex < nameEnd; charIndex++, byteIndex++) {
	            if (this.bson[byteIndex] !== name.charCodeAt(charIndex))
	                return false;
	        }
	        return true;
	    }
	    /**
	     * Seeks into the elements array for an element matching the given name.
	     *
	     * @remarks
	     * Caching:
	     * - Caches the existence of a property making subsequent look ups for non-existent properties return immediately
	     * - Caches names mapped to elements to avoid reiterating the array and comparing the name again
	     * - Caches the index at which an element has been found to prevent rechecking against elements already determined to belong to another name
	     *
	     * @param name - a basic latin string name of a BSON element
	     * @returns
	     */
	    getElement(name) {
	        const cachedElement = this.cache[name];
	        if (cachedElement === false)
	            return null;
	        if (cachedElement != null) {
	            return cachedElement;
	        }
	        if (typeof name === 'number') {
	            if (this.isArray) {
	                if (name < this.elements.length) {
	                    const element = this.elements[name];
	                    const cachedElement = { element, value: undefined };
	                    this.cache[name] = cachedElement;
	                    this.indexFound[name] = true;
	                    return cachedElement;
	                }
	                else {
	                    return null;
	                }
	            }
	            else {
	                return null;
	            }
	        }
	        for (let index = 0; index < this.elements.length; index++) {
	            const element = this.elements[index];
	            // skip this element if it has already been associated with a name
	            if (!(index in this.indexFound) && this.isElementName(name, element)) {
	                const cachedElement = { element, value: undefined };
	                this.cache[name] = cachedElement;
	                this.indexFound[index] = true;
	                return cachedElement;
	            }
	        }
	        this.cache[name] = false;
	        return null;
	    }
	    toJSValue(element, as) {
	        const type = element[BSONElementOffset.type];
	        const offset = element[BSONElementOffset.offset];
	        const length = element[BSONElementOffset.length];
	        if (as !== type) {
	            return null;
	        }
	        switch (as) {
	            case bson_1.BSONType.null:
	            case bson_1.BSONType.undefined:
	                return null;
	            case bson_1.BSONType.double:
	                return bson_1.NumberUtils.getFloat64LE(this.bson, offset);
	            case bson_1.BSONType.int:
	                return bson_1.NumberUtils.getInt32LE(this.bson, offset);
	            case bson_1.BSONType.long:
	                return bson_1.NumberUtils.getBigInt64LE(this.bson, offset);
	            case bson_1.BSONType.bool:
	                return Boolean(this.bson[offset]);
	            case bson_1.BSONType.objectId:
	                return new bson_1.ObjectId(this.bson.subarray(offset, offset + 12));
	            case bson_1.BSONType.timestamp:
	                return new bson_1.Timestamp(bson_1.NumberUtils.getBigInt64LE(this.bson, offset));
	            case bson_1.BSONType.string:
	                return bson_1.ByteUtils.toUTF8(this.bson, offset + 4, offset + length - 1, false);
	            case bson_1.BSONType.binData: {
	                const totalBinarySize = bson_1.NumberUtils.getInt32LE(this.bson, offset);
	                const subType = this.bson[offset + 4];
	                if (subType === 2) {
	                    const subType2BinarySize = bson_1.NumberUtils.getInt32LE(this.bson, offset + 1 + 4);
	                    if (subType2BinarySize < 0)
	                        throw new bson_1.BSONError('Negative binary type element size found for subtype 0x02');
	                    if (subType2BinarySize > totalBinarySize - 4)
	                        throw new bson_1.BSONError('Binary type with subtype 0x02 contains too long binary size');
	                    if (subType2BinarySize < totalBinarySize - 4)
	                        throw new bson_1.BSONError('Binary type with subtype 0x02 contains too short binary size');
	                    return new bson_1.Binary(this.bson.subarray(offset + 1 + 4 + 4, offset + 1 + 4 + 4 + subType2BinarySize), 2);
	                }
	                return new bson_1.Binary(this.bson.subarray(offset + 1 + 4, offset + 1 + 4 + totalBinarySize), subType);
	            }
	            case bson_1.BSONType.date:
	                // Pretend this is correct.
	                return new Date(Number(bson_1.NumberUtils.getBigInt64LE(this.bson, offset)));
	            case bson_1.BSONType.object:
	                return new OnDemandDocument(this.bson, offset);
	            case bson_1.BSONType.array:
	                return new OnDemandDocument(this.bson, offset, true);
	            default:
	                throw new bson_1.BSONError(`Unsupported BSON type: ${as}`);
	        }
	    }
	    /**
	     * Returns the number of elements in this BSON document
	     */
	    size() {
	        return this.elements.length;
	    }
	    /**
	     * Checks for the existence of an element by name.
	     *
	     * @remarks
	     * Uses `getElement` with the expectation that will populate caches such that a `has` call
	     * followed by a `getElement` call will not repeat the cost paid by the first look up.
	     *
	     * @param name - element name
	     */
	    has(name) {
	        const cachedElement = this.cache[name];
	        if (cachedElement === false)
	            return false;
	        if (cachedElement != null)
	            return true;
	        return this.getElement(name) != null;
	    }
	    get(name, as, required) {
	        const element = this.getElement(name);
	        if (element == null) {
	            if (required === true) {
	                throw new bson_1.BSONError(`BSON element "${name}" is missing`);
	            }
	            else {
	                return null;
	            }
	        }
	        if (element.value == null) {
	            const value = this.toJSValue(element.element, as);
	            if (value == null) {
	                if (required === true) {
	                    throw new bson_1.BSONError(`BSON element "${name}" is missing`);
	                }
	                else {
	                    return null;
	                }
	            }
	            // It is important to never store null
	            element.value = value;
	        }
	        return element.value;
	    }
	    getNumber(name, required) {
	        const maybeBool = this.get(name, bson_1.BSONType.bool);
	        const bool = maybeBool == null ? null : maybeBool ? 1 : 0;
	        const maybeLong = this.get(name, bson_1.BSONType.long);
	        const long = maybeLong == null ? null : Number(maybeLong);
	        const result = bool ?? long ?? this.get(name, bson_1.BSONType.int) ?? this.get(name, bson_1.BSONType.double);
	        if (required === true && result == null) {
	            throw new bson_1.BSONError(`BSON element "${name}" is missing`);
	        }
	        return result;
	    }
	    /**
	     * Deserialize this object, DOES NOT cache result so avoid multiple invocations
	     * @param options - BSON deserialization options
	     */
	    toObject(options) {
	        return (0, bson_1.deserialize)(this.bson, {
	            ...options,
	            index: this.offset,
	            allowObjectSmallerThanBufferSize: true
	        });
	    }
	    /** Returns this document's bytes only */
	    toBytes() {
	        const size = bson_1.NumberUtils.getInt32LE(this.bson, this.offset);
	        return this.bson.subarray(this.offset, this.offset + size);
	    }
	}
	document.OnDemandDocument = OnDemandDocument;
	
	return document;
}

var hasRequiredResponses;

function requireResponses () {
	if (hasRequiredResponses) return responses;
	hasRequiredResponses = 1;
	Object.defineProperty(responses, "__esModule", { value: true });
	responses.ClientBulkWriteCursorResponse = responses.ExplainedCursorResponse = responses.CursorResponse = responses.MongoDBResponse = void 0;
	responses.isErrorResponse = isErrorResponse;
	const bson_1 = mongodb1.requireBson();
	const error_1 = mongodb4.requireError();
	const utils_1 = mongodb7.requireUtils();
	const document_1 = requireDocument();
	const BSONElementOffset = {
	    nameOffset: 1,
	    nameLength: 2,
	    offset: 3,
	    length: 4
	};
	/**
	 * Accepts a BSON payload and checks for na "ok: 0" element.
	 * This utility is intended to prevent calling response class constructors
	 * that expect the result to be a success and demand certain properties to exist.
	 *
	 * For example, a cursor response always expects a cursor embedded document.
	 * In order to write the class such that the properties reflect that assertion (non-null)
	 * we cannot invoke the subclass constructor if the BSON represents an error.
	 *
	 * @param bytes - BSON document returned from the server
	 */
	function isErrorResponse(bson, elements) {
	    for (let eIdx = 0; eIdx < elements.length; eIdx++) {
	        const element = elements[eIdx];
	        if (element[BSONElementOffset.nameLength] === 2) {
	            const nameOffset = element[BSONElementOffset.nameOffset];
	            // 111 == "o", 107 == "k"
	            if (bson[nameOffset] === 111 && bson[nameOffset + 1] === 107) {
	                const valueOffset = element[BSONElementOffset.offset];
	                const valueLength = element[BSONElementOffset.length];
	                // If any byte in the length of the ok number (works for any type) is non zero,
	                // then it is considered "ok: 1"
	                for (let i = valueOffset; i < valueOffset + valueLength; i++) {
	                    if (bson[i] !== 0x00)
	                        return false;
	                }
	                return true;
	            }
	        }
	    }
	    return true;
	}
	/** @internal */
	class MongoDBResponse extends document_1.OnDemandDocument {
	    get(name, as, required) {
	        try {
	            return super.get(name, as, required);
	        }
	        catch (cause) {
	            throw new error_1.MongoUnexpectedServerResponseError(cause.message, { cause });
	        }
	    }
	    static is(value) {
	        return value instanceof MongoDBResponse;
	    }
	    static make(bson) {
	        const elements = (0, bson_1.parseToElementsToArray)(bson, 0);
	        const isError = isErrorResponse(bson, elements);
	        return isError
	            ? new MongoDBResponse(bson, 0, false, elements)
	            : new this(bson, 0, false, elements);
	    }
	    // {ok:1}
	    static { this.empty = new MongoDBResponse(new Uint8Array([13, 0, 0, 0, 16, 111, 107, 0, 1, 0, 0, 0, 0])); }
	    /**
	     * Returns true iff:
	     * - ok is 0 and the top-level code === 50
	     * - ok is 1 and the writeErrors array contains a code === 50
	     * - ok is 1 and the writeConcern object contains a code === 50
	     */
	    get isMaxTimeExpiredError() {
	        // {ok: 0, code: 50 ... }
	        const isTopLevel = this.ok === 0 && this.code === error_1.MONGODB_ERROR_CODES.MaxTimeMSExpired;
	        if (isTopLevel)
	            return true;
	        if (this.ok === 0)
	            return false;
	        // {ok: 1, writeConcernError: {code: 50 ... }}
	        const isWriteConcern = this.get('writeConcernError', bson_1.BSONType.object)?.getNumber('code') ===
	            error_1.MONGODB_ERROR_CODES.MaxTimeMSExpired;
	        if (isWriteConcern)
	            return true;
	        const writeErrors = this.get('writeErrors', bson_1.BSONType.array);
	        if (writeErrors?.size()) {
	            for (let i = 0; i < writeErrors.size(); i++) {
	                const isWriteError = writeErrors.get(i, bson_1.BSONType.object)?.getNumber('code') ===
	                    error_1.MONGODB_ERROR_CODES.MaxTimeMSExpired;
	                // {ok: 1, writeErrors: [{code: 50 ... }]}
	                if (isWriteError)
	                    return true;
	            }
	        }
	        return false;
	    }
	    /**
	     * Drivers can safely assume that the `recoveryToken` field is always a BSON document but drivers MUST NOT modify the
	     * contents of the document.
	     */
	    get recoveryToken() {
	        return (this.get('recoveryToken', bson_1.BSONType.object)?.toObject({
	            promoteValues: false,
	            promoteLongs: false,
	            promoteBuffers: false,
	            validation: { utf8: true }
	        }) ?? null);
	    }
	    /**
	     * The server creates a cursor in response to a snapshot find/aggregate command and reports atClusterTime within the cursor field in the response.
	     * For the distinct command the server adds a top-level atClusterTime field to the response.
	     * The atClusterTime field represents the timestamp of the read and is guaranteed to be majority committed.
	     */
	    get atClusterTime() {
	        return (this.get('cursor', bson_1.BSONType.object)?.get('atClusterTime', bson_1.BSONType.timestamp) ??
	            this.get('atClusterTime', bson_1.BSONType.timestamp));
	    }
	    get operationTime() {
	        return this.get('operationTime', bson_1.BSONType.timestamp);
	    }
	    /** Normalizes whatever BSON value is "ok" to a JS number 1 or 0. */
	    get ok() {
	        return this.getNumber('ok') ? 1 : 0;
	    }
	    get $err() {
	        return this.get('$err', bson_1.BSONType.string);
	    }
	    get errmsg() {
	        return this.get('errmsg', bson_1.BSONType.string);
	    }
	    get code() {
	        return this.getNumber('code');
	    }
	    get $clusterTime() {
	        if (!('clusterTime' in this)) {
	            const clusterTimeDoc = this.get('$clusterTime', bson_1.BSONType.object);
	            if (clusterTimeDoc == null) {
	                this.clusterTime = null;
	                return null;
	            }
	            const clusterTime = clusterTimeDoc.get('clusterTime', bson_1.BSONType.timestamp, true);
	            const signature = clusterTimeDoc.get('signature', bson_1.BSONType.object)?.toObject();
	            // @ts-expect-error: `signature` is incorrectly typed. It is public API.
	            this.clusterTime = { clusterTime, signature };
	        }
	        return this.clusterTime ?? null;
	    }
	    toObject(options) {
	        const exactBSONOptions = {
	            ...(0, bson_1.pluckBSONSerializeOptions)(options ?? {}),
	            validation: (0, bson_1.parseUtf8ValidationOption)(options)
	        };
	        return super.toObject(exactBSONOptions);
	    }
	}
	responses.MongoDBResponse = MongoDBResponse;
	/** @internal */
	class CursorResponse extends MongoDBResponse {
	    constructor() {
	        super(...arguments);
	        this._batch = null;
	        this.iterated = 0;
	        this._encryptedBatch = null;
	    }
	    /**
	     * This supports a feature of the FindCursor.
	     * It is an optimization to avoid an extra getMore when the limit has been reached
	     */
	    static get emptyGetMore() {
	        return new CursorResponse((0, bson_1.serialize)({ ok: 1, cursor: { id: 0n, nextBatch: [] } }));
	    }
	    static is(value) {
	        return value instanceof CursorResponse || value === CursorResponse.emptyGetMore;
	    }
	    get cursor() {
	        return this.get('cursor', bson_1.BSONType.object, true);
	    }
	    get id() {
	        try {
	            return bson_1.Long.fromBigInt(this.cursor.get('id', bson_1.BSONType.long, true));
	        }
	        catch (cause) {
	            throw new error_1.MongoUnexpectedServerResponseError(cause.message, { cause });
	        }
	    }
	    get ns() {
	        const namespace = this.cursor.get('ns', bson_1.BSONType.string);
	        if (namespace != null)
	            return (0, utils_1.ns)(namespace);
	        return null;
	    }
	    get length() {
	        return Math.max(this.batchSize - this.iterated, 0);
	    }
	    get encryptedBatch() {
	        if (this.encryptedResponse == null)
	            return null;
	        if (this._encryptedBatch != null)
	            return this._encryptedBatch;
	        const cursor = this.encryptedResponse?.get('cursor', bson_1.BSONType.object);
	        if (cursor?.has('firstBatch'))
	            this._encryptedBatch = cursor.get('firstBatch', bson_1.BSONType.array, true);
	        else if (cursor?.has('nextBatch'))
	            this._encryptedBatch = cursor.get('nextBatch', bson_1.BSONType.array, true);
	        else
	            throw new error_1.MongoUnexpectedServerResponseError('Cursor document did not contain a batch');
	        return this._encryptedBatch;
	    }
	    get batch() {
	        if (this._batch != null)
	            return this._batch;
	        const cursor = this.cursor;
	        if (cursor.has('firstBatch'))
	            this._batch = cursor.get('firstBatch', bson_1.BSONType.array, true);
	        else if (cursor.has('nextBatch'))
	            this._batch = cursor.get('nextBatch', bson_1.BSONType.array, true);
	        else
	            throw new error_1.MongoUnexpectedServerResponseError('Cursor document did not contain a batch');
	        return this._batch;
	    }
	    get batchSize() {
	        return this.batch?.size();
	    }
	    get postBatchResumeToken() {
	        return (this.cursor.get('postBatchResumeToken', bson_1.BSONType.object)?.toObject({
	            promoteValues: false,
	            promoteLongs: false,
	            promoteBuffers: false,
	            validation: { utf8: true }
	        }) ?? null);
	    }
	    shift(options) {
	        if (this.iterated >= this.batchSize) {
	            return null;
	        }
	        const result = this.batch.get(this.iterated, bson_1.BSONType.object, true) ?? null;
	        const encryptedResult = this.encryptedBatch?.get(this.iterated, bson_1.BSONType.object, true) ?? null;
	        this.iterated += 1;
	        if (options?.raw) {
	            return result.toBytes();
	        }
	        else {
	            const object = result.toObject(options);
	            if (encryptedResult) {
	                (0, utils_1.decorateDecryptionResult)(object, encryptedResult.toObject(options), true);
	            }
	            return object;
	        }
	    }
	    clear() {
	        this.iterated = this.batchSize;
	    }
	}
	responses.CursorResponse = CursorResponse;
	/**
	 * Explain responses have nothing to do with cursor responses
	 * This class serves to temporarily avoid refactoring how cursors handle
	 * explain responses which is to detect that the response is not cursor-like and return the explain
	 * result as the "first and only" document in the "batch" and end the "cursor"
	 */
	class ExplainedCursorResponse extends CursorResponse {
	    constructor() {
	        super(...arguments);
	        this.isExplain = true;
	        this._length = 1;
	    }
	    get id() {
	        return bson_1.Long.fromBigInt(0n);
	    }
	    get batchSize() {
	        return 0;
	    }
	    get ns() {
	        return null;
	    }
	    get length() {
	        return this._length;
	    }
	    shift(options) {
	        if (this._length === 0)
	            return null;
	        this._length -= 1;
	        return this.toObject(options);
	    }
	}
	responses.ExplainedCursorResponse = ExplainedCursorResponse;
	/**
	 * Client bulk writes have some extra metadata at the top level that needs to be
	 * included in the result returned to the user.
	 */
	class ClientBulkWriteCursorResponse extends CursorResponse {
	    get insertedCount() {
	        return this.get('nInserted', bson_1.BSONType.int, true);
	    }
	    get upsertedCount() {
	        return this.get('nUpserted', bson_1.BSONType.int, true);
	    }
	    get matchedCount() {
	        return this.get('nMatched', bson_1.BSONType.int, true);
	    }
	    get modifiedCount() {
	        return this.get('nModified', bson_1.BSONType.int, true);
	    }
	    get deletedCount() {
	        return this.get('nDeleted', bson_1.BSONType.int, true);
	    }
	    get writeConcernError() {
	        return this.get('writeConcernError', bson_1.BSONType.object, false);
	    }
	}
	responses.ClientBulkWriteCursorResponse = ClientBulkWriteCursorResponse;
	
	return responses;
}

var collection = {};

var aggregation_cursor = {};

var abstract_cursor = {};

var hasRequiredAbstract_cursor;

function requireAbstract_cursor () {
	if (hasRequiredAbstract_cursor) return abstract_cursor;
	hasRequiredAbstract_cursor = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.CursorTimeoutContext = exports.AbstractCursor = exports.CursorTimeoutMode = exports.CURSOR_FLAGS = void 0;
		const stream_1 = require$$0;
		const bson_1 = mongodb1.requireBson();
		const error_1 = mongodb4.requireError();
		const mongo_types_1 = mongodb5.requireMongo_types();
		const execute_operation_1 = mongodb5.requireExecute_operation();
		const get_more_1 = mongodb5.requireGet_more();
		const kill_cursors_1 = mongodb5.requireKill_cursors();
		const read_concern_1 = mongodb5.requireRead_concern();
		const read_preference_1 = mongodb5.requireRead_preference();
		const sessions_1 = mongodb6.requireSessions();
		const timeout_1 = mongodb6.requireTimeout();
		const utils_1 = mongodb7.requireUtils();
		/** @public */
		exports.CURSOR_FLAGS = [
		    'tailable',
		    'oplogReplay',
		    'noCursorTimeout',
		    'awaitData',
		    'exhaust',
		    'partial'
		];
		function removeActiveCursor() {
		    this.client.s.activeCursors.delete(this);
		}
		/**
		 * @public
		 * @experimental
		 * Specifies how `timeoutMS` is applied to the cursor. Can be either `'cursorLifeTime'` or `'iteration'`
		 * When set to `'iteration'`, the deadline specified by `timeoutMS` applies to each call of
		 * `cursor.next()`.
		 * When set to `'cursorLifetime'`, the deadline applies to the life of the entire cursor.
		 *
		 * Depending on the type of cursor being used, this option has different default values.
		 * For non-tailable cursors, this value defaults to `'cursorLifetime'`
		 * For tailable cursors, this value defaults to `'iteration'` since tailable cursors, by
		 * definition can have an arbitrarily long lifetime.
		 *
		 * @example
		 * ```ts
		 * const cursor = collection.find({}, {timeoutMS: 100, timeoutMode: 'iteration'});
		 * for await (const doc of cursor) {
		 *  // process doc
		 *  // This will throw a timeout error if any of the iterator's `next()` calls takes more than 100ms, but
		 *  // will continue to iterate successfully otherwise, regardless of the number of batches.
		 * }
		 * ```
		 *
		 * @example
		 * ```ts
		 * const cursor = collection.find({}, { timeoutMS: 1000, timeoutMode: 'cursorLifetime' });
		 * const docs = await cursor.toArray(); // This entire line will throw a timeout error if all batches are not fetched and returned within 1000ms.
		 * ```
		 */
		exports.CursorTimeoutMode = Object.freeze({
		    ITERATION: 'iteration',
		    LIFETIME: 'cursorLifetime'
		});
		/** @public */
		class AbstractCursor extends mongo_types_1.TypedEventEmitter {
		    /** @event */
		    static { this.CLOSE = 'close'; }
		    /** @internal */
		    constructor(client, namespace, options = {}) {
		        super();
		        /** @internal */
		        this.documents = null;
		        /** @internal */
		        this.hasEmittedClose = false;
		        this.on('error', utils_1.noop);
		        if (!client.s.isMongoClient) {
		            throw new error_1.MongoRuntimeError('Cursor must be constructed with MongoClient');
		        }
		        this.cursorClient = client;
		        this.cursorNamespace = namespace;
		        this.cursorId = null;
		        this.initialized = false;
		        this.isClosed = false;
		        this.isKilled = false;
		        this.cursorOptions = {
		            readPreference: options.readPreference && options.readPreference instanceof read_preference_1.ReadPreference
		                ? options.readPreference
		                : read_preference_1.ReadPreference.primary,
		            ...(0, bson_1.pluckBSONSerializeOptions)(options),
		            timeoutMS: options?.timeoutContext?.csotEnabled()
		                ? options.timeoutContext.timeoutMS
		                : options.timeoutMS,
		            tailable: options.tailable,
		            awaitData: options.awaitData
		        };
		        if (this.cursorOptions.timeoutMS != null) {
		            if (options.timeoutMode == null) {
		                if (options.tailable) {
		                    if (options.awaitData) {
		                        if (options.maxAwaitTimeMS != null &&
		                            options.maxAwaitTimeMS >= this.cursorOptions.timeoutMS)
		                            throw new error_1.MongoInvalidArgumentError('Cannot specify maxAwaitTimeMS >= timeoutMS for a tailable awaitData cursor');
		                    }
		                    this.cursorOptions.timeoutMode = exports.CursorTimeoutMode.ITERATION;
		                }
		                else {
		                    this.cursorOptions.timeoutMode = exports.CursorTimeoutMode.LIFETIME;
		                }
		            }
		            else {
		                if (options.tailable && options.timeoutMode === exports.CursorTimeoutMode.LIFETIME) {
		                    throw new error_1.MongoInvalidArgumentError("Cannot set tailable cursor's timeoutMode to LIFETIME");
		                }
		                this.cursorOptions.timeoutMode = options.timeoutMode;
		            }
		        }
		        else {
		            if (options.timeoutMode != null)
		                throw new error_1.MongoInvalidArgumentError('Cannot set timeoutMode without setting timeoutMS');
		        }
		        // Set for initial command
		        this.cursorOptions.omitMaxTimeMS =
		            this.cursorOptions.timeoutMS != null &&
		                ((this.cursorOptions.timeoutMode === exports.CursorTimeoutMode.ITERATION &&
		                    !this.cursorOptions.tailable) ||
		                    (this.cursorOptions.tailable && !this.cursorOptions.awaitData));
		        const readConcern = read_concern_1.ReadConcern.fromOptions(options);
		        if (readConcern) {
		            this.cursorOptions.readConcern = readConcern;
		        }
		        if (typeof options.batchSize === 'number') {
		            this.cursorOptions.batchSize = options.batchSize;
		        }
		        // we check for undefined specifically here to allow falsy values
		        // eslint-disable-next-line no-restricted-syntax
		        if (options.comment !== undefined) {
		            this.cursorOptions.comment = options.comment;
		        }
		        if (typeof options.maxTimeMS === 'number') {
		            this.cursorOptions.maxTimeMS = options.maxTimeMS;
		        }
		        if (typeof options.maxAwaitTimeMS === 'number') {
		            this.cursorOptions.maxAwaitTimeMS = options.maxAwaitTimeMS;
		        }
		        this.cursorSession = options.session ?? null;
		        this.deserializationOptions = {
		            ...this.cursorOptions,
		            validation: {
		                utf8: options?.enableUtf8Validation === false ? false : true
		            }
		        };
		        this.timeoutContext = options.timeoutContext;
		        this.signal = options.signal;
		        this.abortListener = (0, utils_1.addAbortListener)(this.signal, () => void this.close().then(undefined, utils_1.squashError));
		        this.trackCursor();
		    }
		    /**
		     * The cursor has no id until it receives a response from the initial cursor creating command.
		     *
		     * It is non-zero for as long as the database has an open cursor.
		     *
		     * The initiating command may receive a zero id if the entire result is in the `firstBatch`.
		     */
		    get id() {
		        return this.cursorId ?? undefined;
		    }
		    /** @internal */
		    get isDead() {
		        return (this.cursorId?.isZero() ?? false) || this.isClosed || this.isKilled;
		    }
		    /** @internal */
		    get client() {
		        return this.cursorClient;
		    }
		    /** @internal */
		    get server() {
		        return this.selectedServer;
		    }
		    get namespace() {
		        return this.cursorNamespace;
		    }
		    get readPreference() {
		        return this.cursorOptions.readPreference;
		    }
		    get readConcern() {
		        return this.cursorOptions.readConcern;
		    }
		    /** @internal */
		    get session() {
		        return this.cursorSession;
		    }
		    set session(clientSession) {
		        this.cursorSession = clientSession;
		    }
		    /**
		     * The cursor is closed and all remaining locally buffered documents have been iterated.
		     */
		    get closed() {
		        return this.isClosed && (this.documents?.length ?? 0) === 0;
		    }
		    /**
		     * A `killCursors` command was attempted on this cursor.
		     * This is performed if the cursor id is non zero.
		     */
		    get killed() {
		        return this.isKilled;
		    }
		    get loadBalanced() {
		        return !!this.cursorClient.topology?.loadBalanced;
		    }
		    /**
		     * @experimental
		     * An alias for {@link AbstractCursor.close|AbstractCursor.close()}.
		     */
		    async [Symbol.asyncDispose]() {
		        await this.close();
		    }
		    /** Adds cursor to client's tracking so it will be closed by MongoClient.close() */
		    trackCursor() {
		        this.cursorClient.s.activeCursors.add(this);
		        if (!this.listeners('close').includes(removeActiveCursor)) {
		            this.once('close', removeActiveCursor);
		        }
		    }
		    /** Returns current buffered documents length */
		    bufferedCount() {
		        return this.documents?.length ?? 0;
		    }
		    /** Returns current buffered documents */
		    readBufferedDocuments(number) {
		        const bufferedDocs = [];
		        const documentsToRead = Math.min(number ?? this.documents?.length ?? 0, this.documents?.length ?? 0);
		        for (let count = 0; count < documentsToRead; count++) {
		            const document = this.documents?.shift(this.deserializationOptions);
		            if (document != null) {
		                bufferedDocs.push(document);
		            }
		        }
		        return bufferedDocs;
		    }
		    async *[Symbol.asyncIterator]() {
		        this.signal?.throwIfAborted();
		        if (this.closed) {
		            return;
		        }
		        try {
		            while (true) {
		                if (this.isKilled) {
		                    return;
		                }
		                if (this.closed) {
		                    return;
		                }
		                if (this.cursorId != null && this.isDead && (this.documents?.length ?? 0) === 0) {
		                    return;
		                }
		                const document = await this.next();
		                // eslint-disable-next-line no-restricted-syntax
		                if (document === null) {
		                    return;
		                }
		                yield document;
		                this.signal?.throwIfAborted();
		            }
		        }
		        finally {
		            // Only close the cursor if it has not already been closed. This finally clause handles
		            // the case when a user would break out of a for await of loop early.
		            if (!this.isClosed) {
		                try {
		                    await this.close();
		                }
		                catch (error) {
		                    (0, utils_1.squashError)(error);
		                }
		            }
		        }
		    }
		    stream() {
		        const readable = new ReadableCursorStream(this);
		        const abortListener = (0, utils_1.addAbortListener)(this.signal, function () {
		            readable.destroy(this.reason);
		        });
		        readable.once('end', () => {
		            abortListener?.[utils_1.kDispose]();
		        });
		        return readable;
		    }
		    async hasNext() {
		        this.signal?.throwIfAborted();
		        if (this.cursorId === bson_1.Long.ZERO) {
		            return false;
		        }
		        if (this.cursorOptions.timeoutMode === exports.CursorTimeoutMode.ITERATION && this.cursorId != null) {
		            this.timeoutContext?.refresh();
		        }
		        try {
		            do {
		                if ((this.documents?.length ?? 0) !== 0) {
		                    return true;
		                }
		                await this.fetchBatch();
		            } while (!this.isDead || (this.documents?.length ?? 0) !== 0);
		        }
		        finally {
		            if (this.cursorOptions.timeoutMode === exports.CursorTimeoutMode.ITERATION) {
		                this.timeoutContext?.clear();
		            }
		        }
		        return false;
		    }
		    /** Get the next available document from the cursor, returns null if no more documents are available. */
		    async next() {
		        this.signal?.throwIfAborted();
		        if (this.cursorId === bson_1.Long.ZERO) {
		            throw new error_1.MongoCursorExhaustedError();
		        }
		        if (this.cursorOptions.timeoutMode === exports.CursorTimeoutMode.ITERATION && this.cursorId != null) {
		            this.timeoutContext?.refresh();
		        }
		        try {
		            do {
		                const doc = this.documents?.shift(this.deserializationOptions);
		                if (doc != null) {
		                    if (this.transform != null)
		                        return await this.transformDocument(doc);
		                    return doc;
		                }
		                await this.fetchBatch();
		            } while (!this.isDead || (this.documents?.length ?? 0) !== 0);
		        }
		        finally {
		            if (this.cursorOptions.timeoutMode === exports.CursorTimeoutMode.ITERATION) {
		                this.timeoutContext?.clear();
		            }
		        }
		        return null;
		    }
		    /**
		     * Try to get the next available document from the cursor or `null` if an empty batch is returned
		     */
		    async tryNext() {
		        this.signal?.throwIfAborted();
		        if (this.cursorId === bson_1.Long.ZERO) {
		            throw new error_1.MongoCursorExhaustedError();
		        }
		        if (this.cursorOptions.timeoutMode === exports.CursorTimeoutMode.ITERATION && this.cursorId != null) {
		            this.timeoutContext?.refresh();
		        }
		        try {
		            let doc = this.documents?.shift(this.deserializationOptions);
		            if (doc != null) {
		                if (this.transform != null)
		                    return await this.transformDocument(doc);
		                return doc;
		            }
		            await this.fetchBatch();
		            doc = this.documents?.shift(this.deserializationOptions);
		            if (doc != null) {
		                if (this.transform != null)
		                    return await this.transformDocument(doc);
		                return doc;
		            }
		        }
		        finally {
		            if (this.cursorOptions.timeoutMode === exports.CursorTimeoutMode.ITERATION) {
		                this.timeoutContext?.clear();
		            }
		        }
		        return null;
		    }
		    /**
		     * Iterates over all the documents for this cursor using the iterator, callback pattern.
		     *
		     * If the iterator returns `false`, iteration will stop.
		     *
		     * @param iterator - The iteration callback.
		     * @deprecated - Will be removed in a future release. Use for await...of instead.
		     */
		    async forEach(iterator) {
		        this.signal?.throwIfAborted();
		        if (typeof iterator !== 'function') {
		            throw new error_1.MongoInvalidArgumentError('Argument "iterator" must be a function');
		        }
		        for await (const document of this) {
		            const result = iterator(document);
		            if (result === false) {
		                break;
		            }
		        }
		    }
		    /**
		     * Frees any client-side resources used by the cursor.
		     */
		    async close(options) {
		        await this.cleanup(options?.timeoutMS);
		    }
		    /**
		     * Returns an array of documents. The caller is responsible for making sure that there
		     * is enough memory to store the results. Note that the array only contains partial
		     * results when this cursor had been previously accessed. In that case,
		     * cursor.rewind() can be used to reset the cursor.
		     */
		    async toArray() {
		        this.signal?.throwIfAborted();
		        const array = [];
		        // at the end of the loop (since readBufferedDocuments is called) the buffer will be empty
		        // then, the 'await of' syntax will run a getMore call
		        for await (const document of this) {
		            array.push(document);
		            const docs = this.readBufferedDocuments();
		            if (this.transform != null) {
		                for (const doc of docs) {
		                    array.push(await this.transformDocument(doc));
		                }
		            }
		            else {
		                // Note: previous versions of this logic used `array.push(...)`, which adds each item
		                // to the callstack.  For large arrays, this can exceed the maximum call size.
		                for (const doc of docs) {
		                    array.push(doc);
		                }
		            }
		        }
		        return array;
		    }
		    /**
		     * Add a cursor flag to the cursor
		     *
		     * @param flag - The flag to set, must be one of following ['tailable', 'oplogReplay', 'noCursorTimeout', 'awaitData', 'partial' -.
		     * @param value - The flag boolean value.
		     */
		    addCursorFlag(flag, value) {
		        this.throwIfInitialized();
		        if (!exports.CURSOR_FLAGS.includes(flag)) {
		            throw new error_1.MongoInvalidArgumentError(`Flag ${flag} is not one of ${exports.CURSOR_FLAGS}`);
		        }
		        if (typeof value !== 'boolean') {
		            throw new error_1.MongoInvalidArgumentError(`Flag ${flag} must be a boolean value`);
		        }
		        this.cursorOptions[flag] = value;
		        return this;
		    }
		    /**
		     * Map all documents using the provided function
		     * If there is a transform set on the cursor, that will be called first and the result passed to
		     * this function's transform.
		     *
		     * @remarks
		     *
		     * **Note** Cursors use `null` internally to indicate that there are no more documents in the cursor. Providing a mapping
		     * function that maps values to `null` will result in the cursor closing itself before it has finished iterating
		     * all documents.  This will **not** result in a memory leak, just surprising behavior.  For example:
		     *
		     * ```typescript
		     * const cursor = collection.find({});
		     * cursor.map(() => null);
		     *
		     * const documents = await cursor.toArray();
		     * // documents is always [], regardless of how many documents are in the collection.
		     * ```
		     *
		     * Other falsey values are allowed:
		     *
		     * ```typescript
		     * const cursor = collection.find({});
		     * cursor.map(() => '');
		     *
		     * const documents = await cursor.toArray();
		     * // documents is now an array of empty strings
		     * ```
		     *
		     * **Note for Typescript Users:** adding a transform changes the return type of the iteration of this cursor,
		     * it **does not** return a new instance of a cursor. This means when calling map,
		     * you should always assign the result to a new variable in order to get a correctly typed cursor variable.
		     * Take note of the following example:
		     *
		     * @example
		     * ```typescript
		     * const cursor: FindCursor<Document> = coll.find();
		     * const mappedCursor: FindCursor<number> = cursor.map(doc => Object.keys(doc).length);
		     * const keyCounts: number[] = await mappedCursor.toArray(); // cursor.toArray() still returns Document[]
		     * ```
		     * @param transform - The mapping transformation method.
		     */
		    map(transform) {
		        this.throwIfInitialized();
		        const oldTransform = this.transform;
		        if (oldTransform) {
		            this.transform = doc => {
		                return transform(oldTransform(doc));
		            };
		        }
		        else {
		            this.transform = transform;
		        }
		        return this;
		    }
		    /**
		     * Set the ReadPreference for the cursor.
		     *
		     * @param readPreference - The new read preference for the cursor.
		     */
		    withReadPreference(readPreference) {
		        this.throwIfInitialized();
		        if (readPreference instanceof read_preference_1.ReadPreference) {
		            this.cursorOptions.readPreference = readPreference;
		        }
		        else if (typeof readPreference === 'string') {
		            this.cursorOptions.readPreference = read_preference_1.ReadPreference.fromString(readPreference);
		        }
		        else {
		            throw new error_1.MongoInvalidArgumentError(`Invalid read preference: ${readPreference}`);
		        }
		        return this;
		    }
		    /**
		     * Set the ReadPreference for the cursor.
		     *
		     * @param readPreference - The new read preference for the cursor.
		     */
		    withReadConcern(readConcern) {
		        this.throwIfInitialized();
		        const resolvedReadConcern = read_concern_1.ReadConcern.fromOptions({ readConcern });
		        if (resolvedReadConcern) {
		            this.cursorOptions.readConcern = resolvedReadConcern;
		        }
		        return this;
		    }
		    /**
		     * Set a maxTimeMS on the cursor query, allowing for hard timeout limits on queries (Only supported on MongoDB 2.6 or higher)
		     *
		     * @param value - Number of milliseconds to wait before aborting the query.
		     */
		    maxTimeMS(value) {
		        this.throwIfInitialized();
		        if (typeof value !== 'number') {
		            throw new error_1.MongoInvalidArgumentError('Argument for maxTimeMS must be a number');
		        }
		        this.cursorOptions.maxTimeMS = value;
		        return this;
		    }
		    /**
		     * Set the batch size for the cursor.
		     *
		     * @param value - The number of documents to return per batch. See {@link https://www.mongodb.com/docs/manual/reference/command/find/|find command documentation}.
		     */
		    batchSize(value) {
		        this.throwIfInitialized();
		        if (this.cursorOptions.tailable) {
		            throw new error_1.MongoTailableCursorError('Tailable cursor does not support batchSize');
		        }
		        if (typeof value !== 'number') {
		            throw new error_1.MongoInvalidArgumentError('Operation "batchSize" requires an integer');
		        }
		        this.cursorOptions.batchSize = value;
		        return this;
		    }
		    /**
		     * Rewind this cursor to its uninitialized state. Any options that are present on the cursor will
		     * remain in effect. Iterating this cursor will cause new queries to be sent to the server, even
		     * if the resultant data has already been retrieved by this cursor.
		     */
		    rewind() {
		        if (this.timeoutContext && this.timeoutContext.owner !== this) {
		            throw new error_1.MongoAPIError(`Cannot rewind cursor that does not own its timeout context.`);
		        }
		        if (!this.initialized) {
		            return;
		        }
		        this.cursorId = null;
		        this.documents?.clear();
		        this.timeoutContext?.clear();
		        this.timeoutContext = undefined;
		        this.isClosed = false;
		        this.isKilled = false;
		        this.initialized = false;
		        this.hasEmittedClose = false;
		        this.trackCursor();
		        // We only want to end this session if we created it, and it hasn't ended yet
		        if (this.cursorSession?.explicit === false) {
		            if (!this.cursorSession.hasEnded) {
		                this.cursorSession.endSession().then(undefined, utils_1.squashError);
		            }
		            this.cursorSession = null;
		        }
		    }
		    /** @internal */
		    async getMore() {
		        if (this.cursorId == null) {
		            throw new error_1.MongoRuntimeError('Unexpected null cursor id. A cursor creating command should have set this');
		        }
		        if (this.selectedServer == null) {
		            throw new error_1.MongoRuntimeError('Unexpected null selectedServer. A cursor creating command should have set this');
		        }
		        if (this.cursorSession == null) {
		            throw new error_1.MongoRuntimeError('Unexpected null session. A cursor creating command should have set this');
		        }
		        const getMoreOptions = {
		            ...this.cursorOptions,
		            session: this.cursorSession,
		            batchSize: this.cursorOptions.batchSize
		        };
		        const getMoreOperation = new get_more_1.GetMoreOperation(this.cursorNamespace, this.cursorId, this.selectedServer, getMoreOptions);
		        return await (0, execute_operation_1.executeOperation)(this.cursorClient, getMoreOperation, this.timeoutContext);
		    }
		    /**
		     * @internal
		     *
		     * This function is exposed for the unified test runner's createChangeStream
		     * operation.  We cannot refactor to use the abstract _initialize method without
		     * a significant refactor.
		     */
		    async cursorInit() {
		        if (this.cursorOptions.timeoutMS != null) {
		            this.timeoutContext ??= new CursorTimeoutContext(timeout_1.TimeoutContext.create({
		                serverSelectionTimeoutMS: this.client.s.options.serverSelectionTimeoutMS,
		                timeoutMS: this.cursorOptions.timeoutMS
		            }), this);
		        }
		        try {
		            this.cursorSession ??= this.cursorClient.startSession({ owner: this, explicit: false });
		            const state = await this._initialize(this.cursorSession);
		            // Set omitMaxTimeMS to the value needed for subsequent getMore calls
		            this.cursorOptions.omitMaxTimeMS = this.cursorOptions.timeoutMS != null;
		            const response = state.response;
		            this.selectedServer = state.server;
		            this.cursorId = response.id;
		            this.cursorNamespace = response.ns ?? this.namespace;
		            this.documents = response;
		            this.initialized = true; // the cursor is now initialized, even if it is dead
		        }
		        catch (error) {
		            // the cursor is now initialized, even if an error occurred
		            this.initialized = true;
		            await this.cleanup(undefined, error);
		            throw error;
		        }
		        if (this.isDead) {
		            await this.cleanup();
		        }
		        return;
		    }
		    /** @internal Attempt to obtain more documents */
		    async fetchBatch() {
		        if (this.isClosed) {
		            return;
		        }
		        if (this.isDead) {
		            // if the cursor is dead, we clean it up
		            // cleanupCursor should never throw, but if it does it indicates a bug in the driver
		            // and we should surface the error
		            await this.cleanup();
		            return;
		        }
		        if (this.cursorId == null) {
		            await this.cursorInit();
		            // If the cursor died or returned documents, return
		            if ((this.documents?.length ?? 0) !== 0 || this.isDead)
		                return;
		        }
		        // Otherwise, run a getMore
		        try {
		            const response = await this.getMore();
		            this.cursorId = response.id;
		            this.documents = response;
		        }
		        catch (error) {
		            try {
		                await this.cleanup(undefined, error);
		            }
		            catch (cleanupError) {
		                // `cleanupCursor` should never throw, squash and throw the original error
		                (0, utils_1.squashError)(cleanupError);
		            }
		            throw error;
		        }
		        if (this.isDead) {
		            // If we successfully received a response from a cursor BUT the cursor indicates that it is exhausted,
		            // we intentionally clean up the cursor to release its session back into the pool before the cursor
		            // is iterated.  This prevents a cursor that is exhausted on the server from holding
		            // onto a session indefinitely until the AbstractCursor is iterated.
		            //
		            // cleanupCursorAsync should never throw, but if it does it indicates a bug in the driver
		            // and we should surface the error
		            await this.cleanup();
		        }
		    }
		    /** @internal */
		    async cleanup(timeoutMS, error) {
		        this.abortListener?.[utils_1.kDispose]();
		        this.isClosed = true;
		        const timeoutContextForKillCursors = () => {
		            if (timeoutMS != null) {
		                this.timeoutContext?.clear();
		                return new CursorTimeoutContext(timeout_1.TimeoutContext.create({
		                    serverSelectionTimeoutMS: this.client.s.options.serverSelectionTimeoutMS,
		                    timeoutMS
		                }), this);
		            }
		            else {
		                return this.timeoutContext?.refreshed();
		            }
		        };
		        const withEmitClose = async (fn) => {
		            try {
		                await fn();
		            }
		            finally {
		                this.emitClose();
		            }
		        };
		        const close = async () => {
		            // if no session has been defined on the cursor, the cursor was never initialized
		            // or the cursor was re-wound and never re-iterated.  In either case, we
		            //   1. do not need to end the session (there is no session after all)
		            //   2. do not need to kill the cursor server-side
		            const session = this.cursorSession;
		            if (!session)
		                return;
		            try {
		                if (!this.isKilled &&
		                    this.cursorId &&
		                    !this.cursorId.isZero() &&
		                    this.cursorNamespace &&
		                    this.selectedServer &&
		                    !session.hasEnded) {
		                    this.isKilled = true;
		                    const cursorId = this.cursorId;
		                    this.cursorId = bson_1.Long.ZERO;
		                    await (0, execute_operation_1.executeOperation)(this.cursorClient, new kill_cursors_1.KillCursorsOperation(cursorId, this.cursorNamespace, this.selectedServer, {
		                        session
		                    }), timeoutContextForKillCursors());
		                }
		            }
		            catch (error) {
		                (0, utils_1.squashError)(error);
		            }
		            finally {
		                if (session.owner === this) {
		                    await session.endSession({ error });
		                }
		                if (!session.inTransaction()) {
		                    (0, sessions_1.maybeClearPinnedConnection)(session, { error });
		                }
		            }
		        };
		        await withEmitClose(close);
		    }
		    /** @internal */
		    emitClose() {
		        try {
		            if (!this.hasEmittedClose && ((this.documents?.length ?? 0) === 0 || this.isClosed)) {
		                // @ts-expect-error: CursorEvents is generic so Parameters<CursorEvents["close"]> may not be assignable to `[]`. Not sure how to require extenders do not add parameters.
		                this.emit('close');
		            }
		        }
		        finally {
		            this.hasEmittedClose = true;
		        }
		    }
		    /** @internal */
		    async transformDocument(document) {
		        if (this.transform == null)
		            return document;
		        try {
		            const transformedDocument = this.transform(document);
		            // eslint-disable-next-line no-restricted-syntax
		            if (transformedDocument === null) {
		                const TRANSFORM_TO_NULL_ERROR = 'Cursor returned a `null` document, but the cursor is not exhausted.  Mapping documents to `null` is not supported in the cursor transform.';
		                throw new error_1.MongoAPIError(TRANSFORM_TO_NULL_ERROR);
		            }
		            return transformedDocument;
		        }
		        catch (transformError) {
		            try {
		                await this.close();
		            }
		            catch (closeError) {
		                (0, utils_1.squashError)(closeError);
		            }
		            throw transformError;
		        }
		    }
		    /** @internal */
		    throwIfInitialized() {
		        if (this.initialized)
		            throw new error_1.MongoCursorInUseError();
		    }
		}
		exports.AbstractCursor = AbstractCursor;
		class ReadableCursorStream extends stream_1.Readable {
		    constructor(cursor) {
		        super({
		            objectMode: true,
		            autoDestroy: false,
		            highWaterMark: 1
		        });
		        this._readInProgress = false;
		        this._cursor = cursor;
		    }
		    // eslint-disable-next-line @typescript-eslint/no-unused-vars
		    _read(size) {
		        if (!this._readInProgress) {
		            this._readInProgress = true;
		            this._readNext();
		        }
		    }
		    _destroy(error, callback) {
		        this._cursor.close().then(() => callback(error), closeError => callback(closeError));
		    }
		    _readNext() {
		        if (this._cursor.id === bson_1.Long.ZERO) {
		            this.push(null);
		            return;
		        }
		        this._cursor
		            .next()
		            .then(
		        // result from next()
		        result => {
		            if (result == null) {
		                this.push(null);
		            }
		            else if (this.destroyed) {
		                this._cursor.close().then(undefined, utils_1.squashError);
		            }
		            else {
		                if (this.push(result)) {
		                    return this._readNext();
		                }
		                this._readInProgress = false;
		            }
		        }, 
		        // error from next()
		        err => {
		            // NOTE: This is questionable, but we have a test backing the behavior. It seems the
		            //       desired behavior is that a stream ends cleanly when a user explicitly closes
		            //       a client during iteration. Alternatively, we could do the "right" thing and
		            //       propagate the error message by removing this special case.
		            if (err.message.match(/server is closed/)) {
		                this._cursor.close().then(undefined, utils_1.squashError);
		                return this.push(null);
		            }
		            // NOTE: This is also perhaps questionable. The rationale here is that these errors tend
		            //       to be "operation was interrupted", where a cursor has been closed but there is an
		            //       active getMore in-flight. This used to check if the cursor was killed but once
		            //       that changed to happen in cleanup legitimate errors would not destroy the
		            //       stream. There are change streams test specifically test these cases.
		            if (err.message.match(/operation was interrupted/)) {
		                return this.push(null);
		            }
		            // NOTE: The two above checks on the message of the error will cause a null to be pushed
		            //       to the stream, thus closing the stream before the destroy call happens. This means
		            //       that either of those error messages on a change stream will not get a proper
		            //       'error' event to be emitted (the error passed to destroy). Change stream resumability
		            //       relies on that error event to be emitted to create its new cursor and thus was not
		            //       working on 4.4 servers because the error emitted on failover was "interrupted at
		            //       shutdown" while on 5.0+ it is "The server is in quiesce mode and will shut down".
		            //       See NODE-4475.
		            return this.destroy(err);
		        })
		            // if either of the above handlers throw
		            .catch(error => {
		            this._readInProgress = false;
		            this.destroy(error);
		        });
		    }
		}
		/**
		 * @internal
		 * The cursor timeout context is a wrapper around a timeout context
		 * that keeps track of the "owner" of the cursor.  For timeout contexts
		 * instantiated inside a cursor, the owner will be the cursor.
		 *
		 * All timeout behavior is exactly the same as the wrapped timeout context's.
		 */
		class CursorTimeoutContext extends timeout_1.TimeoutContext {
		    constructor(timeoutContext, owner) {
		        super();
		        this.timeoutContext = timeoutContext;
		        this.owner = owner;
		    }
		    get serverSelectionTimeout() {
		        return this.timeoutContext.serverSelectionTimeout;
		    }
		    get connectionCheckoutTimeout() {
		        return this.timeoutContext.connectionCheckoutTimeout;
		    }
		    get clearServerSelectionTimeout() {
		        return this.timeoutContext.clearServerSelectionTimeout;
		    }
		    get timeoutForSocketWrite() {
		        return this.timeoutContext.timeoutForSocketWrite;
		    }
		    get timeoutForSocketRead() {
		        return this.timeoutContext.timeoutForSocketRead;
		    }
		    csotEnabled() {
		        return this.timeoutContext.csotEnabled();
		    }
		    refresh() {
		        if (typeof this.owner !== 'symbol')
		            return this.timeoutContext.refresh();
		    }
		    clear() {
		        if (typeof this.owner !== 'symbol')
		            return this.timeoutContext.clear();
		    }
		    get maxTimeMS() {
		        return this.timeoutContext.maxTimeMS;
		    }
		    get timeoutMS() {
		        return this.timeoutContext.csotEnabled() ? this.timeoutContext.timeoutMS : null;
		    }
		    refreshed() {
		        return new CursorTimeoutContext(this.timeoutContext.refreshed(), this.owner);
		    }
		    addMaxTimeMSToCommand(command, options) {
		        this.timeoutContext.addMaxTimeMSToCommand(command, options);
		    }
		    getSocketTimeoutMS() {
		        return this.timeoutContext.getSocketTimeoutMS();
		    }
		}
		exports.CursorTimeoutContext = CursorTimeoutContext;
		
	} (abstract_cursor));
	return abstract_cursor;
}

var explainable_cursor = {};

var hasRequiredExplainable_cursor;

function requireExplainable_cursor () {
	if (hasRequiredExplainable_cursor) return explainable_cursor;
	hasRequiredExplainable_cursor = 1;
	Object.defineProperty(explainable_cursor, "__esModule", { value: true });
	explainable_cursor.ExplainableCursor = void 0;
	const abstract_cursor_1 = requireAbstract_cursor();
	/**
	 * @public
	 *
	 * A base class for any cursors that have `explain()` methods.
	 */
	class ExplainableCursor extends abstract_cursor_1.AbstractCursor {
	    resolveExplainTimeoutOptions(verbosity, options) {
	        let explain;
	        let timeout;
	        if (verbosity == null && options == null) {
	            explain = undefined;
	            timeout = undefined;
	        }
	        else if (verbosity != null && options == null) {
	            explain =
	                typeof verbosity !== 'object'
	                    ? verbosity
	                    : 'verbosity' in verbosity
	                        ? verbosity
	                        : undefined;
	            timeout = typeof verbosity === 'object' && 'timeoutMS' in verbosity ? verbosity : undefined;
	        }
	        else {
	            // @ts-expect-error TS isn't smart enough to determine that if both options are provided, the first is explain options
	            explain = verbosity;
	            timeout = options;
	        }
	        return { timeout, explain };
	    }
	}
	explainable_cursor.ExplainableCursor = ExplainableCursor;
	
	return explainable_cursor;
}

var hasRequiredAggregation_cursor;

function requireAggregation_cursor () {
	if (hasRequiredAggregation_cursor) return aggregation_cursor;
	hasRequiredAggregation_cursor = 1;
	Object.defineProperty(aggregation_cursor, "__esModule", { value: true });
	aggregation_cursor.AggregationCursor = void 0;
	const error_1 = mongodb4.requireError();
	const explain_1 = mongodb4.requireExplain();
	const aggregate_1 = mongodb5.requireAggregate();
	const execute_operation_1 = mongodb5.requireExecute_operation();
	const utils_1 = mongodb7.requireUtils();
	const abstract_cursor_1 = requireAbstract_cursor();
	const explainable_cursor_1 = requireExplainable_cursor();
	/**
	 * The **AggregationCursor** class is an internal class that embodies an aggregation cursor on MongoDB
	 * allowing for iteration over the results returned from the underlying query. It supports
	 * one by one document iteration, conversion to an array or can be iterated as a Node 4.X
	 * or higher stream
	 * @public
	 */
	class AggregationCursor extends explainable_cursor_1.ExplainableCursor {
	    /** @internal */
	    constructor(client, namespace, pipeline = [], options = {}) {
	        super(client, namespace, options);
	        this.pipeline = pipeline;
	        this.aggregateOptions = options;
	        const lastStage = this.pipeline[this.pipeline.length - 1];
	        if (this.cursorOptions.timeoutMS != null &&
	            this.cursorOptions.timeoutMode === abstract_cursor_1.CursorTimeoutMode.ITERATION &&
	            (lastStage?.$merge != null || lastStage?.$out != null))
	            throw new error_1.MongoAPIError('Cannot use $out or $merge stage with ITERATION timeoutMode');
	    }
	    clone() {
	        const clonedOptions = (0, utils_1.mergeOptions)({}, this.aggregateOptions);
	        delete clonedOptions.session;
	        return new AggregationCursor(this.client, this.namespace, this.pipeline, {
	            ...clonedOptions
	        });
	    }
	    map(transform) {
	        return super.map(transform);
	    }
	    /** @internal */
	    async _initialize(session) {
	        const options = {
	            ...this.aggregateOptions,
	            ...this.cursorOptions,
	            session,
	            signal: this.signal
	        };
	        if (options.explain) {
	            try {
	                (0, explain_1.validateExplainTimeoutOptions)(options, explain_1.Explain.fromOptions(options));
	            }
	            catch {
	                throw new error_1.MongoAPIError('timeoutMS cannot be used with explain when explain is specified in aggregateOptions');
	            }
	        }
	        const aggregateOperation = new aggregate_1.AggregateOperation(this.namespace, this.pipeline, options);
	        const response = await (0, execute_operation_1.executeOperation)(this.client, aggregateOperation, this.timeoutContext);
	        return { server: aggregateOperation.server, session, response };
	    }
	    async explain(verbosity, options) {
	        const { explain, timeout } = this.resolveExplainTimeoutOptions(verbosity, options);
	        return (await (0, execute_operation_1.executeOperation)(this.client, new aggregate_1.AggregateOperation(this.namespace, this.pipeline, {
	            ...this.aggregateOptions, // NOTE: order matters here, we may need to refine this
	            ...this.cursorOptions,
	            ...timeout,
	            explain: explain ?? true
	        }))).shift(this.deserializationOptions);
	    }
	    addStage(stage) {
	        this.throwIfInitialized();
	        if (this.cursorOptions.timeoutMS != null &&
	            this.cursorOptions.timeoutMode === abstract_cursor_1.CursorTimeoutMode.ITERATION &&
	            (stage.$out != null || stage.$merge != null)) {
	            throw new error_1.MongoAPIError('Cannot use $out or $merge stage with ITERATION timeoutMode');
	        }
	        this.pipeline.push(stage);
	        return this;
	    }
	    group($group) {
	        return this.addStage({ $group });
	    }
	    /** Add a limit stage to the aggregation pipeline */
	    limit($limit) {
	        return this.addStage({ $limit });
	    }
	    /** Add a match stage to the aggregation pipeline */
	    match($match) {
	        return this.addStage({ $match });
	    }
	    /** Add an out stage to the aggregation pipeline */
	    out($out) {
	        return this.addStage({ $out });
	    }
	    /**
	     * Add a project stage to the aggregation pipeline
	     *
	     * @remarks
	     * In order to strictly type this function you must provide an interface
	     * that represents the effect of your projection on the result documents.
	     *
	     * By default chaining a projection to your cursor changes the returned type to the generic {@link Document} type.
	     * You should specify a parameterized type to have assertions on your final results.
	     *
	     * @example
	     * ```typescript
	     * // Best way
	     * const docs: AggregationCursor<{ a: number }> = cursor.project<{ a: number }>({ _id: 0, a: true });
	     * // Flexible way
	     * const docs: AggregationCursor<Document> = cursor.project({ _id: 0, a: true });
	     * ```
	     *
	     * @remarks
	     * In order to strictly type this function you must provide an interface
	     * that represents the effect of your projection on the result documents.
	     *
	     * **Note for Typescript Users:** adding a transform changes the return type of the iteration of this cursor,
	     * it **does not** return a new instance of a cursor. This means when calling project,
	     * you should always assign the result to a new variable in order to get a correctly typed cursor variable.
	     * Take note of the following example:
	     *
	     * @example
	     * ```typescript
	     * const cursor: AggregationCursor<{ a: number; b: string }> = coll.aggregate([]);
	     * const projectCursor = cursor.project<{ a: number }>({ _id: 0, a: true });
	     * const aPropOnlyArray: {a: number}[] = await projectCursor.toArray();
	     *
	     * // or always use chaining and save the final cursor
	     *
	     * const cursor = coll.aggregate().project<{ a: string }>({
	     *   _id: 0,
	     *   a: { $convert: { input: '$a', to: 'string' }
	     * }});
	     * ```
	     */
	    project($project) {
	        return this.addStage({ $project });
	    }
	    /** Add a lookup stage to the aggregation pipeline */
	    lookup($lookup) {
	        return this.addStage({ $lookup });
	    }
	    /** Add a redact stage to the aggregation pipeline */
	    redact($redact) {
	        return this.addStage({ $redact });
	    }
	    /** Add a skip stage to the aggregation pipeline */
	    skip($skip) {
	        return this.addStage({ $skip });
	    }
	    /** Add a sort stage to the aggregation pipeline */
	    sort($sort) {
	        return this.addStage({ $sort });
	    }
	    /** Add a unwind stage to the aggregation pipeline */
	    unwind($unwind) {
	        return this.addStage({ $unwind });
	    }
	    /** Add a geoNear stage to the aggregation pipeline */
	    geoNear($geoNear) {
	        return this.addStage({ $geoNear });
	    }
	}
	aggregation_cursor.AggregationCursor = AggregationCursor;
	
	return aggregation_cursor;
}

var find_cursor = {};

var hasRequiredFind_cursor;

function requireFind_cursor () {
	if (hasRequiredFind_cursor) return find_cursor;
	hasRequiredFind_cursor = 1;
	Object.defineProperty(find_cursor, "__esModule", { value: true });
	find_cursor.FindCursor = find_cursor.FLAGS = void 0;
	const responses_1 = requireResponses();
	const error_1 = mongodb4.requireError();
	const explain_1 = mongodb4.requireExplain();
	const count_1 = mongodb5.requireCount();
	const execute_operation_1 = mongodb5.requireExecute_operation();
	const find_1 = mongodb5.requireFind();
	const sort_1 = mongodb6.requireSort();
	const utils_1 = mongodb7.requireUtils();
	const explainable_cursor_1 = requireExplainable_cursor();
	/** @public Flags allowed for cursor */
	find_cursor.FLAGS = [
	    'tailable',
	    'oplogReplay',
	    'noCursorTimeout',
	    'awaitData',
	    'exhaust',
	    'partial'
	];
	/** @public */
	class FindCursor extends explainable_cursor_1.ExplainableCursor {
	    /** @internal */
	    constructor(client, namespace, filter = {}, options = {}) {
	        super(client, namespace, options);
	        /** @internal */
	        this.numReturned = 0;
	        this.cursorFilter = filter;
	        this.findOptions = options;
	        if (options.sort != null) {
	            this.findOptions.sort = (0, sort_1.formatSort)(options.sort);
	        }
	    }
	    clone() {
	        const clonedOptions = (0, utils_1.mergeOptions)({}, this.findOptions);
	        delete clonedOptions.session;
	        return new FindCursor(this.client, this.namespace, this.cursorFilter, {
	            ...clonedOptions
	        });
	    }
	    map(transform) {
	        return super.map(transform);
	    }
	    /** @internal */
	    async _initialize(session) {
	        const options = {
	            ...this.findOptions, // NOTE: order matters here, we may need to refine this
	            ...this.cursorOptions,
	            session,
	            signal: this.signal
	        };
	        if (options.explain) {
	            try {
	                (0, explain_1.validateExplainTimeoutOptions)(options, explain_1.Explain.fromOptions(options));
	            }
	            catch {
	                throw new error_1.MongoAPIError('timeoutMS cannot be used with explain when explain is specified in findOptions');
	            }
	        }
	        const findOperation = new find_1.FindOperation(this.namespace, this.cursorFilter, options);
	        const response = await (0, execute_operation_1.executeOperation)(this.client, findOperation, this.timeoutContext);
	        // the response is not a cursor when `explain` is enabled
	        this.numReturned = response.batchSize;
	        return { server: findOperation.server, session, response };
	    }
	    /** @internal */
	    async getMore() {
	        const numReturned = this.numReturned;
	        const limit = this.findOptions.limit ?? Infinity;
	        const remaining = limit - numReturned;
	        if (numReturned === limit && !this.id?.isZero()) {
	            // this is an optimization for the special case of a limit for a find command to avoid an
	            // extra getMore when the limit has been reached and the limit is a multiple of the batchSize.
	            // This is a consequence of the new query engine in 5.0 having no knowledge of the limit as it
	            // produces results for the find command.  Once a batch is filled up, it is returned and only
	            // on the subsequent getMore will the query framework consider the limit, determine the cursor
	            // is exhausted and return a cursorId of zero.
	            // instead, if we determine there are no more documents to request from the server, we preemptively
	            // close the cursor
	            try {
	                await this.close();
	            }
	            catch (error) {
	                (0, utils_1.squashError)(error);
	            }
	            return responses_1.CursorResponse.emptyGetMore;
	        }
	        // TODO(DRIVERS-1448): Remove logic to enforce `limit` in the driver
	        let cleanup = utils_1.noop;
	        const { batchSize } = this.cursorOptions;
	        if (batchSize != null && batchSize > remaining) {
	            this.cursorOptions.batchSize = remaining;
	            // After executing the final getMore, re-assign the batchSize back to its original value so that
	            // if the cursor is rewound and executed, the batchSize is still correct.
	            cleanup = () => {
	                this.cursorOptions.batchSize = batchSize;
	            };
	        }
	        try {
	            const response = await super.getMore();
	            this.numReturned = this.numReturned + response.batchSize;
	            return response;
	        }
	        finally {
	            cleanup?.();
	        }
	    }
	    /**
	     * Get the count of documents for this cursor
	     * @deprecated Use `collection.estimatedDocumentCount` or `collection.countDocuments` instead
	     */
	    async count(options) {
	        (0, utils_1.emitWarningOnce)('cursor.count is deprecated and will be removed in the next major version, please use `collection.estimatedDocumentCount` or `collection.countDocuments` instead ');
	        if (typeof options === 'boolean') {
	            throw new error_1.MongoInvalidArgumentError('Invalid first parameter to count');
	        }
	        return await (0, execute_operation_1.executeOperation)(this.client, new count_1.CountOperation(this.namespace, this.cursorFilter, {
	            ...this.findOptions, // NOTE: order matters here, we may need to refine this
	            ...this.cursorOptions,
	            ...options
	        }));
	    }
	    async explain(verbosity, options) {
	        const { explain, timeout } = this.resolveExplainTimeoutOptions(verbosity, options);
	        return (await (0, execute_operation_1.executeOperation)(this.client, new find_1.FindOperation(this.namespace, this.cursorFilter, {
	            ...this.findOptions, // NOTE: order matters here, we may need to refine this
	            ...this.cursorOptions,
	            ...timeout,
	            explain: explain ?? true
	        }))).shift(this.deserializationOptions);
	    }
	    /** Set the cursor query */
	    filter(filter) {
	        this.throwIfInitialized();
	        this.cursorFilter = filter;
	        return this;
	    }
	    /**
	     * Set the cursor hint
	     *
	     * @param hint - If specified, then the query system will only consider plans using the hinted index.
	     */
	    hint(hint) {
	        this.throwIfInitialized();
	        this.findOptions.hint = hint;
	        return this;
	    }
	    /**
	     * Set the cursor min
	     *
	     * @param min - Specify a $min value to specify the inclusive lower bound for a specific index in order to constrain the results of find(). The $min specifies the lower bound for all keys of a specific index in order.
	     */
	    min(min) {
	        this.throwIfInitialized();
	        this.findOptions.min = min;
	        return this;
	    }
	    /**
	     * Set the cursor max
	     *
	     * @param max - Specify a $max value to specify the exclusive upper bound for a specific index in order to constrain the results of find(). The $max specifies the upper bound for all keys of a specific index in order.
	     */
	    max(max) {
	        this.throwIfInitialized();
	        this.findOptions.max = max;
	        return this;
	    }
	    /**
	     * Set the cursor returnKey.
	     * If set to true, modifies the cursor to only return the index field or fields for the results of the query, rather than documents.
	     * If set to true and the query does not use an index to perform the read operation, the returned documents will not contain any fields.
	     *
	     * @param value - the returnKey value.
	     */
	    returnKey(value) {
	        this.throwIfInitialized();
	        this.findOptions.returnKey = value;
	        return this;
	    }
	    /**
	     * Modifies the output of a query by adding a field $recordId to matching documents. $recordId is the internal key which uniquely identifies a document in a collection.
	     *
	     * @param value - The $showDiskLoc option has now been deprecated and replaced with the showRecordId field. $showDiskLoc will still be accepted for OP_QUERY stye find.
	     */
	    showRecordId(value) {
	        this.throwIfInitialized();
	        this.findOptions.showRecordId = value;
	        return this;
	    }
	    /**
	     * Add a query modifier to the cursor query
	     *
	     * @param name - The query modifier (must start with $, such as $orderby etc)
	     * @param value - The modifier value.
	     */
	    addQueryModifier(name, value) {
	        this.throwIfInitialized();
	        if (name[0] !== '$') {
	            throw new error_1.MongoInvalidArgumentError(`${name} is not a valid query modifier`);
	        }
	        // Strip of the $
	        const field = name.substr(1);
	        // NOTE: consider some TS magic for this
	        switch (field) {
	            case 'comment':
	                this.findOptions.comment = value;
	                break;
	            case 'explain':
	                this.findOptions.explain = value;
	                break;
	            case 'hint':
	                this.findOptions.hint = value;
	                break;
	            case 'max':
	                this.findOptions.max = value;
	                break;
	            case 'maxTimeMS':
	                this.findOptions.maxTimeMS = value;
	                break;
	            case 'min':
	                this.findOptions.min = value;
	                break;
	            case 'orderby':
	                this.findOptions.sort = (0, sort_1.formatSort)(value);
	                break;
	            case 'query':
	                this.cursorFilter = value;
	                break;
	            case 'returnKey':
	                this.findOptions.returnKey = value;
	                break;
	            case 'showDiskLoc':
	                this.findOptions.showRecordId = value;
	                break;
	            default:
	                throw new error_1.MongoInvalidArgumentError(`Invalid query modifier: ${name}`);
	        }
	        return this;
	    }
	    /**
	     * Add a comment to the cursor query allowing for tracking the comment in the log.
	     *
	     * @param value - The comment attached to this query.
	     */
	    comment(value) {
	        this.throwIfInitialized();
	        this.findOptions.comment = value;
	        return this;
	    }
	    /**
	     * Set a maxAwaitTimeMS on a tailing cursor query to allow to customize the timeout value for the option awaitData (Only supported on MongoDB 3.2 or higher, ignored otherwise)
	     *
	     * @param value - Number of milliseconds to wait before aborting the tailed query.
	     */
	    maxAwaitTimeMS(value) {
	        this.throwIfInitialized();
	        if (typeof value !== 'number') {
	            throw new error_1.MongoInvalidArgumentError('Argument for maxAwaitTimeMS must be a number');
	        }
	        this.findOptions.maxAwaitTimeMS = value;
	        return this;
	    }
	    /**
	     * Set a maxTimeMS on the cursor query, allowing for hard timeout limits on queries (Only supported on MongoDB 2.6 or higher)
	     *
	     * @param value - Number of milliseconds to wait before aborting the query.
	     */
	    maxTimeMS(value) {
	        this.throwIfInitialized();
	        if (typeof value !== 'number') {
	            throw new error_1.MongoInvalidArgumentError('Argument for maxTimeMS must be a number');
	        }
	        this.findOptions.maxTimeMS = value;
	        return this;
	    }
	    /**
	     * Add a project stage to the aggregation pipeline
	     *
	     * @remarks
	     * In order to strictly type this function you must provide an interface
	     * that represents the effect of your projection on the result documents.
	     *
	     * By default chaining a projection to your cursor changes the returned type to the generic
	     * {@link Document} type.
	     * You should specify a parameterized type to have assertions on your final results.
	     *
	     * @example
	     * ```typescript
	     * // Best way
	     * const docs: FindCursor<{ a: number }> = cursor.project<{ a: number }>({ _id: 0, a: true });
	     * // Flexible way
	     * const docs: FindCursor<Document> = cursor.project({ _id: 0, a: true });
	     * ```
	     *
	     * @remarks
	     *
	     * **Note for Typescript Users:** adding a transform changes the return type of the iteration of this cursor,
	     * it **does not** return a new instance of a cursor. This means when calling project,
	     * you should always assign the result to a new variable in order to get a correctly typed cursor variable.
	     * Take note of the following example:
	     *
	     * @example
	     * ```typescript
	     * const cursor: FindCursor<{ a: number; b: string }> = coll.find();
	     * const projectCursor = cursor.project<{ a: number }>({ _id: 0, a: true });
	     * const aPropOnlyArray: {a: number}[] = await projectCursor.toArray();
	     *
	     * // or always use chaining and save the final cursor
	     *
	     * const cursor = coll.find().project<{ a: string }>({
	     *   _id: 0,
	     *   a: { $convert: { input: '$a', to: 'string' }
	     * }});
	     * ```
	     */
	    project(value) {
	        this.throwIfInitialized();
	        this.findOptions.projection = value;
	        return this;
	    }
	    /**
	     * Sets the sort order of the cursor query.
	     *
	     * @param sort - The key or keys set for the sort.
	     * @param direction - The direction of the sorting (1 or -1).
	     */
	    sort(sort, direction) {
	        this.throwIfInitialized();
	        if (this.findOptions.tailable) {
	            throw new error_1.MongoTailableCursorError('Tailable cursor does not support sorting');
	        }
	        this.findOptions.sort = (0, sort_1.formatSort)(sort, direction);
	        return this;
	    }
	    /**
	     * Allows disk use for blocking sort operations exceeding 100MB memory. (MongoDB 3.2 or higher)
	     *
	     * @remarks
	     * {@link https://www.mongodb.com/docs/manual/reference/command/find/#find-cmd-allowdiskuse | find command allowDiskUse documentation}
	     */
	    allowDiskUse(allow = true) {
	        this.throwIfInitialized();
	        if (!this.findOptions.sort) {
	            throw new error_1.MongoInvalidArgumentError('Option "allowDiskUse" requires a sort specification');
	        }
	        // As of 6.0 the default is true. This allows users to get back to the old behavior.
	        if (!allow) {
	            this.findOptions.allowDiskUse = false;
	            return this;
	        }
	        this.findOptions.allowDiskUse = true;
	        return this;
	    }
	    /**
	     * Set the collation options for the cursor.
	     *
	     * @param value - The cursor collation options (MongoDB 3.4 or higher) settings for update operation (see 3.4 documentation for available fields).
	     */
	    collation(value) {
	        this.throwIfInitialized();
	        this.findOptions.collation = value;
	        return this;
	    }
	    /**
	     * Set the limit for the cursor.
	     *
	     * @param value - The limit for the cursor query.
	     */
	    limit(value) {
	        this.throwIfInitialized();
	        if (this.findOptions.tailable) {
	            throw new error_1.MongoTailableCursorError('Tailable cursor does not support limit');
	        }
	        if (typeof value !== 'number') {
	            throw new error_1.MongoInvalidArgumentError('Operation "limit" requires an integer');
	        }
	        this.findOptions.limit = value;
	        return this;
	    }
	    /**
	     * Set the skip for the cursor.
	     *
	     * @param value - The skip for the cursor query.
	     */
	    skip(value) {
	        this.throwIfInitialized();
	        if (this.findOptions.tailable) {
	            throw new error_1.MongoTailableCursorError('Tailable cursor does not support skip');
	        }
	        if (typeof value !== 'number') {
	            throw new error_1.MongoInvalidArgumentError('Operation "skip" requires an integer');
	        }
	        this.findOptions.skip = value;
	        return this;
	    }
	}
	find_cursor.FindCursor = FindCursor;
	
	return find_cursor;
}

var list_indexes_cursor = {};

var hasRequiredList_indexes_cursor;

function requireList_indexes_cursor () {
	if (hasRequiredList_indexes_cursor) return list_indexes_cursor;
	hasRequiredList_indexes_cursor = 1;
	Object.defineProperty(list_indexes_cursor, "__esModule", { value: true });
	list_indexes_cursor.ListIndexesCursor = void 0;
	const execute_operation_1 = mongodb5.requireExecute_operation();
	const indexes_1 = mongodb5.requireIndexes();
	const abstract_cursor_1 = requireAbstract_cursor();
	/** @public */
	class ListIndexesCursor extends abstract_cursor_1.AbstractCursor {
	    constructor(collection, options) {
	        super(collection.client, collection.s.namespace, options);
	        this.parent = collection;
	        this.options = options;
	    }
	    clone() {
	        return new ListIndexesCursor(this.parent, {
	            ...this.options,
	            ...this.cursorOptions
	        });
	    }
	    /** @internal */
	    async _initialize(session) {
	        const operation = new indexes_1.ListIndexesOperation(this.parent, {
	            ...this.cursorOptions,
	            ...this.options,
	            session
	        });
	        const response = await (0, execute_operation_1.executeOperation)(this.parent.client, operation, this.timeoutContext);
	        return { server: operation.server, session, response };
	    }
	}
	list_indexes_cursor.ListIndexesCursor = ListIndexesCursor;
	
	return list_indexes_cursor;
}

var list_search_indexes_cursor = {};

var hasRequiredList_search_indexes_cursor;

function requireList_search_indexes_cursor () {
	if (hasRequiredList_search_indexes_cursor) return list_search_indexes_cursor;
	hasRequiredList_search_indexes_cursor = 1;
	Object.defineProperty(list_search_indexes_cursor, "__esModule", { value: true });
	list_search_indexes_cursor.ListSearchIndexesCursor = void 0;
	const aggregation_cursor_1 = requireAggregation_cursor();
	/** @public */
	class ListSearchIndexesCursor extends aggregation_cursor_1.AggregationCursor {
	    /** @internal */
	    constructor({ fullNamespace: ns, client }, name, options = {}) {
	        const pipeline = name == null ? [{ $listSearchIndexes: {} }] : [{ $listSearchIndexes: { name } }];
	        super(client, ns, pipeline, options);
	    }
	}
	list_search_indexes_cursor.ListSearchIndexesCursor = ListSearchIndexesCursor;
	
	return list_search_indexes_cursor;
}

var hasRequiredCollection;

function requireCollection () {
	if (hasRequiredCollection) return collection;
	hasRequiredCollection = 1;
	Object.defineProperty(collection, "__esModule", { value: true });
	collection.Collection = void 0;
	const bson_1 = mongodb1.requireBson();
	const ordered_1 = mongodb1.requireOrdered();
	const unordered_1 = mongodb1.requireUnordered();
	const change_stream_1 = mongodb1.requireChange_stream();
	const aggregation_cursor_1 = requireAggregation_cursor();
	const find_cursor_1 = requireFind_cursor();
	const list_indexes_cursor_1 = requireList_indexes_cursor();
	const list_search_indexes_cursor_1 = requireList_search_indexes_cursor();
	const error_1 = mongodb4.requireError();
	const count_1 = mongodb5.requireCount();
	const delete_1 = mongodb5.require_delete();
	const distinct_1 = mongodb5.requireDistinct();
	const estimated_document_count_1 = mongodb5.requireEstimated_document_count();
	const execute_operation_1 = mongodb5.requireExecute_operation();
	const find_and_modify_1 = mongodb5.requireFind_and_modify();
	const indexes_1 = mongodb5.requireIndexes();
	const insert_1 = mongodb5.requireInsert();
	const rename_1 = mongodb5.requireRename();
	const create_1 = mongodb5.requireCreate();
	const drop_1 = mongodb5.requireDrop$1();
	const update_1 = mongodb5.requireUpdate$1();
	const update_2 = mongodb5.requireUpdate();
	const read_concern_1 = mongodb5.requireRead_concern();
	const read_preference_1 = mongodb5.requireRead_preference();
	const utils_1 = mongodb7.requireUtils();
	const write_concern_1 = mongodb7.requireWrite_concern();
	/**
	 * The **Collection** class is an internal class that embodies a MongoDB collection
	 * allowing for insert/find/update/delete and other command operation on that MongoDB collection.
	 *
	 * **COLLECTION Cannot directly be instantiated**
	 * @public
	 *
	 * @example
	 * ```ts
	 * import { MongoClient } from 'mongodb';
	 *
	 * interface Pet {
	 *   name: string;
	 *   kind: 'dog' | 'cat' | 'fish';
	 * }
	 *
	 * const client = new MongoClient('mongodb://localhost:27017');
	 * const pets = client.db().collection<Pet>('pets');
	 *
	 * const petCursor = pets.find();
	 *
	 * for await (const pet of petCursor) {
	 *   console.log(`${pet.name} is a ${pet.kind}!`);
	 * }
	 * ```
	 */
	class Collection {
	    /**
	     * Create a new Collection instance
	     * @internal
	     */
	    constructor(db, name, options) {
	        this.db = db;
	        // Internal state
	        this.s = {
	            db,
	            options,
	            namespace: new utils_1.MongoDBCollectionNamespace(db.databaseName, name),
	            pkFactory: db.options?.pkFactory ?? utils_1.DEFAULT_PK_FACTORY,
	            readPreference: read_preference_1.ReadPreference.fromOptions(options),
	            bsonOptions: (0, bson_1.resolveBSONOptions)(options, db),
	            readConcern: read_concern_1.ReadConcern.fromOptions(options),
	            writeConcern: write_concern_1.WriteConcern.fromOptions(options)
	        };
	        this.client = db.client;
	    }
	    /**
	     * The name of the database this collection belongs to
	     */
	    get dbName() {
	        return this.s.namespace.db;
	    }
	    /**
	     * The name of this collection
	     */
	    get collectionName() {
	        return this.s.namespace.collection;
	    }
	    /**
	     * The namespace of this collection, in the format `${this.dbName}.${this.collectionName}`
	     */
	    get namespace() {
	        return this.fullNamespace.toString();
	    }
	    /**
	     *  @internal
	     *
	     * The `MongoDBNamespace` for the collection.
	     */
	    get fullNamespace() {
	        return this.s.namespace;
	    }
	    /**
	     * The current readConcern of the collection. If not explicitly defined for
	     * this collection, will be inherited from the parent DB
	     */
	    get readConcern() {
	        if (this.s.readConcern == null) {
	            return this.db.readConcern;
	        }
	        return this.s.readConcern;
	    }
	    /**
	     * The current readPreference of the collection. If not explicitly defined for
	     * this collection, will be inherited from the parent DB
	     */
	    get readPreference() {
	        if (this.s.readPreference == null) {
	            return this.db.readPreference;
	        }
	        return this.s.readPreference;
	    }
	    get bsonOptions() {
	        return this.s.bsonOptions;
	    }
	    /**
	     * The current writeConcern of the collection. If not explicitly defined for
	     * this collection, will be inherited from the parent DB
	     */
	    get writeConcern() {
	        if (this.s.writeConcern == null) {
	            return this.db.writeConcern;
	        }
	        return this.s.writeConcern;
	    }
	    /** The current index hint for the collection */
	    get hint() {
	        return this.s.collectionHint;
	    }
	    set hint(v) {
	        this.s.collectionHint = (0, utils_1.normalizeHintField)(v);
	    }
	    get timeoutMS() {
	        return this.s.options.timeoutMS;
	    }
	    /**
	     * Inserts a single document into MongoDB. If documents passed in do not contain the **_id** field,
	     * one will be added to each of the documents missing it by the driver, mutating the document. This behavior
	     * can be overridden by setting the **forceServerObjectId** flag.
	     *
	     * @param doc - The document to insert
	     * @param options - Optional settings for the command
	     */
	    async insertOne(doc, options) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new insert_1.InsertOneOperation(this, doc, (0, utils_1.resolveOptions)(this, options)));
	    }
	    /**
	     * Inserts an array of documents into MongoDB. If documents passed in do not contain the **_id** field,
	     * one will be added to each of the documents missing it by the driver, mutating the document. This behavior
	     * can be overridden by setting the **forceServerObjectId** flag.
	     *
	     * @param docs - The documents to insert
	     * @param options - Optional settings for the command
	     */
	    async insertMany(docs, options) {
	        if (!Array.isArray(docs)) {
	            throw new error_1.MongoInvalidArgumentError('Argument "docs" must be an array of documents');
	        }
	        options = (0, utils_1.resolveOptions)(this, options ?? {});
	        const acknowledged = write_concern_1.WriteConcern.fromOptions(options)?.w !== 0;
	        try {
	            const res = await this.bulkWrite(docs.map(doc => ({ insertOne: { document: doc } })), options);
	            return {
	                acknowledged,
	                insertedCount: res.insertedCount,
	                insertedIds: res.insertedIds
	            };
	        }
	        catch (err) {
	            if (err && err.message === 'Operation must be an object with an operation key') {
	                throw new error_1.MongoInvalidArgumentError('Collection.insertMany() cannot be called with an array that has null/undefined values');
	            }
	            throw err;
	        }
	    }
	    /**
	     * Perform a bulkWrite operation without a fluent API
	     *
	     * Legal operation types are
	     * - `insertOne`
	     * - `replaceOne`
	     * - `updateOne`
	     * - `updateMany`
	     * - `deleteOne`
	     * - `deleteMany`
	     *
	     * If documents passed in do not contain the **_id** field,
	     * one will be added to each of the documents missing it by the driver, mutating the document. This behavior
	     * can be overridden by setting the **forceServerObjectId** flag.
	     *
	     * @param operations - Bulk operations to perform
	     * @param options - Optional settings for the command
	     * @throws MongoDriverError if operations is not an array
	     */
	    async bulkWrite(operations, options) {
	        if (!Array.isArray(operations)) {
	            throw new error_1.MongoInvalidArgumentError('Argument "operations" must be an array of documents');
	        }
	        options = (0, utils_1.resolveOptions)(this, options ?? {});
	        // TODO(NODE-7071): remove once the client doesn't need to be connected to construct
	        // bulk operations
	        const isConnected = this.client.topology != null;
	        if (!isConnected) {
	            await (0, execute_operation_1.autoConnect)(this.client);
	        }
	        // Create the bulk operation
	        const bulk = options.ordered === false
	            ? this.initializeUnorderedBulkOp(options)
	            : this.initializeOrderedBulkOp(options);
	        // for each op go through and add to the bulk
	        for (const operation of operations) {
	            bulk.raw(operation);
	        }
	        // Execute the bulk
	        return await bulk.execute({ ...options });
	    }
	    /**
	     * Update a single document in a collection
	     *
	     * The value of `update` can be either:
	     * - UpdateFilter<TSchema> - A document that contains update operator expressions,
	     * - Document[] - an aggregation pipeline.
	     *
	     * @param filter - The filter used to select the document to update
	     * @param update - The modifications to apply
	     * @param options - Optional settings for the command
	     */
	    async updateOne(filter, update, options) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new update_2.UpdateOneOperation(this.s.namespace, filter, update, (0, utils_1.resolveOptions)(this, options)));
	    }
	    /**
	     * Replace a document in a collection with another document
	     *
	     * @param filter - The filter used to select the document to replace
	     * @param replacement - The Document that replaces the matching document
	     * @param options - Optional settings for the command
	     */
	    async replaceOne(filter, replacement, options) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new update_2.ReplaceOneOperation(this.s.namespace, filter, replacement, (0, utils_1.resolveOptions)(this, options)));
	    }
	    /**
	     * Update multiple documents in a collection
	     *
	     * The value of `update` can be either:
	     * - UpdateFilter<TSchema> - A document that contains update operator expressions,
	     * - Document[] - an aggregation pipeline.
	     *
	     * @param filter - The filter used to select the document to update
	     * @param update - The modifications to apply
	     * @param options - Optional settings for the command
	     */
	    async updateMany(filter, update, options) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new update_2.UpdateManyOperation(this.s.namespace, filter, update, (0, utils_1.resolveOptions)(this, options)));
	    }
	    /**
	     * Delete a document from a collection
	     *
	     * @param filter - The filter used to select the document to remove
	     * @param options - Optional settings for the command
	     */
	    async deleteOne(filter = {}, options = {}) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new delete_1.DeleteOneOperation(this.s.namespace, filter, (0, utils_1.resolveOptions)(this, options)));
	    }
	    /**
	     * Delete multiple documents from a collection
	     *
	     * @param filter - The filter used to select the documents to remove
	     * @param options - Optional settings for the command
	     */
	    async deleteMany(filter = {}, options = {}) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new delete_1.DeleteManyOperation(this.s.namespace, filter, (0, utils_1.resolveOptions)(this, options)));
	    }
	    /**
	     * Rename the collection.
	     *
	     * @remarks
	     * This operation does not inherit options from the Db or MongoClient.
	     *
	     * @param newName - New name of of the collection.
	     * @param options - Optional settings for the command
	     */
	    async rename(newName, options) {
	        // Intentionally, we do not inherit options from parent for this operation.
	        return await (0, execute_operation_1.executeOperation)(this.client, new rename_1.RenameOperation(this, newName, (0, utils_1.resolveOptions)(undefined, {
	            ...options,
	            readPreference: read_preference_1.ReadPreference.PRIMARY
	        })));
	    }
	    /**
	     * Drop the collection from the database, removing it permanently. New accesses will create a new collection.
	     *
	     * @param options - Optional settings for the command
	     */
	    async drop(options) {
	        return await this.db.dropCollection(this.collectionName, options);
	    }
	    async findOne(filter = {}, options = {}) {
	        // Explicitly set the limit to 1 and singleBatch to true for all commands, per the spec.
	        // noCursorTimeout must be unset as well as batchSize.
	        // See: https://github.com/mongodb/specifications/blob/master/source/crud/crud.md#findone-api-details
	        const { ...opts } = options;
	        opts.singleBatch = true;
	        const cursor = this.find(filter, opts).limit(1);
	        const result = await cursor.next();
	        await cursor.close();
	        return result;
	    }
	    find(filter = {}, options = {}) {
	        return new find_cursor_1.FindCursor(this.client, this.s.namespace, filter, (0, utils_1.resolveOptions)(this, options));
	    }
	    /**
	     * Returns the options of the collection.
	     *
	     * @param options - Optional settings for the command
	     */
	    async options(options) {
	        options = (0, utils_1.resolveOptions)(this, options);
	        const [collection] = await this.db
	            .listCollections({ name: this.collectionName }, { ...options, nameOnly: false })
	            .toArray();
	        if (collection == null || collection.options == null) {
	            throw new error_1.MongoAPIError(`collection ${this.namespace} not found`);
	        }
	        return collection.options;
	    }
	    /**
	     * Returns if the collection is a capped collection
	     *
	     * @param options - Optional settings for the command
	     */
	    async isCapped(options) {
	        const { capped } = await this.options(options);
	        return Boolean(capped);
	    }
	    /**
	     * Creates an index on the db and collection collection.
	     *
	     * @param indexSpec - The field name or index specification to create an index for
	     * @param options - Optional settings for the command
	     *
	     * @example
	     * ```ts
	     * const collection = client.db('foo').collection('bar');
	     *
	     * await collection.createIndex({ a: 1, b: -1 });
	     *
	     * // Alternate syntax for { c: 1, d: -1 } that ensures order of indexes
	     * await collection.createIndex([ [c, 1], [d, -1] ]);
	     *
	     * // Equivalent to { e: 1 }
	     * await collection.createIndex('e');
	     *
	     * // Equivalent to { f: 1, g: 1 }
	     * await collection.createIndex(['f', 'g'])
	     *
	     * // Equivalent to { h: 1, i: -1 }
	     * await collection.createIndex([ { h: 1 }, { i: -1 } ]);
	     *
	     * // Equivalent to { j: 1, k: -1, l: 2d }
	     * await collection.createIndex(['j', ['k', -1], { l: '2d' }])
	     * ```
	     */
	    async createIndex(indexSpec, options) {
	        const indexes = await (0, execute_operation_1.executeOperation)(this.client, indexes_1.CreateIndexesOperation.fromIndexSpecification(this, this.collectionName, indexSpec, (0, utils_1.resolveOptions)(this, options)));
	        return indexes[0];
	    }
	    /**
	     * Creates multiple indexes in the collection, this method is only supported for
	     * MongoDB 2.6 or higher. Earlier version of MongoDB will throw a command not supported
	     * error.
	     *
	     * **Note**: Unlike {@link Collection#createIndex| createIndex}, this function takes in raw index specifications.
	     * Index specifications are defined {@link https://www.mongodb.com/docs/manual/reference/command/createIndexes/| here}.
	     *
	     * @param indexSpecs - An array of index specifications to be created
	     * @param options - Optional settings for the command
	     *
	     * @example
	     * ```ts
	     * const collection = client.db('foo').collection('bar');
	     * await collection.createIndexes([
	     *   // Simple index on field fizz
	     *   {
	     *     key: { fizz: 1 },
	     *   }
	     *   // wildcard index
	     *   {
	     *     key: { '$**': 1 }
	     *   },
	     *   // named index on darmok and jalad
	     *   {
	     *     key: { darmok: 1, jalad: -1 }
	     *     name: 'tanagra'
	     *   }
	     * ]);
	     * ```
	     */
	    async createIndexes(indexSpecs, options) {
	        return await (0, execute_operation_1.executeOperation)(this.client, indexes_1.CreateIndexesOperation.fromIndexDescriptionArray(this, this.collectionName, indexSpecs, (0, utils_1.resolveOptions)(this, { ...options, maxTimeMS: undefined })));
	    }
	    /**
	     * Drops an index from this collection.
	     *
	     * @param indexName - Name of the index to drop.
	     * @param options - Optional settings for the command
	     */
	    async dropIndex(indexName, options) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new indexes_1.DropIndexOperation(this, indexName, {
	            ...(0, utils_1.resolveOptions)(this, options),
	            readPreference: read_preference_1.ReadPreference.primary
	        }));
	    }
	    /**
	     * Drops all indexes from this collection.
	     *
	     * @param options - Optional settings for the command
	     */
	    async dropIndexes(options) {
	        try {
	            await (0, execute_operation_1.executeOperation)(this.client, new indexes_1.DropIndexOperation(this, '*', (0, utils_1.resolveOptions)(this, options)));
	            return true;
	        }
	        catch (error) {
	            // TODO(NODE-6517): Driver should only filter for namespace not found error. Other errors should be thrown.
	            if (error instanceof error_1.MongoOperationTimeoutError)
	                throw error;
	            return false;
	        }
	    }
	    /**
	     * Get the list of all indexes information for the collection.
	     *
	     * @param options - Optional settings for the command
	     */
	    listIndexes(options) {
	        return new list_indexes_cursor_1.ListIndexesCursor(this, (0, utils_1.resolveOptions)(this, options));
	    }
	    /**
	     * Checks if one or more indexes exist on the collection, fails on first non-existing index
	     *
	     * @param indexes - One or more index names to check.
	     * @param options - Optional settings for the command
	     */
	    async indexExists(indexes, options) {
	        const indexNames = Array.isArray(indexes) ? indexes : [indexes];
	        const allIndexes = new Set(await this.listIndexes(options)
	            .map(({ name }) => name)
	            .toArray());
	        return indexNames.every(name => allIndexes.has(name));
	    }
	    async indexInformation(options) {
	        return await this.indexes({
	            ...options,
	            full: options?.full ?? false
	        });
	    }
	    /**
	     * Gets an estimate of the count of documents in a collection using collection metadata.
	     * This will always run a count command on all server versions.
	     *
	     * due to an oversight in versions 5.0.0-5.0.8 of MongoDB, the count command,
	     * which estimatedDocumentCount uses in its implementation, was not included in v1 of
	     * the Stable API, and so users of the Stable API with estimatedDocumentCount are
	     * recommended to upgrade their server version to 5.0.9+ or set apiStrict: false to avoid
	     * encountering errors.
	     *
	     * @see {@link https://www.mongodb.com/docs/manual/reference/command/count/#behavior|Count: Behavior}
	     * @param options - Optional settings for the command
	     */
	    async estimatedDocumentCount(options) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new estimated_document_count_1.EstimatedDocumentCountOperation(this, (0, utils_1.resolveOptions)(this, options)));
	    }
	    /**
	     * Gets the number of documents matching the filter.
	     * For a fast count of the total documents in a collection see {@link Collection#estimatedDocumentCount| estimatedDocumentCount}.
	     *
	     * Due to countDocuments using the $match aggregation pipeline stage, certain query operators cannot be used in countDocuments. This includes the $where and $near query operators, among others. Details can be found in the documentation for the $match aggregation pipeline stage.
	     *
	     * **Note**: When migrating from {@link Collection#count| count} to {@link Collection#countDocuments| countDocuments}
	     * the following query operators must be replaced:
	     *
	     * | Operator | Replacement |
	     * | -------- | ----------- |
	     * | `$where`   | [`$expr`][1] |
	     * | `$near`    | [`$geoWithin`][2] with [`$center`][3] |
	     * | `$nearSphere` | [`$geoWithin`][2] with [`$centerSphere`][4] |
	     *
	     * [1]: https://www.mongodb.com/docs/manual/reference/operator/query/expr/
	     * [2]: https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/
	     * [3]: https://www.mongodb.com/docs/manual/reference/operator/query/center/#op._S_center
	     * [4]: https://www.mongodb.com/docs/manual/reference/operator/query/centerSphere/#op._S_centerSphere
	     *
	     * @param filter - The filter for the count
	     * @param options - Optional settings for the command
	     *
	     * @see https://www.mongodb.com/docs/manual/reference/operator/query/expr/
	     * @see https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/
	     * @see https://www.mongodb.com/docs/manual/reference/operator/query/center/#op._S_center
	     * @see https://www.mongodb.com/docs/manual/reference/operator/query/centerSphere/#op._S_centerSphere
	     */
	    async countDocuments(filter = {}, options = {}) {
	        const pipeline = [];
	        pipeline.push({ $match: filter });
	        if (typeof options.skip === 'number') {
	            pipeline.push({ $skip: options.skip });
	        }
	        if (typeof options.limit === 'number') {
	            pipeline.push({ $limit: options.limit });
	        }
	        pipeline.push({ $group: { _id: 1, n: { $sum: 1 } } });
	        const cursor = this.aggregate(pipeline, options);
	        const doc = await cursor.next();
	        await cursor.close();
	        return doc?.n ?? 0;
	    }
	    async distinct(key, filter = {}, options = {}) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new distinct_1.DistinctOperation(this, key, filter, (0, utils_1.resolveOptions)(this, options)));
	    }
	    async indexes(options) {
	        const indexes = await this.listIndexes(options).toArray();
	        const full = options?.full ?? true;
	        if (full) {
	            return indexes;
	        }
	        const object = Object.fromEntries(indexes.map(({ name, key }) => [name, Object.entries(key)]));
	        return object;
	    }
	    async findOneAndDelete(filter, options) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new find_and_modify_1.FindOneAndDeleteOperation(this, filter, (0, utils_1.resolveOptions)(this, options)));
	    }
	    async findOneAndReplace(filter, replacement, options) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new find_and_modify_1.FindOneAndReplaceOperation(this, filter, replacement, (0, utils_1.resolveOptions)(this, options)));
	    }
	    async findOneAndUpdate(filter, update, options) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new find_and_modify_1.FindOneAndUpdateOperation(this, filter, update, (0, utils_1.resolveOptions)(this, options)));
	    }
	    /**
	     * Execute an aggregation framework pipeline against the collection, needs MongoDB \>= 2.2
	     *
	     * @param pipeline - An array of aggregation pipelines to execute
	     * @param options - Optional settings for the command
	     */
	    aggregate(pipeline = [], options) {
	        if (!Array.isArray(pipeline)) {
	            throw new error_1.MongoInvalidArgumentError('Argument "pipeline" must be an array of aggregation stages');
	        }
	        return new aggregation_cursor_1.AggregationCursor(this.client, this.s.namespace, pipeline, (0, utils_1.resolveOptions)(this, options));
	    }
	    /**
	     * Create a new Change Stream, watching for new changes (insertions, updates, replacements, deletions, and invalidations) in this collection.
	     *
	     * @remarks
	     * watch() accepts two generic arguments for distinct use cases:
	     * - The first is to override the schema that may be defined for this specific collection
	     * - The second is to override the shape of the change stream document entirely, if it is not provided the type will default to ChangeStreamDocument of the first argument
	     * @example
	     * By just providing the first argument I can type the change to be `ChangeStreamDocument<{ _id: number }>`
	     * ```ts
	     * collection.watch<{ _id: number }>()
	     *   .on('change', change => console.log(change._id.toFixed(4)));
	     * ```
	     *
	     * @example
	     * Passing a second argument provides a way to reflect the type changes caused by an advanced pipeline.
	     * Here, we are using a pipeline to have MongoDB filter for insert changes only and add a comment.
	     * No need start from scratch on the ChangeStreamInsertDocument type!
	     * By using an intersection we can save time and ensure defaults remain the same type!
	     * ```ts
	     * collection
	     *   .watch<Schema, ChangeStreamInsertDocument<Schema> & { comment: string }>([
	     *     { $addFields: { comment: 'big changes' } },
	     *     { $match: { operationType: 'insert' } }
	     *   ])
	     *   .on('change', change => {
	     *     change.comment.startsWith('big');
	     *     change.operationType === 'insert';
	     *     // No need to narrow in code because the generics did that for us!
	     *     expectType<Schema>(change.fullDocument);
	     *   });
	     * ```
	     *
	     * @remarks
	     * When `timeoutMS` is configured for a change stream, it will have different behaviour depending
	     * on whether the change stream is in iterator mode or emitter mode. In both cases, a change
	     * stream will time out if it does not receive a change event within `timeoutMS` of the last change
	     * event.
	     *
	     * Note that if a change stream is consistently timing out when watching a collection, database or
	     * client that is being changed, then this may be due to the server timing out before it can finish
	     * processing the existing oplog. To address this, restart the change stream with a higher
	     * `timeoutMS`.
	     *
	     * If the change stream times out the initial aggregate operation to establish the change stream on
	     * the server, then the client will close the change stream. If the getMore calls to the server
	     * time out, then the change stream will be left open, but will throw a MongoOperationTimeoutError
	     * when in iterator mode and emit an error event that returns a MongoOperationTimeoutError in
	     * emitter mode.
	     *
	     * To determine whether or not the change stream is still open following a timeout, check the
	     * {@link ChangeStream.closed} getter.
	     *
	     * @example
	     * In iterator mode, if a next() call throws a timeout error, it will attempt to resume the change stream.
	     * The next call can just be retried after this succeeds.
	     * ```ts
	     * const changeStream = collection.watch([], { timeoutMS: 100 });
	     * try {
	     *     await changeStream.next();
	     * } catch (e) {
	     *     if (e instanceof MongoOperationTimeoutError && !changeStream.closed) {
	     *       await changeStream.next();
	     *     }
	     *     throw e;
	     * }
	     * ```
	     *
	     * @example
	     * In emitter mode, if the change stream goes `timeoutMS` without emitting a change event, it will
	     * emit an error event that returns a MongoOperationTimeoutError, but will not close the change
	     * stream unless the resume attempt fails. There is no need to re-establish change listeners as
	     * this will automatically continue emitting change events once the resume attempt completes.
	     *
	     * ```ts
	     * const changeStream = collection.watch([], { timeoutMS: 100 });
	     * changeStream.on('change', console.log);
	     * changeStream.on('error', e => {
	     *     if (e instanceof MongoOperationTimeoutError && !changeStream.closed) {
	     *         // do nothing
	     *     } else {
	     *         changeStream.close();
	     *     }
	     * });
	     * ```
	     *
	     * @param pipeline - An array of {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/|aggregation pipeline stages} through which to pass change stream documents. This allows for filtering (using $match) and manipulating the change stream documents.
	     * @param options - Optional settings for the command
	     * @typeParam TLocal - Type of the data being detected by the change stream
	     * @typeParam TChange - Type of the whole change stream document emitted
	     */
	    watch(pipeline = [], options = {}) {
	        // Allow optionally not specifying a pipeline
	        if (!Array.isArray(pipeline)) {
	            options = pipeline;
	            pipeline = [];
	        }
	        return new change_stream_1.ChangeStream(this, pipeline, (0, utils_1.resolveOptions)(this, options));
	    }
	    /**
	     * Initiate an Out of order batch write operation. All operations will be buffered into insert/update/remove commands executed out of order.
	     *
	     * @throws MongoNotConnectedError
	     * @remarks
	     * **NOTE:** MongoClient must be connected prior to calling this method due to a known limitation in this legacy implementation.
	     * However, `collection.bulkWrite()` provides an equivalent API that does not require prior connecting.
	     */
	    initializeUnorderedBulkOp(options) {
	        return new unordered_1.UnorderedBulkOperation(this, (0, utils_1.resolveOptions)(this, options));
	    }
	    /**
	     * Initiate an In order bulk write operation. Operations will be serially executed in the order they are added, creating a new operation for each switch in types.
	     *
	     * @throws MongoNotConnectedError
	     * @remarks
	     * **NOTE:** MongoClient must be connected prior to calling this method due to a known limitation in this legacy implementation.
	     * However, `collection.bulkWrite()` provides an equivalent API that does not require prior connecting.
	     */
	    initializeOrderedBulkOp(options) {
	        return new ordered_1.OrderedBulkOperation(this, (0, utils_1.resolveOptions)(this, options));
	    }
	    /**
	     * An estimated count of matching documents in the db to a filter.
	     *
	     * **NOTE:** This method has been deprecated, since it does not provide an accurate count of the documents
	     * in a collection. To obtain an accurate count of documents in the collection, use {@link Collection#countDocuments| countDocuments}.
	     * To obtain an estimated count of all documents in the collection, use {@link Collection#estimatedDocumentCount| estimatedDocumentCount}.
	     *
	     * @deprecated use {@link Collection#countDocuments| countDocuments} or {@link Collection#estimatedDocumentCount| estimatedDocumentCount} instead
	     *
	     * @param filter - The filter for the count.
	     * @param options - Optional settings for the command
	     */
	    async count(filter = {}, options = {}) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new count_1.CountOperation(this.fullNamespace, filter, (0, utils_1.resolveOptions)(this, options)));
	    }
	    listSearchIndexes(indexNameOrOptions, options) {
	        options =
	            typeof indexNameOrOptions === 'object' ? indexNameOrOptions : options == null ? {} : options;
	        const indexName = indexNameOrOptions == null
	            ? null
	            : typeof indexNameOrOptions === 'object'
	                ? null
	                : indexNameOrOptions;
	        return new list_search_indexes_cursor_1.ListSearchIndexesCursor(this, indexName, options);
	    }
	    /**
	     * Creates a single search index for the collection.
	     *
	     * @param description - The index description for the new search index.
	     * @returns A promise that resolves to the name of the new search index.
	     *
	     * @remarks Only available when used against a 7.0+ Atlas cluster.
	     */
	    async createSearchIndex(description) {
	        const [index] = await this.createSearchIndexes([description]);
	        return index;
	    }
	    /**
	     * Creates multiple search indexes for the current collection.
	     *
	     * @param descriptions - An array of `SearchIndexDescription`s for the new search indexes.
	     * @returns A promise that resolves to an array of the newly created search index names.
	     *
	     * @remarks Only available when used against a 7.0+ Atlas cluster.
	     * @returns
	     */
	    async createSearchIndexes(descriptions) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new create_1.CreateSearchIndexesOperation(this, descriptions));
	    }
	    /**
	     * Deletes a search index by index name.
	     *
	     * @param name - The name of the search index to be deleted.
	     *
	     * @remarks Only available when used against a 7.0+ Atlas cluster.
	     */
	    async dropSearchIndex(name) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new drop_1.DropSearchIndexOperation(this, name));
	    }
	    /**
	     * Updates a search index by replacing the existing index definition with the provided definition.
	     *
	     * @param name - The name of the search index to update.
	     * @param definition - The new search index definition.
	     *
	     * @remarks Only available when used against a 7.0+ Atlas cluster.
	     */
	    async updateSearchIndex(name, definition) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new update_1.UpdateSearchIndexOperation(this, name, definition));
	    }
	}
	collection.Collection = Collection;
	
	return collection;
}

var change_stream_cursor = {};

var hasRequiredChange_stream_cursor;

function requireChange_stream_cursor () {
	if (hasRequiredChange_stream_cursor) return change_stream_cursor;
	hasRequiredChange_stream_cursor = 1;
	Object.defineProperty(change_stream_cursor, "__esModule", { value: true });
	change_stream_cursor.ChangeStreamCursor = void 0;
	const change_stream_1 = mongodb1.requireChange_stream();
	const constants_1 = requireConstants();
	const aggregate_1 = mongodb5.requireAggregate();
	const execute_operation_1 = mongodb5.requireExecute_operation();
	const utils_1 = mongodb7.requireUtils();
	const abstract_cursor_1 = requireAbstract_cursor();
	/** @internal */
	class ChangeStreamCursor extends abstract_cursor_1.AbstractCursor {
	    constructor(client, namespace, pipeline = [], options = {}) {
	        super(client, namespace, { ...options, tailable: true, awaitData: true });
	        this.pipeline = pipeline;
	        this.changeStreamCursorOptions = options;
	        this._resumeToken = null;
	        this.startAtOperationTime = options.startAtOperationTime ?? null;
	        if (options.startAfter) {
	            this.resumeToken = options.startAfter;
	        }
	        else if (options.resumeAfter) {
	            this.resumeToken = options.resumeAfter;
	        }
	    }
	    set resumeToken(token) {
	        this._resumeToken = token;
	        this.emit(change_stream_1.ChangeStream.RESUME_TOKEN_CHANGED, token);
	    }
	    get resumeToken() {
	        return this._resumeToken;
	    }
	    get resumeOptions() {
	        const options = {
	            ...this.changeStreamCursorOptions
	        };
	        for (const key of ['resumeAfter', 'startAfter', 'startAtOperationTime']) {
	            delete options[key];
	        }
	        if (this.resumeToken != null) {
	            if (this.changeStreamCursorOptions.startAfter && !this.hasReceived) {
	                options.startAfter = this.resumeToken;
	            }
	            else {
	                options.resumeAfter = this.resumeToken;
	            }
	        }
	        else if (this.startAtOperationTime != null) {
	            options.startAtOperationTime = this.startAtOperationTime;
	        }
	        return options;
	    }
	    cacheResumeToken(resumeToken) {
	        if (this.bufferedCount() === 0 && this.postBatchResumeToken) {
	            this.resumeToken = this.postBatchResumeToken;
	        }
	        else {
	            this.resumeToken = resumeToken;
	        }
	        this.hasReceived = true;
	    }
	    _processBatch(response) {
	        const { postBatchResumeToken } = response;
	        if (postBatchResumeToken) {
	            this.postBatchResumeToken = postBatchResumeToken;
	            if (response.batchSize === 0) {
	                this.resumeToken = postBatchResumeToken;
	            }
	        }
	    }
	    clone() {
	        return new ChangeStreamCursor(this.client, this.namespace, this.pipeline, {
	            ...this.cursorOptions
	        });
	    }
	    async _initialize(session) {
	        const aggregateOperation = new aggregate_1.AggregateOperation(this.namespace, this.pipeline, {
	            ...this.cursorOptions,
	            ...this.changeStreamCursorOptions,
	            session
	        });
	        const response = await (0, execute_operation_1.executeOperation)(session.client, aggregateOperation, this.timeoutContext);
	        const server = aggregateOperation.server;
	        this.maxWireVersion = (0, utils_1.maxWireVersion)(server);
	        if (this.startAtOperationTime == null &&
	            this.changeStreamCursorOptions.resumeAfter == null &&
	            this.changeStreamCursorOptions.startAfter == null) {
	            this.startAtOperationTime = response.operationTime;
	        }
	        this._processBatch(response);
	        this.emit(constants_1.INIT, response);
	        this.emit(constants_1.RESPONSE);
	        return { server, session, response };
	    }
	    async getMore() {
	        const response = await super.getMore();
	        this.maxWireVersion = (0, utils_1.maxWireVersion)(this.server);
	        this._processBatch(response);
	        this.emit(change_stream_1.ChangeStream.MORE, response);
	        this.emit(change_stream_1.ChangeStream.RESPONSE);
	        return response;
	    }
	}
	change_stream_cursor.ChangeStreamCursor = ChangeStreamCursor;
	
	return change_stream_cursor;
}

var list_collections_cursor = {};

var hasRequiredList_collections_cursor;

function requireList_collections_cursor () {
	if (hasRequiredList_collections_cursor) return list_collections_cursor;
	hasRequiredList_collections_cursor = 1;
	Object.defineProperty(list_collections_cursor, "__esModule", { value: true });
	list_collections_cursor.ListCollectionsCursor = void 0;
	const execute_operation_1 = mongodb5.requireExecute_operation();
	const list_collections_1 = mongodb5.requireList_collections();
	const abstract_cursor_1 = requireAbstract_cursor();
	/** @public */
	class ListCollectionsCursor extends abstract_cursor_1.AbstractCursor {
	    constructor(db, filter, options) {
	        super(db.client, db.s.namespace, options);
	        this.parent = db;
	        this.filter = filter;
	        this.options = options;
	    }
	    clone() {
	        return new ListCollectionsCursor(this.parent, this.filter, {
	            ...this.options,
	            ...this.cursorOptions
	        });
	    }
	    /** @internal */
	    async _initialize(session) {
	        const operation = new list_collections_1.ListCollectionsOperation(this.parent, this.filter, {
	            ...this.cursorOptions,
	            ...this.options,
	            session,
	            signal: this.signal
	        });
	        const response = await (0, execute_operation_1.executeOperation)(this.parent.client, operation, this.timeoutContext);
	        return { server: operation.server, session, response };
	    }
	}
	list_collections_cursor.ListCollectionsCursor = ListCollectionsCursor;
	
	return list_collections_cursor;
}

var run_command_cursor = {};

var hasRequiredRun_command_cursor;

function requireRun_command_cursor () {
	if (hasRequiredRun_command_cursor) return run_command_cursor;
	hasRequiredRun_command_cursor = 1;
	Object.defineProperty(run_command_cursor, "__esModule", { value: true });
	run_command_cursor.RunCommandCursor = void 0;
	const error_1 = mongodb4.requireError();
	const execute_operation_1 = mongodb5.requireExecute_operation();
	const get_more_1 = mongodb5.requireGet_more();
	const run_command_1 = mongodb5.requireRun_command();
	const utils_1 = mongodb7.requireUtils();
	const abstract_cursor_1 = requireAbstract_cursor();
	/** @public */
	class RunCommandCursor extends abstract_cursor_1.AbstractCursor {
	    /**
	     * Controls the `getMore.comment` field
	     * @param comment - any BSON value
	     */
	    setComment(comment) {
	        this.getMoreOptions.comment = comment;
	        return this;
	    }
	    /**
	     * Controls the `getMore.maxTimeMS` field. Only valid when cursor is tailable await
	     * @param maxTimeMS - the number of milliseconds to wait for new data
	     */
	    setMaxTimeMS(maxTimeMS) {
	        this.getMoreOptions.maxAwaitTimeMS = maxTimeMS;
	        return this;
	    }
	    /**
	     * Controls the `getMore.batchSize` field
	     * @param batchSize - the number documents to return in the `nextBatch`
	     */
	    setBatchSize(batchSize) {
	        this.getMoreOptions.batchSize = batchSize;
	        return this;
	    }
	    /** Unsupported for RunCommandCursor */
	    clone() {
	        throw new error_1.MongoAPIError('Clone not supported, create a new cursor with db.runCursorCommand');
	    }
	    /** Unsupported for RunCommandCursor: readConcern must be configured directly on command document */
	    withReadConcern(_) {
	        throw new error_1.MongoAPIError('RunCommandCursor does not support readConcern it must be attached to the command being run');
	    }
	    /** Unsupported for RunCommandCursor: various cursor flags must be configured directly on command document */
	    addCursorFlag(_, __) {
	        throw new error_1.MongoAPIError('RunCommandCursor does not support cursor flags, they must be attached to the command being run');
	    }
	    /**
	     * Unsupported for RunCommandCursor: maxTimeMS must be configured directly on command document
	     */
	    maxTimeMS(_) {
	        throw new error_1.MongoAPIError('maxTimeMS must be configured on the command document directly, to configure getMore.maxTimeMS use cursor.setMaxTimeMS()');
	    }
	    /** Unsupported for RunCommandCursor: batchSize must be configured directly on command document */
	    batchSize(_) {
	        throw new error_1.MongoAPIError('batchSize must be configured on the command document directly, to configure getMore.batchSize use cursor.setBatchSize()');
	    }
	    /** @internal */
	    constructor(db, command, options = {}) {
	        super(db.client, (0, utils_1.ns)(db.namespace), options);
	        this.getMoreOptions = {};
	        this.db = db;
	        this.command = Object.freeze({ ...command });
	    }
	    /** @internal */
	    async _initialize(session) {
	        const operation = new run_command_1.RunCursorCommandOperation(this.db.s.namespace, this.command, {
	            ...this.cursorOptions,
	            session: session,
	            readPreference: this.cursorOptions.readPreference
	        });
	        const response = await (0, execute_operation_1.executeOperation)(this.client, operation, this.timeoutContext);
	        return {
	            server: operation.server,
	            session,
	            response
	        };
	    }
	    /** @internal */
	    async getMore() {
	        if (!this.session) {
	            throw new error_1.MongoRuntimeError('Unexpected null session. A cursor creating command should have set this');
	        }
	        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	        const getMoreOperation = new get_more_1.GetMoreOperation(this.namespace, this.id, this.server, {
	            ...this.cursorOptions,
	            session: this.session,
	            ...this.getMoreOptions
	        });
	        return await (0, execute_operation_1.executeOperation)(this.client, getMoreOperation, this.timeoutContext);
	    }
	}
	run_command_cursor.RunCommandCursor = RunCommandCursor;
	
	return run_command_cursor;
}

var connection_string = {};

var shared = {};

var hasRequiredShared;

function requireShared () {
	if (hasRequiredShared) return shared;
	hasRequiredShared = 1;
	Object.defineProperty(shared, "__esModule", { value: true });
	shared.getReadPreference = getReadPreference;
	shared.isSharded = isSharded;
	const error_1 = mongodb4.requireError();
	const read_preference_1 = mongodb5.requireRead_preference();
	const common_1 = mongodb5.requireCommon();
	const topology_description_1 = mongodb6.requireTopology_description();
	function getReadPreference(options) {
	    // Default to command version of the readPreference.
	    let readPreference = options?.readPreference ?? read_preference_1.ReadPreference.primary;
	    if (typeof readPreference === 'string') {
	        readPreference = read_preference_1.ReadPreference.fromString(readPreference);
	    }
	    if (!(readPreference instanceof read_preference_1.ReadPreference)) {
	        throw new error_1.MongoInvalidArgumentError('Option "readPreference" must be a ReadPreference instance');
	    }
	    return readPreference;
	}
	function isSharded(topologyOrServer) {
	    if (topologyOrServer == null) {
	        return false;
	    }
	    if (topologyOrServer.description && topologyOrServer.description.type === common_1.ServerType.Mongos) {
	        return true;
	    }
	    // NOTE: This is incredibly inefficient, and should be removed once command construction
	    // happens based on `Server` not `Topology`.
	    if (topologyOrServer.description && topologyOrServer.description instanceof topology_description_1.TopologyDescription) {
	        const servers = Array.from(topologyOrServer.description.servers.values());
	        return servers.some((server) => server.type === common_1.ServerType.Mongos);
	    }
	    return false;
	}
	
	return shared;
}

var hasRequiredConnection_string;

function requireConnection_string () {
	if (hasRequiredConnection_string) return connection_string;
	hasRequiredConnection_string = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.DEFAULT_OPTIONS = exports.OPTIONS = void 0;
		exports.resolveSRVRecord = resolveSRVRecord;
		exports.parseOptions = parseOptions;
		const dns = require$$0$2;
		const mongodb_connection_string_url_1 = mongodbConnectionStringUrl1.requireLib();
		const process = require$$0$1;
		const url_1 = require$$3;
		const mongo_credentials_1 = mongodb1.requireMongo_credentials();
		const providers_1 = mongodb2.requireProviders();
		const compression_1 = mongodb2.requireCompression();
		const encrypter_1 = mongodb4.requireEncrypter();
		const error_1 = mongodb4.requireError();
		const mongo_client_1 = mongodb4.requireMongo_client();
		const mongo_logger_1 = mongodb5.requireMongo_logger();
		const read_concern_1 = mongodb5.requireRead_concern();
		const read_preference_1 = mongodb5.requireRead_preference();
		const runtime_adapters_1 = mongodb5.requireRuntime_adapters();
		const monitor_1 = mongodb6.requireMonitor();
		const utils_1 = mongodb7.requireUtils();
		const write_concern_1 = mongodb7.requireWrite_concern();
		const VALID_TXT_RECORDS = ['authSource', 'replicaSet', 'loadBalanced'];
		const LB_SINGLE_HOST_ERROR = 'loadBalanced option only supported with a single host in the URI';
		const LB_REPLICA_SET_ERROR = 'loadBalanced option not supported with a replicaSet option';
		const LB_DIRECT_CONNECTION_ERROR = 'loadBalanced option not supported when directConnection is provided';
		function retryDNSTimeoutFor(rrtype) {
		    const resolve = rrtype === 'SRV'
		        ? (address) => dns.promises.resolve(address, 'SRV')
		        : (address) => dns.promises.resolve(address, 'TXT');
		    return async function dnsReqRetryTimeout(lookupAddress) {
		        try {
		            return await resolve(lookupAddress);
		        }
		        catch (firstDNSError) {
		            if (firstDNSError.code === dns.TIMEOUT) {
		                return await resolve(lookupAddress);
		            }
		            else {
		                throw firstDNSError;
		            }
		        }
		    };
		}
		const resolveSrv = retryDNSTimeoutFor('SRV');
		const resolveTxt = retryDNSTimeoutFor('TXT');
		/**
		 * Lookup a `mongodb+srv` connection string, combine the parts and reparse it as a normal
		 * connection string.
		 *
		 * @param uri - The connection string to parse
		 * @param options - Optional user provided connection string options
		 */
		async function resolveSRVRecord(options) {
		    if (typeof options.srvHost !== 'string') {
		        throw new error_1.MongoAPIError('Option "srvHost" must not be empty');
		    }
		    // Asynchronously start TXT resolution so that we do not have to wait until
		    // the SRV record is resolved before starting a second DNS query.
		    const lookupAddress = options.srvHost;
		    const txtResolutionPromise = resolveTxt(lookupAddress);
		    txtResolutionPromise.then(undefined, utils_1.squashError); // rejections will be handled later
		    const hostname = `_${options.srvServiceName}._tcp.${lookupAddress}`;
		    // Resolve the SRV record and use the result as the list of hosts to connect to.
		    const addresses = await resolveSrv(hostname);
		    if (addresses.length === 0) {
		        throw new error_1.MongoAPIError('No addresses found at host');
		    }
		    for (const { name } of addresses) {
		        (0, utils_1.checkParentDomainMatch)(name, lookupAddress);
		    }
		    const hostAddresses = addresses.map(r => utils_1.HostAddress.fromString(`${r.name}:${r.port ?? 27017}`));
		    validateLoadBalancedOptions(hostAddresses, options, true);
		    // Use the result of resolving the TXT record and add options from there if they exist.
		    let record;
		    try {
		        record = await txtResolutionPromise;
		    }
		    catch (error) {
		        if (error.code !== 'ENODATA' && error.code !== 'ENOTFOUND') {
		            throw error;
		        }
		        return hostAddresses;
		    }
		    if (record.length > 1) {
		        throw new error_1.MongoParseError('Multiple text records not allowed');
		    }
		    const txtRecordOptions = new url_1.URLSearchParams(record[0].join(''));
		    const txtRecordOptionKeys = [...txtRecordOptions.keys()];
		    if (txtRecordOptionKeys.some(key => !VALID_TXT_RECORDS.includes(key))) {
		        throw new error_1.MongoParseError(`Text record may only set any of: ${VALID_TXT_RECORDS.join(', ')}`);
		    }
		    if (VALID_TXT_RECORDS.some(option => txtRecordOptions.get(option) === '')) {
		        throw new error_1.MongoParseError('Cannot have empty URI params in DNS TXT Record');
		    }
		    const source = txtRecordOptions.get('authSource') ?? undefined;
		    const replicaSet = txtRecordOptions.get('replicaSet') ?? undefined;
		    const loadBalanced = txtRecordOptions.get('loadBalanced') ?? undefined;
		    if (!options.userSpecifiedAuthSource &&
		        source &&
		        options.credentials &&
		        !providers_1.AUTH_MECHS_AUTH_SRC_EXTERNAL.has(options.credentials.mechanism)) {
		        options.credentials = mongo_credentials_1.MongoCredentials.merge(options.credentials, { source });
		    }
		    if (!options.userSpecifiedReplicaSet && replicaSet) {
		        options.replicaSet = replicaSet;
		    }
		    if (loadBalanced === 'true') {
		        options.loadBalanced = true;
		    }
		    if (options.replicaSet && options.srvMaxHosts > 0) {
		        throw new error_1.MongoParseError('Cannot combine replicaSet option with srvMaxHosts');
		    }
		    validateLoadBalancedOptions(hostAddresses, options, true);
		    return hostAddresses;
		}
		/**
		 * Checks if TLS options are valid
		 *
		 * @param allOptions - All options provided by user or included in default options map
		 * @throws MongoAPIError if TLS options are invalid
		 */
		function checkTLSOptions(allOptions) {
		    if (!allOptions)
		        return;
		    const check = (a, b) => {
		        if (allOptions.has(a) && allOptions.has(b)) {
		            throw new error_1.MongoAPIError(`The '${a}' option cannot be used with the '${b}' option`);
		        }
		    };
		    check('tlsInsecure', 'tlsAllowInvalidCertificates');
		    check('tlsInsecure', 'tlsAllowInvalidHostnames');
		}
		function getBoolean(name, value) {
		    if (typeof value === 'boolean')
		        return value;
		    switch (value) {
		        case 'true':
		            return true;
		        case 'false':
		            return false;
		        default:
		            throw new error_1.MongoParseError(`${name} must be either "true" or "false"`);
		    }
		}
		function getIntFromOptions(name, value) {
		    const parsedInt = (0, utils_1.parseInteger)(value);
		    if (parsedInt != null) {
		        return parsedInt;
		    }
		    throw new error_1.MongoParseError(`Expected ${name} to be stringified int value, got: ${value}`);
		}
		function getUIntFromOptions(name, value) {
		    const parsedValue = getIntFromOptions(name, value);
		    if (parsedValue < 0) {
		        throw new error_1.MongoParseError(`${name} can only be a positive int value, got: ${value}`);
		    }
		    return parsedValue;
		}
		function* entriesFromString(value) {
		    if (value === '') {
		        return;
		    }
		    const keyValuePairs = value.split(',');
		    for (const keyValue of keyValuePairs) {
		        const [key, value] = keyValue.split(/:(.*)/);
		        if (value == null) {
		            throw new error_1.MongoParseError('Cannot have undefined values in key value pairs');
		        }
		        yield [key, value];
		    }
		}
		class CaseInsensitiveMap extends Map {
		    constructor(entries = []) {
		        super(entries.map(([k, v]) => [k.toLowerCase(), v]));
		    }
		    has(k) {
		        return super.has(k.toLowerCase());
		    }
		    get(k) {
		        return super.get(k.toLowerCase());
		    }
		    set(k, v) {
		        return super.set(k.toLowerCase(), v);
		    }
		    delete(k) {
		        return super.delete(k.toLowerCase());
		    }
		}
		function parseOptions(uri, mongoClient = undefined, options = {}) {
		    if (mongoClient != null && !(mongoClient instanceof mongo_client_1.MongoClient)) {
		        options = mongoClient;
		        mongoClient = undefined;
		    }
		    // validate BSONOptions
		    if (options.useBigInt64 && typeof options.promoteLongs === 'boolean' && !options.promoteLongs) {
		        throw new error_1.MongoAPIError('Must request either bigint or Long for int64 deserialization');
		    }
		    if (options.useBigInt64 && typeof options.promoteValues === 'boolean' && !options.promoteValues) {
		        throw new error_1.MongoAPIError('Must request either bigint or Long for int64 deserialization');
		    }
		    const url = new mongodb_connection_string_url_1.default(uri);
		    const { hosts, isSRV } = url;
		    const mongoOptions = Object.create(null);
		    mongoOptions.hosts = isSRV ? [] : hosts.map(utils_1.HostAddress.fromString);
		    const urlOptions = new CaseInsensitiveMap();
		    if (url.pathname !== '/' && url.pathname !== '') {
		        const dbName = decodeURIComponent(url.pathname[0] === '/' ? url.pathname.slice(1) : url.pathname);
		        if (dbName) {
		            urlOptions.set('dbName', [dbName]);
		        }
		    }
		    if (url.username !== '') {
		        const auth = {
		            username: decodeURIComponent(url.username)
		        };
		        if (typeof url.password === 'string') {
		            auth.password = decodeURIComponent(url.password);
		        }
		        urlOptions.set('auth', [auth]);
		    }
		    for (const key of url.searchParams.keys()) {
		        const values = url.searchParams.getAll(key);
		        const isReadPreferenceTags = /readPreferenceTags/i.test(key);
		        if (!isReadPreferenceTags && values.length > 1) {
		            throw new error_1.MongoInvalidArgumentError(`URI option "${key}" cannot appear more than once in the connection string`);
		        }
		        if (!isReadPreferenceTags && values.includes('')) {
		            throw new error_1.MongoAPIError(`URI option "${key}" cannot be specified with no value`);
		        }
		        if (!urlOptions.has(key)) {
		            urlOptions.set(key, values);
		        }
		    }
		    const objectOptions = new CaseInsensitiveMap(Object.entries(options).filter(([, v]) => v != null));
		    // Validate options that can only be provided by one of uri or object
		    if (urlOptions.has('serverApi')) {
		        throw new error_1.MongoParseError('URI cannot contain `serverApi`, it can only be passed to the client');
		    }
		    const uriMechanismProperties = urlOptions.get('authMechanismProperties');
		    if (uriMechanismProperties) {
		        for (const property of uriMechanismProperties) {
		            if (/(^|,)ALLOWED_HOSTS:/.test(property)) {
		                throw new error_1.MongoParseError('Auth mechanism property ALLOWED_HOSTS is not allowed in the connection string.');
		            }
		        }
		    }
		    if (objectOptions.has('loadBalanced')) {
		        throw new error_1.MongoParseError('loadBalanced is only a valid option in the URI');
		    }
		    // All option collection
		    const allProvidedOptions = new CaseInsensitiveMap();
		    const allProvidedKeys = new Set([...urlOptions.keys(), ...objectOptions.keys()]);
		    for (const key of allProvidedKeys) {
		        const values = [];
		        const objectOptionValue = objectOptions.get(key);
		        if (objectOptionValue != null) {
		            values.push(objectOptionValue);
		        }
		        const urlValues = urlOptions.get(key) ?? [];
		        values.push(...urlValues);
		        allProvidedOptions.set(key, values);
		    }
		    if (allProvidedOptions.has('tls') || allProvidedOptions.has('ssl')) {
		        const tlsAndSslOpts = (allProvidedOptions.get('tls') || [])
		            .concat(allProvidedOptions.get('ssl') || [])
		            .map(getBoolean.bind(null, 'tls/ssl'));
		        if (new Set(tlsAndSslOpts).size !== 1) {
		            throw new error_1.MongoParseError('All values of tls/ssl must be the same.');
		        }
		    }
		    checkTLSOptions(allProvidedOptions);
		    const unsupportedOptions = (0, utils_1.setDifference)(allProvidedKeys, Array.from(Object.keys(exports.OPTIONS)).map(s => s.toLowerCase()));
		    if (unsupportedOptions.size !== 0) {
		        const optionWord = unsupportedOptions.size > 1 ? 'options' : 'option';
		        const isOrAre = unsupportedOptions.size > 1 ? 'are' : 'is';
		        throw new error_1.MongoParseError(`${optionWord} ${Array.from(unsupportedOptions).join(', ')} ${isOrAre} not supported`);
		    }
		    // Option parsing and setting
		    for (const [key, descriptor] of Object.entries(exports.OPTIONS)) {
		        const values = allProvidedOptions.get(key);
		        if (!values || values.length === 0) {
		            if (exports.DEFAULT_OPTIONS.has(key)) {
		                setOption(mongoOptions, key, descriptor, [exports.DEFAULT_OPTIONS.get(key)]);
		            }
		        }
		        else {
		            const { deprecated } = descriptor;
		            if (deprecated) {
		                const deprecatedMsg = typeof deprecated === 'string' ? `: ${deprecated}` : '';
		                (0, utils_1.emitWarning)(`${key} is a deprecated option${deprecatedMsg}`);
		            }
		            setOption(mongoOptions, key, descriptor, values);
		        }
		    }
		    if (mongoOptions.credentials) {
		        const isGssapi = mongoOptions.credentials.mechanism === providers_1.AuthMechanism.MONGODB_GSSAPI;
		        const isX509 = mongoOptions.credentials.mechanism === providers_1.AuthMechanism.MONGODB_X509;
		        const isAws = mongoOptions.credentials.mechanism === providers_1.AuthMechanism.MONGODB_AWS;
		        const isOidc = mongoOptions.credentials.mechanism === providers_1.AuthMechanism.MONGODB_OIDC;
		        if ((isGssapi || isX509) &&
		            allProvidedOptions.has('authSource') &&
		            mongoOptions.credentials.source !== '$external') {
		            // If authSource was explicitly given and its incorrect, we error
		            throw new error_1.MongoParseError(`authMechanism ${mongoOptions.credentials.mechanism} requires an authSource of '$external'`);
		        }
		        if (!(isGssapi || isX509 || isAws || isOidc) &&
		            mongoOptions.dbName &&
		            !allProvidedOptions.has('authSource')) {
		            // inherit the dbName unless GSSAPI or X509, then silently ignore dbName
		            // and there was no specific authSource given
		            mongoOptions.credentials = mongo_credentials_1.MongoCredentials.merge(mongoOptions.credentials, {
		                source: mongoOptions.dbName
		            });
		        }
		        if (isAws) {
		            const { username, password } = mongoOptions.credentials;
		            if (username || password) {
		                throw new error_1.MongoAPIError('username and password cannot be provided when using MONGODB-AWS. Credentials must be provided in a manner that can be read by the AWS SDK.');
		            }
		            if (mongoOptions.credentials.mechanismProperties.AWS_SESSION_TOKEN) {
		                throw new error_1.MongoAPIError('AWS_SESSION_TOKEN cannot be provided when using MONGODB-AWS. Credentials must be provided in a manner that can be read by the AWS SDK.');
		            }
		        }
		        mongoOptions.credentials.validate();
		        // Check if the only auth related option provided was authSource, if so we can remove credentials
		        if (mongoOptions.credentials.password === '' &&
		            mongoOptions.credentials.username === '' &&
		            mongoOptions.credentials.mechanism === providers_1.AuthMechanism.MONGODB_DEFAULT &&
		            Object.keys(mongoOptions.credentials.mechanismProperties).length === 0) {
		            delete mongoOptions.credentials;
		        }
		    }
		    if (!mongoOptions.dbName) {
		        // dbName default is applied here because of the credential validation above
		        mongoOptions.dbName = 'test';
		    }
		    validateLoadBalancedOptions(hosts, mongoOptions, isSRV);
		    if (mongoClient && mongoOptions.autoEncryption) {
		        encrypter_1.Encrypter.checkForMongoCrypt();
		        mongoOptions.encrypter = new encrypter_1.Encrypter(mongoClient, uri, options);
		        mongoOptions.autoEncrypter = mongoOptions.encrypter.autoEncrypter;
		    }
		    // Potential SRV Overrides and SRV connection string validations
		    mongoOptions.userSpecifiedAuthSource =
		        objectOptions.has('authSource') || urlOptions.has('authSource');
		    mongoOptions.userSpecifiedReplicaSet =
		        objectOptions.has('replicaSet') || urlOptions.has('replicaSet');
		    if (isSRV) {
		        // SRV Record is resolved upon connecting
		        mongoOptions.srvHost = hosts[0];
		        if (mongoOptions.directConnection) {
		            throw new error_1.MongoAPIError('SRV URI does not support directConnection');
		        }
		        if (mongoOptions.srvMaxHosts > 0 && typeof mongoOptions.replicaSet === 'string') {
		            throw new error_1.MongoParseError('Cannot use srvMaxHosts option with replicaSet');
		        }
		        // SRV turns on TLS by default, but users can override and turn it off
		        const noUserSpecifiedTLS = !objectOptions.has('tls') && !urlOptions.has('tls');
		        const noUserSpecifiedSSL = !objectOptions.has('ssl') && !urlOptions.has('ssl');
		        if (noUserSpecifiedTLS && noUserSpecifiedSSL) {
		            mongoOptions.tls = true;
		        }
		    }
		    else {
		        const userSpecifiedSrvOptions = urlOptions.has('srvMaxHosts') ||
		            objectOptions.has('srvMaxHosts') ||
		            urlOptions.has('srvServiceName') ||
		            objectOptions.has('srvServiceName');
		        if (userSpecifiedSrvOptions) {
		            throw new error_1.MongoParseError('Cannot use srvMaxHosts or srvServiceName with a non-srv connection string');
		        }
		    }
		    if (mongoOptions.directConnection && mongoOptions.hosts.length !== 1) {
		        throw new error_1.MongoParseError('directConnection option requires exactly one host');
		    }
		    if (!mongoOptions.proxyHost &&
		        (mongoOptions.proxyPort || mongoOptions.proxyUsername || mongoOptions.proxyPassword)) {
		        throw new error_1.MongoParseError('Must specify proxyHost if other proxy options are passed');
		    }
		    if ((mongoOptions.proxyUsername && !mongoOptions.proxyPassword) ||
		        (!mongoOptions.proxyUsername && mongoOptions.proxyPassword)) {
		        throw new error_1.MongoParseError('Can only specify both of proxy username/password or neither');
		    }
		    const proxyOptions = ['proxyHost', 'proxyPort', 'proxyUsername', 'proxyPassword'].map(key => urlOptions.get(key) ?? []);
		    if (proxyOptions.some(options => options.length > 1)) {
		        throw new error_1.MongoParseError('Proxy options cannot be specified multiple times in the connection string');
		    }
		    mongoOptions.mongoLoggerOptions = mongo_logger_1.MongoLogger.resolveOptions({
		        MONGODB_LOG_COMMAND: process.env.MONGODB_LOG_COMMAND,
		        MONGODB_LOG_TOPOLOGY: process.env.MONGODB_LOG_TOPOLOGY,
		        MONGODB_LOG_SERVER_SELECTION: process.env.MONGODB_LOG_SERVER_SELECTION,
		        MONGODB_LOG_CONNECTION: process.env.MONGODB_LOG_CONNECTION,
		        MONGODB_LOG_CLIENT: process.env.MONGODB_LOG_CLIENT,
		        MONGODB_LOG_ALL: process.env.MONGODB_LOG_ALL,
		        MONGODB_LOG_MAX_DOCUMENT_LENGTH: process.env.MONGODB_LOG_MAX_DOCUMENT_LENGTH,
		        MONGODB_LOG_PATH: process.env.MONGODB_LOG_PATH
		    }, {
		        mongodbLogPath: mongoOptions.mongodbLogPath,
		        mongodbLogComponentSeverities: mongoOptions.mongodbLogComponentSeverities,
		        mongodbLogMaxDocumentLength: mongoOptions.mongodbLogMaxDocumentLength
		    });
		    mongoOptions.runtime = (0, runtime_adapters_1.resolveRuntimeAdapters)(options);
		    return mongoOptions;
		}
		/**
		 * #### Throws if LB mode is true:
		 * - hosts contains more than one host
		 * - there is a replicaSet name set
		 * - directConnection is set
		 * - if srvMaxHosts is used when an srv connection string is passed in
		 *
		 * @throws MongoParseError
		 */
		function validateLoadBalancedOptions(hosts, mongoOptions, isSrv) {
		    if (mongoOptions.loadBalanced) {
		        if (hosts.length > 1) {
		            throw new error_1.MongoParseError(LB_SINGLE_HOST_ERROR);
		        }
		        if (mongoOptions.replicaSet) {
		            throw new error_1.MongoParseError(LB_REPLICA_SET_ERROR);
		        }
		        if (mongoOptions.directConnection) {
		            throw new error_1.MongoParseError(LB_DIRECT_CONNECTION_ERROR);
		        }
		        if (isSrv && mongoOptions.srvMaxHosts > 0) {
		            throw new error_1.MongoParseError('Cannot limit srv hosts with loadBalanced enabled');
		        }
		    }
		    return;
		}
		function setOption(mongoOptions, key, descriptor, values) {
		    const { target, type, transform } = descriptor;
		    const name = target ?? key;
		    switch (type) {
		        case 'boolean':
		            mongoOptions[name] = getBoolean(name, values[0]);
		            break;
		        case 'int':
		            mongoOptions[name] = getIntFromOptions(name, values[0]);
		            break;
		        case 'uint':
		            mongoOptions[name] = getUIntFromOptions(name, values[0]);
		            break;
		        case 'string':
		            if (values[0] == null) {
		                break;
		            }
		            // The value should always be a string here, but since the array is typed as unknown
		            // there still needs to be an explicit cast.
		            // eslint-disable-next-line @typescript-eslint/no-base-to-string
		            mongoOptions[name] = String(values[0]);
		            break;
		        case 'record':
		            if (!(0, utils_1.isRecord)(values[0])) {
		                throw new error_1.MongoParseError(`${name} must be an object`);
		            }
		            mongoOptions[name] = values[0];
		            break;
		        case 'any':
		            mongoOptions[name] = values[0];
		            break;
		        default: {
		            if (!transform) {
		                throw new error_1.MongoParseError('Descriptors missing a type must define a transform');
		            }
		            const transformValue = transform({ name, options: mongoOptions, values });
		            mongoOptions[name] = transformValue;
		            break;
		        }
		    }
		}
		exports.OPTIONS = {
		    enableOverloadRetargeting: {
		        default: false,
		        type: 'boolean'
		    },
		    appName: {
		        type: 'string'
		    },
		    auth: {
		        target: 'credentials',
		        transform({ name, options, values: [value] }) {
		            if (!(0, utils_1.isRecord)(value, ['username', 'password'])) {
		                throw new error_1.MongoParseError(`${name} must be an object with 'username' and 'password' properties`);
		            }
		            return mongo_credentials_1.MongoCredentials.merge(options.credentials, {
		                username: value.username,
		                password: value.password
		            });
		        }
		    },
		    authMechanism: {
		        target: 'credentials',
		        transform({ options, values: [value] }) {
		            const mechanisms = Object.values(providers_1.AuthMechanism);
		            const [mechanism] = mechanisms.filter(m => m.match(RegExp(String.raw `\b${value}\b`, 'i')));
		            if (!mechanism) {
		                throw new error_1.MongoParseError(`authMechanism one of ${mechanisms}, got ${value}`);
		            }
		            let source = options.credentials?.source;
		            if (mechanism === providers_1.AuthMechanism.MONGODB_PLAIN ||
		                providers_1.AUTH_MECHS_AUTH_SRC_EXTERNAL.has(mechanism)) {
		                // some mechanisms have '$external' as the Auth Source
		                source = '$external';
		            }
		            let password = options.credentials?.password;
		            if (mechanism === providers_1.AuthMechanism.MONGODB_X509 && password === '') {
		                password = undefined;
		            }
		            return mongo_credentials_1.MongoCredentials.merge(options.credentials, {
		                mechanism,
		                source,
		                password
		            });
		        }
		    },
		    // Note that if the authMechanismProperties contain a TOKEN_RESOURCE that has a
		    // comma in it, it MUST be supplied as a MongoClient option instead of in the
		    // connection string.
		    authMechanismProperties: {
		        target: 'credentials',
		        transform({ options, values }) {
		            // We can have a combination of options passed in the URI and options passed
		            // as an object to the MongoClient. So we must transform the string options
		            // as well as merge them together with a potentially provided object.
		            let mechanismProperties = Object.create(null);
		            for (const optionValue of values) {
		                if (typeof optionValue === 'string') {
		                    for (const [key, value] of entriesFromString(optionValue)) {
		                        try {
		                            mechanismProperties[key] = getBoolean(key, value);
		                        }
		                        catch {
		                            mechanismProperties[key] = value;
		                        }
		                    }
		                }
		                else {
		                    if (!(0, utils_1.isRecord)(optionValue)) {
		                        throw new error_1.MongoParseError('AuthMechanismProperties must be an object');
		                    }
		                    mechanismProperties = { ...optionValue };
		                }
		            }
		            return mongo_credentials_1.MongoCredentials.merge(options.credentials, {
		                mechanismProperties
		            });
		        }
		    },
		    authSource: {
		        target: 'credentials',
		        transform({ options, values: [value] }) {
		            const source = String(value);
		            return mongo_credentials_1.MongoCredentials.merge(options.credentials, { source });
		        }
		    },
		    autoEncryption: {
		        type: 'record'
		    },
		    autoSelectFamily: {
		        type: 'boolean',
		        default: true
		    },
		    autoSelectFamilyAttemptTimeout: {
		        type: 'uint'
		    },
		    bsonRegExp: {
		        type: 'boolean'
		    },
		    serverApi: {
		        target: 'serverApi',
		        transform({ values: [version] }) {
		            const serverApiToValidate = typeof version === 'string' ? { version } : version;
		            const versionToValidate = serverApiToValidate && serverApiToValidate.version;
		            if (!versionToValidate) {
		                throw new error_1.MongoParseError(`Invalid \`serverApi\` property; must specify a version from the following enum: ["${Object.values(mongo_client_1.ServerApiVersion).join('", "')}"]`);
		            }
		            if (!Object.values(mongo_client_1.ServerApiVersion).some(v => v === versionToValidate)) {
		                throw new error_1.MongoParseError(`Invalid server API version=${versionToValidate}; must be in the following enum: ["${Object.values(mongo_client_1.ServerApiVersion).join('", "')}"]`);
		            }
		            return serverApiToValidate;
		        }
		    },
		    checkKeys: {
		        type: 'boolean'
		    },
		    compressors: {
		        default: 'none',
		        target: 'compressors',
		        transform({ values }) {
		            const compressionList = new Set();
		            for (const compVal of values) {
		                const compValArray = typeof compVal === 'string' ? compVal.split(',') : compVal;
		                if (!Array.isArray(compValArray)) {
		                    throw new error_1.MongoInvalidArgumentError('compressors must be an array or a comma-delimited list of strings');
		                }
		                for (const c of compValArray) {
		                    if (Object.keys(compression_1.Compressor).includes(String(c))) {
		                        compressionList.add(String(c));
		                    }
		                    else {
		                        throw new error_1.MongoInvalidArgumentError(`${c} is not a valid compression mechanism. Must be one of: ${Object.keys(compression_1.Compressor)}.`);
		                    }
		                }
		            }
		            return [...compressionList];
		        }
		    },
		    connectTimeoutMS: {
		        default: 30000,
		        type: 'uint'
		    },
		    dbName: {
		        type: 'string'
		    },
		    directConnection: {
		        default: false,
		        type: 'boolean'
		    },
		    driverInfo: {
		        default: {},
		        type: 'record'
		    },
		    enableUtf8Validation: { type: 'boolean', default: true },
		    family: {
		        transform({ name, values: [value] }) {
		            const transformValue = getIntFromOptions(name, value);
		            if (transformValue === 4 || transformValue === 6) {
		                return transformValue;
		            }
		            throw new error_1.MongoParseError(`Option 'family' must be 4 or 6 got ${transformValue}.`);
		        }
		    },
		    fieldsAsRaw: {
		        type: 'record'
		    },
		    forceServerObjectId: {
		        default: false,
		        type: 'boolean'
		    },
		    fsync: {
		        deprecated: 'Please use journal instead',
		        target: 'writeConcern',
		        transform({ name, options, values: [value] }) {
		            const wc = write_concern_1.WriteConcern.fromOptions({
		                writeConcern: {
		                    ...options.writeConcern,
		                    fsync: getBoolean(name, value)
		                }
		            });
		            if (!wc)
		                throw new error_1.MongoParseError(`Unable to make a writeConcern from fsync=${value}`);
		            return wc;
		        }
		    },
		    heartbeatFrequencyMS: {
		        default: 10000,
		        type: 'uint'
		    },
		    ignoreUndefined: {
		        type: 'boolean'
		    },
		    j: {
		        deprecated: 'Please use journal instead',
		        target: 'writeConcern',
		        transform({ name, options, values: [value] }) {
		            const wc = write_concern_1.WriteConcern.fromOptions({
		                writeConcern: {
		                    ...options.writeConcern,
		                    journal: getBoolean(name, value)
		                }
		            });
		            if (!wc)
		                throw new error_1.MongoParseError(`Unable to make a writeConcern from journal=${value}`);
		            return wc;
		        }
		    },
		    journal: {
		        target: 'writeConcern',
		        transform({ name, options, values: [value] }) {
		            const wc = write_concern_1.WriteConcern.fromOptions({
		                writeConcern: {
		                    ...options.writeConcern,
		                    journal: getBoolean(name, value)
		                }
		            });
		            if (!wc)
		                throw new error_1.MongoParseError(`Unable to make a writeConcern from journal=${value}`);
		            return wc;
		        }
		    },
		    loadBalanced: {
		        default: false,
		        type: 'boolean'
		    },
		    localThresholdMS: {
		        default: 15,
		        type: 'uint'
		    },
		    maxAdaptiveRetries: {
		        default: 2,
		        type: 'uint'
		    },
		    maxConnecting: {
		        default: 2,
		        transform({ name, values: [value] }) {
		            const maxConnecting = getUIntFromOptions(name, value);
		            if (maxConnecting === 0) {
		                throw new error_1.MongoInvalidArgumentError('maxConnecting must be > 0 if specified');
		            }
		            return maxConnecting;
		        }
		    },
		    maxIdleTimeMS: {
		        default: 0,
		        type: 'uint'
		    },
		    maxPoolSize: {
		        default: 100,
		        type: 'uint'
		    },
		    maxStalenessSeconds: {
		        target: 'readPreference',
		        transform({ name, options, values: [value] }) {
		            const maxStalenessSeconds = getUIntFromOptions(name, value);
		            if (options.readPreference) {
		                return read_preference_1.ReadPreference.fromOptions({
		                    readPreference: { ...options.readPreference, maxStalenessSeconds }
		                });
		            }
		            else {
		                return new read_preference_1.ReadPreference('secondary', undefined, { maxStalenessSeconds });
		            }
		        }
		    },
		    minInternalBufferSize: {
		        type: 'uint'
		    },
		    minPoolSize: {
		        default: 0,
		        type: 'uint'
		    },
		    minHeartbeatFrequencyMS: {
		        default: 500,
		        type: 'uint'
		    },
		    monitorCommands: {
		        default: false,
		        type: 'boolean'
		    },
		    name: {
		        target: 'driverInfo',
		        transform({ values: [value], options }) {
		            return { ...options.driverInfo, name: String(value) };
		        }
		    },
		    noDelay: {
		        default: true,
		        type: 'boolean'
		    },
		    pkFactory: {
		        default: utils_1.DEFAULT_PK_FACTORY,
		        transform({ values: [value] }) {
		            if ((0, utils_1.isRecord)(value, ['createPk']) && typeof value.createPk === 'function') {
		                return value;
		            }
		            throw new error_1.MongoParseError(`Option pkFactory must be an object with a createPk function, got ${value}`);
		        }
		    },
		    promoteBuffers: {
		        type: 'boolean'
		    },
		    promoteLongs: {
		        type: 'boolean'
		    },
		    promoteValues: {
		        type: 'boolean'
		    },
		    useBigInt64: {
		        type: 'boolean'
		    },
		    proxyHost: {
		        type: 'string'
		    },
		    proxyPassword: {
		        type: 'string'
		    },
		    proxyPort: {
		        type: 'uint'
		    },
		    proxyUsername: {
		        type: 'string'
		    },
		    raw: {
		        default: false,
		        type: 'boolean'
		    },
		    readConcern: {
		        transform({ values: [value], options }) {
		            if (value instanceof read_concern_1.ReadConcern || (0, utils_1.isRecord)(value, ['level'])) {
		                return read_concern_1.ReadConcern.fromOptions({ ...options.readConcern, ...value });
		            }
		            throw new error_1.MongoParseError(`ReadConcern must be an object, got ${JSON.stringify(value)}`);
		        }
		    },
		    readConcernLevel: {
		        target: 'readConcern',
		        transform({ values: [level], options }) {
		            return read_concern_1.ReadConcern.fromOptions({
		                ...options.readConcern,
		                level: level
		            });
		        }
		    },
		    readPreference: {
		        default: read_preference_1.ReadPreference.primary,
		        transform({ values: [value], options }) {
		            if (value instanceof read_preference_1.ReadPreference) {
		                return read_preference_1.ReadPreference.fromOptions({
		                    readPreference: { ...options.readPreference, ...value },
		                    ...value
		                });
		            }
		            if ((0, utils_1.isRecord)(value, ['mode'])) {
		                const rp = read_preference_1.ReadPreference.fromOptions({
		                    readPreference: { ...options.readPreference, ...value },
		                    ...value
		                });
		                if (rp)
		                    return rp;
		                else
		                    throw new error_1.MongoParseError(`Cannot make read preference from ${JSON.stringify(value)}`);
		            }
		            if (typeof value === 'string') {
		                const rpOpts = {
		                    hedge: options.readPreference?.hedge,
		                    maxStalenessSeconds: options.readPreference?.maxStalenessSeconds
		                };
		                return new read_preference_1.ReadPreference(value, options.readPreference?.tags, rpOpts);
		            }
		            throw new error_1.MongoParseError(`Unknown ReadPreference value: ${value}`);
		        }
		    },
		    readPreferenceTags: {
		        target: 'readPreference',
		        transform({ values, options }) {
		            const tags = Array.isArray(values[0])
		                ? values[0]
		                : values;
		            const readPreferenceTags = [];
		            for (const tag of tags) {
		                const readPreferenceTag = Object.create(null);
		                if (typeof tag === 'string') {
		                    for (const [k, v] of entriesFromString(tag)) {
		                        readPreferenceTag[k] = v;
		                    }
		                }
		                if ((0, utils_1.isRecord)(tag)) {
		                    for (const [k, v] of Object.entries(tag)) {
		                        readPreferenceTag[k] = v;
		                    }
		                }
		                readPreferenceTags.push(readPreferenceTag);
		            }
		            return read_preference_1.ReadPreference.fromOptions({
		                readPreference: options.readPreference,
		                readPreferenceTags
		            });
		        }
		    },
		    replicaSet: {
		        type: 'string'
		    },
		    retryReads: {
		        default: true,
		        type: 'boolean'
		    },
		    retryWrites: {
		        default: true,
		        type: 'boolean'
		    },
		    runtimeAdapters: {
		        type: 'record'
		    },
		    serializeFunctions: {
		        type: 'boolean'
		    },
		    serverMonitoringMode: {
		        default: 'auto',
		        transform({ values: [value] }) {
		            if (!Object.values(monitor_1.ServerMonitoringMode).includes(value)) {
		                throw new error_1.MongoParseError('serverMonitoringMode must be one of `auto`, `poll`, or `stream`');
		            }
		            return value;
		        }
		    },
		    serverSelectionTimeoutMS: {
		        default: 30000,
		        type: 'uint'
		    },
		    servername: {
		        type: 'string'
		    },
		    socketTimeoutMS: {
		        // TODO(NODE-6491): deprecated: 'Please use timeoutMS instead',
		        default: 0,
		        type: 'uint'
		    },
		    srvMaxHosts: {
		        type: 'uint',
		        default: 0
		    },
		    srvServiceName: {
		        type: 'string',
		        default: 'mongodb'
		    },
		    ssl: {
		        target: 'tls',
		        type: 'boolean'
		    },
		    timeoutMS: {
		        type: 'uint'
		    },
		    tls: {
		        type: 'boolean'
		    },
		    tlsAllowInvalidCertificates: {
		        target: 'rejectUnauthorized',
		        transform({ name, values: [value] }) {
		            // allowInvalidCertificates is the inverse of rejectUnauthorized
		            return !getBoolean(name, value);
		        }
		    },
		    tlsAllowInvalidHostnames: {
		        target: 'checkServerIdentity',
		        transform({ name, values: [value] }) {
		            // tlsAllowInvalidHostnames means setting the checkServerIdentity function to a noop
		            return getBoolean(name, value) ? () => undefined : undefined;
		        }
		    },
		    tlsCAFile: {
		        type: 'string'
		    },
		    tlsCRLFile: {
		        type: 'string'
		    },
		    tlsCertificateKeyFile: {
		        type: 'string'
		    },
		    tlsCertificateKeyFilePassword: {
		        target: 'passphrase',
		        type: 'any'
		    },
		    tlsInsecure: {
		        transform({ name, options, values: [value] }) {
		            const tlsInsecure = getBoolean(name, value);
		            if (tlsInsecure) {
		                options.checkServerIdentity = () => undefined;
		                options.rejectUnauthorized = false;
		            }
		            else {
		                options.checkServerIdentity = options.tlsAllowInvalidHostnames
		                    ? () => undefined
		                    : undefined;
		                options.rejectUnauthorized = options.tlsAllowInvalidCertificates ? false : true;
		            }
		            return tlsInsecure;
		        }
		    },
		    w: {
		        target: 'writeConcern',
		        transform({ values: [value], options }) {
		            return write_concern_1.WriteConcern.fromOptions({ writeConcern: { ...options.writeConcern, w: value } });
		        }
		    },
		    waitQueueTimeoutMS: {
		        // TODO(NODE-6491): deprecated: 'Please use timeoutMS instead',
		        default: 0,
		        type: 'uint'
		    },
		    writeConcern: {
		        target: 'writeConcern',
		        transform({ values: [value], options }) {
		            if ((0, utils_1.isRecord)(value) || value instanceof write_concern_1.WriteConcern) {
		                return write_concern_1.WriteConcern.fromOptions({
		                    writeConcern: {
		                        ...options.writeConcern,
		                        ...value
		                    }
		                });
		            }
		            else if (value === 'majority' || typeof value === 'number') {
		                return write_concern_1.WriteConcern.fromOptions({
		                    writeConcern: {
		                        ...options.writeConcern,
		                        w: value
		                    }
		                });
		            }
		            throw new error_1.MongoParseError(`Invalid WriteConcern cannot parse: ${JSON.stringify(value)}`);
		        }
		    },
		    wtimeout: {
		        deprecated: 'Please use wtimeoutMS instead',
		        target: 'writeConcern',
		        transform({ values: [value], options }) {
		            const wc = write_concern_1.WriteConcern.fromOptions({
		                writeConcern: {
		                    ...options.writeConcern,
		                    wtimeout: getUIntFromOptions('wtimeout', value)
		                }
		            });
		            if (wc)
		                return wc;
		            throw new error_1.MongoParseError(`Cannot make WriteConcern from wtimeout`);
		        }
		    },
		    wtimeoutMS: {
		        target: 'writeConcern',
		        transform({ values: [value], options }) {
		            const wc = write_concern_1.WriteConcern.fromOptions({
		                writeConcern: {
		                    ...options.writeConcern,
		                    wtimeoutMS: getUIntFromOptions('wtimeoutMS', value)
		                }
		            });
		            if (wc)
		                return wc;
		            throw new error_1.MongoParseError(`Cannot make WriteConcern from wtimeout`);
		        }
		    },
		    zlibCompressionLevel: {
		        default: 0,
		        type: 'int'
		    },
		    mongodbLogPath: {
		        transform({ values: [value] }) {
		            if (!((typeof value === 'string' && ['stderr', 'stdout'].includes(value)) ||
		                (value &&
		                    typeof value === 'object' &&
		                    'write' in value &&
		                    typeof value.write === 'function'))) {
		                throw new error_1.MongoAPIError(`Option 'mongodbLogPath' must be of type 'stderr' | 'stdout' | MongoDBLogWritable`);
		            }
		            return value;
		        }
		    },
		    mongodbLogComponentSeverities: {
		        transform({ values: [value] }) {
		            if (typeof value !== 'object' || !value) {
		                throw new error_1.MongoAPIError(`Option 'mongodbLogComponentSeverities' must be a non-null object`);
		            }
		            for (const [k, v] of Object.entries(value)) {
		                if (typeof v !== 'string' || typeof k !== 'string') {
		                    throw new error_1.MongoAPIError(`User input for option 'mongodbLogComponentSeverities' object cannot include a non-string key or value`);
		                }
		                if (!Object.values(mongo_logger_1.MongoLoggableComponent).some(val => val === k) && k !== 'default') {
		                    throw new error_1.MongoAPIError(`User input for option 'mongodbLogComponentSeverities' contains invalid key: ${k}`);
		                }
		                if (!Object.values(mongo_logger_1.SeverityLevel).some(val => val === v)) {
		                    throw new error_1.MongoAPIError(`Option 'mongodbLogComponentSeverities' does not support ${v} as a value for ${k}`);
		                }
		            }
		            return value;
		        }
		    },
		    mongodbLogMaxDocumentLength: { type: 'uint' },
		    // Custom types for modifying core behavior
		    connectionType: { type: 'any' },
		    srvPoller: { type: 'any' },
		    // Accepted Node.js Options
		    allowPartialTrustChain: { type: 'any' },
		    minDHSize: { type: 'any' },
		    pskCallback: { type: 'any' },
		    secureContext: { type: 'any' },
		    enableTrace: { type: 'any' },
		    requestCert: { type: 'any' },
		    rejectUnauthorized: { type: 'any' },
		    checkServerIdentity: { type: 'any' },
		    keepAliveInitialDelay: { type: 'any' },
		    ALPNProtocols: { type: 'any' },
		    SNICallback: { type: 'any' },
		    session: { type: 'any' },
		    requestOCSP: { type: 'any' },
		    localAddress: { type: 'any' },
		    localPort: { type: 'any' },
		    hints: { type: 'any' },
		    lookup: { type: 'any' },
		    ca: { type: 'any' },
		    cert: { type: 'any' },
		    ciphers: { type: 'any' },
		    crl: { type: 'any' },
		    ecdhCurve: { type: 'any' },
		    key: { type: 'any' },
		    passphrase: { type: 'any' },
		    pfx: { type: 'any' },
		    secureProtocol: { type: 'any' },
		    index: { type: 'any' },
		    // Legacy options from v3 era
		    __skipPingOnConnect: { type: 'boolean' }
		};
		exports.DEFAULT_OPTIONS = new CaseInsensitiveMap(Object.entries(exports.OPTIONS)
		    .filter(([, descriptor]) => descriptor.default != null)
		    .map(([k, d]) => [k, d.default]));
		
	} (connection_string));
	return connection_string;
}

var client_bulk_write_cursor = {};

var hasRequiredClient_bulk_write_cursor;

function requireClient_bulk_write_cursor () {
	if (hasRequiredClient_bulk_write_cursor) return client_bulk_write_cursor;
	hasRequiredClient_bulk_write_cursor = 1;
	Object.defineProperty(client_bulk_write_cursor, "__esModule", { value: true });
	client_bulk_write_cursor.ClientBulkWriteCursor = void 0;
	const client_bulk_write_1 = mongodb5.requireClient_bulk_write();
	const execute_operation_1 = mongodb5.requireExecute_operation();
	const utils_1 = mongodb7.requireUtils();
	const abstract_cursor_1 = requireAbstract_cursor();
	/**
	 * This is the cursor that handles client bulk write operations. Note this is never
	 * exposed directly to the user and is always immediately exhausted.
	 * @internal
	 */
	class ClientBulkWriteCursor extends abstract_cursor_1.AbstractCursor {
	    /** @internal */
	    constructor(client, commandBuilder, options = {}) {
	        super(client, new utils_1.MongoDBNamespace('admin', '$cmd'), options);
	        this.commandBuilder = commandBuilder;
	        this.clientBulkWriteOptions = options;
	    }
	    /**
	     * We need a way to get the top level cursor response fields for
	     * generating the bulk write result, so we expose this here.
	     */
	    get response() {
	        if (this.cursorResponse)
	            return this.cursorResponse;
	        return null;
	    }
	    get operations() {
	        return this.commandBuilder.lastOperations;
	    }
	    clone() {
	        const clonedOptions = (0, utils_1.mergeOptions)({}, this.clientBulkWriteOptions);
	        delete clonedOptions.session;
	        return new ClientBulkWriteCursor(this.client, this.commandBuilder, {
	            ...clonedOptions
	        });
	    }
	    /** @internal */
	    async _initialize(session) {
	        const clientBulkWriteOperation = new client_bulk_write_1.ClientBulkWriteOperation(this.commandBuilder, {
	            ...this.clientBulkWriteOptions,
	            ...this.cursorOptions,
	            session
	        });
	        const response = await (0, execute_operation_1.executeOperation)(this.client, clientBulkWriteOperation, this.timeoutContext);
	        this.cursorResponse = response;
	        return { server: clientBulkWriteOperation.server, session, response };
	    }
	}
	client_bulk_write_cursor.ClientBulkWriteCursor = ClientBulkWriteCursor;
	
	return client_bulk_write_cursor;
}

exports.requireAbstract_cursor = requireAbstract_cursor;
exports.requireAggregation_cursor = requireAggregation_cursor;
exports.requireChange_stream_cursor = requireChange_stream_cursor;
exports.requireClient_bulk_write_cursor = requireClient_bulk_write_cursor;
exports.requireCollection = requireCollection;
exports.requireConnection_string = requireConnection_string;
exports.requireConstants = requireConstants;
exports.requireExplainable_cursor = requireExplainable_cursor;
exports.requireFind_cursor = requireFind_cursor;
exports.requireList_collections_cursor = requireList_collections_cursor;
exports.requireList_indexes_cursor = requireList_indexes_cursor;
exports.requireResponses = requireResponses;
exports.requireRun_command_cursor = requireRun_command_cursor;
exports.requireShared = requireShared;
