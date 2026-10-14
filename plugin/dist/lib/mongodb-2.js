'use strict';

const require$$0 = require('process');
const mongodb1 = require('./mongodb-1.js');
const mongodb4 = require('./mongodb-4.js');
const mongodb7 = require('./mongodb-7.js');
const require$$0$1 = require('zlib');
const require$$0$2 = require('timers');
const mongodb3 = require('./mongodb-3.js');
const mongodb5 = require('./mongodb-5.js');
const mongodb6 = require('./mongodb-6.js');
const require$$0$4 = require('net');
const require$$3 = require('tls');
const require$$0$3 = require('stream');
const require$$0$6 = require('fs/promises');
const require$$0$7 = require('fs');
const require$$0$5 = require('timers/promises');
const mongodbJsSaslprep1 = require('./mongodb-js-saslprep-1.js');

var constants = {};

var hasRequiredConstants;

function requireConstants () {
	if (hasRequiredConstants) return constants;
	hasRequiredConstants = 1;
	Object.defineProperty(constants, "__esModule", { value: true });
	constants.OP_MSG = constants.OP_COMPRESSED = constants.OP_DELETE = constants.OP_QUERY = constants.OP_INSERT = constants.OP_UPDATE = constants.OP_REPLY = constants.MIN_SUPPORTED_RAW_DATA_SERVER_VERSION = constants.MIN_SUPPORTED_RAW_DATA_WIRE_VERSION = constants.MIN_SUPPORTED_QE_SERVER_VERSION = constants.MIN_SUPPORTED_QE_WIRE_VERSION = constants.MAX_SUPPORTED_WIRE_VERSION = constants.MIN_SUPPORTED_WIRE_VERSION = constants.MIN_SUPPORTED_SNAPSHOT_READS_SERVER_VERSION = constants.MIN_SUPPORTED_SNAPSHOT_READS_WIRE_VERSION = constants.MAX_SUPPORTED_SERVER_VERSION = constants.MIN_SUPPORTED_SERVER_VERSION = void 0;
	constants.MIN_SUPPORTED_SERVER_VERSION = '4.2';
	constants.MAX_SUPPORTED_SERVER_VERSION = '8.2';
	constants.MIN_SUPPORTED_SNAPSHOT_READS_WIRE_VERSION = 13;
	constants.MIN_SUPPORTED_SNAPSHOT_READS_SERVER_VERSION = '5.0';
	constants.MIN_SUPPORTED_WIRE_VERSION = 8;
	constants.MAX_SUPPORTED_WIRE_VERSION = 27;
	constants.MIN_SUPPORTED_QE_WIRE_VERSION = 21;
	constants.MIN_SUPPORTED_QE_SERVER_VERSION = '7.0';
	constants.MIN_SUPPORTED_RAW_DATA_WIRE_VERSION = 27;
	constants.MIN_SUPPORTED_RAW_DATA_SERVER_VERSION = '8.2';
	constants.OP_REPLY = 1;
	constants.OP_UPDATE = 2001;
	constants.OP_INSERT = 2002;
	constants.OP_QUERY = 2004;
	constants.OP_DELETE = 2006;
	constants.OP_COMPRESSED = 2012;
	constants.OP_MSG = 2013;
	
	return constants;
}

var metrics = {};

var hasRequiredMetrics;

function requireMetrics () {
	if (hasRequiredMetrics) return metrics;
	hasRequiredMetrics = 1;
	Object.defineProperty(metrics, "__esModule", { value: true });
	metrics.ConnectionPoolMetrics = void 0;
	/** @internal */
	class ConnectionPoolMetrics {
	    constructor() {
	        this.txnConnections = 0;
	        this.cursorConnections = 0;
	        this.otherConnections = 0;
	    }
	    static { this.TXN = 'txn'; }
	    static { this.CURSOR = 'cursor'; }
	    static { this.OTHER = 'other'; }
	    /**
	     * Mark a connection as pinned for a specific operation.
	     */
	    markPinned(pinType) {
	        if (pinType === ConnectionPoolMetrics.TXN) {
	            this.txnConnections += 1;
	        }
	        else if (pinType === ConnectionPoolMetrics.CURSOR) {
	            this.cursorConnections += 1;
	        }
	        else {
	            this.otherConnections += 1;
	        }
	    }
	    /**
	     * Unmark a connection as pinned for an operation.
	     */
	    markUnpinned(pinType) {
	        if (pinType === ConnectionPoolMetrics.TXN) {
	            this.txnConnections -= 1;
	        }
	        else if (pinType === ConnectionPoolMetrics.CURSOR) {
	            this.cursorConnections -= 1;
	        }
	        else {
	            this.otherConnections -= 1;
	        }
	    }
	    /**
	     * Return information about the cmap metrics as a string.
	     */
	    info(maxPoolSize) {
	        return ('Timed out while checking out a connection from connection pool: ' +
	            `maxPoolSize: ${maxPoolSize}, ` +
	            `connections in use by cursors: ${this.cursorConnections}, ` +
	            `connections in use by transactions: ${this.txnConnections}, ` +
	            `connections in use by other operations: ${this.otherConnections}`);
	    }
	    /**
	     * Reset the metrics to the initial values.
	     */
	    reset() {
	        this.txnConnections = 0;
	        this.cursorConnections = 0;
	        this.otherConnections = 0;
	    }
	}
	metrics.ConnectionPoolMetrics = ConnectionPoolMetrics;
	
	return metrics;
}

var providers = {};

var hasRequiredProviders;

function requireProviders () {
	if (hasRequiredProviders) return providers;
	hasRequiredProviders = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.AUTH_MECHS_AUTH_SRC_EXTERNAL = exports.AuthMechanism = void 0;
		/** @public */
		exports.AuthMechanism = Object.freeze({
		    MONGODB_AWS: 'MONGODB-AWS',
		    MONGODB_DEFAULT: 'DEFAULT',
		    MONGODB_GSSAPI: 'GSSAPI',
		    MONGODB_PLAIN: 'PLAIN',
		    MONGODB_SCRAM_SHA1: 'SCRAM-SHA-1',
		    MONGODB_SCRAM_SHA256: 'SCRAM-SHA-256',
		    MONGODB_X509: 'MONGODB-X509',
		    MONGODB_OIDC: 'MONGODB-OIDC'
		});
		/** @internal */
		exports.AUTH_MECHS_AUTH_SRC_EXTERNAL = new Set([
		    exports.AuthMechanism.MONGODB_GSSAPI,
		    exports.AuthMechanism.MONGODB_AWS,
		    exports.AuthMechanism.MONGODB_OIDC,
		    exports.AuthMechanism.MONGODB_X509
		]);
		
	} (providers));
	return providers;
}

var client_metadata = {};

var hasRequiredClient_metadata;

function requireClient_metadata () {
	if (hasRequiredClient_metadata) return client_metadata;
	hasRequiredClient_metadata = 1;
	Object.defineProperty(client_metadata, "__esModule", { value: true });
	client_metadata.LimitedSizeDocument = void 0;
	client_metadata.isDriverInfoEqual = isDriverInfoEqual;
	client_metadata.makeClientMetadata = makeClientMetadata;
	client_metadata.getFAASEnv = getFAASEnv;
	const process = require$$0;
	const bson_1 = mongodb1.requireBson();
	const error_1 = mongodb4.requireError();
	const utils_1 = mongodb7.requireUtils();
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const NODE_DRIVER_VERSION = mongodb7.require$$4.version;
	/** @internal */
	function isDriverInfoEqual(info1, info2) {
	    /** for equality comparison, we consider "" as unset */
	    const nonEmptyCmp = (s1, s2) => {
	        s1 ||= undefined;
	        s2 ||= undefined;
	        return s1 === s2;
	    };
	    return (nonEmptyCmp(info1.name, info2.name) &&
	        nonEmptyCmp(info1.platform, info2.platform) &&
	        nonEmptyCmp(info1.version, info2.version));
	}
	/** @internal */
	class LimitedSizeDocument {
	    constructor(maxSize) {
	        this.document = new Map();
	        /** BSON overhead: Int32 + Null byte */
	        this.documentSize = 5;
	        this.maxSize = maxSize;
	    }
	    /** Only adds key/value if the bsonByteLength is less than MAX_SIZE */
	    ifItFitsItSits(key, value) {
	        // The BSON byteLength of the new element is the same as serializing it to its own document
	        // subtracting the document size int32 and the null terminator.
	        const newElementSize = bson_1.BSON.serialize(new Map().set(key, value)).byteLength - 5;
	        if (newElementSize + this.documentSize > this.maxSize) {
	            return false;
	        }
	        this.documentSize += newElementSize;
	        this.document.set(key, value);
	        return true;
	    }
	    toObject() {
	        return bson_1.BSON.deserialize(bson_1.BSON.serialize(this.document), {
	            promoteLongs: false,
	            promoteBuffers: false,
	            promoteValues: false,
	            useBigInt64: false
	        });
	    }
	}
	client_metadata.LimitedSizeDocument = LimitedSizeDocument;
	/**
	 * From the specs:
	 * Implementors SHOULD cumulatively update fields in the following order until the document is under the size limit:
	 * 1. Omit fields from `env` except `env.name`.
	 * 2. Omit fields from `os` except `os.type`.
	 * 3. Omit the `env` document entirely.
	 * 4. Truncate `platform`. -- special we do not truncate this field
	 */
	async function makeClientMetadata(driverInfoList, { appName = '', runtime: { os } }) {
	    const metadataDocument = new LimitedSizeDocument(512);
	    // Add app name first, it must be sent
	    if (appName.length > 0) {
	        const name = bson_1.ByteUtils.utf8ByteLength(appName) <= 128
	            ? appName
	            : bson_1.ByteUtils.toUTF8(bson_1.ByteUtils.fromUTF8(appName), 0, 128, false);
	        metadataDocument.ifItFitsItSits('application', { name });
	    }
	    const driverInfo = {
	        name: 'nodejs',
	        version: NODE_DRIVER_VERSION
	    };
	    // This is where we handle additional driver info added after client construction.
	    for (const { name: n = '', version: v = '' } of driverInfoList) {
	        if (n.length > 0) {
	            driverInfo.name = `${driverInfo.name}|${n}`;
	        }
	        if (v.length > 0) {
	            driverInfo.version = `${driverInfo.version}|${v}`;
	        }
	    }
	    if (!metadataDocument.ifItFitsItSits('driver', driverInfo)) {
	        throw new error_1.MongoInvalidArgumentError('Unable to include driverInfo name and version, metadata cannot exceed 512 bytes');
	    }
	    let runtimeInfo = getRuntimeInfo();
	    // This is where we handle additional driver info added after client construction.
	    for (const { platform = '' } of driverInfoList) {
	        if (platform.length > 0) {
	            runtimeInfo = `${runtimeInfo}|${platform}`;
	        }
	    }
	    if (!metadataDocument.ifItFitsItSits('platform', runtimeInfo)) {
	        throw new error_1.MongoInvalidArgumentError('Unable to include driverInfo platform, metadata cannot exceed 512 bytes');
	    }
	    // Note: order matters, os.type is last so it will be removed last if we're at maxSize
	    const osInfo = new Map()
	        .set('name', os.platform())
	        .set('architecture', os.arch())
	        .set('version', os.release())
	        .set('type', os.type());
	    if (!metadataDocument.ifItFitsItSits('os', osInfo)) {
	        for (const key of osInfo.keys()) {
	            osInfo.delete(key);
	            if (osInfo.size === 0)
	                break;
	            if (metadataDocument.ifItFitsItSits('os', osInfo))
	                break;
	        }
	    }
	    const faasEnv = getFAASEnv();
	    if (faasEnv != null) {
	        if (!metadataDocument.ifItFitsItSits('env', faasEnv)) {
	            for (const key of faasEnv.keys()) {
	                faasEnv.delete(key);
	                if (faasEnv.size === 0)
	                    break;
	                if (metadataDocument.ifItFitsItSits('env', faasEnv))
	                    break;
	            }
	        }
	    }
	    return await addContainerMetadata(metadataDocument.toObject());
	}
	let dockerPromise;
	/** @internal */
	async function getContainerMetadata() {
	    dockerPromise ??= (0, utils_1.fileIsAccessible)('/.dockerenv');
	    const isDocker = await dockerPromise;
	    const { KUBERNETES_SERVICE_HOST = '' } = process.env;
	    const isKubernetes = KUBERNETES_SERVICE_HOST.length > 0 ? true : false;
	    const containerMetadata = {};
	    if (isDocker)
	        containerMetadata.runtime = 'docker';
	    if (isKubernetes)
	        containerMetadata.orchestrator = 'kubernetes';
	    return containerMetadata;
	}
	/**
	 * @internal
	 * Re-add each metadata value.
	 * Attempt to add new env container metadata, but keep old data if it does not fit.
	 */
	async function addContainerMetadata(originalMetadata) {
	    const containerMetadata = await getContainerMetadata();
	    if (Object.keys(containerMetadata).length === 0)
	        return originalMetadata;
	    const extendedMetadata = new LimitedSizeDocument(512);
	    const extendedEnvMetadata = {
	        ...originalMetadata?.env,
	        container: containerMetadata
	    };
	    for (const [key, val] of Object.entries(originalMetadata)) {
	        if (key !== 'env') {
	            extendedMetadata.ifItFitsItSits(key, val);
	        }
	        else {
	            if (!extendedMetadata.ifItFitsItSits('env', extendedEnvMetadata)) {
	                // add in old data if newer / extended metadata does not fit
	                extendedMetadata.ifItFitsItSits('env', val);
	            }
	        }
	    }
	    if (!('env' in originalMetadata)) {
	        extendedMetadata.ifItFitsItSits('env', extendedEnvMetadata);
	    }
	    return extendedMetadata.toObject();
	}
	/**
	 * Collects FaaS metadata.
	 * - `name` MUST be the last key in the Map returned.
	 */
	function getFAASEnv() {
	    const { AWS_EXECUTION_ENV = '', AWS_LAMBDA_RUNTIME_API = '', FUNCTIONS_WORKER_RUNTIME = '', K_SERVICE = '', FUNCTION_NAME = '', VERCEL = '', AWS_LAMBDA_FUNCTION_MEMORY_SIZE = '', AWS_REGION = '', FUNCTION_MEMORY_MB = '', FUNCTION_REGION = '', FUNCTION_TIMEOUT_SEC = '', VERCEL_REGION = '' } = process.env;
	    const isAWSFaaS = AWS_EXECUTION_ENV.startsWith('AWS_Lambda_') || AWS_LAMBDA_RUNTIME_API.length > 0;
	    const isAzureFaaS = FUNCTIONS_WORKER_RUNTIME.length > 0;
	    const isGCPFaaS = K_SERVICE.length > 0 || FUNCTION_NAME.length > 0;
	    const isVercelFaaS = VERCEL.length > 0;
	    // Note: order matters, name must always be the last key
	    const faasEnv = new Map();
	    // When isVercelFaaS is true so is isAWSFaaS; Vercel inherits the AWS env
	    if (isVercelFaaS && !(isAzureFaaS || isGCPFaaS)) {
	        if (VERCEL_REGION.length > 0) {
	            faasEnv.set('region', VERCEL_REGION);
	        }
	        faasEnv.set('name', 'vercel');
	        return faasEnv;
	    }
	    if (isAWSFaaS && !(isAzureFaaS || isGCPFaaS || isVercelFaaS)) {
	        if (AWS_REGION.length > 0) {
	            faasEnv.set('region', AWS_REGION);
	        }
	        if (AWS_LAMBDA_FUNCTION_MEMORY_SIZE.length > 0 &&
	            Number.isInteger(+AWS_LAMBDA_FUNCTION_MEMORY_SIZE)) {
	            faasEnv.set('memory_mb', new bson_1.Int32(AWS_LAMBDA_FUNCTION_MEMORY_SIZE));
	        }
	        faasEnv.set('name', 'aws.lambda');
	        return faasEnv;
	    }
	    if (isAzureFaaS && !(isGCPFaaS || isAWSFaaS || isVercelFaaS)) {
	        faasEnv.set('name', 'azure.func');
	        return faasEnv;
	    }
	    if (isGCPFaaS && !(isAzureFaaS || isAWSFaaS || isVercelFaaS)) {
	        if (FUNCTION_REGION.length > 0) {
	            faasEnv.set('region', FUNCTION_REGION);
	        }
	        if (FUNCTION_MEMORY_MB.length > 0 && Number.isInteger(+FUNCTION_MEMORY_MB)) {
	            faasEnv.set('memory_mb', new bson_1.Int32(FUNCTION_MEMORY_MB));
	        }
	        if (FUNCTION_TIMEOUT_SEC.length > 0 && Number.isInteger(+FUNCTION_TIMEOUT_SEC)) {
	            faasEnv.set('timeout_sec', new bson_1.Int32(FUNCTION_TIMEOUT_SEC));
	        }
	        faasEnv.set('name', 'gcp.func');
	        return faasEnv;
	    }
	    return null;
	}
	/**
	 * @internal
	 * Get current JavaScript runtime platform
	 *
	 * NOTE: The version information fetching is intentionally written defensively
	 * to avoid having a released driver version that becomes incompatible
	 * with a future change to these global objects.
	 */
	function getRuntimeInfo() {
	    const endianness = bson_1.NumberUtils.isBigEndian ? 'BE' : 'LE';
	    if ('Deno' in globalThis) {
	        const version = typeof Deno?.version?.deno === 'string' ? Deno?.version?.deno : '0.0.0-unknown';
	        return `Deno v${version}, ${endianness}`;
	    }
	    if ('Bun' in globalThis) {
	        const version = typeof Bun?.version === 'string' ? Bun?.version : '0.0.0-unknown';
	        return `Bun v${version}, ${endianness}`;
	    }
	    return `Node.js ${process.version}, ${endianness}`;
	}
	
	return client_metadata;
}

var compression = {};

var commands = {};

var hasRequiredCommands;

function requireCommands () {
	if (hasRequiredCommands) return commands;
	hasRequiredCommands = 1;
	Object.defineProperty(commands, "__esModule", { value: true });
	commands.OpCompressedRequest = commands.OpMsgResponse = commands.OpMsgRequest = commands.DocumentSequence = commands.OpReply = commands.OpQueryRequest = void 0;
	const bson_1 = mongodb1.requireBson();
	const error_1 = mongodb4.requireError();
	const compression_1 = requireCompression();
	const constants_1 = requireConstants();
	// Incrementing request id
	let _requestId = 0;
	// Query flags
	const OPTS_TAILABLE_CURSOR = 2;
	const OPTS_SECONDARY = 4;
	const OPTS_OPLOG_REPLAY = 8;
	const OPTS_NO_CURSOR_TIMEOUT = 16;
	const OPTS_AWAIT_DATA = 32;
	const OPTS_EXHAUST = 64;
	const OPTS_PARTIAL = 128;
	// Response flags
	const CURSOR_NOT_FOUND = 1;
	const QUERY_FAILURE = 2;
	const SHARD_CONFIG_STALE = 4;
	const AWAIT_CAPABLE = 8;
	const encodeUTF8Into = bson_1.ByteUtils.encodeUTF8Into;
	/** @internal */
	class OpQueryRequest {
	    constructor(databaseName, query, options) {
	        /** moreToCome is an OP_MSG only concept */
	        this.moreToCome = false;
	        // Basic options needed to be passed in
	        // TODO(NODE-3483): Replace with MongoCommandError
	        const ns = `${databaseName}.$cmd`;
	        if (typeof databaseName !== 'string') {
	            throw new error_1.MongoRuntimeError('Database name must be a string for a query');
	        }
	        // TODO(NODE-3483): Replace with MongoCommandError
	        if (query == null)
	            throw new error_1.MongoRuntimeError('A query document must be specified for query');
	        // Validate that we are not passing 0x00 in the collection name
	        if (ns.indexOf('\x00') !== -1) {
	            // TODO(NODE-3483): Use MongoNamespace static method
	            throw new error_1.MongoRuntimeError('Namespace cannot contain a null character');
	        }
	        // Basic optionsa
	        this.databaseName = databaseName;
	        this.query = query;
	        this.ns = ns;
	        // Additional options
	        this.numberToSkip = options.numberToSkip || 0;
	        this.numberToReturn = options.numberToReturn || 0;
	        this.returnFieldSelector = options.returnFieldSelector || undefined;
	        this.requestId = options.requestId ?? OpQueryRequest.getRequestId();
	        // special case for pre-3.2 find commands, delete ASAP
	        this.pre32Limit = options.pre32Limit;
	        // Serialization option
	        this.serializeFunctions =
	            typeof options.serializeFunctions === 'boolean' ? options.serializeFunctions : false;
	        this.ignoreUndefined =
	            typeof options.ignoreUndefined === 'boolean' ? options.ignoreUndefined : false;
	        this.maxBsonSize = options.maxBsonSize || 1024 * 1024 * 16;
	        this.checkKeys = typeof options.checkKeys === 'boolean' ? options.checkKeys : false;
	        this.batchSize = this.numberToReturn;
	        // Flags
	        this.tailable = false;
	        this.secondaryOk = typeof options.secondaryOk === 'boolean' ? options.secondaryOk : false;
	        this.oplogReplay = false;
	        this.noCursorTimeout = false;
	        this.awaitData = false;
	        this.exhaust = false;
	        this.partial = false;
	    }
	    /** Assign next request Id. */
	    incRequestId() {
	        this.requestId = _requestId++;
	    }
	    /** Peek next request Id. */
	    nextRequestId() {
	        return _requestId + 1;
	    }
	    /** Increment then return next request Id. */
	    static getRequestId() {
	        return ++_requestId;
	    }
	    // Uses a single allocated buffer for the process, avoiding multiple memory allocations
	    toBin() {
	        const buffers = [];
	        let projection = null;
	        // Set up the flags
	        let flags = 0;
	        if (this.tailable) {
	            flags |= OPTS_TAILABLE_CURSOR;
	        }
	        if (this.secondaryOk) {
	            flags |= OPTS_SECONDARY;
	        }
	        if (this.oplogReplay) {
	            flags |= OPTS_OPLOG_REPLAY;
	        }
	        if (this.noCursorTimeout) {
	            flags |= OPTS_NO_CURSOR_TIMEOUT;
	        }
	        if (this.awaitData) {
	            flags |= OPTS_AWAIT_DATA;
	        }
	        if (this.exhaust) {
	            flags |= OPTS_EXHAUST;
	        }
	        if (this.partial) {
	            flags |= OPTS_PARTIAL;
	        }
	        // If batchSize is different to this.numberToReturn
	        if (this.batchSize !== this.numberToReturn)
	            this.numberToReturn = this.batchSize;
	        // Allocate write protocol header buffer
	        const header = bson_1.ByteUtils.allocate(4 * 4 + // Header
	            4 + // Flags
	            bson_1.ByteUtils.utf8ByteLength(this.ns) +
	            1 + // namespace
	            4 + // numberToSkip
	            4 // numberToReturn
	        );
	        // Add header to buffers
	        buffers.push(header);
	        // Serialize the query
	        const query = bson_1.BSON.serialize(this.query, {
	            checkKeys: this.checkKeys,
	            serializeFunctions: this.serializeFunctions,
	            ignoreUndefined: this.ignoreUndefined
	        });
	        // Add query document
	        buffers.push(query);
	        if (this.returnFieldSelector && Object.keys(this.returnFieldSelector).length > 0) {
	            // Serialize the projection document
	            projection = bson_1.BSON.serialize(this.returnFieldSelector, {
	                checkKeys: this.checkKeys,
	                serializeFunctions: this.serializeFunctions,
	                ignoreUndefined: this.ignoreUndefined
	            });
	            // Add projection document
	            buffers.push(projection);
	        }
	        // Total message size
	        const totalLength = header.length + query.length + (projection ? projection.length : 0);
	        // Set up the index
	        let index = 4;
	        // Write total document length
	        header[3] = (totalLength >> 24) & 0xff;
	        header[2] = (totalLength >> 16) & 0xff;
	        header[1] = (totalLength >> 8) & 0xff;
	        header[0] = totalLength & 0xff;
	        // Write header information requestId
	        header[index + 3] = (this.requestId >> 24) & 0xff;
	        header[index + 2] = (this.requestId >> 16) & 0xff;
	        header[index + 1] = (this.requestId >> 8) & 0xff;
	        header[index] = this.requestId & 0xff;
	        index = index + 4;
	        // Write header information responseTo
	        header[index + 3] = (0 >> 24) & 0xff;
	        header[index + 2] = (0 >> 16) & 0xff;
	        header[index + 1] = (0 >> 8) & 0xff;
	        header[index] = 0 & 0xff;
	        index = index + 4;
	        // Write header information OP_QUERY
	        header[index + 3] = (constants_1.OP_QUERY >> 24) & 0xff;
	        header[index + 2] = (constants_1.OP_QUERY >> 16) & 0xff;
	        header[index + 1] = (constants_1.OP_QUERY >> 8) & 0xff;
	        header[index] = constants_1.OP_QUERY & 0xff;
	        index = index + 4;
	        // Write header information flags
	        header[index + 3] = (flags >> 24) & 0xff;
	        header[index + 2] = (flags >> 16) & 0xff;
	        header[index + 1] = (flags >> 8) & 0xff;
	        header[index] = flags & 0xff;
	        index = index + 4;
	        // Write collection name
	        index = index + encodeUTF8Into(header, this.ns, index) + 1;
	        header[index - 1] = 0;
	        // Write header information flags numberToSkip
	        header[index + 3] = (this.numberToSkip >> 24) & 0xff;
	        header[index + 2] = (this.numberToSkip >> 16) & 0xff;
	        header[index + 1] = (this.numberToSkip >> 8) & 0xff;
	        header[index] = this.numberToSkip & 0xff;
	        index = index + 4;
	        // Write header information flags numberToReturn
	        header[index + 3] = (this.numberToReturn >> 24) & 0xff;
	        header[index + 2] = (this.numberToReturn >> 16) & 0xff;
	        header[index + 1] = (this.numberToReturn >> 8) & 0xff;
	        header[index] = this.numberToReturn & 0xff;
	        index = index + 4;
	        // Return the buffers
	        return buffers;
	    }
	}
	commands.OpQueryRequest = OpQueryRequest;
	/** @internal */
	class OpReply {
	    constructor(message, msgHeader, msgBody, opts) {
	        this.index = 0;
	        this.sections = [];
	        /** moreToCome is an OP_MSG only concept */
	        this.moreToCome = false;
	        this.parsed = false;
	        this.raw = message;
	        this.data = msgBody;
	        this.opts = opts ?? {
	            useBigInt64: false,
	            promoteLongs: true,
	            promoteValues: true,
	            promoteBuffers: false,
	            bsonRegExp: false
	        };
	        // Read the message header
	        this.length = msgHeader.length;
	        this.requestId = msgHeader.requestId;
	        this.responseTo = msgHeader.responseTo;
	        this.opCode = msgHeader.opCode;
	        this.fromCompressed = msgHeader.fromCompressed;
	        // Flag values
	        this.useBigInt64 = typeof this.opts.useBigInt64 === 'boolean' ? this.opts.useBigInt64 : false;
	        this.promoteLongs = typeof this.opts.promoteLongs === 'boolean' ? this.opts.promoteLongs : true;
	        this.promoteValues =
	            typeof this.opts.promoteValues === 'boolean' ? this.opts.promoteValues : true;
	        this.promoteBuffers =
	            typeof this.opts.promoteBuffers === 'boolean' ? this.opts.promoteBuffers : false;
	        this.bsonRegExp = typeof this.opts.bsonRegExp === 'boolean' ? this.opts.bsonRegExp : false;
	    }
	    isParsed() {
	        return this.parsed;
	    }
	    parse() {
	        // Don't parse again if not needed
	        if (this.parsed)
	            return this.sections[0];
	        // Position within OP_REPLY at which documents start
	        // (See https://www.mongodb.com/docs/manual/reference/mongodb-wire-protocol/#wire-op-reply)
	        this.index = 20;
	        // Read the message body
	        this.responseFlags = (0, bson_1.readInt32LE)(this.data, 0);
	        this.cursorId = new bson_1.BSON.Long((0, bson_1.readInt32LE)(this.data, 4), (0, bson_1.readInt32LE)(this.data, 8));
	        this.startingFrom = (0, bson_1.readInt32LE)(this.data, 12);
	        this.numberReturned = (0, bson_1.readInt32LE)(this.data, 16);
	        if (this.numberReturned < 0 || this.numberReturned > 2 ** 32 - 1) {
	            throw new RangeError(`OP_REPLY numberReturned is an invalid array length ${this.numberReturned}`);
	        }
	        this.cursorNotFound = (this.responseFlags & CURSOR_NOT_FOUND) !== 0;
	        this.queryFailure = (this.responseFlags & QUERY_FAILURE) !== 0;
	        this.shardConfigStale = (this.responseFlags & SHARD_CONFIG_STALE) !== 0;
	        this.awaitCapable = (this.responseFlags & AWAIT_CAPABLE) !== 0;
	        // Parse Body
	        for (let i = 0; i < this.numberReturned; i++) {
	            const bsonSize = this.data[this.index] |
	                (this.data[this.index + 1] << 8) |
	                (this.data[this.index + 2] << 16) |
	                (this.data[this.index + 3] << 24);
	            const section = this.data.subarray(this.index, this.index + bsonSize);
	            this.sections.push(section);
	            // Adjust the index
	            this.index = this.index + bsonSize;
	        }
	        // Set parsed
	        this.parsed = true;
	        return this.sections[0];
	    }
	}
	commands.OpReply = OpReply;
	// Msg Flags
	const OPTS_CHECKSUM_PRESENT = 1;
	const OPTS_MORE_TO_COME = 2;
	const OPTS_EXHAUST_ALLOWED = 1 << 16;
	/** @internal */
	class DocumentSequence {
	    /**
	     * Create a new document sequence for the provided field.
	     * @param field - The field it will replace.
	     */
	    constructor(field, documents) {
	        this.field = field;
	        this.documents = [];
	        this.chunks = [];
	        this.serializedDocumentsLength = 0;
	        // Document sequences starts with type 1 at the first byte.
	        // Field strings must always be UTF-8.
	        const buffer = bson_1.ByteUtils.allocateUnsafe(1 + 4 + this.field.length + 1);
	        buffer[0] = 1;
	        // Third part is the field name at offset 5 with trailing null byte.
	        encodeUTF8Into(buffer, `${this.field}\0`, 5);
	        this.chunks.push(buffer);
	        this.header = buffer;
	        if (documents) {
	            for (const doc of documents) {
	                this.push(doc, bson_1.BSON.serialize(doc));
	            }
	        }
	    }
	    /**
	     * Push a document to the document sequence. Will serialize the document
	     * as well and return the current serialized length of all documents.
	     * @param document - The document to add.
	     * @param buffer - The serialized document in raw BSON.
	     * @returns The new total document sequence length.
	     */
	    push(document, buffer) {
	        this.serializedDocumentsLength += buffer.length;
	        // Push the document.
	        this.documents.push(document);
	        // Push the document raw bson.
	        this.chunks.push(buffer);
	        // Write the new length.
	        if (this.header) {
	            bson_1.NumberUtils.setInt32LE(this.header, 1, 4 + this.field.length + 1 + this.serializedDocumentsLength);
	        }
	        return this.serializedDocumentsLength + this.header.length;
	    }
	    /**
	     * Get the fully serialized bytes for the document sequence section.
	     * @returns The section bytes.
	     */
	    toBin() {
	        return bson_1.ByteUtils.concat(this.chunks);
	    }
	}
	commands.DocumentSequence = DocumentSequence;
	/** @internal */
	class OpMsgRequest {
	    constructor(databaseName, command, options) {
	        // Basic options needed to be passed in
	        if (command == null)
	            throw new error_1.MongoInvalidArgumentError('Query document must be specified for query');
	        // Basic optionsa
	        this.databaseName = databaseName;
	        this.command = command;
	        this.command.$db = databaseName;
	        // Ensure empty options
	        this.options = options ?? {};
	        // Additional options
	        this.requestId = options.requestId ? options.requestId : OpMsgRequest.getRequestId();
	        // Serialization option
	        this.serializeFunctions =
	            typeof options.serializeFunctions === 'boolean' ? options.serializeFunctions : false;
	        this.ignoreUndefined =
	            typeof options.ignoreUndefined === 'boolean' ? options.ignoreUndefined : false;
	        this.checkKeys = typeof options.checkKeys === 'boolean' ? options.checkKeys : false;
	        this.maxBsonSize = options.maxBsonSize || 1024 * 1024 * 16;
	        // flags
	        this.checksumPresent = false;
	        this.moreToCome = options.moreToCome ?? command.writeConcern?.w === 0;
	        this.exhaustAllowed =
	            typeof options.exhaustAllowed === 'boolean' ? options.exhaustAllowed : false;
	    }
	    toBin() {
	        const buffers = [];
	        let flags = 0;
	        if (this.checksumPresent) {
	            flags |= OPTS_CHECKSUM_PRESENT;
	        }
	        if (this.moreToCome) {
	            flags |= OPTS_MORE_TO_COME;
	        }
	        if (this.exhaustAllowed) {
	            flags |= OPTS_EXHAUST_ALLOWED;
	        }
	        const header = bson_1.ByteUtils.allocate(4 * 4 + // Header
	            4 // Flags
	        );
	        buffers.push(header);
	        let totalLength = header.length;
	        const command = this.command;
	        totalLength += this.makeSections(buffers, command);
	        bson_1.NumberUtils.setInt32LE(header, 0, totalLength); // messageLength
	        bson_1.NumberUtils.setInt32LE(header, 4, this.requestId); // requestID
	        bson_1.NumberUtils.setInt32LE(header, 8, 0); // responseTo
	        bson_1.NumberUtils.setInt32LE(header, 12, constants_1.OP_MSG); // opCode
	        // The OP_MSG spec calls out that flags is uint32:
	        // https://github.com/mongodb/specifications/blob/master/source/message/OP_MSG.md#op_msg-1
	        (0, bson_1.setUint32LE)(header, 16, flags); // flags
	        return buffers;
	    }
	    /**
	     * Add the sections to the OP_MSG request's buffers and returns the length.
	     */
	    makeSections(buffers, document) {
	        const sequencesBuffer = this.extractDocumentSequences(document);
	        const payloadTypeBuffer = bson_1.ByteUtils.allocateUnsafe(1);
	        payloadTypeBuffer[0] = 0;
	        const documentBuffer = this.serializeBson(document);
	        // First section, type 0
	        buffers.push(payloadTypeBuffer);
	        buffers.push(documentBuffer);
	        // Subsequent sections, type 1
	        buffers.push(sequencesBuffer);
	        return payloadTypeBuffer.length + documentBuffer.length + sequencesBuffer.length;
	    }
	    /**
	     * Extracts the document sequences from the command document and returns
	     * a buffer to be added as multiple sections after the initial type 0
	     * section in the message.
	     */
	    extractDocumentSequences(document) {
	        // Pull out any field in the command document that's value is a document sequence.
	        const chunks = [];
	        for (const [key, value] of Object.entries(document)) {
	            if (value instanceof DocumentSequence) {
	                chunks.push(value.toBin());
	                // Why are we removing the field from the command? This is because it needs to be
	                // removed in the OP_MSG request first section, and DocumentSequence is not a
	                // BSON type and is specific to the MongoDB wire protocol so there's nothing
	                // our BSON serializer can do about this. Since DocumentSequence is not exposed
	                // in the public API and only used internally, we are never mutating an original
	                // command provided by the user, just our own, and it's cheaper to delete from
	                // our own command than copying it.
	                delete document[key];
	            }
	        }
	        if (chunks.length > 0) {
	            return bson_1.ByteUtils.concat(chunks);
	        }
	        // If we have no document sequences we return an empty buffer for nothing to add
	        // to the payload.
	        return bson_1.ByteUtils.allocate(0);
	    }
	    serializeBson(document) {
	        return bson_1.BSON.serialize(document, {
	            checkKeys: this.checkKeys,
	            serializeFunctions: this.serializeFunctions,
	            ignoreUndefined: this.ignoreUndefined
	        });
	    }
	    static getRequestId() {
	        _requestId = (_requestId + 1) & 0x7fffffff;
	        return _requestId;
	    }
	}
	commands.OpMsgRequest = OpMsgRequest;
	/** @internal */
	class OpMsgResponse {
	    constructor(message, msgHeader, msgBody, opts) {
	        this.index = 0;
	        this.sections = [];
	        this.parsed = false;
	        this.raw = message;
	        this.data = msgBody;
	        this.opts = opts ?? {
	            useBigInt64: false,
	            promoteLongs: true,
	            promoteValues: true,
	            promoteBuffers: false,
	            bsonRegExp: false
	        };
	        // Read the message header
	        this.length = msgHeader.length;
	        this.requestId = msgHeader.requestId;
	        this.responseTo = msgHeader.responseTo;
	        this.opCode = msgHeader.opCode;
	        this.fromCompressed = msgHeader.fromCompressed;
	        // Read response flags
	        this.responseFlags = (0, bson_1.readInt32LE)(msgBody, 0);
	        this.checksumPresent = (this.responseFlags & OPTS_CHECKSUM_PRESENT) !== 0;
	        this.moreToCome = (this.responseFlags & OPTS_MORE_TO_COME) !== 0;
	        this.exhaustAllowed = (this.responseFlags & OPTS_EXHAUST_ALLOWED) !== 0;
	        this.useBigInt64 = typeof this.opts.useBigInt64 === 'boolean' ? this.opts.useBigInt64 : false;
	        this.promoteLongs = typeof this.opts.promoteLongs === 'boolean' ? this.opts.promoteLongs : true;
	        this.promoteValues =
	            typeof this.opts.promoteValues === 'boolean' ? this.opts.promoteValues : true;
	        this.promoteBuffers =
	            typeof this.opts.promoteBuffers === 'boolean' ? this.opts.promoteBuffers : false;
	        this.bsonRegExp = typeof this.opts.bsonRegExp === 'boolean' ? this.opts.bsonRegExp : false;
	    }
	    isParsed() {
	        return this.parsed;
	    }
	    parse() {
	        // Don't parse again if not needed
	        if (this.parsed)
	            return this.sections[0];
	        this.index = 4;
	        while (this.index < this.data.length) {
	            const payloadType = this.data[this.index++];
	            if (payloadType === 0) {
	                // BSON spec specifies that this is a 32-bit signed integer: https://bsonspec.org/spec.html#:~:text=%3A%3A%3D-,int32,-e_list%20unsigned_byte(0
	                // While allowing negative sizes seems odd, in practice we never expect a negative size. Also, the server's 16mb limit for BSON documents leaves plenty
	                // of room in an int32 to store a document of the max BSON size that the server supports
	                const bsonSize = (0, bson_1.readInt32LE)(this.data, this.index);
	                const bin = this.data.subarray(this.index, this.index + bsonSize);
	                this.sections.push(bin);
	                this.index += bsonSize;
	            }
	            else if (payloadType === 1) {
	                // It was decided that no driver makes use of payload type 1
	                // TODO(NODE-3483): Replace with MongoDeprecationError
	                throw new error_1.MongoRuntimeError('OP_MSG Payload Type 1 detected unsupported protocol');
	            }
	        }
	        this.parsed = true;
	        return this.sections[0];
	    }
	}
	commands.OpMsgResponse = OpMsgResponse;
	const MESSAGE_HEADER_SIZE = 16;
	const COMPRESSION_DETAILS_SIZE = 9; // originalOpcode + uncompressedSize, compressorID
	/**
	 * @internal
	 *
	 * An OP_COMPRESSED request wraps either an OP_QUERY or OP_MSG message.
	 */
	class OpCompressedRequest {
	    constructor(command, options) {
	        this.command = command;
	        this.options = {
	            zlibCompressionLevel: options.zlibCompressionLevel,
	            agreedCompressor: options.agreedCompressor
	        };
	    }
	    // Return whether a command contains an uncompressible command term
	    // Will return true if command contains no uncompressible command terms
	    static canCompress(command) {
	        const commandDoc = command instanceof OpMsgRequest ? command.command : command.query;
	        const commandName = Object.keys(commandDoc)[0];
	        return !compression_1.uncompressibleCommands.has(commandName);
	    }
	    async toBin() {
	        const concatenatedOriginalCommandBuffer = bson_1.ByteUtils.concat(this.command.toBin());
	        // otherwise, compress the message
	        const messageToBeCompressed = concatenatedOriginalCommandBuffer.slice(MESSAGE_HEADER_SIZE);
	        // Extract information needed for OP_COMPRESSED from the uncompressed message
	        const originalCommandOpCode = (0, bson_1.readInt32LE)(concatenatedOriginalCommandBuffer, 12);
	        // Compress the message body
	        const compressedMessage = await (0, compression_1.compress)(this.options, messageToBeCompressed);
	        // Create the msgHeader of OP_COMPRESSED
	        const msgHeader = bson_1.ByteUtils.allocate(MESSAGE_HEADER_SIZE);
	        bson_1.NumberUtils.setInt32LE(msgHeader, 0, MESSAGE_HEADER_SIZE + COMPRESSION_DETAILS_SIZE + compressedMessage.length); // messageLength
	        bson_1.NumberUtils.setInt32LE(msgHeader, 4, this.command.requestId); // requestID
	        bson_1.NumberUtils.setInt32LE(msgHeader, 8, 0); // responseTo (zero)
	        bson_1.NumberUtils.setInt32LE(msgHeader, 12, constants_1.OP_COMPRESSED); // opCode
	        // Create the compression details of OP_COMPRESSED
	        const compressionDetails = bson_1.ByteUtils.allocate(COMPRESSION_DETAILS_SIZE);
	        bson_1.NumberUtils.setInt32LE(compressionDetails, 0, originalCommandOpCode); // originalOpcode
	        bson_1.NumberUtils.setInt32LE(compressionDetails, 4, messageToBeCompressed.length); // Size of the uncompressed compressedMessage, excluding the MsgHeader
	        compressionDetails[8] = compression_1.Compressor[this.options.agreedCompressor]; // compressorID
	        return [msgHeader, compressionDetails, compressedMessage];
	    }
	}
	commands.OpCompressedRequest = OpCompressedRequest;
	
	return commands;
}

var hasRequiredCompression;

function requireCompression () {
	if (hasRequiredCompression) return compression;
	hasRequiredCompression = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.uncompressibleCommands = exports.Compressor = void 0;
		exports.compress = compress;
		exports.decompress = decompress;
		exports.compressCommand = compressCommand;
		exports.decompressResponse = decompressResponse;
		const zlib = require$$0$1;
		const bson_1 = mongodb1.requireBson();
		const constants_1 = mongodb3.requireConstants();
		const deps_1 = mongodb4.requireDeps();
		const error_1 = mongodb4.requireError();
		const commands_1 = requireCommands();
		const constants_2 = requireConstants();
		/** @public */
		exports.Compressor = Object.freeze({
		    none: 0,
		    snappy: 1,
		    zlib: 2,
		    zstd: 3
		});
		exports.uncompressibleCommands = new Set([
		    constants_1.LEGACY_HELLO_COMMAND,
		    'saslStart',
		    'saslContinue',
		    'getnonce',
		    'authenticate',
		    'createUser',
		    'updateUser',
		    'copydbSaslStart',
		    'copydbgetnonce',
		    'copydb'
		]);
		const ZSTD_COMPRESSION_LEVEL = 3;
		const zlibInflate = (buf) => {
		    return new Promise((resolve, reject) => {
		        zlib.inflate(buf, (error, result) => {
		            if (error)
		                return reject(error);
		            resolve(result);
		        });
		    });
		};
		const zlibDeflate = (buf, options) => {
		    return new Promise((resolve, reject) => {
		        zlib.deflate(buf, options, (error, result) => {
		            if (error)
		                return reject(error);
		            resolve(result);
		        });
		    });
		};
		let zstd;
		let Snappy = null;
		function loadSnappy() {
		    if (Snappy == null) {
		        const snappyImport = (0, deps_1.getSnappy)();
		        if ('kModuleError' in snappyImport) {
		            throw snappyImport.kModuleError;
		        }
		        Snappy = snappyImport;
		    }
		    return Snappy;
		}
		// Facilitate compressing a message using an agreed compressor
		async function compress(options, dataToBeCompressed) {
		    const zlibOptions = {};
		    switch (options.agreedCompressor) {
		        case 'snappy': {
		            Snappy ??= loadSnappy();
		            return await Snappy.compress(dataToBeCompressed);
		        }
		        case 'zstd': {
		            loadZstd();
		            if ('kModuleError' in zstd) {
		                throw zstd['kModuleError'];
		            }
		            return await zstd.compress(dataToBeCompressed, ZSTD_COMPRESSION_LEVEL);
		        }
		        case 'zlib': {
		            if (options.zlibCompressionLevel) {
		                zlibOptions.level = options.zlibCompressionLevel;
		            }
		            return await zlibDeflate(dataToBeCompressed, zlibOptions);
		        }
		        default: {
		            throw new error_1.MongoInvalidArgumentError(`Unknown compressor ${options.agreedCompressor} failed to compress`);
		        }
		    }
		}
		// Decompress a message using the given compressor
		async function decompress(compressorID, compressedData) {
		    if (compressorID !== exports.Compressor.snappy &&
		        compressorID !== exports.Compressor.zstd &&
		        compressorID !== exports.Compressor.zlib &&
		        compressorID !== exports.Compressor.none) {
		        throw new error_1.MongoDecompressionError(`Server sent message compressed using an unsupported compressor. (Received compressor ID ${compressorID})`);
		    }
		    switch (compressorID) {
		        case exports.Compressor.snappy: {
		            Snappy ??= loadSnappy();
		            return await Snappy.uncompress(compressedData, { asBuffer: true });
		        }
		        case exports.Compressor.zstd: {
		            loadZstd();
		            if ('kModuleError' in zstd) {
		                throw zstd['kModuleError'];
		            }
		            return await zstd.decompress(compressedData);
		        }
		        case exports.Compressor.zlib: {
		            return await zlibInflate(compressedData);
		        }
		        default: {
		            return compressedData;
		        }
		    }
		}
		/**
		 * Load ZStandard if it is not already set.
		 */
		function loadZstd() {
		    if (!zstd) {
		        zstd = (0, deps_1.getZstdLibrary)();
		    }
		}
		const MESSAGE_HEADER_SIZE = 16;
		/**
		 * @internal
		 *
		 * Compresses an OP_MSG or OP_QUERY message, if compression is configured.  This method
		 * also serializes the command to BSON.
		 */
		async function compressCommand(command, description) {
		    const finalCommand = description.agreedCompressor === 'none' || !commands_1.OpCompressedRequest.canCompress(command)
		        ? command
		        : new commands_1.OpCompressedRequest(command, {
		            agreedCompressor: description.agreedCompressor ?? 'none',
		            zlibCompressionLevel: description.zlibCompressionLevel ?? 0
		        });
		    const data = await finalCommand.toBin();
		    return bson_1.ByteUtils.concat(data);
		}
		/**
		 * @internal
		 *
		 * Decompresses an OP_MSG or OP_QUERY response from the server, if compression is configured.
		 *
		 * This method does not parse the response's BSON.
		 */
		async function decompressResponse(message) {
		    const messageHeader = {
		        length: (0, bson_1.readInt32LE)(message, 0),
		        requestId: (0, bson_1.readInt32LE)(message, 4),
		        responseTo: (0, bson_1.readInt32LE)(message, 8),
		        opCode: (0, bson_1.readInt32LE)(message, 12)
		    };
		    if (messageHeader.opCode !== constants_2.OP_COMPRESSED) {
		        const ResponseType = messageHeader.opCode === constants_2.OP_MSG ? commands_1.OpMsgResponse : commands_1.OpReply;
		        const messageBody = message.subarray(MESSAGE_HEADER_SIZE);
		        return new ResponseType(message, messageHeader, messageBody);
		    }
		    const header = {
		        ...messageHeader,
		        fromCompressed: true,
		        opCode: (0, bson_1.readInt32LE)(message, MESSAGE_HEADER_SIZE),
		        length: (0, bson_1.readInt32LE)(message, MESSAGE_HEADER_SIZE + 4)
		    };
		    const compressorID = message[MESSAGE_HEADER_SIZE + 8];
		    const compressedBuffer = message.slice(MESSAGE_HEADER_SIZE + 9);
		    // recalculate based on wrapped opcode
		    const ResponseType = header.opCode === constants_2.OP_MSG ? commands_1.OpMsgResponse : commands_1.OpReply;
		    const messageBody = await decompress(compressorID, compressedBuffer);
		    if (messageBody.length !== header.length) {
		        throw new error_1.MongoDecompressionError('Message body and message header must be the same length');
		    }
		    return new ResponseType(message, header, messageBody);
		}
		
	} (compression));
	return compression;
}

var connect = {};

var connection = {};

var command_monitoring_events = {};

var hasRequiredCommand_monitoring_events;

function requireCommand_monitoring_events () {
	if (hasRequiredCommand_monitoring_events) return command_monitoring_events;
	hasRequiredCommand_monitoring_events = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.SENSITIVE_COMMANDS = exports.CommandFailedEvent = exports.CommandSucceededEvent = exports.CommandStartedEvent = void 0;
		const constants_1 = mongodb3.requireConstants();
		const utils_1 = mongodb7.requireUtils();
		const commands_1 = requireCommands();
		/**
		 * An event indicating the start of a given command
		 * @public
		 * @category Event
		 */
		class CommandStartedEvent {
		    /**
		     * Create a started event
		     *
		     * @internal
		     * @param pool - the pool that originated the command
		     * @param command - the command
		     */
		    constructor(connection, command, serverConnectionId) {
		        /** @internal */
		        this.name = constants_1.COMMAND_STARTED;
		        const cmd = extractCommand(command);
		        const commandName = extractCommandName(cmd);
		        const { address, connectionId, serviceId } = extractConnectionDetails(connection);
		        // TODO: remove in major revision, this is not spec behavior
		        if (exports.SENSITIVE_COMMANDS.has(commandName)) {
		            this.commandObj = {};
		            this.commandObj[commandName] = true;
		        }
		        this.address = address;
		        this.connectionId = connectionId;
		        this.serviceId = serviceId;
		        this.requestId = command.requestId;
		        this.databaseName = command.databaseName;
		        this.commandName = commandName;
		        this.command = maybeRedact(commandName, cmd, cmd);
		        this.serverConnectionId = serverConnectionId;
		    }
		    /* @internal */
		    get hasServiceId() {
		        return !!this.serviceId;
		    }
		}
		exports.CommandStartedEvent = CommandStartedEvent;
		/**
		 * An event indicating the success of a given command
		 * @public
		 * @category Event
		 */
		class CommandSucceededEvent {
		    /**
		     * Create a succeeded event
		     *
		     * @internal
		     * @param pool - the pool that originated the command
		     * @param command - the command
		     * @param reply - the reply for this command from the server
		     * @param started - a high resolution tuple timestamp of when the command was first sent, to calculate duration
		     */
		    constructor(connection, command, reply, started, serverConnectionId) {
		        /** @internal */
		        this.name = constants_1.COMMAND_SUCCEEDED;
		        const cmd = extractCommand(command);
		        const commandName = extractCommandName(cmd);
		        const { address, connectionId, serviceId } = extractConnectionDetails(connection);
		        this.address = address;
		        this.connectionId = connectionId;
		        this.serviceId = serviceId;
		        this.requestId = command.requestId;
		        this.commandName = commandName;
		        this.duration = (0, utils_1.calculateDurationInMs)(started);
		        this.reply = maybeRedact(commandName, cmd, extractReply(reply));
		        this.serverConnectionId = serverConnectionId;
		        this.databaseName = command.databaseName;
		    }
		    /* @internal */
		    get hasServiceId() {
		        return !!this.serviceId;
		    }
		}
		exports.CommandSucceededEvent = CommandSucceededEvent;
		/**
		 * An event indicating the failure of a given command
		 * @public
		 * @category Event
		 */
		class CommandFailedEvent {
		    /**
		     * Create a failure event
		     *
		     * @internal
		     * @param pool - the pool that originated the command
		     * @param command - the command
		     * @param error - the generated error or a server error response
		     * @param started - a high resolution tuple timestamp of when the command was first sent, to calculate duration
		     */
		    constructor(connection, command, error, started, serverConnectionId) {
		        /** @internal */
		        this.name = constants_1.COMMAND_FAILED;
		        const cmd = extractCommand(command);
		        const commandName = extractCommandName(cmd);
		        const { address, connectionId, serviceId } = extractConnectionDetails(connection);
		        this.address = address;
		        this.connectionId = connectionId;
		        this.serviceId = serviceId;
		        this.requestId = command.requestId;
		        this.commandName = commandName;
		        this.duration = (0, utils_1.calculateDurationInMs)(started);
		        this.failure = maybeRedact(commandName, cmd, error);
		        this.serverConnectionId = serverConnectionId;
		        this.databaseName = command.databaseName;
		    }
		    /* @internal */
		    get hasServiceId() {
		        return !!this.serviceId;
		    }
		}
		exports.CommandFailedEvent = CommandFailedEvent;
		/**
		 * Commands that we want to redact because of the sensitive nature of their contents
		 * @internal
		 */
		exports.SENSITIVE_COMMANDS = new Set([
		    'authenticate',
		    'saslStart',
		    'saslContinue',
		    'getnonce',
		    'createUser',
		    'updateUser',
		    'copydbgetnonce',
		    'copydbsaslstart',
		    'copydb'
		]);
		const HELLO_COMMANDS = new Set(['hello', constants_1.LEGACY_HELLO_COMMAND, constants_1.LEGACY_HELLO_COMMAND_CAMEL_CASE]);
		// helper methods
		const extractCommandName = (commandDoc) => Object.keys(commandDoc)[0];
		const collectionName = (command) => command.ns.split('.')[1];
		const maybeRedact = (commandName, commandDoc, result) => exports.SENSITIVE_COMMANDS.has(commandName) ||
		    (HELLO_COMMANDS.has(commandName) && commandDoc.speculativeAuthenticate)
		    ? {}
		    : result;
		const LEGACY_FIND_QUERY_MAP = {
		    $query: 'filter',
		    $orderby: 'sort',
		    $hint: 'hint',
		    $comment: 'comment',
		    $maxScan: 'maxScan',
		    $max: 'max',
		    $min: 'min',
		    $returnKey: 'returnKey',
		    $showDiskLoc: 'showRecordId',
		    $maxTimeMS: 'maxTimeMS',
		    $snapshot: 'snapshot'
		};
		const LEGACY_FIND_OPTIONS_MAP = {
		    numberToSkip: 'skip',
		    numberToReturn: 'batchSize',
		    returnFieldSelector: 'projection'
		};
		/** Extract the actual command from the query, possibly up-converting if it's a legacy format */
		function extractCommand(command) {
		    if (command instanceof commands_1.OpMsgRequest) {
		        const cmd = { ...command.command };
		        // For OP_MSG with payload type 1 we need to pull the documents
		        // array out of the document sequence for monitoring.
		        if (cmd.ops instanceof commands_1.DocumentSequence) {
		            cmd.ops = cmd.ops.documents;
		        }
		        if (cmd.nsInfo instanceof commands_1.DocumentSequence) {
		            cmd.nsInfo = cmd.nsInfo.documents;
		        }
		        return cmd;
		    }
		    if (command.query?.$query) {
		        let result;
		        if (command.ns === 'admin.$cmd') {
		            // up-convert legacy command
		            result = Object.assign({}, command.query.$query);
		        }
		        else {
		            // up-convert legacy find command
		            result = { find: collectionName(command) };
		            Object.keys(LEGACY_FIND_QUERY_MAP).forEach(key => {
		                if (command.query[key] != null) {
		                    result[LEGACY_FIND_QUERY_MAP[key]] = { ...command.query[key] };
		                }
		            });
		        }
		        Object.keys(LEGACY_FIND_OPTIONS_MAP).forEach(key => {
		            const legacyKey = key;
		            if (command[legacyKey] != null) {
		                result[LEGACY_FIND_OPTIONS_MAP[legacyKey]] = command[legacyKey];
		            }
		        });
		        return result;
		    }
		    let clonedQuery = {};
		    const clonedCommand = { ...command };
		    if (command.query) {
		        clonedQuery = { ...command.query };
		        clonedCommand.query = clonedQuery;
		    }
		    return command.query ? clonedQuery : clonedCommand;
		}
		function extractReply(reply) {
		    if (!reply) {
		        return reply;
		    }
		    return reply.result ? reply.result : reply;
		}
		function extractConnectionDetails(connection) {
		    let connectionId;
		    if ('id' in connection) {
		        connectionId = connection.id;
		    }
		    return {
		        address: connection.address,
		        serviceId: connection.serviceId,
		        connectionId
		    };
		}
		
	} (command_monitoring_events));
	return command_monitoring_events;
}

var stream_description = {};

var hasRequiredStream_description;

function requireStream_description () {
	if (hasRequiredStream_description) return stream_description;
	hasRequiredStream_description = 1;
	Object.defineProperty(stream_description, "__esModule", { value: true });
	stream_description.StreamDescription = void 0;
	const bson_1 = mongodb1.requireBson();
	const common_1 = mongodb5.requireCommon();
	const server_description_1 = mongodb6.requireServer_description();
	const RESPONSE_FIELDS = [
	    'minWireVersion',
	    'maxWireVersion',
	    'maxBsonObjectSize',
	    'maxMessageSizeBytes',
	    'maxWriteBatchSize',
	    'logicalSessionTimeoutMinutes'
	];
	/** @public */
	class StreamDescription {
	    constructor(address, options) {
	        this.hello = null;
	        this.address = address;
	        this.type = common_1.ServerType.Unknown;
	        this.minWireVersion = undefined;
	        this.maxWireVersion = undefined;
	        this.maxBsonObjectSize = 16777216;
	        this.maxMessageSizeBytes = 48000000;
	        this.maxWriteBatchSize = 100000;
	        this.logicalSessionTimeoutMinutes = options?.logicalSessionTimeoutMinutes;
	        this.loadBalanced = !!options?.loadBalanced;
	        this.compressors =
	            options && options.compressors && Array.isArray(options.compressors)
	                ? options.compressors
	                : [];
	        this.serverConnectionId = null;
	    }
	    receiveResponse(response) {
	        if (response == null) {
	            return;
	        }
	        this.hello = response;
	        this.type = (0, server_description_1.parseServerType)(response);
	        if ('connectionId' in response) {
	            this.serverConnectionId = this.parseServerConnectionID(response.connectionId);
	        }
	        else {
	            this.serverConnectionId = null;
	        }
	        for (const field of RESPONSE_FIELDS) {
	            if (response[field] != null) {
	                this[field] = response[field];
	            }
	            // testing case
	            if ('__nodejs_mock_server__' in response) {
	                this.__nodejs_mock_server__ = response['__nodejs_mock_server__'];
	            }
	        }
	        if (response.compression) {
	            this.compressor = this.compressors.filter(c => response.compression?.includes(c))[0];
	        }
	    }
	    /* @internal */
	    parseServerConnectionID(serverConnectionId) {
	        // Connection ids are always integral, so it's safe to coerce doubles as well as
	        // any integral type.
	        return bson_1.Long.isLong(serverConnectionId)
	            ? serverConnectionId.toBigInt()
	            : // @ts-expect-error: Doubles are coercible to number
	                BigInt(serverConnectionId);
	    }
	}
	stream_description.StreamDescription = StreamDescription;
	
	return stream_description;
}

var on_data = {};

var hasRequiredOn_data;

function requireOn_data () {
	if (hasRequiredOn_data) return on_data;
	hasRequiredOn_data = 1;
	Object.defineProperty(on_data, "__esModule", { value: true });
	on_data.onData = onData;
	const utils_1 = mongodb7.requireUtils();
	/**
	 * onData is adapted from Node.js' events.on helper
	 * https://nodejs.org/api/events.html#eventsonemitter-eventname-options
	 *
	 * Returns an AsyncIterator that iterates each 'data' event emitted from emitter.
	 * It will reject upon an error event.
	 */
	function onData(emitter, { timeoutContext, signal }) {
	    signal?.throwIfAborted();
	    // Setup pending events and pending promise lists
	    /**
	     * When the caller has not yet called .next(), we store the
	     * value from the event in this list. Next time they call .next()
	     * we pull the first value out of this list and resolve a promise with it.
	     */
	    const unconsumedEvents = new utils_1.List();
	    /**
	     * When there has not yet been an event, a new promise will be created
	     * and implicitly stored in this list. When an event occurs we take the first
	     * promise in this list and resolve it.
	     */
	    const unconsumedPromises = new utils_1.List();
	    /**
	     * Stored an error created by an error event.
	     * This error will turn into a rejection for the subsequent .next() call
	     */
	    let error = null;
	    /** Set to true only after event listeners have been removed. */
	    let finished = false;
	    const iterator = {
	        next() {
	            // First, we consume all unread events
	            const value = unconsumedEvents.shift();
	            if (value != null) {
	                return Promise.resolve({ value, done: false });
	            }
	            // Then we error, if an error happened
	            // This happens one time if at all, because after 'error'
	            // we stop listening
	            if (error != null) {
	                const p = Promise.reject(error);
	                // Only the first element errors
	                error = null;
	                return p;
	            }
	            // If the iterator is finished, resolve to done
	            if (finished)
	                return closeHandler();
	            // Wait until an event happens
	            const { promise, resolve, reject } = (0, utils_1.promiseWithResolvers)();
	            unconsumedPromises.push({ resolve, reject });
	            return promise;
	        },
	        return() {
	            return closeHandler();
	        },
	        throw(err) {
	            errorHandler(err);
	            return Promise.resolve({ value: undefined, done: true });
	        },
	        [Symbol.asyncIterator]() {
	            return this;
	        },
	        async [Symbol.asyncDispose]() {
	            await closeHandler();
	        }
	    };
	    // Adding event handlers
	    emitter.on('data', eventHandler);
	    emitter.on('error', errorHandler);
	    const abortListener = (0, utils_1.addAbortListener)(signal, function () {
	        errorHandler(this.reason);
	    });
	    const timeoutForSocketRead = timeoutContext?.timeoutForSocketRead;
	    timeoutForSocketRead?.throwIfExpired();
	    timeoutForSocketRead?.then(undefined, errorHandler);
	    return iterator;
	    function eventHandler(value) {
	        const promise = unconsumedPromises.shift();
	        if (promise != null)
	            promise.resolve({ value, done: false });
	        else
	            unconsumedEvents.push(value);
	    }
	    function errorHandler(err) {
	        const promise = unconsumedPromises.shift();
	        if (promise != null)
	            promise.reject(err);
	        else
	            error = err;
	        void closeHandler();
	    }
	    function closeHandler() {
	        // Adding event handlers
	        emitter.off('data', eventHandler);
	        emitter.off('error', errorHandler);
	        abortListener?.[utils_1.kDispose]();
	        finished = true;
	        timeoutForSocketRead?.clear();
	        const doneResult = { value: undefined, done: finished };
	        for (const promise of unconsumedPromises) {
	            promise.resolve(doneResult);
	        }
	        return Promise.resolve(doneResult);
	    }
	}
	
	return on_data;
}

var hasRequiredConnection;

function requireConnection () {
	if (hasRequiredConnection) return connection;
	hasRequiredConnection = 1;
	Object.defineProperty(connection, "__esModule", { value: true });
	connection.CryptoConnection = connection.SizedMessageTransform = connection.Connection = void 0;
	connection.hasSessionSupport = hasSessionSupport;
	const stream_1 = require$$0$3;
	const timers_1 = require$$0$2;
	const bson_1 = mongodb1.requireBson();
	const constants_1 = mongodb3.requireConstants();
	const error_1 = mongodb4.requireError();
	const mongo_logger_1 = mongodb5.requireMongo_logger();
	const mongo_types_1 = mongodb5.requireMongo_types();
	const read_preference_1 = mongodb5.requireRead_preference();
	const common_1 = mongodb5.requireCommon();
	const sessions_1 = mongodb6.requireSessions();
	const timeout_1 = mongodb6.requireTimeout();
	const utils_1 = mongodb7.requireUtils();
	const command_monitoring_events_1 = requireCommand_monitoring_events();
	const commands_1 = requireCommands();
	const stream_description_1 = requireStream_description();
	const compression_1 = requireCompression();
	const on_data_1 = requireOn_data();
	const responses_1 = mongodb3.requireResponses();
	const shared_1 = mongodb3.requireShared();
	/** @internal */
	function hasSessionSupport(conn) {
	    const description = conn.description;
	    return description.logicalSessionTimeoutMinutes != null;
	}
	function streamIdentifier(stream, options) {
	    if (options.proxyHost) {
	        // If proxy options are specified, the properties of `stream` itself
	        // will not accurately reflect what endpoint this is connected to.
	        return options.hostAddress.toString();
	    }
	    const { remoteAddress, remotePort } = stream;
	    if (typeof remoteAddress === 'string' && typeof remotePort === 'number') {
	        return utils_1.HostAddress.fromHostPort(remoteAddress, remotePort).toString();
	    }
	    return bson_1.ByteUtils.toHex((0, utils_1.uuidV4)());
	}
	/** @internal */
	class Connection extends mongo_types_1.TypedEventEmitter {
	    /** @event */
	    static { this.COMMAND_STARTED = constants_1.COMMAND_STARTED; }
	    /** @event */
	    static { this.COMMAND_SUCCEEDED = constants_1.COMMAND_SUCCEEDED; }
	    /** @event */
	    static { this.COMMAND_FAILED = constants_1.COMMAND_FAILED; }
	    /** @event */
	    static { this.CLUSTER_TIME_RECEIVED = constants_1.CLUSTER_TIME_RECEIVED; }
	    /** @event */
	    static { this.CLOSE = constants_1.CLOSE; }
	    /** @event */
	    static { this.PINNED = constants_1.PINNED; }
	    /** @event */
	    static { this.UNPINNED = constants_1.UNPINNED; }
	    constructor(stream, options) {
	        super();
	        this.lastHelloMS = -1;
	        this.helloOk = false;
	        this.delayedTimeoutId = null;
	        /** Indicates that the connection (including underlying TCP socket) has been closed. */
	        this.closed = false;
	        this.clusterTime = null;
	        this.error = null;
	        this.dataEvents = null;
	        this.on('error', utils_1.noop);
	        this.socket = stream;
	        this.id = options.id;
	        this.address = streamIdentifier(stream, options);
	        this.socketTimeoutMS = options.socketTimeoutMS ?? 0;
	        this.monitorCommands = options.monitorCommands;
	        this.serverApi = options.serverApi;
	        this.mongoLogger = options.mongoLogger;
	        this.established = false;
	        this.description = new stream_description_1.StreamDescription(this.address, options);
	        this.generation = options.generation;
	        this.lastUseTime = (0, utils_1.processTimeMS)();
	        this.messageStream = this.socket
	            .on('error', this.onSocketError.bind(this))
	            .pipe(new SizedMessageTransform({ connection: this }))
	            .on('error', this.onTransformError.bind(this));
	        this.socket.on('close', this.onClose.bind(this));
	        this.socket.on('timeout', this.onTimeout.bind(this));
	        this.messageStream.pause();
	    }
	    get hello() {
	        return this.description.hello;
	    }
	    // the `connect` method stores the result of the handshake hello on the connection
	    set hello(response) {
	        this.description.receiveResponse(response);
	        Object.freeze(this.description);
	    }
	    get serviceId() {
	        return this.hello?.serviceId;
	    }
	    get loadBalanced() {
	        return this.description.loadBalanced;
	    }
	    get idleTime() {
	        return (0, utils_1.calculateDurationInMs)(this.lastUseTime);
	    }
	    get hasSessionSupport() {
	        return this.description.logicalSessionTimeoutMinutes != null;
	    }
	    get supportsOpMsg() {
	        return (this.description != null &&
	            // TODO(NODE-6672,NODE-6287): This guard is primarily for maxWireVersion = 0
	            (0, utils_1.maxWireVersion)(this) >= 6 &&
	            !this.description.__nodejs_mock_server__);
	    }
	    get shouldEmitAndLogCommand() {
	        return ((this.monitorCommands ||
	            (this.established &&
	                !this.authContext?.reauthenticating &&
	                this.mongoLogger?.willLog(mongo_logger_1.MongoLoggableComponent.COMMAND, mongo_logger_1.SeverityLevel.DEBUG))) ??
	            false);
	    }
	    markAvailable() {
	        this.lastUseTime = (0, utils_1.processTimeMS)();
	    }
	    onSocketError(cause) {
	        this.onError(new error_1.MongoNetworkError(cause.message, { cause }));
	    }
	    onTransformError(error) {
	        this.onError(error);
	    }
	    onError(error) {
	        this.cleanup(error);
	    }
	    onClose() {
	        const message = `connection ${this.id} to ${this.address} closed`;
	        this.cleanup(new error_1.MongoNetworkError(message));
	    }
	    onTimeout() {
	        this.delayedTimeoutId = (0, timers_1.setTimeout)(() => {
	            const message = `connection ${this.id} to ${this.address} timed out`;
	            const beforeHandshake = this.hello == null;
	            this.cleanup(new error_1.MongoNetworkTimeoutError(message, { beforeHandshake }));
	        }, 1).unref(); // No need for this timer to hold the event loop open
	    }
	    destroy() {
	        if (this.closed) {
	            return;
	        }
	        // load balanced mode requires that these listeners remain on the connection
	        // after cleanup on timeouts, errors or close so we remove them before calling
	        // cleanup.
	        this.removeAllListeners(Connection.PINNED);
	        this.removeAllListeners(Connection.UNPINNED);
	        const message = `connection ${this.id} to ${this.address} closed`;
	        this.cleanup(new error_1.MongoNetworkError(message));
	    }
	    /**
	     * A method that cleans up the connection.  When `force` is true, this method
	     * forcibly destroys the socket.
	     *
	     * If an error is provided, any in-flight operations will be closed with the error.
	     *
	     * This method does nothing if the connection is already closed.
	     */
	    cleanup(error) {
	        if (this.closed) {
	            return;
	        }
	        this.socket.destroy();
	        this.error = error;
	        this.dataEvents?.throw(error).then(undefined, utils_1.squashError);
	        this.closed = true;
	        this.emit(Connection.CLOSE);
	    }
	    prepareCommand(db, command, options) {
	        let cmd = { ...command };
	        const readPreference = (0, shared_1.getReadPreference)(options);
	        const session = options?.session;
	        let clusterTime = this.clusterTime;
	        if (this.serverApi) {
	            const { version, strict, deprecationErrors } = this.serverApi;
	            cmd.apiVersion = version;
	            if (strict != null)
	                cmd.apiStrict = strict;
	            if (deprecationErrors != null)
	                cmd.apiDeprecationErrors = deprecationErrors;
	        }
	        if (this.hasSessionSupport && session) {
	            if (session.clusterTime &&
	                clusterTime &&
	                session.clusterTime.clusterTime.greaterThan(clusterTime.clusterTime)) {
	                clusterTime = session.clusterTime;
	            }
	            const sessionError = (0, sessions_1.applySession)(session, cmd, options);
	            if (sessionError)
	                throw sessionError;
	        }
	        else if (session?.explicit) {
	            throw new error_1.MongoCompatibilityError('Current topology does not support sessions');
	        }
	        // if we have a known cluster time, gossip it
	        if (clusterTime) {
	            cmd.$clusterTime = clusterTime;
	        }
	        // For standalone, drivers MUST NOT set $readPreference.
	        if (this.description.type !== common_1.ServerType.Standalone) {
	            if (!(0, shared_1.isSharded)(this) &&
	                !this.description.loadBalanced &&
	                this.supportsOpMsg &&
	                options.directConnection === true &&
	                readPreference?.mode === 'primary') {
	                // For mongos and load balancers with 'primary' mode, drivers MUST NOT set $readPreference.
	                // For all other types with a direct connection, if the read preference is 'primary'
	                // (driver sets 'primary' as default if no read preference is configured),
	                // the $readPreference MUST be set to 'primaryPreferred'
	                // to ensure that any server type can handle the request.
	                cmd.$readPreference = read_preference_1.ReadPreference.primaryPreferred.toJSON();
	            }
	            else if ((0, shared_1.isSharded)(this) && !this.supportsOpMsg && readPreference?.mode !== 'primary') {
	                // When sending a read operation via OP_QUERY and the $readPreference modifier,
	                // the query MUST be provided using the $query modifier.
	                cmd = {
	                    $query: cmd,
	                    $readPreference: readPreference.toJSON()
	                };
	            }
	            else if (readPreference?.mode !== 'primary') {
	                // For mode 'primary', drivers MUST NOT set $readPreference.
	                // For all other read preference modes (i.e. 'secondary', 'primaryPreferred', ...),
	                // drivers MUST set $readPreference
	                cmd.$readPreference = readPreference.toJSON();
	            }
	        }
	        const commandOptions = {
	            numberToSkip: 0,
	            numberToReturn: -1,
	            checkKeys: false,
	            // This value is not overridable
	            secondaryOk: readPreference.secondaryOk(),
	            ...options
	        };
	        options.timeoutContext?.addMaxTimeMSToCommand(cmd, options);
	        const message = this.supportsOpMsg
	            ? new commands_1.OpMsgRequest(db, cmd, commandOptions)
	            : new commands_1.OpQueryRequest(db, cmd, commandOptions);
	        return message;
	    }
	    async *sendWire(message, options, responseType) {
	        this.throwIfAborted();
	        const timeout = options.socketTimeoutMS ??
	            options?.timeoutContext?.getSocketTimeoutMS() ??
	            this.socketTimeoutMS;
	        this.socket.setTimeout(timeout);
	        try {
	            await this.writeCommand(message, {
	                agreedCompressor: this.description.compressor ?? 'none',
	                zlibCompressionLevel: this.description.zlibCompressionLevel,
	                timeoutContext: options.timeoutContext,
	                signal: options.signal
	            });
	            if (message.moreToCome) {
	                yield responses_1.MongoDBResponse.empty;
	                return;
	            }
	            this.throwIfAborted();
	            if (options.timeoutContext?.csotEnabled() &&
	                options.timeoutContext.minRoundTripTime != null &&
	                options.timeoutContext.remainingTimeMS < options.timeoutContext.minRoundTripTime) {
	                throw new error_1.MongoOperationTimeoutError('Server roundtrip time is greater than the time remaining');
	            }
	            for await (const response of this.readMany(options)) {
	                this.socket.setTimeout(0);
	                const bson = response.parse();
	                const document = (responseType ?? responses_1.MongoDBResponse).make(bson);
	                yield document;
	                this.throwIfAborted();
	                this.socket.setTimeout(timeout);
	            }
	        }
	        finally {
	            this.socket.setTimeout(0);
	        }
	    }
	    async *sendCommand(ns, command, options, responseType) {
	        options?.signal?.throwIfAborted();
	        const message = this.prepareCommand(ns.db, command, options);
	        let started = 0;
	        if (this.shouldEmitAndLogCommand) {
	            started = (0, utils_1.processTimeMS)();
	            this.emitAndLogCommand(this.monitorCommands, Connection.COMMAND_STARTED, message.databaseName, this.established, new command_monitoring_events_1.CommandStartedEvent(this, message, this.description.serverConnectionId));
	        }
	        // If `documentsReturnedIn` not set or raw is not enabled, use input bson options
	        // Otherwise, support raw flag. Raw only works for cursors that hardcode firstBatch/nextBatch fields
	        const bsonOptions = options.documentsReturnedIn == null || !options.raw
	            ? options
	            : {
	                ...options,
	                raw: false,
	                fieldsAsRaw: { [options.documentsReturnedIn]: true }
	            };
	        /** MongoDBResponse instance or subclass */
	        let document = undefined;
	        /** Cached result of a toObject call */
	        let object = undefined;
	        try {
	            this.throwIfAborted();
	            for await (document of this.sendWire(message, options, responseType)) {
	                object = undefined;
	                if (options.session != null) {
	                    (0, sessions_1.updateSessionFromResponse)(options.session, document);
	                }
	                if (document.$clusterTime) {
	                    this.clusterTime = document.$clusterTime;
	                    this.emit(Connection.CLUSTER_TIME_RECEIVED, document.$clusterTime);
	                }
	                if (document.ok === 0) {
	                    if (options.timeoutContext?.csotEnabled() && document.isMaxTimeExpiredError) {
	                        throw new error_1.MongoOperationTimeoutError('Server reported a timeout error', {
	                            cause: new error_1.MongoServerError((object ??= document.toObject(bsonOptions)))
	                        });
	                    }
	                    throw new error_1.MongoServerError((object ??= document.toObject(bsonOptions)));
	                }
	                if (this.shouldEmitAndLogCommand) {
	                    this.emitAndLogCommand(this.monitorCommands, Connection.COMMAND_SUCCEEDED, message.databaseName, this.established, new command_monitoring_events_1.CommandSucceededEvent(this, message, message.moreToCome ? { ok: 1 } : (object ??= document.toObject(bsonOptions)), started, this.description.serverConnectionId));
	                }
	                if (responseType == null) {
	                    yield (object ??= document.toObject(bsonOptions));
	                }
	                else {
	                    yield document;
	                }
	                this.throwIfAborted();
	            }
	        }
	        catch (error) {
	            if (options.session != null && !(error instanceof error_1.MongoServerError)) {
	                (0, sessions_1.updateSessionFromResponse)(options.session, responses_1.MongoDBResponse.empty);
	            }
	            if (this.shouldEmitAndLogCommand) {
	                this.emitAndLogCommand(this.monitorCommands, Connection.COMMAND_FAILED, message.databaseName, this.established, new command_monitoring_events_1.CommandFailedEvent(this, message, error, started, this.description.serverConnectionId));
	            }
	            throw error;
	        }
	    }
	    async command(ns, command, options = {}, responseType) {
	        this.throwIfAborted();
	        options.signal?.throwIfAborted();
	        for await (const document of this.sendCommand(ns, command, options, responseType)) {
	            if (options.timeoutContext?.csotEnabled()) {
	                if (responses_1.MongoDBResponse.is(document)) {
	                    if (document.isMaxTimeExpiredError) {
	                        throw new error_1.MongoOperationTimeoutError('Server reported a timeout error', {
	                            cause: new error_1.MongoServerError(document.toObject())
	                        });
	                    }
	                }
	                else {
	                    if ((Array.isArray(document?.writeErrors) &&
	                        document.writeErrors.some(error => error?.code === error_1.MONGODB_ERROR_CODES.MaxTimeMSExpired)) ||
	                        document?.writeConcernError?.code === error_1.MONGODB_ERROR_CODES.MaxTimeMSExpired) {
	                        throw new error_1.MongoOperationTimeoutError('Server reported a timeout error', {
	                            cause: new error_1.MongoServerError(document)
	                        });
	                    }
	                }
	            }
	            return document;
	        }
	        throw new error_1.MongoUnexpectedServerResponseError('Unable to get response from server');
	    }
	    exhaustCommand(ns, command, options, replyListener) {
	        const exhaustLoop = async () => {
	            this.throwIfAborted();
	            for await (const reply of this.sendCommand(ns, command, options)) {
	                replyListener(undefined, reply);
	                this.throwIfAborted();
	            }
	            throw new error_1.MongoUnexpectedServerResponseError('Server ended moreToCome unexpectedly');
	        };
	        exhaustLoop().then(undefined, replyListener);
	    }
	    throwIfAborted() {
	        if (this.error)
	            throw this.error;
	    }
	    /**
	     * @internal
	     *
	     * Writes an OP_MSG or OP_QUERY request to the socket, optionally compressing the command. This method
	     * waits until the socket's buffer has emptied (the Nodejs socket `drain` event has fired).
	     */
	    async writeCommand(command, options) {
	        const finalCommand = options.agreedCompressor === 'none' || !commands_1.OpCompressedRequest.canCompress(command)
	            ? command
	            : new commands_1.OpCompressedRequest(command, {
	                agreedCompressor: options.agreedCompressor ?? 'none',
	                zlibCompressionLevel: options.zlibCompressionLevel ?? 0
	            });
	        const buffer = bson_1.ByteUtils.concat(await finalCommand.toBin());
	        if (options.timeoutContext?.csotEnabled()) {
	            if (options.timeoutContext.minRoundTripTime != null &&
	                options.timeoutContext.remainingTimeMS < options.timeoutContext.minRoundTripTime) {
	                throw new error_1.MongoOperationTimeoutError('Server roundtrip time is greater than the time remaining');
	            }
	        }
	        try {
	            if (this.socket.write(buffer))
	                return;
	        }
	        catch (writeError) {
	            const networkError = new error_1.MongoNetworkError('unexpected error writing to socket', {
	                cause: writeError
	            });
	            this.onError(networkError);
	            throw networkError;
	        }
	        const drainEvent = (0, utils_1.once)(this.socket, 'drain', options);
	        const timeout = options?.timeoutContext?.timeoutForSocketWrite;
	        const drained = timeout ? Promise.race([drainEvent, timeout]) : drainEvent;
	        try {
	            return await drained;
	        }
	        catch (writeError) {
	            if (timeout_1.TimeoutError.is(writeError)) {
	                const timeoutError = new error_1.MongoOperationTimeoutError('Timed out at socket write');
	                this.onError(timeoutError);
	                throw timeoutError;
	            }
	            else if (writeError === options.signal?.reason) {
	                this.onError(writeError);
	            }
	            throw writeError;
	        }
	        finally {
	            timeout?.clear();
	        }
	    }
	    /**
	     * @internal
	     *
	     * Returns an async generator that yields full wire protocol messages from the underlying socket.  This function
	     * yields messages until `moreToCome` is false or not present in a response, or the caller cancels the request
	     * by calling `return` on the generator.
	     *
	     * Note that `for-await` loops call `return` automatically when the loop is exited.
	     */
	    async *readMany(options) {
	        try {
	            this.dataEvents = (0, on_data_1.onData)(this.messageStream, options);
	            this.messageStream.resume();
	            for await (const message of this.dataEvents) {
	                const response = await (0, compression_1.decompressResponse)(message);
	                yield response;
	                if (!response.moreToCome) {
	                    return;
	                }
	            }
	        }
	        catch (readError) {
	            if (timeout_1.TimeoutError.is(readError)) {
	                const timeoutError = new error_1.MongoOperationTimeoutError(`Timed out during socket read (${readError.duration}ms)`);
	                this.dataEvents = null;
	                this.onError(timeoutError);
	                throw timeoutError;
	            }
	            else if (readError === options.signal?.reason) {
	                this.onError(readError);
	            }
	            throw readError;
	        }
	        finally {
	            this.dataEvents = null;
	            this.messageStream.pause();
	        }
	    }
	}
	connection.Connection = Connection;
	/** @internal */
	class SizedMessageTransform extends stream_1.Transform {
	    constructor({ connection }) {
	        super({ writableObjectMode: false, readableObjectMode: true });
	        this.bufferPool = new utils_1.BufferPool();
	        this.connection = connection;
	    }
	    _transform(chunk, encoding, callback) {
	        if (this.connection.delayedTimeoutId != null) {
	            (0, timers_1.clearTimeout)(this.connection.delayedTimeoutId);
	            this.connection.delayedTimeoutId = null;
	        }
	        this.bufferPool.append(chunk);
	        while (this.bufferPool.length) {
	            // While there are any bytes in the buffer
	            // Try to fetch a size from the top 4 bytes
	            const sizeOfMessage = this.bufferPool.getInt32();
	            if (sizeOfMessage == null) {
	                // Not even an int32 worth of data. Stop the loop, we need more chunks.
	                break;
	            }
	            if (sizeOfMessage < 0) {
	                // The size in the message has a negative value, this is probably corruption, throw:
	                return callback(new error_1.MongoParseError(`Message size cannot be negative: ${sizeOfMessage}`));
	            }
	            if (sizeOfMessage > this.bufferPool.length) {
	                // We do not have enough bytes to make a sizeOfMessage chunk
	                break;
	            }
	            // Add a message to the stream
	            const message = this.bufferPool.read(sizeOfMessage);
	            if (!this.push(message)) {
	                // We only subscribe to data events so we should never get backpressure
	                // if we do, we do not have the handling for it.
	                return callback(new error_1.MongoRuntimeError(`SizedMessageTransform does not support backpressure`));
	            }
	        }
	        callback();
	    }
	}
	connection.SizedMessageTransform = SizedMessageTransform;
	/** @internal */
	class CryptoConnection extends Connection {
	    constructor(stream, options) {
	        super(stream, options);
	        this.autoEncrypter = options.autoEncrypter;
	    }
	    async command(ns, cmd, options, responseType) {
	        const { autoEncrypter } = this;
	        if (!autoEncrypter) {
	            throw new error_1.MongoRuntimeError('No AutoEncrypter available for encryption');
	        }
	        const serverWireVersion = (0, utils_1.maxWireVersion)(this);
	        if (serverWireVersion === 0) {
	            // This means the initial handshake hasn't happened yet
	            return await super.command(ns, cmd, options, responseType);
	        }
	        // Save sort or indexKeys based on the command being run
	        // the encrypt API serializes our JS objects to BSON to pass to the native code layer
	        // and then deserializes the encrypted result, the protocol level components
	        // of the command (ex. sort) are then converted to JS objects potentially losing
	        // import key order information. These fields are never encrypted so we can save the values
	        // from before the encryption and replace them after encryption has been performed
	        const sort = cmd.find || cmd.findAndModify ? cmd.sort : null;
	        const indexKeys = cmd.createIndexes
	            ? cmd.indexes.map((index) => index.key)
	            : null;
	        const encrypted = await autoEncrypter.encrypt(ns.toString(), cmd, options);
	        // Replace the saved values
	        if (sort != null && (cmd.find || cmd.findAndModify)) {
	            encrypted.sort = sort;
	        }
	        if (indexKeys != null && cmd.createIndexes) {
	            for (const [offset, index] of indexKeys.entries()) {
	                // @ts-expect-error `encrypted` is a generic "command", but we've narrowed for only `createIndexes` commands here
	                encrypted.indexes[offset].key = index;
	            }
	        }
	        const encryptedResponse = await super.command(ns, encrypted, options, 
	        // Eventually we want to require `responseType` which means we would satisfy `T` as the return type.
	        // In the meantime, we want encryptedResponse to always be _at least_ a MongoDBResponse if not a more specific subclass
	        // So that we can ensure we have access to the on-demand APIs for decorate response
	        responseType ?? responses_1.MongoDBResponse);
	        const result = await autoEncrypter.decrypt(encryptedResponse.toBytes(), options);
	        const decryptedResponse = responseType?.make(result) ?? (0, bson_1.deserialize)(result, options);
	        if (autoEncrypter[constants_1.kDecorateResult]) {
	            if (responseType == null) {
	                (0, utils_1.decorateDecryptionResult)(decryptedResponse, encryptedResponse.toObject(), true);
	            }
	            else if (decryptedResponse instanceof responses_1.CursorResponse) {
	                decryptedResponse.encryptedResponse = encryptedResponse;
	            }
	        }
	        return decryptedResponse;
	    }
	}
	connection.CryptoConnection = CryptoConnection;
	
	return connection;
}

var hasRequiredConnect;

function requireConnect () {
	if (hasRequiredConnect) return connect;
	hasRequiredConnect = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.LEGAL_TCP_SOCKET_OPTIONS = exports.LEGAL_TLS_SOCKET_OPTIONS = exports.DEFAULT_KEEP_ALIVE_INITIAL_DELAY_MS = void 0;
		exports.connect = connect;
		exports.makeConnection = makeConnection;
		exports.performInitialHandshake = performInitialHandshake;
		exports.prepareHandshakeDocument = prepareHandshakeDocument;
		exports.makeSocket = makeSocket;
		const net = require$$0$4;
		const tls = require$$3;
		const constants_1 = mongodb3.requireConstants();
		const deps_1 = mongodb4.requireDeps();
		const error_1 = mongodb4.requireError();
		const utils_1 = mongodb7.requireUtils();
		const auth_provider_1 = mongodb1.requireAuth_provider();
		const providers_1 = requireProviders();
		const connection_1 = requireConnection();
		const constants_2 = requireConstants();
		function applyBackpressureLabels(error) {
		    error.addErrorLabel(error_1.MongoErrorLabel.SystemOverloadedError);
		    error.addErrorLabel(error_1.MongoErrorLabel.RetryableError);
		}
		async function connect(options) {
		    let connection = null;
		    try {
		        const socket = await makeSocket(options);
		        connection = makeConnection(options, socket);
		        await performInitialHandshake(connection, options);
		        return connection;
		    }
		    catch (error) {
		        connection?.destroy();
		        throw error;
		    }
		}
		function makeConnection(options, socket) {
		    let ConnectionType = options.connectionType ?? connection_1.Connection;
		    if (options.autoEncrypter) {
		        ConnectionType = connection_1.CryptoConnection;
		    }
		    return new ConnectionType(socket, options);
		}
		function checkSupportedServer(hello, options) {
		    const maxWireVersion = Number(hello.maxWireVersion);
		    const minWireVersion = Number(hello.minWireVersion);
		    const serverVersionHighEnough = !Number.isNaN(maxWireVersion) && maxWireVersion >= constants_2.MIN_SUPPORTED_WIRE_VERSION;
		    const serverVersionLowEnough = !Number.isNaN(minWireVersion) && minWireVersion <= constants_2.MAX_SUPPORTED_WIRE_VERSION;
		    if (serverVersionHighEnough) {
		        if (serverVersionLowEnough) {
		            return null;
		        }
		        const message = `Server at ${options.hostAddress} reports minimum wire version ${JSON.stringify(hello.minWireVersion)}, but this version of the Node.js Driver requires at most ${constants_2.MAX_SUPPORTED_WIRE_VERSION} (MongoDB ${constants_2.MAX_SUPPORTED_SERVER_VERSION})`;
		        return new error_1.MongoCompatibilityError(message);
		    }
		    const message = `Server at ${options.hostAddress} reports maximum wire version ${JSON.stringify(hello.maxWireVersion) ?? 0}, but this version of the Node.js Driver requires at least ${constants_2.MIN_SUPPORTED_WIRE_VERSION} (MongoDB ${constants_2.MIN_SUPPORTED_SERVER_VERSION})`;
		    return new error_1.MongoCompatibilityError(message);
		}
		async function performInitialHandshake(conn, options) {
		    const credentials = options.credentials;
		    if (credentials) {
		        if (!(credentials.mechanism === providers_1.AuthMechanism.MONGODB_DEFAULT) &&
		            !options.authProviders.getOrCreateProvider(credentials.mechanism, credentials.mechanismProperties)) {
		            throw new error_1.MongoInvalidArgumentError(`AuthMechanism '${credentials.mechanism}' not supported`);
		        }
		    }
		    const authContext = new auth_provider_1.AuthContext(conn, credentials, options);
		    conn.authContext = authContext;
		    // If we encounter an error preparing the handshake document, do NOT apply backpressure labels.  Errors
		    // encountered building the handshake document are all client-side, and do not indicate an overloaded server.
		    const handshakeDoc = await prepareHandshakeDocument(authContext);
		    // @ts-expect-error: TODO(NODE-5141): The options need to be filtered properly, Connection options differ from Command options
		    const handshakeOptions = { ...options, raw: false };
		    if (typeof options.connectTimeoutMS === 'number') {
		        // The handshake technically is a monitoring check, so its socket timeout should be connectTimeoutMS
		        handshakeOptions.socketTimeoutMS = options.connectTimeoutMS;
		    }
		    const start = new Date().getTime();
		    const response = await executeHandshake(handshakeDoc, handshakeOptions);
		    if (!('isWritablePrimary' in response)) {
		        // Provide hello-style response document.
		        response.isWritablePrimary = response[constants_1.LEGACY_HELLO_COMMAND];
		    }
		    if (response.helloOk) {
		        conn.helloOk = true;
		    }
		    const supportedServerErr = checkSupportedServer(response, options);
		    if (supportedServerErr) {
		        throw supportedServerErr;
		    }
		    if (options.loadBalanced) {
		        if (!response.serviceId) {
		            throw new error_1.MongoCompatibilityError('Driver attempted to initialize in load balancing mode, ' +
		                'but the server does not support this mode.');
		        }
		    }
		    // NOTE: This is metadata attached to the connection while porting away from
		    //       handshake being done in the `Server` class. Likely, it should be
		    //       relocated, or at very least restructured.
		    conn.hello = response;
		    conn.lastHelloMS = new Date().getTime() - start;
		    if (!response.arbiterOnly && credentials) {
		        // store the response on auth context
		        authContext.response = response;
		        const resolvedCredentials = credentials.resolveAuthMechanism(response);
		        const provider = options.authProviders.getOrCreateProvider(resolvedCredentials.mechanism, resolvedCredentials.mechanismProperties);
		        if (!provider) {
		            throw new error_1.MongoInvalidArgumentError(`No AuthProvider for ${resolvedCredentials.mechanism} defined.`);
		        }
		        try {
		            await provider.auth(authContext);
		        }
		        catch (error) {
		            // NOTE: If we encounter an error authenticating a connection, do NOT apply backpressure labels.
		            if (error instanceof error_1.MongoError) {
		                error.addErrorLabel(error_1.MongoErrorLabel.HandshakeError);
		                if ((0, error_1.needsRetryableWriteLabel)(error, response.maxWireVersion, conn.description.type)) {
		                    error.addErrorLabel(error_1.MongoErrorLabel.RetryableWriteError);
		                }
		            }
		            throw error;
		        }
		    }
		    // Connection establishment is socket creation (tcp handshake, tls handshake, MongoDB handshake (saslStart, saslContinue))
		    // Once connection is established, command logging can log events (if enabled)
		    conn.established = true;
		    async function executeHandshake(handshakeDoc, handshakeOptions) {
		        try {
		            const handshakeResponse = await conn.command((0, utils_1.ns)('admin.$cmd'), handshakeDoc, handshakeOptions);
		            return handshakeResponse;
		        }
		        catch (error) {
		            if (error instanceof error_1.MongoError) {
		                error.addErrorLabel(error_1.MongoErrorLabel.HandshakeError);
		            }
		            // If we encounter a network error executing the initial handshake, apply backpressure labels.
		            if (error instanceof error_1.MongoNetworkError) {
		                applyBackpressureLabels(error);
		            }
		            throw error;
		        }
		    }
		}
		/**
		 * @internal
		 *
		 * This function is only exposed for testing purposes.
		 */
		async function prepareHandshakeDocument(authContext) {
		    const options = authContext.options;
		    const compressors = options.compressors ? options.compressors : [];
		    const { serverApi } = authContext.connection;
		    const clientMetadata = await options.metadata;
		    const handshakeDoc = {
		        [serverApi?.version || options.loadBalanced === true ? 'hello' : constants_1.LEGACY_HELLO_COMMAND]: 1,
		        backpressure: true,
		        helloOk: true,
		        client: clientMetadata,
		        compression: compressors
		    };
		    if (options.loadBalanced === true) {
		        handshakeDoc.loadBalanced = true;
		    }
		    const credentials = authContext.credentials;
		    if (credentials) {
		        if (credentials.mechanism === providers_1.AuthMechanism.MONGODB_DEFAULT && credentials.username) {
		            handshakeDoc.saslSupportedMechs = `${credentials.source}.${credentials.username}`;
		            const provider = authContext.options.authProviders.getOrCreateProvider(providers_1.AuthMechanism.MONGODB_SCRAM_SHA256, credentials.mechanismProperties);
		            if (!provider) {
		                // This auth mechanism is always present.
		                throw new error_1.MongoInvalidArgumentError(`No AuthProvider for ${providers_1.AuthMechanism.MONGODB_SCRAM_SHA256} defined.`);
		            }
		            return await provider.prepare(handshakeDoc, authContext);
		        }
		        const provider = authContext.options.authProviders.getOrCreateProvider(credentials.mechanism, credentials.mechanismProperties);
		        if (!provider) {
		            throw new error_1.MongoInvalidArgumentError(`No AuthProvider for ${credentials.mechanism} defined.`);
		        }
		        return await provider.prepare(handshakeDoc, authContext);
		    }
		    return handshakeDoc;
		}
		/**
		 * @internal
		 * Default TCP keepAlive initial delay in milliseconds.
		 * Set to half the Azure load balancer idle timeout (240s) to ensure
		 * probes fire well before cloud LBs (Azure, AWS PrivateLink/NLB)
		 * drop idle connections.
		 */
		exports.DEFAULT_KEEP_ALIVE_INITIAL_DELAY_MS = 120_000;
		/** @public */
		exports.LEGAL_TLS_SOCKET_OPTIONS = [
		    'allowPartialTrustChain',
		    'ALPNProtocols',
		    'ca',
		    'cert',
		    'checkServerIdentity',
		    'ciphers',
		    'crl',
		    'ecdhCurve',
		    'key',
		    'minDHSize',
		    'passphrase',
		    'pfx',
		    'rejectUnauthorized',
		    'secureContext',
		    'secureProtocol',
		    'servername',
		    'session'
		];
		/** @public */
		exports.LEGAL_TCP_SOCKET_OPTIONS = [
		    'autoSelectFamily',
		    'autoSelectFamilyAttemptTimeout',
		    'keepAliveInitialDelay',
		    'family',
		    'hints',
		    'localAddress',
		    'localPort',
		    'lookup'
		];
		function parseConnectOptions(options) {
		    const hostAddress = options.hostAddress;
		    if (!hostAddress)
		        throw new error_1.MongoInvalidArgumentError('Option "hostAddress" is required');
		    const result = {};
		    for (const name of exports.LEGAL_TCP_SOCKET_OPTIONS) {
		        if (options[name] != null) {
		            result[name] = options[name];
		        }
		    }
		    result.keepAliveInitialDelay ??= exports.DEFAULT_KEEP_ALIVE_INITIAL_DELAY_MS;
		    result.keepAlive = true;
		    result.noDelay = options.noDelay ?? true;
		    if (typeof hostAddress.socketPath === 'string') {
		        result.path = hostAddress.socketPath;
		        return result;
		    }
		    else if (typeof hostAddress.host === 'string') {
		        result.host = hostAddress.host;
		        result.port = hostAddress.port;
		        return result;
		    }
		    else {
		        // This should never happen since we set up HostAddresses
		        // But if we don't throw here the socket could hang until timeout
		        // TODO(NODE-3483)
		        throw new error_1.MongoRuntimeError(`Unexpected HostAddress ${JSON.stringify(hostAddress)}`);
		    }
		}
		function parseSslOptions(options) {
		    const result = parseConnectOptions(options);
		    // Merge in valid SSL options
		    for (const name of exports.LEGAL_TLS_SOCKET_OPTIONS) {
		        if (options[name] != null) {
		            result[name] = options[name];
		        }
		    }
		    if (options.existingSocket) {
		        result.socket = options.existingSocket;
		    }
		    // Set default sni servername to be the same as host
		    if (result.servername == null && result.host && !net.isIP(result.host)) {
		        result.servername = result.host;
		    }
		    return result;
		}
		async function makeSocket(options) {
		    const useTLS = options.tls ?? false;
		    const connectTimeoutMS = options.connectTimeoutMS ?? 30000;
		    const existingSocket = options.existingSocket;
		    const keepAliveInitialDelay = options.keepAliveInitialDelay ?? exports.DEFAULT_KEEP_ALIVE_INITIAL_DELAY_MS;
		    const noDelay = options.noDelay ?? true;
		    let socket;
		    if (options.proxyHost != null) {
		        // Currently, only Socks5 is supported.
		        return await makeSocks5Connection({
		            ...options,
		            connectTimeoutMS // Should always be present for Socks5
		        });
		    }
		    if (useTLS) {
		        const tlsSocket = tls.connect(parseSslOptions(options));
		        if (typeof tlsSocket.disableRenegotiation === 'function') {
		            tlsSocket.disableRenegotiation();
		        }
		        socket = tlsSocket;
		    }
		    else if (existingSocket) {
		        // In the TLS case, parseSslOptions() sets options.socket to existingSocket,
		        // so we only need to handle the non-TLS case here (where existingSocket
		        // gives us all we need out of the box).
		        socket = existingSocket;
		    }
		    else {
		        socket = net.createConnection(parseConnectOptions(options));
		    }
		    // Explicit setKeepAlive/setNoDelay are required because tls.connect() silently
		    // ignores these constructor options due to a Node.js bug.
		    // See: https://github.com/nodejs/node/issues/62003
		    // TODO(NODE-7474): remove this fix once the underlying Node.js issue is resolved.
		    socket.setKeepAlive(true, keepAliveInitialDelay);
		    socket.setNoDelay(noDelay);
		    socket.setTimeout(connectTimeoutMS);
		    let cancellationHandler = null;
		    const { promise: connectedSocket, resolve, reject } = (0, utils_1.promiseWithResolvers)();
		    if (existingSocket) {
		        resolve(socket);
		    }
		    else {
		        const start = performance.now();
		        const connectEvent = useTLS ? 'secureConnect' : 'connect';
		        socket
		            .once(connectEvent, () => resolve(socket))
		            .once('error', cause => reject(new error_1.MongoNetworkError(error_1.MongoError.buildErrorMessage(cause), { cause })))
		            .once('timeout', () => {
		            reject(new error_1.MongoNetworkTimeoutError(`Socket '${connectEvent}' timed out after ${(performance.now() - start) | 0}ms (connectTimeoutMS: ${connectTimeoutMS})`));
		        })
		            .once('close', () => reject(new error_1.MongoNetworkError(`Socket closed after ${(performance.now() - start) | 0} during connection establishment`)));
		        if (options.cancellationToken != null) {
		            cancellationHandler = () => reject(new error_1.MongoNetworkError(`Socket connection establishment was cancelled after ${(performance.now() - start) | 0}`));
		            options.cancellationToken.once('cancel', cancellationHandler);
		        }
		    }
		    try {
		        socket = await connectedSocket;
		        return socket;
		    }
		    catch (error) {
		        // If we encounter an error while establishing a socket, apply the backpressure labels to it.  We cannot
		        // differentiate between DNS, TLS errors and network errors without refactoring our connection establishment to
		        // handle all three steps separately.
		        applyBackpressureLabels(error);
		        socket.destroy();
		        throw error;
		    }
		    finally {
		        socket.setTimeout(0);
		        if (cancellationHandler != null) {
		            options.cancellationToken?.removeListener('cancel', cancellationHandler);
		        }
		    }
		}
		let socks = null;
		function loadSocks() {
		    if (socks == null) {
		        const socksImport = (0, deps_1.getSocks)();
		        if ('kModuleError' in socksImport) {
		            throw socksImport.kModuleError;
		        }
		        socks = socksImport;
		    }
		    return socks;
		}
		async function makeSocks5Connection(options) {
		    const hostAddress = utils_1.HostAddress.fromHostPort(options.proxyHost ?? '', // proxyHost is guaranteed to set here
		    options.proxyPort ?? 1080);
		    // First, connect to the proxy server itself:
		    const rawSocket = await makeSocket({
		        ...options,
		        hostAddress,
		        tls: false,
		        proxyHost: undefined
		    });
		    const destination = parseConnectOptions(options);
		    if (typeof destination.host !== 'string' || typeof destination.port !== 'number') {
		        throw new error_1.MongoInvalidArgumentError('Can only make Socks5 connections to TCP hosts');
		    }
		    socks ??= loadSocks();
		    let existingSocket;
		    try {
		        // Then, establish the Socks5 proxy connection:
		        const connection = await socks.SocksClient.createConnection({
		            existing_socket: rawSocket,
		            timeout: options.connectTimeoutMS,
		            command: 'connect',
		            destination: {
		                host: destination.host,
		                port: destination.port
		            },
		            proxy: {
		                // host and port are ignored because we pass existing_socket
		                host: 'iLoveJavaScript',
		                port: 0,
		                type: 5,
		                userId: options.proxyUsername || undefined,
		                password: options.proxyPassword || undefined
		            }
		        });
		        existingSocket = connection.socket;
		    }
		    catch (cause) {
		        throw new error_1.MongoNetworkError(error_1.MongoError.buildErrorMessage(cause), { cause });
		    }
		    // Finally, now treat the resulting duplex stream as the
		    // socket over which we send and receive wire protocol messages:
		    return await makeSocket({ ...options, existingSocket, proxyHost: undefined });
		}
		
	} (connect));
	return connect;
}

var connection_pool = {};

var connection_pool_events = {};

var hasRequiredConnection_pool_events;

function requireConnection_pool_events () {
	if (hasRequiredConnection_pool_events) return connection_pool_events;
	hasRequiredConnection_pool_events = 1;
	Object.defineProperty(connection_pool_events, "__esModule", { value: true });
	connection_pool_events.ConnectionPoolClearedEvent = connection_pool_events.ConnectionCheckedInEvent = connection_pool_events.ConnectionCheckedOutEvent = connection_pool_events.ConnectionCheckOutFailedEvent = connection_pool_events.ConnectionCheckOutStartedEvent = connection_pool_events.ConnectionClosedEvent = connection_pool_events.ConnectionReadyEvent = connection_pool_events.ConnectionCreatedEvent = connection_pool_events.ConnectionPoolClosedEvent = connection_pool_events.ConnectionPoolReadyEvent = connection_pool_events.ConnectionPoolCreatedEvent = connection_pool_events.ConnectionPoolMonitoringEvent = void 0;
	const constants_1 = mongodb3.requireConstants();
	const utils_1 = mongodb7.requireUtils();
	/**
	 * The base export class for all monitoring events published from the connection pool
	 * @public
	 * @category Event
	 */
	class ConnectionPoolMonitoringEvent {
	    /** @internal */
	    constructor(pool) {
	        this.time = new Date();
	        this.address = pool.address;
	    }
	}
	connection_pool_events.ConnectionPoolMonitoringEvent = ConnectionPoolMonitoringEvent;
	/**
	 * An event published when a connection pool is created
	 * @public
	 * @category Event
	 */
	class ConnectionPoolCreatedEvent extends ConnectionPoolMonitoringEvent {
	    /** @internal */
	    constructor(pool) {
	        super(pool);
	        /** @internal */
	        this.name = constants_1.CONNECTION_POOL_CREATED;
	        const { maxConnecting, maxPoolSize, minPoolSize, maxIdleTimeMS, waitQueueTimeoutMS } = pool.options;
	        this.options = { maxConnecting, maxPoolSize, minPoolSize, maxIdleTimeMS, waitQueueTimeoutMS };
	    }
	}
	connection_pool_events.ConnectionPoolCreatedEvent = ConnectionPoolCreatedEvent;
	/**
	 * An event published when a connection pool is ready
	 * @public
	 * @category Event
	 */
	class ConnectionPoolReadyEvent extends ConnectionPoolMonitoringEvent {
	    /** @internal */
	    constructor(pool) {
	        super(pool);
	        /** @internal */
	        this.name = constants_1.CONNECTION_POOL_READY;
	    }
	}
	connection_pool_events.ConnectionPoolReadyEvent = ConnectionPoolReadyEvent;
	/**
	 * An event published when a connection pool is closed
	 * @public
	 * @category Event
	 */
	class ConnectionPoolClosedEvent extends ConnectionPoolMonitoringEvent {
	    /** @internal */
	    constructor(pool) {
	        super(pool);
	        /** @internal */
	        this.name = constants_1.CONNECTION_POOL_CLOSED;
	    }
	}
	connection_pool_events.ConnectionPoolClosedEvent = ConnectionPoolClosedEvent;
	/**
	 * An event published when a connection pool creates a new connection
	 * @public
	 * @category Event
	 */
	class ConnectionCreatedEvent extends ConnectionPoolMonitoringEvent {
	    /** @internal */
	    constructor(pool, connection) {
	        super(pool);
	        /** @internal */
	        this.name = constants_1.CONNECTION_CREATED;
	        this.connectionId = connection.id;
	    }
	}
	connection_pool_events.ConnectionCreatedEvent = ConnectionCreatedEvent;
	/**
	 * An event published when a connection is ready for use
	 * @public
	 * @category Event
	 */
	class ConnectionReadyEvent extends ConnectionPoolMonitoringEvent {
	    /** @internal */
	    constructor(pool, connection, connectionCreatedEventTime) {
	        super(pool);
	        /** @internal */
	        this.name = constants_1.CONNECTION_READY;
	        this.durationMS = (0, utils_1.processTimeMS)() - connectionCreatedEventTime;
	        this.connectionId = connection.id;
	    }
	}
	connection_pool_events.ConnectionReadyEvent = ConnectionReadyEvent;
	/**
	 * An event published when a connection is closed
	 * @public
	 * @category Event
	 */
	class ConnectionClosedEvent extends ConnectionPoolMonitoringEvent {
	    /** @internal */
	    constructor(pool, connection, reason, error) {
	        super(pool);
	        /** @internal */
	        this.name = constants_1.CONNECTION_CLOSED;
	        this.connectionId = connection.id;
	        this.reason = reason;
	        this.serviceId = connection.serviceId;
	        this.error = error ?? null;
	    }
	}
	connection_pool_events.ConnectionClosedEvent = ConnectionClosedEvent;
	/**
	 * An event published when a request to check a connection out begins
	 * @public
	 * @category Event
	 */
	class ConnectionCheckOutStartedEvent extends ConnectionPoolMonitoringEvent {
	    /** @internal */
	    constructor(pool) {
	        super(pool);
	        /** @internal */
	        this.name = constants_1.CONNECTION_CHECK_OUT_STARTED;
	    }
	}
	connection_pool_events.ConnectionCheckOutStartedEvent = ConnectionCheckOutStartedEvent;
	/**
	 * An event published when a request to check a connection out fails
	 * @public
	 * @category Event
	 */
	class ConnectionCheckOutFailedEvent extends ConnectionPoolMonitoringEvent {
	    /** @internal */
	    constructor(pool, reason, checkoutTime, error) {
	        super(pool);
	        /** @internal */
	        this.name = constants_1.CONNECTION_CHECK_OUT_FAILED;
	        this.durationMS = (0, utils_1.processTimeMS)() - checkoutTime;
	        this.reason = reason;
	        this.error = error;
	    }
	}
	connection_pool_events.ConnectionCheckOutFailedEvent = ConnectionCheckOutFailedEvent;
	/**
	 * An event published when a connection is checked out of the connection pool
	 * @public
	 * @category Event
	 */
	class ConnectionCheckedOutEvent extends ConnectionPoolMonitoringEvent {
	    /** @internal */
	    constructor(pool, connection, checkoutTime) {
	        super(pool);
	        /** @internal */
	        this.name = constants_1.CONNECTION_CHECKED_OUT;
	        this.durationMS = (0, utils_1.processTimeMS)() - checkoutTime;
	        this.connectionId = connection.id;
	    }
	}
	connection_pool_events.ConnectionCheckedOutEvent = ConnectionCheckedOutEvent;
	/**
	 * An event published when a connection is checked into the connection pool
	 * @public
	 * @category Event
	 */
	class ConnectionCheckedInEvent extends ConnectionPoolMonitoringEvent {
	    /** @internal */
	    constructor(pool, connection) {
	        super(pool);
	        /** @internal */
	        this.name = constants_1.CONNECTION_CHECKED_IN;
	        this.connectionId = connection.id;
	    }
	}
	connection_pool_events.ConnectionCheckedInEvent = ConnectionCheckedInEvent;
	/**
	 * An event published when a connection pool is cleared
	 * @public
	 * @category Event
	 */
	class ConnectionPoolClearedEvent extends ConnectionPoolMonitoringEvent {
	    /** @internal */
	    constructor(pool, options = {}) {
	        super(pool);
	        /** @internal */
	        this.name = constants_1.CONNECTION_POOL_CLEARED;
	        this.serviceId = options.serviceId;
	        this.interruptInUseConnections = options.interruptInUseConnections;
	    }
	}
	connection_pool_events.ConnectionPoolClearedEvent = ConnectionPoolClearedEvent;
	
	return connection_pool_events;
}

var errors = {};

var hasRequiredErrors;

function requireErrors () {
	if (hasRequiredErrors) return errors;
	hasRequiredErrors = 1;
	Object.defineProperty(errors, "__esModule", { value: true });
	errors.WaitQueueTimeoutError = errors.PoolClearedOnNetworkError = errors.PoolClearedError = errors.PoolClosedError = void 0;
	const error_1 = mongodb4.requireError();
	/**
	 * An error indicating a connection pool is closed
	 * @category Error
	 */
	class PoolClosedError extends error_1.MongoDriverError {
	    /**
	     * **Do not use this constructor!**
	     *
	     * Meant for internal use only.
	     *
	     * @remarks
	     * This class is only meant to be constructed within the driver. This constructor is
	     * not subject to semantic versioning compatibility guarantees and may change at any time.
	     *
	     * @public
	     **/
	    constructor(pool) {
	        super('Attempted to check out a connection from closed connection pool');
	        this.address = pool.address;
	    }
	    get name() {
	        return 'MongoPoolClosedError';
	    }
	}
	errors.PoolClosedError = PoolClosedError;
	/**
	 * An error indicating a connection pool is currently paused
	 * @category Error
	 */
	class PoolClearedError extends error_1.MongoNetworkError {
	    /**
	     * **Do not use this constructor!**
	     *
	     * Meant for internal use only.
	     *
	     * @remarks
	     * This class is only meant to be constructed within the driver. This constructor is
	     * not subject to semantic versioning compatibility guarantees and may change at any time.
	     *
	     * @public
	     **/
	    constructor(pool, message) {
	        const errorMessage = message
	            ? message
	            : `Connection pool for ${pool.address} was cleared because another operation failed with: "${pool.serverError?.message}"`;
	        super(errorMessage, pool.serverError ? { cause: pool.serverError } : undefined);
	        this.address = pool.address;
	        this.addErrorLabel(error_1.MongoErrorLabel.PoolRequestedRetry);
	    }
	    get name() {
	        return 'MongoPoolClearedError';
	    }
	}
	errors.PoolClearedError = PoolClearedError;
	/**
	 * An error indicating that a connection pool has been cleared after the monitor for that server timed out.
	 * @category Error
	 */
	class PoolClearedOnNetworkError extends PoolClearedError {
	    /**
	     * **Do not use this constructor!**
	     *
	     * Meant for internal use only.
	     *
	     * @remarks
	     * This class is only meant to be constructed within the driver. This constructor is
	     * not subject to semantic versioning compatibility guarantees and may change at any time.
	     *
	     * @public
	     **/
	    constructor(pool) {
	        super(pool, `Connection to ${pool.address} interrupted due to server monitor timeout`);
	    }
	    get name() {
	        return 'PoolClearedOnNetworkError';
	    }
	}
	errors.PoolClearedOnNetworkError = PoolClearedOnNetworkError;
	/**
	 * An error thrown when a request to check out a connection times out
	 * @category Error
	 */
	class WaitQueueTimeoutError extends error_1.MongoDriverError {
	    /**
	     * **Do not use this constructor!**
	     *
	     * Meant for internal use only.
	     *
	     * @remarks
	     * This class is only meant to be constructed within the driver. This constructor is
	     * not subject to semantic versioning compatibility guarantees and may change at any time.
	     *
	     * @public
	     **/
	    constructor(message, address) {
	        super(message);
	        this.address = address;
	    }
	    get name() {
	        return 'MongoWaitQueueTimeoutError';
	    }
	}
	errors.WaitQueueTimeoutError = WaitQueueTimeoutError;
	
	return errors;
}

var hasRequiredConnection_pool;

function requireConnection_pool () {
	if (hasRequiredConnection_pool) return connection_pool;
	hasRequiredConnection_pool = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.ConnectionPool = exports.PoolState = void 0;
		const timers_1 = require$$0$2;
		const constants_1 = mongodb3.requireConstants();
		const error_1 = mongodb4.requireError();
		const mongo_types_1 = mongodb5.requireMongo_types();
		const timeout_1 = mongodb6.requireTimeout();
		const utils_1 = mongodb7.requireUtils();
		const connect_1 = requireConnect();
		const connection_1 = requireConnection();
		const connection_pool_events_1 = requireConnection_pool_events();
		const errors_1 = requireErrors();
		const metrics_1 = requireMetrics();
		/** @internal */
		exports.PoolState = Object.freeze({
		    paused: 'paused',
		    ready: 'ready',
		    closed: 'closed'
		});
		/**
		 * A pool of connections which dynamically resizes, and emit events related to pool activity
		 * @internal
		 */
		class ConnectionPool extends mongo_types_1.TypedEventEmitter {
		    /**
		     * Emitted when the connection pool is created.
		     * @event
		     */
		    static { this.CONNECTION_POOL_CREATED = constants_1.CONNECTION_POOL_CREATED; }
		    /**
		     * Emitted once when the connection pool is closed
		     * @event
		     */
		    static { this.CONNECTION_POOL_CLOSED = constants_1.CONNECTION_POOL_CLOSED; }
		    /**
		     * Emitted each time the connection pool is cleared and it's generation incremented
		     * @event
		     */
		    static { this.CONNECTION_POOL_CLEARED = constants_1.CONNECTION_POOL_CLEARED; }
		    /**
		     * Emitted each time the connection pool is marked ready
		     * @event
		     */
		    static { this.CONNECTION_POOL_READY = constants_1.CONNECTION_POOL_READY; }
		    /**
		     * Emitted when a connection is created.
		     * @event
		     */
		    static { this.CONNECTION_CREATED = constants_1.CONNECTION_CREATED; }
		    /**
		     * Emitted when a connection becomes established, and is ready to use
		     * @event
		     */
		    static { this.CONNECTION_READY = constants_1.CONNECTION_READY; }
		    /**
		     * Emitted when a connection is closed
		     * @event
		     */
		    static { this.CONNECTION_CLOSED = constants_1.CONNECTION_CLOSED; }
		    /**
		     * Emitted when an attempt to check out a connection begins
		     * @event
		     */
		    static { this.CONNECTION_CHECK_OUT_STARTED = constants_1.CONNECTION_CHECK_OUT_STARTED; }
		    /**
		     * Emitted when an attempt to check out a connection fails
		     * @event
		     */
		    static { this.CONNECTION_CHECK_OUT_FAILED = constants_1.CONNECTION_CHECK_OUT_FAILED; }
		    /**
		     * Emitted each time a connection is successfully checked out of the connection pool
		     * @event
		     */
		    static { this.CONNECTION_CHECKED_OUT = constants_1.CONNECTION_CHECKED_OUT; }
		    /**
		     * Emitted each time a connection is successfully checked into the connection pool
		     * @event
		     */
		    static { this.CONNECTION_CHECKED_IN = constants_1.CONNECTION_CHECKED_IN; }
		    constructor(server, options) {
		        super();
		        this.on('error', utils_1.noop);
		        this.options = Object.freeze({
		            connectionType: connection_1.Connection,
		            ...options,
		            maxPoolSize: options.maxPoolSize ?? 100,
		            minPoolSize: options.minPoolSize ?? 0,
		            maxConnecting: options.maxConnecting ?? 2,
		            maxIdleTimeMS: options.maxIdleTimeMS ?? 0,
		            waitQueueTimeoutMS: options.waitQueueTimeoutMS ?? 0,
		            minPoolSizeCheckFrequencyMS: options.minPoolSizeCheckFrequencyMS ?? 100,
		            autoEncrypter: options.autoEncrypter
		        });
		        if (this.options.minPoolSize > this.options.maxPoolSize) {
		            throw new error_1.MongoInvalidArgumentError('Connection pool minimum size must not be greater than maximum pool size');
		        }
		        this.poolState = exports.PoolState.paused;
		        this.server = server;
		        this.connections = new utils_1.List();
		        this.pending = 0;
		        this.checkedOut = new Set();
		        this.minPoolSizeTimer = undefined;
		        this.generation = 0;
		        this.serviceGenerations = new Map();
		        this.connectionCounter = (0, utils_1.makeCounter)(1);
		        this.cancellationToken = new mongo_types_1.CancellationToken();
		        this.cancellationToken.setMaxListeners(Infinity);
		        this.waitQueue = new utils_1.List();
		        this.metrics = new metrics_1.ConnectionPoolMetrics();
		        this.processingWaitQueue = false;
		        this.mongoLogger = this.server.topology.client?.mongoLogger;
		        this.component = 'connection';
		        queueMicrotask(() => {
		            this.emitAndLog(ConnectionPool.CONNECTION_POOL_CREATED, new connection_pool_events_1.ConnectionPoolCreatedEvent(this));
		        });
		    }
		    /** The address of the endpoint the pool is connected to */
		    get address() {
		        return this.options.hostAddress.toString();
		    }
		    /**
		     * Check if the pool has been closed
		     *
		     * TODO(NODE-3263): We can remove this property once shell no longer needs it
		     */
		    get closed() {
		        return this.poolState === exports.PoolState.closed;
		    }
		    /** An integer expressing how many total connections (available + pending + in use) the pool currently has */
		    get totalConnectionCount() {
		        return (this.availableConnectionCount + this.pendingConnectionCount + this.currentCheckedOutCount);
		    }
		    /** An integer expressing how many connections are currently available in the pool. */
		    get availableConnectionCount() {
		        return this.connections.length;
		    }
		    get pendingConnectionCount() {
		        return this.pending;
		    }
		    get currentCheckedOutCount() {
		        return this.checkedOut.size;
		    }
		    get waitQueueSize() {
		        return this.waitQueue.length;
		    }
		    get loadBalanced() {
		        return this.options.loadBalanced;
		    }
		    get serverError() {
		        return this.server.description.error;
		    }
		    /**
		     * This is exposed ONLY for use in mongosh, to enable
		     * killing all connections if a user quits the shell with
		     * operations in progress.
		     *
		     * This property may be removed as a part of NODE-3263.
		     */
		    get checkedOutConnections() {
		        return this.checkedOut;
		    }
		    /**
		     * Get the metrics information for the pool when a wait queue timeout occurs.
		     */
		    waitQueueErrorMetrics() {
		        return this.metrics.info(this.options.maxPoolSize);
		    }
		    /**
		     * Set the pool state to "ready"
		     */
		    ready() {
		        if (this.poolState !== exports.PoolState.paused) {
		            return;
		        }
		        this.poolState = exports.PoolState.ready;
		        this.emitAndLog(ConnectionPool.CONNECTION_POOL_READY, new connection_pool_events_1.ConnectionPoolReadyEvent(this));
		        (0, timers_1.clearTimeout)(this.minPoolSizeTimer);
		        this.ensureMinPoolSize();
		    }
		    /**
		     * Check a connection out of this pool. The connection will continue to be tracked, but no reference to it
		     * will be held by the pool. This means that if a connection is checked out it MUST be checked back in or
		     * explicitly destroyed by the new owner.
		     */
		    async checkOut(options) {
		        const checkoutTime = (0, utils_1.processTimeMS)();
		        this.emitAndLog(ConnectionPool.CONNECTION_CHECK_OUT_STARTED, new connection_pool_events_1.ConnectionCheckOutStartedEvent(this));
		        const { promise, resolve, reject } = (0, utils_1.promiseWithResolvers)();
		        const timeout = options.timeoutContext.connectionCheckoutTimeout;
		        const waitQueueMember = {
		            resolve,
		            reject,
		            cancelled: false,
		            checkoutTime
		        };
		        const abortListener = (0, utils_1.addAbortListener)(options.signal, function () {
		            waitQueueMember.cancelled = true;
		            reject(this.reason);
		        });
		        this.waitQueue.push(waitQueueMember);
		        queueMicrotask(() => this.processWaitQueue());
		        try {
		            timeout?.throwIfExpired();
		            return await (timeout ? Promise.race([promise, timeout]) : promise);
		        }
		        catch (error) {
		            if (timeout_1.TimeoutError.is(error)) {
		                timeout?.clear();
		                waitQueueMember.cancelled = true;
		                this.emitAndLog(ConnectionPool.CONNECTION_CHECK_OUT_FAILED, new connection_pool_events_1.ConnectionCheckOutFailedEvent(this, 'timeout', waitQueueMember.checkoutTime));
		                const timeoutError = new errors_1.WaitQueueTimeoutError(this.loadBalanced
		                    ? this.waitQueueErrorMetrics()
		                    : 'Timed out while checking out a connection from connection pool', this.address);
		                if (options.timeoutContext.csotEnabled()) {
		                    throw new error_1.MongoOperationTimeoutError('Timed out during connection checkout', {
		                        cause: timeoutError
		                    });
		                }
		                throw timeoutError;
		            }
		            throw error;
		        }
		        finally {
		            abortListener?.[utils_1.kDispose]();
		            timeout?.clear();
		        }
		    }
		    /**
		     * Check a connection into the pool.
		     *
		     * @param connection - The connection to check in
		     */
		    checkIn(connection) {
		        if (!this.checkedOut.has(connection)) {
		            return;
		        }
		        const poolClosed = this.closed;
		        const stale = this.connectionIsStale(connection);
		        const willDestroy = !!(poolClosed || stale || connection.closed);
		        if (!willDestroy) {
		            connection.markAvailable();
		            this.connections.unshift(connection);
		        }
		        this.checkedOut.delete(connection);
		        this.emitAndLog(ConnectionPool.CONNECTION_CHECKED_IN, new connection_pool_events_1.ConnectionCheckedInEvent(this, connection));
		        if (willDestroy) {
		            const reason = connection.closed ? 'error' : poolClosed ? 'poolClosed' : 'stale';
		            this.destroyConnection(connection, reason);
		        }
		        queueMicrotask(() => this.processWaitQueue());
		    }
		    /**
		     * Clear the pool
		     *
		     * Pool reset is handled by incrementing the pool's generation count. Any existing connection of a
		     * previous generation will eventually be pruned during subsequent checkouts.
		     */
		    clear(options = {}) {
		        if (this.closed) {
		            return;
		        }
		        // handle load balanced case
		        if (this.loadBalanced) {
		            const { serviceId } = options;
		            if (!serviceId) {
		                throw new error_1.MongoRuntimeError('ConnectionPool.clear() called in load balanced mode with no serviceId.');
		            }
		            const sid = serviceId.toHexString();
		            const generation = this.serviceGenerations.get(sid);
		            // Only need to worry if the generation exists, since it should
		            // always be there but typescript needs the check.
		            if (generation == null) {
		                throw new error_1.MongoRuntimeError('Service generations are required in load balancer mode.');
		            }
		            else {
		                // Increment the generation for the service id.
		                this.serviceGenerations.set(sid, generation + 1);
		            }
		            this.emitAndLog(ConnectionPool.CONNECTION_POOL_CLEARED, new connection_pool_events_1.ConnectionPoolClearedEvent(this, { serviceId }));
		            return;
		        }
		        // handle non load-balanced case
		        const interruptInUseConnections = options.interruptInUseConnections ?? false;
		        const oldGeneration = this.generation;
		        this.generation += 1;
		        const alreadyPaused = this.poolState === exports.PoolState.paused;
		        this.poolState = exports.PoolState.paused;
		        this.clearMinPoolSizeTimer();
		        if (!alreadyPaused) {
		            this.emitAndLog(ConnectionPool.CONNECTION_POOL_CLEARED, new connection_pool_events_1.ConnectionPoolClearedEvent(this, {
		                interruptInUseConnections
		            }));
		        }
		        if (interruptInUseConnections) {
		            queueMicrotask(() => this.interruptInUseConnections(oldGeneration));
		        }
		        this.processWaitQueue();
		    }
		    /**
		     * Closes all stale in-use connections in the pool with a resumable PoolClearedOnNetworkError.
		     *
		     * Only connections where `connection.generation <= minGeneration` are killed.
		     */
		    interruptInUseConnections(minGeneration) {
		        for (const connection of this.checkedOut) {
		            if (connection.generation <= minGeneration) {
		                connection.onError(new errors_1.PoolClearedOnNetworkError(this));
		            }
		        }
		    }
		    /** For MongoClient.close() procedures */
		    closeCheckedOutConnections() {
		        for (const conn of this.checkedOut) {
		            conn.onError(new error_1.MongoClientClosedError());
		        }
		    }
		    /** Close the pool */
		    close() {
		        if (this.closed) {
		            return;
		        }
		        // immediately cancel any in-flight connections
		        this.cancellationToken.emit('cancel');
		        // end the connection counter
		        if (typeof this.connectionCounter.return === 'function') {
		            this.connectionCounter.return(undefined);
		        }
		        this.poolState = exports.PoolState.closed;
		        this.clearMinPoolSizeTimer();
		        this.processWaitQueue();
		        for (const conn of this.connections) {
		            this.emitAndLog(ConnectionPool.CONNECTION_CLOSED, new connection_pool_events_1.ConnectionClosedEvent(this, conn, 'poolClosed'));
		            conn.destroy();
		        }
		        this.connections.clear();
		        this.emitAndLog(ConnectionPool.CONNECTION_POOL_CLOSED, new connection_pool_events_1.ConnectionPoolClosedEvent(this));
		    }
		    /**
		     * @internal
		     * Reauthenticate a connection
		     */
		    async reauthenticate(connection) {
		        const authContext = connection.authContext;
		        if (!authContext) {
		            throw new error_1.MongoRuntimeError('No auth context found on connection.');
		        }
		        const credentials = authContext.credentials;
		        if (!credentials) {
		            throw new error_1.MongoMissingCredentialsError('Connection is missing credentials when asked to reauthenticate');
		        }
		        const resolvedCredentials = credentials.resolveAuthMechanism(connection.hello);
		        const provider = this.server.topology.client.s.authProviders.getOrCreateProvider(resolvedCredentials.mechanism, resolvedCredentials.mechanismProperties);
		        if (!provider) {
		            throw new error_1.MongoMissingCredentialsError(`Reauthenticate failed due to no auth provider for ${credentials.mechanism}`);
		        }
		        await provider.reauth(authContext);
		        return;
		    }
		    /** Clear the min pool size timer */
		    clearMinPoolSizeTimer() {
		        const minPoolSizeTimer = this.minPoolSizeTimer;
		        if (minPoolSizeTimer) {
		            (0, timers_1.clearTimeout)(minPoolSizeTimer);
		        }
		    }
		    destroyConnection(connection, reason) {
		        this.emitAndLog(ConnectionPool.CONNECTION_CLOSED, new connection_pool_events_1.ConnectionClosedEvent(this, connection, reason));
		        // destroy the connection
		        connection.destroy();
		    }
		    connectionIsStale(connection) {
		        const serviceId = connection.serviceId;
		        if (this.loadBalanced && serviceId) {
		            const sid = serviceId.toHexString();
		            const generation = this.serviceGenerations.get(sid);
		            return connection.generation !== generation;
		        }
		        return connection.generation !== this.generation;
		    }
		    connectionIsIdle(connection) {
		        return !!(this.options.maxIdleTimeMS && connection.idleTime > this.options.maxIdleTimeMS);
		    }
		    /**
		     * Destroys a connection if the connection is perished.
		     *
		     * @returns `true` if the connection was destroyed, `false` otherwise.
		     */
		    destroyConnectionIfPerished(connection) {
		        const isStale = this.connectionIsStale(connection);
		        const isIdle = this.connectionIsIdle(connection);
		        if (!isStale && !isIdle && !connection.closed) {
		            return false;
		        }
		        const reason = connection.closed ? 'error' : isStale ? 'stale' : 'idle';
		        this.destroyConnection(connection, reason);
		        return true;
		    }
		    createConnection(callback) {
		        // Note that metadata may have changed on the client but have
		        // been frozen here, so we pull the metadata promise always from the client
		        // no matter what options were set at the construction of the pool.
		        const connectOptions = {
		            ...this.options,
		            id: this.connectionCounter.next().value,
		            generation: this.generation,
		            cancellationToken: this.cancellationToken,
		            mongoLogger: this.mongoLogger,
		            authProviders: this.server.topology.client.s.authProviders,
		            metadata: this.server.topology.client.options.metadata
		        };
		        this.pending++;
		        // This is our version of a "virtual" no-I/O connection as the spec requires
		        const connectionCreatedTime = (0, utils_1.processTimeMS)();
		        this.emitAndLog(ConnectionPool.CONNECTION_CREATED, new connection_pool_events_1.ConnectionCreatedEvent(this, { id: connectOptions.id }));
		        (0, connect_1.connect)(connectOptions).then(connection => {
		            // The pool might have closed since we started trying to create a connection
		            if (this.poolState !== exports.PoolState.ready) {
		                this.pending--;
		                connection.destroy();
		                callback(this.closed ? new errors_1.PoolClosedError(this) : new errors_1.PoolClearedError(this));
		                return;
		            }
		            // forward all events from the connection to the pool
		            for (const event of [...constants_1.APM_EVENTS, connection_1.Connection.CLUSTER_TIME_RECEIVED]) {
		                connection.on(event, (e) => this.emit(event, e));
		            }
		            if (this.loadBalanced) {
		                connection.on(connection_1.Connection.PINNED, pinType => this.metrics.markPinned(pinType));
		                connection.on(connection_1.Connection.UNPINNED, pinType => this.metrics.markUnpinned(pinType));
		                const serviceId = connection.serviceId;
		                if (serviceId) {
		                    let generation;
		                    const sid = serviceId.toHexString();
		                    if ((generation = this.serviceGenerations.get(sid))) {
		                        connection.generation = generation;
		                    }
		                    else {
		                        this.serviceGenerations.set(sid, 0);
		                        connection.generation = 0;
		                    }
		                }
		            }
		            connection.markAvailable();
		            this.emitAndLog(ConnectionPool.CONNECTION_READY, new connection_pool_events_1.ConnectionReadyEvent(this, connection, connectionCreatedTime));
		            this.pending--;
		            callback(undefined, connection);
		        }, error => {
		            this.pending--;
		            this.server.handleError(error);
		            this.emitAndLog(ConnectionPool.CONNECTION_CLOSED, new connection_pool_events_1.ConnectionClosedEvent(this, { id: connectOptions.id, serviceId: undefined }, 'error', 
		            // TODO(NODE-5192): Remove this cast
		            error));
		            if (error instanceof error_1.MongoNetworkError || error instanceof error_1.MongoServerError) {
		                error.connectionGeneration = connectOptions.generation;
		            }
		            callback(error ?? new error_1.MongoRuntimeError('Connection creation failed without error'));
		        });
		    }
		    ensureMinPoolSize() {
		        const minPoolSize = this.options.minPoolSize;
		        if (this.poolState !== exports.PoolState.ready) {
		            return;
		        }
		        this.connections.prune(connection => this.destroyConnectionIfPerished(connection));
		        if (this.totalConnectionCount < minPoolSize &&
		            this.pendingConnectionCount < this.options.maxConnecting) {
		            // NOTE: ensureMinPoolSize should not try to get all the pending
		            // connection permits because that potentially delays the availability of
		            // the connection to a checkout request
		            this.createConnection((err, connection) => {
		                if (!err && connection) {
		                    this.connections.push(connection);
		                    queueMicrotask(() => this.processWaitQueue());
		                }
		                if (this.poolState === exports.PoolState.ready) {
		                    (0, timers_1.clearTimeout)(this.minPoolSizeTimer);
		                    this.minPoolSizeTimer = (0, timers_1.setTimeout)(() => this.ensureMinPoolSize(), this.options.minPoolSizeCheckFrequencyMS);
		                }
		            });
		        }
		        else {
		            (0, timers_1.clearTimeout)(this.minPoolSizeTimer);
		            this.minPoolSizeTimer = (0, timers_1.setTimeout)(() => this.ensureMinPoolSize(), this.options.minPoolSizeCheckFrequencyMS);
		        }
		    }
		    processWaitQueue() {
		        if (this.processingWaitQueue) {
		            return;
		        }
		        this.processingWaitQueue = true;
		        while (this.waitQueueSize) {
		            const waitQueueMember = this.waitQueue.first();
		            if (!waitQueueMember) {
		                this.waitQueue.shift();
		                continue;
		            }
		            if (waitQueueMember.cancelled) {
		                this.waitQueue.shift();
		                continue;
		            }
		            if (this.poolState !== exports.PoolState.ready) {
		                const reason = this.closed ? 'poolClosed' : 'connectionError';
		                const error = this.closed ? new errors_1.PoolClosedError(this) : new errors_1.PoolClearedError(this);
		                this.emitAndLog(ConnectionPool.CONNECTION_CHECK_OUT_FAILED, new connection_pool_events_1.ConnectionCheckOutFailedEvent(this, reason, waitQueueMember.checkoutTime, error));
		                this.waitQueue.shift();
		                waitQueueMember.reject(error);
		                continue;
		            }
		            if (!this.availableConnectionCount) {
		                break;
		            }
		            const connection = this.connections.shift();
		            if (!connection) {
		                break;
		            }
		            if (!this.destroyConnectionIfPerished(connection)) {
		                this.checkedOut.add(connection);
		                this.emitAndLog(ConnectionPool.CONNECTION_CHECKED_OUT, new connection_pool_events_1.ConnectionCheckedOutEvent(this, connection, waitQueueMember.checkoutTime));
		                this.waitQueue.shift();
		                waitQueueMember.resolve(connection);
		            }
		        }
		        const { maxPoolSize, maxConnecting } = this.options;
		        while (this.waitQueueSize > 0 &&
		            this.pendingConnectionCount < maxConnecting &&
		            (maxPoolSize === 0 || this.totalConnectionCount < maxPoolSize)) {
		            const waitQueueMember = this.waitQueue.shift();
		            if (!waitQueueMember || waitQueueMember.cancelled) {
		                continue;
		            }
		            this.createConnection((err, connection) => {
		                if (waitQueueMember.cancelled) {
		                    if (!err && connection) {
		                        this.connections.push(connection);
		                    }
		                }
		                else {
		                    if (err) {
		                        this.emitAndLog(ConnectionPool.CONNECTION_CHECK_OUT_FAILED, 
		                        // TODO(NODE-5192): Remove this cast
		                        new connection_pool_events_1.ConnectionCheckOutFailedEvent(this, 'connectionError', waitQueueMember.checkoutTime, err));
		                        waitQueueMember.reject(err);
		                    }
		                    else if (connection) {
		                        this.checkedOut.add(connection);
		                        this.emitAndLog(ConnectionPool.CONNECTION_CHECKED_OUT, new connection_pool_events_1.ConnectionCheckedOutEvent(this, connection, waitQueueMember.checkoutTime));
		                        waitQueueMember.resolve(connection);
		                    }
		                }
		                queueMicrotask(() => this.processWaitQueue());
		            });
		        }
		        this.processingWaitQueue = false;
		    }
		}
		exports.ConnectionPool = ConnectionPool;
		
	} (connection_pool));
	return connection_pool;
}

var automated_callback_workflow = {};

var callback_workflow = {};

var command_builders = {};

var hasRequiredCommand_builders;

function requireCommand_builders () {
	if (hasRequiredCommand_builders) return command_builders;
	hasRequiredCommand_builders = 1;
	Object.defineProperty(command_builders, "__esModule", { value: true });
	command_builders.finishCommandDocument = finishCommandDocument;
	command_builders.startCommandDocument = startCommandDocument;
	const bson_1 = mongodb1.requireBson();
	const providers_1 = requireProviders();
	/**
	 * Generate the finishing command document for authentication. Will be a
	 * saslStart or saslContinue depending on the presence of a conversation id.
	 */
	function finishCommandDocument(token, conversationId) {
	    if (conversationId != null) {
	        return {
	            saslContinue: 1,
	            conversationId: conversationId,
	            payload: new bson_1.Binary(bson_1.BSON.serialize({ jwt: token }))
	        };
	    }
	    // saslContinue requires a conversationId in the command to be valid so in this
	    // case the server allows "step two" to actually be a saslStart with the token
	    // as the jwt since the use of the cached value has no correlating conversating
	    // on the particular connection.
	    return {
	        saslStart: 1,
	        mechanism: providers_1.AuthMechanism.MONGODB_OIDC,
	        payload: new bson_1.Binary(bson_1.BSON.serialize({ jwt: token }))
	    };
	}
	/**
	 * Generate the saslStart command document.
	 */
	function startCommandDocument(credentials) {
	    const payload = {};
	    if (credentials.username) {
	        payload.n = credentials.username;
	    }
	    return {
	        saslStart: 1,
	        autoAuthorize: 1,
	        mechanism: providers_1.AuthMechanism.MONGODB_OIDC,
	        payload: new bson_1.Binary(bson_1.BSON.serialize(payload))
	    };
	}
	
	return command_builders;
}

var hasRequiredCallback_workflow;

function requireCallback_workflow () {
	if (hasRequiredCallback_workflow) return callback_workflow;
	hasRequiredCallback_workflow = 1;
	Object.defineProperty(callback_workflow, "__esModule", { value: true });
	callback_workflow.CallbackWorkflow = callback_workflow.AUTOMATED_TIMEOUT_MS = callback_workflow.HUMAN_TIMEOUT_MS = void 0;
	const promises_1 = require$$0$5;
	const error_1 = mongodb4.requireError();
	const utils_1 = mongodb7.requireUtils();
	const command_builders_1 = requireCommand_builders();
	/** 5 minutes in milliseconds */
	callback_workflow.HUMAN_TIMEOUT_MS = 300000;
	/** 1 minute in milliseconds */
	callback_workflow.AUTOMATED_TIMEOUT_MS = 60000;
	/** Properties allowed on results of callbacks. */
	const RESULT_PROPERTIES = ['accessToken', 'expiresInSeconds', 'refreshToken'];
	/** Error message when the callback result is invalid. */
	const CALLBACK_RESULT_ERROR = 'User provided OIDC callbacks must return a valid object with an accessToken.';
	/** The time to throttle callback calls. */
	const THROTTLE_MS = 100;
	/**
	 * OIDC implementation of a callback based workflow.
	 * @internal
	 */
	class CallbackWorkflow {
	    /**
	     * Instantiate the callback workflow.
	     */
	    constructor(cache, callback) {
	        this.cache = cache;
	        this.callback = this.withLock(callback);
	        this.lastExecutionTime = Date.now() - THROTTLE_MS;
	    }
	    /**
	     * Get the document to add for speculative authentication. This also needs
	     * to add a db field from the credentials source.
	     */
	    async speculativeAuth(connection, credentials) {
	        // Check if the Client Cache has an access token.
	        // If it does, cache the access token in the Connection Cache and send a JwtStepRequest
	        // with the cached access token in the speculative authentication SASL payload.
	        if (this.cache.hasAccessToken) {
	            const accessToken = this.cache.getAccessToken();
	            connection.accessToken = accessToken;
	            const document = (0, command_builders_1.finishCommandDocument)(accessToken);
	            document.db = credentials.source;
	            return { speculativeAuthenticate: document };
	        }
	        return {};
	    }
	    /**
	     * Reauthenticate the callback workflow. For this we invalidated the access token
	     * in the cache and run the authentication steps again. No initial handshake needs
	     * to be sent.
	     */
	    async reauthenticate(connection, credentials) {
	        if (this.cache.hasAccessToken) {
	            // Reauthentication implies the token has expired.
	            if (connection.accessToken === this.cache.getAccessToken()) {
	                // If connection's access token is the same as the cache's, remove
	                // the token from the cache and connection.
	                this.cache.removeAccessToken();
	                delete connection.accessToken;
	            }
	            else {
	                // If the connection's access token is different from the cache's, set
	                // the cache's token on the connection and do not remove from the
	                // cache.
	                connection.accessToken = this.cache.getAccessToken();
	            }
	        }
	        await this.execute(connection, credentials);
	    }
	    /**
	     * Starts the callback authentication process. If there is a speculative
	     * authentication document from the initial handshake, then we will use that
	     * value to get the issuer, otherwise we will send the saslStart command.
	     */
	    async startAuthentication(connection, credentials, response) {
	        let result;
	        if (response?.speculativeAuthenticate) {
	            result = response.speculativeAuthenticate;
	        }
	        else {
	            result = await connection.command((0, utils_1.ns)(credentials.source), (0, command_builders_1.startCommandDocument)(credentials), undefined);
	        }
	        return result;
	    }
	    /**
	     * Finishes the callback authentication process.
	     */
	    async finishAuthentication(connection, credentials, token, conversationId) {
	        await connection.command((0, utils_1.ns)(credentials.source), (0, command_builders_1.finishCommandDocument)(token, conversationId), undefined);
	    }
	    /**
	     * Executes the callback and validates the output.
	     */
	    async executeAndValidateCallback(params) {
	        const result = await this.callback(params);
	        // Validate that the result returned by the callback is acceptable. If it is not
	        // we must clear the token result from the cache.
	        if (isCallbackResultInvalid(result)) {
	            throw new error_1.MongoMissingCredentialsError(CALLBACK_RESULT_ERROR);
	        }
	        return result;
	    }
	    /**
	     * Ensure the callback is only executed one at a time and throttles the calls
	     * to every 100ms.
	     */
	    withLock(callback) {
	        let lock = Promise.resolve();
	        return async (params) => {
	            // We do this to ensure that we would never return the result of the
	            // previous lock, only the current callback's value would get returned.
	            await lock;
	            lock = lock
	                .catch(() => null)
	                .then(async () => {
	                const difference = Date.now() - this.lastExecutionTime;
	                if (difference <= THROTTLE_MS) {
	                    await (0, promises_1.setTimeout)(THROTTLE_MS - difference, { signal: params.timeoutContext });
	                }
	                this.lastExecutionTime = Date.now();
	                return await callback(params);
	            });
	            return await lock;
	        };
	    }
	}
	callback_workflow.CallbackWorkflow = CallbackWorkflow;
	/**
	 * Determines if a result returned from a request or refresh callback
	 * function is invalid. This means the result is nullish, doesn't contain
	 * the accessToken required field, and does not contain extra fields.
	 */
	function isCallbackResultInvalid(tokenResult) {
	    if (tokenResult == null || typeof tokenResult !== 'object')
	        return true;
	    if (!('accessToken' in tokenResult))
	        return true;
	    return !Object.getOwnPropertyNames(tokenResult).every(prop => RESULT_PROPERTIES.includes(prop));
	}
	
	return callback_workflow;
}

var hasRequiredAutomated_callback_workflow;

function requireAutomated_callback_workflow () {
	if (hasRequiredAutomated_callback_workflow) return automated_callback_workflow;
	hasRequiredAutomated_callback_workflow = 1;
	Object.defineProperty(automated_callback_workflow, "__esModule", { value: true });
	automated_callback_workflow.AutomatedCallbackWorkflow = void 0;
	const error_1 = mongodb4.requireError();
	const timeout_1 = mongodb6.requireTimeout();
	const mongodb_oidc_1 = mongodb1.requireMongodb_oidc();
	const callback_workflow_1 = requireCallback_workflow();
	/**
	 * Class implementing behaviour for the non human callback workflow.
	 * @internal
	 */
	class AutomatedCallbackWorkflow extends callback_workflow_1.CallbackWorkflow {
	    /**
	     * Instantiate the human callback workflow.
	     */
	    constructor(cache, callback) {
	        super(cache, callback);
	    }
	    /**
	     * Execute the OIDC callback workflow.
	     */
	    async execute(connection, credentials) {
	        // If there is a cached access token, try to authenticate with it. If
	        // authentication fails with an Authentication error (18),
	        // invalidate the access token, fetch a new access token, and try
	        // to authenticate again.
	        // If the server fails for any other reason, do not clear the cache.
	        if (this.cache.hasAccessToken) {
	            const token = this.cache.getAccessToken();
	            if (!connection.accessToken) {
	                connection.accessToken = token;
	            }
	            try {
	                return await this.finishAuthentication(connection, credentials, token);
	            }
	            catch (error) {
	                if (error instanceof error_1.MongoError &&
	                    error.code === error_1.MONGODB_ERROR_CODES.AuthenticationFailed) {
	                    this.cache.removeAccessToken();
	                    return await this.execute(connection, credentials);
	                }
	                else {
	                    throw error;
	                }
	            }
	        }
	        const response = await this.fetchAccessToken(credentials);
	        this.cache.put(response);
	        connection.accessToken = response.accessToken;
	        await this.finishAuthentication(connection, credentials, response.accessToken);
	    }
	    /**
	     * Fetches the access token using the callback.
	     */
	    async fetchAccessToken(credentials) {
	        const controller = new AbortController();
	        const params = {
	            timeoutContext: controller.signal,
	            version: mongodb_oidc_1.OIDC_VERSION
	        };
	        if (credentials.username) {
	            params.username = credentials.username;
	        }
	        if (credentials.mechanismProperties.TOKEN_RESOURCE) {
	            params.tokenAudience = credentials.mechanismProperties.TOKEN_RESOURCE;
	        }
	        const timeout = timeout_1.Timeout.expires(callback_workflow_1.AUTOMATED_TIMEOUT_MS);
	        try {
	            return await Promise.race([this.executeAndValidateCallback(params), timeout]);
	        }
	        catch (error) {
	            if (timeout_1.TimeoutError.is(error)) {
	                controller.abort();
	                throw new error_1.MongoOIDCError(`OIDC callback timed out after ${callback_workflow_1.AUTOMATED_TIMEOUT_MS}ms.`);
	            }
	            throw error;
	        }
	        finally {
	            timeout.clear();
	        }
	    }
	}
	automated_callback_workflow.AutomatedCallbackWorkflow = AutomatedCallbackWorkflow;
	
	return automated_callback_workflow;
}

var azure_machine_workflow = {};

var hasRequiredAzure_machine_workflow;

function requireAzure_machine_workflow () {
	if (hasRequiredAzure_machine_workflow) return azure_machine_workflow;
	hasRequiredAzure_machine_workflow = 1;
	Object.defineProperty(azure_machine_workflow, "__esModule", { value: true });
	azure_machine_workflow.azureCallback = void 0;
	const azure_1 = mongodb1.requireAzure();
	const error_1 = mongodb4.requireError();
	const utils_1 = mongodb7.requireUtils();
	/** Azure request headers. */
	const AZURE_HEADERS = Object.freeze({ Metadata: 'true', Accept: 'application/json' });
	/** Invalid endpoint result error. */
	const ENDPOINT_RESULT_ERROR = 'Azure endpoint did not return a value with only access_token and expires_in properties';
	/** Error for when the token audience is missing in the environment. */
	const TOKEN_RESOURCE_MISSING_ERROR = 'TOKEN_RESOURCE must be set in the auth mechanism properties when ENVIRONMENT is azure.';
	/**
	 * The callback function to be used in the automated callback workflow.
	 * @param params - The OIDC callback parameters.
	 * @returns The OIDC response.
	 */
	const azureCallback = async (params) => {
	    const tokenAudience = params.tokenAudience;
	    const username = params.username;
	    if (!tokenAudience) {
	        throw new error_1.MongoAzureError(TOKEN_RESOURCE_MISSING_ERROR);
	    }
	    const response = await getAzureTokenData(tokenAudience, username);
	    if (!isEndpointResultValid(response)) {
	        throw new error_1.MongoAzureError(ENDPOINT_RESULT_ERROR);
	    }
	    return response;
	};
	azure_machine_workflow.azureCallback = azureCallback;
	/**
	 * Hit the Azure endpoint to get the token data.
	 */
	async function getAzureTokenData(tokenAudience, username) {
	    const url = new URL(azure_1.AZURE_BASE_URL);
	    (0, azure_1.addAzureParams)(url, tokenAudience, username);
	    const response = await (0, utils_1.get)(url, {
	        headers: AZURE_HEADERS
	    });
	    if (response.status !== 200) {
	        throw new error_1.MongoAzureError(`Status code ${response.status} returned from the Azure endpoint. Response body: ${response.body}`);
	    }
	    const result = JSON.parse(response.body);
	    return {
	        accessToken: result.access_token,
	        expiresInSeconds: Number(result.expires_in)
	    };
	}
	/**
	 * Determines if a result returned from the endpoint is valid.
	 * This means the result is not nullish, contains the access_token required field
	 * and the expires_in required field.
	 */
	function isEndpointResultValid(token) {
	    if (token == null || typeof token !== 'object')
	        return false;
	    return ('accessToken' in token &&
	        typeof token.accessToken === 'string' &&
	        'expiresInSeconds' in token &&
	        typeof token.expiresInSeconds === 'number');
	}
	
	return azure_machine_workflow;
}

var gcp_machine_workflow = {};

var hasRequiredGcp_machine_workflow;

function requireGcp_machine_workflow () {
	if (hasRequiredGcp_machine_workflow) return gcp_machine_workflow;
	hasRequiredGcp_machine_workflow = 1;
	Object.defineProperty(gcp_machine_workflow, "__esModule", { value: true });
	gcp_machine_workflow.gcpCallback = void 0;
	const error_1 = mongodb4.requireError();
	const utils_1 = mongodb7.requireUtils();
	/** GCP base URL. */
	const GCP_BASE_URL = 'http://metadata/computeMetadata/v1/instance/service-accounts/default/identity';
	/** GCP request headers. */
	const GCP_HEADERS = Object.freeze({ 'Metadata-Flavor': 'Google' });
	/** Error for when the token audience is missing in the environment. */
	const TOKEN_RESOURCE_MISSING_ERROR = 'TOKEN_RESOURCE must be set in the auth mechanism properties when ENVIRONMENT is gcp.';
	/**
	 * The callback function to be used in the automated callback workflow.
	 * @param params - The OIDC callback parameters.
	 * @returns The OIDC response.
	 */
	const gcpCallback = async (params) => {
	    const tokenAudience = params.tokenAudience;
	    if (!tokenAudience) {
	        throw new error_1.MongoGCPError(TOKEN_RESOURCE_MISSING_ERROR);
	    }
	    return await getGcpTokenData(tokenAudience);
	};
	gcp_machine_workflow.gcpCallback = gcpCallback;
	/**
	 * Hit the GCP endpoint to get the token data.
	 */
	async function getGcpTokenData(tokenAudience) {
	    const url = new URL(GCP_BASE_URL);
	    url.searchParams.append('audience', tokenAudience);
	    const response = await (0, utils_1.get)(url, {
	        headers: GCP_HEADERS
	    });
	    if (response.status !== 200) {
	        throw new error_1.MongoGCPError(`Status code ${response.status} returned from the GCP endpoint. Response body: ${response.body}`);
	    }
	    return { accessToken: response.body };
	}
	
	return gcp_machine_workflow;
}

var k8s_machine_workflow = {};

var hasRequiredK8s_machine_workflow;

function requireK8s_machine_workflow () {
	if (hasRequiredK8s_machine_workflow) return k8s_machine_workflow;
	hasRequiredK8s_machine_workflow = 1;
	Object.defineProperty(k8s_machine_workflow, "__esModule", { value: true });
	k8s_machine_workflow.k8sCallback = void 0;
	const promises_1 = require$$0$6;
	const process = require$$0;
	/** The fallback file name */
	const FALLBACK_FILENAME = '/var/run/secrets/kubernetes.io/serviceaccount/token';
	/** The azure environment variable for the file name. */
	const AZURE_FILENAME = 'AZURE_FEDERATED_TOKEN_FILE';
	/** The AWS environment variable for the file name. */
	const AWS_FILENAME = 'AWS_WEB_IDENTITY_TOKEN_FILE';
	/**
	 * The callback function to be used in the automated callback workflow.
	 * @param params - The OIDC callback parameters.
	 * @returns The OIDC response.
	 */
	const k8sCallback = async () => {
	    let filename;
	    if (process.env[AZURE_FILENAME]) {
	        filename = process.env[AZURE_FILENAME];
	    }
	    else if (process.env[AWS_FILENAME]) {
	        filename = process.env[AWS_FILENAME];
	    }
	    else {
	        filename = FALLBACK_FILENAME;
	    }
	    const token = await (0, promises_1.readFile)(filename, 'utf8');
	    return { accessToken: token };
	};
	k8s_machine_workflow.k8sCallback = k8sCallback;
	
	return k8s_machine_workflow;
}

var token_cache = {};

var hasRequiredToken_cache;

function requireToken_cache () {
	if (hasRequiredToken_cache) return token_cache;
	hasRequiredToken_cache = 1;
	Object.defineProperty(token_cache, "__esModule", { value: true });
	token_cache.TokenCache = void 0;
	const error_1 = mongodb4.requireError();
	class MongoOIDCError extends error_1.MongoDriverError {
	}
	/** @internal */
	class TokenCache {
	    get hasAccessToken() {
	        return !!this.accessToken;
	    }
	    get hasRefreshToken() {
	        return !!this.refreshToken;
	    }
	    get hasIdpInfo() {
	        return !!this.idpInfo;
	    }
	    getAccessToken() {
	        if (!this.accessToken) {
	            throw new MongoOIDCError('Attempted to get an access token when none exists.');
	        }
	        return this.accessToken;
	    }
	    getRefreshToken() {
	        if (!this.refreshToken) {
	            throw new MongoOIDCError('Attempted to get a refresh token when none exists.');
	        }
	        return this.refreshToken;
	    }
	    getIdpInfo() {
	        if (!this.idpInfo) {
	            throw new MongoOIDCError('Attempted to get IDP information when none exists.');
	        }
	        return this.idpInfo;
	    }
	    put(response, idpInfo) {
	        this.accessToken = response.accessToken;
	        this.refreshToken = response.refreshToken;
	        this.expiresInSeconds = response.expiresInSeconds;
	        if (idpInfo) {
	            this.idpInfo = idpInfo;
	        }
	    }
	    removeAccessToken() {
	        this.accessToken = undefined;
	    }
	    removeRefreshToken() {
	        this.refreshToken = undefined;
	    }
	}
	token_cache.TokenCache = TokenCache;
	
	return token_cache;
}

var token_machine_workflow = {};

var hasRequiredToken_machine_workflow;

function requireToken_machine_workflow () {
	if (hasRequiredToken_machine_workflow) return token_machine_workflow;
	hasRequiredToken_machine_workflow = 1;
	Object.defineProperty(token_machine_workflow, "__esModule", { value: true });
	token_machine_workflow.tokenMachineCallback = void 0;
	const fs = require$$0$7;
	const process = require$$0;
	const error_1 = mongodb4.requireError();
	/** Error for when the token is missing in the environment. */
	const TOKEN_MISSING_ERROR = 'OIDC_TOKEN_FILE must be set in the environment.';
	/**
	 * The callback function to be used in the automated callback workflow.
	 * @param params - The OIDC callback parameters.
	 * @returns The OIDC response.
	 */
	const tokenMachineCallback = async () => {
	    const tokenFile = process.env.OIDC_TOKEN_FILE;
	    if (!tokenFile) {
	        throw new error_1.MongoAWSError(TOKEN_MISSING_ERROR);
	    }
	    const token = await fs.promises.readFile(tokenFile, 'utf8');
	    return { accessToken: token };
	};
	token_machine_workflow.tokenMachineCallback = tokenMachineCallback;
	
	return token_machine_workflow;
}

var human_callback_workflow = {};

var hasRequiredHuman_callback_workflow;

function requireHuman_callback_workflow () {
	if (hasRequiredHuman_callback_workflow) return human_callback_workflow;
	hasRequiredHuman_callback_workflow = 1;
	Object.defineProperty(human_callback_workflow, "__esModule", { value: true });
	human_callback_workflow.HumanCallbackWorkflow = void 0;
	const bson_1 = mongodb1.requireBson();
	const error_1 = mongodb4.requireError();
	const timeout_1 = mongodb6.requireTimeout();
	const mongodb_oidc_1 = mongodb1.requireMongodb_oidc();
	const callback_workflow_1 = requireCallback_workflow();
	/**
	 * Class implementing behaviour for the non human callback workflow.
	 * @internal
	 */
	class HumanCallbackWorkflow extends callback_workflow_1.CallbackWorkflow {
	    /**
	     * Instantiate the human callback workflow.
	     */
	    constructor(cache, callback) {
	        super(cache, callback);
	    }
	    /**
	     * Execute the OIDC human callback workflow.
	     */
	    async execute(connection, credentials) {
	        // Check if the Client Cache has an access token.
	        // If it does, cache the access token in the Connection Cache and perform a One-Step SASL conversation
	        // using the access token. If the server returns an Authentication error (18),
	        // invalidate the access token token from the Client Cache, clear the Connection Cache,
	        // and restart the authentication flow. Raise any other errors to the user. On success, exit the algorithm.
	        if (this.cache.hasAccessToken) {
	            const token = this.cache.getAccessToken();
	            connection.accessToken = token;
	            try {
	                return await this.finishAuthentication(connection, credentials, token);
	            }
	            catch (error) {
	                if (error instanceof error_1.MongoError &&
	                    error.code === error_1.MONGODB_ERROR_CODES.AuthenticationFailed) {
	                    this.cache.removeAccessToken();
	                    delete connection.accessToken;
	                    return await this.execute(connection, credentials);
	                }
	                else {
	                    throw error;
	                }
	            }
	        }
	        // Check if the Client Cache has a refresh token.
	        // If it does, call the OIDC Human Callback with the cached refresh token and IdpInfo to get a
	        // new access token. Cache the new access token in the Client Cache and Connection Cache.
	        // Perform a One-Step SASL conversation using the new access token. If the the server returns
	        // an Authentication error (18), clear the refresh token, invalidate the access token from the
	        // Client Cache, clear the Connection Cache, and restart the authentication flow. Raise any other
	        // errors to the user. On success, exit the algorithm.
	        if (this.cache.hasRefreshToken) {
	            const refreshToken = this.cache.getRefreshToken();
	            const result = await this.fetchAccessToken(this.cache.getIdpInfo(), credentials, refreshToken);
	            this.cache.put(result);
	            connection.accessToken = result.accessToken;
	            try {
	                return await this.finishAuthentication(connection, credentials, result.accessToken);
	            }
	            catch (error) {
	                if (error instanceof error_1.MongoError &&
	                    error.code === error_1.MONGODB_ERROR_CODES.AuthenticationFailed) {
	                    this.cache.removeRefreshToken();
	                    delete connection.accessToken;
	                    return await this.execute(connection, credentials);
	                }
	                else {
	                    throw error;
	                }
	            }
	        }
	        // Start a new Two-Step SASL conversation.
	        // Run a PrincipalStepRequest to get the IdpInfo.
	        // Call the OIDC Human Callback with the new IdpInfo to get a new access token and optional refresh
	        // token. Drivers MUST NOT pass a cached refresh token to the callback when performing
	        // a new Two-Step conversation. Cache the new IdpInfo and refresh token in the Client Cache and the
	        // new access token in the Client Cache and Connection Cache.
	        // Attempt to authenticate using a JwtStepRequest with the new access token. Raise any errors to the user.
	        const startResponse = await this.startAuthentication(connection, credentials);
	        const conversationId = startResponse.conversationId;
	        const idpInfo = bson_1.BSON.deserialize(startResponse.payload.buffer);
	        const callbackResponse = await this.fetchAccessToken(idpInfo, credentials);
	        this.cache.put(callbackResponse, idpInfo);
	        connection.accessToken = callbackResponse.accessToken;
	        return await this.finishAuthentication(connection, credentials, callbackResponse.accessToken, conversationId);
	    }
	    /**
	     * Fetches an access token using the callback.
	     */
	    async fetchAccessToken(idpInfo, credentials, refreshToken) {
	        const controller = new AbortController();
	        const params = {
	            timeoutContext: controller.signal,
	            version: mongodb_oidc_1.OIDC_VERSION,
	            idpInfo: idpInfo
	        };
	        if (credentials.username) {
	            params.username = credentials.username;
	        }
	        if (refreshToken) {
	            params.refreshToken = refreshToken;
	        }
	        const timeout = timeout_1.Timeout.expires(callback_workflow_1.HUMAN_TIMEOUT_MS);
	        try {
	            return await Promise.race([this.executeAndValidateCallback(params), timeout]);
	        }
	        catch (error) {
	            if (timeout_1.TimeoutError.is(error)) {
	                controller.abort();
	                throw new error_1.MongoOIDCError(`OIDC callback timed out after ${callback_workflow_1.HUMAN_TIMEOUT_MS}ms.`);
	            }
	            throw error;
	        }
	        finally {
	            timeout.clear();
	        }
	    }
	}
	human_callback_workflow.HumanCallbackWorkflow = HumanCallbackWorkflow;
	
	return human_callback_workflow;
}

var plain = {};

var hasRequiredPlain;

function requirePlain () {
	if (hasRequiredPlain) return plain;
	hasRequiredPlain = 1;
	Object.defineProperty(plain, "__esModule", { value: true });
	plain.Plain = void 0;
	const bson_1 = mongodb1.requireBson();
	const error_1 = mongodb4.requireError();
	const utils_1 = mongodb7.requireUtils();
	const auth_provider_1 = mongodb1.requireAuth_provider();
	class Plain extends auth_provider_1.AuthProvider {
	    async auth(authContext) {
	        const { connection, credentials } = authContext;
	        if (!credentials) {
	            throw new error_1.MongoMissingCredentialsError('AuthContext must provide credentials.');
	        }
	        const { username, password } = credentials;
	        const payload = new bson_1.Binary(bson_1.ByteUtils.fromUTF8(`\x00${username}\x00${password}`));
	        const command = {
	            saslStart: 1,
	            mechanism: 'PLAIN',
	            payload: payload,
	            autoAuthorize: 1
	        };
	        await connection.command((0, utils_1.ns)('$external.$cmd'), command, undefined);
	    }
	}
	plain.Plain = Plain;
	
	return plain;
}

var scram = {};

var hasRequiredScram;

function requireScram () {
	if (hasRequiredScram) return scram;
	hasRequiredScram = 1;
	Object.defineProperty(scram, "__esModule", { value: true });
	scram.ScramSHA256 = scram.ScramSHA1 = void 0;
	const saslprep_1 = mongodbJsSaslprep1.requireNode();
	const bson_1 = mongodb1.requireBson();
	const error_1 = mongodb4.requireError();
	const utils_1 = mongodb7.requireUtils();
	const auth_provider_1 = mongodb1.requireAuth_provider();
	const providers_1 = requireProviders();
	class ScramSHA extends auth_provider_1.AuthProvider {
	    constructor(cryptoMethod) {
	        super();
	        this.cryptoMethod = cryptoMethod || 'sha1';
	    }
	    async prepare(handshakeDoc, authContext) {
	        const cryptoMethod = this.cryptoMethod;
	        const credentials = authContext.credentials;
	        if (!credentials) {
	            throw new error_1.MongoMissingCredentialsError('AuthContext must provide credentials.');
	        }
	        const nonce = await (0, utils_1.randomBytes)(24);
	        // store the nonce for later use
	        authContext.nonce = nonce;
	        const request = {
	            ...handshakeDoc,
	            speculativeAuthenticate: {
	                ...makeFirstMessage(cryptoMethod, credentials, nonce),
	                db: credentials.source
	            }
	        };
	        return request;
	    }
	    async auth(authContext) {
	        const { reauthenticating, response } = authContext;
	        if (response?.speculativeAuthenticate && !reauthenticating) {
	            return await continueScramConversation(this.cryptoMethod, response.speculativeAuthenticate, authContext);
	        }
	        return await executeScram(this.cryptoMethod, authContext);
	    }
	}
	function cleanUsername(username) {
	    return username.replace('=', '=3D').replace(',', '=2C');
	}
	function clientFirstMessageBare(username, nonce) {
	    // NOTE: This is done b/c Javascript uses UTF-16, but the server is hashing in UTF-8.
	    // Since the username is not sasl-prep-d, we need to do this here.
	    return bson_1.ByteUtils.concat([
	        bson_1.ByteUtils.fromUTF8('n='),
	        bson_1.ByteUtils.fromUTF8(username),
	        bson_1.ByteUtils.fromUTF8(',r='),
	        bson_1.ByteUtils.fromUTF8(bson_1.ByteUtils.toBase64(nonce))
	    ]);
	}
	function makeFirstMessage(cryptoMethod, credentials, nonce) {
	    const username = cleanUsername(credentials.username);
	    const mechanism = cryptoMethod === 'sha1' ? providers_1.AuthMechanism.MONGODB_SCRAM_SHA1 : providers_1.AuthMechanism.MONGODB_SCRAM_SHA256;
	    // NOTE: This is done b/c Javascript uses UTF-16, but the server is hashing in UTF-8.
	    // Since the username is not sasl-prep-d, we need to do this here.
	    return {
	        saslStart: 1,
	        mechanism,
	        payload: new bson_1.Binary(bson_1.ByteUtils.concat([bson_1.ByteUtils.fromUTF8('n,,'), clientFirstMessageBare(username, nonce)])),
	        autoAuthorize: 1,
	        options: { skipEmptyExchange: true }
	    };
	}
	async function executeScram(cryptoMethod, authContext) {
	    const { connection, credentials } = authContext;
	    if (!credentials) {
	        throw new error_1.MongoMissingCredentialsError('AuthContext must provide credentials.');
	    }
	    if (!authContext.nonce) {
	        throw new error_1.MongoInvalidArgumentError('AuthContext must contain a valid nonce property');
	    }
	    const nonce = authContext.nonce;
	    const db = credentials.source;
	    const saslStartCmd = makeFirstMessage(cryptoMethod, credentials, nonce);
	    const response = await connection.command((0, utils_1.ns)(`${db}.$cmd`), saslStartCmd, undefined);
	    await continueScramConversation(cryptoMethod, response, authContext);
	}
	async function continueScramConversation(cryptoMethod, response, authContext) {
	    const connection = authContext.connection;
	    const credentials = authContext.credentials;
	    if (!credentials) {
	        throw new error_1.MongoMissingCredentialsError('AuthContext must provide credentials.');
	    }
	    if (!authContext.nonce) {
	        throw new error_1.MongoInvalidArgumentError('Unable to continue SCRAM without valid nonce');
	    }
	    const nonce = authContext.nonce;
	    const db = credentials.source;
	    const username = cleanUsername(credentials.username);
	    const password = credentials.password;
	    const processedPassword = cryptoMethod === 'sha256' ? (0, saslprep_1.saslprep)(password) : passwordDigest(username, password);
	    const payload = bson_1.ByteUtils.isUint8Array(response.payload)
	        ? new bson_1.Binary(response.payload)
	        : response.payload;
	    const dict = parsePayload(payload);
	    const iterations = parseInt(dict.i, 10);
	    if (iterations && iterations < 4096) {
	        // TODO(NODE-3483)
	        throw new error_1.MongoRuntimeError(`Server returned an invalid iteration count ${iterations}`);
	    }
	    const salt = dict.s;
	    const rnonce = dict.r;
	    if (rnonce.startsWith('nonce')) {
	        // TODO(NODE-3483)
	        throw new error_1.MongoRuntimeError(`Server returned an invalid nonce: ${rnonce}`);
	    }
	    // Set up start of proof
	    const withoutProof = `c=biws,r=${rnonce}`;
	    const saltedPassword = await HI(processedPassword, bson_1.ByteUtils.fromBase64(salt), iterations, cryptoMethod);
	    const clientKey = await HMAC(cryptoMethod, saltedPassword, 'Client Key');
	    const serverKey = await HMAC(cryptoMethod, saltedPassword, 'Server Key');
	    const storedKey = await H(cryptoMethod, clientKey);
	    const authMessage = [
	        clientFirstMessageBare(username, nonce),
	        payload.toString('utf8'),
	        withoutProof
	    ].join(',');
	    const clientSignature = await HMAC(cryptoMethod, storedKey, authMessage);
	    const clientProof = `p=${xor(clientKey, clientSignature)}`;
	    const clientFinal = [withoutProof, clientProof].join(',');
	    const serverSignature = await HMAC(cryptoMethod, serverKey, authMessage);
	    const saslContinueCmd = {
	        saslContinue: 1,
	        conversationId: response.conversationId,
	        payload: new bson_1.Binary(bson_1.ByteUtils.fromUTF8(clientFinal))
	    };
	    const r = await connection.command((0, utils_1.ns)(`${db}.$cmd`), saslContinueCmd, undefined);
	    const parsedResponse = parsePayload(r.payload);
	    if (!compareDigest(bson_1.ByteUtils.fromBase64(parsedResponse.v), serverSignature)) {
	        throw new error_1.MongoRuntimeError('Server returned an invalid signature');
	    }
	    if (r.done !== false) {
	        // If the server sends r.done === true we can save one RTT
	        return;
	    }
	    const retrySaslContinueCmd = {
	        saslContinue: 1,
	        conversationId: r.conversationId,
	        payload: bson_1.ByteUtils.allocate(0)
	    };
	    await connection.command((0, utils_1.ns)(`${db}.$cmd`), retrySaslContinueCmd, undefined);
	}
	function parsePayload(payload) {
	    const payloadStr = payload.toString('utf8');
	    const dict = {};
	    const parts = payloadStr.split(',');
	    for (let i = 0; i < parts.length; i++) {
	        const valueParts = (parts[i].match(/^([^=]*)=(.*)$/) ?? []).slice(1);
	        dict[valueParts[0]] = valueParts[1];
	    }
	    return dict;
	}
	function passwordDigest(username, password) {
	    if (typeof username !== 'string') {
	        throw new error_1.MongoInvalidArgumentError('Username must be a string');
	    }
	    if (typeof password !== 'string') {
	        throw new error_1.MongoInvalidArgumentError('Password must be a string');
	    }
	    if (password.length === 0) {
	        throw new error_1.MongoInvalidArgumentError('Password cannot be empty');
	    }
	    let nodeCrypto;
	    try {
	        // TODO: NODE-7424 - remove dependency on 'crypto' for SCRAM-SHA-1 authentication
	        // eslint-disable-next-line @typescript-eslint/no-require-imports
	        nodeCrypto = require('crypto');
	    }
	    catch (e) {
	        throw new error_1.MongoRuntimeError('Node.js crypto module is required for SCRAM-SHA-1 authentication', {
	            cause: e
	        });
	    }
	    try {
	        const md5 = nodeCrypto.createHash('md5');
	        md5.update(`${username}:mongo:${password}`, 'utf8');
	        return md5.digest('hex');
	    }
	    catch (err) {
	        if (nodeCrypto.getFips()) {
	            // This error is (slightly) more helpful than what comes from OpenSSL directly, e.g.
	            // 'Error: error:060800C8:digital envelope routines:EVP_DigestInit_ex:disabled for FIPS'
	            throw new Error('Auth mechanism SCRAM-SHA-1 is not supported in FIPS mode');
	        }
	        throw err;
	    }
	}
	// XOR two buffers
	function xor(a, b) {
	    const length = Math.max(a.length, b.length);
	    const res = [];
	    for (let i = 0; i < length; i += 1) {
	        res.push(a[i] ^ b[i]);
	    }
	    return bson_1.ByteUtils.toBase64(bson_1.ByteUtils.fromNumberArray(res));
	}
	async function H(method, text) {
	    const buffer = await crypto.subtle.digest(method === 'sha256' ? 'SHA-256' : 'SHA-1', text);
	    return new Uint8Array(buffer);
	}
	async function HMAC(method, key, text) {
	    const keyBuffer = bson_1.ByteUtils.toLocalBufferType(key);
	    const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer, { name: 'HMAC', hash: { name: method === 'sha256' ? 'SHA-256' : 'SHA-1' } }, false, ['sign', 'verify']);
	    const textData = typeof text === 'string' ? new TextEncoder().encode(text) : text;
	    const textBuffer = bson_1.ByteUtils.toLocalBufferType(textData);
	    const signature = await crypto.subtle.sign('HMAC', cryptoKey, textBuffer);
	    return new Uint8Array(signature);
	}
	let _hiCache = {};
	let _hiCacheCount = 0;
	function _hiCachePurge() {
	    _hiCache = {};
	    _hiCacheCount = 0;
	}
	const hiLengthMap = {
	    sha256: 32,
	    sha1: 20
	};
	async function HI(data, salt, iterations, cryptoMethod) {
	    // omit the work if already generated
	    const key = [data, bson_1.ByteUtils.toBase64(salt), iterations].join('_');
	    if (_hiCache[key] != null) {
	        return _hiCache[key];
	    }
	    const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(data), { name: 'PBKDF2' }, false, ['deriveBits']);
	    const params = {
	        name: 'PBKDF2',
	        salt: salt,
	        iterations: iterations,
	        hash: { name: cryptoMethod === 'sha256' ? 'SHA-256' : 'SHA-1' }
	    };
	    const derivedBits = await crypto.subtle.deriveBits(params, keyMaterial, hiLengthMap[cryptoMethod] * 8);
	    const saltedData = new Uint8Array(derivedBits);
	    // cache a copy to speed up the next lookup, but prevent unbounded cache growth
	    if (_hiCacheCount >= 200) {
	        _hiCachePurge();
	    }
	    _hiCache[key] = saltedData;
	    _hiCacheCount += 1;
	    return saltedData;
	}
	function compareDigest(lhs, rhs) {
	    if (lhs.length !== rhs.length) {
	        return false;
	    }
	    let result = 0;
	    for (let i = 0; i < lhs.length; i++) {
	        result |= lhs[i] ^ rhs[i];
	    }
	    return result === 0;
	}
	class ScramSHA1 extends ScramSHA {
	    constructor() {
	        super('sha1');
	    }
	}
	scram.ScramSHA1 = ScramSHA1;
	class ScramSHA256 extends ScramSHA {
	    constructor() {
	        super('sha256');
	    }
	}
	scram.ScramSHA256 = ScramSHA256;
	
	return scram;
}

var x509 = {};

var hasRequiredX509;

function requireX509 () {
	if (hasRequiredX509) return x509;
	hasRequiredX509 = 1;
	Object.defineProperty(x509, "__esModule", { value: true });
	x509.X509 = void 0;
	const error_1 = mongodb4.requireError();
	const utils_1 = mongodb7.requireUtils();
	const auth_provider_1 = mongodb1.requireAuth_provider();
	class X509 extends auth_provider_1.AuthProvider {
	    async prepare(handshakeDoc, authContext) {
	        const { credentials } = authContext;
	        if (!credentials) {
	            throw new error_1.MongoMissingCredentialsError('AuthContext must provide credentials.');
	        }
	        return { ...handshakeDoc, speculativeAuthenticate: x509AuthenticateCommand(credentials) };
	    }
	    async auth(authContext) {
	        const connection = authContext.connection;
	        const credentials = authContext.credentials;
	        if (!credentials) {
	            throw new error_1.MongoMissingCredentialsError('AuthContext must provide credentials.');
	        }
	        const response = authContext.response;
	        if (response?.speculativeAuthenticate) {
	            return;
	        }
	        await connection.command((0, utils_1.ns)('$external.$cmd'), x509AuthenticateCommand(credentials), undefined);
	    }
	}
	x509.X509 = X509;
	function x509AuthenticateCommand(credentials) {
	    const command = { authenticate: 1, mechanism: 'MONGODB-X509' };
	    if (credentials.username) {
	        command.user = credentials.username;
	    }
	    return command;
	}
	
	return x509;
}

exports.requireAutomated_callback_workflow = requireAutomated_callback_workflow;
exports.requireAzure_machine_workflow = requireAzure_machine_workflow;
exports.requireClient_metadata = requireClient_metadata;
exports.requireCommand_monitoring_events = requireCommand_monitoring_events;
exports.requireCommands = requireCommands;
exports.requireCompression = requireCompression;
exports.requireConnect = requireConnect;
exports.requireConnection = requireConnection;
exports.requireConnection_pool = requireConnection_pool;
exports.requireConnection_pool_events = requireConnection_pool_events;
exports.requireConstants = requireConstants;
exports.requireErrors = requireErrors;
exports.requireGcp_machine_workflow = requireGcp_machine_workflow;
exports.requireHuman_callback_workflow = requireHuman_callback_workflow;
exports.requireK8s_machine_workflow = requireK8s_machine_workflow;
exports.requireMetrics = requireMetrics;
exports.requirePlain = requirePlain;
exports.requireProviders = requireProviders;
exports.requireScram = requireScram;
exports.requireToken_cache = requireToken_cache;
exports.requireToken_machine_workflow = requireToken_machine_workflow;
exports.requireX509 = requireX509;
