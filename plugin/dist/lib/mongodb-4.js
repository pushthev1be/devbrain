'use strict';

const mongodb1 = require('./mongodb-1.js');
const mongodb3 = require('./mongodb-3.js');
const mongodb5 = require('./mongodb-5.js');
const mongodb7 = require('./mongodb-7.js');
const mongodb6 = require('./mongodb-6.js');
const require$$0$1 = require('stream');
const require$$0 = require('fs');
const mongodb2 = require('./mongodb-2.js');

var lib = {};

var error = {};

var hasRequiredError;

function requireError () {
	if (hasRequiredError) return error;
	hasRequiredError = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.MongoWriteConcernError = exports.MongoServerSelectionError = exports.MongoSystemError = exports.MongoMissingDependencyError = exports.MongoMissingCredentialsError = exports.MongoCompatibilityError = exports.MongoInvalidArgumentError = exports.MongoParseError = exports.MongoNetworkTimeoutError = exports.MongoNetworkError = exports.MongoClientClosedError = exports.MongoTopologyClosedError = exports.MongoCursorExhaustedError = exports.MongoServerClosedError = exports.MongoCursorInUseError = exports.MongoOperationTimeoutError = exports.MongoUnexpectedServerResponseError = exports.MongoGridFSChunkError = exports.MongoGridFSStreamError = exports.MongoTailableCursorError = exports.MongoChangeStreamError = exports.MongoClientBulkWriteExecutionError = exports.MongoClientBulkWriteCursorError = exports.MongoClientBulkWriteError = exports.MongoGCPError = exports.MongoAzureError = exports.MongoOIDCError = exports.MongoAWSError = exports.MongoKerberosError = exports.MongoExpiredSessionError = exports.MongoTransactionError = exports.MongoNotConnectedError = exports.MongoDecompressionError = exports.MongoBatchReExecutionError = exports.MongoStalePrimaryError = exports.MongoRuntimeError = exports.MongoAPIError = exports.MongoDriverError = exports.MongoServerError = exports.MongoError = exports.MongoErrorLabel = exports.GET_MORE_RESUMABLE_CODES = exports.MONGODB_ERROR_CODES = exports.NODE_IS_RECOVERING_ERROR_MESSAGE = exports.LEGACY_NOT_PRIMARY_OR_SECONDARY_ERROR_MESSAGE = exports.LEGACY_NOT_WRITABLE_PRIMARY_ERROR_MESSAGE = void 0;
		exports.needsRetryableWriteLabel = needsRetryableWriteLabel;
		exports.isRetryableWriteError = isRetryableWriteError;
		exports.isRetryableReadError = isRetryableReadError;
		exports.isNodeShuttingDownError = isNodeShuttingDownError;
		exports.isStateChangeError = isStateChangeError;
		exports.isNetworkTimeoutError = isNetworkTimeoutError;
		exports.isResumableError = isResumableError;
		/**
		 * @internal
		 * The legacy error message from the server that indicates the node is not a writable primary
		 * https://github.com/mongodb/specifications/blob/921232976f9913cf17415b5ef937ee772e45e6ae/source/server-discovery-and-monitoring/server-discovery-and-monitoring.md#not-writable-primary-and-node-is-recovering
		 */
		exports.LEGACY_NOT_WRITABLE_PRIMARY_ERROR_MESSAGE = new RegExp('not master', 'i');
		/**
		 * @internal
		 * The legacy error message from the server that indicates the node is not a primary or secondary
		 * https://github.com/mongodb/specifications/blob/921232976f9913cf17415b5ef937ee772e45e6ae/source/server-discovery-and-monitoring/server-discovery-and-monitoring.md#not-writable-primary-and-node-is-recovering
		 */
		exports.LEGACY_NOT_PRIMARY_OR_SECONDARY_ERROR_MESSAGE = new RegExp('not master or secondary', 'i');
		/**
		 * @internal
		 * The error message from the server that indicates the node is recovering
		 * https://github.com/mongodb/specifications/blob/921232976f9913cf17415b5ef937ee772e45e6ae/source/server-discovery-and-monitoring/server-discovery-and-monitoring.md#not-writable-primary-and-node-is-recovering
		 */
		exports.NODE_IS_RECOVERING_ERROR_MESSAGE = new RegExp('node is recovering', 'i');
		/** @internal MongoDB Error Codes */
		exports.MONGODB_ERROR_CODES = Object.freeze({
		    HostUnreachable: 6,
		    HostNotFound: 7,
		    AuthenticationFailed: 18,
		    NetworkTimeout: 89,
		    ShutdownInProgress: 91,
		    PrimarySteppedDown: 189,
		    ExceededTimeLimit: 262,
		    SocketException: 9001,
		    NotWritablePrimary: 10107,
		    InterruptedAtShutdown: 11600,
		    InterruptedDueToReplStateChange: 11602,
		    NotPrimaryNoSecondaryOk: 13435,
		    NotPrimaryOrSecondary: 13436,
		    StaleShardVersion: 63,
		    StaleEpoch: 150,
		    StaleConfig: 13388,
		    RetryChangeStream: 234,
		    FailedToSatisfyReadPreference: 133,
		    CursorNotFound: 43,
		    LegacyNotPrimary: 10058,
		    // WriteConcernTimeout is WriteConcernFailed on pre-8.1 servers
		    WriteConcernTimeout: 64,
		    NamespaceNotFound: 26,
		    IllegalOperation: 20,
		    MaxTimeMSExpired: 50,
		    UnknownReplWriteConcern: 79,
		    UnsatisfiableWriteConcern: 100,
		    Reauthenticate: 391,
		    ReadConcernMajorityNotAvailableYet: 134
		});
		// From spec https://github.com/mongodb/specifications/blob/921232976f9913cf17415b5ef937ee772e45e6ae/source/change-streams/change-streams.md#resumable-error
		exports.GET_MORE_RESUMABLE_CODES = new Set([
		    exports.MONGODB_ERROR_CODES.HostUnreachable,
		    exports.MONGODB_ERROR_CODES.HostNotFound,
		    exports.MONGODB_ERROR_CODES.NetworkTimeout,
		    exports.MONGODB_ERROR_CODES.ShutdownInProgress,
		    exports.MONGODB_ERROR_CODES.PrimarySteppedDown,
		    exports.MONGODB_ERROR_CODES.ExceededTimeLimit,
		    exports.MONGODB_ERROR_CODES.SocketException,
		    exports.MONGODB_ERROR_CODES.NotWritablePrimary,
		    exports.MONGODB_ERROR_CODES.InterruptedAtShutdown,
		    exports.MONGODB_ERROR_CODES.InterruptedDueToReplStateChange,
		    exports.MONGODB_ERROR_CODES.NotPrimaryNoSecondaryOk,
		    exports.MONGODB_ERROR_CODES.NotPrimaryOrSecondary,
		    exports.MONGODB_ERROR_CODES.StaleShardVersion,
		    exports.MONGODB_ERROR_CODES.StaleEpoch,
		    exports.MONGODB_ERROR_CODES.StaleConfig,
		    exports.MONGODB_ERROR_CODES.RetryChangeStream,
		    exports.MONGODB_ERROR_CODES.FailedToSatisfyReadPreference,
		    exports.MONGODB_ERROR_CODES.CursorNotFound
		]);
		/** @public */
		exports.MongoErrorLabel = Object.freeze({
		    RetryableWriteError: 'RetryableWriteError',
		    TransientTransactionError: 'TransientTransactionError',
		    UnknownTransactionCommitResult: 'UnknownTransactionCommitResult',
		    ResumableChangeStreamError: 'ResumableChangeStreamError',
		    HandshakeError: 'HandshakeError',
		    ResetPool: 'ResetPool',
		    PoolRequestedRetry: 'PoolRequestedRetry',
		    InterruptInUseConnections: 'InterruptInUseConnections',
		    NoWritesPerformed: 'NoWritesPerformed',
		    RetryableError: 'RetryableError',
		    SystemOverloadedError: 'SystemOverloadedError'
		});
		function isAggregateError(e) {
		    return e != null && typeof e === 'object' && 'errors' in e && Array.isArray(e.errors);
		}
		/**
		 * @public
		 * @category Error
		 *
		 * @privateRemarks
		 * mongodb-client-encryption has a dependency on this error, it uses the constructor with a string argument
		 */
		class MongoError extends Error {
		    get errorLabels() {
		        return Array.from(this.errorLabelSet);
		    }
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
		    constructor(message, options) {
		        super(message, options);
		        /** @internal */
		        this.errorLabelSet = new Set();
		    }
		    /** @internal */
		    static buildErrorMessage(e) {
		        if (typeof e === 'string') {
		            return e;
		        }
		        if (isAggregateError(e) && e.message.length === 0) {
		            return e.errors.length === 0
		                ? 'AggregateError has an empty errors array. Please check the `cause` property for more information.'
		                : e.errors.map(({ message }) => message).join(', ');
		        }
		        return e != null && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
		            ? e.message
		            : 'empty error message';
		    }
		    get name() {
		        return 'MongoError';
		    }
		    /** Legacy name for server error responses */
		    get errmsg() {
		        return this.message;
		    }
		    /**
		     * Checks the error to see if it has an error label
		     *
		     * @param label - The error label to check for
		     * @returns returns true if the error has the provided error label
		     */
		    hasErrorLabel(label) {
		        return this.errorLabelSet.has(label);
		    }
		    addErrorLabel(label) {
		        this.errorLabelSet.add(label);
		    }
		}
		exports.MongoError = MongoError;
		/**
		 * An error coming from the mongo server
		 *
		 * @public
		 * @category Error
		 */
		class MongoServerError extends MongoError {
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
		    constructor(message) {
		        super(message.message || message.errmsg || message.$err || 'n/a');
		        if (message.errorLabels) {
		            for (const label of message.errorLabels)
		                this.addErrorLabel(label);
		        }
		        this.errorResponse = message;
		        for (const name in message) {
		            if (name !== 'errorLabels' &&
		                name !== 'errmsg' &&
		                name !== 'message' &&
		                name !== 'errorResponse') {
		                this[name] = message[name];
		            }
		        }
		    }
		    get name() {
		        return 'MongoServerError';
		    }
		}
		exports.MongoServerError = MongoServerError;
		/**
		 * An error generated by the driver
		 *
		 * @public
		 * @category Error
		 */
		class MongoDriverError extends MongoError {
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
		    constructor(message, options) {
		        super(message, options);
		    }
		    get name() {
		        return 'MongoDriverError';
		    }
		}
		exports.MongoDriverError = MongoDriverError;
		/**
		 * An error generated when the driver API is used incorrectly
		 *
		 * @privateRemarks
		 * Should **never** be directly instantiated
		 *
		 * @public
		 * @category Error
		 */
		class MongoAPIError extends MongoDriverError {
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
		    constructor(message, options) {
		        super(message, options);
		    }
		    get name() {
		        return 'MongoAPIError';
		    }
		}
		exports.MongoAPIError = MongoAPIError;
		/**
		 * An error generated when the driver encounters unexpected input
		 * or reaches an unexpected/invalid internal state.
		 *
		 * @privateRemarks
		 * Should **never** be directly instantiated.
		 *
		 * @public
		 * @category Error
		 */
		class MongoRuntimeError extends MongoDriverError {
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
		    constructor(message, options) {
		        super(message, options);
		    }
		    get name() {
		        return 'MongoRuntimeError';
		    }
		}
		exports.MongoRuntimeError = MongoRuntimeError;
		/**
		 * An error generated when a primary server is marked stale, never directly thrown
		 *
		 * @public
		 * @category Error
		 */
		class MongoStalePrimaryError extends MongoRuntimeError {
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
		    constructor(message, options) {
		        super(message, options);
		    }
		    get name() {
		        return 'MongoStalePrimaryError';
		    }
		}
		exports.MongoStalePrimaryError = MongoStalePrimaryError;
		/**
		 * An error generated when a batch command is re-executed after one of the commands in the batch
		 * has failed
		 *
		 * @public
		 * @category Error
		 */
		class MongoBatchReExecutionError extends MongoAPIError {
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
		    constructor(message = 'This batch has already been executed, create new batch to execute') {
		        super(message);
		    }
		    get name() {
		        return 'MongoBatchReExecutionError';
		    }
		}
		exports.MongoBatchReExecutionError = MongoBatchReExecutionError;
		/**
		 * An error generated when the driver fails to decompress
		 * data received from the server.
		 *
		 * @public
		 * @category Error
		 */
		class MongoDecompressionError extends MongoRuntimeError {
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
		    constructor(message) {
		        super(message);
		    }
		    get name() {
		        return 'MongoDecompressionError';
		    }
		}
		exports.MongoDecompressionError = MongoDecompressionError;
		/**
		 * An error thrown when the user attempts to operate on a database or collection through a MongoClient
		 * that has not yet successfully called the "connect" method
		 *
		 * @public
		 * @category Error
		 */
		class MongoNotConnectedError extends MongoAPIError {
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
		    constructor(message) {
		        super(message);
		    }
		    get name() {
		        return 'MongoNotConnectedError';
		    }
		}
		exports.MongoNotConnectedError = MongoNotConnectedError;
		/**
		 * An error generated when the user makes a mistake in the usage of transactions.
		 * (e.g. attempting to commit a transaction with a readPreference other than primary)
		 *
		 * @public
		 * @category Error
		 */
		class MongoTransactionError extends MongoAPIError {
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
		    constructor(message) {
		        super(message);
		    }
		    get name() {
		        return 'MongoTransactionError';
		    }
		}
		exports.MongoTransactionError = MongoTransactionError;
		/**
		 * An error generated when the user attempts to operate
		 * on a session that has expired or has been closed.
		 *
		 * @public
		 * @category Error
		 */
		class MongoExpiredSessionError extends MongoAPIError {
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
		    constructor(message = 'Cannot use a session that has ended') {
		        super(message);
		    }
		    get name() {
		        return 'MongoExpiredSessionError';
		    }
		}
		exports.MongoExpiredSessionError = MongoExpiredSessionError;
		/**
		 * A error generated when the user attempts to authenticate
		 * via Kerberos, but fails to connect to the Kerberos client.
		 *
		 * @public
		 * @category Error
		 */
		class MongoKerberosError extends MongoRuntimeError {
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
		    constructor(message) {
		        super(message);
		    }
		    get name() {
		        return 'MongoKerberosError';
		    }
		}
		exports.MongoKerberosError = MongoKerberosError;
		/**
		 * A error generated when the user attempts to authenticate
		 * via AWS, but fails
		 *
		 * @public
		 * @category Error
		 */
		class MongoAWSError extends MongoRuntimeError {
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
		    constructor(message, options) {
		        super(message, options);
		    }
		    get name() {
		        return 'MongoAWSError';
		    }
		}
		exports.MongoAWSError = MongoAWSError;
		/**
		 * A error generated when the user attempts to authenticate
		 * via OIDC callbacks, but fails.
		 *
		 * @public
		 * @category Error
		 */
		class MongoOIDCError extends MongoRuntimeError {
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
		    constructor(message) {
		        super(message);
		    }
		    get name() {
		        return 'MongoOIDCError';
		    }
		}
		exports.MongoOIDCError = MongoOIDCError;
		/**
		 * A error generated when the user attempts to authenticate
		 * via Azure, but fails.
		 *
		 * @public
		 * @category Error
		 */
		class MongoAzureError extends MongoOIDCError {
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
		    constructor(message) {
		        super(message);
		    }
		    get name() {
		        return 'MongoAzureError';
		    }
		}
		exports.MongoAzureError = MongoAzureError;
		/**
		 * A error generated when the user attempts to authenticate
		 * via GCP, but fails.
		 *
		 * @public
		 * @category Error
		 */
		class MongoGCPError extends MongoOIDCError {
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
		    constructor(message) {
		        super(message);
		    }
		    get name() {
		        return 'MongoGCPError';
		    }
		}
		exports.MongoGCPError = MongoGCPError;
		/**
		 * An error indicating that an error occurred when executing the bulk write.
		 *
		 * @public
		 * @category Error
		 */
		class MongoClientBulkWriteError extends MongoServerError {
		    /**
		     * Initialize the client bulk write error.
		     * @param message - The error message.
		     */
		    constructor(message) {
		        super(message);
		        this.writeConcernErrors = [];
		        this.writeErrors = new Map();
		    }
		    get name() {
		        return 'MongoClientBulkWriteError';
		    }
		}
		exports.MongoClientBulkWriteError = MongoClientBulkWriteError;
		/**
		 * An error indicating that an error occurred when processing bulk write results.
		 *
		 * @public
		 * @category Error
		 */
		class MongoClientBulkWriteCursorError extends MongoRuntimeError {
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
		    constructor(message) {
		        super(message);
		    }
		    get name() {
		        return 'MongoClientBulkWriteCursorError';
		    }
		}
		exports.MongoClientBulkWriteCursorError = MongoClientBulkWriteCursorError;
		/**
		 * An error indicating that an error occurred on the client when executing a client bulk write.
		 *
		 * @public
		 * @category Error
		 */
		class MongoClientBulkWriteExecutionError extends MongoRuntimeError {
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
		    constructor(message) {
		        super(message);
		    }
		    get name() {
		        return 'MongoClientBulkWriteExecutionError';
		    }
		}
		exports.MongoClientBulkWriteExecutionError = MongoClientBulkWriteExecutionError;
		/**
		 * An error generated when a ChangeStream operation fails to execute.
		 *
		 * @public
		 * @category Error
		 */
		class MongoChangeStreamError extends MongoRuntimeError {
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
		    constructor(message) {
		        super(message);
		    }
		    get name() {
		        return 'MongoChangeStreamError';
		    }
		}
		exports.MongoChangeStreamError = MongoChangeStreamError;
		/**
		 * An error thrown when the user calls a function or method not supported on a tailable cursor
		 *
		 * @public
		 * @category Error
		 */
		class MongoTailableCursorError extends MongoAPIError {
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
		    constructor(message = 'Tailable cursor does not support this operation') {
		        super(message);
		    }
		    get name() {
		        return 'MongoTailableCursorError';
		    }
		}
		exports.MongoTailableCursorError = MongoTailableCursorError;
		/** An error generated when a GridFSStream operation fails to execute.
		 *
		 * @public
		 * @category Error
		 */
		class MongoGridFSStreamError extends MongoRuntimeError {
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
		    constructor(message) {
		        super(message);
		    }
		    get name() {
		        return 'MongoGridFSStreamError';
		    }
		}
		exports.MongoGridFSStreamError = MongoGridFSStreamError;
		/**
		 * An error generated when a malformed or invalid chunk is
		 * encountered when reading from a GridFSStream.
		 *
		 * @public
		 * @category Error
		 */
		class MongoGridFSChunkError extends MongoRuntimeError {
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
		    constructor(message) {
		        super(message);
		    }
		    get name() {
		        return 'MongoGridFSChunkError';
		    }
		}
		exports.MongoGridFSChunkError = MongoGridFSChunkError;
		/**
		 * An error generated when a **parsable** unexpected response comes from the server.
		 * This is generally an error where the driver in a state expecting a certain behavior to occur in
		 * the next message from MongoDB but it receives something else.
		 * This error **does not** represent an issue with wire message formatting.
		 *
		 * #### Example
		 * When an operation fails, it is the driver's job to retry it. It must perform serverSelection
		 * again to make sure that it attempts the operation against a server in a good state. If server
		 * selection returns a server that does not support retryable operations, this error is used.
		 * This scenario is unlikely as retryable support would also have been determined on the first attempt
		 * but it is possible the state change could report a selectable server that does not support retries.
		 *
		 * @public
		 * @category Error
		 */
		class MongoUnexpectedServerResponseError extends MongoRuntimeError {
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
		    constructor(message, options) {
		        super(message, options);
		    }
		    get name() {
		        return 'MongoUnexpectedServerResponseError';
		    }
		}
		exports.MongoUnexpectedServerResponseError = MongoUnexpectedServerResponseError;
		/**
		 * @public
		 * @category Error
		 *
		 * The `MongoOperationTimeoutError` class represents an error that occurs when an operation could not be completed within the specified `timeoutMS`.
		 * It is generated by the driver in support of the "client side operation timeout" feature so inherits from `MongoDriverError`.
		 * When `timeoutMS` is enabled `MongoServerError`s relating to `MaxTimeExpired` errors will be converted to `MongoOperationTimeoutError`
		 *
		 * @example
		 * ```ts
		 * try {
		 *   await blogs.insertOne(blogPost, { timeoutMS: 60_000 })
		 * } catch (error) {
		 *   if (error instanceof MongoOperationTimeoutError) {
		 *     console.log(`Oh no! writer's block!`, error);
		 *   }
		 * }
		 * ```
		 */
		class MongoOperationTimeoutError extends MongoDriverError {
		    get name() {
		        return 'MongoOperationTimeoutError';
		    }
		}
		exports.MongoOperationTimeoutError = MongoOperationTimeoutError;
		/**
		 * An error thrown when the user attempts to add options to a cursor that has already been
		 * initialized
		 *
		 * @public
		 * @category Error
		 */
		class MongoCursorInUseError extends MongoAPIError {
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
		    constructor(message = 'Cursor is already initialized') {
		        super(message);
		    }
		    get name() {
		        return 'MongoCursorInUseError';
		    }
		}
		exports.MongoCursorInUseError = MongoCursorInUseError;
		/**
		 * An error generated when an attempt is made to operate
		 * on a closed/closing server.
		 *
		 * @public
		 * @category Error
		 */
		class MongoServerClosedError extends MongoAPIError {
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
		    constructor(message = 'Server is closed') {
		        super(message);
		    }
		    get name() {
		        return 'MongoServerClosedError';
		    }
		}
		exports.MongoServerClosedError = MongoServerClosedError;
		/**
		 * An error thrown when an attempt is made to read from a cursor that has been exhausted
		 *
		 * @public
		 * @category Error
		 */
		class MongoCursorExhaustedError extends MongoAPIError {
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
		    constructor(message) {
		        super(message || 'Cursor is exhausted');
		    }
		    get name() {
		        return 'MongoCursorExhaustedError';
		    }
		}
		exports.MongoCursorExhaustedError = MongoCursorExhaustedError;
		/**
		 * An error generated when an attempt is made to operate on a
		 * dropped, or otherwise unavailable, database.
		 *
		 * @public
		 * @category Error
		 */
		class MongoTopologyClosedError extends MongoAPIError {
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
		    constructor(message = 'Topology is closed') {
		        super(message);
		    }
		    get name() {
		        return 'MongoTopologyClosedError';
		    }
		}
		exports.MongoTopologyClosedError = MongoTopologyClosedError;
		/**
		 * An error generated when the MongoClient is closed and async
		 * operations are interrupted.
		 *
		 * @public
		 * @category Error
		 */
		class MongoClientClosedError extends MongoAPIError {
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
		    constructor() {
		        super('Operation interrupted because client was closed');
		    }
		    get name() {
		        return 'MongoClientClosedError';
		    }
		}
		exports.MongoClientClosedError = MongoClientClosedError;
		/**
		 * An error indicating an issue with the network, including TCP errors and timeouts.
		 * @public
		 * @category Error
		 */
		class MongoNetworkError extends MongoError {
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
		    constructor(message, options) {
		        super(message, { cause: options?.cause });
		        this.beforeHandshake = !!options?.beforeHandshake;
		    }
		    get name() {
		        return 'MongoNetworkError';
		    }
		}
		exports.MongoNetworkError = MongoNetworkError;
		/**
		 * An error indicating a network timeout occurred
		 * @public
		 * @category Error
		 *
		 * @privateRemarks
		 * mongodb-client-encryption has a dependency on this error with an instanceof check
		 */
		class MongoNetworkTimeoutError extends MongoNetworkError {
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
		    constructor(message, options) {
		        super(message, options);
		    }
		    get name() {
		        return 'MongoNetworkTimeoutError';
		    }
		}
		exports.MongoNetworkTimeoutError = MongoNetworkTimeoutError;
		/**
		 * An error used when attempting to parse a value (like a connection string)
		 * @public
		 * @category Error
		 */
		class MongoParseError extends MongoDriverError {
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
		    constructor(message) {
		        super(message);
		    }
		    get name() {
		        return 'MongoParseError';
		    }
		}
		exports.MongoParseError = MongoParseError;
		/**
		 * An error generated when the user supplies malformed or unexpected arguments
		 * or when a required argument or field is not provided.
		 *
		 *
		 * @public
		 * @category Error
		 */
		class MongoInvalidArgumentError extends MongoAPIError {
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
		    constructor(message, options) {
		        super(message, options);
		    }
		    get name() {
		        return 'MongoInvalidArgumentError';
		    }
		}
		exports.MongoInvalidArgumentError = MongoInvalidArgumentError;
		/**
		 * An error generated when a feature that is not enabled or allowed for the current server
		 * configuration is used
		 *
		 *
		 * @public
		 * @category Error
		 */
		class MongoCompatibilityError extends MongoAPIError {
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
		    constructor(message) {
		        super(message);
		    }
		    get name() {
		        return 'MongoCompatibilityError';
		    }
		}
		exports.MongoCompatibilityError = MongoCompatibilityError;
		/**
		 * An error generated when the user fails to provide authentication credentials before attempting
		 * to connect to a mongo server instance.
		 *
		 *
		 * @public
		 * @category Error
		 */
		class MongoMissingCredentialsError extends MongoAPIError {
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
		    constructor(message) {
		        super(message);
		    }
		    get name() {
		        return 'MongoMissingCredentialsError';
		    }
		}
		exports.MongoMissingCredentialsError = MongoMissingCredentialsError;
		/**
		 * An error generated when a required module or dependency is not present in the local environment
		 *
		 * @public
		 * @category Error
		 */
		class MongoMissingDependencyError extends MongoAPIError {
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
		    constructor(message, options) {
		        super(message, options);
		        this.dependencyName = options.dependencyName;
		    }
		    get name() {
		        return 'MongoMissingDependencyError';
		    }
		}
		exports.MongoMissingDependencyError = MongoMissingDependencyError;
		/**
		 * An error signifying a general system issue
		 * @public
		 * @category Error
		 */
		class MongoSystemError extends MongoError {
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
		    constructor(message, reason) {
		        if (reason && reason.error) {
		            super(MongoError.buildErrorMessage(reason.error.message || reason.error), {
		                cause: reason.error
		            });
		        }
		        else {
		            super(message);
		        }
		        if (reason) {
		            this.reason = reason;
		        }
		        this.code = reason.error?.code;
		    }
		    get name() {
		        return 'MongoSystemError';
		    }
		}
		exports.MongoSystemError = MongoSystemError;
		/**
		 * An error signifying a client-side server selection error
		 * @public
		 * @category Error
		 */
		class MongoServerSelectionError extends MongoSystemError {
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
		    constructor(message, reason) {
		        super(message, reason);
		    }
		    get name() {
		        return 'MongoServerSelectionError';
		    }
		}
		exports.MongoServerSelectionError = MongoServerSelectionError;
		/**
		 * An error thrown when the server reports a writeConcernError
		 * @public
		 * @category Error
		 */
		class MongoWriteConcernError extends MongoServerError {
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
		    constructor(result) {
		        super({ ...result.writeConcernError, ...result });
		        this.errInfo = result.writeConcernError.errInfo;
		        this.result = result;
		    }
		    get name() {
		        return 'MongoWriteConcernError';
		    }
		}
		exports.MongoWriteConcernError = MongoWriteConcernError;
		// https://github.com/mongodb/specifications/blob/master/source/retryable-reads/retryable-reads.md#retryable-error
		const RETRYABLE_READ_ERROR_CODES = new Set([
		    exports.MONGODB_ERROR_CODES.HostUnreachable,
		    exports.MONGODB_ERROR_CODES.HostNotFound,
		    exports.MONGODB_ERROR_CODES.NetworkTimeout,
		    exports.MONGODB_ERROR_CODES.ShutdownInProgress,
		    exports.MONGODB_ERROR_CODES.PrimarySteppedDown,
		    exports.MONGODB_ERROR_CODES.SocketException,
		    exports.MONGODB_ERROR_CODES.NotWritablePrimary,
		    exports.MONGODB_ERROR_CODES.InterruptedAtShutdown,
		    exports.MONGODB_ERROR_CODES.InterruptedDueToReplStateChange,
		    exports.MONGODB_ERROR_CODES.NotPrimaryNoSecondaryOk,
		    exports.MONGODB_ERROR_CODES.NotPrimaryOrSecondary,
		    exports.MONGODB_ERROR_CODES.ExceededTimeLimit,
		    exports.MONGODB_ERROR_CODES.ReadConcernMajorityNotAvailableYet
		]);
		// see: https://github.com/mongodb/specifications/blob/master/source/retryable-writes/retryable-writes.md#terms
		const RETRYABLE_WRITE_ERROR_CODES = RETRYABLE_READ_ERROR_CODES;
		function needsRetryableWriteLabel(error, maxWireVersion, serverType) {
		    // pre-4.4 server, then the driver adds an error label for every valid case
		    // execute operation will only inspect the label, code/message logic is handled here
		    if (error instanceof MongoNetworkError) {
		        return true;
		    }
		    if (error instanceof MongoError) {
		        if ((maxWireVersion >= 9 || isRetryableWriteError(error)) &&
		            !error.hasErrorLabel(exports.MongoErrorLabel.HandshakeError)) {
		            // If we already have the error label no need to add it again. 4.4+ servers add the label.
		            // In the case where we have a handshake error, need to fall down to the logic checking
		            // the codes.
		            return false;
		        }
		    }
		    if (error instanceof MongoWriteConcernError) {
		        if (serverType === 'Mongos' && maxWireVersion < 9) {
		            // use original top-level code from server response
		            return RETRYABLE_WRITE_ERROR_CODES.has(error.result.code ?? 0);
		        }
		        const code = error.result.writeConcernError.code ?? Number(error.code);
		        return RETRYABLE_WRITE_ERROR_CODES.has(Number.isNaN(code) ? 0 : code);
		    }
		    if (error instanceof MongoError) {
		        return RETRYABLE_WRITE_ERROR_CODES.has(Number(error.code));
		    }
		    const isNotWritablePrimaryError = exports.LEGACY_NOT_WRITABLE_PRIMARY_ERROR_MESSAGE.test(error.message);
		    if (isNotWritablePrimaryError) {
		        return true;
		    }
		    const isNodeIsRecoveringError = exports.NODE_IS_RECOVERING_ERROR_MESSAGE.test(error.message);
		    if (isNodeIsRecoveringError) {
		        return true;
		    }
		    return false;
		}
		function isRetryableWriteError(error) {
		    return (error.hasErrorLabel(exports.MongoErrorLabel.RetryableWriteError) ||
		        error.hasErrorLabel(exports.MongoErrorLabel.PoolRequestedRetry));
		}
		/** Determines whether an error is something the driver should attempt to retry */
		function isRetryableReadError(error) {
		    const hasRetryableErrorCode = typeof error.code === 'number' ? RETRYABLE_READ_ERROR_CODES.has(error.code) : false;
		    if (hasRetryableErrorCode) {
		        return true;
		    }
		    if (error instanceof MongoNetworkError) {
		        return true;
		    }
		    const isNotWritablePrimaryError = exports.LEGACY_NOT_WRITABLE_PRIMARY_ERROR_MESSAGE.test(error.message);
		    if (isNotWritablePrimaryError) {
		        return true;
		    }
		    const isNodeIsRecoveringError = exports.NODE_IS_RECOVERING_ERROR_MESSAGE.test(error.message);
		    if (isNodeIsRecoveringError) {
		        return true;
		    }
		    return false;
		}
		const SDAM_RECOVERING_CODES = new Set([
		    exports.MONGODB_ERROR_CODES.ShutdownInProgress,
		    exports.MONGODB_ERROR_CODES.PrimarySteppedDown,
		    exports.MONGODB_ERROR_CODES.InterruptedAtShutdown,
		    exports.MONGODB_ERROR_CODES.InterruptedDueToReplStateChange,
		    exports.MONGODB_ERROR_CODES.NotPrimaryOrSecondary
		]);
		const SDAM_NOT_PRIMARY_CODES = new Set([
		    exports.MONGODB_ERROR_CODES.NotWritablePrimary,
		    exports.MONGODB_ERROR_CODES.NotPrimaryNoSecondaryOk,
		    exports.MONGODB_ERROR_CODES.LegacyNotPrimary
		]);
		const SDAM_NODE_SHUTTING_DOWN_ERROR_CODES = new Set([
		    exports.MONGODB_ERROR_CODES.InterruptedAtShutdown,
		    exports.MONGODB_ERROR_CODES.ShutdownInProgress
		]);
		function isRecoveringError(err) {
		    if (typeof err.code === 'number') {
		        // If any error code exists, we ignore the error.message
		        return SDAM_RECOVERING_CODES.has(err.code);
		    }
		    return (exports.LEGACY_NOT_PRIMARY_OR_SECONDARY_ERROR_MESSAGE.test(err.message) ||
		        exports.NODE_IS_RECOVERING_ERROR_MESSAGE.test(err.message));
		}
		function isNotWritablePrimaryError(err) {
		    if (typeof err.code === 'number') {
		        // If any error code exists, we ignore the error.message
		        return SDAM_NOT_PRIMARY_CODES.has(err.code);
		    }
		    if (isRecoveringError(err)) {
		        return false;
		    }
		    return exports.LEGACY_NOT_WRITABLE_PRIMARY_ERROR_MESSAGE.test(err.message);
		}
		function isNodeShuttingDownError(err) {
		    return !!(typeof err.code === 'number' && SDAM_NODE_SHUTTING_DOWN_ERROR_CODES.has(err.code));
		}
		/**
		 * Determines whether SDAM can recover from a given error. If it cannot
		 * then the pool will be cleared, and server state will completely reset
		 * locally.
		 *
		 * @see https://github.com/mongodb/specifications/blob/master/source/server-discovery-and-monitoring/server-discovery-and-monitoring.md#not-writable-primary-and-node-is-recovering
		 */
		function isStateChangeError(error) {
		    return isRecoveringError(error) || isNotWritablePrimaryError(error);
		}
		function isNetworkTimeoutError(err) {
		    return !!(err instanceof MongoNetworkError && err.message.match(/timed out/));
		}
		function isResumableError(error, wireVersion) {
		    if (error == null || !(error instanceof MongoError)) {
		        return false;
		    }
		    if (error instanceof MongoNetworkError) {
		        return true;
		    }
		    if (error instanceof MongoServerSelectionError) {
		        return true;
		    }
		    if (wireVersion != null && wireVersion >= 9) {
		        // DRIVERS-1308: For 4.4 drivers running against 4.4 servers, drivers will add a special case to treat the CursorNotFound error code as resumable
		        if (error.code === exports.MONGODB_ERROR_CODES.CursorNotFound) {
		            return true;
		        }
		        return error.hasErrorLabel(exports.MongoErrorLabel.ResumableChangeStreamError);
		    }
		    if (typeof error.code === 'number') {
		        return exports.GET_MORE_RESUMABLE_CODES.has(error.code);
		    }
		    return false;
		}
		
	} (error));
	return error;
}

var explain = {};

var hasRequiredExplain;

function requireExplain () {
	if (hasRequiredExplain) return explain;
	hasRequiredExplain = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.Explain = exports.ExplainVerbosity = void 0;
		exports.validateExplainTimeoutOptions = validateExplainTimeoutOptions;
		exports.decorateWithExplain = decorateWithExplain;
		const error_1 = requireError();
		/** @public */
		exports.ExplainVerbosity = Object.freeze({
		    queryPlanner: 'queryPlanner',
		    queryPlannerExtended: 'queryPlannerExtended',
		    executionStats: 'executionStats',
		    allPlansExecution: 'allPlansExecution'
		});
		/** @internal */
		class Explain {
		    constructor(verbosity, maxTimeMS) {
		        if (typeof verbosity === 'boolean') {
		            this.verbosity = verbosity
		                ? exports.ExplainVerbosity.allPlansExecution
		                : exports.ExplainVerbosity.queryPlanner;
		        }
		        else {
		            this.verbosity = verbosity;
		        }
		        this.maxTimeMS = maxTimeMS;
		    }
		    static fromOptions({ explain } = {}) {
		        if (explain == null)
		            return;
		        if (typeof explain === 'boolean' || typeof explain === 'string') {
		            return new Explain(explain);
		        }
		        const { verbosity, maxTimeMS } = explain;
		        return new Explain(verbosity, maxTimeMS);
		    }
		}
		exports.Explain = Explain;
		function validateExplainTimeoutOptions(options, explain) {
		    const { maxTimeMS, timeoutMS } = options;
		    if (timeoutMS != null && (maxTimeMS != null || explain?.maxTimeMS != null)) {
		        throw new error_1.MongoAPIError('Cannot use maxTimeMS with timeoutMS for explain commands.');
		    }
		}
		/**
		 * Applies an explain to a given command.
		 * @internal
		 *
		 * @param command - the command on which to apply the explain
		 * @param options - the options containing the explain verbosity
		 */
		function decorateWithExplain(command, explain) {
		    const { verbosity, maxTimeMS } = explain;
		    const baseCommand = { explain: command, verbosity };
		    if (typeof maxTimeMS === 'number') {
		        baseCommand.maxTimeMS = maxTimeMS;
		    }
		    return baseCommand;
		}
		
	} (explain));
	return explain;
}

var db = {};

var hasRequiredDb;

function requireDb () {
	if (hasRequiredDb) return db;
	hasRequiredDb = 1;
	Object.defineProperty(db, "__esModule", { value: true });
	db.Db = void 0;
	const admin_1 = mongodb1.requireAdmin();
	const bson_1 = mongodb1.requireBson();
	const change_stream_1 = mongodb1.requireChange_stream();
	const collection_1 = mongodb3.requireCollection();
	const CONSTANTS = mongodb3.requireConstants();
	const aggregation_cursor_1 = mongodb3.requireAggregation_cursor();
	const list_collections_cursor_1 = mongodb3.requireList_collections_cursor();
	const run_command_cursor_1 = mongodb3.requireRun_command_cursor();
	const error_1 = requireError();
	const create_collection_1 = mongodb5.requireCreate_collection();
	const drop_1 = mongodb5.requireDrop();
	const execute_operation_1 = mongodb5.requireExecute_operation();
	const indexes_1 = mongodb5.requireIndexes();
	const profiling_level_1 = mongodb5.requireProfiling_level();
	const remove_user_1 = mongodb5.requireRemove_user();
	const rename_1 = mongodb5.requireRename();
	const run_command_1 = mongodb5.requireRun_command();
	const set_profiling_level_1 = mongodb5.requireSet_profiling_level();
	const stats_1 = mongodb5.requireStats();
	const read_concern_1 = mongodb5.requireRead_concern();
	const read_preference_1 = mongodb5.requireRead_preference();
	const utils_1 = mongodb7.requireUtils();
	const write_concern_1 = mongodb7.requireWrite_concern();
	// Allowed parameters
	const DB_OPTIONS_ALLOW_LIST = [
	    'writeConcern',
	    'readPreference',
	    'readPreferenceTags',
	    'native_parser',
	    'forceServerObjectId',
	    'pkFactory',
	    'serializeFunctions',
	    'raw',
	    'authSource',
	    'ignoreUndefined',
	    'readConcern',
	    'retryMiliSeconds',
	    'numberOfRetries',
	    'useBigInt64',
	    'promoteBuffers',
	    'promoteLongs',
	    'bsonRegExp',
	    'enableUtf8Validation',
	    'promoteValues',
	    'compression',
	    'retryWrites',
	    'timeoutMS'
	];
	/**
	 * The **Db** class is a class that represents a MongoDB Database.
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
	 * const db = client.db();
	 *
	 * // Create a collection that validates our union
	 * await db.createCollection<Pet>('pets', {
	 *   validator: { $expr: { $in: ['$kind', ['dog', 'cat', 'fish']] } }
	 * })
	 * ```
	 */
	class Db {
	    static { this.SYSTEM_NAMESPACE_COLLECTION = CONSTANTS.SYSTEM_NAMESPACE_COLLECTION; }
	    static { this.SYSTEM_INDEX_COLLECTION = CONSTANTS.SYSTEM_INDEX_COLLECTION; }
	    static { this.SYSTEM_PROFILE_COLLECTION = CONSTANTS.SYSTEM_PROFILE_COLLECTION; }
	    static { this.SYSTEM_USER_COLLECTION = CONSTANTS.SYSTEM_USER_COLLECTION; }
	    static { this.SYSTEM_COMMAND_COLLECTION = CONSTANTS.SYSTEM_COMMAND_COLLECTION; }
	    static { this.SYSTEM_JS_COLLECTION = CONSTANTS.SYSTEM_JS_COLLECTION; }
	    /**
	     * Creates a new Db instance.
	     *
	     * Db name cannot contain a dot, the server may apply more restrictions when an operation is run.
	     *
	     * @param client - The MongoClient for the database.
	     * @param databaseName - The name of the database this instance represents.
	     * @param options - Optional settings for Db construction.
	     */
	    constructor(client, databaseName, options) {
	        options = options ?? {};
	        // Filter the options
	        options = (0, utils_1.filterOptions)(options, DB_OPTIONS_ALLOW_LIST);
	        // Ensure there are no dots in database name
	        if (typeof databaseName === 'string' && databaseName.includes('.')) {
	            throw new error_1.MongoInvalidArgumentError(`Database names cannot contain the character '.'`);
	        }
	        // Internal state of the db object
	        this.s = {
	            // Options
	            options,
	            // Unpack read preference
	            readPreference: read_preference_1.ReadPreference.fromOptions(options),
	            // Merge bson options
	            bsonOptions: (0, bson_1.resolveBSONOptions)(options, client),
	            // Set up the primary key factory or fallback to ObjectId
	            pkFactory: options?.pkFactory ?? utils_1.DEFAULT_PK_FACTORY,
	            // ReadConcern
	            readConcern: read_concern_1.ReadConcern.fromOptions(options),
	            writeConcern: write_concern_1.WriteConcern.fromOptions(options),
	            // Namespace
	            namespace: new utils_1.MongoDBNamespace(databaseName)
	        };
	        this.client = client;
	    }
	    get databaseName() {
	        return this.s.namespace.db;
	    }
	    // Options
	    get options() {
	        return this.s.options;
	    }
	    /**
	     * Check if a secondary can be used (because the read preference is *not* set to primary)
	     */
	    get secondaryOk() {
	        return this.s.readPreference?.preference !== 'primary' || false;
	    }
	    get readConcern() {
	        return this.s.readConcern;
	    }
	    /**
	     * The current readPreference of the Db. If not explicitly defined for
	     * this Db, will be inherited from the parent MongoClient
	     */
	    get readPreference() {
	        if (this.s.readPreference == null) {
	            return this.client.readPreference;
	        }
	        return this.s.readPreference;
	    }
	    get bsonOptions() {
	        return this.s.bsonOptions;
	    }
	    // get the write Concern
	    get writeConcern() {
	        return this.s.writeConcern;
	    }
	    get namespace() {
	        return this.s.namespace.toString();
	    }
	    get timeoutMS() {
	        return this.s.options?.timeoutMS;
	    }
	    /**
	     * Create a new collection on a server with the specified options. Use this to create capped collections.
	     * More information about command options available at https://www.mongodb.com/docs/manual/reference/command/create/
	     *
	     * Collection namespace validation is performed server-side.
	     *
	     * @param name - The name of the collection to create
	     * @param options - Optional settings for the command
	     */
	    async createCollection(name, options) {
	        options = (0, utils_1.resolveOptions)(this, options);
	        return await (0, create_collection_1.createCollections)(this, name, options);
	    }
	    /**
	     * Execute a command
	     *
	     * @remarks
	     * This command does not inherit options from the MongoClient.
	     *
	     * The driver will ensure the following fields are attached to the command sent to the server:
	     * - `lsid` - sourced from an implicit session or options.session
	     * - `$readPreference` - defaults to primary or can be configured by options.readPreference
	     * - `$db` - sourced from the name of this database
	     *
	     * If the client has a serverApi setting:
	     * - `apiVersion`
	     * - `apiStrict`
	     * - `apiDeprecationErrors`
	     *
	     * When in a transaction:
	     * - `readConcern` - sourced from readConcern set on the TransactionOptions
	     * - `writeConcern` - sourced from writeConcern set on the TransactionOptions
	     *
	     * Attaching any of the above fields to the command will have no effect as the driver will overwrite the value.
	     *
	     * @param command - The command to run
	     * @param options - Optional settings for the command
	     */
	    async command(command, options) {
	        // Intentionally, we do not inherit options from parent for this operation.
	        return await (0, execute_operation_1.executeOperation)(this.client, new run_command_1.RunCommandOperation(this.s.namespace, command, (0, utils_1.resolveOptions)(undefined, {
	            ...(0, bson_1.resolveBSONOptions)(options),
	            timeoutMS: options?.timeoutMS ?? this.timeoutMS,
	            session: options?.session,
	            readPreference: options?.readPreference,
	            signal: options?.signal
	        })));
	    }
	    /**
	     * Execute an aggregation framework pipeline against the database.
	     *
	     * @param pipeline - An array of aggregation stages to be executed
	     * @param options - Optional settings for the command
	     */
	    aggregate(pipeline = [], options) {
	        return new aggregation_cursor_1.AggregationCursor(this.client, this.s.namespace, pipeline, (0, utils_1.resolveOptions)(this, options));
	    }
	    /** Return the Admin db instance */
	    admin() {
	        return new admin_1.Admin(this);
	    }
	    /**
	     * Returns a reference to a MongoDB Collection. If it does not exist it will be created implicitly.
	     *
	     * Collection namespace validation is performed server-side.
	     *
	     * @param name - the collection name we wish to access.
	     * @returns return the new Collection instance
	     */
	    collection(name, options = {}) {
	        if (typeof options === 'function') {
	            throw new error_1.MongoInvalidArgumentError('The callback form of this helper has been removed.');
	        }
	        return new collection_1.Collection(this, name, (0, utils_1.resolveOptions)(this, options));
	    }
	    /**
	     * Get all the db statistics.
	     *
	     * @param options - Optional settings for the command
	     */
	    async stats(options) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new stats_1.DbStatsOperation(this, (0, utils_1.resolveOptions)(this, options)));
	    }
	    listCollections(filter = {}, options = {}) {
	        return new list_collections_cursor_1.ListCollectionsCursor(this, filter, (0, utils_1.resolveOptions)(this, options));
	    }
	    /**
	     * Rename a collection.
	     *
	     * @remarks
	     * This operation does not inherit options from the MongoClient.
	     *
	     * @param fromCollection - Name of current collection to rename
	     * @param toCollection - New name of of the collection
	     * @param options - Optional settings for the command
	     */
	    async renameCollection(fromCollection, toCollection, options) {
	        // Intentionally, we do not inherit options from parent for this operation.
	        return await (0, execute_operation_1.executeOperation)(this.client, new rename_1.RenameOperation(this.collection(fromCollection), toCollection, (0, utils_1.resolveOptions)(undefined, {
	            ...options,
	            readPreference: read_preference_1.ReadPreference.primary
	        })));
	    }
	    /**
	     * Drop a collection from the database, removing it permanently. New accesses will create a new collection.
	     *
	     * @param name - Name of collection to drop
	     * @param options - Optional settings for the command
	     */
	    async dropCollection(name, options) {
	        options = (0, utils_1.resolveOptions)(this, options);
	        return await (0, drop_1.dropCollections)(this, name, options);
	    }
	    /**
	     * Drop a database, removing it permanently from the server.
	     *
	     * @param options - Optional settings for the command
	     */
	    async dropDatabase(options) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new drop_1.DropDatabaseOperation(this, (0, utils_1.resolveOptions)(this, options)));
	    }
	    /**
	     * Fetch all collections for the current db.
	     *
	     * @param options - Optional settings for the command
	     */
	    async collections(options) {
	        options = (0, utils_1.resolveOptions)(this, options);
	        const collections = await this.listCollections({}, { ...options, nameOnly: true }).toArray();
	        return collections
	            .filter(
	        // Filter collections removing any illegal ones
	        ({ name }) => !name.includes('$'))
	            .map(({ name }) => new collection_1.Collection(this, name, this.s.options));
	    }
	    /**
	     * Creates an index on the db and collection.
	     *
	     * @param name - Name of the collection to create the index on.
	     * @param indexSpec - Specify the field to index, or an index specification
	     * @param options - Optional settings for the command
	     */
	    async createIndex(name, indexSpec, options) {
	        const indexes = await (0, execute_operation_1.executeOperation)(this.client, indexes_1.CreateIndexesOperation.fromIndexSpecification(this, name, indexSpec, options));
	        return indexes[0];
	    }
	    /**
	     * Remove a user from a database
	     *
	     * @param username - The username to remove
	     * @param options - Optional settings for the command
	     */
	    async removeUser(username, options) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new remove_user_1.RemoveUserOperation(this, username, (0, utils_1.resolveOptions)(this, options)));
	    }
	    /**
	     * Set the current profiling level of MongoDB
	     *
	     * @param level - The new profiling level (off, slow_only, all).
	     * @param options - Optional settings for the command
	     */
	    async setProfilingLevel(level, options) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new set_profiling_level_1.SetProfilingLevelOperation(this, level, (0, utils_1.resolveOptions)(this, options)));
	    }
	    /**
	     * Retrieve the current profiling Level for MongoDB
	     *
	     * @param options - Optional settings for the command
	     */
	    async profilingLevel(options) {
	        return await (0, execute_operation_1.executeOperation)(this.client, new profiling_level_1.ProfilingLevelOperation(this, (0, utils_1.resolveOptions)(this, options)));
	    }
	    async indexInformation(name, options) {
	        return await this.collection(name).indexInformation((0, utils_1.resolveOptions)(this, options));
	    }
	    /**
	     * Create a new Change Stream, watching for new changes (insertions, updates,
	     * replacements, deletions, and invalidations) in this database. Will ignore all
	     * changes to system collections.
	     *
	     * @remarks
	     * watch() accepts two generic arguments for distinct use cases:
	     * - The first is to provide the schema that may be defined for all the collections within this database
	     * - The second is to override the shape of the change stream document entirely, if it is not provided the type will default to ChangeStreamDocument of the first argument
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
	     * @param pipeline - An array of {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/|aggregation pipeline stages} through which to pass change stream documents. This allows for filtering (using $match) and manipulating the change stream documents.
	     * @param options - Optional settings for the command
	     * @typeParam TSchema - Type of the data being detected by the change stream
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
	     * A low level cursor API providing basic driver functionality:
	     * - ClientSession management
	     * - ReadPreference for server selection
	     * - Running getMores automatically when a local batch is exhausted
	     *
	     * @param command - The command that will start a cursor on the server.
	     * @param options - Configurations for running the command, bson options will apply to getMores
	     */
	    runCursorCommand(command, options) {
	        return new run_command_cursor_1.RunCommandCursor(this, command, options);
	    }
	}
	db.Db = Db;
	
	return db;
}

var mongo_client = {};

var deps = {};

var hasRequiredDeps;

function requireDeps () {
	if (hasRequiredDeps) return deps;
	hasRequiredDeps = 1;
	Object.defineProperty(deps, "__esModule", { value: true });
	deps.getKerberos = getKerberos;
	deps.getZstdLibrary = getZstdLibrary;
	deps.getAwsCredentialProvider = getAwsCredentialProvider;
	deps.getGcpMetadata = getGcpMetadata;
	deps.getSnappy = getSnappy;
	deps.getSocks = getSocks;
	deps.getMongoDBClientEncryption = getMongoDBClientEncryption;
	const error_1 = requireError();
	function makeErrorModule(error) {
	    const props = error ? { kModuleError: error } : {};
	    return new Proxy(props, {
	        get: (_, key) => {
	            if (key === 'kModuleError') {
	                return error;
	            }
	            throw error;
	        },
	        set: () => {
	            throw error;
	        }
	    });
	}
	function getKerberos() {
	    let kerberos;
	    try {
	        // Ensure you always wrap an optional require in the try block NODE-3199
	        // eslint-disable-next-line @typescript-eslint/no-require-imports
	        kerberos = require('kerberos');
	    }
	    catch (error) {
	        kerberos = makeErrorModule(new error_1.MongoMissingDependencyError('Optional module `kerberos` not found. Please install it to enable kerberos authentication', { cause: error, dependencyName: 'kerberos' }));
	    }
	    return kerberos;
	}
	function getZstdLibrary() {
	    let ZStandard;
	    try {
	        // eslint-disable-next-line @typescript-eslint/no-require-imports
	        ZStandard = require('@mongodb-js/zstd');
	    }
	    catch (error) {
	        ZStandard = makeErrorModule(new error_1.MongoMissingDependencyError('Optional module `@mongodb-js/zstd` not found. Please install it to enable zstd compression', { cause: error, dependencyName: 'zstd' }));
	    }
	    return ZStandard;
	}
	function getAwsCredentialProvider() {
	    try {
	        // Ensure you always wrap an optional require in the try block NODE-3199
	        // eslint-disable-next-line @typescript-eslint/no-require-imports
	        const credentialProvider = require('@aws-sdk/credential-providers');
	        return credentialProvider;
	    }
	    catch (error) {
	        return makeErrorModule(new error_1.MongoMissingDependencyError('Optional module `@aws-sdk/credential-providers` not found.' +
	            ' Please install it to enable getting aws credentials via the official sdk.', { cause: error, dependencyName: '@aws-sdk/credential-providers' }));
	    }
	}
	function getGcpMetadata() {
	    try {
	        // Ensure you always wrap an optional require in the try block NODE-3199
	        // eslint-disable-next-line @typescript-eslint/no-require-imports
	        const credentialProvider = require('gcp-metadata');
	        return credentialProvider;
	    }
	    catch (error) {
	        return makeErrorModule(new error_1.MongoMissingDependencyError('Optional module `gcp-metadata` not found.' +
	            ' Please install it to enable getting gcp credentials via the official sdk.', { cause: error, dependencyName: 'gcp-metadata' }));
	    }
	}
	function getSnappy() {
	    try {
	        // Ensure you always wrap an optional require in the try block NODE-3199
	        // eslint-disable-next-line @typescript-eslint/no-require-imports
	        const value = require('snappy');
	        return value;
	    }
	    catch (error) {
	        const kModuleError = new error_1.MongoMissingDependencyError('Optional module `snappy` not found. Please install it to enable snappy compression', { cause: error, dependencyName: 'snappy' });
	        return { kModuleError };
	    }
	}
	function getSocks() {
	    try {
	        // Ensure you always wrap an optional require in the try block NODE-3199
	        // eslint-disable-next-line @typescript-eslint/no-require-imports
	        const value = require('socks');
	        return value;
	    }
	    catch (error) {
	        const kModuleError = new error_1.MongoMissingDependencyError('Optional module `socks` not found. Please install it to connections over a SOCKS5 proxy', { cause: error, dependencyName: 'socks' });
	        return { kModuleError };
	    }
	}
	/** A utility function to get the instance of mongodb-client-encryption, if it exists. */
	function getMongoDBClientEncryption() {
	    let mongodbClientEncryption = null;
	    try {
	        // NOTE(NODE-3199): Ensure you always wrap an optional require literally in the try block
	        // Cannot be moved to helper utility function, bundlers search and replace the actual require call
	        // in a way that makes this line throw at bundle time, not runtime, catching here will make bundling succeed
	        // eslint-disable-next-line @typescript-eslint/no-require-imports
	        mongodbClientEncryption = require('mongodb-client-encryption');
	    }
	    catch (error) {
	        const kModuleError = new error_1.MongoMissingDependencyError('Optional module `mongodb-client-encryption` not found. Please install it to use auto encryption or ClientEncryption.', { cause: error, dependencyName: 'mongodb-client-encryption' });
	        return { kModuleError };
	    }
	    return mongodbClientEncryption;
	}
	
	return deps;
}

var encrypter = {};

var hasRequiredEncrypter;

function requireEncrypter () {
	if (hasRequiredEncrypter) return encrypter;
	hasRequiredEncrypter = 1;
	Object.defineProperty(encrypter, "__esModule", { value: true });
	encrypter.Encrypter = void 0;
	const auto_encrypter_1 = mongodb1.requireAuto_encrypter();
	const constants_1 = mongodb3.requireConstants();
	const deps_1 = requireDeps();
	const error_1 = requireError();
	const mongo_client_1 = requireMongo_client();
	/** @internal */
	class Encrypter {
	    constructor(client, uri, options) {
	        if (typeof options.autoEncryption !== 'object') {
	            throw new error_1.MongoInvalidArgumentError('Option "autoEncryption" must be specified');
	        }
	        // initialize to null, if we call getInternalClient, we may set this it is important to not overwrite those function calls.
	        this.internalClient = null;
	        this.bypassAutoEncryption = !!options.autoEncryption.bypassAutoEncryption;
	        this.needsConnecting = false;
	        if (options.maxPoolSize === 0 && options.autoEncryption.keyVaultClient == null) {
	            options.autoEncryption.keyVaultClient = client;
	        }
	        else if (options.autoEncryption.keyVaultClient == null) {
	            options.autoEncryption.keyVaultClient = this.getInternalClient(client, uri, options);
	        }
	        if (this.bypassAutoEncryption) {
	            options.autoEncryption.metadataClient = undefined;
	        }
	        else if (options.maxPoolSize === 0) {
	            options.autoEncryption.metadataClient = client;
	        }
	        else {
	            options.autoEncryption.metadataClient = this.getInternalClient(client, uri, options);
	        }
	        if (options.proxyHost) {
	            options.autoEncryption.proxyOptions = {
	                proxyHost: options.proxyHost,
	                proxyPort: options.proxyPort,
	                proxyUsername: options.proxyUsername,
	                proxyPassword: options.proxyPassword
	            };
	        }
	        this.autoEncrypter = new auto_encrypter_1.AutoEncrypter(client, options.autoEncryption);
	    }
	    getInternalClient(client, uri, options) {
	        let internalClient = this.internalClient;
	        if (internalClient == null) {
	            const clonedOptions = {};
	            for (const key of [
	                ...Object.getOwnPropertyNames(options),
	                ...Object.getOwnPropertySymbols(options)
	            ]) {
	                if (['autoEncryption', 'minPoolSize', 'servers', 'caseTranslate', 'dbName'].includes(key))
	                    continue;
	                Reflect.set(clonedOptions, key, Reflect.get(options, key));
	            }
	            clonedOptions.minPoolSize = 0;
	            internalClient = new mongo_client_1.MongoClient(uri, clonedOptions);
	            this.internalClient = internalClient;
	            for (const eventName of constants_1.MONGO_CLIENT_EVENTS) {
	                for (const listener of client.listeners(eventName)) {
	                    internalClient.on(eventName, listener);
	                }
	            }
	            client.on('newListener', (eventName, listener) => {
	                internalClient?.on(eventName, listener);
	            });
	            this.needsConnecting = true;
	        }
	        return internalClient;
	    }
	    async connectInternalClient() {
	        const internalClient = this.internalClient;
	        if (this.needsConnecting && internalClient != null) {
	            this.needsConnecting = false;
	            await internalClient.connect();
	        }
	    }
	    async close(client) {
	        let error;
	        try {
	            await this.autoEncrypter.close();
	        }
	        catch (autoEncrypterError) {
	            error = autoEncrypterError;
	        }
	        const internalClient = this.internalClient;
	        if (internalClient != null && client !== internalClient) {
	            return await internalClient.close();
	        }
	        if (error != null) {
	            throw error;
	        }
	    }
	    static checkForMongoCrypt() {
	        const mongodbClientEncryption = (0, deps_1.getMongoDBClientEncryption)();
	        if ('kModuleError' in mongodbClientEncryption) {
	            throw new error_1.MongoMissingDependencyError('Auto-encryption requested, but the module is not installed. ' +
	                'Please add `mongodb-client-encryption` as a dependency of your project', {
	                cause: mongodbClientEncryption['kModuleError'],
	                dependencyName: 'mongodb-client-encryption'
	            });
	        }
	    }
	}
	encrypter.Encrypter = Encrypter;
	
	return encrypter;
}

var mongo_client_auth_providers = {};

var hasRequiredMongo_client_auth_providers;

function requireMongo_client_auth_providers () {
	if (hasRequiredMongo_client_auth_providers) return mongo_client_auth_providers;
	hasRequiredMongo_client_auth_providers = 1;
	Object.defineProperty(mongo_client_auth_providers, "__esModule", { value: true });
	mongo_client_auth_providers.MongoClientAuthProviders = void 0;
	const gssapi_1 = mongodb1.requireGssapi();
	const mongodb_aws_1 = mongodb1.requireMongodb_aws();
	const mongodb_oidc_1 = mongodb1.requireMongodb_oidc();
	const automated_callback_workflow_1 = mongodb2.requireAutomated_callback_workflow();
	const human_callback_workflow_1 = mongodb2.requireHuman_callback_workflow();
	const token_cache_1 = mongodb2.requireToken_cache();
	const plain_1 = mongodb2.requirePlain();
	const providers_1 = mongodb2.requireProviders();
	const scram_1 = mongodb2.requireScram();
	const x509_1 = mongodb2.requireX509();
	const error_1 = requireError();
	/** @internal */
	const AUTH_PROVIDERS = new Map([
	    [
	        providers_1.AuthMechanism.MONGODB_AWS,
	        ({ AWS_CREDENTIAL_PROVIDER }) => new mongodb_aws_1.MongoDBAWS(AWS_CREDENTIAL_PROVIDER)
	    ],
	    [providers_1.AuthMechanism.MONGODB_GSSAPI, () => new gssapi_1.GSSAPI()],
	    [providers_1.AuthMechanism.MONGODB_OIDC, properties => new mongodb_oidc_1.MongoDBOIDC(getWorkflow(properties))],
	    [providers_1.AuthMechanism.MONGODB_PLAIN, () => new plain_1.Plain()],
	    [providers_1.AuthMechanism.MONGODB_SCRAM_SHA1, () => new scram_1.ScramSHA1()],
	    [providers_1.AuthMechanism.MONGODB_SCRAM_SHA256, () => new scram_1.ScramSHA256()],
	    [providers_1.AuthMechanism.MONGODB_X509, () => new x509_1.X509()]
	]);
	/**
	 * Create a set of providers per client
	 * to avoid sharing the provider's cache between different clients.
	 * @internal
	 */
	class MongoClientAuthProviders {
	    constructor() {
	        this.existingProviders = new Map();
	    }
	    /**
	     * Get or create an authentication provider based on the provided mechanism.
	     * We don't want to create all providers at once, as some providers may not be used.
	     * @param name - The name of the provider to get or create.
	     * @param credentials - The credentials.
	     * @returns The provider.
	     * @throws MongoInvalidArgumentError if the mechanism is not supported.
	     * @internal
	     */
	    getOrCreateProvider(name, authMechanismProperties) {
	        const authProvider = this.existingProviders.get(name);
	        if (authProvider) {
	            return authProvider;
	        }
	        const providerFunction = AUTH_PROVIDERS.get(name);
	        if (!providerFunction) {
	            throw new error_1.MongoInvalidArgumentError(`authMechanism ${name} not supported`);
	        }
	        const provider = providerFunction(authMechanismProperties);
	        this.existingProviders.set(name, provider);
	        return provider;
	    }
	}
	mongo_client_auth_providers.MongoClientAuthProviders = MongoClientAuthProviders;
	/**
	 * Gets either a device workflow or callback workflow.
	 */
	function getWorkflow(authMechanismProperties) {
	    if (authMechanismProperties.OIDC_HUMAN_CALLBACK) {
	        return new human_callback_workflow_1.HumanCallbackWorkflow(new token_cache_1.TokenCache(), authMechanismProperties.OIDC_HUMAN_CALLBACK);
	    }
	    else if (authMechanismProperties.OIDC_CALLBACK) {
	        return new automated_callback_workflow_1.AutomatedCallbackWorkflow(new token_cache_1.TokenCache(), authMechanismProperties.OIDC_CALLBACK);
	    }
	    else {
	        const environment = authMechanismProperties.ENVIRONMENT;
	        const workflow = mongodb_oidc_1.OIDC_WORKFLOWS.get(environment)?.();
	        if (!workflow) {
	            throw new error_1.MongoInvalidArgumentError(`Could not load workflow for environment ${authMechanismProperties.ENVIRONMENT}`);
	        }
	        return workflow;
	    }
	}
	
	return mongo_client_auth_providers;
}

var hasRequiredMongo_client;

function requireMongo_client () {
	if (hasRequiredMongo_client) return mongo_client;
	hasRequiredMongo_client = 1;
	Object.defineProperty(mongo_client, "__esModule", { value: true });
	mongo_client.MongoClient = mongo_client.ServerApiVersion = void 0;
	const fs_1 = require$$0;
	const _1 = requireLib();
	const bson_1 = mongodb1.requireBson();
	const change_stream_1 = mongodb1.requireChange_stream();
	const mongo_credentials_1 = mongodb1.requireMongo_credentials();
	const providers_1 = mongodb2.requireProviders();
	const client_metadata_1 = mongodb2.requireClient_metadata();
	const connection_string_1 = mongodb3.requireConnection_string();
	const constants_1 = mongodb3.requireConstants();
	const db_1 = requireDb();
	const error_1 = requireError();
	const mongo_client_auth_providers_1 = requireMongo_client_auth_providers();
	const mongo_logger_1 = mongodb5.requireMongo_logger();
	const mongo_types_1 = mongodb5.requireMongo_types();
	const executor_1 = mongodb5.requireExecutor();
	const end_sessions_1 = mongodb5.requireEnd_sessions();
	const execute_operation_1 = mongodb5.requireExecute_operation();
	const read_preference_1 = mongodb5.requireRead_preference();
	const server_selection_1 = mongodb6.requireServer_selection();
	const topology_1 = mongodb6.requireTopology();
	const sessions_1 = mongodb6.requireSessions();
	const utils_1 = mongodb7.requireUtils();
	/** @public */
	mongo_client.ServerApiVersion = Object.freeze({
	    v1: '1'
	});
	/**
	 * @public
	 *
	 * The **MongoClient** class is a class that allows for making Connections to MongoDB.
	 *
	 * **NOTE:** The programmatically provided options take precedence over the URI options.
	 *
	 * @remarks
	 *
	 * A MongoClient is the entry point to connecting to a MongoDB server.
	 *
	 * It handles a multitude of features on your application's behalf:
	 * - **Server Host Connection Configuration**: A MongoClient is responsible for reading TLS cert, ca, and crl files if provided.
	 * - **SRV Record Polling**: A "`mongodb+srv`" style connection string is used to have the MongoClient resolve DNS SRV records of all server hostnames which the driver periodically monitors for changes and adjusts its current view of hosts correspondingly.
	 * - **Server Monitoring**: The MongoClient automatically keeps monitoring the health of server nodes in your cluster to reach out to the correct and lowest latency one available.
	 * - **Connection Pooling**: To avoid paying the cost of rebuilding a connection to the server on every operation the MongoClient keeps idle connections preserved for reuse.
	 * - **Session Pooling**: The MongoClient creates logical sessions that enable retryable writes, causal consistency, and transactions. It handles pooling these sessions for reuse in subsequent operations.
	 * - **Cursor Operations**: A MongoClient's cursors use the health monitoring system to send the request for more documents to the same server the query began on.
	 * - **Mongocryptd process**: When using auto encryption, a MongoClient will launch a `mongocryptd` instance for handling encryption if the mongocrypt shared library isn't in use.
	 *
	 * There are many more features of a MongoClient that are not listed above.
	 *
	 * In order to enable these features, a number of asynchronous Node.js resources are established by the driver: Timers, FS Requests, Sockets, etc.
	 * For details on cleanup, please refer to the MongoClient `close()` documentation.
	 *
	 * @example
	 * ```ts
	 * import { MongoClient } from 'mongodb';
	 * // Enable command monitoring for debugging
	 * const client = new MongoClient('mongodb://localhost:27017?appName=mflix', { monitorCommands: true });
	 * ```
	 */
	class MongoClient extends mongo_types_1.TypedEventEmitter {
	    constructor(url, options) {
	        super();
	        this.driverInfoList = [];
	        this.on('error', utils_1.noop);
	        this.options = (0, connection_string_1.parseOptions)(url, this, options);
	        this.appendMetadata(this.options.driverInfo);
	        const shouldSetLogger = Object.values(this.options.mongoLoggerOptions.componentSeverities).some(value => value !== mongo_logger_1.SeverityLevel.OFF);
	        this.mongoLogger = shouldSetLogger
	            ? new mongo_logger_1.MongoLogger(this.options.mongoLoggerOptions)
	            : undefined;
	        // eslint-disable-next-line @typescript-eslint/no-this-alias
	        const client = this;
	        // The internal state
	        this.s = {
	            url,
	            bsonOptions: (0, bson_1.resolveBSONOptions)(this.options),
	            namespace: (0, utils_1.ns)('admin'),
	            hasBeenClosed: false,
	            sessionPool: new sessions_1.ServerSessionPool(this),
	            activeSessions: new Set(),
	            activeCursors: new Set(),
	            authProviders: new mongo_client_auth_providers_1.MongoClientAuthProviders(),
	            get options() {
	                return client.options;
	            },
	            get readConcern() {
	                return client.options.readConcern;
	            },
	            get writeConcern() {
	                return client.options.writeConcern;
	            },
	            get readPreference() {
	                return client.options.readPreference;
	            },
	            get isMongoClient() {
	                return true;
	            }
	        };
	        this.checkForNonGenuineHosts();
	    }
	    /**
	     * @experimental
	     * An alias for {@link MongoClient.close|MongoClient.close()}.
	     */
	    async [Symbol.asyncDispose]() {
	        await this.close();
	    }
	    /**
	     * Append metadata to the client metadata after instantiation.
	     * @param driverInfo - Information about the application or library.
	     */
	    appendMetadata(driverInfo) {
	        const isDuplicateDriverInfo = this.driverInfoList.some(info => (0, client_metadata_1.isDriverInfoEqual)(info, driverInfo));
	        if (isDuplicateDriverInfo)
	            return;
	        this.driverInfoList.push(driverInfo);
	        this.options.metadata = (0, client_metadata_1.makeClientMetadata)(this.driverInfoList, this.options)
	            .then(undefined, utils_1.squashError)
	            .then(result => result ?? {}); // ensure Promise<Document>
	    }
	    /** @internal */
	    checkForNonGenuineHosts() {
	        const documentDBHostnames = this.options.hosts.filter((hostAddress) => (0, utils_1.isHostMatch)(utils_1.DOCUMENT_DB_CHECK, hostAddress.host));
	        const srvHostIsDocumentDB = (0, utils_1.isHostMatch)(utils_1.DOCUMENT_DB_CHECK, this.options.srvHost);
	        const cosmosDBHostnames = this.options.hosts.filter((hostAddress) => (0, utils_1.isHostMatch)(utils_1.COSMOS_DB_CHECK, hostAddress.host));
	        const srvHostIsCosmosDB = (0, utils_1.isHostMatch)(utils_1.COSMOS_DB_CHECK, this.options.srvHost);
	        if (documentDBHostnames.length !== 0 || srvHostIsDocumentDB) {
	            this.mongoLogger?.info('client', utils_1.DOCUMENT_DB_MSG);
	        }
	        else if (cosmosDBHostnames.length !== 0 || srvHostIsCosmosDB) {
	            this.mongoLogger?.info('client', utils_1.COSMOS_DB_MSG);
	        }
	    }
	    get serverApi() {
	        return this.options.serverApi && Object.freeze({ ...this.options.serverApi });
	    }
	    /**
	     * Intended for APM use only
	     * @internal
	     */
	    get monitorCommands() {
	        return this.options.monitorCommands;
	    }
	    set monitorCommands(value) {
	        this.options.monitorCommands = value;
	    }
	    /** @internal */
	    get autoEncrypter() {
	        return this.options.autoEncrypter;
	    }
	    get readConcern() {
	        return this.s.readConcern;
	    }
	    get writeConcern() {
	        return this.s.writeConcern;
	    }
	    get readPreference() {
	        return this.s.readPreference;
	    }
	    get bsonOptions() {
	        return this.s.bsonOptions;
	    }
	    get timeoutMS() {
	        return this.s.options.timeoutMS;
	    }
	    /**
	     * Executes a client bulk write operation, available on server 8.0+.
	     * @param models - The client bulk write models.
	     * @param options - The client bulk write options.
	     * @returns A ClientBulkWriteResult for acknowledged writes and ok: 1 for unacknowledged writes.
	     */
	    async bulkWrite(models, options) {
	        if (this.autoEncrypter) {
	            throw new error_1.MongoInvalidArgumentError('MongoClient bulkWrite does not currently support automatic encryption.');
	        }
	        // We do not need schema type information past this point ("as any" is fine)
	        return await new executor_1.ClientBulkWriteExecutor(this, models, (0, utils_1.resolveOptions)(this, options)).execute();
	    }
	    /**
	     * An optional method to verify a handful of assumptions that are generally useful at application boot-time before using a MongoClient.
	     * For detailed information about the connect process see the MongoClient.connect static method documentation.
	     *
	     * @param url - The MongoDB connection string (supports `mongodb://` and `mongodb+srv://` schemes)
	     * @param options - Optional configuration options for the client
	     *
	     * @see https://www.mongodb.com/docs/manual/reference/connection-string/
	     */
	    async connect() {
	        if (this.connectionLock) {
	            return await this.connectionLock;
	        }
	        try {
	            this.connectionLock = this._connect();
	            await this.connectionLock;
	        }
	        finally {
	            // release
	            this.connectionLock = undefined;
	        }
	        return this;
	    }
	    /**
	     * Create a topology to open the connection, must be locked to avoid topology leaks in concurrency scenario.
	     * Locking is enforced by the connect method.
	     *
	     * @internal
	     */
	    async _connect() {
	        if (this.topology && this.topology.isConnected()) {
	            return this;
	        }
	        const options = this.options;
	        if (options.tls) {
	            if (typeof options.tlsCAFile === 'string') {
	                options.ca ??= await fs_1.promises.readFile(options.tlsCAFile);
	            }
	            if (typeof options.tlsCRLFile === 'string') {
	                options.crl ??= await fs_1.promises.readFile(options.tlsCRLFile);
	            }
	            if (typeof options.tlsCertificateKeyFile === 'string') {
	                if (!options.key || !options.cert) {
	                    const contents = await fs_1.promises.readFile(options.tlsCertificateKeyFile);
	                    options.key ??= contents;
	                    options.cert ??= contents;
	                }
	            }
	        }
	        if (typeof options.srvHost === 'string') {
	            const hosts = await (0, connection_string_1.resolveSRVRecord)(options);
	            for (const [index, host] of hosts.entries()) {
	                options.hosts[index] = host;
	            }
	        }
	        // It is important to perform validation of hosts AFTER SRV resolution, to check the real hostname,
	        // but BEFORE we even attempt connecting with a potentially not allowed hostname
	        if (options.credentials?.mechanism === providers_1.AuthMechanism.MONGODB_OIDC) {
	            const allowedHosts = options.credentials?.mechanismProperties?.ALLOWED_HOSTS || mongo_credentials_1.DEFAULT_ALLOWED_HOSTS;
	            const isServiceAuth = !!options.credentials?.mechanismProperties?.ENVIRONMENT;
	            if (!isServiceAuth) {
	                for (const host of options.hosts) {
	                    if (!(0, utils_1.hostMatchesWildcards)(host.toHostPort().host, allowedHosts)) {
	                        throw new error_1.MongoInvalidArgumentError(`Host '${host}' is not valid for OIDC authentication with ALLOWED_HOSTS of '${allowedHosts.join(',')}'`);
	                    }
	                }
	            }
	        }
	        this.topology = new topology_1.Topology(this, options.hosts, options);
	        // Events can be emitted before initialization is complete so we have to
	        // save the reference to the topology on the client ASAP if the event handlers need to access it
	        this.topology.once(topology_1.Topology.OPEN, () => this.emit('open', this));
	        for (const event of constants_1.MONGO_CLIENT_EVENTS) {
	            this.topology.on(event, (...args) => this.emit(event, ...args));
	        }
	        const topologyConnect = async () => {
	            try {
	                await this.topology?.connect(options);
	            }
	            catch (error) {
	                this.topology?.close();
	                throw error;
	            }
	        };
	        if (this.autoEncrypter) {
	            await this.autoEncrypter?.init();
	            await topologyConnect();
	            await options.encrypter.connectInternalClient();
	        }
	        else {
	            await topologyConnect();
	        }
	        return this;
	    }
	    /**
	     * Cleans up resources managed by the MongoClient.
	     *
	     * The close method clears and closes all resources whose lifetimes are managed by the MongoClient.
	     * Please refer to the `MongoClient` class documentation for a high level overview of the client's key features and responsibilities.
	     *
	     * **However,** the close method does not handle the cleanup of resources explicitly created by the user.
	     * Any user-created driver resource with its own `close()` method should be explicitly closed by the user before calling MongoClient.close().
	     * This method is written as a "best effort" attempt to leave behind the least amount of resources server-side when possible.
	     *
	     * The following list defines ideal preconditions and consequent pitfalls if they are not met.
	     * The MongoClient, ClientSession, Cursors and ChangeStreams all support [explicit resource management](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html).
	     * By using explicit resource management to manage the lifetime of driver resources instead of manually managing their lifetimes, the pitfalls outlined below can be avoided.
	     *
	     * The close method performs the following in the order listed:
	     * - Client-side:
	     *   - **Close in-use connections**: Any connections that are currently waiting on a response from the server will be closed.
	     *     This is performed _first_ to avoid reaching the next step (server-side clean up) and having no available connections to check out.
	     *     - _Ideal_: All operations have been awaited or cancelled, and the outcomes, regardless of success or failure, have been processed before closing the client servicing the operation.
	     *     - _Pitfall_: When `client.close()` is called and all connections are in use, after closing them, the client must create new connections for cleanup operations, which comes at the cost of new TLS/TCP handshakes and authentication steps.
	     * - Server-side:
	     *   - **Close active cursors**: All cursors that haven't been completed will have a `killCursor` operation sent to the server they were initialized on, freeing the server-side resource.
	     *     - _Ideal_: Cursors are explicitly closed or completed before `client.close()` is called.
	     *     - _Pitfall_: `killCursors` may have to build a new connection if the in-use closure ended all pooled connections.
	     *   - **End active sessions**: In-use sessions created with `client.startSession()` or `client.withSession()` or implicitly by the driver will have their `.endSession()` method called.
	     *     Contrary to the name of the method, `endSession()` returns the session to the client's pool of sessions rather than end them on the server.
	     *     - _Ideal_: Transaction outcomes are awaited and their corresponding explicit sessions are ended before `client.close()` is called.
	     *     - _Pitfall_: **This step aborts in-progress transactions**. It is advisable to observe the outcome of a transaction before closing your client.
	     *   - **End all pooled sessions**: The `endSessions` command with all session IDs the client has pooled is sent to the server to inform the cluster it can clean them up.
	     *     - _Ideal_: No user intervention is expected.
	     *     - _Pitfall_: None.
	     *
	     * The remaining shutdown is of the MongoClient resources that are intended to be entirely internal but is documented here as their existence relates to the JS event loop.
	     *
	     * - Client-side (again):
	     *   - **Stop all server monitoring**: Connections kept live for detecting cluster changes and roundtrip time measurements are shutdown.
	     *   - **Close all pooled connections**: Each server node in the cluster has a corresponding connection pool and all connections in the pool are closed. Any operations waiting to check out a connection will have an error thrown instead of a connection returned.
	     *   - **Clear out server selection queue**: Any operations that are in the process of waiting for a server to be selected will have an error thrown instead of a server returned.
	     *   - **Close encryption-related resources**: An internal MongoClient created for communicating with `mongocryptd` or other encryption purposes is closed. (Using this same method of course!)
	     *
	     * After the close method completes there should be no MongoClient related resources [ref-ed in Node.js' event loop](https://docs.libuv.org/en/v1.x/handle.html#reference-counting).
	     * This should allow Node.js to exit gracefully if MongoClient resources were the only active handles in the event loop.
	     *
	     * @param _force - currently an unused flag that has no effect. Defaults to `false`.
	     */
	    async close(_force = false) {
	        if (this.closeLock) {
	            return await this.closeLock;
	        }
	        try {
	            this.closeLock = this._close();
	            await this.closeLock;
	        }
	        finally {
	            // release
	            this.closeLock = undefined;
	        }
	    }
	    /* @internal */
	    async _close() {
	        // There's no way to set hasBeenClosed back to false
	        Object.defineProperty(this.s, 'hasBeenClosed', {
	            value: true,
	            enumerable: true,
	            configurable: false,
	            writable: false
	        });
	        this.topology?.closeCheckedOutConnections();
	        const activeCursorCloses = Array.from(this.s.activeCursors, cursor => cursor.close());
	        this.s.activeCursors.clear();
	        await Promise.all(activeCursorCloses);
	        const activeSessionEnds = Array.from(this.s.activeSessions, session => session.endSession());
	        this.s.activeSessions.clear();
	        await Promise.all(activeSessionEnds);
	        if (this.topology == null) {
	            return;
	        }
	        const supportsSessions = this.topology.description.type === _1.TopologyType.LoadBalanced ||
	            this.topology.description.logicalSessionTimeoutMinutes != null;
	        if (supportsSessions) {
	            await endSessions(this, this.topology);
	        }
	        // clear out references to old topology
	        const topology = this.topology;
	        this.topology = undefined;
	        topology.close();
	        const { encrypter } = this.options;
	        if (encrypter) {
	            await encrypter.close(this);
	        }
	        async function endSessions(client, { description: topologyDescription }) {
	            // If we would attempt to select a server and get nothing back we short circuit
	            // to avoid the server selection timeout.
	            const selector = (0, server_selection_1.readPreferenceServerSelector)(read_preference_1.ReadPreference.primaryPreferred);
	            const serverDescriptions = Array.from(topologyDescription.servers.values());
	            const servers = selector(topologyDescription, serverDescriptions, new server_selection_1.DeprioritizedServers());
	            if (servers.length !== 0) {
	                const endSessions = Array.from(client.s.sessionPool.sessions, ({ id }) => id);
	                if (endSessions.length !== 0) {
	                    try {
	                        await (0, execute_operation_1.executeOperation)(client, new end_sessions_1.EndSessionsOperation(endSessions));
	                    }
	                    catch (error) {
	                        (0, utils_1.squashError)(error);
	                    }
	                }
	            }
	        }
	    }
	    /**
	     * Create a new Db instance sharing the current socket connections.
	     *
	     * @param dbName - The name of the database we want to use. If not provided, use database name from connection string.
	     * @param options - Optional settings for Db construction
	     */
	    db(dbName, options) {
	        options = options ?? {};
	        // Default to db from connection string if not provided
	        if (!dbName) {
	            dbName = this.s.options.dbName;
	        }
	        // Copy the options and add out internal override of the not shared flag
	        const finalOptions = Object.assign({}, this.options, options);
	        // Return the db object
	        const db = new db_1.Db(this, dbName, finalOptions);
	        // Return the database
	        return db;
	    }
	    /**
	     * Creates a new MongoClient instance and immediately connects it to MongoDB.
	     * This convenience method combines `new MongoClient(url, options)` and `client.connect()` in a single step.
	     *
	     * Connect can be helpful to detect configuration issues early by validating:
	     * - **DNS Resolution**: Verifies that SRV records and hostnames in the connection string resolve DNS entries
	     * - **Network Connectivity**: Confirms that host addresses are reachable and ports are open
	     * - **TLS Configuration**: Validates SSL/TLS certificates, CA files, and encryption settings are correct
	     * - **Authentication**: Verifies that provided credentials are valid
	     * - **Server Compatibility**: Ensures the MongoDB server version is supported by this driver version
	     * - **Load Balancer Setup**: For load-balanced deployments, confirms the service is properly configured
	     *
	     * @returns A promise that resolves to the same MongoClient instance once connected
	     *
	     * @remarks
	     * **Connection is Optional:** Calling `connect` is optional since any operation method (`find`, `insertOne`, etc.)
	     * will automatically perform these same validation steps if the client is not already connected.
	     * However, explicitly calling `connect` can make sense for:
	     * - **Fail-fast Error Detection**: Non-transient connection issues (hostname unresolved, port refused connection) are discovered immediately rather than during your first operation
	     * - **Predictable Performance**: Eliminates first connection overhead from your first database operation
	     *
	     * @remarks
	     * **Connection Pooling Impact:** Calling `connect` will populate the connection pool with one connection
	     * to a server selected by the client's configured `readPreference` (defaults to primary).
	     *
	     * @remarks
	     * **Timeout Behavior:** When using `timeoutMS`, the connection establishment time does not count against
	     * the timeout for subsequent operations. This means `connect` runs without a `timeoutMS` limit, while
	     * your database operations will still respect the configured timeout. If you need predictable operation
	     * timing with `timeoutMS`, call `connect` explicitly before performing operations.
	     *
	     * @see https://www.mongodb.com/docs/manual/reference/connection-string/
	     */
	    static async connect(url, options) {
	        const client = new this(url, options);
	        return await client.connect();
	    }
	    /**
	     * Creates a new ClientSession. When using the returned session in an operation
	     * a corresponding ServerSession will be created.
	     *
	     * @remarks
	     * A ClientSession instance may only be passed to operations being performed on the same
	     * MongoClient it was started from.
	     */
	    startSession(options) {
	        const session = new sessions_1.ClientSession(this, this.s.sessionPool, { explicit: true, ...options }, this.options);
	        this.s.activeSessions.add(session);
	        session.once('ended', () => {
	            this.s.activeSessions.delete(session);
	        });
	        return session;
	    }
	    async withSession(optionsOrExecutor, executor) {
	        const options = {
	            // Always define an owner
	            owner: Symbol(),
	            // If it's an object inherit the options
	            ...(typeof optionsOrExecutor === 'object' ? optionsOrExecutor : {})
	        };
	        const withSessionCallback = typeof optionsOrExecutor === 'function' ? optionsOrExecutor : executor;
	        if (withSessionCallback == null) {
	            throw new error_1.MongoInvalidArgumentError('Missing required callback parameter');
	        }
	        const session = this.startSession(options);
	        try {
	            return await withSessionCallback(session);
	        }
	        finally {
	            try {
	                await session.endSession();
	            }
	            catch (error) {
	                (0, utils_1.squashError)(error);
	            }
	        }
	    }
	    /**
	     * Create a new Change Stream, watching for new changes (insertions, updates,
	     * replacements, deletions, and invalidations) in this cluster. Will ignore all
	     * changes to system collections, as well as the local, admin, and config databases.
	     *
	     * @remarks
	     * watch() accepts two generic arguments for distinct use cases:
	     * - The first is to provide the schema that may be defined for all the data within the current cluster
	     * - The second is to override the shape of the change stream document entirely, if it is not provided the type will default to ChangeStreamDocument of the first argument
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
	     * @param pipeline - An array of {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/|aggregation pipeline stages} through which to pass change stream documents. This allows for filtering (using $match) and manipulating the change stream documents.
	     * @param options - Optional settings for the command
	     * @typeParam TSchema - Type of the data being detected by the change stream
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
	}
	mongo_client.MongoClient = MongoClient;
	
	return mongo_client;
}

var gridfs = {};

var download = {};

var hasRequiredDownload;

function requireDownload () {
	if (hasRequiredDownload) return download;
	hasRequiredDownload = 1;
	Object.defineProperty(download, "__esModule", { value: true });
	download.GridFSBucketReadStream = void 0;
	const stream_1 = require$$0$1;
	const bson_1 = mongodb1.requireBson();
	const abstract_cursor_1 = mongodb3.requireAbstract_cursor();
	const error_1 = requireError();
	const timeout_1 = mongodb6.requireTimeout();
	/**
	 * A readable stream that enables you to read buffers from GridFS.
	 *
	 * Do not instantiate this class directly. Use `openDownloadStream()` instead.
	 * @public
	 */
	class GridFSBucketReadStream extends stream_1.Readable {
	    /**
	     * Fires when the stream loaded the file document corresponding to the provided id.
	     * @event
	     */
	    static { this.FILE = 'file'; }
	    /**
	     * @param chunks - Handle for chunks collection
	     * @param files - Handle for files collection
	     * @param readPreference - The read preference to use
	     * @param filter - The filter to use to find the file document
	     * @internal
	     */
	    constructor(chunks, files, readPreference, filter, options) {
	        super({ emitClose: true });
	        this.s = {
	            bytesToTrim: 0,
	            bytesToSkip: 0,
	            bytesRead: 0,
	            chunks,
	            expected: 0,
	            files,
	            filter,
	            init: false,
	            expectedEnd: 0,
	            options: {
	                start: 0,
	                end: 0,
	                ...options
	            },
	            readPreference,
	            timeoutContext: options?.timeoutMS != null
	                ? new timeout_1.CSOTTimeoutContext({ timeoutMS: options.timeoutMS, serverSelectionTimeoutMS: 0 })
	                : undefined
	        };
	    }
	    /**
	     * Reads from the cursor and pushes to the stream.
	     * Private Impl, do not call directly
	     * @internal
	     */
	    _read() {
	        if (this.destroyed)
	            return;
	        waitForFile(this, () => doRead(this));
	    }
	    /**
	     * Sets the 0-based offset in bytes to start streaming from. Throws
	     * an error if this stream has entered flowing mode
	     * (e.g. if you've already called `on('data')`)
	     *
	     * @param start - 0-based offset in bytes to start streaming from
	     */
	    start(start = 0) {
	        throwIfInitialized(this);
	        this.s.options.start = start;
	        return this;
	    }
	    /**
	     * Sets the 0-based offset in bytes to start streaming from. Throws
	     * an error if this stream has entered flowing mode
	     * (e.g. if you've already called `on('data')`)
	     *
	     * @param end - Offset in bytes to stop reading at
	     */
	    end(end = 0) {
	        throwIfInitialized(this);
	        this.s.options.end = end;
	        return this;
	    }
	    /**
	     * Marks this stream as aborted (will never push another `data` event)
	     * and kills the underlying cursor. Will emit the 'end' event, and then
	     * the 'close' event once the cursor is successfully killed.
	     */
	    async abort() {
	        this.push(null);
	        this.destroy();
	        const remainingTimeMS = this.s.timeoutContext?.getRemainingTimeMSOrThrow();
	        await this.s.cursor?.close({ timeoutMS: remainingTimeMS });
	    }
	}
	download.GridFSBucketReadStream = GridFSBucketReadStream;
	function throwIfInitialized(stream) {
	    if (stream.s.init) {
	        throw new error_1.MongoGridFSStreamError('Options cannot be changed after the stream is initialized');
	    }
	}
	function doRead(stream) {
	    if (stream.destroyed)
	        return;
	    if (!stream.s.cursor)
	        return;
	    if (!stream.s.file)
	        return;
	    const handleReadResult = (doc) => {
	        if (stream.destroyed)
	            return;
	        if (!doc) {
	            stream.push(null);
	            stream.s.cursor?.close().then(undefined, error => stream.destroy(error));
	            return;
	        }
	        if (!stream.s.file)
	            return;
	        const bytesRemaining = stream.s.file.length - stream.s.bytesRead;
	        const expectedN = stream.s.expected++;
	        const expectedLength = Math.min(stream.s.file.chunkSize, bytesRemaining);
	        if (doc.n > expectedN) {
	            return stream.destroy(new error_1.MongoGridFSChunkError(`ChunkIsMissing: Got unexpected n: ${doc.n}, expected: ${expectedN}`));
	        }
	        if (doc.n < expectedN) {
	            return stream.destroy(new error_1.MongoGridFSChunkError(`ExtraChunk: Got unexpected n: ${doc.n}, expected: ${expectedN}`));
	        }
	        let buf = bson_1.ByteUtils.isUint8Array(doc.data) ? doc.data : doc.data.buffer;
	        if (buf.byteLength !== expectedLength) {
	            if (bytesRemaining <= 0) {
	                return stream.destroy(new error_1.MongoGridFSChunkError(`ExtraChunk: Got unexpected n: ${doc.n}, expected file length ${stream.s.file.length} bytes but already read ${stream.s.bytesRead} bytes`));
	            }
	            return stream.destroy(new error_1.MongoGridFSChunkError(`ChunkIsWrongSize: Got unexpected length: ${buf.byteLength}, expected: ${expectedLength}`));
	        }
	        stream.s.bytesRead += buf.byteLength;
	        if (buf.byteLength === 0) {
	            return stream.push(null);
	        }
	        let sliceStart = null;
	        let sliceEnd = null;
	        if (stream.s.bytesToSkip != null) {
	            sliceStart = stream.s.bytesToSkip;
	            stream.s.bytesToSkip = 0;
	        }
	        const atEndOfStream = expectedN === stream.s.expectedEnd - 1;
	        const bytesLeftToRead = stream.s.options.end - stream.s.bytesToSkip;
	        if (atEndOfStream && stream.s.bytesToTrim != null) {
	            sliceEnd = stream.s.file.chunkSize - stream.s.bytesToTrim;
	        }
	        else if (stream.s.options.end && bytesLeftToRead < doc.data.byteLength) {
	            sliceEnd = bytesLeftToRead;
	        }
	        if (sliceStart != null || sliceEnd != null) {
	            buf = buf.slice(sliceStart || 0, sliceEnd || buf.byteLength);
	        }
	        stream.push(buf);
	        return;
	    };
	    stream.s.cursor.next().then(handleReadResult, error => {
	        if (stream.destroyed)
	            return;
	        stream.destroy(error);
	    });
	}
	function init(stream) {
	    const findOneOptions = {};
	    if (stream.s.readPreference) {
	        findOneOptions.readPreference = stream.s.readPreference;
	    }
	    if (stream.s.options && stream.s.options.sort) {
	        findOneOptions.sort = stream.s.options.sort;
	    }
	    if (stream.s.options && stream.s.options.skip) {
	        findOneOptions.skip = stream.s.options.skip;
	    }
	    const handleReadResult = (doc) => {
	        if (stream.destroyed)
	            return;
	        if (!doc) {
	            const identifier = stream.s.filter._id
	                ? stream.s.filter._id.toString()
	                : stream.s.filter.filename;
	            const errmsg = `FileNotFound: file ${identifier} was not found`;
	            // TODO(NODE-3483)
	            const err = new error_1.MongoRuntimeError(errmsg);
	            err.code = 'ENOENT'; // TODO: NODE-3338 set property as part of constructor
	            return stream.destroy(err);
	        }
	        // If document is empty, kill the stream immediately and don't
	        // execute any reads
	        if (doc.length <= 0) {
	            stream.push(null);
	            return;
	        }
	        if (stream.destroyed) {
	            // If user destroys the stream before we have a cursor, wait
	            // until the query is done to say we're 'closed' because we can't
	            // cancel a query.
	            stream.destroy();
	            return;
	        }
	        try {
	            stream.s.bytesToSkip = handleStartOption(stream, doc, stream.s.options);
	        }
	        catch (error) {
	            return stream.destroy(error);
	        }
	        const filter = { files_id: doc._id };
	        // Currently (MongoDB 3.4.4) skip function does not support the index,
	        // it needs to retrieve all the documents first and then skip them. (CS-25811)
	        // As work around we use $gte on the "n" field.
	        if (stream.s.options && stream.s.options.start != null) {
	            const skip = Math.floor(stream.s.options.start / doc.chunkSize);
	            if (skip > 0) {
	                filter['n'] = { $gte: skip };
	            }
	        }
	        let remainingTimeMS;
	        try {
	            remainingTimeMS = stream.s.timeoutContext?.getRemainingTimeMSOrThrow(`Download timed out after ${stream.s.timeoutContext?.timeoutMS}ms`);
	        }
	        catch (error) {
	            return stream.destroy(error);
	        }
	        stream.s.cursor = stream.s.chunks
	            .find(filter, {
	            timeoutMode: stream.s.options.timeoutMS != null ? abstract_cursor_1.CursorTimeoutMode.LIFETIME : undefined,
	            timeoutMS: remainingTimeMS
	        })
	            .sort({ n: 1 });
	        if (stream.s.readPreference) {
	            stream.s.cursor.withReadPreference(stream.s.readPreference);
	        }
	        stream.s.expectedEnd = Math.ceil(doc.length / doc.chunkSize);
	        stream.s.file = doc;
	        try {
	            stream.s.bytesToTrim = handleEndOption(stream, doc, stream.s.cursor, stream.s.options);
	        }
	        catch (error) {
	            return stream.destroy(error);
	        }
	        stream.emit(GridFSBucketReadStream.FILE, doc);
	        return;
	    };
	    let remainingTimeMS;
	    try {
	        remainingTimeMS = stream.s.timeoutContext?.getRemainingTimeMSOrThrow(`Download timed out after ${stream.s.timeoutContext?.timeoutMS}ms`);
	    }
	    catch (error) {
	        if (!stream.destroyed)
	            stream.destroy(error);
	        return;
	    }
	    findOneOptions.timeoutMS = remainingTimeMS;
	    stream.s.files.findOne(stream.s.filter, findOneOptions).then(handleReadResult, error => {
	        if (stream.destroyed)
	            return;
	        stream.destroy(error);
	    });
	}
	function waitForFile(stream, callback) {
	    if (stream.s.file) {
	        return callback();
	    }
	    if (!stream.s.init) {
	        init(stream);
	        stream.s.init = true;
	    }
	    stream.once('file', () => {
	        callback();
	    });
	}
	function handleStartOption(stream, doc, options) {
	    if (options && options.start != null) {
	        if (options.start > doc.length) {
	            throw new error_1.MongoInvalidArgumentError(`Stream start (${options.start}) must not be more than the length of the file (${doc.length})`);
	        }
	        if (options.start < 0) {
	            throw new error_1.MongoInvalidArgumentError(`Stream start (${options.start}) must not be negative`);
	        }
	        if (options.end != null && options.end < options.start) {
	            throw new error_1.MongoInvalidArgumentError(`Stream start (${options.start}) must not be greater than stream end (${options.end})`);
	        }
	        stream.s.bytesRead = Math.floor(options.start / doc.chunkSize) * doc.chunkSize;
	        stream.s.expected = Math.floor(options.start / doc.chunkSize);
	        return options.start - stream.s.bytesRead;
	    }
	    throw new error_1.MongoInvalidArgumentError('Start option must be defined');
	}
	function handleEndOption(stream, doc, cursor, options) {
	    if (options && options.end != null) {
	        if (options.end > doc.length) {
	            throw new error_1.MongoInvalidArgumentError(`Stream end (${options.end}) must not be more than the length of the file (${doc.length})`);
	        }
	        if (options.start == null || options.start < 0) {
	            throw new error_1.MongoInvalidArgumentError(`Stream end (${options.end}) must not be negative`);
	        }
	        const start = options.start != null ? Math.floor(options.start / doc.chunkSize) : 0;
	        cursor.limit(Math.ceil(options.end / doc.chunkSize) - start);
	        stream.s.expectedEnd = Math.ceil(options.end / doc.chunkSize);
	        return Math.ceil(options.end / doc.chunkSize) * doc.chunkSize - options.end;
	    }
	    throw new error_1.MongoInvalidArgumentError('End option must be defined');
	}
	
	return download;
}

var upload = {};

var hasRequiredUpload;

function requireUpload () {
	if (hasRequiredUpload) return upload;
	hasRequiredUpload = 1;
	Object.defineProperty(upload, "__esModule", { value: true });
	upload.GridFSBucketWriteStream = void 0;
	const stream_1 = require$$0$1;
	const bson_1 = mongodb1.requireBson();
	const abstract_cursor_1 = mongodb3.requireAbstract_cursor();
	const error_1 = requireError();
	const timeout_1 = mongodb6.requireTimeout();
	const utils_1 = mongodb7.requireUtils();
	const write_concern_1 = mongodb7.requireWrite_concern();
	/**
	 * A writable stream that enables you to write buffers to GridFS.
	 *
	 * Do not instantiate this class directly. Use `openUploadStream()` instead.
	 * @public
	 */
	class GridFSBucketWriteStream extends stream_1.Writable {
	    /**
	     * @param bucket - Handle for this stream's corresponding bucket
	     * @param filename - The value of the 'filename' key in the files doc
	     * @param options - Optional settings.
	     * @internal
	     */
	    constructor(bucket, filename, options) {
	        super();
	        /**
	         * The document containing information about the inserted file.
	         * This property is defined _after_ the finish event has been emitted.
	         * It will remain `null` if an error occurs.
	         *
	         * @example
	         * ```ts
	         * fs.createReadStream('file.txt')
	         *   .pipe(bucket.openUploadStream('file.txt'))
	         *   .on('finish', function () {
	         *     console.log(this.gridFSFile)
	         *   })
	         * ```
	         */
	        this.gridFSFile = null;
	        options = options ?? {};
	        this.bucket = bucket;
	        this.chunks = bucket.s._chunksCollection;
	        this.filename = filename;
	        this.files = bucket.s._filesCollection;
	        this.options = options;
	        this.writeConcern = write_concern_1.WriteConcern.fromOptions(options) || bucket.s.options.writeConcern;
	        // Signals the write is all done
	        this.done = false;
	        this.id = options.id ? options.id : new bson_1.ObjectId();
	        // properly inherit the default chunksize from parent
	        this.chunkSizeBytes = options.chunkSizeBytes || this.bucket.s.options.chunkSizeBytes;
	        this.bufToStore = bson_1.ByteUtils.allocate(this.chunkSizeBytes);
	        this.length = 0;
	        this.n = 0;
	        this.pos = 0;
	        this.state = {
	            streamEnd: false,
	            outstandingRequests: 0,
	            errored: false,
	            aborted: false
	        };
	        if (options.timeoutMS != null)
	            this.timeoutContext = new timeout_1.CSOTTimeoutContext({
	                timeoutMS: options.timeoutMS,
	                serverSelectionTimeoutMS: (0, utils_1.resolveTimeoutOptions)(this.bucket.s.db.client, {})
	                    .serverSelectionTimeoutMS
	            });
	    }
	    /**
	     * @internal
	     *
	     * The stream is considered constructed when the indexes are done being created
	     */
	    _construct(callback) {
	        if (!this.bucket.s.calledOpenUploadStream) {
	            this.bucket.s.calledOpenUploadStream = true;
	            checkIndexes(this).then(() => {
	                this.bucket.s.checkedIndexes = true;
	                this.bucket.emit('index');
	                callback();
	            }, error => {
	                if (error instanceof error_1.MongoOperationTimeoutError) {
	                    return handleError(this, error, callback);
	                }
	                (0, utils_1.squashError)(error);
	                callback();
	            });
	        }
	        else {
	            return queueMicrotask(callback);
	        }
	    }
	    /**
	     * @internal
	     * Write a buffer to the stream.
	     *
	     * @param chunk - Buffer to write
	     * @param encoding - Optional encoding for the buffer
	     * @param callback - Function to call when the chunk was added to the buffer, or if the entire chunk was persisted to MongoDB if this chunk caused a flush.
	     */
	    _write(chunk, encoding, callback) {
	        doWrite(this, chunk, encoding, callback);
	    }
	    /** @internal */
	    _final(callback) {
	        if (this.state.streamEnd) {
	            return queueMicrotask(callback);
	        }
	        this.state.streamEnd = true;
	        writeRemnant(this, callback);
	    }
	    /**
	     * Places this write stream into an aborted state (all future writes fail)
	     * and deletes all chunks that have already been written.
	     */
	    async abort() {
	        if (this.state.streamEnd) {
	            // TODO(NODE-3485): Replace with MongoGridFSStreamClosed
	            throw new error_1.MongoAPIError('Cannot abort a stream that has already completed');
	        }
	        if (this.state.aborted) {
	            // TODO(NODE-3485): Replace with MongoGridFSStreamClosed
	            throw new error_1.MongoAPIError('Cannot call abort() on a stream twice');
	        }
	        this.state.aborted = true;
	        const remainingTimeMS = this.timeoutContext?.getRemainingTimeMSOrThrow(`Upload timed out after ${this.timeoutContext?.timeoutMS}ms`);
	        await this.chunks.deleteMany({ files_id: this.id }, { timeoutMS: remainingTimeMS });
	    }
	}
	upload.GridFSBucketWriteStream = GridFSBucketWriteStream;
	function handleError(stream, error, callback) {
	    if (stream.state.errored) {
	        queueMicrotask(callback);
	        return;
	    }
	    stream.state.errored = true;
	    queueMicrotask(() => callback(error));
	}
	function createChunkDoc(filesId, n, data) {
	    return {
	        _id: new bson_1.ObjectId(),
	        files_id: filesId,
	        n,
	        data
	    };
	}
	async function checkChunksIndex(stream) {
	    const index = { files_id: 1, n: 1 };
	    let remainingTimeMS;
	    remainingTimeMS = stream.timeoutContext?.getRemainingTimeMSOrThrow(`Upload timed out after ${stream.timeoutContext?.timeoutMS}ms`);
	    let indexes;
	    try {
	        indexes = await stream.chunks
	            .listIndexes({
	            timeoutMode: remainingTimeMS != null ? abstract_cursor_1.CursorTimeoutMode.LIFETIME : undefined,
	            timeoutMS: remainingTimeMS
	        })
	            .toArray();
	    }
	    catch (error) {
	        if (error instanceof error_1.MongoError && error.code === error_1.MONGODB_ERROR_CODES.NamespaceNotFound) {
	            indexes = [];
	        }
	        else {
	            throw error;
	        }
	    }
	    const hasChunksIndex = !!indexes.find(index => {
	        const keys = Object.keys(index.key);
	        if (keys.length === 2 && index.key.files_id === 1 && index.key.n === 1) {
	            return true;
	        }
	        return false;
	    });
	    if (!hasChunksIndex) {
	        remainingTimeMS = stream.timeoutContext?.getRemainingTimeMSOrThrow(`Upload timed out after ${stream.timeoutContext?.timeoutMS}ms`);
	        await stream.chunks.createIndex(index, {
	            ...stream.writeConcern,
	            background: true,
	            unique: true,
	            timeoutMS: remainingTimeMS
	        });
	    }
	}
	function checkDone(stream, callback) {
	    if (stream.done) {
	        return queueMicrotask(callback);
	    }
	    if (stream.state.streamEnd && stream.state.outstandingRequests === 0 && !stream.state.errored) {
	        // Set done so we do not trigger duplicate createFilesDoc
	        stream.done = true;
	        // Create a new files doc
	        const gridFSFile = createFilesDoc(stream.id, stream.length, stream.chunkSizeBytes, stream.filename, stream.options.metadata);
	        if (isAborted(stream, callback)) {
	            return;
	        }
	        const remainingTimeMS = stream.timeoutContext?.remainingTimeMS;
	        if (remainingTimeMS != null && remainingTimeMS <= 0) {
	            return handleError(stream, new error_1.MongoOperationTimeoutError(`Upload timed out after ${stream.timeoutContext?.timeoutMS}ms`), callback);
	        }
	        stream.files
	            .insertOne(gridFSFile, { writeConcern: stream.writeConcern, timeoutMS: remainingTimeMS })
	            .then(() => {
	            stream.gridFSFile = gridFSFile;
	            callback();
	        }, error => {
	            return handleError(stream, error, callback);
	        });
	        return;
	    }
	    queueMicrotask(callback);
	}
	async function checkIndexes(stream) {
	    let remainingTimeMS = stream.timeoutContext?.getRemainingTimeMSOrThrow(`Upload timed out after ${stream.timeoutContext?.timeoutMS}ms`);
	    const doc = await stream.files.findOne({}, {
	        projection: { _id: 1 },
	        timeoutMS: remainingTimeMS
	    });
	    if (doc != null) {
	        // If at least one document exists assume the collection has the required index
	        return;
	    }
	    const index = { filename: 1, uploadDate: 1 };
	    let indexes;
	    remainingTimeMS = stream.timeoutContext?.getRemainingTimeMSOrThrow(`Upload timed out after ${stream.timeoutContext?.timeoutMS}ms`);
	    const listIndexesOptions = {
	        timeoutMode: remainingTimeMS != null ? abstract_cursor_1.CursorTimeoutMode.LIFETIME : undefined,
	        timeoutMS: remainingTimeMS
	    };
	    try {
	        indexes = await stream.files.listIndexes(listIndexesOptions).toArray();
	    }
	    catch (error) {
	        if (error instanceof error_1.MongoError && error.code === error_1.MONGODB_ERROR_CODES.NamespaceNotFound) {
	            indexes = [];
	        }
	        else {
	            throw error;
	        }
	    }
	    const hasFileIndex = !!indexes.find(index => {
	        const keys = Object.keys(index.key);
	        if (keys.length === 2 && index.key.filename === 1 && index.key.uploadDate === 1) {
	            return true;
	        }
	        return false;
	    });
	    if (!hasFileIndex) {
	        remainingTimeMS = stream.timeoutContext?.getRemainingTimeMSOrThrow(`Upload timed out after ${stream.timeoutContext?.timeoutMS}ms`);
	        await stream.files.createIndex(index, { background: false, timeoutMS: remainingTimeMS });
	    }
	    await checkChunksIndex(stream);
	}
	function createFilesDoc(_id, length, chunkSize, filename, metadata) {
	    const ret = {
	        _id,
	        length,
	        chunkSize,
	        uploadDate: new Date(),
	        filename
	    };
	    if (metadata) {
	        ret.metadata = metadata;
	    }
	    return ret;
	}
	function doWrite(stream, chunk, encoding, callback) {
	    if (isAborted(stream, callback)) {
	        return;
	    }
	    const inputBuf = typeof chunk === 'string' ? bson_1.ByteUtils.fromUTF8(chunk) : bson_1.ByteUtils.toLocalBufferType(chunk);
	    stream.length += inputBuf.length;
	    // Input is small enough to fit in our buffer
	    if (stream.pos + inputBuf.length < stream.chunkSizeBytes) {
	        bson_1.ByteUtils.copy(inputBuf, stream.bufToStore, stream.pos);
	        stream.pos += inputBuf.length;
	        queueMicrotask(callback);
	        return;
	    }
	    // Otherwise, buffer is too big for current chunk, so we need to flush
	    // to MongoDB.
	    let inputBufRemaining = inputBuf.length;
	    let spaceRemaining = stream.chunkSizeBytes - stream.pos;
	    let numToCopy = Math.min(spaceRemaining, inputBuf.length);
	    let outstandingRequests = 0;
	    while (inputBufRemaining > 0) {
	        const inputBufPos = inputBuf.length - inputBufRemaining;
	        bson_1.ByteUtils.copy(inputBuf, stream.bufToStore, stream.pos, inputBufPos, inputBufPos + numToCopy);
	        stream.pos += numToCopy;
	        spaceRemaining -= numToCopy;
	        let doc;
	        if (spaceRemaining === 0) {
	            doc = createChunkDoc(stream.id, stream.n, new Uint8Array(stream.bufToStore));
	            const remainingTimeMS = stream.timeoutContext?.remainingTimeMS;
	            if (remainingTimeMS != null && remainingTimeMS <= 0) {
	                return handleError(stream, new error_1.MongoOperationTimeoutError(`Upload timed out after ${stream.timeoutContext?.timeoutMS}ms`), callback);
	            }
	            ++stream.state.outstandingRequests;
	            ++outstandingRequests;
	            if (isAborted(stream, callback)) {
	                return;
	            }
	            stream.chunks
	                .insertOne(doc, { writeConcern: stream.writeConcern, timeoutMS: remainingTimeMS })
	                .then(() => {
	                --stream.state.outstandingRequests;
	                --outstandingRequests;
	                if (!outstandingRequests) {
	                    checkDone(stream, callback);
	                }
	            }, error => {
	                return handleError(stream, error, callback);
	            });
	            spaceRemaining = stream.chunkSizeBytes;
	            stream.pos = 0;
	            ++stream.n;
	        }
	        inputBufRemaining -= numToCopy;
	        numToCopy = Math.min(spaceRemaining, inputBufRemaining);
	    }
	}
	function writeRemnant(stream, callback) {
	    // Buffer is empty, so don't bother to insert
	    if (stream.pos === 0) {
	        return checkDone(stream, callback);
	    }
	    // Create a new buffer to make sure the buffer isn't bigger than it needs
	    // to be.
	    const remnant = bson_1.ByteUtils.allocate(stream.pos);
	    bson_1.ByteUtils.copy(stream.bufToStore, remnant, 0, 0, stream.pos);
	    const doc = createChunkDoc(stream.id, stream.n, remnant);
	    // If the stream was aborted, do not write remnant
	    if (isAborted(stream, callback)) {
	        return;
	    }
	    const remainingTimeMS = stream.timeoutContext?.remainingTimeMS;
	    if (remainingTimeMS != null && remainingTimeMS <= 0) {
	        return handleError(stream, new error_1.MongoOperationTimeoutError(`Upload timed out after ${stream.timeoutContext?.timeoutMS}ms`), callback);
	    }
	    ++stream.state.outstandingRequests;
	    stream.chunks
	        .insertOne(doc, { writeConcern: stream.writeConcern, timeoutMS: remainingTimeMS })
	        .then(() => {
	        --stream.state.outstandingRequests;
	        checkDone(stream, callback);
	    }, error => {
	        return handleError(stream, error, callback);
	    });
	}
	function isAborted(stream, callback) {
	    if (stream.state.aborted) {
	        queueMicrotask(() => callback(new error_1.MongoAPIError('Stream has been aborted')));
	        return true;
	    }
	    return false;
	}
	
	return upload;
}

var hasRequiredGridfs;

function requireGridfs () {
	if (hasRequiredGridfs) return gridfs;
	hasRequiredGridfs = 1;
	Object.defineProperty(gridfs, "__esModule", { value: true });
	gridfs.GridFSBucket = void 0;
	const error_1 = requireError();
	const mongo_types_1 = mongodb5.requireMongo_types();
	const timeout_1 = mongodb6.requireTimeout();
	const utils_1 = mongodb7.requireUtils();
	const write_concern_1 = mongodb7.requireWrite_concern();
	const download_1 = requireDownload();
	const upload_1 = requireUpload();
	const DEFAULT_GRIDFS_BUCKET_OPTIONS = {
	    bucketName: 'fs',
	    chunkSizeBytes: 255 * 1024
	};
	/**
	 * Constructor for a streaming GridFS interface
	 * @public
	 */
	class GridFSBucket extends mongo_types_1.TypedEventEmitter {
	    /**
	     * When the first call to openUploadStream is made, the upload stream will
	     * check to see if it needs to create the proper indexes on the chunks and
	     * files collections. This event is fired either when 1) it determines that
	     * no index creation is necessary, 2) when it successfully creates the
	     * necessary indexes.
	     * @event
	     */
	    static { this.INDEX = 'index'; }
	    constructor(db, options) {
	        super();
	        this.on('error', utils_1.noop);
	        this.setMaxListeners(0);
	        const privateOptions = (0, utils_1.resolveOptions)(db, {
	            ...DEFAULT_GRIDFS_BUCKET_OPTIONS,
	            ...options,
	            writeConcern: write_concern_1.WriteConcern.fromOptions(options)
	        });
	        this.s = {
	            db,
	            options: privateOptions,
	            _chunksCollection: db.collection(privateOptions.bucketName + '.chunks'),
	            _filesCollection: db.collection(privateOptions.bucketName + '.files'),
	            checkedIndexes: false,
	            calledOpenUploadStream: false
	        };
	    }
	    /**
	     * Returns a writable stream (GridFSBucketWriteStream) for writing
	     * buffers to GridFS. The stream's 'id' property contains the resulting
	     * file's id.
	     *
	     * @param filename - The value of the 'filename' key in the files doc
	     * @param options - Optional settings.
	     */
	    openUploadStream(filename, options) {
	        return new upload_1.GridFSBucketWriteStream(this, filename, {
	            timeoutMS: this.s.options.timeoutMS,
	            ...options
	        });
	    }
	    /**
	     * Returns a writable stream (GridFSBucketWriteStream) for writing
	     * buffers to GridFS for a custom file id. The stream's 'id' property contains the resulting
	     * file's id.
	     */
	    openUploadStreamWithId(id, filename, options) {
	        return new upload_1.GridFSBucketWriteStream(this, filename, {
	            timeoutMS: this.s.options.timeoutMS,
	            ...options,
	            id
	        });
	    }
	    /** Returns a readable stream (GridFSBucketReadStream) for streaming file data from GridFS. */
	    openDownloadStream(id, options) {
	        return new download_1.GridFSBucketReadStream(this.s._chunksCollection, this.s._filesCollection, this.s.options.readPreference, { _id: id }, { timeoutMS: this.s.options.timeoutMS, ...options });
	    }
	    /**
	     * Deletes a file with the given id
	     *
	     * @param id - The id of the file doc
	     */
	    async delete(id, options) {
	        const { timeoutMS } = (0, utils_1.resolveOptions)(this.s.db, options);
	        let timeoutContext = undefined;
	        if (timeoutMS) {
	            timeoutContext = new timeout_1.CSOTTimeoutContext({
	                timeoutMS,
	                serverSelectionTimeoutMS: this.s.db.client.s.options.serverSelectionTimeoutMS
	            });
	        }
	        const { deletedCount } = await this.s._filesCollection.deleteOne({ _id: id }, { timeoutMS: timeoutContext?.remainingTimeMS });
	        const remainingTimeMS = timeoutContext?.remainingTimeMS;
	        if (remainingTimeMS != null && remainingTimeMS <= 0)
	            throw new error_1.MongoOperationTimeoutError(`Timed out after ${timeoutMS}ms`);
	        // Delete orphaned chunks before returning FileNotFound
	        await this.s._chunksCollection.deleteMany({ files_id: id }, { timeoutMS: remainingTimeMS });
	        if (deletedCount === 0) {
	            // TODO(NODE-3483): Replace with more appropriate error
	            // Consider creating new error MongoGridFSFileNotFoundError
	            throw new error_1.MongoRuntimeError(`File not found for id ${id}`);
	        }
	    }
	    /** Convenience wrapper around find on the files collection */
	    find(filter = {}, options = {}) {
	        return this.s._filesCollection.find(filter, options);
	    }
	    /**
	     * Returns a readable stream (GridFSBucketReadStream) for streaming the
	     * file with the given name from GridFS. If there are multiple files with
	     * the same name, this will stream the most recent file with the given name
	     * (as determined by the `uploadDate` field). You can set the `revision`
	     * option to change this behavior.
	     */
	    openDownloadStreamByName(filename, options) {
	        let sort = { uploadDate: -1 };
	        let skip = undefined;
	        if (options && options.revision != null) {
	            if (options.revision >= 0) {
	                sort = { uploadDate: 1 };
	                skip = options.revision;
	            }
	            else {
	                skip = -options.revision - 1;
	            }
	        }
	        return new download_1.GridFSBucketReadStream(this.s._chunksCollection, this.s._filesCollection, this.s.options.readPreference, { filename }, { timeoutMS: this.s.options.timeoutMS, ...options, sort, skip });
	    }
	    /**
	     * Renames the file with the given _id to the given string
	     *
	     * @param id - the id of the file to rename
	     * @param filename - new name for the file
	     */
	    async rename(id, filename, options) {
	        const filter = { _id: id };
	        const update = { $set: { filename } };
	        const { matchedCount } = await this.s._filesCollection.updateOne(filter, update, options);
	        if (matchedCount === 0) {
	            throw new error_1.MongoRuntimeError(`File with id ${id} not found`);
	        }
	    }
	    /** Removes this bucket's files collection, followed by its chunks collection. */
	    async drop(options) {
	        const { timeoutMS } = (0, utils_1.resolveOptions)(this.s.db, options);
	        let timeoutContext = undefined;
	        if (timeoutMS) {
	            timeoutContext = new timeout_1.CSOTTimeoutContext({
	                timeoutMS,
	                serverSelectionTimeoutMS: this.s.db.client.s.options.serverSelectionTimeoutMS
	            });
	        }
	        if (timeoutContext) {
	            await this.s._filesCollection.drop({ timeoutMS: timeoutContext.remainingTimeMS });
	            const remainingTimeMS = timeoutContext.getRemainingTimeMSOrThrow(`Timed out after ${timeoutMS}ms`);
	            await this.s._chunksCollection.drop({ timeoutMS: remainingTimeMS });
	        }
	        else {
	            await this.s._filesCollection.drop();
	            await this.s._chunksCollection.drop();
	        }
	    }
	}
	gridfs.GridFSBucket = GridFSBucket;
	
	return gridfs;
}

var hasRequiredLib;

function requireLib () {
	if (hasRequiredLib) return lib;
	hasRequiredLib = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.MongoRuntimeError = exports.MongoParseError = exports.MongoOperationTimeoutError = exports.MongoOIDCError = exports.MongoNotConnectedError = exports.MongoNetworkTimeoutError = exports.MongoNetworkError = exports.MongoMissingDependencyError = exports.MongoMissingCredentialsError = exports.MongoKerberosError = exports.MongoInvalidArgumentError = exports.MongoGridFSStreamError = exports.MongoGridFSChunkError = exports.MongoGCPError = exports.MongoExpiredSessionError = exports.MongoError = exports.MongoDriverError = exports.MongoDecompressionError = exports.MongoCursorInUseError = exports.MongoCursorExhaustedError = exports.MongoCompatibilityError = exports.MongoClientClosedError = exports.MongoClientBulkWriteExecutionError = exports.MongoClientBulkWriteError = exports.MongoClientBulkWriteCursorError = exports.MongoChangeStreamError = exports.MongoBatchReExecutionError = exports.MongoAzureError = exports.MongoAWSError = exports.MongoAPIError = exports.ExplainableCursor = exports.ChangeStreamCursor = exports.ClientEncryption = exports.MongoBulkWriteError = exports.UUID = exports.Timestamp = exports.ObjectId = exports.MinKey = exports.MaxKey = exports.Long = exports.Int32 = exports.Double = exports.Decimal128 = exports.DBRef = exports.Code = exports.BSONType = exports.BSONSymbol = exports.BSONRegExp = exports.Binary = exports.BSON = void 0;
		exports.CommandStartedEvent = exports.CommandFailedEvent = exports.WriteConcern = exports.ReadPreference = exports.ReadConcern = exports.TopologyType = exports.ServerType = exports.ReadPreferenceMode = exports.ReadConcernLevel = exports.ProfilingLevel = exports.ReturnDocument = exports.SeverityLevel = exports.MongoLoggableComponent = exports.ServerApiVersion = exports.ExplainVerbosity = exports.MongoErrorLabel = exports.CursorTimeoutMode = exports.CURSOR_FLAGS = exports.Compressor = exports.AuthMechanism = exports.GSSAPICanonicalizationValue = exports.AutoEncryptionLoggerLevel = exports.BatchType = exports.UnorderedBulkOperation = exports.OrderedBulkOperation = exports.MongoClient = exports.ListIndexesCursor = exports.ListCollectionsCursor = exports.GridFSBucketWriteStream = exports.GridFSBucketReadStream = exports.GridFSBucket = exports.FindCursor = exports.Db = exports.Collection = exports.ClientSession = exports.ChangeStream = exports.CancellationToken = exports.AggregationCursor = exports.Admin = exports.AbstractCursor = exports.MongoWriteConcernError = exports.MongoUnexpectedServerResponseError = exports.MongoTransactionError = exports.MongoTopologyClosedError = exports.MongoTailableCursorError = exports.MongoSystemError = exports.MongoStalePrimaryError = exports.MongoServerSelectionError = exports.MongoServerError = exports.MongoServerClosedError = void 0;
		exports.MongoClientAuthProviders = exports.MongoCryptKMSRequestNetworkTimeoutError = exports.MongoCryptInvalidArgumentError = exports.MongoCryptError = exports.MongoCryptCreateEncryptedCollectionError = exports.MongoCryptCreateDataKeyError = exports.MongoCryptAzureKMSRequestError = exports.SrvPollingEvent = exports.WaitingForSuitableServerEvent = exports.ServerSelectionSucceededEvent = exports.ServerSelectionStartedEvent = exports.ServerSelectionFailedEvent = exports.ServerSelectionEvent = exports.TopologyOpeningEvent = exports.TopologyDescriptionChangedEvent = exports.TopologyClosedEvent = exports.ServerOpeningEvent = exports.ServerHeartbeatSucceededEvent = exports.ServerHeartbeatStartedEvent = exports.ServerHeartbeatFailedEvent = exports.ServerDescriptionChangedEvent = exports.ServerClosedEvent = exports.ConnectionReadyEvent = exports.ConnectionPoolReadyEvent = exports.ConnectionPoolMonitoringEvent = exports.ConnectionPoolCreatedEvent = exports.ConnectionPoolClosedEvent = exports.ConnectionPoolClearedEvent = exports.ConnectionCreatedEvent = exports.ConnectionClosedEvent = exports.ConnectionCheckOutStartedEvent = exports.ConnectionCheckOutFailedEvent = exports.ConnectionCheckedOutEvent = exports.ConnectionCheckedInEvent = exports.CommandSucceededEvent = void 0;
		const admin_1 = mongodb1.requireAdmin();
		Object.defineProperty(exports, "Admin", { enumerable: true, get: function () { return admin_1.Admin; } });
		const ordered_1 = mongodb1.requireOrdered();
		Object.defineProperty(exports, "OrderedBulkOperation", { enumerable: true, get: function () { return ordered_1.OrderedBulkOperation; } });
		const unordered_1 = mongodb1.requireUnordered();
		Object.defineProperty(exports, "UnorderedBulkOperation", { enumerable: true, get: function () { return unordered_1.UnorderedBulkOperation; } });
		const change_stream_1 = mongodb1.requireChange_stream();
		Object.defineProperty(exports, "ChangeStream", { enumerable: true, get: function () { return change_stream_1.ChangeStream; } });
		const collection_1 = mongodb3.requireCollection();
		Object.defineProperty(exports, "Collection", { enumerable: true, get: function () { return collection_1.Collection; } });
		const abstract_cursor_1 = mongodb3.requireAbstract_cursor();
		Object.defineProperty(exports, "AbstractCursor", { enumerable: true, get: function () { return abstract_cursor_1.AbstractCursor; } });
		const aggregation_cursor_1 = mongodb3.requireAggregation_cursor();
		Object.defineProperty(exports, "AggregationCursor", { enumerable: true, get: function () { return aggregation_cursor_1.AggregationCursor; } });
		const find_cursor_1 = mongodb3.requireFind_cursor();
		Object.defineProperty(exports, "FindCursor", { enumerable: true, get: function () { return find_cursor_1.FindCursor; } });
		const list_collections_cursor_1 = mongodb3.requireList_collections_cursor();
		Object.defineProperty(exports, "ListCollectionsCursor", { enumerable: true, get: function () { return list_collections_cursor_1.ListCollectionsCursor; } });
		const list_indexes_cursor_1 = mongodb3.requireList_indexes_cursor();
		Object.defineProperty(exports, "ListIndexesCursor", { enumerable: true, get: function () { return list_indexes_cursor_1.ListIndexesCursor; } });
		const db_1 = requireDb();
		Object.defineProperty(exports, "Db", { enumerable: true, get: function () { return db_1.Db; } });
		const gridfs_1 = requireGridfs();
		Object.defineProperty(exports, "GridFSBucket", { enumerable: true, get: function () { return gridfs_1.GridFSBucket; } });
		const download_1 = requireDownload();
		Object.defineProperty(exports, "GridFSBucketReadStream", { enumerable: true, get: function () { return download_1.GridFSBucketReadStream; } });
		const upload_1 = requireUpload();
		Object.defineProperty(exports, "GridFSBucketWriteStream", { enumerable: true, get: function () { return upload_1.GridFSBucketWriteStream; } });
		const mongo_client_1 = requireMongo_client();
		Object.defineProperty(exports, "MongoClient", { enumerable: true, get: function () { return mongo_client_1.MongoClient; } });
		const mongo_types_1 = mongodb5.requireMongo_types();
		Object.defineProperty(exports, "CancellationToken", { enumerable: true, get: function () { return mongo_types_1.CancellationToken; } });
		const sessions_1 = mongodb6.requireSessions();
		Object.defineProperty(exports, "ClientSession", { enumerable: true, get: function () { return sessions_1.ClientSession; } });
		/** @public */
		var bson_1 = mongodb1.requireBson();
		Object.defineProperty(exports, "BSON", { enumerable: true, get: function () { return bson_1.BSON; } });
		var bson_2 = mongodb1.requireBson();
		Object.defineProperty(exports, "Binary", { enumerable: true, get: function () { return bson_2.Binary; } });
		Object.defineProperty(exports, "BSONRegExp", { enumerable: true, get: function () { return bson_2.BSONRegExp; } });
		Object.defineProperty(exports, "BSONSymbol", { enumerable: true, get: function () { return bson_2.BSONSymbol; } });
		Object.defineProperty(exports, "BSONType", { enumerable: true, get: function () { return bson_2.BSONType; } });
		Object.defineProperty(exports, "Code", { enumerable: true, get: function () { return bson_2.Code; } });
		Object.defineProperty(exports, "DBRef", { enumerable: true, get: function () { return bson_2.DBRef; } });
		Object.defineProperty(exports, "Decimal128", { enumerable: true, get: function () { return bson_2.Decimal128; } });
		Object.defineProperty(exports, "Double", { enumerable: true, get: function () { return bson_2.Double; } });
		Object.defineProperty(exports, "Int32", { enumerable: true, get: function () { return bson_2.Int32; } });
		Object.defineProperty(exports, "Long", { enumerable: true, get: function () { return bson_2.Long; } });
		Object.defineProperty(exports, "MaxKey", { enumerable: true, get: function () { return bson_2.MaxKey; } });
		Object.defineProperty(exports, "MinKey", { enumerable: true, get: function () { return bson_2.MinKey; } });
		Object.defineProperty(exports, "ObjectId", { enumerable: true, get: function () { return bson_2.ObjectId; } });
		Object.defineProperty(exports, "Timestamp", { enumerable: true, get: function () { return bson_2.Timestamp; } });
		Object.defineProperty(exports, "UUID", { enumerable: true, get: function () { return bson_2.UUID; } });
		var common_1 = mongodb1.requireCommon();
		Object.defineProperty(exports, "MongoBulkWriteError", { enumerable: true, get: function () { return common_1.MongoBulkWriteError; } });
		var client_encryption_1 = mongodb1.requireClient_encryption();
		Object.defineProperty(exports, "ClientEncryption", { enumerable: true, get: function () { return client_encryption_1.ClientEncryption; } });
		var change_stream_cursor_1 = mongodb3.requireChange_stream_cursor();
		Object.defineProperty(exports, "ChangeStreamCursor", { enumerable: true, get: function () { return change_stream_cursor_1.ChangeStreamCursor; } });
		var explainable_cursor_1 = mongodb3.requireExplainable_cursor();
		Object.defineProperty(exports, "ExplainableCursor", { enumerable: true, get: function () { return explainable_cursor_1.ExplainableCursor; } });
		var error_1 = requireError();
		Object.defineProperty(exports, "MongoAPIError", { enumerable: true, get: function () { return error_1.MongoAPIError; } });
		Object.defineProperty(exports, "MongoAWSError", { enumerable: true, get: function () { return error_1.MongoAWSError; } });
		Object.defineProperty(exports, "MongoAzureError", { enumerable: true, get: function () { return error_1.MongoAzureError; } });
		Object.defineProperty(exports, "MongoBatchReExecutionError", { enumerable: true, get: function () { return error_1.MongoBatchReExecutionError; } });
		Object.defineProperty(exports, "MongoChangeStreamError", { enumerable: true, get: function () { return error_1.MongoChangeStreamError; } });
		Object.defineProperty(exports, "MongoClientBulkWriteCursorError", { enumerable: true, get: function () { return error_1.MongoClientBulkWriteCursorError; } });
		Object.defineProperty(exports, "MongoClientBulkWriteError", { enumerable: true, get: function () { return error_1.MongoClientBulkWriteError; } });
		Object.defineProperty(exports, "MongoClientBulkWriteExecutionError", { enumerable: true, get: function () { return error_1.MongoClientBulkWriteExecutionError; } });
		Object.defineProperty(exports, "MongoClientClosedError", { enumerable: true, get: function () { return error_1.MongoClientClosedError; } });
		Object.defineProperty(exports, "MongoCompatibilityError", { enumerable: true, get: function () { return error_1.MongoCompatibilityError; } });
		Object.defineProperty(exports, "MongoCursorExhaustedError", { enumerable: true, get: function () { return error_1.MongoCursorExhaustedError; } });
		Object.defineProperty(exports, "MongoCursorInUseError", { enumerable: true, get: function () { return error_1.MongoCursorInUseError; } });
		Object.defineProperty(exports, "MongoDecompressionError", { enumerable: true, get: function () { return error_1.MongoDecompressionError; } });
		Object.defineProperty(exports, "MongoDriverError", { enumerable: true, get: function () { return error_1.MongoDriverError; } });
		Object.defineProperty(exports, "MongoError", { enumerable: true, get: function () { return error_1.MongoError; } });
		Object.defineProperty(exports, "MongoExpiredSessionError", { enumerable: true, get: function () { return error_1.MongoExpiredSessionError; } });
		Object.defineProperty(exports, "MongoGCPError", { enumerable: true, get: function () { return error_1.MongoGCPError; } });
		Object.defineProperty(exports, "MongoGridFSChunkError", { enumerable: true, get: function () { return error_1.MongoGridFSChunkError; } });
		Object.defineProperty(exports, "MongoGridFSStreamError", { enumerable: true, get: function () { return error_1.MongoGridFSStreamError; } });
		Object.defineProperty(exports, "MongoInvalidArgumentError", { enumerable: true, get: function () { return error_1.MongoInvalidArgumentError; } });
		Object.defineProperty(exports, "MongoKerberosError", { enumerable: true, get: function () { return error_1.MongoKerberosError; } });
		Object.defineProperty(exports, "MongoMissingCredentialsError", { enumerable: true, get: function () { return error_1.MongoMissingCredentialsError; } });
		Object.defineProperty(exports, "MongoMissingDependencyError", { enumerable: true, get: function () { return error_1.MongoMissingDependencyError; } });
		Object.defineProperty(exports, "MongoNetworkError", { enumerable: true, get: function () { return error_1.MongoNetworkError; } });
		Object.defineProperty(exports, "MongoNetworkTimeoutError", { enumerable: true, get: function () { return error_1.MongoNetworkTimeoutError; } });
		Object.defineProperty(exports, "MongoNotConnectedError", { enumerable: true, get: function () { return error_1.MongoNotConnectedError; } });
		Object.defineProperty(exports, "MongoOIDCError", { enumerable: true, get: function () { return error_1.MongoOIDCError; } });
		Object.defineProperty(exports, "MongoOperationTimeoutError", { enumerable: true, get: function () { return error_1.MongoOperationTimeoutError; } });
		Object.defineProperty(exports, "MongoParseError", { enumerable: true, get: function () { return error_1.MongoParseError; } });
		Object.defineProperty(exports, "MongoRuntimeError", { enumerable: true, get: function () { return error_1.MongoRuntimeError; } });
		Object.defineProperty(exports, "MongoServerClosedError", { enumerable: true, get: function () { return error_1.MongoServerClosedError; } });
		Object.defineProperty(exports, "MongoServerError", { enumerable: true, get: function () { return error_1.MongoServerError; } });
		Object.defineProperty(exports, "MongoServerSelectionError", { enumerable: true, get: function () { return error_1.MongoServerSelectionError; } });
		Object.defineProperty(exports, "MongoStalePrimaryError", { enumerable: true, get: function () { return error_1.MongoStalePrimaryError; } });
		Object.defineProperty(exports, "MongoSystemError", { enumerable: true, get: function () { return error_1.MongoSystemError; } });
		Object.defineProperty(exports, "MongoTailableCursorError", { enumerable: true, get: function () { return error_1.MongoTailableCursorError; } });
		Object.defineProperty(exports, "MongoTopologyClosedError", { enumerable: true, get: function () { return error_1.MongoTopologyClosedError; } });
		Object.defineProperty(exports, "MongoTransactionError", { enumerable: true, get: function () { return error_1.MongoTransactionError; } });
		Object.defineProperty(exports, "MongoUnexpectedServerResponseError", { enumerable: true, get: function () { return error_1.MongoUnexpectedServerResponseError; } });
		Object.defineProperty(exports, "MongoWriteConcernError", { enumerable: true, get: function () { return error_1.MongoWriteConcernError; } });
		// enums
		var common_2 = mongodb1.requireCommon();
		Object.defineProperty(exports, "BatchType", { enumerable: true, get: function () { return common_2.BatchType; } });
		var auto_encrypter_1 = mongodb1.requireAuto_encrypter();
		Object.defineProperty(exports, "AutoEncryptionLoggerLevel", { enumerable: true, get: function () { return auto_encrypter_1.AutoEncryptionLoggerLevel; } });
		var gssapi_1 = mongodb1.requireGssapi();
		Object.defineProperty(exports, "GSSAPICanonicalizationValue", { enumerable: true, get: function () { return gssapi_1.GSSAPICanonicalizationValue; } });
		var providers_1 = mongodb2.requireProviders();
		Object.defineProperty(exports, "AuthMechanism", { enumerable: true, get: function () { return providers_1.AuthMechanism; } });
		var compression_1 = mongodb2.requireCompression();
		Object.defineProperty(exports, "Compressor", { enumerable: true, get: function () { return compression_1.Compressor; } });
		var abstract_cursor_2 = mongodb3.requireAbstract_cursor();
		Object.defineProperty(exports, "CURSOR_FLAGS", { enumerable: true, get: function () { return abstract_cursor_2.CURSOR_FLAGS; } });
		Object.defineProperty(exports, "CursorTimeoutMode", { enumerable: true, get: function () { return abstract_cursor_2.CursorTimeoutMode; } });
		var error_2 = requireError();
		Object.defineProperty(exports, "MongoErrorLabel", { enumerable: true, get: function () { return error_2.MongoErrorLabel; } });
		var explain_1 = requireExplain();
		Object.defineProperty(exports, "ExplainVerbosity", { enumerable: true, get: function () { return explain_1.ExplainVerbosity; } });
		var mongo_client_2 = requireMongo_client();
		Object.defineProperty(exports, "ServerApiVersion", { enumerable: true, get: function () { return mongo_client_2.ServerApiVersion; } });
		var mongo_logger_1 = mongodb5.requireMongo_logger();
		Object.defineProperty(exports, "MongoLoggableComponent", { enumerable: true, get: function () { return mongo_logger_1.MongoLoggableComponent; } });
		Object.defineProperty(exports, "SeverityLevel", { enumerable: true, get: function () { return mongo_logger_1.SeverityLevel; } });
		var find_and_modify_1 = mongodb5.requireFind_and_modify();
		Object.defineProperty(exports, "ReturnDocument", { enumerable: true, get: function () { return find_and_modify_1.ReturnDocument; } });
		var set_profiling_level_1 = mongodb5.requireSet_profiling_level();
		Object.defineProperty(exports, "ProfilingLevel", { enumerable: true, get: function () { return set_profiling_level_1.ProfilingLevel; } });
		var read_concern_1 = mongodb5.requireRead_concern();
		Object.defineProperty(exports, "ReadConcernLevel", { enumerable: true, get: function () { return read_concern_1.ReadConcernLevel; } });
		var read_preference_1 = mongodb5.requireRead_preference();
		Object.defineProperty(exports, "ReadPreferenceMode", { enumerable: true, get: function () { return read_preference_1.ReadPreferenceMode; } });
		var common_3 = mongodb5.requireCommon();
		Object.defineProperty(exports, "ServerType", { enumerable: true, get: function () { return common_3.ServerType; } });
		Object.defineProperty(exports, "TopologyType", { enumerable: true, get: function () { return common_3.TopologyType; } });
		var read_concern_2 = mongodb5.requireRead_concern();
		Object.defineProperty(exports, "ReadConcern", { enumerable: true, get: function () { return read_concern_2.ReadConcern; } });
		var read_preference_2 = mongodb5.requireRead_preference();
		Object.defineProperty(exports, "ReadPreference", { enumerable: true, get: function () { return read_preference_2.ReadPreference; } });
		var write_concern_1 = mongodb7.requireWrite_concern();
		Object.defineProperty(exports, "WriteConcern", { enumerable: true, get: function () { return write_concern_1.WriteConcern; } });
		// events
		var command_monitoring_events_1 = mongodb2.requireCommand_monitoring_events();
		Object.defineProperty(exports, "CommandFailedEvent", { enumerable: true, get: function () { return command_monitoring_events_1.CommandFailedEvent; } });
		Object.defineProperty(exports, "CommandStartedEvent", { enumerable: true, get: function () { return command_monitoring_events_1.CommandStartedEvent; } });
		Object.defineProperty(exports, "CommandSucceededEvent", { enumerable: true, get: function () { return command_monitoring_events_1.CommandSucceededEvent; } });
		var connection_pool_events_1 = mongodb2.requireConnection_pool_events();
		Object.defineProperty(exports, "ConnectionCheckedInEvent", { enumerable: true, get: function () { return connection_pool_events_1.ConnectionCheckedInEvent; } });
		Object.defineProperty(exports, "ConnectionCheckedOutEvent", { enumerable: true, get: function () { return connection_pool_events_1.ConnectionCheckedOutEvent; } });
		Object.defineProperty(exports, "ConnectionCheckOutFailedEvent", { enumerable: true, get: function () { return connection_pool_events_1.ConnectionCheckOutFailedEvent; } });
		Object.defineProperty(exports, "ConnectionCheckOutStartedEvent", { enumerable: true, get: function () { return connection_pool_events_1.ConnectionCheckOutStartedEvent; } });
		Object.defineProperty(exports, "ConnectionClosedEvent", { enumerable: true, get: function () { return connection_pool_events_1.ConnectionClosedEvent; } });
		Object.defineProperty(exports, "ConnectionCreatedEvent", { enumerable: true, get: function () { return connection_pool_events_1.ConnectionCreatedEvent; } });
		Object.defineProperty(exports, "ConnectionPoolClearedEvent", { enumerable: true, get: function () { return connection_pool_events_1.ConnectionPoolClearedEvent; } });
		Object.defineProperty(exports, "ConnectionPoolClosedEvent", { enumerable: true, get: function () { return connection_pool_events_1.ConnectionPoolClosedEvent; } });
		Object.defineProperty(exports, "ConnectionPoolCreatedEvent", { enumerable: true, get: function () { return connection_pool_events_1.ConnectionPoolCreatedEvent; } });
		Object.defineProperty(exports, "ConnectionPoolMonitoringEvent", { enumerable: true, get: function () { return connection_pool_events_1.ConnectionPoolMonitoringEvent; } });
		Object.defineProperty(exports, "ConnectionPoolReadyEvent", { enumerable: true, get: function () { return connection_pool_events_1.ConnectionPoolReadyEvent; } });
		Object.defineProperty(exports, "ConnectionReadyEvent", { enumerable: true, get: function () { return connection_pool_events_1.ConnectionReadyEvent; } });
		var events_1 = mongodb5.requireEvents();
		Object.defineProperty(exports, "ServerClosedEvent", { enumerable: true, get: function () { return events_1.ServerClosedEvent; } });
		Object.defineProperty(exports, "ServerDescriptionChangedEvent", { enumerable: true, get: function () { return events_1.ServerDescriptionChangedEvent; } });
		Object.defineProperty(exports, "ServerHeartbeatFailedEvent", { enumerable: true, get: function () { return events_1.ServerHeartbeatFailedEvent; } });
		Object.defineProperty(exports, "ServerHeartbeatStartedEvent", { enumerable: true, get: function () { return events_1.ServerHeartbeatStartedEvent; } });
		Object.defineProperty(exports, "ServerHeartbeatSucceededEvent", { enumerable: true, get: function () { return events_1.ServerHeartbeatSucceededEvent; } });
		Object.defineProperty(exports, "ServerOpeningEvent", { enumerable: true, get: function () { return events_1.ServerOpeningEvent; } });
		Object.defineProperty(exports, "TopologyClosedEvent", { enumerable: true, get: function () { return events_1.TopologyClosedEvent; } });
		Object.defineProperty(exports, "TopologyDescriptionChangedEvent", { enumerable: true, get: function () { return events_1.TopologyDescriptionChangedEvent; } });
		Object.defineProperty(exports, "TopologyOpeningEvent", { enumerable: true, get: function () { return events_1.TopologyOpeningEvent; } });
		var server_selection_events_1 = mongodb6.requireServer_selection_events();
		Object.defineProperty(exports, "ServerSelectionEvent", { enumerable: true, get: function () { return server_selection_events_1.ServerSelectionEvent; } });
		Object.defineProperty(exports, "ServerSelectionFailedEvent", { enumerable: true, get: function () { return server_selection_events_1.ServerSelectionFailedEvent; } });
		Object.defineProperty(exports, "ServerSelectionStartedEvent", { enumerable: true, get: function () { return server_selection_events_1.ServerSelectionStartedEvent; } });
		Object.defineProperty(exports, "ServerSelectionSucceededEvent", { enumerable: true, get: function () { return server_selection_events_1.ServerSelectionSucceededEvent; } });
		Object.defineProperty(exports, "WaitingForSuitableServerEvent", { enumerable: true, get: function () { return server_selection_events_1.WaitingForSuitableServerEvent; } });
		var srv_polling_1 = mongodb6.requireSrv_polling();
		Object.defineProperty(exports, "SrvPollingEvent", { enumerable: true, get: function () { return srv_polling_1.SrvPollingEvent; } });
		var errors_1 = mongodb1.requireErrors();
		Object.defineProperty(exports, "MongoCryptAzureKMSRequestError", { enumerable: true, get: function () { return errors_1.MongoCryptAzureKMSRequestError; } });
		Object.defineProperty(exports, "MongoCryptCreateDataKeyError", { enumerable: true, get: function () { return errors_1.MongoCryptCreateDataKeyError; } });
		Object.defineProperty(exports, "MongoCryptCreateEncryptedCollectionError", { enumerable: true, get: function () { return errors_1.MongoCryptCreateEncryptedCollectionError; } });
		Object.defineProperty(exports, "MongoCryptError", { enumerable: true, get: function () { return errors_1.MongoCryptError; } });
		Object.defineProperty(exports, "MongoCryptInvalidArgumentError", { enumerable: true, get: function () { return errors_1.MongoCryptInvalidArgumentError; } });
		Object.defineProperty(exports, "MongoCryptKMSRequestNetworkTimeoutError", { enumerable: true, get: function () { return errors_1.MongoCryptKMSRequestNetworkTimeoutError; } });
		var mongo_client_auth_providers_1 = requireMongo_client_auth_providers();
		Object.defineProperty(exports, "MongoClientAuthProviders", { enumerable: true, get: function () { return mongo_client_auth_providers_1.MongoClientAuthProviders; } });
		
	} (lib));
	return lib;
}

exports.requireDb = requireDb;
exports.requireDeps = requireDeps;
exports.requireEncrypter = requireEncrypter;
exports.requireError = requireError;
exports.requireExplain = requireExplain;
exports.requireLib = requireLib;
exports.requireMongo_client = requireMongo_client;
