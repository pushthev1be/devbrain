'use strict';

const require$$0 = require('timers/promises');
const mongodb3 = require('./mongodb-3.js');
const mongodb7 = require('./mongodb-7.js');
const mongodb4 = require('./mongodb-4.js');
const mongodb6 = require('./mongodb-6.js');
const require$$0$2 = require('events');
const require$$1 = require('util');
const require$$0$1 = require('process');
const mongodb1 = require('./mongodb-1.js');
const mongodb2 = require('./mongodb-2.js');

var execute_operation = {};

var read_preference = {};

var hasRequiredRead_preference;

function requireRead_preference () {
	if (hasRequiredRead_preference) return read_preference;
	hasRequiredRead_preference = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.ReadPreference = exports.ReadPreferenceMode = void 0;
		const error_1 = mongodb4.requireError();
		/** @public */
		exports.ReadPreferenceMode = Object.freeze({
		    primary: 'primary',
		    primaryPreferred: 'primaryPreferred',
		    secondary: 'secondary',
		    secondaryPreferred: 'secondaryPreferred',
		    nearest: 'nearest'
		});
		/**
		 * The **ReadPreference** class is a class that represents a MongoDB ReadPreference and is
		 * used to construct connections.
		 * @public
		 *
		 * @see https://www.mongodb.com/docs/manual/core/read-preference/
		 */
		class ReadPreference {
		    static { this.PRIMARY = exports.ReadPreferenceMode.primary; }
		    static { this.PRIMARY_PREFERRED = exports.ReadPreferenceMode.primaryPreferred; }
		    static { this.SECONDARY = exports.ReadPreferenceMode.secondary; }
		    static { this.SECONDARY_PREFERRED = exports.ReadPreferenceMode.secondaryPreferred; }
		    static { this.NEAREST = exports.ReadPreferenceMode.nearest; }
		    static { this.primary = new ReadPreference(exports.ReadPreferenceMode.primary); }
		    static { this.primaryPreferred = new ReadPreference(exports.ReadPreferenceMode.primaryPreferred); }
		    static { this.secondary = new ReadPreference(exports.ReadPreferenceMode.secondary); }
		    static { this.secondaryPreferred = new ReadPreference(exports.ReadPreferenceMode.secondaryPreferred); }
		    static { this.nearest = new ReadPreference(exports.ReadPreferenceMode.nearest); }
		    /**
		     * @param mode - A string describing the read preference mode (primary|primaryPreferred|secondary|secondaryPreferred|nearest)
		     * @param tags - A tag set used to target reads to members with the specified tag(s). tagSet is not available if using read preference mode primary.
		     * @param options - Additional read preference options
		     */
		    constructor(mode, tags, options) {
		        if (!ReadPreference.isValid(mode)) {
		            throw new error_1.MongoInvalidArgumentError(`Invalid read preference mode ${JSON.stringify(mode)}`);
		        }
		        if (options == null && typeof tags === 'object' && !Array.isArray(tags)) {
		            options = tags;
		            tags = undefined;
		        }
		        else if (tags && !Array.isArray(tags)) {
		            throw new error_1.MongoInvalidArgumentError('ReadPreference tags must be an array');
		        }
		        this.mode = mode;
		        this.tags = tags;
		        this.hedge = options?.hedge;
		        this.maxStalenessSeconds = undefined;
		        options = options ?? {};
		        if (options.maxStalenessSeconds != null) {
		            if (options.maxStalenessSeconds <= 0) {
		                throw new error_1.MongoInvalidArgumentError('maxStalenessSeconds must be a positive integer');
		            }
		            this.maxStalenessSeconds = options.maxStalenessSeconds;
		        }
		        if (this.mode === ReadPreference.PRIMARY) {
		            if (this.tags && Array.isArray(this.tags) && this.tags.length > 0) {
		                throw new error_1.MongoInvalidArgumentError('Primary read preference cannot be combined with tags');
		            }
		            if (this.maxStalenessSeconds) {
		                throw new error_1.MongoInvalidArgumentError('Primary read preference cannot be combined with maxStalenessSeconds');
		            }
		            if (this.hedge) {
		                throw new error_1.MongoInvalidArgumentError('Primary read preference cannot be combined with hedge');
		            }
		        }
		    }
		    // Support the deprecated `preference` property introduced in the porcelain layer
		    get preference() {
		        return this.mode;
		    }
		    static fromString(mode) {
		        return new ReadPreference(mode);
		    }
		    /**
		     * Construct a ReadPreference given an options object.
		     *
		     * @param options - The options object from which to extract the read preference.
		     */
		    static fromOptions(options) {
		        if (!options)
		            return;
		        const readPreference = options.readPreference ?? options.session?.transaction.options.readPreference;
		        const readPreferenceTags = options.readPreferenceTags;
		        if (readPreference == null) {
		            return;
		        }
		        if (typeof readPreference === 'string') {
		            return new ReadPreference(readPreference, readPreferenceTags, {
		                maxStalenessSeconds: options.maxStalenessSeconds,
		                hedge: options.hedge
		            });
		        }
		        else if (!(readPreference instanceof ReadPreference) && typeof readPreference === 'object') {
		            const mode = readPreference.mode || readPreference.preference;
		            if (mode && typeof mode === 'string') {
		                return new ReadPreference(mode, readPreference.tags ?? readPreferenceTags, {
		                    maxStalenessSeconds: readPreference.maxStalenessSeconds,
		                    hedge: options.hedge
		                });
		            }
		        }
		        if (readPreferenceTags) {
		            readPreference.tags = readPreferenceTags;
		        }
		        return readPreference;
		    }
		    /**
		     * Replaces options.readPreference with a ReadPreference instance
		     */
		    static translate(options) {
		        if (options.readPreference == null)
		            return options;
		        const r = options.readPreference;
		        if (typeof r === 'string') {
		            options.readPreference = new ReadPreference(r);
		        }
		        else if (r && !(r instanceof ReadPreference) && typeof r === 'object') {
		            const mode = r.mode || r.preference;
		            if (mode && typeof mode === 'string') {
		                options.readPreference = new ReadPreference(mode, r.tags, {
		                    maxStalenessSeconds: r.maxStalenessSeconds
		                });
		            }
		        }
		        else if (!(r instanceof ReadPreference)) {
		            throw new error_1.MongoInvalidArgumentError(`Invalid read preference: ${r}`);
		        }
		        return options;
		    }
		    /**
		     * Validate if a mode is legal
		     *
		     * @param mode - The string representing the read preference mode.
		     */
		    static isValid(mode) {
		        const VALID_MODES = new Set([
		            ReadPreference.PRIMARY,
		            ReadPreference.PRIMARY_PREFERRED,
		            ReadPreference.SECONDARY,
		            ReadPreference.SECONDARY_PREFERRED,
		            ReadPreference.NEAREST,
		            null
		        ]);
		        return VALID_MODES.has(mode);
		    }
		    /**
		     * Validate if a mode is legal
		     *
		     * @param mode - The string representing the read preference mode.
		     */
		    isValid(mode) {
		        return ReadPreference.isValid(typeof mode === 'string' ? mode : this.mode);
		    }
		    /**
		     * Indicates that this readPreference needs the "SecondaryOk" bit when sent over the wire
		     * @see https://www.mongodb.com/docs/manual/reference/mongodb-wire-protocol/#op-query
		     */
		    secondaryOk() {
		        const NEEDS_SECONDARYOK = new Set([
		            ReadPreference.PRIMARY_PREFERRED,
		            ReadPreference.SECONDARY,
		            ReadPreference.SECONDARY_PREFERRED,
		            ReadPreference.NEAREST
		        ]);
		        return NEEDS_SECONDARYOK.has(this.mode);
		    }
		    /**
		     * Check if the two ReadPreferences are equivalent
		     *
		     * @param readPreference - The read preference with which to check equality
		     */
		    equals(readPreference) {
		        return readPreference.mode === this.mode;
		    }
		    /** Return JSON representation */
		    toJSON() {
		        const readPreference = { mode: this.mode };
		        if (Array.isArray(this.tags))
		            readPreference.tags = this.tags;
		        if (this.maxStalenessSeconds)
		            readPreference.maxStalenessSeconds = this.maxStalenessSeconds;
		        if (this.hedge)
		            readPreference.hedge = this.hedge;
		        return readPreference;
		    }
		}
		exports.ReadPreference = ReadPreference;
		
	} (read_preference));
	return read_preference;
}

var common = {};

var hasRequiredCommon;

function requireCommon () {
	if (hasRequiredCommon) return common;
	hasRequiredCommon = 1;
	Object.defineProperty(common, "__esModule", { value: true });
	common.ServerType = common.TopologyType = common.STATE_CONNECTED = common.STATE_CONNECTING = common.STATE_CLOSED = common.STATE_CLOSING = void 0;
	common._advanceClusterTime = _advanceClusterTime;
	// shared state names
	common.STATE_CLOSING = 'closing';
	common.STATE_CLOSED = 'closed';
	common.STATE_CONNECTING = 'connecting';
	common.STATE_CONNECTED = 'connected';
	/**
	 * An enumeration of topology types we know about
	 * @public
	 */
	common.TopologyType = Object.freeze({
	    Single: 'Single',
	    ReplicaSetNoPrimary: 'ReplicaSetNoPrimary',
	    ReplicaSetWithPrimary: 'ReplicaSetWithPrimary',
	    Sharded: 'Sharded',
	    Unknown: 'Unknown',
	    LoadBalanced: 'LoadBalanced'
	});
	/**
	 * An enumeration of server types we know about
	 * @public
	 */
	common.ServerType = Object.freeze({
	    Standalone: 'Standalone',
	    Mongos: 'Mongos',
	    PossiblePrimary: 'PossiblePrimary',
	    RSPrimary: 'RSPrimary',
	    RSSecondary: 'RSSecondary',
	    RSArbiter: 'RSArbiter',
	    RSOther: 'RSOther',
	    RSGhost: 'RSGhost',
	    Unknown: 'Unknown',
	    LoadBalancer: 'LoadBalancer'
	});
	/** Shared function to determine clusterTime for a given topology or session */
	function _advanceClusterTime(entity, $clusterTime) {
	    if (entity.clusterTime == null) {
	        entity.clusterTime = $clusterTime;
	    }
	    else {
	        if ($clusterTime.clusterTime.greaterThan(entity.clusterTime.clusterTime)) {
	            entity.clusterTime = $clusterTime;
	        }
	    }
	}
	
	return common;
}

var read_concern = {};

var hasRequiredRead_concern;

function requireRead_concern () {
	if (hasRequiredRead_concern) return read_concern;
	hasRequiredRead_concern = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.ReadConcern = exports.ReadConcernLevel = void 0;
		/** @public */
		exports.ReadConcernLevel = Object.freeze({
		    local: 'local',
		    majority: 'majority',
		    linearizable: 'linearizable',
		    available: 'available',
		    snapshot: 'snapshot'
		});
		/**
		 * The MongoDB ReadConcern, which allows for control of the consistency and isolation properties
		 * of the data read from replica sets and replica set shards.
		 * @public
		 *
		 * @see https://www.mongodb.com/docs/manual/reference/read-concern/index.html
		 */
		class ReadConcern {
		    /** Constructs a ReadConcern from the read concern level.*/
		    constructor(level) {
		        /**
		         * A spec test exists that allows level to be any string.
		         * "invalid readConcern with out stage"
		         * @see ./test/spec/crud/v2/aggregate-out-readConcern.json
		         * @see https://github.com/mongodb/specifications/blob/master/source/read-write-concern/read-write-concern.md#unknown-levels-and-additional-options-for-string-based-readconcerns
		         */
		        this.level = exports.ReadConcernLevel[level] ?? level;
		    }
		    /**
		     * Construct a ReadConcern given an options object.
		     *
		     * @param options - The options object from which to extract the write concern.
		     */
		    static fromOptions(options) {
		        if (options == null) {
		            return;
		        }
		        if (options.readConcern) {
		            const { readConcern } = options;
		            if (readConcern instanceof ReadConcern) {
		                return readConcern;
		            }
		            else if (typeof readConcern === 'string') {
		                return new ReadConcern(readConcern);
		            }
		            else if ('level' in readConcern && readConcern.level) {
		                return new ReadConcern(readConcern.level);
		            }
		        }
		        if (options.level) {
		            return new ReadConcern(options.level);
		        }
		        return;
		    }
		    static get MAJORITY() {
		        return exports.ReadConcernLevel.majority;
		    }
		    static get AVAILABLE() {
		        return exports.ReadConcernLevel.available;
		    }
		    static get LINEARIZABLE() {
		        return exports.ReadConcernLevel.linearizable;
		    }
		    static get SNAPSHOT() {
		        return exports.ReadConcernLevel.snapshot;
		    }
		    toJSON() {
		        return { level: this.level };
		    }
		}
		exports.ReadConcern = ReadConcern;
		
	} (read_concern));
	return read_concern;
}

var aggregate = {};

var command = {};

var operation = {};

var hasRequiredOperation;

function requireOperation () {
	if (hasRequiredOperation) return operation;
	hasRequiredOperation = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.AbstractOperation = exports.Aspect = void 0;
		exports.defineAspects = defineAspects;
		const bson_1 = mongodb1.requireBson();
		const read_preference_1 = requireRead_preference();
		exports.Aspect = {
		    READ_OPERATION: Symbol('READ_OPERATION'),
		    WRITE_OPERATION: Symbol('WRITE_OPERATION'),
		    RETRYABLE: Symbol('RETRYABLE'),
		    EXPLAINABLE: Symbol('EXPLAINABLE'),
		    SKIP_COLLATION: Symbol('SKIP_COLLATION'),
		    CURSOR_CREATING: Symbol('CURSOR_CREATING'),
		    MUST_SELECT_SAME_SERVER: Symbol('MUST_SELECT_SAME_SERVER'),
		    COMMAND_BATCHING: Symbol('COMMAND_BATCHING'),
		    SUPPORTS_RAW_DATA: Symbol('SUPPORTS_RAW_DATA')
		};
		/**
		 * This class acts as a parent class for any operation and is responsible for setting this.options,
		 * as well as setting and getting a session.
		 * Additionally, this class implements `hasAspect`, which determines whether an operation has
		 * a specific aspect.
		 * @internal
		 */
		class AbstractOperation {
		    constructor(options = {}) {
		        this.readPreference = this.hasAspect(exports.Aspect.WRITE_OPERATION)
		            ? read_preference_1.ReadPreference.primary
		            : (read_preference_1.ReadPreference.fromOptions(options) ?? read_preference_1.ReadPreference.primary);
		        // Pull the BSON serialize options from the already-resolved options
		        this.bsonOptions = (0, bson_1.resolveBSONOptions)(options);
		        this._session = options.session != null ? options.session : undefined;
		        this.options = options;
		        this.bypassPinningCheck = !!options.bypassPinningCheck;
		        this.attemptsMade = 0;
		    }
		    hasAspect(aspect) {
		        const ctor = this.constructor;
		        if (ctor.aspects == null) {
		            return false;
		        }
		        return ctor.aspects.has(aspect);
		    }
		    // Make sure the session is not writable from outside this class.
		    get session() {
		        return this._session;
		    }
		    set session(session) {
		        this._session = session;
		    }
		    clearSession() {
		        this._session = undefined;
		    }
		    resetBatch() {
		        return true;
		    }
		    get canRetryRead() {
		        return this.hasAspect(exports.Aspect.RETRYABLE) && this.hasAspect(exports.Aspect.READ_OPERATION);
		    }
		    get canRetryWrite() {
		        return this.hasAspect(exports.Aspect.RETRYABLE) && this.hasAspect(exports.Aspect.WRITE_OPERATION);
		    }
		    /**
		     * Given an instance of a MongoDBResponse, map the response to the correct result type.  For
		     * example, a `CountOperation` might map the response as follows:
		     *
		     * ```typescript
		     *  override handleOk(response: InstanceType<typeof this.SERVER_COMMAND_RESPONSE_TYPE>): TResult {
		     *    return response.toObject(this.bsonOptions).n ?? 0;
		     *  }
		     *
		     *  // or, with type safety:
		     *  override handleOk(response: InstanceType<typeof this.SERVER_COMMAND_RESPONSE_TYPE>): TResult {
		     *    return response.getNumber('n') ?? 0;
		     *  }
		     * ```
		     */
		    handleOk(response) {
		        return response.toObject(this.bsonOptions);
		    }
		    /**
		     * Optional.
		     *
		     * If the operation performs error handling, such as wrapping, renaming the error, or squashing errors
		     * this method can be overridden.
		     */
		    handleError(error) {
		        throw error;
		    }
		}
		exports.AbstractOperation = AbstractOperation;
		function defineAspects(operation, aspects) {
		    if (!Array.isArray(aspects) && !(aspects instanceof Set)) {
		        aspects = [aspects];
		    }
		    aspects = new Set(aspects);
		    Object.defineProperty(operation, 'aspects', {
		        value: aspects,
		        writable: false
		    });
		    return aspects;
		}
		
	} (operation));
	return operation;
}

var hasRequiredCommand;

function requireCommand () {
	if (hasRequiredCommand) return command;
	hasRequiredCommand = 1;
	Object.defineProperty(command, "__esModule", { value: true });
	command.CommandOperation = void 0;
	const constants_1 = mongodb2.requireConstants();
	const error_1 = mongodb4.requireError();
	const explain_1 = mongodb4.requireExplain();
	const read_concern_1 = requireRead_concern();
	const utils_1 = mongodb7.requireUtils();
	const write_concern_1 = mongodb7.requireWrite_concern();
	const operation_1 = requireOperation();
	/** @internal */
	class CommandOperation extends operation_1.AbstractOperation {
	    constructor(parent, options) {
	        super(options);
	        this.options = options ?? {};
	        // NOTE: this was explicitly added for the add/remove user operations, it's likely
	        //       something we'd want to reconsider. Perhaps those commands can use `Admin`
	        //       as a parent?
	        const dbNameOverride = options?.dbName || options?.authdb;
	        if (dbNameOverride) {
	            this.ns = new utils_1.MongoDBNamespace(dbNameOverride, '$cmd');
	        }
	        else {
	            this.ns = parent
	                ? parent.s.namespace.withCollection('$cmd')
	                : new utils_1.MongoDBNamespace('admin', '$cmd');
	        }
	        this.readConcern = read_concern_1.ReadConcern.fromOptions(options);
	        this.writeConcern = write_concern_1.WriteConcern.fromOptions(options);
	        if (this.hasAspect(operation_1.Aspect.EXPLAINABLE)) {
	            this.explain = explain_1.Explain.fromOptions(options);
	            if (this.explain)
	                (0, explain_1.validateExplainTimeoutOptions)(this.options, this.explain);
	        }
	        else if (options?.explain != null) {
	            throw new error_1.MongoInvalidArgumentError(`Option "explain" is not supported on this command`);
	        }
	    }
	    get canRetryWrite() {
	        if (this.hasAspect(operation_1.Aspect.EXPLAINABLE)) {
	            return this.explain == null;
	        }
	        return super.canRetryWrite;
	    }
	    buildOptions(timeoutContext) {
	        return {
	            ...this.options,
	            ...this.bsonOptions,
	            timeoutContext,
	            readPreference: this.readPreference,
	            session: this.session
	        };
	    }
	    buildCommand(connection, session) {
	        const command = this.buildCommandDocument(connection, session);
	        const inTransaction = this.session && this.session.inTransaction();
	        if (this.readConcern && (0, utils_1.commandSupportsReadConcern)(command) && !inTransaction) {
	            Object.assign(command, { readConcern: this.readConcern });
	        }
	        if (this.writeConcern && this.hasAspect(operation_1.Aspect.WRITE_OPERATION) && !inTransaction) {
	            write_concern_1.WriteConcern.apply(command, this.writeConcern);
	        }
	        if (this.options.collation &&
	            typeof this.options.collation === 'object' &&
	            !this.hasAspect(operation_1.Aspect.SKIP_COLLATION)) {
	            Object.assign(command, { collation: this.options.collation });
	        }
	        if (typeof this.options.maxTimeMS === 'number') {
	            command.maxTimeMS = this.options.maxTimeMS;
	        }
	        if (this.options.rawData != null &&
	            this.hasAspect(operation_1.Aspect.SUPPORTS_RAW_DATA) &&
	            (0, utils_1.maxWireVersion)(connection) >= constants_1.MIN_SUPPORTED_RAW_DATA_WIRE_VERSION) {
	            command.rawData = this.options.rawData;
	        }
	        if (this.hasAspect(operation_1.Aspect.EXPLAINABLE) && this.explain) {
	            return (0, explain_1.decorateWithExplain)(command, this.explain);
	        }
	        return command;
	    }
	}
	command.CommandOperation = CommandOperation;
	
	return command;
}

var hasRequiredAggregate;

function requireAggregate () {
	if (hasRequiredAggregate) return aggregate;
	hasRequiredAggregate = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.AggregateOperation = exports.DB_AGGREGATE_COLLECTION = void 0;
		const responses_1 = mongodb3.requireResponses();
		const error_1 = mongodb4.requireError();
		const write_concern_1 = mongodb7.requireWrite_concern();
		const command_1 = requireCommand();
		const operation_1 = requireOperation();
		/** @internal */
		exports.DB_AGGREGATE_COLLECTION = 1;
		/** @internal */
		class AggregateOperation extends command_1.CommandOperation {
		    constructor(ns, pipeline, options) {
		        super(undefined, { ...options, dbName: ns.db });
		        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.CursorResponse;
		        this.options = { ...options };
		        // Covers when ns.collection is null, undefined or the empty string, use DB_AGGREGATE_COLLECTION
		        this.target = ns.collection || exports.DB_AGGREGATE_COLLECTION;
		        this.pipeline = pipeline;
		        // determine if we have a write stage, override read preference if so
		        this.hasWriteStage = false;
		        if (typeof options?.out === 'string') {
		            this.pipeline = this.pipeline.concat({ $out: options.out });
		            this.hasWriteStage = true;
		        }
		        else if (pipeline.length > 0) {
		            const finalStage = pipeline[pipeline.length - 1];
		            if (finalStage.$out || finalStage.$merge) {
		                this.hasWriteStage = true;
		            }
		        }
		        if (!this.hasWriteStage) {
		            delete this.options.writeConcern;
		        }
		        if (options?.cursor != null && typeof options.cursor !== 'object') {
		            throw new error_1.MongoInvalidArgumentError('Cursor options must be an object');
		        }
		        this.SERVER_COMMAND_RESPONSE_TYPE = this.explain ? responses_1.ExplainedCursorResponse : responses_1.CursorResponse;
		    }
		    get commandName() {
		        return 'aggregate';
		    }
		    get canRetryRead() {
		        return !this.hasWriteStage;
		    }
		    addToPipeline(stage) {
		        this.pipeline.push(stage);
		    }
		    buildCommandDocument() {
		        const options = this.options;
		        const command = { aggregate: this.target, pipeline: this.pipeline };
		        if (this.hasWriteStage && this.writeConcern) {
		            write_concern_1.WriteConcern.apply(command, this.writeConcern);
		        }
		        if (options.bypassDocumentValidation === true) {
		            command.bypassDocumentValidation = options.bypassDocumentValidation;
		        }
		        if (typeof options.allowDiskUse === 'boolean') {
		            command.allowDiskUse = options.allowDiskUse;
		        }
		        if (options.hint) {
		            command.hint = options.hint;
		        }
		        if (options.let) {
		            command.let = options.let;
		        }
		        // we check for undefined specifically here to allow falsy values
		        // eslint-disable-next-line no-restricted-syntax
		        if (options.comment !== undefined) {
		            command.comment = options.comment;
		        }
		        command.cursor = options.cursor || {};
		        if (options.batchSize && !this.hasWriteStage) {
		            command.cursor.batchSize = options.batchSize;
		        }
		        return command;
		    }
		    handleOk(response) {
		        return response;
		    }
		}
		exports.AggregateOperation = AggregateOperation;
		(0, operation_1.defineAspects)(AggregateOperation, [
		    operation_1.Aspect.READ_OPERATION,
		    operation_1.Aspect.RETRYABLE,
		    operation_1.Aspect.EXPLAINABLE,
		    operation_1.Aspect.CURSOR_CREATING,
		    operation_1.Aspect.SUPPORTS_RAW_DATA
		]);
		
	} (aggregate));
	return aggregate;
}

var run_command = {};

var hasRequiredRun_command;

function requireRun_command () {
	if (hasRequiredRun_command) return run_command;
	hasRequiredRun_command = 1;
	Object.defineProperty(run_command, "__esModule", { value: true });
	run_command.RunCursorCommandOperation = run_command.RunCommandOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const operation_1 = requireOperation();
	/** @internal */
	class RunCommandOperation extends operation_1.AbstractOperation {
	    constructor(namespace, command, options) {
	        super(options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.command = command;
	        this.options = options;
	        this.ns = namespace.withCollection('$cmd');
	    }
	    get commandName() {
	        return 'runCommand';
	    }
	    buildCommand(_connection, _session) {
	        return this.command;
	    }
	    buildOptions(timeoutContext) {
	        return {
	            ...this.options,
	            session: this.session,
	            timeoutContext,
	            signal: this.options.signal,
	            readPreference: this.options.readPreference
	        };
	    }
	}
	run_command.RunCommandOperation = RunCommandOperation;
	/**
	 * @internal
	 *
	 * A specialized subclass of RunCommandOperation for cursor-creating commands.
	 */
	class RunCursorCommandOperation extends RunCommandOperation {
	    constructor() {
	        super(...arguments);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.CursorResponse;
	    }
	    handleOk(response) {
	        return response;
	    }
	}
	run_command.RunCursorCommandOperation = RunCursorCommandOperation;
	
	return run_command;
}

var hasRequiredExecute_operation;

function requireExecute_operation () {
	if (hasRequiredExecute_operation) return execute_operation;
	hasRequiredExecute_operation = 1;
	Object.defineProperty(execute_operation, "__esModule", { value: true });
	execute_operation.executeOperation = executeOperation;
	execute_operation.autoConnect = autoConnect;
	const promises_1 = require$$0;
	const constants_1 = mongodb2.requireConstants();
	const error_1 = mongodb4.requireError();
	const read_preference_1 = requireRead_preference();
	const common_1 = requireCommon();
	const server_selection_1 = mongodb6.requireServer_selection();
	const timeout_1 = mongodb6.requireTimeout();
	const utils_1 = mongodb7.requireUtils();
	const aggregate_1 = requireAggregate();
	const operation_1 = requireOperation();
	const run_command_1 = requireRun_command();
	const MMAPv1_RETRY_WRITES_ERROR_CODE = error_1.MONGODB_ERROR_CODES.IllegalOperation;
	const MMAPv1_RETRY_WRITES_ERROR_MESSAGE = 'This MongoDB deployment does not support retryable writes. Please add retryWrites=false to your connection string.';
	/**
	 * Executes the given operation with provided arguments.
	 * @internal
	 *
	 * @remarks
	 * Allows for a single point of entry to provide features such as implicit sessions, which
	 * are required by the Driver Sessions specification in the event that a ClientSession is
	 * not provided.
	 *
	 * The expectation is that this function:
	 * - Connects the MongoClient if it has not already been connected, see {@link autoConnect}
	 * - Creates a session if none is provided and cleans up the session it creates
	 * - Tries an operation and retries under certain conditions, see {@link executeOperationWithRetries}
	 *
	 * @typeParam T - The operation's type
	 * @typeParam TResult - The type of the operation's result, calculated from T
	 *
	 * @param client - The MongoClient to execute this operation with
	 * @param operation - The operation to execute
	 */
	async function executeOperation(client, operation, timeoutContext) {
	    if (!(operation instanceof operation_1.AbstractOperation)) {
	        // TODO(NODE-3483): Extend MongoRuntimeError
	        throw new error_1.MongoRuntimeError('This method requires a valid operation instance');
	    }
	    const topology = client.topology == null
	        ? await (0, utils_1.abortable)(autoConnect(client), operation.options)
	        : client.topology;
	    // The driver sessions spec mandates that we implicitly create sessions for operations
	    // that are not explicitly provided with a session.
	    let session = operation.session;
	    let owner;
	    if (session == null) {
	        owner = Symbol();
	        session = client.startSession({ owner, explicit: false });
	    }
	    else if (session.hasEnded) {
	        throw new error_1.MongoExpiredSessionError('Use of expired sessions is not permitted');
	    }
	    else if (session.snapshotEnabled &&
	        (0, utils_1.maxWireVersion)(topology) < constants_1.MIN_SUPPORTED_SNAPSHOT_READS_WIRE_VERSION) {
	        throw new error_1.MongoCompatibilityError('Snapshot reads require MongoDB 5.0 or later');
	    }
	    else if (session.client !== client) {
	        throw new error_1.MongoInvalidArgumentError('ClientSession must be from the same MongoClient');
	    }
	    operation.session ??= session;
	    const readPreference = operation.readPreference ?? read_preference_1.ReadPreference.primary;
	    const inTransaction = !!session?.inTransaction();
	    const hasReadAspect = operation.hasAspect(operation_1.Aspect.READ_OPERATION);
	    if (inTransaction &&
	        !readPreference.equals(read_preference_1.ReadPreference.primary) &&
	        (hasReadAspect || operation.commandName === 'runCommand')) {
	        throw new error_1.MongoTransactionError(`Read preference in a transaction must be primary, not: ${readPreference.mode}`);
	    }
	    if (session?.isPinned && session.transaction.isCommitted && !operation.bypassPinningCheck) {
	        session.unpin();
	    }
	    timeoutContext ??= timeout_1.TimeoutContext.create({
	        session,
	        serverSelectionTimeoutMS: client.s.options.serverSelectionTimeoutMS,
	        waitQueueTimeoutMS: client.s.options.waitQueueTimeoutMS,
	        timeoutMS: operation.options.timeoutMS
	    });
	    try {
	        return await executeOperationWithRetries(operation, {
	            topology,
	            timeoutContext,
	            session,
	            readPreference
	        });
	    }
	    finally {
	        if (session?.owner != null && session.owner === owner) {
	            await session.endSession();
	        }
	    }
	}
	/**
	 * Connects a client if it has not yet been connected
	 * @internal
	 */
	async function autoConnect(client) {
	    if (client.topology == null) {
	        if (client.s.hasBeenClosed) {
	            throw new error_1.MongoNotConnectedError('Client must be connected before running operations');
	        }
	        client.s.options.__skipPingOnConnect = true;
	        try {
	            await client.connect();
	            if (client.topology == null) {
	                throw new error_1.MongoRuntimeError('client.connect did not create a topology but also did not throw');
	            }
	            return client.topology;
	        }
	        finally {
	            delete client.s.options.__skipPingOnConnect;
	        }
	    }
	    return client.topology;
	}
	/** @internal The base backoff duration in milliseconds */
	const BASE_BACKOFF_MS = 100;
	/** @internal The maximum backoff duration in milliseconds */
	const MAX_BACKOFF_MS = 10_000;
	/**
	 * Executes an operation and retries as appropriate
	 * @internal
	 *
	 * @remarks
	 * Implements behaviour described in [Retryable Reads](https://github.com/mongodb/specifications/blob/master/source/retryable-reads/retryable-reads.md) and [Retryable
	 * Writes](https://github.com/mongodb/specifications/blob/master/source/retryable-writes/retryable-writes.md) specification
	 *
	 * This function:
	 * - performs initial server selection
	 * - attempts to execute an operation
	 * - retries the operation if it meets the criteria for a retryable read or a retryable write
	 *
	 * @typeParam T - The operation's type
	 * @typeParam TResult - The type of the operation's result, calculated from T
	 *
	 * @param operation - The operation to execute
	 */
	async function executeOperationWithRetries(operation, { topology, timeoutContext, session, readPreference }) {
	    let selector;
	    if (operation.hasAspect(operation_1.Aspect.MUST_SELECT_SAME_SERVER)) {
	        // GetMore and KillCursor operations must always select the same server, but run through
	        // server selection to potentially force monitor checks if the server is
	        // in an unknown state.
	        selector = (0, server_selection_1.sameServerSelector)(operation.server?.description);
	    }
	    else if (operation instanceof aggregate_1.AggregateOperation && operation.hasWriteStage) {
	        // If operation should try to write to secondary use the custom server selector
	        // otherwise provide the read preference.
	        selector = (0, server_selection_1.secondaryWritableServerSelector)(topology.commonWireVersion, readPreference);
	    }
	    else {
	        selector = readPreference;
	    }
	    let server = await topology.selectServer(selector, {
	        session,
	        operationName: operation.commandName,
	        timeoutContext,
	        signal: operation.options.signal,
	        deprioritizedServers: new server_selection_1.DeprioritizedServers()
	    });
	    const hasReadAspect = operation.hasAspect(operation_1.Aspect.READ_OPERATION);
	    const hasWriteAspect = operation.hasAspect(operation_1.Aspect.WRITE_OPERATION);
	    const inTransaction = session?.inTransaction() ?? false;
	    const willRetryRead = topology.s.options.retryReads && !inTransaction && operation.canRetryRead;
	    const willRetryWrite = topology.s.options.retryWrites &&
	        !inTransaction &&
	        (0, utils_1.supportsRetryableWrites)(server) &&
	        operation.canRetryWrite;
	    const willRetry = operation.hasAspect(operation_1.Aspect.RETRYABLE) &&
	        session != null &&
	        ((hasReadAspect && willRetryRead) || (hasWriteAspect && willRetryWrite));
	    if (hasWriteAspect && willRetryWrite && session != null) {
	        operation.options.willRetryWrite = true;
	        session.incrementTransactionNumber();
	    }
	    const deprioritizedServers = new server_selection_1.DeprioritizedServers();
	    let maxAttempts = typeof operation.maxAttempts === 'number'
	        ? operation.maxAttempts
	        : willRetry
	            ? timeoutContext.csotEnabled()
	                ? Infinity
	                : 2
	            : 1;
	    let error = null;
	    for (let attempt = 0; attempt < maxAttempts; attempt++) {
	        operation.attemptsMade = attempt + 1;
	        operation.server = server;
	        try {
	            try {
	                const result = await server.command(operation, timeoutContext);
	                return operation.handleOk(result);
	            }
	            catch (error) {
	                return operation.handleError(error);
	            }
	        }
	        catch (operationError) {
	            // Should never happen but if it does - propagate the error.
	            if (!(operationError instanceof error_1.MongoError))
	                throw operationError;
	            // Preserve the original error once a write has been performed.
	            // Only update to the latest error if no writes were performed.
	            if (error == null) {
	                error = operationError;
	            }
	            else {
	                if (!operationError.hasErrorLabel(error_1.MongoErrorLabel.NoWritesPerformed)) {
	                    error = operationError;
	                }
	            }
	            // Reset timeouts
	            timeoutContext.clear();
	            if (hasWriteAspect && operationError.code === MMAPv1_RETRY_WRITES_ERROR_CODE) {
	                throw new error_1.MongoServerError({
	                    message: MMAPv1_RETRY_WRITES_ERROR_MESSAGE,
	                    errmsg: MMAPv1_RETRY_WRITES_ERROR_MESSAGE,
	                    originalError: operationError
	                });
	            }
	            if (!canRetry(operation, operationError)) {
	                throw error;
	            }
	            if (operationError.hasErrorLabel(error_1.MongoErrorLabel.SystemOverloadedError)) {
	                const maxOverloadAttempts = topology.s.options.maxAdaptiveRetries + 1;
	                maxAttempts = Math.min(maxOverloadAttempts, operation.maxAttempts ?? maxOverloadAttempts);
	            }
	            if (attempt + 1 >= maxAttempts) {
	                throw error;
	            }
	            if (operationError instanceof error_1.MongoNetworkError &&
	                operation.hasAspect(operation_1.Aspect.CURSOR_CREATING) &&
	                session != null &&
	                session.isPinned &&
	                !session.inTransaction()) {
	                session.unpin({ force: true, forceClear: true });
	            }
	            if (operationError.hasErrorLabel(error_1.MongoErrorLabel.SystemOverloadedError) &&
	                operation.hasAspect(operation_1.Aspect.CURSOR_CREATING) &&
	                session != null &&
	                session.isPinned &&
	                !session.inTransaction()) {
	                session.unpin({ force: true });
	            }
	            if (operationError.hasErrorLabel(error_1.MongoErrorLabel.SystemOverloadedError)) {
	                const backoffMS = Math.random() * Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempt);
	                // if the backoff would exhaust the CSOT timeout, short-circuit.
	                if (timeoutContext.csotEnabled() && backoffMS > timeoutContext.remainingTimeMS) {
	                    throw error;
	                }
	                await (0, promises_1.setTimeout)(backoffMS);
	            }
	            if (topology.description.type === common_1.TopologyType.Sharded ||
	                (operationError.hasErrorLabel(error_1.MongoErrorLabel.SystemOverloadedError) &&
	                    topology.s.options.enableOverloadRetargeting)) {
	                deprioritizedServers.add(server.description);
	            }
	            server = await topology.selectServer(selector, {
	                session,
	                operationName: operation.commandName,
	                deprioritizedServers,
	                signal: operation.options.signal
	            });
	            if (hasWriteAspect &&
	                !(0, utils_1.supportsRetryableWrites)(server) &&
	                !operationError.hasErrorLabel(error_1.MongoErrorLabel.SystemOverloadedError)) {
	                throw new error_1.MongoUnexpectedServerResponseError('Selected server does not support retryable writes');
	            }
	            // Batched operations must reset the batch before retry,
	            // otherwise building a command will build the _next_ batch, not the current batch.
	            if (operation.hasAspect(operation_1.Aspect.COMMAND_BATCHING)) {
	                operation.resetBatch();
	            }
	        }
	    }
	    throw (error ??
	        new error_1.MongoRuntimeError('Should never happen: operation execution loop terminated but no error was recorded.'));
	    function canRetry(operation, error) {
	        // SystemOverloadedError is retryable, but must respect retryReads/retryWrites settings
	        // Check topology options directly (not operation.canRetryRead/Write) because backpressure
	        // expands retry support beyond traditional retryable reads/writes
	        // NOTE: Unlike traditional retries, backpressure retries ARE allowed inside transactions
	        if (error.hasErrorLabel(error_1.MongoErrorLabel.SystemOverloadedError) &&
	            error.hasErrorLabel(error_1.MongoErrorLabel.RetryableError)) {
	            // runCommand requires BOTH retryReads and retryWrites to be enabled (per spec step 2.4)
	            if (operation instanceof run_command_1.RunCommandOperation) {
	                return topology.s.options.retryReads && topology.s.options.retryWrites;
	            }
	            // Write-stage aggregates ($out/$merge) require retryWrites
	            if (operation instanceof aggregate_1.AggregateOperation && operation.hasWriteStage) {
	                return topology.s.options.retryWrites;
	            }
	            // For other operations, check if retries are enabled based on operation type
	            const canRetryAsRead = hasReadAspect && topology.s.options.retryReads;
	            const canRetryAsWrite = hasWriteAspect && topology.s.options.retryWrites;
	            return canRetryAsRead || canRetryAsWrite;
	        }
	        // run command is only retryable if we get retryable overload errors
	        if (operation instanceof run_command_1.RunCommandOperation) {
	            return false;
	        }
	        // batch operations are only retryable if the batch is retryable
	        if (operation.hasAspect(operation_1.Aspect.COMMAND_BATCHING)) {
	            return operation.canRetryWrite && (0, error_1.isRetryableWriteError)(error);
	        }
	        return ((hasWriteAspect && willRetryWrite && (0, error_1.isRetryableWriteError)(error)) ||
	            (hasReadAspect && willRetryRead && (0, error_1.isRetryableReadError)(error)));
	    }
	}
	
	return execute_operation;
}

var list_databases = {};

var hasRequiredList_databases;

function requireList_databases () {
	if (hasRequiredList_databases) return list_databases;
	hasRequiredList_databases = 1;
	Object.defineProperty(list_databases, "__esModule", { value: true });
	list_databases.ListDatabasesOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const utils_1 = mongodb7.requireUtils();
	const command_1 = requireCommand();
	const operation_1 = requireOperation();
	/** @internal */
	class ListDatabasesOperation extends command_1.CommandOperation {
	    constructor(db, options) {
	        super(db, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.options = options ?? {};
	        this.ns = new utils_1.MongoDBNamespace('admin', '$cmd');
	    }
	    get commandName() {
	        return 'listDatabases';
	    }
	    buildCommandDocument(connection, _session) {
	        const cmd = { listDatabases: 1 };
	        if (typeof this.options.nameOnly === 'boolean') {
	            cmd.nameOnly = this.options.nameOnly;
	        }
	        if (this.options.filter) {
	            cmd.filter = this.options.filter;
	        }
	        if (typeof this.options.authorizedDatabases === 'boolean') {
	            cmd.authorizedDatabases = this.options.authorizedDatabases;
	        }
	        // we check for undefined specifically here to allow falsy values
	        // eslint-disable-next-line no-restricted-syntax
	        if ((0, utils_1.maxWireVersion)(connection) >= 9 && this.options.comment !== undefined) {
	            cmd.comment = this.options.comment;
	        }
	        return cmd;
	    }
	}
	list_databases.ListDatabasesOperation = ListDatabasesOperation;
	(0, operation_1.defineAspects)(ListDatabasesOperation, [operation_1.Aspect.READ_OPERATION, operation_1.Aspect.RETRYABLE]);
	
	return list_databases;
}

var remove_user = {};

var hasRequiredRemove_user;

function requireRemove_user () {
	if (hasRequiredRemove_user) return remove_user;
	hasRequiredRemove_user = 1;
	Object.defineProperty(remove_user, "__esModule", { value: true });
	remove_user.RemoveUserOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const command_1 = requireCommand();
	const operation_1 = requireOperation();
	/** @internal */
	class RemoveUserOperation extends command_1.CommandOperation {
	    constructor(db, username, options) {
	        super(db, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.options = options;
	        this.username = username;
	    }
	    get commandName() {
	        return 'dropUser';
	    }
	    buildCommandDocument(_connection) {
	        return { dropUser: this.username };
	    }
	    handleOk(_response) {
	        return true;
	    }
	}
	remove_user.RemoveUserOperation = RemoveUserOperation;
	(0, operation_1.defineAspects)(RemoveUserOperation, [operation_1.Aspect.WRITE_OPERATION]);
	
	return remove_user;
}

var validate_collection = {};

var hasRequiredValidate_collection;

function requireValidate_collection () {
	if (hasRequiredValidate_collection) return validate_collection;
	hasRequiredValidate_collection = 1;
	Object.defineProperty(validate_collection, "__esModule", { value: true });
	validate_collection.ValidateCollectionOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const error_1 = mongodb4.requireError();
	const command_1 = requireCommand();
	/** @internal */
	class ValidateCollectionOperation extends command_1.CommandOperation {
	    constructor(admin, collectionName, options) {
	        super(admin.s.db, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.options = options;
	        this.collectionName = collectionName;
	    }
	    get commandName() {
	        return 'validate';
	    }
	    buildCommandDocument(_connection, _session) {
	        // Decorate command with extra options
	        return {
	            validate: this.collectionName,
	            ...Object.fromEntries(Object.entries(this.options).filter(entry => entry[0] !== 'session'))
	        };
	    }
	    handleOk(response) {
	        const result = super.handleOk(response);
	        if (result.result != null && typeof result.result !== 'string')
	            throw new error_1.MongoUnexpectedServerResponseError('Error with validation data');
	        if (result.result != null && result.result.match(/exception|corrupt/) != null)
	            throw new error_1.MongoUnexpectedServerResponseError(`Invalid collection ${this.collectionName}`);
	        if (result.valid != null && !result.valid)
	            throw new error_1.MongoUnexpectedServerResponseError(`Invalid collection ${this.collectionName}`);
	        return response;
	    }
	}
	validate_collection.ValidateCollectionOperation = ValidateCollectionOperation;
	
	return validate_collection;
}

var _delete = {};

var hasRequired_delete;

function require_delete () {
	if (hasRequired_delete) return _delete;
	hasRequired_delete = 1;
	Object.defineProperty(_delete, "__esModule", { value: true });
	_delete.DeleteManyOperation = _delete.DeleteOneOperation = _delete.DeleteOperation = void 0;
	_delete.makeDeleteStatement = makeDeleteStatement;
	const responses_1 = mongodb3.requireResponses();
	const error_1 = mongodb4.requireError();
	const utils_1 = mongodb7.requireUtils();
	const command_1 = requireCommand();
	const operation_1 = requireOperation();
	/** @internal */
	class DeleteOperation extends command_1.CommandOperation {
	    constructor(ns, statements, options) {
	        super(undefined, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.options = options;
	        this.ns = ns;
	        this.statements = statements;
	    }
	    get commandName() {
	        return 'delete';
	    }
	    get canRetryWrite() {
	        if (super.canRetryWrite === false) {
	            return false;
	        }
	        return this.statements.every(op => (op.limit != null ? op.limit > 0 : true));
	    }
	    buildCommandDocument(connection, _session) {
	        const options = this.options;
	        const ordered = typeof options.ordered === 'boolean' ? options.ordered : true;
	        const command = {
	            delete: this.ns.collection,
	            deletes: this.statements,
	            ordered
	        };
	        if (options.let) {
	            command.let = options.let;
	        }
	        // we check for undefined specifically here to allow falsy values
	        // eslint-disable-next-line no-restricted-syntax
	        if (options.comment !== undefined) {
	            command.comment = options.comment;
	        }
	        const unacknowledgedWrite = this.writeConcern && this.writeConcern.w === 0;
	        if (unacknowledgedWrite && (0, utils_1.maxWireVersion)(connection) < 9) {
	            if (this.statements.find((o) => o.hint)) {
	                throw new error_1.MongoCompatibilityError(`hint for the delete command is only supported on MongoDB 4.4+`);
	            }
	        }
	        return command;
	    }
	}
	_delete.DeleteOperation = DeleteOperation;
	class DeleteOneOperation extends DeleteOperation {
	    constructor(ns, filter, options) {
	        super(ns, [makeDeleteStatement(filter, { ...options, limit: 1 })], options);
	    }
	    handleOk(response) {
	        const res = super.handleOk(response);
	        // @ts-expect-error Explain commands have broken TS
	        if (this.explain)
	            return res;
	        if (res.code)
	            throw new error_1.MongoServerError(res);
	        if (res.writeErrors)
	            throw new error_1.MongoServerError(res.writeErrors[0]);
	        return {
	            acknowledged: this.writeConcern?.w !== 0,
	            deletedCount: res.n
	        };
	    }
	}
	_delete.DeleteOneOperation = DeleteOneOperation;
	class DeleteManyOperation extends DeleteOperation {
	    constructor(ns, filter, options) {
	        super(ns, [makeDeleteStatement(filter, options)], options);
	    }
	    handleOk(response) {
	        const res = super.handleOk(response);
	        // @ts-expect-error Explain commands have broken TS
	        if (this.explain)
	            return res;
	        if (res.code)
	            throw new error_1.MongoServerError(res);
	        if (res.writeErrors)
	            throw new error_1.MongoServerError(res.writeErrors[0]);
	        return {
	            acknowledged: this.writeConcern?.w !== 0,
	            deletedCount: res.n
	        };
	    }
	}
	_delete.DeleteManyOperation = DeleteManyOperation;
	function makeDeleteStatement(filter, options) {
	    const op = {
	        q: filter,
	        limit: typeof options.limit === 'number' ? options.limit : 0
	    };
	    if (options.collation) {
	        op.collation = options.collation;
	    }
	    if (options.hint) {
	        op.hint = options.hint;
	    }
	    return op;
	}
	(0, operation_1.defineAspects)(DeleteOperation, [
	    operation_1.Aspect.RETRYABLE,
	    operation_1.Aspect.WRITE_OPERATION,
	    operation_1.Aspect.SUPPORTS_RAW_DATA
	]);
	(0, operation_1.defineAspects)(DeleteOneOperation, [
	    operation_1.Aspect.RETRYABLE,
	    operation_1.Aspect.WRITE_OPERATION,
	    operation_1.Aspect.EXPLAINABLE,
	    operation_1.Aspect.SKIP_COLLATION,
	    operation_1.Aspect.SUPPORTS_RAW_DATA
	]);
	(0, operation_1.defineAspects)(DeleteManyOperation, [
	    operation_1.Aspect.WRITE_OPERATION,
	    operation_1.Aspect.EXPLAINABLE,
	    operation_1.Aspect.SKIP_COLLATION,
	    operation_1.Aspect.SUPPORTS_RAW_DATA
	]);
	
	return _delete;
}

var insert = {};

var hasRequiredInsert;

function requireInsert () {
	if (hasRequiredInsert) return insert;
	hasRequiredInsert = 1;
	Object.defineProperty(insert, "__esModule", { value: true });
	insert.InsertOneOperation = insert.InsertOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const error_1 = mongodb4.requireError();
	const utils_1 = mongodb7.requireUtils();
	const command_1 = requireCommand();
	const operation_1 = requireOperation();
	/** @internal */
	class InsertOperation extends command_1.CommandOperation {
	    constructor(ns, documents, options) {
	        super(undefined, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.options = { ...options, checkKeys: options.checkKeys ?? false };
	        this.ns = ns;
	        this.documents = documents;
	    }
	    get commandName() {
	        return 'insert';
	    }
	    buildCommandDocument(_connection, _session) {
	        const options = this.options ?? {};
	        const ordered = typeof options.ordered === 'boolean' ? options.ordered : true;
	        const command = {
	            insert: this.ns.collection,
	            documents: this.documents,
	            ordered
	        };
	        if (typeof options.bypassDocumentValidation === 'boolean') {
	            command.bypassDocumentValidation = options.bypassDocumentValidation;
	        }
	        // we check for undefined specifically here to allow falsy values
	        // eslint-disable-next-line no-restricted-syntax
	        if (options.comment !== undefined) {
	            command.comment = options.comment;
	        }
	        return command;
	    }
	}
	insert.InsertOperation = InsertOperation;
	class InsertOneOperation extends InsertOperation {
	    constructor(collection, doc, options) {
	        super(collection.s.namespace, [(0, utils_1.maybeAddIdToDocuments)(collection, doc, options)], options);
	    }
	    handleOk(response) {
	        const res = super.handleOk(response);
	        if (res.code)
	            throw new error_1.MongoServerError(res);
	        if (res.writeErrors) {
	            // This should be a WriteError but we can't change it now because of error hierarchy
	            throw new error_1.MongoServerError(res.writeErrors[0]);
	        }
	        return {
	            acknowledged: this.writeConcern?.w !== 0,
	            insertedId: this.documents[0]._id
	        };
	    }
	}
	insert.InsertOneOperation = InsertOneOperation;
	(0, operation_1.defineAspects)(InsertOperation, [
	    operation_1.Aspect.RETRYABLE,
	    operation_1.Aspect.WRITE_OPERATION,
	    operation_1.Aspect.SUPPORTS_RAW_DATA
	]);
	(0, operation_1.defineAspects)(InsertOneOperation, [
	    operation_1.Aspect.RETRYABLE,
	    operation_1.Aspect.WRITE_OPERATION,
	    operation_1.Aspect.SUPPORTS_RAW_DATA
	]);
	
	return insert;
}

var update$1 = {};

var hasRequiredUpdate$1;

function requireUpdate$1 () {
	if (hasRequiredUpdate$1) return update$1;
	hasRequiredUpdate$1 = 1;
	Object.defineProperty(update$1, "__esModule", { value: true });
	update$1.ReplaceOneOperation = update$1.UpdateManyOperation = update$1.UpdateOneOperation = update$1.UpdateOperation = void 0;
	update$1.makeUpdateStatement = makeUpdateStatement;
	const responses_1 = mongodb3.requireResponses();
	const error_1 = mongodb4.requireError();
	const sort_1 = mongodb6.requireSort();
	const utils_1 = mongodb7.requireUtils();
	const command_1 = requireCommand();
	const operation_1 = requireOperation();
	/**
	 * @internal
	 * UpdateOperation is used in bulk write, while UpdateOneOperation and UpdateManyOperation are only used in the collections API
	 */
	class UpdateOperation extends command_1.CommandOperation {
	    constructor(ns, statements, options) {
	        super(undefined, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.options = options;
	        this.ns = ns;
	        this.statements = statements;
	    }
	    get commandName() {
	        return 'update';
	    }
	    get canRetryWrite() {
	        if (super.canRetryWrite === false) {
	            return false;
	        }
	        return this.statements.every(op => op.multi == null || op.multi === false);
	    }
	    buildCommandDocument(_connection, _session) {
	        const options = this.options;
	        const command = {
	            update: this.ns.collection,
	            updates: this.statements,
	            ordered: options.ordered ?? true
	        };
	        if (typeof options.bypassDocumentValidation === 'boolean') {
	            command.bypassDocumentValidation = options.bypassDocumentValidation;
	        }
	        if (options.let) {
	            command.let = options.let;
	        }
	        // we check for undefined specifically here to allow falsy values
	        // eslint-disable-next-line no-restricted-syntax
	        if (options.comment !== undefined) {
	            command.comment = options.comment;
	        }
	        return command;
	    }
	}
	update$1.UpdateOperation = UpdateOperation;
	/** @internal */
	class UpdateOneOperation extends UpdateOperation {
	    constructor(ns, filter, update, options) {
	        super(ns, [makeUpdateStatement(filter, update, { ...options, multi: false })], options);
	        if (!(0, utils_1.hasAtomicOperators)(update, options)) {
	            throw new error_1.MongoInvalidArgumentError('Update document requires atomic operators');
	        }
	    }
	    handleOk(response) {
	        const res = super.handleOk(response);
	        // @ts-expect-error Explain typing is broken
	        if (this.explain != null)
	            return res;
	        if (res.code)
	            throw new error_1.MongoServerError(res);
	        if (res.writeErrors)
	            throw new error_1.MongoServerError(res.writeErrors[0]);
	        return {
	            acknowledged: this.writeConcern?.w !== 0,
	            modifiedCount: res.nModified ?? res.n,
	            upsertedId: Array.isArray(res.upserted) && res.upserted.length > 0 ? res.upserted[0]._id : null,
	            upsertedCount: Array.isArray(res.upserted) && res.upserted.length ? res.upserted.length : 0,
	            matchedCount: Array.isArray(res.upserted) && res.upserted.length > 0 ? 0 : res.n
	        };
	    }
	}
	update$1.UpdateOneOperation = UpdateOneOperation;
	/** @internal */
	class UpdateManyOperation extends UpdateOperation {
	    constructor(ns, filter, update, options) {
	        super(ns, [makeUpdateStatement(filter, update, { ...options, multi: true })], options);
	        if (!(0, utils_1.hasAtomicOperators)(update, options)) {
	            throw new error_1.MongoInvalidArgumentError('Update document requires atomic operators');
	        }
	    }
	    handleOk(response) {
	        const res = super.handleOk(response);
	        // @ts-expect-error Explain typing is broken
	        if (this.explain != null)
	            return res;
	        if (res.code)
	            throw new error_1.MongoServerError(res);
	        if (res.writeErrors)
	            throw new error_1.MongoServerError(res.writeErrors[0]);
	        return {
	            acknowledged: this.writeConcern?.w !== 0,
	            modifiedCount: res.nModified ?? res.n,
	            upsertedId: Array.isArray(res.upserted) && res.upserted.length > 0 ? res.upserted[0]._id : null,
	            upsertedCount: Array.isArray(res.upserted) && res.upserted.length ? res.upserted.length : 0,
	            matchedCount: Array.isArray(res.upserted) && res.upserted.length > 0 ? 0 : res.n
	        };
	    }
	}
	update$1.UpdateManyOperation = UpdateManyOperation;
	/** @internal */
	class ReplaceOneOperation extends UpdateOperation {
	    constructor(ns, filter, replacement, options) {
	        super(ns, [makeUpdateStatement(filter, replacement, { ...options, multi: false })], options);
	        if ((0, utils_1.hasAtomicOperators)(replacement)) {
	            throw new error_1.MongoInvalidArgumentError('Replacement document must not contain atomic operators');
	        }
	    }
	    handleOk(response) {
	        const res = super.handleOk(response);
	        // @ts-expect-error Explain typing is broken
	        if (this.explain != null)
	            return res;
	        if (res.code)
	            throw new error_1.MongoServerError(res);
	        if (res.writeErrors)
	            throw new error_1.MongoServerError(res.writeErrors[0]);
	        return {
	            acknowledged: this.writeConcern?.w !== 0,
	            modifiedCount: res.nModified ?? res.n,
	            upsertedId: Array.isArray(res.upserted) && res.upserted.length > 0 ? res.upserted[0]._id : null,
	            upsertedCount: Array.isArray(res.upserted) && res.upserted.length ? res.upserted.length : 0,
	            matchedCount: Array.isArray(res.upserted) && res.upserted.length > 0 ? 0 : res.n
	        };
	    }
	}
	update$1.ReplaceOneOperation = ReplaceOneOperation;
	function makeUpdateStatement(filter, update, options) {
	    if (filter == null || typeof filter !== 'object') {
	        throw new error_1.MongoInvalidArgumentError('Selector must be a valid JavaScript object');
	    }
	    if (update == null || typeof update !== 'object') {
	        throw new error_1.MongoInvalidArgumentError('Document must be a valid JavaScript object');
	    }
	    const op = { q: filter, u: update };
	    if (typeof options.upsert === 'boolean') {
	        op.upsert = options.upsert;
	    }
	    if (options.multi) {
	        op.multi = options.multi;
	    }
	    if (options.hint) {
	        op.hint = options.hint;
	    }
	    if (options.arrayFilters) {
	        op.arrayFilters = options.arrayFilters;
	    }
	    if (options.collation) {
	        op.collation = options.collation;
	    }
	    if (!options.multi && options.sort != null) {
	        op.sort = (0, sort_1.formatSort)(options.sort);
	    }
	    return op;
	}
	(0, operation_1.defineAspects)(UpdateOperation, [
	    operation_1.Aspect.RETRYABLE,
	    operation_1.Aspect.WRITE_OPERATION,
	    operation_1.Aspect.SKIP_COLLATION,
	    operation_1.Aspect.SUPPORTS_RAW_DATA
	]);
	(0, operation_1.defineAspects)(UpdateOneOperation, [
	    operation_1.Aspect.RETRYABLE,
	    operation_1.Aspect.WRITE_OPERATION,
	    operation_1.Aspect.EXPLAINABLE,
	    operation_1.Aspect.SKIP_COLLATION,
	    operation_1.Aspect.SUPPORTS_RAW_DATA
	]);
	(0, operation_1.defineAspects)(UpdateManyOperation, [
	    operation_1.Aspect.WRITE_OPERATION,
	    operation_1.Aspect.EXPLAINABLE,
	    operation_1.Aspect.SKIP_COLLATION,
	    operation_1.Aspect.SUPPORTS_RAW_DATA
	]);
	(0, operation_1.defineAspects)(ReplaceOneOperation, [
	    operation_1.Aspect.RETRYABLE,
	    operation_1.Aspect.WRITE_OPERATION,
	    operation_1.Aspect.SKIP_COLLATION,
	    operation_1.Aspect.SUPPORTS_RAW_DATA
	]);
	
	return update$1;
}

var mongo_types = {};

var mongo_logger = {};

var hasRequiredMongo_logger;

function requireMongo_logger () {
	if (hasRequiredMongo_logger) return mongo_logger;
	hasRequiredMongo_logger = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.MongoLogger = exports.MongoLoggableComponent = exports.SEVERITY_LEVEL_MAP = exports.DEFAULT_MAX_DOCUMENT_LENGTH = exports.SeverityLevel = void 0;
		exports.parseSeverityFromString = parseSeverityFromString;
		exports.createStdioLogger = createStdioLogger;
		exports.stringifyWithMaxLen = stringifyWithMaxLen;
		exports.defaultLogTransform = defaultLogTransform;
		const process = require$$0$1;
		const util_1 = require$$1;
		const bson_1 = mongodb1.requireBson();
		const constants_1 = mongodb3.requireConstants();
		const utils_1 = mongodb7.requireUtils();
		/**
		 * @public
		 * Severity levels align with unix syslog.
		 * Most typical driver functions will log to debug.
		 */
		exports.SeverityLevel = Object.freeze({
		    EMERGENCY: 'emergency',
		    ALERT: 'alert',
		    CRITICAL: 'critical',
		    ERROR: 'error',
		    WARNING: 'warn',
		    NOTICE: 'notice',
		    INFORMATIONAL: 'info',
		    DEBUG: 'debug',
		    TRACE: 'trace',
		    OFF: 'off'
		});
		/** @internal */
		exports.DEFAULT_MAX_DOCUMENT_LENGTH = 1000;
		/** @internal */
		class SeverityLevelMap extends Map {
		    constructor(entries) {
		        const newEntries = [];
		        for (const [level, value] of entries) {
		            newEntries.push([value, level]);
		        }
		        newEntries.push(...entries);
		        super(newEntries);
		    }
		    getNumericSeverityLevel(severity) {
		        return this.get(severity);
		    }
		    getSeverityLevelName(level) {
		        return this.get(level);
		    }
		}
		/** @internal */
		exports.SEVERITY_LEVEL_MAP = new SeverityLevelMap([
		    [exports.SeverityLevel.OFF, -Infinity],
		    [exports.SeverityLevel.EMERGENCY, 0],
		    [exports.SeverityLevel.ALERT, 1],
		    [exports.SeverityLevel.CRITICAL, 2],
		    [exports.SeverityLevel.ERROR, 3],
		    [exports.SeverityLevel.WARNING, 4],
		    [exports.SeverityLevel.NOTICE, 5],
		    [exports.SeverityLevel.INFORMATIONAL, 6],
		    [exports.SeverityLevel.DEBUG, 7],
		    [exports.SeverityLevel.TRACE, 8]
		]);
		/** @public */
		exports.MongoLoggableComponent = Object.freeze({
		    COMMAND: 'command',
		    TOPOLOGY: 'topology',
		    SERVER_SELECTION: 'serverSelection',
		    CONNECTION: 'connection',
		    CLIENT: 'client'
		});
		/**
		 * Parses a string as one of SeverityLevel
		 * @internal
		 *
		 * @param s - the value to be parsed
		 * @returns one of SeverityLevel if value can be parsed as such, otherwise null
		 */
		function parseSeverityFromString(s) {
		    const validSeverities = Object.values(exports.SeverityLevel);
		    const lowerSeverity = s?.toLowerCase();
		    if (lowerSeverity != null && validSeverities.includes(lowerSeverity)) {
		        return lowerSeverity;
		    }
		    return null;
		}
		/** @internal */
		function createStdioLogger(stream) {
		    return {
		        write: (log) => {
		            return new Promise((resolve, reject) => {
		                const logLine = (0, util_1.inspect)(log, { compact: true, breakLength: Infinity });
		                stream.write(`${logLine}\n`, 'utf-8', error => {
		                    if (error)
		                        return reject(error);
		                    resolve(true);
		                });
		            });
		        }
		    };
		}
		/**
		 * resolves the MONGODB_LOG_PATH and mongodbLogPath options from the environment and the
		 * mongo client options respectively. The mongodbLogPath can be either 'stdout', 'stderr', a NodeJS
		 * Writable or an object which has a `write` method with the signature:
		 * ```ts
		 * write(log: Log): void
		 * ```
		 *
		 * @returns the MongoDBLogWritable object to write logs to
		 */
		function resolveLogPath({ MONGODB_LOG_PATH }, { mongodbLogPath }) {
		    if (typeof mongodbLogPath === 'string' && /^stderr$/i.test(mongodbLogPath)) {
		        return { mongodbLogPath: createStdioLogger(process.stderr), mongodbLogPathIsStdErr: true };
		    }
		    if (typeof mongodbLogPath === 'string' && /^stdout$/i.test(mongodbLogPath)) {
		        return { mongodbLogPath: createStdioLogger(process.stdout), mongodbLogPathIsStdErr: false };
		    }
		    if (typeof mongodbLogPath === 'object' && typeof mongodbLogPath?.write === 'function') {
		        return { mongodbLogPath: mongodbLogPath, mongodbLogPathIsStdErr: false };
		    }
		    if (MONGODB_LOG_PATH && /^stderr$/i.test(MONGODB_LOG_PATH)) {
		        return { mongodbLogPath: createStdioLogger(process.stderr), mongodbLogPathIsStdErr: true };
		    }
		    if (MONGODB_LOG_PATH && /^stdout$/i.test(MONGODB_LOG_PATH)) {
		        return { mongodbLogPath: createStdioLogger(process.stdout), mongodbLogPathIsStdErr: false };
		    }
		    return { mongodbLogPath: createStdioLogger(process.stderr), mongodbLogPathIsStdErr: true };
		}
		function resolveSeverityConfiguration(clientOption, environmentOption, defaultSeverity) {
		    return (parseSeverityFromString(clientOption) ??
		        parseSeverityFromString(environmentOption) ??
		        defaultSeverity);
		}
		function compareSeverity(s0, s1) {
		    const s0Num = exports.SEVERITY_LEVEL_MAP.getNumericSeverityLevel(s0);
		    const s1Num = exports.SEVERITY_LEVEL_MAP.getNumericSeverityLevel(s1);
		    return s0Num < s1Num ? -1 : s0Num > s1Num ? 1 : 0;
		}
		/** @internal */
		function stringifyWithMaxLen(value, maxDocumentLength, options = {}) {
		    let strToTruncate = '';
		    let currentLength = 0;
		    const maxDocumentLengthEnsurer = function maxDocumentLengthEnsurer(key, value) {
		        if (currentLength >= maxDocumentLength) {
		            return undefined;
		        }
		        // Account for root document
		        if (key === '') {
		            // Account for starting brace
		            currentLength += 1;
		            return value;
		        }
		        // +4 accounts for 2 quotation marks, colon and comma after value
		        // Note that this potentially undercounts since it does not account for escape sequences which
		        // will have an additional backslash added to them once passed through JSON.stringify.
		        currentLength += key.length + 4;
		        if (value == null)
		            return value;
		        switch (typeof value) {
		            case 'string':
		                // +2 accounts for quotes
		                // Note that this potentially undercounts similarly to the key length calculation
		                currentLength += value.length + 2;
		                break;
		            case 'number':
		            case 'bigint':
		                currentLength += String(value).length;
		                break;
		            case 'boolean':
		                currentLength += value ? 4 : 5;
		                break;
		            case 'object':
		                if ((0, utils_1.isUint8Array)(value)) {
		                    // '{"$binary":{"base64":"<base64 string>","subType":"XX"}}'
		                    // This is an estimate based on the fact that the base64 is approximately 1.33x the length of
		                    // the actual binary sequence https://en.wikipedia.org/wiki/Base64
		                    currentLength += (22 + value.byteLength + value.byteLength * 0.33 + 18) | 0;
		                }
		                else if ('_bsontype' in value) {
		                    const v = value;
		                    switch (v._bsontype) {
		                        case 'Int32':
		                            currentLength += String(v.value).length;
		                            break;
		                        case 'Double':
		                            // Account for representing integers as <value>.0
		                            currentLength +=
		                                (v.value | 0) === v.value ? String(v.value).length + 2 : String(v.value).length;
		                            break;
		                        case 'Long':
		                            currentLength += v.toString().length;
		                            break;
		                        case 'ObjectId':
		                            // '{"$oid":"XXXXXXXXXXXXXXXXXXXXXXXX"}'
		                            currentLength += 35;
		                            break;
		                        case 'MaxKey':
		                        case 'MinKey':
		                            // '{"$maxKey":1}' or '{"$minKey":1}'
		                            currentLength += 13;
		                            break;
		                        case 'Binary':
		                            // '{"$binary":{"base64":"<base64 string>","subType":"XX"}}'
		                            // This is an estimate based on the fact that the base64 is approximately 1.33x the length of
		                            // the actual binary sequence https://en.wikipedia.org/wiki/Base64
		                            currentLength += (22 + value.position + value.position * 0.33 + 18) | 0;
		                            break;
		                        case 'Timestamp':
		                            // '{"$timestamp":{"t":<t>,"i":<i>}}'
		                            currentLength += 19 + String(v.t).length + 5 + String(v.i).length + 2;
		                            break;
		                        case 'Code':
		                            // '{"$code":"<code>"}' or '{"$code":"<code>","$scope":<scope>}'
		                            if (v.scope == null) {
		                                currentLength += v.code.length + 10 + 2;
		                            }
		                            else {
		                                // Ignoring actual scope object, so this undercounts by a significant amount
		                                currentLength += v.code.length + 10 + 11;
		                            }
		                            break;
		                        case 'BSONRegExp':
		                            // '{"$regularExpression":{"pattern":"<pattern>","options":"<options>"}}'
		                            currentLength += 34 + v.pattern.length + 13 + v.options.length + 3;
		                            break;
		                    }
		                }
		        }
		        return value;
		    };
		    if (typeof value === 'string') {
		        strToTruncate = value;
		    }
		    else if (typeof value === 'function') {
		        strToTruncate = value.name;
		    }
		    else {
		        try {
		            if (maxDocumentLength !== 0) {
		                strToTruncate = bson_1.EJSON.stringify(value, maxDocumentLengthEnsurer, 0, options);
		            }
		            else {
		                strToTruncate = bson_1.EJSON.stringify(value, options);
		            }
		        }
		        catch (e) {
		            strToTruncate = `Extended JSON serialization failed with: ${e.message}`;
		        }
		    }
		    // handle truncation that occurs in the middle of multi-byte codepoints
		    if (maxDocumentLength !== 0 &&
		        strToTruncate.length > maxDocumentLength &&
		        strToTruncate.charCodeAt(maxDocumentLength - 1) !==
		            strToTruncate.codePointAt(maxDocumentLength - 1)) {
		        maxDocumentLength--;
		        if (maxDocumentLength === 0) {
		            return '';
		        }
		    }
		    return maxDocumentLength !== 0 && strToTruncate.length > maxDocumentLength
		        ? `${strToTruncate.slice(0, maxDocumentLength)}...`
		        : strToTruncate;
		}
		function isLogConvertible(obj) {
		    const objAsLogConvertible = obj;
		    // eslint-disable-next-line no-restricted-syntax
		    return objAsLogConvertible.toLog !== undefined && typeof objAsLogConvertible.toLog === 'function';
		}
		function attachServerSelectionFields(log, serverSelectionEvent, maxDocumentLength = exports.DEFAULT_MAX_DOCUMENT_LENGTH) {
		    const { selector, operation, topologyDescription, message } = serverSelectionEvent;
		    log.selector = stringifyWithMaxLen(selector, maxDocumentLength);
		    log.operation = operation;
		    log.topologyDescription = stringifyWithMaxLen(topologyDescription, maxDocumentLength);
		    log.message = message;
		    return log;
		}
		function attachCommandFields(log, commandEvent) {
		    log.commandName = commandEvent.commandName;
		    log.requestId = commandEvent.requestId;
		    log.driverConnectionId = commandEvent.connectionId;
		    const { host, port } = utils_1.HostAddress.fromString(commandEvent.address).toHostPort();
		    log.serverHost = host;
		    log.serverPort = port;
		    if (commandEvent?.serviceId) {
		        log.serviceId = commandEvent.serviceId.toHexString();
		    }
		    log.databaseName = commandEvent.databaseName;
		    log.serverConnectionId = commandEvent.serverConnectionId;
		    return log;
		}
		function attachConnectionFields(log, event) {
		    const { host, port } = utils_1.HostAddress.fromString(event.address).toHostPort();
		    log.serverHost = host;
		    log.serverPort = port;
		    return log;
		}
		function attachSDAMFields(log, sdamEvent) {
		    log.topologyId = sdamEvent.topologyId;
		    return log;
		}
		function attachServerHeartbeatFields(log, serverHeartbeatEvent) {
		    const { awaited, connectionId } = serverHeartbeatEvent;
		    log.awaited = awaited;
		    log.driverConnectionId = serverHeartbeatEvent.connectionId;
		    const { host, port } = utils_1.HostAddress.fromString(connectionId).toHostPort();
		    log.serverHost = host;
		    log.serverPort = port;
		    return log;
		}
		/** @internal */
		function defaultLogTransform(logObject, maxDocumentLength = exports.DEFAULT_MAX_DOCUMENT_LENGTH) {
		    let log = Object.create(null);
		    switch (logObject.name) {
		        case constants_1.SERVER_SELECTION_STARTED:
		            log = attachServerSelectionFields(log, logObject, maxDocumentLength);
		            return log;
		        case constants_1.SERVER_SELECTION_FAILED:
		            log = attachServerSelectionFields(log, logObject, maxDocumentLength);
		            log.failure = logObject.failure?.message;
		            return log;
		        case constants_1.SERVER_SELECTION_SUCCEEDED:
		            log = attachServerSelectionFields(log, logObject, maxDocumentLength);
		            log.serverHost = logObject.serverHost;
		            log.serverPort = logObject.serverPort;
		            return log;
		        case constants_1.WAITING_FOR_SUITABLE_SERVER:
		            log = attachServerSelectionFields(log, logObject, maxDocumentLength);
		            log.remainingTimeMS = logObject.remainingTimeMS;
		            return log;
		        case constants_1.COMMAND_STARTED:
		            log = attachCommandFields(log, logObject);
		            log.message = 'Command started';
		            log.command = stringifyWithMaxLen(logObject.command, maxDocumentLength, { relaxed: true });
		            log.databaseName = logObject.databaseName;
		            return log;
		        case constants_1.COMMAND_SUCCEEDED:
		            log = attachCommandFields(log, logObject);
		            log.message = 'Command succeeded';
		            log.durationMS = logObject.duration;
		            log.reply = stringifyWithMaxLen(logObject.reply, maxDocumentLength, { relaxed: true });
		            return log;
		        case constants_1.COMMAND_FAILED:
		            log = attachCommandFields(log, logObject);
		            log.message = 'Command failed';
		            log.durationMS = logObject.duration;
		            log.failure = logObject.failure?.message ?? '(redacted)';
		            return log;
		        case constants_1.CONNECTION_POOL_CREATED:
		            log = attachConnectionFields(log, logObject);
		            log.message = 'Connection pool created';
		            if (logObject.options) {
		                const { maxIdleTimeMS, minPoolSize, maxPoolSize, maxConnecting, waitQueueTimeoutMS } = logObject.options;
		                log = {
		                    ...log,
		                    maxIdleTimeMS,
		                    minPoolSize,
		                    maxPoolSize,
		                    maxConnecting,
		                    waitQueueTimeoutMS
		                };
		            }
		            return log;
		        case constants_1.CONNECTION_POOL_READY:
		            log = attachConnectionFields(log, logObject);
		            log.message = 'Connection pool ready';
		            return log;
		        case constants_1.CONNECTION_POOL_CLEARED:
		            log = attachConnectionFields(log, logObject);
		            log.message = 'Connection pool cleared';
		            if (logObject.serviceId?._bsontype === 'ObjectId') {
		                log.serviceId = logObject.serviceId?.toHexString();
		            }
		            return log;
		        case constants_1.CONNECTION_POOL_CLOSED:
		            log = attachConnectionFields(log, logObject);
		            log.message = 'Connection pool closed';
		            return log;
		        case constants_1.CONNECTION_CREATED:
		            log = attachConnectionFields(log, logObject);
		            log.message = 'Connection created';
		            log.driverConnectionId = logObject.connectionId;
		            return log;
		        case constants_1.CONNECTION_READY:
		            log = attachConnectionFields(log, logObject);
		            log.message = 'Connection ready';
		            log.driverConnectionId = logObject.connectionId;
		            log.durationMS = logObject.durationMS;
		            return log;
		        case constants_1.CONNECTION_CLOSED:
		            log = attachConnectionFields(log, logObject);
		            log.message = 'Connection closed';
		            log.driverConnectionId = logObject.connectionId;
		            switch (logObject.reason) {
		                case 'stale':
		                    log.reason = 'Connection became stale because the pool was cleared';
		                    break;
		                case 'idle':
		                    log.reason =
		                        'Connection has been available but unused for longer than the configured max idle time';
		                    break;
		                case 'error':
		                    log.reason = 'An error occurred while using the connection';
		                    if (logObject.error) {
		                        log.error = logObject.error;
		                    }
		                    break;
		                case 'poolClosed':
		                    log.reason = 'Connection pool was closed';
		                    break;
		                default:
		                    log.reason = `Unknown close reason: ${logObject.reason}`;
		            }
		            return log;
		        case constants_1.CONNECTION_CHECK_OUT_STARTED:
		            log = attachConnectionFields(log, logObject);
		            log.message = 'Connection checkout started';
		            return log;
		        case constants_1.CONNECTION_CHECK_OUT_FAILED:
		            log = attachConnectionFields(log, logObject);
		            log.message = 'Connection checkout failed';
		            switch (logObject.reason) {
		                case 'poolClosed':
		                    log.reason = 'Connection pool was closed';
		                    break;
		                case 'timeout':
		                    log.reason = 'Wait queue timeout elapsed without a connection becoming available';
		                    break;
		                case 'connectionError':
		                    log.reason = 'An error occurred while trying to establish a new connection';
		                    if (logObject.error) {
		                        log.error = logObject.error;
		                    }
		                    break;
		                default:
		                    log.reason = `Unknown close reason: ${logObject.reason}`;
		            }
		            log.durationMS = logObject.durationMS;
		            return log;
		        case constants_1.CONNECTION_CHECKED_OUT:
		            log = attachConnectionFields(log, logObject);
		            log.message = 'Connection checked out';
		            log.driverConnectionId = logObject.connectionId;
		            log.durationMS = logObject.durationMS;
		            return log;
		        case constants_1.CONNECTION_CHECKED_IN:
		            log = attachConnectionFields(log, logObject);
		            log.message = 'Connection checked in';
		            log.driverConnectionId = logObject.connectionId;
		            return log;
		        case constants_1.SERVER_OPENING:
		            log = attachSDAMFields(log, logObject);
		            log = attachConnectionFields(log, logObject);
		            log.message = 'Starting server monitoring';
		            return log;
		        case constants_1.SERVER_CLOSED:
		            log = attachSDAMFields(log, logObject);
		            log = attachConnectionFields(log, logObject);
		            log.message = 'Stopped server monitoring';
		            return log;
		        case constants_1.SERVER_HEARTBEAT_STARTED:
		            log = attachSDAMFields(log, logObject);
		            log = attachServerHeartbeatFields(log, logObject);
		            log.message = 'Server heartbeat started';
		            return log;
		        case constants_1.SERVER_HEARTBEAT_SUCCEEDED:
		            log = attachSDAMFields(log, logObject);
		            log = attachServerHeartbeatFields(log, logObject);
		            log.message = 'Server heartbeat succeeded';
		            log.durationMS = logObject.duration;
		            log.serverConnectionId = logObject.serverConnectionId;
		            log.reply = stringifyWithMaxLen(logObject.reply, maxDocumentLength, { relaxed: true });
		            return log;
		        case constants_1.SERVER_HEARTBEAT_FAILED:
		            log = attachSDAMFields(log, logObject);
		            log = attachServerHeartbeatFields(log, logObject);
		            log.message = 'Server heartbeat failed';
		            log.durationMS = logObject.duration;
		            log.failure = logObject.failure?.message;
		            return log;
		        case constants_1.TOPOLOGY_OPENING:
		            log = attachSDAMFields(log, logObject);
		            log.message = 'Starting topology monitoring';
		            return log;
		        case constants_1.TOPOLOGY_CLOSED:
		            log = attachSDAMFields(log, logObject);
		            log.message = 'Stopped topology monitoring';
		            return log;
		        case constants_1.TOPOLOGY_DESCRIPTION_CHANGED:
		            log = attachSDAMFields(log, logObject);
		            log.message = 'Topology description changed';
		            log.previousDescription = log.reply = stringifyWithMaxLen(logObject.previousDescription, maxDocumentLength);
		            log.newDescription = log.reply = stringifyWithMaxLen(logObject.newDescription, maxDocumentLength);
		            return log;
		        default:
		            for (const [key, value] of Object.entries(logObject)) {
		                if (value != null)
		                    log[key] = value;
		            }
		    }
		    return log;
		}
		/** @internal */
		class MongoLogger {
		    constructor(options) {
		        this.pendingLog = null;
		        /**
		         * This method should be used when logging errors that do not have a public driver API for
		         * reporting errors.
		         */
		        this.error = this.log.bind(this, 'error');
		        /**
		         * This method should be used to log situations where undesirable application behaviour might
		         * occur. For example, failing to end sessions on `MongoClient.close`.
		         */
		        this.warn = this.log.bind(this, 'warn');
		        /**
		         * This method should be used to report high-level information about normal driver behaviour.
		         * For example, the creation of a `MongoClient`.
		         */
		        this.info = this.log.bind(this, 'info');
		        /**
		         * This method should be used to report information that would be helpful when debugging an
		         * application. For example, a command starting, succeeding or failing.
		         */
		        this.debug = this.log.bind(this, 'debug');
		        /**
		         * This method should be used to report fine-grained details related to logic flow. For example,
		         * entering and exiting a function body.
		         */
		        this.trace = this.log.bind(this, 'trace');
		        this.componentSeverities = options.componentSeverities;
		        this.maxDocumentLength = options.maxDocumentLength;
		        this.logDestination = options.logDestination;
		        this.logDestinationIsStdErr = options.logDestinationIsStdErr;
		        this.severities = this.createLoggingSeverities();
		    }
		    createLoggingSeverities() {
		        const severities = Object();
		        for (const component of Object.values(exports.MongoLoggableComponent)) {
		            severities[component] = {};
		            for (const severityLevel of Object.values(exports.SeverityLevel)) {
		                severities[component][severityLevel] =
		                    compareSeverity(severityLevel, this.componentSeverities[component]) <= 0;
		            }
		        }
		        return severities;
		    }
		    turnOffSeverities() {
		        for (const component of Object.values(exports.MongoLoggableComponent)) {
		            this.componentSeverities[component] = exports.SeverityLevel.OFF;
		            for (const severityLevel of Object.values(exports.SeverityLevel)) {
		                this.severities[component][severityLevel] = false;
		            }
		        }
		    }
		    logWriteFailureHandler(error) {
		        if (this.logDestinationIsStdErr) {
		            this.turnOffSeverities();
		            this.clearPendingLog();
		            return;
		        }
		        this.logDestination = createStdioLogger(process.stderr);
		        this.logDestinationIsStdErr = true;
		        this.clearPendingLog();
		        this.error(exports.MongoLoggableComponent.CLIENT, {
		            toLog: function () {
		                return {
		                    message: 'User input for mongodbLogPath is now invalid. Logging is halted.',
		                    error: error.message
		                };
		            }
		        });
		        this.turnOffSeverities();
		        this.clearPendingLog();
		    }
		    clearPendingLog() {
		        this.pendingLog = null;
		    }
		    willLog(component, severity) {
		        if (severity === exports.SeverityLevel.OFF)
		            return false;
		        return this.severities[component][severity];
		    }
		    log(severity, component, message) {
		        if (!this.willLog(component, severity))
		            return;
		        let logMessage = { t: new Date(), c: component, s: severity };
		        if (typeof message === 'string') {
		            logMessage.message = message;
		        }
		        else if (typeof message === 'object') {
		            if (isLogConvertible(message)) {
		                logMessage = { ...logMessage, ...message.toLog() };
		            }
		            else {
		                logMessage = { ...logMessage, ...defaultLogTransform(message, this.maxDocumentLength) };
		            }
		        }
		        if ((0, utils_1.isPromiseLike)(this.pendingLog)) {
		            this.pendingLog = this.pendingLog
		                .then(() => this.logDestination.write(logMessage))
		                .then(this.clearPendingLog.bind(this), this.logWriteFailureHandler.bind(this));
		            return;
		        }
		        try {
		            const logResult = this.logDestination.write(logMessage);
		            if ((0, utils_1.isPromiseLike)(logResult)) {
		                this.pendingLog = logResult.then(this.clearPendingLog.bind(this), this.logWriteFailureHandler.bind(this));
		            }
		        }
		        catch (error) {
		            this.logWriteFailureHandler(error);
		        }
		    }
		    /**
		     * Merges options set through environment variables and the MongoClient, preferring environment
		     * variables when both are set, and substituting defaults for values not set. Options set in
		     * constructor take precedence over both environment variables and MongoClient options.
		     *
		     * @remarks
		     * When parsing component severity levels, invalid values are treated as unset and replaced with
		     * the default severity.
		     *
		     * @param envOptions - options set for the logger from the environment
		     * @param clientOptions - options set for the logger in the MongoClient options
		     * @returns a MongoLoggerOptions object to be used when instantiating a new MongoLogger
		     */
		    static resolveOptions(envOptions, clientOptions) {
		        // client options take precedence over env options
		        const resolvedLogPath = resolveLogPath(envOptions, clientOptions);
		        const combinedOptions = {
		            ...envOptions,
		            ...clientOptions,
		            mongodbLogPath: resolvedLogPath.mongodbLogPath,
		            mongodbLogPathIsStdErr: resolvedLogPath.mongodbLogPathIsStdErr
		        };
		        const defaultSeverity = resolveSeverityConfiguration(combinedOptions.mongodbLogComponentSeverities?.default, combinedOptions.MONGODB_LOG_ALL, exports.SeverityLevel.OFF);
		        return {
		            componentSeverities: {
		                command: resolveSeverityConfiguration(combinedOptions.mongodbLogComponentSeverities?.command, combinedOptions.MONGODB_LOG_COMMAND, defaultSeverity),
		                topology: resolveSeverityConfiguration(combinedOptions.mongodbLogComponentSeverities?.topology, combinedOptions.MONGODB_LOG_TOPOLOGY, defaultSeverity),
		                serverSelection: resolveSeverityConfiguration(combinedOptions.mongodbLogComponentSeverities?.serverSelection, combinedOptions.MONGODB_LOG_SERVER_SELECTION, defaultSeverity),
		                connection: resolveSeverityConfiguration(combinedOptions.mongodbLogComponentSeverities?.connection, combinedOptions.MONGODB_LOG_CONNECTION, defaultSeverity),
		                client: resolveSeverityConfiguration(combinedOptions.mongodbLogComponentSeverities?.client, combinedOptions.MONGODB_LOG_CLIENT, defaultSeverity),
		                default: defaultSeverity
		            },
		            maxDocumentLength: combinedOptions.mongodbLogMaxDocumentLength ??
		                (0, utils_1.parseUnsignedInteger)(combinedOptions.MONGODB_LOG_MAX_DOCUMENT_LENGTH) ??
		                1000,
		            logDestination: combinedOptions.mongodbLogPath,
		            logDestinationIsStdErr: combinedOptions.mongodbLogPathIsStdErr
		        };
		    }
		}
		exports.MongoLogger = MongoLogger;
		
	} (mongo_logger));
	return mongo_logger;
}

var hasRequiredMongo_types;

function requireMongo_types () {
	if (hasRequiredMongo_types) return mongo_types;
	hasRequiredMongo_types = 1;
	Object.defineProperty(mongo_types, "__esModule", { value: true });
	mongo_types.CancellationToken = mongo_types.TypedEventEmitter = void 0;
	const events_1 = require$$0$2;
	const mongo_logger_1 = requireMongo_logger();
	const utils_1 = mongodb7.requireUtils();
	/**
	 * Typescript type safe event emitter
	 * @public
	 */
	// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
	class TypedEventEmitter extends events_1.EventEmitter {
	    /** @internal */
	    emitAndLog(event, ...args) {
	        this.emit(event, ...args);
	        if (this.component)
	            this.mongoLogger?.debug(this.component, args[0]);
	    }
	    /** @internal */
	    emitAndLogHeartbeat(event, topologyId, serverConnectionId, ...args) {
	        this.emit(event, ...args);
	        if (this.component) {
	            const loggableHeartbeatEvent = {
	                topologyId: topologyId,
	                serverConnectionId: serverConnectionId ?? null,
	                ...args[0]
	            };
	            this.mongoLogger?.debug(this.component, loggableHeartbeatEvent);
	        }
	    }
	    /** @internal */
	    emitAndLogCommand(monitorCommands, event, databaseName, connectionEstablished, ...args) {
	        if (monitorCommands) {
	            this.emit(event, ...args);
	        }
	        if (connectionEstablished) {
	            const loggableCommandEvent = {
	                databaseName: databaseName,
	                ...args[0]
	            };
	            this.mongoLogger?.debug(mongo_logger_1.MongoLoggableComponent.COMMAND, loggableCommandEvent);
	        }
	    }
	}
	mongo_types.TypedEventEmitter = TypedEventEmitter;
	/**
	 * @internal
	 */
	class CancellationToken extends TypedEventEmitter {
	    constructor(...args) {
	        super(...args);
	        this.on('error', utils_1.noop);
	    }
	}
	mongo_types.CancellationToken = CancellationToken;
	
	return mongo_types;
}

var get_more = {};

var hasRequiredGet_more;

function requireGet_more () {
	if (hasRequiredGet_more) return get_more;
	hasRequiredGet_more = 1;
	Object.defineProperty(get_more, "__esModule", { value: true });
	get_more.GetMoreOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const error_1 = mongodb4.requireError();
	const utils_1 = mongodb7.requireUtils();
	const operation_1 = requireOperation();
	/** @internal */
	class GetMoreOperation extends operation_1.AbstractOperation {
	    constructor(ns, cursorId, server, options) {
	        super(options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.CursorResponse;
	        this.options = options;
	        this.ns = ns;
	        this.cursorId = cursorId;
	        this.server = server;
	    }
	    get commandName() {
	        return 'getMore';
	    }
	    buildCommand(connection) {
	        if (this.cursorId == null || this.cursorId.isZero()) {
	            throw new error_1.MongoRuntimeError('Unable to iterate cursor with no id');
	        }
	        const collection = this.ns.collection;
	        if (collection == null) {
	            // Cursors should have adopted the namespace returned by MongoDB
	            // which should always defined a collection name (even a pseudo one, ex. db.aggregate())
	            throw new error_1.MongoRuntimeError('A collection name must be determined before getMore');
	        }
	        const getMoreCmd = {
	            getMore: this.cursorId,
	            collection
	        };
	        if (typeof this.options.batchSize === 'number') {
	            getMoreCmd.batchSize = Math.abs(this.options.batchSize);
	        }
	        if (typeof this.options.maxAwaitTimeMS === 'number') {
	            getMoreCmd.maxTimeMS = this.options.maxAwaitTimeMS;
	        }
	        // we check for undefined specifically here to allow falsy values
	        // eslint-disable-next-line no-restricted-syntax
	        if (this.options.comment !== undefined && (0, utils_1.maxWireVersion)(connection) >= 9) {
	            getMoreCmd.comment = this.options.comment;
	        }
	        return getMoreCmd;
	    }
	    buildOptions(timeoutContext) {
	        return {
	            returnFieldSelector: null,
	            documentsReturnedIn: 'nextBatch',
	            timeoutContext,
	            ...this.options
	        };
	    }
	    handleOk(response) {
	        return response;
	    }
	}
	get_more.GetMoreOperation = GetMoreOperation;
	(0, operation_1.defineAspects)(GetMoreOperation, [operation_1.Aspect.READ_OPERATION, operation_1.Aspect.MUST_SELECT_SAME_SERVER]);
	
	return get_more;
}

var kill_cursors = {};

var hasRequiredKill_cursors;

function requireKill_cursors () {
	if (hasRequiredKill_cursors) return kill_cursors;
	hasRequiredKill_cursors = 1;
	Object.defineProperty(kill_cursors, "__esModule", { value: true });
	kill_cursors.KillCursorsOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const error_1 = mongodb4.requireError();
	const operation_1 = requireOperation();
	class KillCursorsOperation extends operation_1.AbstractOperation {
	    constructor(cursorId, ns, server, options) {
	        super(options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.ns = ns;
	        this.cursorId = cursorId;
	        this.server = server;
	    }
	    get commandName() {
	        return 'killCursors';
	    }
	    buildCommand(_connection, _session) {
	        const killCursors = this.ns.collection;
	        if (killCursors == null) {
	            // Cursors should have adopted the namespace returned by MongoDB
	            // which should always defined a collection name (even a pseudo one, ex. db.aggregate())
	            throw new error_1.MongoRuntimeError('A collection name must be determined before killCursors');
	        }
	        const killCursorsCommand = {
	            killCursors,
	            cursors: [this.cursorId]
	        };
	        return killCursorsCommand;
	    }
	    buildOptions(timeoutContext) {
	        return {
	            session: this.session,
	            timeoutContext
	        };
	    }
	    handleError(_error) {
	        // The driver should never emit errors from killCursors, this is spec-ed behavior
	    }
	}
	kill_cursors.KillCursorsOperation = KillCursorsOperation;
	(0, operation_1.defineAspects)(KillCursorsOperation, [operation_1.Aspect.MUST_SELECT_SAME_SERVER]);
	
	return kill_cursors;
}

var count = {};

var hasRequiredCount;

function requireCount () {
	if (hasRequiredCount) return count;
	hasRequiredCount = 1;
	Object.defineProperty(count, "__esModule", { value: true });
	count.CountOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const command_1 = requireCommand();
	const operation_1 = requireOperation();
	/** @internal */
	class CountOperation extends command_1.CommandOperation {
	    constructor(namespace, filter, options) {
	        super({ s: { namespace: namespace } }, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.options = options;
	        this.collectionName = namespace.collection;
	        this.query = filter;
	    }
	    get commandName() {
	        return 'count';
	    }
	    buildCommandDocument(_connection, _session) {
	        const options = this.options;
	        const cmd = {
	            count: this.collectionName,
	            query: this.query
	        };
	        if (typeof options.limit === 'number') {
	            cmd.limit = options.limit;
	        }
	        if (typeof options.skip === 'number') {
	            cmd.skip = options.skip;
	        }
	        if (options.hint != null) {
	            cmd.hint = options.hint;
	        }
	        if (typeof options.maxTimeMS === 'number') {
	            cmd.maxTimeMS = options.maxTimeMS;
	        }
	        return cmd;
	    }
	    handleOk(response) {
	        return response.getNumber('n') ?? 0;
	    }
	}
	count.CountOperation = CountOperation;
	(0, operation_1.defineAspects)(CountOperation, [operation_1.Aspect.READ_OPERATION, operation_1.Aspect.RETRYABLE, operation_1.Aspect.SUPPORTS_RAW_DATA]);
	
	return count;
}

var find = {};

var hasRequiredFind;

function requireFind () {
	if (hasRequiredFind) return find;
	hasRequiredFind = 1;
	Object.defineProperty(find, "__esModule", { value: true });
	find.FindOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const error_1 = mongodb4.requireError();
	const sort_1 = mongodb6.requireSort();
	const utils_1 = mongodb7.requireUtils();
	const command_1 = requireCommand();
	const operation_1 = requireOperation();
	/** @internal */
	class FindOperation extends command_1.CommandOperation {
	    constructor(ns, filter = {}, options = {}) {
	        super(undefined, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.CursorResponse;
	        this.options = { ...options };
	        delete this.options.writeConcern;
	        this.ns = ns;
	        if (typeof filter !== 'object' || Array.isArray(filter)) {
	            throw new error_1.MongoInvalidArgumentError('Query filter must be a plain object or ObjectId');
	        }
	        // special case passing in an ObjectId as a filter
	        this.filter = filter != null && filter._bsontype === 'ObjectId' ? { _id: filter } : filter;
	        this.SERVER_COMMAND_RESPONSE_TYPE = this.explain ? responses_1.ExplainedCursorResponse : responses_1.CursorResponse;
	    }
	    get commandName() {
	        return 'find';
	    }
	    buildOptions(timeoutContext) {
	        return {
	            ...this.options,
	            ...this.bsonOptions,
	            documentsReturnedIn: 'firstBatch',
	            session: this.session,
	            timeoutContext
	        };
	    }
	    handleOk(response) {
	        return response;
	    }
	    buildCommandDocument() {
	        return makeFindCommand(this.ns, this.filter, this.options);
	    }
	}
	find.FindOperation = FindOperation;
	function makeFindCommand(ns, filter, options) {
	    const findCommand = {
	        find: ns.collection,
	        filter
	    };
	    if (options.sort) {
	        findCommand.sort = (0, sort_1.formatSort)(options.sort);
	    }
	    if (options.projection) {
	        let projection = options.projection;
	        if (projection && Array.isArray(projection)) {
	            projection = projection.length
	                ? projection.reduce((result, field) => {
	                    result[field] = 1;
	                    return result;
	                }, {})
	                : { _id: 1 };
	        }
	        findCommand.projection = projection;
	    }
	    if (options.hint) {
	        findCommand.hint = (0, utils_1.normalizeHintField)(options.hint);
	    }
	    if (typeof options.skip === 'number') {
	        findCommand.skip = options.skip;
	    }
	    if (typeof options.limit === 'number') {
	        if (options.limit < 0) {
	            findCommand.limit = -options.limit;
	            findCommand.singleBatch = true;
	        }
	        else {
	            findCommand.limit = options.limit;
	        }
	    }
	    if (typeof options.batchSize === 'number') {
	        if (options.batchSize < 0) {
	            findCommand.limit = -options.batchSize;
	        }
	        else {
	            if (options.batchSize === options.limit) {
	                // Spec dictates that if these are equal the batchSize should be one more than the
	                // limit to avoid leaving the cursor open.
	                findCommand.batchSize = options.batchSize + 1;
	            }
	            else {
	                findCommand.batchSize = options.batchSize;
	            }
	        }
	    }
	    if (typeof options.singleBatch === 'boolean') {
	        findCommand.singleBatch = options.singleBatch;
	    }
	    // we check for undefined specifically here to allow falsy values
	    // eslint-disable-next-line no-restricted-syntax
	    if (options.comment !== undefined) {
	        findCommand.comment = options.comment;
	    }
	    if (options.max) {
	        findCommand.max = options.max;
	    }
	    if (options.min) {
	        findCommand.min = options.min;
	    }
	    if (typeof options.returnKey === 'boolean') {
	        findCommand.returnKey = options.returnKey;
	    }
	    if (typeof options.showRecordId === 'boolean') {
	        findCommand.showRecordId = options.showRecordId;
	    }
	    if (typeof options.tailable === 'boolean') {
	        findCommand.tailable = options.tailable;
	    }
	    if (typeof options.oplogReplay === 'boolean') {
	        findCommand.oplogReplay = options.oplogReplay;
	    }
	    if (typeof options.timeout === 'boolean') {
	        findCommand.noCursorTimeout = !options.timeout;
	    }
	    else if (typeof options.noCursorTimeout === 'boolean') {
	        findCommand.noCursorTimeout = options.noCursorTimeout;
	    }
	    if (typeof options.awaitData === 'boolean') {
	        findCommand.awaitData = options.awaitData;
	    }
	    if (typeof options.allowPartialResults === 'boolean') {
	        findCommand.allowPartialResults = options.allowPartialResults;
	    }
	    if (typeof options.allowDiskUse === 'boolean') {
	        findCommand.allowDiskUse = options.allowDiskUse;
	    }
	    if (options.let) {
	        findCommand.let = options.let;
	    }
	    return findCommand;
	}
	(0, operation_1.defineAspects)(FindOperation, [
	    operation_1.Aspect.READ_OPERATION,
	    operation_1.Aspect.RETRYABLE,
	    operation_1.Aspect.EXPLAINABLE,
	    operation_1.Aspect.CURSOR_CREATING,
	    operation_1.Aspect.SUPPORTS_RAW_DATA
	]);
	
	return find;
}

var indexes = {};

var hasRequiredIndexes;

function requireIndexes () {
	if (hasRequiredIndexes) return indexes;
	hasRequiredIndexes = 1;
	Object.defineProperty(indexes, "__esModule", { value: true });
	indexes.ListIndexesOperation = indexes.DropIndexOperation = indexes.CreateIndexesOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const error_1 = mongodb4.requireError();
	const utils_1 = mongodb7.requireUtils();
	const command_1 = requireCommand();
	const operation_1 = requireOperation();
	const VALID_INDEX_OPTIONS = new Set([
	    'background',
	    'unique',
	    'name',
	    'partialFilterExpression',
	    'sparse',
	    'hidden',
	    'expireAfterSeconds',
	    'storageEngine',
	    'collation',
	    'version',
	    // text indexes
	    'weights',
	    'default_language',
	    'language_override',
	    'textIndexVersion',
	    // 2d-sphere indexes
	    '2dsphereIndexVersion',
	    // 2d indexes
	    'bits',
	    'min',
	    'max',
	    // geoHaystack Indexes
	    'bucketSize',
	    // wildcard indexes
	    'wildcardProjection'
	]);
	function isIndexDirection(x) {
	    return (typeof x === 'number' || x === '2d' || x === '2dsphere' || x === 'text' || x === 'geoHaystack');
	}
	function isSingleIndexTuple(t) {
	    return Array.isArray(t) && t.length === 2 && isIndexDirection(t[1]);
	}
	/**
	 * Converts an `IndexSpecification`, which can be specified in multiple formats, into a
	 * valid `key` for the createIndexes command.
	 */
	function constructIndexDescriptionMap(indexSpec) {
	    const key = new Map();
	    const indexSpecs = !Array.isArray(indexSpec) || isSingleIndexTuple(indexSpec) ? [indexSpec] : indexSpec;
	    // Iterate through array and handle different types
	    for (const spec of indexSpecs) {
	        if (typeof spec === 'string') {
	            key.set(spec, 1);
	        }
	        else if (Array.isArray(spec)) {
	            key.set(spec[0], spec[1] ?? 1);
	        }
	        else if (spec instanceof Map) {
	            for (const [property, value] of spec) {
	                key.set(property, value);
	            }
	        }
	        else if ((0, utils_1.isObject)(spec)) {
	            for (const [property, value] of Object.entries(spec)) {
	                key.set(property, value);
	            }
	        }
	    }
	    return key;
	}
	/**
	 * Receives an index description and returns a modified index description which has had invalid options removed
	 * from the description and has mapped the `version` option to the `v` option.
	 */
	function resolveIndexDescription(description) {
	    const validProvidedOptions = Object.entries(description).filter(([optionName]) => VALID_INDEX_OPTIONS.has(optionName));
	    return Object.fromEntries(
	    // we support the `version` option, but the `createIndexes` command expects it to be the `v`
	    validProvidedOptions.map(([name, value]) => (name === 'version' ? ['v', value] : [name, value])));
	}
	/** @internal */
	class CreateIndexesOperation extends command_1.CommandOperation {
	    constructor(parent, collectionName, indexes, options) {
	        super(parent, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.options = options ?? {};
	        // collation is set on each index, it should not be defined at the root
	        this.options.collation = undefined;
	        this.collectionName = collectionName;
	        this.indexes = indexes.map((userIndex) => {
	            // Ensure the key is a Map to preserve index key ordering
	            const key = userIndex.key instanceof Map ? userIndex.key : new Map(Object.entries(userIndex.key));
	            const name = userIndex.name ?? Array.from(key).flat().join('_');
	            const validIndexOptions = resolveIndexDescription(userIndex);
	            return {
	                ...validIndexOptions,
	                name,
	                key
	            };
	        });
	        this.ns = parent.s.namespace;
	    }
	    static fromIndexDescriptionArray(parent, collectionName, indexes, options) {
	        return new CreateIndexesOperation(parent, collectionName, indexes, options);
	    }
	    static fromIndexSpecification(parent, collectionName, indexSpec, options = {}) {
	        const key = constructIndexDescriptionMap(indexSpec);
	        const description = { ...options, key };
	        return new CreateIndexesOperation(parent, collectionName, [description], options);
	    }
	    get commandName() {
	        return 'createIndexes';
	    }
	    buildCommandDocument(connection) {
	        const options = this.options;
	        const indexes = this.indexes;
	        const serverWireVersion = (0, utils_1.maxWireVersion)(connection);
	        const cmd = { createIndexes: this.collectionName, indexes };
	        if (options.commitQuorum != null) {
	            if (serverWireVersion < 9) {
	                throw new error_1.MongoCompatibilityError('Option `commitQuorum` for `createIndexes` not supported on servers < 4.4');
	            }
	            cmd.commitQuorum = options.commitQuorum;
	        }
	        return cmd;
	    }
	    handleOk(_response) {
	        const indexNames = this.indexes.map(index => index.name || '');
	        return indexNames;
	    }
	}
	indexes.CreateIndexesOperation = CreateIndexesOperation;
	/** @internal */
	class DropIndexOperation extends command_1.CommandOperation {
	    constructor(collection, indexName, options) {
	        super(collection, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.options = options ?? {};
	        this.collection = collection;
	        this.indexName = indexName;
	        this.ns = collection.fullNamespace;
	    }
	    get commandName() {
	        return 'dropIndexes';
	    }
	    buildCommandDocument(_connection) {
	        return { dropIndexes: this.collection.collectionName, index: this.indexName };
	    }
	}
	indexes.DropIndexOperation = DropIndexOperation;
	/** @internal */
	class ListIndexesOperation extends command_1.CommandOperation {
	    constructor(collection, options) {
	        super(collection, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.CursorResponse;
	        this.options = { ...options };
	        delete this.options.writeConcern;
	        this.collectionNamespace = collection.s.namespace;
	    }
	    get commandName() {
	        return 'listIndexes';
	    }
	    buildCommandDocument(connection) {
	        const serverWireVersion = (0, utils_1.maxWireVersion)(connection);
	        const cursor = this.options.batchSize ? { batchSize: this.options.batchSize } : {};
	        const command = { listIndexes: this.collectionNamespace.collection, cursor };
	        // we check for undefined specifically here to allow falsy values
	        // eslint-disable-next-line no-restricted-syntax
	        if (serverWireVersion >= 9 && this.options.comment !== undefined) {
	            command.comment = this.options.comment;
	        }
	        return command;
	    }
	    handleOk(response) {
	        return response;
	    }
	}
	indexes.ListIndexesOperation = ListIndexesOperation;
	(0, operation_1.defineAspects)(ListIndexesOperation, [
	    operation_1.Aspect.READ_OPERATION,
	    operation_1.Aspect.RETRYABLE,
	    operation_1.Aspect.CURSOR_CREATING,
	    operation_1.Aspect.SUPPORTS_RAW_DATA
	]);
	(0, operation_1.defineAspects)(CreateIndexesOperation, [operation_1.Aspect.WRITE_OPERATION, operation_1.Aspect.SUPPORTS_RAW_DATA]);
	(0, operation_1.defineAspects)(DropIndexOperation, [operation_1.Aspect.WRITE_OPERATION, operation_1.Aspect.SUPPORTS_RAW_DATA]);
	
	return indexes;
}

var distinct = {};

var hasRequiredDistinct;

function requireDistinct () {
	if (hasRequiredDistinct) return distinct;
	hasRequiredDistinct = 1;
	Object.defineProperty(distinct, "__esModule", { value: true });
	distinct.DistinctOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const command_1 = requireCommand();
	const operation_1 = requireOperation();
	/**
	 * Return a list of distinct values for the given key across a collection.
	 * @internal
	 */
	class DistinctOperation extends command_1.CommandOperation {
	    /**
	     * Construct a Distinct operation.
	     *
	     * @param collection - Collection instance.
	     * @param key - Field of the document to find distinct values for.
	     * @param query - The query for filtering the set of documents to which we apply the distinct filter.
	     * @param options - Optional settings. See Collection.prototype.distinct for a list of options.
	     */
	    constructor(collection, key, query, options) {
	        super(collection, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.options = options ?? {};
	        this.collection = collection;
	        this.key = key;
	        this.query = query;
	    }
	    get commandName() {
	        return 'distinct';
	    }
	    buildCommandDocument(_connection) {
	        const command = {
	            distinct: this.collection.collectionName,
	            key: this.key,
	            query: this.query
	        };
	        // we check for undefined specifically here to allow falsy values
	        // eslint-disable-next-line no-restricted-syntax
	        if (this.options.comment !== undefined) {
	            command.comment = this.options.comment;
	        }
	        if (this.options.hint != null) {
	            command.hint = this.options.hint;
	        }
	        return command;
	    }
	    handleOk(response) {
	        if (this.explain) {
	            return response.toObject(this.bsonOptions);
	        }
	        return response.toObject(this.bsonOptions).values;
	    }
	}
	distinct.DistinctOperation = DistinctOperation;
	(0, operation_1.defineAspects)(DistinctOperation, [
	    operation_1.Aspect.READ_OPERATION,
	    operation_1.Aspect.RETRYABLE,
	    operation_1.Aspect.EXPLAINABLE,
	    operation_1.Aspect.SUPPORTS_RAW_DATA
	]);
	
	return distinct;
}

var estimated_document_count = {};

var hasRequiredEstimated_document_count;

function requireEstimated_document_count () {
	if (hasRequiredEstimated_document_count) return estimated_document_count;
	hasRequiredEstimated_document_count = 1;
	Object.defineProperty(estimated_document_count, "__esModule", { value: true });
	estimated_document_count.EstimatedDocumentCountOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const command_1 = requireCommand();
	const operation_1 = requireOperation();
	/** @internal */
	class EstimatedDocumentCountOperation extends command_1.CommandOperation {
	    constructor(collection, options = {}) {
	        super(collection, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.options = options;
	        this.collectionName = collection.collectionName;
	    }
	    get commandName() {
	        return 'count';
	    }
	    buildCommandDocument(_connection, _session) {
	        const cmd = { count: this.collectionName };
	        if (typeof this.options.maxTimeMS === 'number') {
	            cmd.maxTimeMS = this.options.maxTimeMS;
	        }
	        // we check for undefined specifically here to allow falsy values
	        // eslint-disable-next-line no-restricted-syntax
	        if (this.options.comment !== undefined) {
	            cmd.comment = this.options.comment;
	        }
	        return cmd;
	    }
	    handleOk(response) {
	        return response.getNumber('n') ?? 0;
	    }
	}
	estimated_document_count.EstimatedDocumentCountOperation = EstimatedDocumentCountOperation;
	(0, operation_1.defineAspects)(EstimatedDocumentCountOperation, [
	    operation_1.Aspect.READ_OPERATION,
	    operation_1.Aspect.RETRYABLE,
	    operation_1.Aspect.CURSOR_CREATING,
	    operation_1.Aspect.SUPPORTS_RAW_DATA
	]);
	
	return estimated_document_count;
}

var find_and_modify = {};

var hasRequiredFind_and_modify;

function requireFind_and_modify () {
	if (hasRequiredFind_and_modify) return find_and_modify;
	hasRequiredFind_and_modify = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.FindOneAndUpdateOperation = exports.FindOneAndReplaceOperation = exports.FindOneAndDeleteOperation = exports.FindAndModifyOperation = exports.ReturnDocument = void 0;
		const responses_1 = mongodb3.requireResponses();
		const error_1 = mongodb4.requireError();
		const read_preference_1 = requireRead_preference();
		const sort_1 = mongodb6.requireSort();
		const utils_1 = mongodb7.requireUtils();
		const command_1 = requireCommand();
		const operation_1 = requireOperation();
		/** @public */
		exports.ReturnDocument = Object.freeze({
		    BEFORE: 'before',
		    AFTER: 'after'
		});
		function configureFindAndModifyCmdBaseUpdateOpts(cmdBase, options) {
		    cmdBase.new = options.returnDocument === exports.ReturnDocument.AFTER;
		    cmdBase.upsert = options.upsert === true;
		    if (options.bypassDocumentValidation === true) {
		        cmdBase.bypassDocumentValidation = options.bypassDocumentValidation;
		    }
		    return cmdBase;
		}
		/** @internal */
		class FindAndModifyOperation extends command_1.CommandOperation {
		    constructor(collection, query, options) {
		        super(collection, options);
		        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
		        this.options = options;
		        // force primary read preference
		        this.readPreference = read_preference_1.ReadPreference.primary;
		        this.collection = collection;
		        this.query = query;
		    }
		    get commandName() {
		        return 'findAndModify';
		    }
		    buildCommandDocument(connection, _session) {
		        const options = this.options;
		        const command = {
		            findAndModify: this.collection.collectionName,
		            query: this.query,
		            remove: false,
		            new: false,
		            upsert: false
		        };
		        options.includeResultMetadata ??= false;
		        const sort = (0, sort_1.formatSort)(options.sort);
		        if (sort) {
		            command.sort = sort;
		        }
		        if (options.projection) {
		            command.fields = options.projection;
		        }
		        if (options.maxTimeMS) {
		            command.maxTimeMS = options.maxTimeMS;
		        }
		        // Decorate the findAndModify command with the write Concern
		        if (options.writeConcern) {
		            command.writeConcern = options.writeConcern;
		        }
		        if (options.let) {
		            command.let = options.let;
		        }
		        // we check for undefined specifically here to allow falsy values
		        // eslint-disable-next-line no-restricted-syntax
		        if (options.comment !== undefined) {
		            command.comment = options.comment;
		        }
		        (0, utils_1.decorateWithCollation)(command, options);
		        if (options.hint) {
		            const unacknowledgedWrite = this.writeConcern?.w === 0;
		            if (unacknowledgedWrite && (0, utils_1.maxWireVersion)(connection) < 9) {
		                throw new error_1.MongoCompatibilityError('hint for the findAndModify command is only supported on MongoDB 4.4+');
		            }
		            command.hint = options.hint;
		        }
		        return command;
		    }
		    handleOk(response) {
		        const result = super.handleOk(response);
		        return this.options.includeResultMetadata ? result : (result.value ?? null);
		    }
		}
		exports.FindAndModifyOperation = FindAndModifyOperation;
		/** @internal */
		class FindOneAndDeleteOperation extends FindAndModifyOperation {
		    constructor(collection, filter, options) {
		        // Basic validation
		        if (filter == null || typeof filter !== 'object') {
		            throw new error_1.MongoInvalidArgumentError('Argument "filter" must be an object');
		        }
		        super(collection, filter, options);
		    }
		    buildCommandDocument(connection, session) {
		        const document = super.buildCommandDocument(connection, session);
		        document.remove = true;
		        return document;
		    }
		}
		exports.FindOneAndDeleteOperation = FindOneAndDeleteOperation;
		/** @internal */
		class FindOneAndReplaceOperation extends FindAndModifyOperation {
		    constructor(collection, filter, replacement, options) {
		        if (filter == null || typeof filter !== 'object') {
		            throw new error_1.MongoInvalidArgumentError('Argument "filter" must be an object');
		        }
		        if (replacement == null || typeof replacement !== 'object') {
		            throw new error_1.MongoInvalidArgumentError('Argument "replacement" must be an object');
		        }
		        if ((0, utils_1.hasAtomicOperators)(replacement)) {
		            throw new error_1.MongoInvalidArgumentError('Replacement document must not contain atomic operators');
		        }
		        super(collection, filter, options);
		        this.replacement = replacement;
		    }
		    buildCommandDocument(connection, session) {
		        const document = super.buildCommandDocument(connection, session);
		        document.update = this.replacement;
		        configureFindAndModifyCmdBaseUpdateOpts(document, this.options);
		        return document;
		    }
		}
		exports.FindOneAndReplaceOperation = FindOneAndReplaceOperation;
		/** @internal */
		class FindOneAndUpdateOperation extends FindAndModifyOperation {
		    constructor(collection, filter, update, options) {
		        if (filter == null || typeof filter !== 'object') {
		            throw new error_1.MongoInvalidArgumentError('Argument "filter" must be an object');
		        }
		        if (update == null || typeof update !== 'object') {
		            throw new error_1.MongoInvalidArgumentError('Argument "update" must be an object');
		        }
		        if (!(0, utils_1.hasAtomicOperators)(update, options)) {
		            throw new error_1.MongoInvalidArgumentError('Update document requires atomic operators');
		        }
		        super(collection, filter, options);
		        this.update = update;
		        this.options = options;
		    }
		    buildCommandDocument(connection, session) {
		        const document = super.buildCommandDocument(connection, session);
		        document.update = this.update;
		        configureFindAndModifyCmdBaseUpdateOpts(document, this.options);
		        if (this.options.arrayFilters) {
		            document.arrayFilters = this.options.arrayFilters;
		        }
		        return document;
		    }
		}
		exports.FindOneAndUpdateOperation = FindOneAndUpdateOperation;
		(0, operation_1.defineAspects)(FindAndModifyOperation, [
		    operation_1.Aspect.WRITE_OPERATION,
		    operation_1.Aspect.RETRYABLE,
		    operation_1.Aspect.EXPLAINABLE,
		    operation_1.Aspect.SUPPORTS_RAW_DATA
		]);
		
	} (find_and_modify));
	return find_and_modify;
}

var rename = {};

var hasRequiredRename;

function requireRename () {
	if (hasRequiredRename) return rename;
	hasRequiredRename = 1;
	Object.defineProperty(rename, "__esModule", { value: true });
	rename.RenameOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const collection_1 = mongodb3.requireCollection();
	const utils_1 = mongodb7.requireUtils();
	const command_1 = requireCommand();
	const operation_1 = requireOperation();
	/** @internal */
	class RenameOperation extends command_1.CommandOperation {
	    constructor(collection, newName, options) {
	        super(collection, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.collection = collection;
	        this.newName = newName;
	        this.options = options;
	        this.ns = new utils_1.MongoDBNamespace('admin', '$cmd');
	    }
	    get commandName() {
	        return 'renameCollection';
	    }
	    buildCommandDocument(_connection, _session) {
	        const renameCollection = this.collection.namespace;
	        const to = this.collection.s.namespace.withCollection(this.newName).toString();
	        const dropTarget = typeof this.options.dropTarget === 'boolean' ? this.options.dropTarget : false;
	        return {
	            renameCollection,
	            to,
	            dropTarget
	        };
	    }
	    handleOk(_response) {
	        return new collection_1.Collection(this.collection.db, this.newName, this.collection.s.options);
	    }
	}
	rename.RenameOperation = RenameOperation;
	(0, operation_1.defineAspects)(RenameOperation, [operation_1.Aspect.WRITE_OPERATION]);
	
	return rename;
}

var create = {};

var hasRequiredCreate;

function requireCreate () {
	if (hasRequiredCreate) return create;
	hasRequiredCreate = 1;
	Object.defineProperty(create, "__esModule", { value: true });
	create.CreateSearchIndexesOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const operation_1 = requireOperation();
	/** @internal */
	class CreateSearchIndexesOperation extends operation_1.AbstractOperation {
	    constructor(collection, descriptions) {
	        super();
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.collection = collection;
	        this.descriptions = descriptions;
	        this.ns = collection.fullNamespace;
	    }
	    get commandName() {
	        return 'createSearchIndexes';
	    }
	    buildCommand(_connection, _session) {
	        const namespace = this.collection.fullNamespace;
	        return {
	            createSearchIndexes: namespace.collection,
	            indexes: this.descriptions
	        };
	    }
	    handleOk(response) {
	        return super.handleOk(response).indexesCreated.map((val) => val.name);
	    }
	    buildOptions(timeoutContext) {
	        return { session: this.session, timeoutContext };
	    }
	}
	create.CreateSearchIndexesOperation = CreateSearchIndexesOperation;
	
	return create;
}

var drop$1 = {};

var hasRequiredDrop$1;

function requireDrop$1 () {
	if (hasRequiredDrop$1) return drop$1;
	hasRequiredDrop$1 = 1;
	Object.defineProperty(drop$1, "__esModule", { value: true });
	drop$1.DropSearchIndexOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const error_1 = mongodb4.requireError();
	const operation_1 = requireOperation();
	/** @internal */
	class DropSearchIndexOperation extends operation_1.AbstractOperation {
	    constructor(collection, name) {
	        super();
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.collection = collection;
	        this.name = name;
	        this.ns = collection.fullNamespace;
	    }
	    get commandName() {
	        return 'dropSearchIndex';
	    }
	    buildCommand(_connection, _session) {
	        const namespace = this.collection.fullNamespace;
	        const command = {
	            dropSearchIndex: namespace.collection
	        };
	        if (typeof this.name === 'string') {
	            command.name = this.name;
	        }
	        return command;
	    }
	    handleOk(_response) {
	        // do nothing
	    }
	    buildOptions(timeoutContext) {
	        return { session: this.session, timeoutContext };
	    }
	    handleError(error) {
	        const isNamespaceNotFoundError = error instanceof error_1.MongoServerError && error.code === error_1.MONGODB_ERROR_CODES.NamespaceNotFound;
	        if (!isNamespaceNotFoundError) {
	            throw error;
	        }
	    }
	}
	drop$1.DropSearchIndexOperation = DropSearchIndexOperation;
	
	return drop$1;
}

var update = {};

var hasRequiredUpdate;

function requireUpdate () {
	if (hasRequiredUpdate) return update;
	hasRequiredUpdate = 1;
	Object.defineProperty(update, "__esModule", { value: true });
	update.UpdateSearchIndexOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const operation_1 = requireOperation();
	/** @internal */
	class UpdateSearchIndexOperation extends operation_1.AbstractOperation {
	    constructor(collection, name, definition) {
	        super();
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.collection = collection;
	        this.name = name;
	        this.definition = definition;
	        this.ns = collection.fullNamespace;
	    }
	    get commandName() {
	        return 'updateSearchIndex';
	    }
	    buildCommand(_connection, _session) {
	        const namespace = this.collection.fullNamespace;
	        return {
	            updateSearchIndex: namespace.collection,
	            name: this.name,
	            definition: this.definition
	        };
	    }
	    handleOk(_response) {
	        // no response.
	    }
	    buildOptions(timeoutContext) {
	        return { session: this.session, timeoutContext };
	    }
	}
	update.UpdateSearchIndexOperation = UpdateSearchIndexOperation;
	
	return update;
}

var list_collections = {};

var hasRequiredList_collections;

function requireList_collections () {
	if (hasRequiredList_collections) return list_collections;
	hasRequiredList_collections = 1;
	Object.defineProperty(list_collections, "__esModule", { value: true });
	list_collections.ListCollectionsOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const utils_1 = mongodb7.requireUtils();
	const command_1 = requireCommand();
	const operation_1 = requireOperation();
	/** @internal */
	class ListCollectionsOperation extends command_1.CommandOperation {
	    constructor(db, filter, options) {
	        super(db, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.CursorResponse;
	        this.options = { ...options };
	        delete this.options.writeConcern;
	        this.db = db;
	        this.filter = filter;
	        this.nameOnly = !!this.options.nameOnly;
	        this.authorizedCollections = !!this.options.authorizedCollections;
	        if (typeof this.options.batchSize === 'number') {
	            this.batchSize = this.options.batchSize;
	        }
	        this.SERVER_COMMAND_RESPONSE_TYPE = this.explain ? responses_1.ExplainedCursorResponse : responses_1.CursorResponse;
	    }
	    get commandName() {
	        return 'listCollections';
	    }
	    buildCommandDocument(connection) {
	        const command = {
	            listCollections: 1,
	            filter: this.filter,
	            cursor: this.batchSize ? { batchSize: this.batchSize } : {},
	            nameOnly: this.nameOnly,
	            authorizedCollections: this.authorizedCollections
	        };
	        // we check for undefined specifically here to allow falsy values
	        // eslint-disable-next-line no-restricted-syntax
	        if ((0, utils_1.maxWireVersion)(connection) >= 9 && this.options.comment !== undefined) {
	            command.comment = this.options.comment;
	        }
	        return command;
	    }
	    handleOk(response) {
	        return response;
	    }
	}
	list_collections.ListCollectionsOperation = ListCollectionsOperation;
	(0, operation_1.defineAspects)(ListCollectionsOperation, [
	    operation_1.Aspect.READ_OPERATION,
	    operation_1.Aspect.RETRYABLE,
	    operation_1.Aspect.CURSOR_CREATING,
	    operation_1.Aspect.SUPPORTS_RAW_DATA
	]);
	
	return list_collections;
}

var create_collection = {};

var hasRequiredCreate_collection;

function requireCreate_collection () {
	if (hasRequiredCreate_collection) return create_collection;
	hasRequiredCreate_collection = 1;
	Object.defineProperty(create_collection, "__esModule", { value: true });
	create_collection.CreateCollectionOperation = void 0;
	create_collection.createCollections = createCollections;
	const constants_1 = mongodb2.requireConstants();
	const responses_1 = mongodb3.requireResponses();
	const collection_1 = mongodb3.requireCollection();
	const error_1 = mongodb4.requireError();
	const timeout_1 = mongodb6.requireTimeout();
	const utils_1 = mongodb7.requireUtils();
	const command_1 = requireCommand();
	const execute_operation_1 = requireExecute_operation();
	const indexes_1 = requireIndexes();
	const operation_1 = requireOperation();
	const ILLEGAL_COMMAND_FIELDS = new Set([
	    'w',
	    'wtimeout',
	    'timeoutMS',
	    'j',
	    'fsync',
	    'pkFactory',
	    'raw',
	    'readPreference',
	    'session',
	    'readConcern',
	    'writeConcern',
	    'raw',
	    'fieldsAsRaw',
	    'useBigInt64',
	    'promoteLongs',
	    'promoteValues',
	    'promoteBuffers',
	    'bsonRegExp',
	    'serializeFunctions',
	    'ignoreUndefined',
	    'enableUtf8Validation'
	]);
	/* @internal */
	const INVALID_QE_VERSION = 'Driver support of Queryable Encryption is incompatible with server. Upgrade server to use Queryable Encryption.';
	/** @internal */
	class CreateCollectionOperation extends command_1.CommandOperation {
	    constructor(db, name, options = {}) {
	        super(db, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.options = options;
	        this.db = db;
	        this.name = name;
	    }
	    get commandName() {
	        return 'create';
	    }
	    buildCommandDocument(_connection, _session) {
	        const isOptionValid = ([k, v]) => v != null && typeof v !== 'function' && !ILLEGAL_COMMAND_FIELDS.has(k);
	        return {
	            create: this.name,
	            ...Object.fromEntries(Object.entries(this.options).filter(isOptionValid))
	        };
	    }
	    handleOk(_response) {
	        return new collection_1.Collection(this.db, this.name, this.options);
	    }
	}
	create_collection.CreateCollectionOperation = CreateCollectionOperation;
	async function createCollections(db, name, options) {
	    const timeoutContext = timeout_1.TimeoutContext.create({
	        session: options.session,
	        serverSelectionTimeoutMS: db.client.s.options.serverSelectionTimeoutMS,
	        waitQueueTimeoutMS: db.client.s.options.waitQueueTimeoutMS,
	        timeoutMS: options.timeoutMS
	    });
	    const encryptedFields = options.encryptedFields ??
	        db.client.s.options.autoEncryption?.encryptedFieldsMap?.[`${db.databaseName}.${name}`];
	    if (encryptedFields) {
	        class CreateSupportingFLEv2CollectionOperation extends CreateCollectionOperation {
	            buildCommandDocument(connection, session) {
	                if (!connection.description.loadBalanced &&
	                    (0, utils_1.maxWireVersion)(connection) < constants_1.MIN_SUPPORTED_QE_WIRE_VERSION) {
	                    throw new error_1.MongoCompatibilityError(`${INVALID_QE_VERSION} The minimum server version required is ${constants_1.MIN_SUPPORTED_QE_SERVER_VERSION}`);
	                }
	                return super.buildCommandDocument(connection, session);
	            }
	        }
	        // Create auxilliary collections for queryable encryption support.
	        const escCollection = encryptedFields.escCollection ?? `enxcol_.${name}.esc`;
	        const ecocCollection = encryptedFields.ecocCollection ?? `enxcol_.${name}.ecoc`;
	        for (const collectionName of [escCollection, ecocCollection]) {
	            const createOp = new CreateSupportingFLEv2CollectionOperation(db, collectionName, {
	                clusteredIndex: {
	                    key: { _id: 1 },
	                    unique: true
	                },
	                session: options.session
	            });
	            await (0, execute_operation_1.executeOperation)(db.client, createOp, timeoutContext);
	        }
	        if (!options.encryptedFields) {
	            options = { ...options, encryptedFields };
	        }
	    }
	    const coll = await (0, execute_operation_1.executeOperation)(db.client, new CreateCollectionOperation(db, name, options), timeoutContext);
	    if (encryptedFields) {
	        // Create the required index for queryable encryption support.
	        const createIndexOp = indexes_1.CreateIndexesOperation.fromIndexSpecification(db, name, { __safeContent__: 1 }, { session: options.session });
	        await (0, execute_operation_1.executeOperation)(db.client, createIndexOp, timeoutContext);
	    }
	    return coll;
	}
	(0, operation_1.defineAspects)(CreateCollectionOperation, [operation_1.Aspect.WRITE_OPERATION]);
	
	return create_collection;
}

var drop = {};

var hasRequiredDrop;

function requireDrop () {
	if (hasRequiredDrop) return drop;
	hasRequiredDrop = 1;
	Object.defineProperty(drop, "__esModule", { value: true });
	drop.DropDatabaseOperation = drop.DropCollectionOperation = void 0;
	drop.dropCollections = dropCollections;
	const __1 = mongodb4.requireLib();
	const responses_1 = mongodb3.requireResponses();
	const abstract_cursor_1 = mongodb3.requireAbstract_cursor();
	const error_1 = mongodb4.requireError();
	const timeout_1 = mongodb6.requireTimeout();
	const command_1 = requireCommand();
	const execute_operation_1 = requireExecute_operation();
	const operation_1 = requireOperation();
	/** @internal */
	class DropCollectionOperation extends command_1.CommandOperation {
	    constructor(db, name, options = {}) {
	        super(db, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.options = options;
	        this.name = name;
	    }
	    get commandName() {
	        return 'drop';
	    }
	    buildCommandDocument(_connection, _session) {
	        return { drop: this.name };
	    }
	    handleOk(_response) {
	        return true;
	    }
	    handleError(error) {
	        if (!(error instanceof __1.MongoServerError))
	            throw error;
	        if (Number(error.code) !== error_1.MONGODB_ERROR_CODES.NamespaceNotFound)
	            throw error;
	        return false;
	    }
	}
	drop.DropCollectionOperation = DropCollectionOperation;
	async function dropCollections(db, name, options) {
	    const timeoutContext = timeout_1.TimeoutContext.create({
	        session: options.session,
	        serverSelectionTimeoutMS: db.client.s.options.serverSelectionTimeoutMS,
	        waitQueueTimeoutMS: db.client.s.options.waitQueueTimeoutMS,
	        timeoutMS: options.timeoutMS
	    });
	    const encryptedFieldsMap = db.client.s.options.autoEncryption?.encryptedFieldsMap;
	    let encryptedFields = options.encryptedFields ?? encryptedFieldsMap?.[`${db.databaseName}.${name}`];
	    if (!encryptedFields && encryptedFieldsMap) {
	        // If the MongoClient was configured with an encryptedFieldsMap,
	        // and no encryptedFields config was available in it or explicitly
	        // passed as an argument, the spec tells us to look one up using
	        // listCollections().
	        const listCollectionsResult = await db
	            .listCollections({ name }, {
	            nameOnly: false,
	            session: options.session,
	            timeoutContext: new abstract_cursor_1.CursorTimeoutContext(timeoutContext, Symbol())
	        })
	            .toArray();
	        encryptedFields = listCollectionsResult?.[0]?.options?.encryptedFields;
	    }
	    if (encryptedFields) {
	        const escCollection = encryptedFields.escCollection || `enxcol_.${name}.esc`;
	        const ecocCollection = encryptedFields.ecocCollection || `enxcol_.${name}.ecoc`;
	        for (const collectionName of [escCollection, ecocCollection]) {
	            // Drop auxilliary collections, ignoring potential NamespaceNotFound errors.
	            const dropOp = new DropCollectionOperation(db, collectionName, options);
	            await (0, execute_operation_1.executeOperation)(db.client, dropOp, timeoutContext);
	        }
	    }
	    return await (0, execute_operation_1.executeOperation)(db.client, new DropCollectionOperation(db, name, options), timeoutContext);
	}
	/** @internal */
	class DropDatabaseOperation extends command_1.CommandOperation {
	    constructor(db, options) {
	        super(db, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.options = options;
	    }
	    get commandName() {
	        return 'dropDatabase';
	    }
	    buildCommandDocument(_connection, _session) {
	        return { dropDatabase: 1 };
	    }
	    handleOk(_response) {
	        return true;
	    }
	}
	drop.DropDatabaseOperation = DropDatabaseOperation;
	(0, operation_1.defineAspects)(DropCollectionOperation, [operation_1.Aspect.WRITE_OPERATION]);
	(0, operation_1.defineAspects)(DropDatabaseOperation, [operation_1.Aspect.WRITE_OPERATION]);
	
	return drop;
}

var profiling_level = {};

var hasRequiredProfiling_level;

function requireProfiling_level () {
	if (hasRequiredProfiling_level) return profiling_level;
	hasRequiredProfiling_level = 1;
	Object.defineProperty(profiling_level, "__esModule", { value: true });
	profiling_level.ProfilingLevelOperation = void 0;
	const bson_1 = mongodb1.requireBson();
	const responses_1 = mongodb3.requireResponses();
	const error_1 = mongodb4.requireError();
	const command_1 = requireCommand();
	class ProfilingLevelResponse extends responses_1.MongoDBResponse {
	    get was() {
	        return this.get('was', bson_1.BSONType.int, true);
	    }
	}
	/** @internal */
	class ProfilingLevelOperation extends command_1.CommandOperation {
	    constructor(db, options) {
	        super(db, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = ProfilingLevelResponse;
	        this.options = options;
	    }
	    get commandName() {
	        return 'profile';
	    }
	    buildCommandDocument(_connection) {
	        return { profile: -1 };
	    }
	    handleOk(response) {
	        if (response.ok === 1) {
	            const was = response.was;
	            if (was === 0)
	                return 'off';
	            if (was === 1)
	                return 'slow_only';
	            if (was === 2)
	                return 'all';
	            throw new error_1.MongoUnexpectedServerResponseError(`Illegal profiling level value ${was}`);
	        }
	        else {
	            throw new error_1.MongoUnexpectedServerResponseError('Error with profile command');
	        }
	    }
	}
	profiling_level.ProfilingLevelOperation = ProfilingLevelOperation;
	
	return profiling_level;
}

var set_profiling_level = {};

var hasRequiredSet_profiling_level;

function requireSet_profiling_level () {
	if (hasRequiredSet_profiling_level) return set_profiling_level;
	hasRequiredSet_profiling_level = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.SetProfilingLevelOperation = exports.ProfilingLevel = void 0;
		const responses_1 = mongodb3.requireResponses();
		const error_1 = mongodb4.requireError();
		const utils_1 = mongodb7.requireUtils();
		const command_1 = requireCommand();
		const levelValues = new Set(['off', 'slow_only', 'all']);
		/** @public */
		exports.ProfilingLevel = Object.freeze({
		    off: 'off',
		    slowOnly: 'slow_only',
		    all: 'all'
		});
		/** @internal */
		class SetProfilingLevelOperation extends command_1.CommandOperation {
		    constructor(db, level, options) {
		        super(db, options);
		        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
		        this.options = options;
		        switch (level) {
		            case exports.ProfilingLevel.off:
		                this.profile = 0;
		                break;
		            case exports.ProfilingLevel.slowOnly:
		                this.profile = 1;
		                break;
		            case exports.ProfilingLevel.all:
		                this.profile = 2;
		                break;
		            default:
		                this.profile = 0;
		                break;
		        }
		        this.level = level;
		    }
		    get commandName() {
		        return 'profile';
		    }
		    buildCommandDocument(_connection) {
		        const level = this.level;
		        if (!levelValues.has(level)) {
		            // TODO(NODE-3483): Determine error to put here
		            throw new error_1.MongoInvalidArgumentError(`Profiling level must be one of "${(0, utils_1.enumToString)(exports.ProfilingLevel)}"`);
		        }
		        return { profile: this.profile };
		    }
		    handleOk(_response) {
		        return this.level;
		    }
		}
		exports.SetProfilingLevelOperation = SetProfilingLevelOperation;
		
	} (set_profiling_level));
	return set_profiling_level;
}

var stats = {};

var hasRequiredStats;

function requireStats () {
	if (hasRequiredStats) return stats;
	hasRequiredStats = 1;
	Object.defineProperty(stats, "__esModule", { value: true });
	stats.DbStatsOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const command_1 = requireCommand();
	const operation_1 = requireOperation();
	/** @internal */
	class DbStatsOperation extends command_1.CommandOperation {
	    constructor(db, options) {
	        super(db, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.options = options;
	    }
	    get commandName() {
	        return 'dbStats';
	    }
	    buildCommandDocument(_connection) {
	        const command = { dbStats: true };
	        if (this.options.scale != null) {
	            command.scale = this.options.scale;
	        }
	        return command;
	    }
	}
	stats.DbStatsOperation = DbStatsOperation;
	(0, operation_1.defineAspects)(DbStatsOperation, [operation_1.Aspect.READ_OPERATION]);
	
	return stats;
}

var runtime_adapters = {};

var hasRequiredRuntime_adapters;

function requireRuntime_adapters () {
	if (hasRequiredRuntime_adapters) return runtime_adapters;
	hasRequiredRuntime_adapters = 1;
	(function (exports) {
		/* eslint-disable no-restricted-imports*/
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.ALLOWED_DRIVER_REQUIRE_PROPERTY_NAME = void 0;
		exports.resolveRuntimeAdapters = resolveRuntimeAdapters;
		/**
		 * @internal
		 *
		 * This propery can be set on the global object to allow the driver to require otherwise blocked modules.
		 * This is used by our test suite to allow tests to access the `os` module without allowing user code to do so.
		 */
		exports.ALLOWED_DRIVER_REQUIRE_PROPERTY_NAME = 'allowedDriverRequire';
		/**
		 * @internal
		 *
		 * Given a MongoClientOptions, this function resolves the set of runtime options, providing Nodejs implementations if
		 * not provided by in `options`, and returns a `Runtime`.
		 */
		function resolveRuntimeAdapters(options) {
		    globalThis[exports.ALLOWED_DRIVER_REQUIRE_PROPERTY_NAME] = true;
		    try {
		        const runtime = {
		            // eslint-disable-next-line @typescript-eslint/no-require-imports
		            os: options.runtimeAdapters?.os ?? require('os')
		        };
		        return runtime;
		    }
		    finally {
		        globalThis[exports.ALLOWED_DRIVER_REQUIRE_PROPERTY_NAME] = false;
		    }
		}
		
	} (runtime_adapters));
	return runtime_adapters;
}

var events = {};

var hasRequiredEvents;

function requireEvents () {
	if (hasRequiredEvents) return events;
	hasRequiredEvents = 1;
	Object.defineProperty(events, "__esModule", { value: true });
	events.ServerHeartbeatFailedEvent = events.ServerHeartbeatSucceededEvent = events.ServerHeartbeatStartedEvent = events.TopologyClosedEvent = events.TopologyOpeningEvent = events.TopologyDescriptionChangedEvent = events.ServerClosedEvent = events.ServerOpeningEvent = events.ServerDescriptionChangedEvent = void 0;
	const constants_1 = mongodb3.requireConstants();
	/**
	 * Emitted when server description changes, but does NOT include changes to the RTT.
	 * @public
	 * @category Event
	 */
	class ServerDescriptionChangedEvent {
	    /** @internal */
	    constructor(topologyId, address, previousDescription, newDescription) {
	        this.name = constants_1.SERVER_DESCRIPTION_CHANGED;
	        this.topologyId = topologyId;
	        this.address = address;
	        this.previousDescription = previousDescription;
	        this.newDescription = newDescription;
	    }
	}
	events.ServerDescriptionChangedEvent = ServerDescriptionChangedEvent;
	/**
	 * Emitted when server is initialized.
	 * @public
	 * @category Event
	 */
	class ServerOpeningEvent {
	    /** @internal */
	    constructor(topologyId, address) {
	        /** @internal */
	        this.name = constants_1.SERVER_OPENING;
	        this.topologyId = topologyId;
	        this.address = address;
	    }
	}
	events.ServerOpeningEvent = ServerOpeningEvent;
	/**
	 * Emitted when server is closed.
	 * @public
	 * @category Event
	 */
	class ServerClosedEvent {
	    /** @internal */
	    constructor(topologyId, address) {
	        /** @internal */
	        this.name = constants_1.SERVER_CLOSED;
	        this.topologyId = topologyId;
	        this.address = address;
	    }
	}
	events.ServerClosedEvent = ServerClosedEvent;
	/**
	 * Emitted when topology description changes.
	 * @public
	 * @category Event
	 */
	class TopologyDescriptionChangedEvent {
	    /** @internal */
	    constructor(topologyId, previousDescription, newDescription) {
	        /** @internal */
	        this.name = constants_1.TOPOLOGY_DESCRIPTION_CHANGED;
	        this.topologyId = topologyId;
	        this.previousDescription = previousDescription;
	        this.newDescription = newDescription;
	    }
	}
	events.TopologyDescriptionChangedEvent = TopologyDescriptionChangedEvent;
	/**
	 * Emitted when topology is initialized.
	 * @public
	 * @category Event
	 */
	class TopologyOpeningEvent {
	    /** @internal */
	    constructor(topologyId) {
	        /** @internal */
	        this.name = constants_1.TOPOLOGY_OPENING;
	        this.topologyId = topologyId;
	    }
	}
	events.TopologyOpeningEvent = TopologyOpeningEvent;
	/**
	 * Emitted when topology is closed.
	 * @public
	 * @category Event
	 */
	class TopologyClosedEvent {
	    /** @internal */
	    constructor(topologyId) {
	        /** @internal */
	        this.name = constants_1.TOPOLOGY_CLOSED;
	        this.topologyId = topologyId;
	    }
	}
	events.TopologyClosedEvent = TopologyClosedEvent;
	/**
	 * Emitted when the server monitor’s hello command is started - immediately before
	 * the hello command is serialized into raw BSON and written to the socket.
	 *
	 * @public
	 * @category Event
	 */
	class ServerHeartbeatStartedEvent {
	    /** @internal */
	    constructor(connectionId, awaited) {
	        /** @internal */
	        this.name = constants_1.SERVER_HEARTBEAT_STARTED;
	        this.connectionId = connectionId;
	        this.awaited = awaited;
	    }
	}
	events.ServerHeartbeatStartedEvent = ServerHeartbeatStartedEvent;
	/**
	 * Emitted when the server monitor’s hello succeeds.
	 * @public
	 * @category Event
	 */
	class ServerHeartbeatSucceededEvent {
	    /** @internal */
	    constructor(connectionId, duration, reply, awaited) {
	        /** @internal */
	        this.name = constants_1.SERVER_HEARTBEAT_SUCCEEDED;
	        this.connectionId = connectionId;
	        this.duration = duration;
	        this.reply = reply ?? {};
	        this.awaited = awaited;
	    }
	}
	events.ServerHeartbeatSucceededEvent = ServerHeartbeatSucceededEvent;
	/**
	 * Emitted when the server monitor’s hello fails, either with an “ok: 0” or a socket exception.
	 * @public
	 * @category Event
	 */
	class ServerHeartbeatFailedEvent {
	    /** @internal */
	    constructor(connectionId, duration, failure, awaited) {
	        /** @internal */
	        this.name = constants_1.SERVER_HEARTBEAT_FAILED;
	        this.connectionId = connectionId;
	        this.duration = duration;
	        this.failure = failure;
	        this.awaited = awaited;
	    }
	}
	events.ServerHeartbeatFailedEvent = ServerHeartbeatFailedEvent;
	
	return events;
}

var executor = {};

var client_bulk_write = {};

var hasRequiredClient_bulk_write;

function requireClient_bulk_write () {
	if (hasRequiredClient_bulk_write) return client_bulk_write;
	hasRequiredClient_bulk_write = 1;
	Object.defineProperty(client_bulk_write, "__esModule", { value: true });
	client_bulk_write.ClientBulkWriteOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const utils_1 = mongodb7.requireUtils();
	const command_1 = requireCommand();
	const operation_1 = requireOperation();
	/**
	 * Executes a single client bulk write operation within a potential batch.
	 * @internal
	 */
	class ClientBulkWriteOperation extends command_1.CommandOperation {
	    get commandName() {
	        return 'bulkWrite';
	    }
	    constructor(commandBuilder, options) {
	        super(undefined, options);
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.ClientBulkWriteCursorResponse;
	        this.commandBuilder = commandBuilder;
	        this.options = options;
	        this.ns = new utils_1.MongoDBNamespace('admin', '$cmd');
	    }
	    resetBatch() {
	        return this.commandBuilder.resetBatch();
	    }
	    get canRetryWrite() {
	        return this.commandBuilder.isBatchRetryable;
	    }
	    handleOk(response) {
	        return response;
	    }
	    buildCommandDocument(connection, _session) {
	        const command = this.commandBuilder.buildBatch(connection.description.maxMessageSizeBytes, connection.description.maxWriteBatchSize, connection.description.maxBsonObjectSize);
	        // Check _after_ the batch is built if we cannot retry it and override the option.
	        if (!this.canRetryWrite) {
	            this.options.willRetryWrite = false;
	        }
	        return command;
	    }
	}
	client_bulk_write.ClientBulkWriteOperation = ClientBulkWriteOperation;
	// Skipping the collation as it goes on the individual ops.
	(0, operation_1.defineAspects)(ClientBulkWriteOperation, [
	    operation_1.Aspect.WRITE_OPERATION,
	    operation_1.Aspect.SKIP_COLLATION,
	    operation_1.Aspect.CURSOR_CREATING,
	    operation_1.Aspect.RETRYABLE,
	    operation_1.Aspect.COMMAND_BATCHING,
	    operation_1.Aspect.SUPPORTS_RAW_DATA
	]);
	
	return client_bulk_write;
}

var command_builder = {};

var hasRequiredCommand_builder;

function requireCommand_builder () {
	if (hasRequiredCommand_builder) return command_builder;
	hasRequiredCommand_builder = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.buildReplaceOneOperation = exports.buildUpdateManyOperation = exports.buildUpdateOneOperation = exports.buildDeleteManyOperation = exports.buildDeleteOneOperation = exports.buildInsertOneOperation = exports.ClientBulkWriteCommandBuilder = void 0;
		exports.buildOperation = buildOperation;
		const bson_1 = mongodb1.requireBson();
		const commands_1 = mongodb2.requireCommands();
		const error_1 = mongodb4.requireError();
		const sort_1 = mongodb6.requireSort();
		const utils_1 = mongodb7.requireUtils();
		/**
		 * The bytes overhead for the extra fields added post command generation.
		 */
		const MESSAGE_OVERHEAD_BYTES = 1000;
		/** @internal */
		class ClientBulkWriteCommandBuilder {
		    /**
		     * Create the command builder.
		     * @param models - The client write models.
		     */
		    constructor(models, options, pkFactory) {
		        this.models = models;
		        this.options = options;
		        this.pkFactory = pkFactory ?? utils_1.DEFAULT_PK_FACTORY;
		        this.currentModelIndex = 0;
		        this.previousModelIndex = 0;
		        this.lastOperations = [];
		        this.isBatchRetryable = true;
		    }
		    /**
		     * Gets the errorsOnly value for the command, which is the inverse of the
		     * user provided verboseResults option. Defaults to true.
		     */
		    get errorsOnly() {
		        if ('verboseResults' in this.options) {
		            return !this.options.verboseResults;
		        }
		        return true;
		    }
		    /**
		     * Determines if there is another batch to process.
		     * @returns True if not all batches have been built.
		     */
		    hasNextBatch() {
		        return this.currentModelIndex < this.models.length;
		    }
		    /**
		     * When we need to retry a command we need to set the current
		     * model index back to its previous value.
		     */
		    resetBatch() {
		        this.currentModelIndex = this.previousModelIndex;
		        return true;
		    }
		    /**
		     * Build a single batch of a client bulk write command.
		     * @param maxMessageSizeBytes - The max message size in bytes.
		     * @param maxWriteBatchSize - The max write batch size.
		     * @returns The client bulk write command.
		     */
		    buildBatch(maxMessageSizeBytes, maxWriteBatchSize, maxBsonObjectSize) {
		        // We start by assuming the batch has no multi-updates, so it is retryable
		        // until we find them.
		        this.isBatchRetryable = true;
		        let commandLength = 0;
		        let currentNamespaceIndex = 0;
		        const command = this.baseCommand();
		        const namespaces = new Map();
		        // In the case of retries we need to mark where we started this batch.
		        this.previousModelIndex = this.currentModelIndex;
		        while (this.currentModelIndex < this.models.length) {
		            const model = this.models[this.currentModelIndex];
		            const ns = model.namespace;
		            const nsIndex = namespaces.get(ns);
		            // Multi updates are not retryable.
		            if (model.name === 'deleteMany' || model.name === 'updateMany') {
		                this.isBatchRetryable = false;
		            }
		            if (nsIndex != null) {
		                // Build the operation and serialize it to get the bytes buffer.
		                const operation = buildOperation(model, nsIndex, this.pkFactory, this.options);
		                let operationBuffer;
		                try {
		                    operationBuffer = bson_1.BSON.serialize(operation);
		                }
		                catch (cause) {
		                    throw new error_1.MongoInvalidArgumentError(`Could not serialize operation to BSON`, { cause });
		                }
		                validateBufferSize('ops', operationBuffer, maxBsonObjectSize);
		                // Check if the operation buffer can fit in the command. If it can,
		                // then add the operation to the document sequence and increment the
		                // current length as long as the ops don't exceed the maxWriteBatchSize.
		                if (commandLength + operationBuffer.length < maxMessageSizeBytes &&
		                    command.ops.documents.length < maxWriteBatchSize) {
		                    // Pushing to the ops document sequence returns the total byte length of the document sequence.
		                    commandLength = MESSAGE_OVERHEAD_BYTES + command.ops.push(operation, operationBuffer);
		                    // Increment the builder's current model index.
		                    this.currentModelIndex++;
		                }
		                else {
		                    // The operation cannot fit in the current command and will need to
		                    // go in the next batch. Exit the loop.
		                    break;
		                }
		            }
		            else {
		                // The namespace is not already in the nsInfo so we will set it in the map, and
		                // construct our nsInfo and ops documents and buffers.
		                namespaces.set(ns, currentNamespaceIndex);
		                const nsInfo = { ns: ns };
		                const operation = buildOperation(model, currentNamespaceIndex, this.pkFactory, this.options);
		                let nsInfoBuffer;
		                let operationBuffer;
		                try {
		                    nsInfoBuffer = bson_1.BSON.serialize(nsInfo);
		                    operationBuffer = bson_1.BSON.serialize(operation);
		                }
		                catch (cause) {
		                    throw new error_1.MongoInvalidArgumentError(`Could not serialize ns info to BSON`, { cause });
		                }
		                validateBufferSize('nsInfo', nsInfoBuffer, maxBsonObjectSize);
		                validateBufferSize('ops', operationBuffer, maxBsonObjectSize);
		                // Check if the operation and nsInfo buffers can fit in the command. If they
		                // can, then add the operation and nsInfo to their respective document
		                // sequences and increment the current length as long as the ops don't exceed
		                // the maxWriteBatchSize.
		                if (commandLength + nsInfoBuffer.length + operationBuffer.length < maxMessageSizeBytes &&
		                    command.ops.documents.length < maxWriteBatchSize) {
		                    // Pushing to the ops document sequence returns the total byte length of the document sequence.
		                    commandLength =
		                        MESSAGE_OVERHEAD_BYTES +
		                            command.nsInfo.push(nsInfo, nsInfoBuffer) +
		                            command.ops.push(operation, operationBuffer);
		                    // We've added a new namespace, increment the namespace index.
		                    currentNamespaceIndex++;
		                    // Increment the builder's current model index.
		                    this.currentModelIndex++;
		                }
		                else {
		                    // The operation cannot fit in the current command and will need to
		                    // go in the next batch. Exit the loop.
		                    break;
		                }
		            }
		        }
		        // Set the last operations and return the command.
		        this.lastOperations = command.ops.documents;
		        return command;
		    }
		    baseCommand() {
		        const command = {
		            bulkWrite: 1,
		            errorsOnly: this.errorsOnly,
		            ordered: this.options.ordered ?? true,
		            ops: new commands_1.DocumentSequence('ops'),
		            nsInfo: new commands_1.DocumentSequence('nsInfo')
		        };
		        // Add bypassDocumentValidation if it was present in the options.
		        if (this.options.bypassDocumentValidation != null) {
		            command.bypassDocumentValidation = this.options.bypassDocumentValidation;
		        }
		        // Add let if it was present in the options.
		        if (this.options.let) {
		            command.let = this.options.let;
		        }
		        // we check for undefined specifically here to allow falsy values
		        // eslint-disable-next-line no-restricted-syntax
		        if (this.options.comment !== undefined) {
		            command.comment = this.options.comment;
		        }
		        return command;
		    }
		}
		exports.ClientBulkWriteCommandBuilder = ClientBulkWriteCommandBuilder;
		function validateBufferSize(name, buffer, maxBsonObjectSize) {
		    if (buffer.length > maxBsonObjectSize) {
		        throw new error_1.MongoInvalidArgumentError(`Client bulk write operation ${name} of length ${buffer.length} exceeds the max bson object size of ${maxBsonObjectSize}`);
		    }
		}
		/**
		 * Build the insert one operation.
		 * @param model - The insert one model.
		 * @param index - The namespace index.
		 * @returns the operation.
		 */
		const buildInsertOneOperation = (model, index, pkFactory) => {
		    const document = {
		        insert: index,
		        document: model.document
		    };
		    document.document._id = model.document._id ?? pkFactory.createPk();
		    return document;
		};
		exports.buildInsertOneOperation = buildInsertOneOperation;
		/**
		 * Build the delete one operation.
		 * @param model - The insert many model.
		 * @param index - The namespace index.
		 * @returns the operation.
		 */
		const buildDeleteOneOperation = (model, index) => {
		    return createDeleteOperation(model, index, false);
		};
		exports.buildDeleteOneOperation = buildDeleteOneOperation;
		/**
		 * Build the delete many operation.
		 * @param model - The delete many model.
		 * @param index - The namespace index.
		 * @returns the operation.
		 */
		const buildDeleteManyOperation = (model, index) => {
		    return createDeleteOperation(model, index, true);
		};
		exports.buildDeleteManyOperation = buildDeleteManyOperation;
		/**
		 * Creates a delete operation based on the parameters.
		 */
		function createDeleteOperation(model, index, multi) {
		    const document = {
		        delete: index,
		        multi: multi,
		        filter: model.filter
		    };
		    if (model.hint) {
		        document.hint = model.hint;
		    }
		    if (model.collation) {
		        document.collation = model.collation;
		    }
		    return document;
		}
		/**
		 * Build the update one operation.
		 * @param model - The update one model.
		 * @param index - The namespace index.
		 * @returns the operation.
		 */
		const buildUpdateOneOperation = (model, index, options) => {
		    return createUpdateOperation(model, index, false, options);
		};
		exports.buildUpdateOneOperation = buildUpdateOneOperation;
		/**
		 * Build the update many operation.
		 * @param model - The update many model.
		 * @param index - The namespace index.
		 * @returns the operation.
		 */
		const buildUpdateManyOperation = (model, index, options) => {
		    return createUpdateOperation(model, index, true, options);
		};
		exports.buildUpdateManyOperation = buildUpdateManyOperation;
		/**
		 * Validate the update document.
		 * @param update - The update document.
		 */
		function validateUpdate(update, options) {
		    if (!(0, utils_1.hasAtomicOperators)(update, options)) {
		        throw new error_1.MongoAPIError('Client bulk write update models must only contain atomic modifiers (start with $) and must not be empty.');
		    }
		}
		/**
		 * Creates a delete operation based on the parameters.
		 */
		function createUpdateOperation(model, index, multi, options) {
		    // Update documents provided in UpdateOne and UpdateMany write models are
		    // required only to contain atomic modifiers (i.e. keys that start with "$").
		    // Drivers MUST throw an error if an update document is empty or if the
		    // document's first key does not start with "$".
		    validateUpdate(model.update, options);
		    const document = {
		        update: index,
		        multi: multi,
		        filter: model.filter,
		        updateMods: model.update
		    };
		    if (model.hint) {
		        document.hint = model.hint;
		    }
		    if (model.upsert) {
		        document.upsert = model.upsert;
		    }
		    if (model.arrayFilters) {
		        document.arrayFilters = model.arrayFilters;
		    }
		    if (model.collation) {
		        document.collation = model.collation;
		    }
		    if (!multi && 'sort' in model && model.sort != null) {
		        document.sort = (0, sort_1.formatSort)(model.sort);
		    }
		    return document;
		}
		/**
		 * Build the replace one operation.
		 * @param model - The replace one model.
		 * @param index - The namespace index.
		 * @returns the operation.
		 */
		const buildReplaceOneOperation = (model, index) => {
		    if ((0, utils_1.hasAtomicOperators)(model.replacement)) {
		        throw new error_1.MongoAPIError('Client bulk write replace models must not contain atomic modifiers (start with $) and must not be empty.');
		    }
		    const document = {
		        update: index,
		        multi: false,
		        filter: model.filter,
		        updateMods: model.replacement
		    };
		    if (model.hint) {
		        document.hint = model.hint;
		    }
		    if (model.upsert) {
		        document.upsert = model.upsert;
		    }
		    if (model.collation) {
		        document.collation = model.collation;
		    }
		    if (model.sort != null) {
		        document.sort = (0, sort_1.formatSort)(model.sort);
		    }
		    return document;
		};
		exports.buildReplaceOneOperation = buildReplaceOneOperation;
		/** @internal */
		function buildOperation(model, index, pkFactory, options) {
		    switch (model.name) {
		        case 'insertOne':
		            return (0, exports.buildInsertOneOperation)(model, index, pkFactory);
		        case 'deleteOne':
		            return (0, exports.buildDeleteOneOperation)(model, index);
		        case 'deleteMany':
		            return (0, exports.buildDeleteManyOperation)(model, index);
		        case 'updateOne':
		            return (0, exports.buildUpdateOneOperation)(model, index, options);
		        case 'updateMany':
		            return (0, exports.buildUpdateManyOperation)(model, index, options);
		        case 'replaceOne':
		            return (0, exports.buildReplaceOneOperation)(model, index);
		    }
		}
		
	} (command_builder));
	return command_builder;
}

var results_merger = {};

var hasRequiredResults_merger;

function requireResults_merger () {
	if (hasRequiredResults_merger) return results_merger;
	hasRequiredResults_merger = 1;
	Object.defineProperty(results_merger, "__esModule", { value: true });
	results_merger.ClientBulkWriteResultsMerger = void 0;
	const __1 = mongodb4.requireLib();
	const error_1 = mongodb4.requireError();
	/**
	 * Unacknowledged bulk writes are always the same.
	 */
	const UNACKNOWLEDGED = {
	    acknowledged: false,
	    insertedCount: 0,
	    upsertedCount: 0,
	    matchedCount: 0,
	    modifiedCount: 0,
	    deletedCount: 0,
	    insertResults: undefined,
	    updateResults: undefined,
	    deleteResults: undefined
	};
	/**
	 * Merges client bulk write cursor responses together into a single result.
	 * @internal
	 */
	class ClientBulkWriteResultsMerger {
	    /**
	     * @returns The standard unacknowledged bulk write result.
	     */
	    static unacknowledged() {
	        return UNACKNOWLEDGED;
	    }
	    /**
	     * Instantiate the merger.
	     * @param options - The options.
	     */
	    constructor(options) {
	        this.options = options;
	        this.currentBatchOffset = 0;
	        this.writeConcernErrors = [];
	        this.writeErrors = new Map();
	        this.result = {
	            acknowledged: true,
	            insertedCount: 0,
	            upsertedCount: 0,
	            matchedCount: 0,
	            modifiedCount: 0,
	            deletedCount: 0,
	            insertResults: undefined,
	            updateResults: undefined,
	            deleteResults: undefined
	        };
	        if (options.verboseResults) {
	            this.result.insertResults = new Map();
	            this.result.updateResults = new Map();
	            this.result.deleteResults = new Map();
	        }
	    }
	    /**
	     * Get the bulk write result object.
	     */
	    get bulkWriteResult() {
	        return {
	            acknowledged: this.result.acknowledged,
	            insertedCount: this.result.insertedCount,
	            upsertedCount: this.result.upsertedCount,
	            matchedCount: this.result.matchedCount,
	            modifiedCount: this.result.modifiedCount,
	            deletedCount: this.result.deletedCount,
	            insertResults: this.result.insertResults,
	            updateResults: this.result.updateResults,
	            deleteResults: this.result.deleteResults
	        };
	    }
	    /**
	     * Merge the results in the cursor to the existing result.
	     * @param currentBatchOffset - The offset index to the original models.
	     * @param response - The cursor response.
	     * @param documents - The documents in the cursor.
	     * @returns The current result.
	     */
	    async merge(cursor) {
	        let writeConcernErrorResult;
	        try {
	            for await (const document of cursor) {
	                // Only add to maps if ok: 1
	                if (document.ok === 1) {
	                    if (this.options.verboseResults) {
	                        this.processDocument(cursor, document);
	                    }
	                }
	                else {
	                    // If an individual write error is encountered during an ordered bulk write, drivers MUST
	                    // record the error in writeErrors and immediately throw the exception. Otherwise, drivers
	                    // MUST continue to iterate the results cursor and execute any further bulkWrite batches.
	                    if (this.options.ordered) {
	                        const error = new error_1.MongoClientBulkWriteError({
	                            message: 'Mongo client ordered bulk write encountered a write error.'
	                        });
	                        error.writeErrors.set(document.idx + this.currentBatchOffset, {
	                            code: document.code,
	                            message: document.errmsg
	                        });
	                        error.partialResult = this.result;
	                        throw error;
	                    }
	                    else {
	                        this.writeErrors.set(document.idx + this.currentBatchOffset, {
	                            code: document.code,
	                            message: document.errmsg
	                        });
	                    }
	                }
	            }
	        }
	        catch (error) {
	            if (error instanceof __1.MongoWriteConcernError) {
	                const result = error.result;
	                writeConcernErrorResult = {
	                    insertedCount: result.nInserted,
	                    upsertedCount: result.nUpserted,
	                    matchedCount: result.nMatched,
	                    modifiedCount: result.nModified,
	                    deletedCount: result.nDeleted,
	                    writeConcernError: result.writeConcernError
	                };
	                if (this.options.verboseResults && result.cursor.firstBatch) {
	                    for (const document of result.cursor.firstBatch) {
	                        if (document.ok === 1) {
	                            this.processDocument(cursor, document);
	                        }
	                    }
	                }
	            }
	            else {
	                throw error;
	            }
	        }
	        finally {
	            // Update the counts from the cursor response.
	            if (cursor.response) {
	                const response = cursor.response;
	                this.incrementCounts(response);
	            }
	            // Increment the batch offset.
	            this.currentBatchOffset += cursor.operations.length;
	        }
	        // If we have write concern errors ensure they are added.
	        if (writeConcernErrorResult) {
	            const writeConcernError = writeConcernErrorResult.writeConcernError;
	            this.incrementCounts(writeConcernErrorResult);
	            this.writeConcernErrors.push({
	                code: writeConcernError.code,
	                message: writeConcernError.errmsg
	            });
	        }
	        return this.result;
	    }
	    /**
	     * Process an individual document in the results.
	     * @param cursor - The cursor.
	     * @param document - The document to process.
	     */
	    processDocument(cursor, document) {
	        // Get the corresponding operation from the command.
	        const operation = cursor.operations[document.idx];
	        // Handle insert results.
	        if ('insert' in operation) {
	            this.result.insertResults?.set(document.idx + this.currentBatchOffset, {
	                insertedId: operation.document._id
	            });
	        }
	        // Handle update results.
	        if ('update' in operation) {
	            const result = {
	                matchedCount: document.n,
	                modifiedCount: document.nModified ?? 0,
	                // Check if the bulk did actually upsert.
	                didUpsert: document.upserted != null
	            };
	            if (document.upserted) {
	                result.upsertedId = document.upserted._id;
	            }
	            this.result.updateResults?.set(document.idx + this.currentBatchOffset, result);
	        }
	        // Handle delete results.
	        if ('delete' in operation) {
	            this.result.deleteResults?.set(document.idx + this.currentBatchOffset, {
	                deletedCount: document.n
	            });
	        }
	    }
	    /**
	     * Increment the result counts.
	     * @param document - The document with the results.
	     */
	    incrementCounts(document) {
	        this.result.insertedCount += document.insertedCount;
	        this.result.upsertedCount += document.upsertedCount;
	        this.result.matchedCount += document.matchedCount;
	        this.result.modifiedCount += document.modifiedCount;
	        this.result.deletedCount += document.deletedCount;
	    }
	}
	results_merger.ClientBulkWriteResultsMerger = ClientBulkWriteResultsMerger;
	
	return results_merger;
}

var hasRequiredExecutor;

function requireExecutor () {
	if (hasRequiredExecutor) return executor;
	hasRequiredExecutor = 1;
	Object.defineProperty(executor, "__esModule", { value: true });
	executor.ClientBulkWriteExecutor = void 0;
	const abstract_cursor_1 = mongodb3.requireAbstract_cursor();
	const client_bulk_write_cursor_1 = mongodb3.requireClient_bulk_write_cursor();
	const error_1 = mongodb4.requireError();
	const timeout_1 = mongodb6.requireTimeout();
	const utils_1 = mongodb7.requireUtils();
	const write_concern_1 = mongodb7.requireWrite_concern();
	const execute_operation_1 = requireExecute_operation();
	const client_bulk_write_1 = requireClient_bulk_write();
	const command_builder_1 = requireCommand_builder();
	const results_merger_1 = requireResults_merger();
	/**
	 * Responsible for executing a client bulk write.
	 * @internal
	 */
	class ClientBulkWriteExecutor {
	    /**
	     * Instantiate the executor.
	     * @param client - The mongo client.
	     * @param operations - The user supplied bulk write models.
	     * @param options - The bulk write options.
	     */
	    constructor(client, operations, options) {
	        if (operations.length === 0) {
	            throw new error_1.MongoClientBulkWriteExecutionError('No client bulk write models were provided.');
	        }
	        this.client = client;
	        this.operations = operations;
	        this.options = {
	            ordered: true,
	            bypassDocumentValidation: false,
	            verboseResults: false,
	            ...options
	        };
	        // If no write concern was provided, we inherit one from the client.
	        if (!this.options.writeConcern) {
	            this.options.writeConcern = write_concern_1.WriteConcern.fromOptions(this.client.s.options);
	        }
	        if (this.options.writeConcern?.w === 0) {
	            if (this.options.verboseResults) {
	                throw new error_1.MongoInvalidArgumentError('Cannot request unacknowledged write concern and verbose results');
	            }
	            if (this.options.ordered) {
	                throw new error_1.MongoInvalidArgumentError('Cannot request unacknowledged write concern and ordered writes');
	            }
	        }
	    }
	    /**
	     * Execute the client bulk write. Will split commands into batches and exhaust the cursors
	     * for each, then merge the results into one.
	     * @returns The result.
	     */
	    async execute() {
	        // The command builder will take the user provided models and potential split the batch
	        // into multiple commands due to size.
	        const pkFactory = this.client.s.options.pkFactory;
	        const commandBuilder = new command_builder_1.ClientBulkWriteCommandBuilder(this.operations, this.options, pkFactory);
	        // Unacknowledged writes need to execute all batches and return { ok: 1}
	        const resolvedOptions = (0, utils_1.resolveTimeoutOptions)(this.client, this.options);
	        const context = timeout_1.TimeoutContext.create(resolvedOptions);
	        if (this.options.writeConcern?.w === 0) {
	            while (commandBuilder.hasNextBatch()) {
	                const operation = new client_bulk_write_1.ClientBulkWriteOperation(commandBuilder, this.options);
	                await (0, execute_operation_1.executeOperation)(this.client, operation, context);
	            }
	            return results_merger_1.ClientBulkWriteResultsMerger.unacknowledged();
	        }
	        else {
	            const resultsMerger = new results_merger_1.ClientBulkWriteResultsMerger(this.options);
	            // For each command will will create and exhaust a cursor for the results.
	            while (commandBuilder.hasNextBatch()) {
	                const cursorContext = new abstract_cursor_1.CursorTimeoutContext(context, Symbol());
	                const options = {
	                    ...this.options,
	                    timeoutContext: cursorContext,
	                    ...(resolvedOptions.timeoutMS != null && { timeoutMode: abstract_cursor_1.CursorTimeoutMode.LIFETIME })
	                };
	                const cursor = new client_bulk_write_cursor_1.ClientBulkWriteCursor(this.client, commandBuilder, options);
	                try {
	                    await resultsMerger.merge(cursor);
	                }
	                catch (error) {
	                    // Write concern errors are recorded in the writeConcernErrors field on MongoClientBulkWriteError.
	                    // When a write concern error is encountered, it should not terminate execution of the bulk write
	                    // for either ordered or unordered bulk writes. However, drivers MUST throw an exception at the end
	                    // of execution if any write concern errors were observed.
	                    if (error instanceof error_1.MongoServerError && !(error instanceof error_1.MongoClientBulkWriteError)) {
	                        // Server side errors need to be wrapped inside a MongoClientBulkWriteError, where the root
	                        // cause is the error property and a partial result is to be included.
	                        const bulkWriteError = new error_1.MongoClientBulkWriteError({
	                            message: 'Mongo client bulk write encountered an error during execution'
	                        });
	                        bulkWriteError.cause = error;
	                        bulkWriteError.partialResult = resultsMerger.bulkWriteResult;
	                        throw bulkWriteError;
	                    }
	                    else {
	                        // Client side errors are just thrown.
	                        throw error;
	                    }
	                }
	            }
	            // If we have write concern errors or unordered write errors at the end we throw.
	            if (resultsMerger.writeConcernErrors.length > 0 || resultsMerger.writeErrors.size > 0) {
	                const error = new error_1.MongoClientBulkWriteError({
	                    message: 'Mongo client bulk write encountered errors during execution.'
	                });
	                error.writeConcernErrors = resultsMerger.writeConcernErrors;
	                error.writeErrors = resultsMerger.writeErrors;
	                error.partialResult = resultsMerger.bulkWriteResult;
	                throw error;
	            }
	            return resultsMerger.bulkWriteResult;
	        }
	    }
	}
	executor.ClientBulkWriteExecutor = ClientBulkWriteExecutor;
	
	return executor;
}

var end_sessions = {};

var hasRequiredEnd_sessions;

function requireEnd_sessions () {
	if (hasRequiredEnd_sessions) return end_sessions;
	hasRequiredEnd_sessions = 1;
	Object.defineProperty(end_sessions, "__esModule", { value: true });
	end_sessions.EndSessionsOperation = void 0;
	const responses_1 = mongodb3.requireResponses();
	const command_1 = requireCommand();
	const read_preference_1 = requireRead_preference();
	const utils_1 = mongodb7.requireUtils();
	const operation_1 = requireOperation();
	class EndSessionsOperation extends command_1.CommandOperation {
	    constructor(sessions) {
	        super();
	        this.writeConcern = { w: 0 };
	        this.ns = utils_1.MongoDBNamespace.fromString('admin.$cmd');
	        this.SERVER_COMMAND_RESPONSE_TYPE = responses_1.MongoDBResponse;
	        this.sessions = sessions;
	    }
	    buildCommandDocument(_connection, _session) {
	        return {
	            endSessions: this.sessions
	        };
	    }
	    buildOptions(timeoutContext) {
	        return {
	            timeoutContext,
	            readPreference: read_preference_1.ReadPreference.primaryPreferred
	        };
	    }
	    get commandName() {
	        return 'endSessions';
	    }
	}
	end_sessions.EndSessionsOperation = EndSessionsOperation;
	(0, operation_1.defineAspects)(EndSessionsOperation, operation_1.Aspect.WRITE_OPERATION);
	
	return end_sessions;
}

exports.requireAggregate = requireAggregate;
exports.requireClient_bulk_write = requireClient_bulk_write;
exports.requireCommon = requireCommon;
exports.requireCount = requireCount;
exports.requireCreate = requireCreate;
exports.requireCreate_collection = requireCreate_collection;
exports.requireDistinct = requireDistinct;
exports.requireDrop = requireDrop;
exports.requireDrop$1 = requireDrop$1;
exports.requireEnd_sessions = requireEnd_sessions;
exports.requireEstimated_document_count = requireEstimated_document_count;
exports.requireEvents = requireEvents;
exports.requireExecute_operation = requireExecute_operation;
exports.requireExecutor = requireExecutor;
exports.requireFind = requireFind;
exports.requireFind_and_modify = requireFind_and_modify;
exports.requireGet_more = requireGet_more;
exports.requireIndexes = requireIndexes;
exports.requireInsert = requireInsert;
exports.requireKill_cursors = requireKill_cursors;
exports.requireList_collections = requireList_collections;
exports.requireList_databases = requireList_databases;
exports.requireMongo_logger = requireMongo_logger;
exports.requireMongo_types = requireMongo_types;
exports.requireProfiling_level = requireProfiling_level;
exports.requireRead_concern = requireRead_concern;
exports.requireRead_preference = requireRead_preference;
exports.requireRemove_user = requireRemove_user;
exports.requireRename = requireRename;
exports.requireRun_command = requireRun_command;
exports.requireRuntime_adapters = requireRuntime_adapters;
exports.requireSet_profiling_level = requireSet_profiling_level;
exports.requireStats = requireStats;
exports.requireUpdate = requireUpdate$1;
exports.requireUpdate$1 = requireUpdate;
exports.requireValidate_collection = requireValidate_collection;
exports.require_delete = require_delete;
