'use strict';

const require$$0$4 = require('child_process');
const mongodb5 = require('./mongodb-5.js');
const mongodb7 = require('./mongodb-7.js');
const mongodb4 = require('./mongodb-4.js');
const mongodb6 = require('./mongodb-6.js');
const require$$0 = require('dns');
const require$$0$2 = require('net');
const require$$0$3 = require('fs/promises');
const require$$3 = require('tls');
const mongodb3 = require('./mongodb-3.js');
const require$$0$1 = require('process');
const bson1 = require('./bson-1.js');
const mongodb2 = require('./mongodb-2.js');

var admin = {};

var bson = {};

var hasRequiredBson;

function requireBson () {
	if (hasRequiredBson) return bson;
	hasRequiredBson = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.setUint32LE = exports.readInt32LE = exports.UUID = exports.Timestamp = exports.serialize = exports.ObjectId = exports.NumberUtils = exports.MinKey = exports.MaxKey = exports.Long = exports.Int32 = exports.EJSON = exports.Double = exports.deserialize = exports.Decimal128 = exports.DBRef = exports.Code = exports.calculateObjectSize = exports.ByteUtils = exports.BSONType = exports.BSONSymbol = exports.BSONRegExp = exports.BSONError = exports.BSON = exports.Binary = void 0;
		exports.parseToElementsToArray = parseToElementsToArray;
		exports.pluckBSONSerializeOptions = pluckBSONSerializeOptions;
		exports.resolveBSONOptions = resolveBSONOptions;
		exports.parseUtf8ValidationOption = parseUtf8ValidationOption;
		/* eslint-disable no-restricted-imports */
		const bson_1 = bson1.requireBson();
		var bson_2 = bson1.requireBson();
		Object.defineProperty(exports, "Binary", { enumerable: true, get: function () { return bson_2.Binary; } });
		Object.defineProperty(exports, "BSON", { enumerable: true, get: function () { return bson_2.BSON; } });
		Object.defineProperty(exports, "BSONError", { enumerable: true, get: function () { return bson_2.BSONError; } });
		Object.defineProperty(exports, "BSONRegExp", { enumerable: true, get: function () { return bson_2.BSONRegExp; } });
		Object.defineProperty(exports, "BSONSymbol", { enumerable: true, get: function () { return bson_2.BSONSymbol; } });
		Object.defineProperty(exports, "BSONType", { enumerable: true, get: function () { return bson_2.BSONType; } });
		Object.defineProperty(exports, "ByteUtils", { enumerable: true, get: function () { return bson_2.ByteUtils; } });
		Object.defineProperty(exports, "calculateObjectSize", { enumerable: true, get: function () { return bson_2.calculateObjectSize; } });
		Object.defineProperty(exports, "Code", { enumerable: true, get: function () { return bson_2.Code; } });
		Object.defineProperty(exports, "DBRef", { enumerable: true, get: function () { return bson_2.DBRef; } });
		Object.defineProperty(exports, "Decimal128", { enumerable: true, get: function () { return bson_2.Decimal128; } });
		Object.defineProperty(exports, "deserialize", { enumerable: true, get: function () { return bson_2.deserialize; } });
		Object.defineProperty(exports, "Double", { enumerable: true, get: function () { return bson_2.Double; } });
		Object.defineProperty(exports, "EJSON", { enumerable: true, get: function () { return bson_2.EJSON; } });
		Object.defineProperty(exports, "Int32", { enumerable: true, get: function () { return bson_2.Int32; } });
		Object.defineProperty(exports, "Long", { enumerable: true, get: function () { return bson_2.Long; } });
		Object.defineProperty(exports, "MaxKey", { enumerable: true, get: function () { return bson_2.MaxKey; } });
		Object.defineProperty(exports, "MinKey", { enumerable: true, get: function () { return bson_2.MinKey; } });
		Object.defineProperty(exports, "NumberUtils", { enumerable: true, get: function () { return bson_2.NumberUtils; } });
		Object.defineProperty(exports, "ObjectId", { enumerable: true, get: function () { return bson_2.ObjectId; } });
		Object.defineProperty(exports, "serialize", { enumerable: true, get: function () { return bson_2.serialize; } });
		Object.defineProperty(exports, "Timestamp", { enumerable: true, get: function () { return bson_2.Timestamp; } });
		Object.defineProperty(exports, "UUID", { enumerable: true, get: function () { return bson_2.UUID; } });
		function parseToElementsToArray(bytes, offset) {
		    const res = bson_1.BSON.onDemand.parseToElements(bytes, offset);
		    return Array.isArray(res) ? res : [...res];
		}
		// validates buffer inputs, used for read operations
		const validateBufferInputs = (buffer, offset, length) => {
		    if (offset < 0 || offset + length > buffer.length) {
		        throw new RangeError(`Attempt to access memory outside buffer bounds: buffer length: ${buffer.length}, offset: ${offset}, length: ${length}`);
		    }
		};
		// readInt32LE, reads a 32-bit integer from buffer at given offset
		// throws if offset is out of bounds
		const readInt32LE = (buffer, offset) => {
		    validateBufferInputs(buffer, offset, 4);
		    return bson_1.NumberUtils.getInt32LE(buffer, offset);
		};
		exports.readInt32LE = readInt32LE;
		const setUint32LE = (destination, offset, value) => {
		    destination[offset] = value;
		    value >>>= 8;
		    destination[offset + 1] = value;
		    value >>>= 8;
		    destination[offset + 2] = value;
		    value >>>= 8;
		    destination[offset + 3] = value;
		    return 4;
		};
		exports.setUint32LE = setUint32LE;
		function pluckBSONSerializeOptions(options) {
		    const { fieldsAsRaw, useBigInt64, promoteValues, promoteBuffers, promoteLongs, serializeFunctions, ignoreUndefined, bsonRegExp, raw, enableUtf8Validation } = options;
		    return {
		        fieldsAsRaw,
		        useBigInt64,
		        promoteValues,
		        promoteBuffers,
		        promoteLongs,
		        serializeFunctions,
		        ignoreUndefined,
		        bsonRegExp,
		        raw,
		        enableUtf8Validation
		    };
		}
		/**
		 * Merge the given BSONSerializeOptions, preferring options over the parent's options, and
		 * substituting defaults for values not set.
		 *
		 * @internal
		 */
		function resolveBSONOptions(options, parent) {
		    const parentOptions = parent?.bsonOptions;
		    return {
		        raw: options?.raw ?? parentOptions?.raw ?? false,
		        useBigInt64: options?.useBigInt64 ?? parentOptions?.useBigInt64 ?? false,
		        promoteLongs: options?.promoteLongs ?? parentOptions?.promoteLongs ?? true,
		        promoteValues: options?.promoteValues ?? parentOptions?.promoteValues ?? true,
		        promoteBuffers: options?.promoteBuffers ?? parentOptions?.promoteBuffers ?? false,
		        ignoreUndefined: options?.ignoreUndefined ?? parentOptions?.ignoreUndefined ?? false,
		        bsonRegExp: options?.bsonRegExp ?? parentOptions?.bsonRegExp ?? false,
		        serializeFunctions: options?.serializeFunctions ?? parentOptions?.serializeFunctions ?? false,
		        fieldsAsRaw: options?.fieldsAsRaw ?? parentOptions?.fieldsAsRaw ?? {},
		        enableUtf8Validation: options?.enableUtf8Validation ?? parentOptions?.enableUtf8Validation ?? true
		    };
		}
		/** @internal */
		function parseUtf8ValidationOption(options) {
		    const enableUtf8Validation = options?.enableUtf8Validation;
		    if (enableUtf8Validation === false) {
		        return { utf8: false };
		    }
		    return { utf8: { writeErrors: false } };
		}
		
	} (bson));
	return bson;
}

var hasRequiredAdmin;

function requireAdmin () {
	if (hasRequiredAdmin) return admin;
	hasRequiredAdmin = 1;
	Object.defineProperty(admin, "__esModule", { value: true });
	admin.Admin = void 0;
	const bson_1 = requireBson();
	const execute_operation_1 = mongodb5.requireExecute_operation();
	const list_databases_1 = mongodb5.requireList_databases();
	const remove_user_1 = mongodb5.requireRemove_user();
	const run_command_1 = mongodb5.requireRun_command();
	const validate_collection_1 = mongodb5.requireValidate_collection();
	const utils_1 = mongodb7.requireUtils();
	/**
	 * The **Admin** class is an internal class that allows convenient access to
	 * the admin functionality and commands for MongoDB.
	 *
	 * **ADMIN Cannot directly be instantiated**
	 * @public
	 *
	 * @example
	 * ```ts
	 * import { MongoClient } from 'mongodb';
	 *
	 * const client = new MongoClient('mongodb://localhost:27017');
	 * const admin = client.db().admin();
	 * const dbInfo = await admin.listDatabases();
	 * for (const db of dbInfo.databases) {
	 *   console.log(db.name);
	 * }
	 * ```
	 */
	class Admin {
	    /**
	     * Create a new Admin instance
	     * @internal
	     */
	    constructor(db) {
	        this.s = { db };
	    }
	    /**
	     * Execute a command
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
	     * @param command - The command to execute
	     * @param options - Optional settings for the command
	     */
	    async command(command, options) {
	        return await (0, execute_operation_1.executeOperation)(this.s.db.client, new run_command_1.RunCommandOperation(new utils_1.MongoDBNamespace('admin'), command, {
	            ...(0, bson_1.resolveBSONOptions)(options),
	            session: options?.session,
	            readPreference: options?.readPreference,
	            timeoutMS: options?.timeoutMS ?? this.s.db.timeoutMS
	        }));
	    }
	    /**
	     * Retrieve the server build information
	     *
	     * @param options - Optional settings for the command
	     */
	    async buildInfo(options) {
	        return await this.command({ buildinfo: 1 }, options);
	    }
	    /**
	     * Retrieve the server build information
	     *
	     * @param options - Optional settings for the command
	     */
	    async serverInfo(options) {
	        return await this.command({ buildinfo: 1 }, options);
	    }
	    /**
	     * Retrieve this db's server status.
	     *
	     * @param options - Optional settings for the command
	     */
	    async serverStatus(options) {
	        return await this.command({ serverStatus: 1 }, options);
	    }
	    /**
	     * Ping the MongoDB server and retrieve results
	     *
	     * @param options - Optional settings for the command
	     */
	    async ping(options) {
	        return await this.command({ ping: 1 }, options);
	    }
	    /**
	     * Remove a user from a database
	     *
	     * @param username - The username to remove
	     * @param options - Optional settings for the command
	     */
	    async removeUser(username, options) {
	        return await (0, execute_operation_1.executeOperation)(this.s.db.client, new remove_user_1.RemoveUserOperation(this.s.db, username, { dbName: 'admin', ...options }));
	    }
	    /**
	     * Validate an existing collection
	     *
	     * @param collectionName - The name of the collection to validate.
	     * @param options - Optional settings for the command
	     */
	    async validateCollection(collectionName, options = {}) {
	        return await (0, execute_operation_1.executeOperation)(this.s.db.client, new validate_collection_1.ValidateCollectionOperation(this, collectionName, options));
	    }
	    /**
	     * List the available databases
	     *
	     * @param options - Optional settings for the command
	     */
	    async listDatabases(options) {
	        return await (0, execute_operation_1.executeOperation)(this.s.db.client, new list_databases_1.ListDatabasesOperation(this.s.db, { timeoutMS: this.s.db.timeoutMS, ...options }));
	    }
	    /**
	     * Get ReplicaSet status
	     *
	     * @param options - Optional settings for the command
	     */
	    async replSetGetStatus(options) {
	        return await this.command({ replSetGetStatus: 1 }, options);
	    }
	}
	admin.Admin = Admin;
	
	return admin;
}

var ordered = {};

var common = {};

var hasRequiredCommon;

function requireCommon () {
	if (hasRequiredCommon) return common;
	hasRequiredCommon = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.BulkOperationBase = exports.FindOperators = exports.MongoBulkWriteError = exports.WriteError = exports.WriteConcernError = exports.BulkWriteResult = exports.Batch = exports.BatchType = void 0;
		exports.mergeBatchResults = mergeBatchResults;
		const bson_1 = requireBson();
		const error_1 = mongodb4.requireError();
		const delete_1 = mongodb5.require_delete();
		const execute_operation_1 = mongodb5.requireExecute_operation();
		const insert_1 = mongodb5.requireInsert();
		const update_1 = mongodb5.requireUpdate();
		const timeout_1 = mongodb6.requireTimeout();
		const utils_1 = mongodb7.requireUtils();
		const write_concern_1 = mongodb7.requireWrite_concern();
		/** @public */
		exports.BatchType = Object.freeze({
		    INSERT: 1,
		    UPDATE: 2,
		    DELETE: 3
		});
		/**
		 * Keeps the state of a unordered batch so we can rewrite the results
		 * correctly after command execution
		 *
		 * @public
		 */
		class Batch {
		    constructor(batchType, originalZeroIndex) {
		        this.originalZeroIndex = originalZeroIndex;
		        this.currentIndex = 0;
		        this.originalIndexes = [];
		        this.batchType = batchType;
		        this.operations = [];
		        this.size = 0;
		        this.sizeBytes = 0;
		    }
		}
		exports.Batch = Batch;
		/**
		 * @public
		 * The result of a bulk write.
		 */
		class BulkWriteResult {
		    static generateIdMap(ids) {
		        const idMap = {};
		        for (const doc of ids) {
		            idMap[doc.index] = doc._id;
		        }
		        return idMap;
		    }
		    /**
		     * Create a new BulkWriteResult instance
		     * @internal
		     */
		    constructor(bulkResult, isOrdered) {
		        this.result = bulkResult;
		        this.insertedCount = this.result.nInserted ?? 0;
		        this.matchedCount = this.result.nMatched ?? 0;
		        this.modifiedCount = this.result.nModified ?? 0;
		        this.deletedCount = this.result.nRemoved ?? 0;
		        this.upsertedCount = this.result.upserted.length ?? 0;
		        this.upsertedIds = BulkWriteResult.generateIdMap(this.result.upserted);
		        this.insertedIds = BulkWriteResult.generateIdMap(this.getSuccessfullyInsertedIds(bulkResult, isOrdered));
		        Object.defineProperty(this, 'result', { value: this.result, enumerable: false });
		    }
		    /** Evaluates to true if the bulk operation correctly executes */
		    get ok() {
		        return this.result.ok;
		    }
		    /**
		     * Returns document_ids that were actually inserted
		     * @internal
		     */
		    getSuccessfullyInsertedIds(bulkResult, isOrdered) {
		        if (bulkResult.writeErrors.length === 0)
		            return bulkResult.insertedIds;
		        if (isOrdered) {
		            return bulkResult.insertedIds.slice(0, bulkResult.writeErrors[0].index);
		        }
		        return bulkResult.insertedIds.filter(({ index }) => !bulkResult.writeErrors.some(writeError => index === writeError.index));
		    }
		    /** Returns the upserted id at the given index */
		    getUpsertedIdAt(index) {
		        return this.result.upserted[index];
		    }
		    /** Returns raw internal result */
		    getRawResponse() {
		        return this.result;
		    }
		    /** Returns true if the bulk operation contains a write error */
		    hasWriteErrors() {
		        return this.result.writeErrors.length > 0;
		    }
		    /** Returns the number of write errors from the bulk operation */
		    getWriteErrorCount() {
		        return this.result.writeErrors.length;
		    }
		    /** Returns a specific write error object */
		    getWriteErrorAt(index) {
		        return index < this.result.writeErrors.length ? this.result.writeErrors[index] : undefined;
		    }
		    /** Retrieve all write errors */
		    getWriteErrors() {
		        return this.result.writeErrors;
		    }
		    /** Retrieve the write concern error if one exists */
		    getWriteConcernError() {
		        if (this.result.writeConcernErrors.length === 0) {
		            return;
		        }
		        else if (this.result.writeConcernErrors.length === 1) {
		            // Return the error
		            return this.result.writeConcernErrors[0];
		        }
		        else {
		            // Combine the errors
		            let errmsg = '';
		            for (let i = 0; i < this.result.writeConcernErrors.length; i++) {
		                const err = this.result.writeConcernErrors[i];
		                errmsg = errmsg + err.errmsg;
		                // TODO: Something better
		                if (i === 0)
		                    errmsg = errmsg + ' and ';
		            }
		            return new WriteConcernError({ errmsg, code: error_1.MONGODB_ERROR_CODES.WriteConcernTimeout });
		        }
		    }
		    toString() {
		        return `BulkWriteResult(${bson_1.EJSON.stringify(this.result)})`;
		    }
		    isOk() {
		        return this.result.ok === 1;
		    }
		}
		exports.BulkWriteResult = BulkWriteResult;
		/**
		 * An error representing a failure by the server to apply the requested write concern to the bulk operation.
		 * @public
		 * @category Error
		 */
		class WriteConcernError {
		    constructor(error) {
		        this.serverError = error;
		    }
		    /** Write concern error code. */
		    get code() {
		        return this.serverError.code;
		    }
		    /** Write concern error message. */
		    get errmsg() {
		        return this.serverError.errmsg;
		    }
		    /** Write concern error info. */
		    get errInfo() {
		        return this.serverError.errInfo;
		    }
		    toJSON() {
		        return this.serverError;
		    }
		    toString() {
		        return `WriteConcernError(${this.errmsg})`;
		    }
		}
		exports.WriteConcernError = WriteConcernError;
		/**
		 * An error that occurred during a BulkWrite on the server.
		 * @public
		 * @category Error
		 */
		class WriteError {
		    constructor(err) {
		        this.err = err;
		    }
		    /** WriteError code. */
		    get code() {
		        return this.err.code;
		    }
		    /** WriteError original bulk operation index. */
		    get index() {
		        return this.err.index;
		    }
		    /** WriteError message. */
		    get errmsg() {
		        return this.err.errmsg;
		    }
		    /** WriteError details. */
		    get errInfo() {
		        return this.err.errInfo;
		    }
		    /** Returns the underlying operation that caused the error */
		    getOperation() {
		        return this.err.op;
		    }
		    toJSON() {
		        return { code: this.err.code, index: this.err.index, errmsg: this.err.errmsg, op: this.err.op };
		    }
		    toString() {
		        return `WriteError(${JSON.stringify(this.toJSON())})`;
		    }
		}
		exports.WriteError = WriteError;
		/** Merges results into shared data structure */
		function mergeBatchResults(batch, bulkResult, err, result) {
		    // If we have an error set the result to be the err object
		    if (err) {
		        result = err;
		    }
		    else if (result && result.result) {
		        result = result.result;
		    }
		    if (result == null) {
		        return;
		    }
		    // Do we have a top level error stop processing and return
		    if (result.ok === 0 && bulkResult.ok === 1) {
		        bulkResult.ok = 0;
		        const writeError = {
		            index: 0,
		            code: result.code || 0,
		            errmsg: result.message,
		            errInfo: result.errInfo,
		            op: batch.operations[0]
		        };
		        bulkResult.writeErrors.push(new WriteError(writeError));
		        return;
		    }
		    else if (result.ok === 0 && bulkResult.ok === 0) {
		        return;
		    }
		    // If we have an insert Batch type
		    if (isInsertBatch(batch) && result.n) {
		        bulkResult.nInserted = bulkResult.nInserted + result.n;
		    }
		    // If we have an insert Batch type
		    if (isDeleteBatch(batch) && result.n) {
		        bulkResult.nRemoved = bulkResult.nRemoved + result.n;
		    }
		    let nUpserted = 0;
		    // We have an array of upserted values, we need to rewrite the indexes
		    if (Array.isArray(result.upserted)) {
		        nUpserted = result.upserted.length;
		        for (let i = 0; i < result.upserted.length; i++) {
		            bulkResult.upserted.push({
		                index: result.upserted[i].index + batch.originalZeroIndex,
		                _id: result.upserted[i]._id
		            });
		        }
		    }
		    else if (result.upserted) {
		        nUpserted = 1;
		        bulkResult.upserted.push({
		            index: batch.originalZeroIndex,
		            _id: result.upserted
		        });
		    }
		    // If we have an update Batch type
		    if (isUpdateBatch(batch) && result.n) {
		        const nModified = result.nModified;
		        bulkResult.nUpserted = bulkResult.nUpserted + nUpserted;
		        bulkResult.nMatched = bulkResult.nMatched + (result.n - nUpserted);
		        if (typeof nModified === 'number') {
		            bulkResult.nModified = bulkResult.nModified + nModified;
		        }
		        else {
		            bulkResult.nModified = 0;
		        }
		    }
		    if (Array.isArray(result.writeErrors)) {
		        for (let i = 0; i < result.writeErrors.length; i++) {
		            const writeError = {
		                index: batch.originalIndexes[result.writeErrors[i].index],
		                code: result.writeErrors[i].code,
		                errmsg: result.writeErrors[i].errmsg,
		                errInfo: result.writeErrors[i].errInfo,
		                op: batch.operations[result.writeErrors[i].index]
		            };
		            bulkResult.writeErrors.push(new WriteError(writeError));
		        }
		    }
		    if (result.writeConcernError) {
		        bulkResult.writeConcernErrors.push(new WriteConcernError(result.writeConcernError));
		    }
		}
		async function executeCommands(bulkOperation, options) {
		    if (bulkOperation.s.batches.length === 0) {
		        return new BulkWriteResult(bulkOperation.s.bulkResult, bulkOperation.isOrdered);
		    }
		    for (const batch of bulkOperation.s.batches) {
		        const finalOptions = (0, utils_1.resolveOptions)(bulkOperation, {
		            ...options,
		            ordered: bulkOperation.isOrdered
		        });
		        if (finalOptions.bypassDocumentValidation !== true) {
		            delete finalOptions.bypassDocumentValidation;
		        }
		        // Is the bypassDocumentValidation options specific
		        if (bulkOperation.s.bypassDocumentValidation === true) {
		            finalOptions.bypassDocumentValidation = true;
		        }
		        // Is the checkKeys option disabled
		        if (bulkOperation.s.checkKeys === false) {
		            finalOptions.checkKeys = false;
		        }
		        if (bulkOperation.retryWrites) {
		            if (isUpdateBatch(batch)) {
		                bulkOperation.retryWrites =
		                    bulkOperation.retryWrites && !batch.operations.some(op => op.multi);
		            }
		            if (isDeleteBatch(batch)) {
		                bulkOperation.retryWrites =
		                    bulkOperation.retryWrites && !batch.operations.some(op => op.limit === 0);
		            }
		        }
		        const operation = isInsertBatch(batch)
		            ? new insert_1.InsertOperation(bulkOperation.s.namespace, batch.operations, finalOptions)
		            : isUpdateBatch(batch)
		                ? new update_1.UpdateOperation(bulkOperation.s.namespace, batch.operations, finalOptions)
		                : isDeleteBatch(batch)
		                    ? new delete_1.DeleteOperation(bulkOperation.s.namespace, batch.operations, finalOptions)
		                    : null;
		        if (operation == null)
		            throw new error_1.MongoRuntimeError(`Unknown batchType: ${batch.batchType}`);
		        let thrownError = null;
		        let result;
		        try {
		            result = await (0, execute_operation_1.executeOperation)(bulkOperation.s.collection.client, operation, finalOptions.timeoutContext);
		        }
		        catch (error) {
		            thrownError = error;
		        }
		        if (thrownError != null) {
		            if (thrownError instanceof error_1.MongoWriteConcernError) {
		                mergeBatchResults(batch, bulkOperation.s.bulkResult, thrownError, result);
		                const writeResult = new BulkWriteResult(bulkOperation.s.bulkResult, bulkOperation.isOrdered);
		                throw new MongoBulkWriteError({
		                    message: thrownError.result.writeConcernError.errmsg,
		                    code: thrownError.result.writeConcernError.code
		                }, writeResult);
		            }
		            else {
		                // Error is a driver related error not a bulk op error, return early
		                throw new MongoBulkWriteError(thrownError, new BulkWriteResult(bulkOperation.s.bulkResult, bulkOperation.isOrdered));
		            }
		        }
		        mergeBatchResults(batch, bulkOperation.s.bulkResult, thrownError, result);
		        const writeResult = new BulkWriteResult(bulkOperation.s.bulkResult, bulkOperation.isOrdered);
		        bulkOperation.handleWriteError(writeResult);
		    }
		    bulkOperation.s.batches.length = 0;
		    const writeResult = new BulkWriteResult(bulkOperation.s.bulkResult, bulkOperation.isOrdered);
		    bulkOperation.handleWriteError(writeResult);
		    return writeResult;
		}
		/**
		 * An error indicating an unsuccessful Bulk Write
		 * @public
		 * @category Error
		 */
		class MongoBulkWriteError extends error_1.MongoServerError {
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
		    constructor(error, result) {
		        super(error);
		        this.writeErrors = [];
		        if (error instanceof WriteConcernError)
		            this.err = error;
		        else if (!(error instanceof Error)) {
		            this.message = error.message;
		            this.code = error.code;
		            this.writeErrors = error.writeErrors ?? [];
		        }
		        this.result = result;
		        Object.assign(this, error);
		    }
		    get name() {
		        return 'MongoBulkWriteError';
		    }
		    /** Number of documents inserted. */
		    get insertedCount() {
		        return this.result.insertedCount;
		    }
		    /** Number of documents matched for update. */
		    get matchedCount() {
		        return this.result.matchedCount;
		    }
		    /** Number of documents modified. */
		    get modifiedCount() {
		        return this.result.modifiedCount;
		    }
		    /** Number of documents deleted. */
		    get deletedCount() {
		        return this.result.deletedCount;
		    }
		    /** Number of documents upserted. */
		    get upsertedCount() {
		        return this.result.upsertedCount;
		    }
		    /** Inserted document generated Id's, hash key is the index of the originating operation */
		    get insertedIds() {
		        return this.result.insertedIds;
		    }
		    /** Upserted document generated Id's, hash key is the index of the originating operation */
		    get upsertedIds() {
		        return this.result.upsertedIds;
		    }
		}
		exports.MongoBulkWriteError = MongoBulkWriteError;
		/**
		 * A builder object that is returned from {@link BulkOperationBase#find}.
		 * Is used to build a write operation that involves a query filter.
		 *
		 * @public
		 */
		class FindOperators {
		    /**
		     * Creates a new FindOperators object.
		     * @internal
		     */
		    constructor(bulkOperation) {
		        this.bulkOperation = bulkOperation;
		    }
		    /** Add a multiple update operation to the bulk operation */
		    update(updateDocument) {
		        const currentOp = buildCurrentOp(this.bulkOperation);
		        return this.bulkOperation.addToOperationsList(exports.BatchType.UPDATE, (0, update_1.makeUpdateStatement)(currentOp.selector, updateDocument, {
		            ...currentOp,
		            multi: true
		        }));
		    }
		    /** Add a single update operation to the bulk operation */
		    updateOne(updateDocument) {
		        if (!(0, utils_1.hasAtomicOperators)(updateDocument, this.bulkOperation.bsonOptions)) {
		            throw new error_1.MongoInvalidArgumentError('Update document requires atomic operators');
		        }
		        const currentOp = buildCurrentOp(this.bulkOperation);
		        return this.bulkOperation.addToOperationsList(exports.BatchType.UPDATE, (0, update_1.makeUpdateStatement)(currentOp.selector, updateDocument, { ...currentOp, multi: false }));
		    }
		    /** Add a replace one operation to the bulk operation */
		    replaceOne(replacement) {
		        if ((0, utils_1.hasAtomicOperators)(replacement)) {
		            throw new error_1.MongoInvalidArgumentError('Replacement document must not use atomic operators');
		        }
		        const currentOp = buildCurrentOp(this.bulkOperation);
		        return this.bulkOperation.addToOperationsList(exports.BatchType.UPDATE, (0, update_1.makeUpdateStatement)(currentOp.selector, replacement, { ...currentOp, multi: false }));
		    }
		    /** Add a delete one operation to the bulk operation */
		    deleteOne() {
		        const currentOp = buildCurrentOp(this.bulkOperation);
		        return this.bulkOperation.addToOperationsList(exports.BatchType.DELETE, (0, delete_1.makeDeleteStatement)(currentOp.selector, { ...currentOp, limit: 1 }));
		    }
		    /** Add a delete many operation to the bulk operation */
		    delete() {
		        const currentOp = buildCurrentOp(this.bulkOperation);
		        return this.bulkOperation.addToOperationsList(exports.BatchType.DELETE, (0, delete_1.makeDeleteStatement)(currentOp.selector, { ...currentOp, limit: 0 }));
		    }
		    /** Upsert modifier for update bulk operation, noting that this operation is an upsert. */
		    upsert() {
		        if (!this.bulkOperation.s.currentOp) {
		            this.bulkOperation.s.currentOp = {};
		        }
		        this.bulkOperation.s.currentOp.upsert = true;
		        return this;
		    }
		    /** Specifies the collation for the query condition. */
		    collation(collation) {
		        if (!this.bulkOperation.s.currentOp) {
		            this.bulkOperation.s.currentOp = {};
		        }
		        this.bulkOperation.s.currentOp.collation = collation;
		        return this;
		    }
		    /** Specifies arrayFilters for UpdateOne or UpdateMany bulk operations. */
		    arrayFilters(arrayFilters) {
		        if (!this.bulkOperation.s.currentOp) {
		            this.bulkOperation.s.currentOp = {};
		        }
		        this.bulkOperation.s.currentOp.arrayFilters = arrayFilters;
		        return this;
		    }
		    /** Specifies hint for the bulk operation. */
		    hint(hint) {
		        if (!this.bulkOperation.s.currentOp) {
		            this.bulkOperation.s.currentOp = {};
		        }
		        this.bulkOperation.s.currentOp.hint = hint;
		        return this;
		    }
		}
		exports.FindOperators = FindOperators;
		/** @public */
		class BulkOperationBase {
		    /**
		     * Create a new OrderedBulkOperation or UnorderedBulkOperation instance
		     * @internal
		     */
		    constructor(collection, options, isOrdered) {
		        this.collection = collection;
		        this.retryWrites = collection.db.options?.retryWrites;
		        // determine whether bulkOperation is ordered or unordered
		        this.isOrdered = isOrdered;
		        const topology = (0, utils_1.getTopology)(collection);
		        options = options == null ? {} : options;
		        // TODO Bring from driver information in hello
		        // Get the namespace for the write operations
		        const namespace = collection.s.namespace;
		        // Used to mark operation as executed
		        const executed = false;
		        // Current item
		        const currentOp = undefined;
		        // Set max byte size
		        const hello = topology.lastHello();
		        // If we have autoEncryption on, batch-splitting must be done on 2mb chunks, but single documents
		        // over 2mb are still allowed
		        const usingAutoEncryption = !!(topology.s.options && topology.s.options.autoEncrypter);
		        const maxBsonObjectSize = hello && hello.maxBsonObjectSize ? hello.maxBsonObjectSize : 1024 * 1024 * 16;
		        const maxBatchSizeBytes = usingAutoEncryption ? 1024 * 1024 * 2 : maxBsonObjectSize;
		        const maxWriteBatchSize = hello && hello.maxWriteBatchSize ? hello.maxWriteBatchSize : 1000;
		        // Calculates the largest possible size of an Array key, represented as a BSON string
		        // element. This calculation:
		        //     1 byte for BSON type
		        //     # of bytes = length of (string representation of (maxWriteBatchSize - 1))
		        //   + 1 bytes for null terminator
		        const maxKeySize = (maxWriteBatchSize - 1).toString(10).length + 2;
		        // Final results
		        const bulkResult = {
		            ok: 1,
		            writeErrors: [],
		            writeConcernErrors: [],
		            insertedIds: [],
		            nInserted: 0,
		            nUpserted: 0,
		            nMatched: 0,
		            nModified: 0,
		            nRemoved: 0,
		            upserted: []
		        };
		        // Internal state
		        this.s = {
		            // Final result
		            bulkResult,
		            // Current batch state
		            currentBatch: undefined,
		            currentIndex: 0,
		            // ordered specific
		            currentBatchSize: 0,
		            currentBatchSizeBytes: 0,
		            // unordered specific
		            currentInsertBatch: undefined,
		            currentUpdateBatch: undefined,
		            currentRemoveBatch: undefined,
		            batches: [],
		            // Write concern
		            writeConcern: write_concern_1.WriteConcern.fromOptions(options),
		            // Max batch size options
		            maxBsonObjectSize,
		            maxBatchSizeBytes,
		            maxWriteBatchSize,
		            maxKeySize,
		            // Namespace
		            namespace,
		            // Topology
		            topology,
		            // Options
		            options: options,
		            // BSON options
		            bsonOptions: (0, bson_1.resolveBSONOptions)(options),
		            // Current operation
		            currentOp,
		            // Executed
		            executed,
		            // Collection
		            collection,
		            // Fundamental error
		            err: undefined,
		            // check keys
		            checkKeys: typeof options.checkKeys === 'boolean' ? options.checkKeys : false
		        };
		        // bypass Validation
		        if (options.bypassDocumentValidation === true) {
		            this.s.bypassDocumentValidation = true;
		        }
		    }
		    /**
		     * Add a single insert document to the bulk operation
		     *
		     * @example
		     * ```ts
		     * const bulkOp = collection.initializeOrderedBulkOp();
		     *
		     * // Adds three inserts to the bulkOp.
		     * bulkOp
		     *   .insert({ a: 1 })
		     *   .insert({ b: 2 })
		     *   .insert({ c: 3 });
		     * await bulkOp.execute();
		     * ```
		     */
		    insert(document) {
		        (0, utils_1.maybeAddIdToDocuments)(this.collection, document, {
		            forceServerObjectId: this.shouldForceServerObjectId()
		        });
		        return this.addToOperationsList(exports.BatchType.INSERT, document);
		    }
		    /**
		     * Builds a find operation for an update/updateOne/delete/deleteOne/replaceOne.
		     * Returns a builder object used to complete the definition of the operation.
		     *
		     * @example
		     * ```ts
		     * const bulkOp = collection.initializeOrderedBulkOp();
		     *
		     * // Add an updateOne to the bulkOp
		     * bulkOp.find({ a: 1 }).updateOne({ $set: { b: 2 } });
		     *
		     * // Add an updateMany to the bulkOp
		     * bulkOp.find({ c: 3 }).update({ $set: { d: 4 } });
		     *
		     * // Add an upsert
		     * bulkOp.find({ e: 5 }).upsert().updateOne({ $set: { f: 6 } });
		     *
		     * // Add a deletion
		     * bulkOp.find({ g: 7 }).deleteOne();
		     *
		     * // Add a multi deletion
		     * bulkOp.find({ h: 8 }).delete();
		     *
		     * // Add a replaceOne
		     * bulkOp.find({ i: 9 }).replaceOne({writeConcern: { j: 10 }});
		     *
		     * // Update using a pipeline (requires Mongodb 4.2 or higher)
		     * bulk.find({ k: 11, y: { $exists: true }, z: { $exists: true } }).updateOne([
		     *   { $set: { total: { $sum: [ '$y', '$z' ] } } }
		     * ]);
		     *
		     * // All of the ops will now be executed
		     * await bulkOp.execute();
		     * ```
		     */
		    find(selector) {
		        if (!selector) {
		            throw new error_1.MongoInvalidArgumentError('Bulk find operation must specify a selector');
		        }
		        // Save a current selector
		        this.s.currentOp = {
		            selector: selector
		        };
		        return new FindOperators(this);
		    }
		    /** Specifies a raw operation to perform in the bulk write. */
		    raw(op) {
		        if (op == null || typeof op !== 'object') {
		            throw new error_1.MongoInvalidArgumentError('Operation must be an object with an operation key');
		        }
		        if ('insertOne' in op) {
		            const forceServerObjectId = this.shouldForceServerObjectId();
		            const document = op.insertOne && op.insertOne.document == null
		                ? // TODO(NODE-6003): remove support for omitting the `documents` subdocument in bulk inserts
		                    op.insertOne
		                : op.insertOne.document;
		            (0, utils_1.maybeAddIdToDocuments)(this.collection, document, { forceServerObjectId });
		            return this.addToOperationsList(exports.BatchType.INSERT, document);
		        }
		        if ('replaceOne' in op || 'updateOne' in op || 'updateMany' in op) {
		            if ('replaceOne' in op) {
		                if ('q' in op.replaceOne) {
		                    throw new error_1.MongoInvalidArgumentError('Raw operations are not allowed');
		                }
		                const updateStatement = (0, update_1.makeUpdateStatement)(op.replaceOne.filter, op.replaceOne.replacement, { ...op.replaceOne, multi: false });
		                if ((0, utils_1.hasAtomicOperators)(updateStatement.u)) {
		                    throw new error_1.MongoInvalidArgumentError('Replacement document must not use atomic operators');
		                }
		                return this.addToOperationsList(exports.BatchType.UPDATE, updateStatement);
		            }
		            if ('updateOne' in op) {
		                if ('q' in op.updateOne) {
		                    throw new error_1.MongoInvalidArgumentError('Raw operations are not allowed');
		                }
		                const updateStatement = (0, update_1.makeUpdateStatement)(op.updateOne.filter, op.updateOne.update, {
		                    ...op.updateOne,
		                    multi: false
		                });
		                if (!(0, utils_1.hasAtomicOperators)(updateStatement.u, this.bsonOptions)) {
		                    throw new error_1.MongoInvalidArgumentError('Update document requires atomic operators');
		                }
		                return this.addToOperationsList(exports.BatchType.UPDATE, updateStatement);
		            }
		            if ('updateMany' in op) {
		                if ('q' in op.updateMany) {
		                    throw new error_1.MongoInvalidArgumentError('Raw operations are not allowed');
		                }
		                const updateStatement = (0, update_1.makeUpdateStatement)(op.updateMany.filter, op.updateMany.update, {
		                    ...op.updateMany,
		                    multi: true
		                });
		                if (!(0, utils_1.hasAtomicOperators)(updateStatement.u, this.bsonOptions)) {
		                    throw new error_1.MongoInvalidArgumentError('Update document requires atomic operators');
		                }
		                return this.addToOperationsList(exports.BatchType.UPDATE, updateStatement);
		            }
		        }
		        if ('deleteOne' in op) {
		            if ('q' in op.deleteOne) {
		                throw new error_1.MongoInvalidArgumentError('Raw operations are not allowed');
		            }
		            return this.addToOperationsList(exports.BatchType.DELETE, (0, delete_1.makeDeleteStatement)(op.deleteOne.filter, { ...op.deleteOne, limit: 1 }));
		        }
		        if ('deleteMany' in op) {
		            if ('q' in op.deleteMany) {
		                throw new error_1.MongoInvalidArgumentError('Raw operations are not allowed');
		            }
		            return this.addToOperationsList(exports.BatchType.DELETE, (0, delete_1.makeDeleteStatement)(op.deleteMany.filter, { ...op.deleteMany, limit: 0 }));
		        }
		        // otherwise an unknown operation was provided
		        throw new error_1.MongoInvalidArgumentError('bulkWrite only supports insertOne, updateOne, updateMany, deleteOne, deleteMany');
		    }
		    get length() {
		        return this.s.currentIndex;
		    }
		    get bsonOptions() {
		        return this.s.bsonOptions;
		    }
		    get writeConcern() {
		        return this.s.writeConcern;
		    }
		    get batches() {
		        const batches = [...this.s.batches];
		        if (this.isOrdered) {
		            if (this.s.currentBatch)
		                batches.push(this.s.currentBatch);
		        }
		        else {
		            if (this.s.currentInsertBatch)
		                batches.push(this.s.currentInsertBatch);
		            if (this.s.currentUpdateBatch)
		                batches.push(this.s.currentUpdateBatch);
		            if (this.s.currentRemoveBatch)
		                batches.push(this.s.currentRemoveBatch);
		        }
		        return batches;
		    }
		    async execute(options = {}) {
		        if (this.s.executed) {
		            throw new error_1.MongoBatchReExecutionError();
		        }
		        const writeConcern = write_concern_1.WriteConcern.fromOptions(options);
		        if (writeConcern) {
		            this.s.writeConcern = writeConcern;
		        }
		        // If we have current batch
		        if (this.isOrdered) {
		            if (this.s.currentBatch)
		                this.s.batches.push(this.s.currentBatch);
		        }
		        else {
		            if (this.s.currentInsertBatch)
		                this.s.batches.push(this.s.currentInsertBatch);
		            if (this.s.currentUpdateBatch)
		                this.s.batches.push(this.s.currentUpdateBatch);
		            if (this.s.currentRemoveBatch)
		                this.s.batches.push(this.s.currentRemoveBatch);
		        }
		        // If we have no operations in the bulk raise an error
		        if (this.s.batches.length === 0) {
		            throw new error_1.MongoInvalidArgumentError('Invalid BulkOperation, Batch cannot be empty');
		        }
		        this.s.executed = true;
		        const finalOptions = (0, utils_1.resolveOptions)(this.collection, { ...this.s.options, ...options });
		        // if there is no timeoutContext provided, create a timeoutContext and use it for
		        // all batches in the bulk operation
		        finalOptions.timeoutContext ??= timeout_1.TimeoutContext.create({
		            session: finalOptions.session,
		            timeoutMS: finalOptions.timeoutMS,
		            serverSelectionTimeoutMS: this.collection.client.s.options.serverSelectionTimeoutMS,
		            waitQueueTimeoutMS: this.collection.client.s.options.waitQueueTimeoutMS
		        });
		        if (finalOptions.session == null) {
		            // if there is not an explicit session provided to `execute()`, create
		            // an implicit session and use that for all batches in the bulk operation
		            return await this.collection.client.withSession({ explicit: false }, async (session) => {
		                return await executeCommands(this, { ...finalOptions, session });
		            });
		        }
		        return await executeCommands(this, { ...finalOptions });
		    }
		    /**
		     * Handles the write error before executing commands
		     * @internal
		     */
		    handleWriteError(writeResult) {
		        if (this.s.bulkResult.writeErrors.length > 0) {
		            const msg = this.s.bulkResult.writeErrors[0].errmsg
		                ? this.s.bulkResult.writeErrors[0].errmsg
		                : 'write operation failed';
		            throw new MongoBulkWriteError({
		                message: msg,
		                code: this.s.bulkResult.writeErrors[0].code,
		                writeErrors: this.s.bulkResult.writeErrors
		            }, writeResult);
		        }
		        const writeConcernError = writeResult.getWriteConcernError();
		        if (writeConcernError) {
		            throw new MongoBulkWriteError(writeConcernError, writeResult);
		        }
		    }
		    shouldForceServerObjectId() {
		        return (this.s.options.forceServerObjectId === true ||
		            this.s.collection.db.options?.forceServerObjectId === true);
		    }
		}
		exports.BulkOperationBase = BulkOperationBase;
		function isInsertBatch(batch) {
		    return batch.batchType === exports.BatchType.INSERT;
		}
		function isUpdateBatch(batch) {
		    return batch.batchType === exports.BatchType.UPDATE;
		}
		function isDeleteBatch(batch) {
		    return batch.batchType === exports.BatchType.DELETE;
		}
		function buildCurrentOp(bulkOp) {
		    let { currentOp } = bulkOp.s;
		    bulkOp.s.currentOp = undefined;
		    if (!currentOp)
		        currentOp = {};
		    return currentOp;
		}
		
	} (common));
	return common;
}

var hasRequiredOrdered;

function requireOrdered () {
	if (hasRequiredOrdered) return ordered;
	hasRequiredOrdered = 1;
	Object.defineProperty(ordered, "__esModule", { value: true });
	ordered.OrderedBulkOperation = void 0;
	const BSON = requireBson();
	const error_1 = mongodb4.requireError();
	const common_1 = requireCommon();
	/** @public */
	class OrderedBulkOperation extends common_1.BulkOperationBase {
	    /** @internal */
	    constructor(collection, options) {
	        super(collection, options, true);
	    }
	    addToOperationsList(batchType, document) {
	        // Get the bsonSize
	        const bsonSize = BSON.calculateObjectSize(document, {
	            checkKeys: false,
	            // Since we don't know what the user selected for BSON options here,
	            // err on the safe side, and check the size with ignoreUndefined: false.
	            ignoreUndefined: false
	        });
	        // Throw error if the doc is bigger than the max BSON size
	        if (bsonSize >= this.s.maxBsonObjectSize)
	            // TODO(NODE-3483): Change this to MongoBSONError
	            throw new error_1.MongoInvalidArgumentError(`Document is larger than the maximum size ${this.s.maxBsonObjectSize}`);
	        // Create a new batch object if we don't have a current one
	        if (this.s.currentBatch == null) {
	            this.s.currentBatch = new common_1.Batch(batchType, this.s.currentIndex);
	        }
	        const maxKeySize = this.s.maxKeySize;
	        // Check if we need to create a new batch
	        if (
	        // New batch if we exceed the max batch op size
	        this.s.currentBatchSize + 1 >= this.s.maxWriteBatchSize ||
	            // New batch if we exceed the maxBatchSizeBytes. Only matters if batch already has a doc,
	            // since we can't sent an empty batch
	            (this.s.currentBatchSize > 0 &&
	                this.s.currentBatchSizeBytes + maxKeySize + bsonSize >= this.s.maxBatchSizeBytes) ||
	            // New batch if the new op does not have the same op type as the current batch
	            this.s.currentBatch.batchType !== batchType) {
	            // Save the batch to the execution stack
	            this.s.batches.push(this.s.currentBatch);
	            // Create a new batch
	            this.s.currentBatch = new common_1.Batch(batchType, this.s.currentIndex);
	            // Reset the current size trackers
	            this.s.currentBatchSize = 0;
	            this.s.currentBatchSizeBytes = 0;
	        }
	        if (batchType === common_1.BatchType.INSERT) {
	            this.s.bulkResult.insertedIds.push({
	                index: this.s.currentIndex,
	                _id: document._id
	            });
	        }
	        // We have an array of documents
	        if (Array.isArray(document)) {
	            throw new error_1.MongoInvalidArgumentError('Operation passed in cannot be an Array');
	        }
	        this.s.currentBatch.originalIndexes.push(this.s.currentIndex);
	        this.s.currentBatch.operations.push(document);
	        this.s.currentBatchSize += 1;
	        this.s.currentBatchSizeBytes += maxKeySize + bsonSize;
	        this.s.currentIndex += 1;
	        return this;
	    }
	}
	ordered.OrderedBulkOperation = OrderedBulkOperation;
	
	return ordered;
}

var unordered = {};

var hasRequiredUnordered;

function requireUnordered () {
	if (hasRequiredUnordered) return unordered;
	hasRequiredUnordered = 1;
	Object.defineProperty(unordered, "__esModule", { value: true });
	unordered.UnorderedBulkOperation = void 0;
	const BSON = requireBson();
	const error_1 = mongodb4.requireError();
	const common_1 = requireCommon();
	/** @public */
	class UnorderedBulkOperation extends common_1.BulkOperationBase {
	    /** @internal */
	    constructor(collection, options) {
	        super(collection, options, false);
	    }
	    handleWriteError(writeResult) {
	        if (this.s.batches.length) {
	            return;
	        }
	        return super.handleWriteError(writeResult);
	    }
	    addToOperationsList(batchType, document) {
	        // Get the bsonSize
	        const bsonSize = BSON.calculateObjectSize(document, {
	            checkKeys: false,
	            // Since we don't know what the user selected for BSON options here,
	            // err on the safe side, and check the size with ignoreUndefined: false.
	            ignoreUndefined: false
	        });
	        // Throw error if the doc is bigger than the max BSON size
	        if (bsonSize >= this.s.maxBsonObjectSize) {
	            // TODO(NODE-3483): Change this to MongoBSONError
	            throw new error_1.MongoInvalidArgumentError(`Document is larger than the maximum size ${this.s.maxBsonObjectSize}`);
	        }
	        // Holds the current batch
	        this.s.currentBatch = undefined;
	        // Get the right type of batch
	        if (batchType === common_1.BatchType.INSERT) {
	            this.s.currentBatch = this.s.currentInsertBatch;
	        }
	        else if (batchType === common_1.BatchType.UPDATE) {
	            this.s.currentBatch = this.s.currentUpdateBatch;
	        }
	        else if (batchType === common_1.BatchType.DELETE) {
	            this.s.currentBatch = this.s.currentRemoveBatch;
	        }
	        const maxKeySize = this.s.maxKeySize;
	        // Create a new batch object if we don't have a current one
	        if (this.s.currentBatch == null) {
	            this.s.currentBatch = new common_1.Batch(batchType, this.s.currentIndex);
	        }
	        // Check if we need to create a new batch
	        if (
	        // New batch if we exceed the max batch op size
	        this.s.currentBatch.size + 1 >= this.s.maxWriteBatchSize ||
	            // New batch if we exceed the maxBatchSizeBytes. Only matters if batch already has a doc,
	            // since we can't sent an empty batch
	            (this.s.currentBatch.size > 0 &&
	                this.s.currentBatch.sizeBytes + maxKeySize + bsonSize >= this.s.maxBatchSizeBytes) ||
	            // New batch if the new op does not have the same op type as the current batch
	            this.s.currentBatch.batchType !== batchType) {
	            // Save the batch to the execution stack
	            this.s.batches.push(this.s.currentBatch);
	            // Create a new batch
	            this.s.currentBatch = new common_1.Batch(batchType, this.s.currentIndex);
	        }
	        // We have an array of documents
	        if (Array.isArray(document)) {
	            throw new error_1.MongoInvalidArgumentError('Operation passed in cannot be an Array');
	        }
	        this.s.currentBatch.operations.push(document);
	        this.s.currentBatch.originalIndexes.push(this.s.currentIndex);
	        this.s.currentIndex = this.s.currentIndex + 1;
	        // Save back the current Batch to the right type
	        if (batchType === common_1.BatchType.INSERT) {
	            this.s.currentInsertBatch = this.s.currentBatch;
	            this.s.bulkResult.insertedIds.push({
	                index: this.s.bulkResult.insertedIds.length,
	                _id: document._id
	            });
	        }
	        else if (batchType === common_1.BatchType.UPDATE) {
	            this.s.currentUpdateBatch = this.s.currentBatch;
	        }
	        else if (batchType === common_1.BatchType.DELETE) {
	            this.s.currentRemoveBatch = this.s.currentBatch;
	        }
	        // Update current batch size
	        this.s.currentBatch.size += 1;
	        this.s.currentBatch.sizeBytes += maxKeySize + bsonSize;
	        return this;
	    }
	}
	unordered.UnorderedBulkOperation = UnorderedBulkOperation;
	
	return unordered;
}

var change_stream = {};

var mongo_credentials = {};

var gssapi = {};

var auth_provider = {};

var hasRequiredAuth_provider;

function requireAuth_provider () {
	if (hasRequiredAuth_provider) return auth_provider;
	hasRequiredAuth_provider = 1;
	Object.defineProperty(auth_provider, "__esModule", { value: true });
	auth_provider.AuthProvider = auth_provider.AuthContext = void 0;
	const error_1 = mongodb4.requireError();
	/**
	 * Context used during authentication
	 * @internal
	 */
	class AuthContext {
	    constructor(connection, credentials, options) {
	        /** If the context is for reauthentication. */
	        this.reauthenticating = false;
	        this.connection = connection;
	        this.credentials = credentials;
	        this.options = options;
	    }
	}
	auth_provider.AuthContext = AuthContext;
	/**
	 * Provider used during authentication.
	 * @internal
	 */
	class AuthProvider {
	    /**
	     * Prepare the handshake document before the initial handshake.
	     *
	     * @param handshakeDoc - The document used for the initial handshake on a connection
	     * @param authContext - Context for authentication flow
	     */
	    async prepare(handshakeDoc, _authContext) {
	        return handshakeDoc;
	    }
	    /**
	     * Reauthenticate.
	     * @param context - The shared auth context.
	     */
	    async reauth(context) {
	        if (context.reauthenticating) {
	            throw new error_1.MongoRuntimeError('Reauthentication already in progress.');
	        }
	        try {
	            context.reauthenticating = true;
	            await this.auth(context);
	        }
	        finally {
	            context.reauthenticating = false;
	        }
	    }
	}
	auth_provider.AuthProvider = AuthProvider;
	
	return auth_provider;
}

var hasRequiredGssapi;

function requireGssapi () {
	if (hasRequiredGssapi) return gssapi;
	hasRequiredGssapi = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.GSSAPI = exports.GSSAPICanonicalizationValue = void 0;
		exports.performGSSAPICanonicalizeHostName = performGSSAPICanonicalizeHostName;
		exports.resolveCname = resolveCname;
		const dns = require$$0;
		const deps_1 = mongodb4.requireDeps();
		const error_1 = mongodb4.requireError();
		const utils_1 = mongodb7.requireUtils();
		const auth_provider_1 = requireAuth_provider();
		/** @public */
		exports.GSSAPICanonicalizationValue = Object.freeze({
		    on: true,
		    off: false,
		    none: 'none',
		    forward: 'forward',
		    forwardAndReverse: 'forwardAndReverse'
		});
		async function externalCommand(connection, command) {
		    const response = await connection.command((0, utils_1.ns)('$external.$cmd'), command);
		    return response;
		}
		let krb;
		class GSSAPI extends auth_provider_1.AuthProvider {
		    async auth(authContext) {
		        const { connection, credentials } = authContext;
		        if (credentials == null) {
		            throw new error_1.MongoMissingCredentialsError('Credentials required for GSSAPI authentication');
		        }
		        const { username } = credentials;
		        const client = await makeKerberosClient(authContext);
		        const payload = await client.step('');
		        const saslStartResponse = await externalCommand(connection, saslStart(payload));
		        const negotiatedPayload = await negotiate(client, 10, saslStartResponse.payload);
		        const saslContinueResponse = await externalCommand(connection, saslContinue(negotiatedPayload, saslStartResponse.conversationId));
		        const finalizePayload = await finalize(client, username, saslContinueResponse.payload);
		        await externalCommand(connection, {
		            saslContinue: 1,
		            conversationId: saslContinueResponse.conversationId,
		            payload: finalizePayload
		        });
		    }
		}
		exports.GSSAPI = GSSAPI;
		async function makeKerberosClient({ options: { hostAddress, runtime: { os } }, credentials }) {
		    if (!hostAddress || typeof hostAddress.host !== 'string' || !credentials) {
		        throw new error_1.MongoInvalidArgumentError('Connection must have host and port and credentials defined.');
		    }
		    loadKrb();
		    if ('kModuleError' in krb) {
		        throw krb['kModuleError'];
		    }
		    const { initializeClient } = krb;
		    const { username, password } = credentials;
		    const mechanismProperties = credentials.mechanismProperties;
		    const serviceName = mechanismProperties.SERVICE_NAME ?? 'mongodb';
		    const host = await performGSSAPICanonicalizeHostName(hostAddress.host, mechanismProperties);
		    const initOptions = {};
		    if (password != null) {
		        // TODO(NODE-5139): These do not match the typescript options in initializeClient
		        Object.assign(initOptions, { user: username, password: password });
		    }
		    const spnHost = mechanismProperties.SERVICE_HOST ?? host;
		    let spn = `${serviceName}${os.platform() === 'win32' ? '/' : '@'}${spnHost}`;
		    if ('SERVICE_REALM' in mechanismProperties) {
		        spn = `${spn}@${mechanismProperties.SERVICE_REALM}`;
		    }
		    return await initializeClient(spn, initOptions);
		}
		function saslStart(payload) {
		    return {
		        saslStart: 1,
		        mechanism: 'GSSAPI',
		        payload,
		        autoAuthorize: 1
		    };
		}
		function saslContinue(payload, conversationId) {
		    return {
		        saslContinue: 1,
		        conversationId,
		        payload
		    };
		}
		async function negotiate(client, retries, payload) {
		    try {
		        const response = await client.step(payload);
		        return response || '';
		    }
		    catch (error) {
		        if (retries === 0) {
		            // Retries exhausted, raise error
		            throw error;
		        }
		        // Adjust number of retries and call step again
		        return await negotiate(client, retries - 1, payload);
		    }
		}
		async function finalize(client, user, payload) {
		    // GSS Client Unwrap
		    const response = await client.unwrap(payload);
		    return await client.wrap(response || '', { user });
		}
		async function performGSSAPICanonicalizeHostName(host, mechanismProperties) {
		    const mode = mechanismProperties.CANONICALIZE_HOST_NAME;
		    if (!mode || mode === exports.GSSAPICanonicalizationValue.none) {
		        return host;
		    }
		    // If forward and reverse or true
		    if (mode === exports.GSSAPICanonicalizationValue.on ||
		        mode === exports.GSSAPICanonicalizationValue.forwardAndReverse) {
		        // Perform the lookup of the ip address.
		        const { address } = await dns.promises.lookup(host);
		        try {
		            // Perform a reverse ptr lookup on the ip address.
		            const results = await dns.promises.resolve(address, 'PTR');
		            // If the ptr did not error but had no results, return the host.
		            return results.length > 0 ? results[0] : host;
		        }
		        catch {
		            // This can error as ptr records may not exist for all ips. In this case
		            // fallback to a cname lookup as dns.lookup() does not return the
		            // cname.
		            return await resolveCname(host);
		        }
		    }
		    else {
		        // The case for forward is just to resolve the cname as dns.lookup()
		        // will not return it.
		        return await resolveCname(host);
		    }
		}
		async function resolveCname(host) {
		    // Attempt to resolve the host name
		    try {
		        const results = await dns.promises.resolve(host, 'CNAME');
		        // Get the first resolved host id
		        return results.length > 0 ? results[0] : host;
		    }
		    catch {
		        return host;
		    }
		}
		/**
		 * Load the Kerberos library.
		 */
		function loadKrb() {
		    if (!krb) {
		        krb = (0, deps_1.getKerberos)();
		    }
		}
		
	} (gssapi));
	return gssapi;
}

var hasRequiredMongo_credentials;

function requireMongo_credentials () {
	if (hasRequiredMongo_credentials) return mongo_credentials;
	hasRequiredMongo_credentials = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.MongoCredentials = exports.DEFAULT_ALLOWED_HOSTS = void 0;
		const error_1 = mongodb4.requireError();
		const gssapi_1 = requireGssapi();
		const providers_1 = mongodb2.requireProviders();
		/**
		 * @see https://github.com/mongodb/specifications/blob/master/source/auth/auth.md
		 */
		function getDefaultAuthMechanism(hello) {
		    if (hello) {
		        // If hello contains saslSupportedMechs, use scram-sha-256
		        // if it is available, else scram-sha-1
		        if (Array.isArray(hello.saslSupportedMechs)) {
		            return hello.saslSupportedMechs.includes(providers_1.AuthMechanism.MONGODB_SCRAM_SHA256)
		                ? providers_1.AuthMechanism.MONGODB_SCRAM_SHA256
		                : providers_1.AuthMechanism.MONGODB_SCRAM_SHA1;
		        }
		    }
		    // Default auth mechanism for 4.0 and higher.
		    return providers_1.AuthMechanism.MONGODB_SCRAM_SHA256;
		}
		const ALLOWED_ENVIRONMENT_NAMES = [
		    'test',
		    'azure',
		    'gcp',
		    'k8s'
		];
		const ALLOWED_HOSTS_ERROR = 'Auth mechanism property ALLOWED_HOSTS must be an array of strings.';
		/** @internal */
		exports.DEFAULT_ALLOWED_HOSTS = [
		    '*.mongodb.net',
		    '*.mongodb-qa.net',
		    '*.mongodb-dev.net',
		    '*.mongodbgov.net',
		    'localhost',
		    '127.0.0.1',
		    '::1',
		    '*.mongo.com'
		];
		/** Error for when the token audience is missing in the environment. */
		const TOKEN_RESOURCE_MISSING_ERROR = 'TOKEN_RESOURCE must be set in the auth mechanism properties when ENVIRONMENT is azure or gcp.';
		/**
		 * A representation of the credentials used by MongoDB
		 * @public
		 */
		class MongoCredentials {
		    constructor(options) {
		        this.username = options.username ?? '';
		        this.password = options.password;
		        this.source = options.source;
		        if (!this.source && options.db) {
		            this.source = options.db;
		        }
		        this.mechanism = options.mechanism || providers_1.AuthMechanism.MONGODB_DEFAULT;
		        this.mechanismProperties = options.mechanismProperties || {};
		        if (this.mechanism === providers_1.AuthMechanism.MONGODB_OIDC && !this.mechanismProperties.ALLOWED_HOSTS) {
		            this.mechanismProperties = {
		                ...this.mechanismProperties,
		                ALLOWED_HOSTS: exports.DEFAULT_ALLOWED_HOSTS
		            };
		        }
		        Object.freeze(this.mechanismProperties);
		        Object.freeze(this);
		    }
		    /** Determines if two MongoCredentials objects are equivalent */
		    equals(other) {
		        return (this.mechanism === other.mechanism &&
		            this.username === other.username &&
		            this.password === other.password &&
		            this.source === other.source);
		    }
		    /**
		     * If the authentication mechanism is set to "default", resolves the authMechanism
		     * based on the server version and server supported sasl mechanisms.
		     *
		     * @param hello - A hello response from the server
		     */
		    resolveAuthMechanism(hello) {
		        // If the mechanism is not "default", then it does not need to be resolved
		        if (this.mechanism.match(/DEFAULT/i)) {
		            return new MongoCredentials({
		                username: this.username,
		                password: this.password,
		                source: this.source,
		                mechanism: getDefaultAuthMechanism(hello),
		                mechanismProperties: this.mechanismProperties
		            });
		        }
		        return this;
		    }
		    validate() {
		        if ((this.mechanism === providers_1.AuthMechanism.MONGODB_GSSAPI ||
		            this.mechanism === providers_1.AuthMechanism.MONGODB_PLAIN ||
		            this.mechanism === providers_1.AuthMechanism.MONGODB_SCRAM_SHA1 ||
		            this.mechanism === providers_1.AuthMechanism.MONGODB_SCRAM_SHA256) &&
		            !this.username) {
		            throw new error_1.MongoMissingCredentialsError(`Username required for mechanism '${this.mechanism}'`);
		        }
		        if (this.mechanism === providers_1.AuthMechanism.MONGODB_OIDC) {
		            if (this.username &&
		                this.mechanismProperties.ENVIRONMENT &&
		                this.mechanismProperties.ENVIRONMENT !== 'azure') {
		                throw new error_1.MongoInvalidArgumentError(`username and ENVIRONMENT '${this.mechanismProperties.ENVIRONMENT}' may not be used together for mechanism '${this.mechanism}'.`);
		            }
		            if (this.username && this.password) {
		                throw new error_1.MongoInvalidArgumentError(`No password is allowed in ENVIRONMENT '${this.mechanismProperties.ENVIRONMENT}' for '${this.mechanism}'.`);
		            }
		            if ((this.mechanismProperties.ENVIRONMENT === 'azure' ||
		                this.mechanismProperties.ENVIRONMENT === 'gcp') &&
		                !this.mechanismProperties.TOKEN_RESOURCE) {
		                throw new error_1.MongoInvalidArgumentError(TOKEN_RESOURCE_MISSING_ERROR);
		            }
		            if (this.mechanismProperties.ENVIRONMENT &&
		                !ALLOWED_ENVIRONMENT_NAMES.includes(this.mechanismProperties.ENVIRONMENT)) {
		                throw new error_1.MongoInvalidArgumentError(`Currently only a ENVIRONMENT in ${ALLOWED_ENVIRONMENT_NAMES.join(',')} is supported for mechanism '${this.mechanism}'.`);
		            }
		            if (!this.mechanismProperties.ENVIRONMENT &&
		                !this.mechanismProperties.OIDC_CALLBACK &&
		                !this.mechanismProperties.OIDC_HUMAN_CALLBACK) {
		                throw new error_1.MongoInvalidArgumentError(`Either a ENVIRONMENT, OIDC_CALLBACK, or OIDC_HUMAN_CALLBACK must be specified for mechanism '${this.mechanism}'.`);
		            }
		            if (this.mechanismProperties.ALLOWED_HOSTS) {
		                const hosts = this.mechanismProperties.ALLOWED_HOSTS;
		                if (!Array.isArray(hosts)) {
		                    throw new error_1.MongoInvalidArgumentError(ALLOWED_HOSTS_ERROR);
		                }
		                for (const host of hosts) {
		                    if (typeof host !== 'string') {
		                        throw new error_1.MongoInvalidArgumentError(ALLOWED_HOSTS_ERROR);
		                    }
		                }
		            }
		        }
		        if (providers_1.AUTH_MECHS_AUTH_SRC_EXTERNAL.has(this.mechanism)) {
		            if (this.source != null && this.source !== '$external') {
		                // TODO(NODE-3485): Replace this with a MongoAuthValidationError
		                throw new error_1.MongoAPIError(`Invalid source '${this.source}' for mechanism '${this.mechanism}' specified.`);
		            }
		        }
		        if (this.mechanism === providers_1.AuthMechanism.MONGODB_PLAIN && this.source == null) {
		            // TODO(NODE-3485): Replace this with a MongoAuthValidationError
		            throw new error_1.MongoAPIError('PLAIN Authentication Mechanism needs an auth source');
		        }
		        if (this.mechanism === providers_1.AuthMechanism.MONGODB_X509 && this.password != null) {
		            if (this.password === '') {
		                Reflect.set(this, 'password', undefined);
		                return;
		            }
		            // TODO(NODE-3485): Replace this with a MongoAuthValidationError
		            throw new error_1.MongoAPIError(`Password not allowed for mechanism MONGODB-X509`);
		        }
		        const canonicalization = this.mechanismProperties.CANONICALIZE_HOST_NAME ?? false;
		        if (!Object.values(gssapi_1.GSSAPICanonicalizationValue).includes(canonicalization)) {
		            throw new error_1.MongoAPIError(`Invalid CANONICALIZE_HOST_NAME value: ${canonicalization}`);
		        }
		    }
		    static merge(creds, options) {
		        return new MongoCredentials({
		            username: options.username ?? creds?.username ?? '',
		            password: options.password ?? creds?.password ?? '',
		            mechanism: options.mechanism ?? creds?.mechanism ?? providers_1.AuthMechanism.MONGODB_DEFAULT,
		            mechanismProperties: options.mechanismProperties ?? creds?.mechanismProperties ?? {},
		            source: options.source ?? options.db ?? creds?.source ?? 'admin'
		        });
		    }
		}
		exports.MongoCredentials = MongoCredentials;
		
	} (mongo_credentials));
	return mongo_credentials;
}

var auto_encrypter = {};

var client_encryption = {};

var errors = {};

var hasRequiredErrors;

function requireErrors () {
	if (hasRequiredErrors) return errors;
	hasRequiredErrors = 1;
	Object.defineProperty(errors, "__esModule", { value: true });
	errors.MongoCryptKMSRequestNetworkTimeoutError = errors.MongoCryptAzureKMSRequestError = errors.MongoCryptCreateEncryptedCollectionError = errors.MongoCryptCreateDataKeyError = errors.MongoCryptInvalidArgumentError = errors.defaultErrorWrapper = errors.MongoCryptError = void 0;
	const error_1 = mongodb4.requireError();
	/**
	 * @public
	 * An error indicating that something went wrong specifically with MongoDB Client Encryption
	 */
	class MongoCryptError extends error_1.MongoError {
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
	    constructor(message, options = {}) {
	        super(message, options);
	    }
	    get name() {
	        return 'MongoCryptError';
	    }
	}
	errors.MongoCryptError = MongoCryptError;
	const defaultErrorWrapper = (error) => new MongoCryptError(error.message, { cause: error });
	errors.defaultErrorWrapper = defaultErrorWrapper;
	/**
	 * @public
	 *
	 * An error indicating an invalid argument was provided to an encryption API.
	 */
	class MongoCryptInvalidArgumentError extends MongoCryptError {
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
	        return 'MongoCryptInvalidArgumentError';
	    }
	}
	errors.MongoCryptInvalidArgumentError = MongoCryptInvalidArgumentError;
	/**
	 * @public
	 * An error indicating that `ClientEncryption.createEncryptedCollection()` failed to create data keys
	 */
	class MongoCryptCreateDataKeyError extends MongoCryptError {
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
	    constructor(encryptedFields, { cause }) {
	        super(`Unable to complete creating data keys: ${cause.message}`, { cause });
	        this.encryptedFields = encryptedFields;
	    }
	    get name() {
	        return 'MongoCryptCreateDataKeyError';
	    }
	}
	errors.MongoCryptCreateDataKeyError = MongoCryptCreateDataKeyError;
	/**
	 * @public
	 * An error indicating that `ClientEncryption.createEncryptedCollection()` failed to create a collection
	 */
	class MongoCryptCreateEncryptedCollectionError extends MongoCryptError {
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
	    constructor(encryptedFields, { cause }) {
	        super(`Unable to create collection: ${cause.message}`, { cause });
	        this.encryptedFields = encryptedFields;
	    }
	    get name() {
	        return 'MongoCryptCreateEncryptedCollectionError';
	    }
	}
	errors.MongoCryptCreateEncryptedCollectionError = MongoCryptCreateEncryptedCollectionError;
	/**
	 * @public
	 * An error indicating that mongodb-client-encryption failed to auto-refresh Azure KMS credentials.
	 */
	class MongoCryptAzureKMSRequestError extends MongoCryptError {
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
	    constructor(message, body) {
	        super(message);
	        this.body = body;
	    }
	    get name() {
	        return 'MongoCryptAzureKMSRequestError';
	    }
	}
	errors.MongoCryptAzureKMSRequestError = MongoCryptAzureKMSRequestError;
	/** @public */
	class MongoCryptKMSRequestNetworkTimeoutError extends MongoCryptError {
	    get name() {
	        return 'MongoCryptKMSRequestNetworkTimeoutError';
	    }
	}
	errors.MongoCryptKMSRequestNetworkTimeoutError = MongoCryptKMSRequestNetworkTimeoutError;
	
	return errors;
}

var providers = {};

var aws = {};

var aws_temporary_credentials = {};

var hasRequiredAws_temporary_credentials;

function requireAws_temporary_credentials () {
	if (hasRequiredAws_temporary_credentials) return aws_temporary_credentials;
	hasRequiredAws_temporary_credentials = 1;
	Object.defineProperty(aws_temporary_credentials, "__esModule", { value: true });
	aws_temporary_credentials.AWSSDKCredentialProvider = void 0;
	const process = require$$0$1;
	const deps_1 = mongodb4.requireDeps();
	const error_1 = mongodb4.requireError();
	/** @internal */
	class AWSSDKCredentialProvider {
	    /**
	     * Create the SDK credentials provider.
	     * @param credentialsProvider - The credentials provider.
	     */
	    constructor(credentialsProvider) {
	        if (credentialsProvider) {
	            this._provider = credentialsProvider;
	        }
	    }
	    static get awsSDK() {
	        AWSSDKCredentialProvider._awsSDK ??= (0, deps_1.getAwsCredentialProvider)();
	        return AWSSDKCredentialProvider._awsSDK;
	    }
	    /**
	     * The AWS SDK caches credentials automatically and handles refresh when the credentials have expired.
	     * To ensure this occurs, we need to cache the `provider` returned by the AWS sdk and re-use it when fetching credentials.
	     */
	    get provider() {
	        if ('kModuleError' in AWSSDKCredentialProvider.awsSDK) {
	            throw AWSSDKCredentialProvider.awsSDK.kModuleError;
	        }
	        if (this._provider) {
	            return this._provider;
	        }
	        let { AWS_STS_REGIONAL_ENDPOINTS = '', AWS_REGION = '' } = process.env;
	        AWS_STS_REGIONAL_ENDPOINTS = AWS_STS_REGIONAL_ENDPOINTS.toLowerCase();
	        AWS_REGION = AWS_REGION.toLowerCase();
	        /** The option setting should work only for users who have explicit settings in their environment, the driver should not encode "defaults" */
	        const awsRegionSettingsExist = AWS_REGION.length !== 0 && AWS_STS_REGIONAL_ENDPOINTS.length !== 0;
	        /**
	         * The following regions use the global AWS STS endpoint, sts.amazonaws.com, by default
	         * https://docs.aws.amazon.com/sdkref/latest/guide/feature-sts-regionalized-endpoints.html
	         */
	        const LEGACY_REGIONS = new Set([
	            'ap-northeast-1',
	            'ap-south-1',
	            'ap-southeast-1',
	            'ap-southeast-2',
	            'aws-global',
	            'ca-central-1',
	            'eu-central-1',
	            'eu-north-1',
	            'eu-west-1',
	            'eu-west-2',
	            'eu-west-3',
	            'sa-east-1',
	            'us-east-1',
	            'us-east-2',
	            'us-west-1',
	            'us-west-2'
	        ]);
	        /**
	         * If AWS_STS_REGIONAL_ENDPOINTS is set to regional, users are opting into the new behavior of respecting the region settings
	         *
	         * If AWS_STS_REGIONAL_ENDPOINTS is set to legacy, then "old" regions need to keep using the global setting.
	         * Technically the SDK gets this wrong, it reaches out to 'sts.us-east-1.amazonaws.com' when it should be 'sts.amazonaws.com'.
	         * That is not our bug to fix here. We leave that up to the SDK.
	         */
	        const useRegionalSts = AWS_STS_REGIONAL_ENDPOINTS === 'regional' ||
	            (AWS_STS_REGIONAL_ENDPOINTS === 'legacy' && !LEGACY_REGIONS.has(AWS_REGION));
	        this._provider =
	            awsRegionSettingsExist && useRegionalSts
	                ? AWSSDKCredentialProvider.awsSDK.fromNodeProviderChain({
	                    clientConfig: { region: AWS_REGION }
	                })
	                : AWSSDKCredentialProvider.awsSDK.fromNodeProviderChain();
	        return this._provider;
	    }
	    async getCredentials() {
	        /*
	         * Creates a credential provider that will attempt to find credentials from the
	         * following sources (listed in order of precedence):
	         *
	         * - Environment variables exposed via process.env
	         * - SSO credentials from token cache
	         * - Web identity token credentials
	         * - Shared credentials and config ini files
	         * - The EC2/ECS Instance Metadata Service
	         */
	        try {
	            const creds = await this.provider();
	            return {
	                AccessKeyId: creds.accessKeyId,
	                SecretAccessKey: creds.secretAccessKey,
	                Token: creds.sessionToken,
	                Expiration: creds.expiration
	            };
	        }
	        catch (error) {
	            throw new error_1.MongoAWSError(error.message, { cause: error });
	        }
	    }
	}
	aws_temporary_credentials.AWSSDKCredentialProvider = AWSSDKCredentialProvider;
	
	return aws_temporary_credentials;
}

var hasRequiredAws;

function requireAws () {
	if (hasRequiredAws) return aws;
	hasRequiredAws = 1;
	Object.defineProperty(aws, "__esModule", { value: true });
	aws.loadAWSCredentials = loadAWSCredentials;
	const aws_temporary_credentials_1 = requireAws_temporary_credentials();
	/**
	 * @internal
	 */
	async function loadAWSCredentials(kmsProviders, provider) {
	    const credentialProvider = new aws_temporary_credentials_1.AWSSDKCredentialProvider(provider);
	    // We shouldn't ever receive a response from the AWS SDK that doesn't have a `SecretAccessKey`
	    // or `AccessKeyId`.  However, TS says these fields are optional.  We provide empty strings
	    // and let libmongocrypt error if we're unable to fetch the required keys.
	    const { SecretAccessKey = '', AccessKeyId = '', Token } = await credentialProvider.getCredentials();
	    const aws = {
	        secretAccessKey: SecretAccessKey,
	        accessKeyId: AccessKeyId
	    };
	    // the AWS session token is only required for temporary credentials so only attach it to the
	    // result if it's present in the response from the aws sdk
	    Token != null && (aws.sessionToken = Token);
	    return { ...kmsProviders, aws };
	}
	
	return aws;
}

var azure = {};

var hasRequiredAzure;

function requireAzure () {
	if (hasRequiredAzure) return azure;
	hasRequiredAzure = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.tokenCache = exports.AzureCredentialCache = exports.AZURE_BASE_URL = void 0;
		exports.addAzureParams = addAzureParams;
		exports.prepareRequest = prepareRequest;
		exports.fetchAzureKMSToken = fetchAzureKMSToken;
		exports.loadAzureCredentials = loadAzureCredentials;
		const error_1 = mongodb4.requireError();
		const utils_1 = mongodb7.requireUtils();
		const errors_1 = requireErrors();
		const MINIMUM_TOKEN_REFRESH_IN_MILLISECONDS = 6000;
		/** Base URL for getting Azure tokens. */
		exports.AZURE_BASE_URL = 'http://169.254.169.254/metadata/identity/oauth2/token?';
		/**
		 * @internal
		 */
		class AzureCredentialCache {
		    constructor() {
		        this.cachedToken = null;
		    }
		    async getToken() {
		        if (this.cachedToken == null || this.needsRefresh(this.cachedToken)) {
		            this.cachedToken = await this._getToken();
		        }
		        return { accessToken: this.cachedToken.accessToken };
		    }
		    needsRefresh(token) {
		        const timeUntilExpirationMS = token.expiresOnTimestamp - Date.now();
		        return timeUntilExpirationMS <= MINIMUM_TOKEN_REFRESH_IN_MILLISECONDS;
		    }
		    /**
		     * exposed for testing
		     */
		    resetCache() {
		        this.cachedToken = null;
		    }
		    /**
		     * exposed for testing
		     */
		    _getToken() {
		        return fetchAzureKMSToken();
		    }
		}
		exports.AzureCredentialCache = AzureCredentialCache;
		/** @internal */
		exports.tokenCache = new AzureCredentialCache();
		/** @internal */
		async function parseResponse(response) {
		    const { status, body: rawBody } = response;
		    const body = (() => {
		        try {
		            return JSON.parse(rawBody);
		        }
		        catch {
		            throw new errors_1.MongoCryptAzureKMSRequestError('Malformed JSON body in GET request.');
		        }
		    })();
		    if (status !== 200) {
		        throw new errors_1.MongoCryptAzureKMSRequestError('Unable to complete request.', body);
		    }
		    if (!body.access_token) {
		        throw new errors_1.MongoCryptAzureKMSRequestError('Malformed response body - missing field `access_token`.');
		    }
		    if (!body.expires_in) {
		        throw new errors_1.MongoCryptAzureKMSRequestError('Malformed response body - missing field `expires_in`.');
		    }
		    const expiresInMS = Number(body.expires_in) * 1000;
		    if (Number.isNaN(expiresInMS)) {
		        throw new errors_1.MongoCryptAzureKMSRequestError('Malformed response body - unable to parse int from `expires_in` field.');
		    }
		    return {
		        accessToken: body.access_token,
		        expiresOnTimestamp: Date.now() + expiresInMS
		    };
		}
		/**
		 * @internal
		 * Get the Azure endpoint URL.
		 */
		function addAzureParams(url, resource, username) {
		    url.searchParams.append('api-version', '2018-02-01');
		    url.searchParams.append('resource', resource);
		    if (username) {
		        url.searchParams.append('client_id', username);
		    }
		    return url;
		}
		/**
		 * @internal
		 *
		 * parses any options provided by prose tests to `fetchAzureKMSToken` and merges them with
		 * the default values for headers and the request url.
		 */
		function prepareRequest(options) {
		    const url = new URL(options.url?.toString() ?? exports.AZURE_BASE_URL);
		    addAzureParams(url, 'https://vault.azure.net');
		    const headers = { ...options.headers, 'Content-Type': 'application/json', Metadata: true };
		    return { headers, url };
		}
		/**
		 * @internal
		 *
		 * `AzureKMSRequestOptions` allows prose tests to modify the http request sent to the idms
		 * servers.  This is required to simulate different server conditions.  No options are expected to
		 * be set outside of tests.
		 *
		 * exposed for CSFLE
		 * [prose test 18](https://github.com/mongodb/specifications/tree/master/source/client-side-encryption/tests#azure-imds-credentials)
		 */
		async function fetchAzureKMSToken(options = {}) {
		    const { headers, url } = prepareRequest(options);
		    try {
		        const response = await (0, utils_1.get)(url, { headers });
		        return await parseResponse(response);
		    }
		    catch (error) {
		        if (error instanceof error_1.MongoNetworkTimeoutError) {
		            throw new errors_1.MongoCryptAzureKMSRequestError(`[Azure KMS] ${error.message}`);
		        }
		        throw error;
		    }
		}
		/**
		 * @internal
		 *
		 * @throws Will reject with a `MongoCryptError` if the http request fails or the http response is malformed.
		 */
		async function loadAzureCredentials(kmsProviders) {
		    const azure = await exports.tokenCache.getToken();
		    return { ...kmsProviders, azure };
		}
		
	} (azure));
	return azure;
}

var gcp = {};

var hasRequiredGcp;

function requireGcp () {
	if (hasRequiredGcp) return gcp;
	hasRequiredGcp = 1;
	Object.defineProperty(gcp, "__esModule", { value: true });
	gcp.loadGCPCredentials = loadGCPCredentials;
	const deps_1 = mongodb4.requireDeps();
	/** @internal */
	async function loadGCPCredentials(kmsProviders) {
	    const gcpMetadata = (0, deps_1.getGcpMetadata)();
	    if ('kModuleError' in gcpMetadata) {
	        return kmsProviders;
	    }
	    const { access_token: accessToken } = await gcpMetadata.instance({
	        property: 'service-accounts/default/token'
	    });
	    return { ...kmsProviders, gcp: { accessToken } };
	}
	
	return gcp;
}

var hasRequiredProviders;

function requireProviders () {
	if (hasRequiredProviders) return providers;
	hasRequiredProviders = 1;
	Object.defineProperty(providers, "__esModule", { value: true });
	providers.isEmptyCredentials = isEmptyCredentials;
	providers.refreshKMSCredentials = refreshKMSCredentials;
	const aws_1 = requireAws();
	const azure_1 = requireAzure();
	const gcp_1 = requireGcp();
	/**
	 * Auto credential fetching should only occur when the provider is defined on the kmsProviders map
	 * and the settings are an empty object.
	 *
	 * This is distinct from a nullish provider key.
	 *
	 * @internal - exposed for testing purposes only
	 */
	function isEmptyCredentials(providerName, kmsProviders) {
	    const provider = kmsProviders[providerName];
	    if (provider == null) {
	        return false;
	    }
	    return typeof provider === 'object' && Object.keys(provider).length === 0;
	}
	/**
	 * Load cloud provider credentials for the user provided KMS providers.
	 * Credentials will only attempt to get loaded if they do not exist
	 * and no existing credentials will get overwritten.
	 *
	 * @internal
	 */
	async function refreshKMSCredentials(kmsProviders, credentialProviders) {
	    let finalKMSProviders = kmsProviders;
	    if (isEmptyCredentials('aws', kmsProviders)) {
	        finalKMSProviders = await (0, aws_1.loadAWSCredentials)(finalKMSProviders, credentialProviders?.aws);
	    }
	    if (isEmptyCredentials('gcp', kmsProviders)) {
	        finalKMSProviders = await (0, gcp_1.loadGCPCredentials)(finalKMSProviders);
	    }
	    if (isEmptyCredentials('azure', kmsProviders)) {
	        finalKMSProviders = await (0, azure_1.loadAzureCredentials)(finalKMSProviders);
	    }
	    return finalKMSProviders;
	}
	
	return providers;
}

var state_machine = {};

var hasRequiredState_machine;

function requireState_machine () {
	if (hasRequiredState_machine) return state_machine;
	hasRequiredState_machine = 1;
	Object.defineProperty(state_machine, "__esModule", { value: true });
	state_machine.StateMachine = void 0;
	const fs = require$$0$3;
	const net = require$$0$2;
	const process = require$$0$1;
	const tls = require$$3;
	const bson_1 = requireBson();
	const abstract_cursor_1 = mongodb3.requireAbstract_cursor();
	const deps_1 = mongodb4.requireDeps();
	const error_1 = mongodb4.requireError();
	const timeout_1 = mongodb6.requireTimeout();
	const utils_1 = mongodb7.requireUtils();
	const client_encryption_1 = requireClient_encryption();
	const errors_1 = requireErrors();
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
	// libmongocrypt states
	const MONGOCRYPT_CTX_ERROR = 0;
	const MONGOCRYPT_CTX_NEED_MONGO_COLLINFO = 1;
	const MONGOCRYPT_CTX_NEED_MONGO_MARKINGS = 2;
	const MONGOCRYPT_CTX_NEED_MONGO_KEYS = 3;
	const MONGOCRYPT_CTX_NEED_KMS_CREDENTIALS = 7;
	const MONGOCRYPT_CTX_NEED_KMS = 4;
	const MONGOCRYPT_CTX_READY = 5;
	const MONGOCRYPT_CTX_DONE = 6;
	const HTTPS_PORT = 443;
	const stateToString = new Map([
	    [MONGOCRYPT_CTX_ERROR, 'MONGOCRYPT_CTX_ERROR'],
	    [MONGOCRYPT_CTX_NEED_MONGO_COLLINFO, 'MONGOCRYPT_CTX_NEED_MONGO_COLLINFO'],
	    [MONGOCRYPT_CTX_NEED_MONGO_MARKINGS, 'MONGOCRYPT_CTX_NEED_MONGO_MARKINGS'],
	    [MONGOCRYPT_CTX_NEED_MONGO_KEYS, 'MONGOCRYPT_CTX_NEED_MONGO_KEYS'],
	    [MONGOCRYPT_CTX_NEED_KMS_CREDENTIALS, 'MONGOCRYPT_CTX_NEED_KMS_CREDENTIALS'],
	    [MONGOCRYPT_CTX_NEED_KMS, 'MONGOCRYPT_CTX_NEED_KMS'],
	    [MONGOCRYPT_CTX_READY, 'MONGOCRYPT_CTX_READY'],
	    [MONGOCRYPT_CTX_DONE, 'MONGOCRYPT_CTX_DONE']
	]);
	const INSECURE_TLS_OPTIONS = [
	    'tlsInsecure',
	    'tlsAllowInvalidCertificates',
	    'tlsAllowInvalidHostnames'
	];
	/**
	 * Helper function for logging. Enabled by setting the environment flag MONGODB_CRYPT_DEBUG.
	 * @param msg - Anything you want to be logged.
	 */
	function debug(msg) {
	    if (process.env.MONGODB_CRYPT_DEBUG) {
	        // eslint-disable-next-line no-console
	        console.error(msg);
	    }
	}
	/**
	 * This is kind of a hack.  For `rewrapManyDataKey`, we have tests that
	 * guarantee that when there are no matching keys, `rewrapManyDataKey` returns
	 * nothing.  We also have tests for auto encryption that guarantee for `encrypt`
	 * we return an error when there are no matching keys.  This error is generated in
	 * subsequent iterations of the state machine.
	 * Some apis (`encrypt`) throw if there are no filter matches and others (`rewrapManyDataKey`)
	 * do not.  We set the result manually here, and let the state machine continue.  `libmongocrypt`
	 * will inform us if we need to error by setting the state to `MONGOCRYPT_CTX_ERROR` but
	 * otherwise we'll return `{ v: [] }`.
	 */
	let EMPTY_V;
	/**
	 * @internal
	 * An internal class that executes across a MongoCryptContext until either
	 * a finishing state or an error is reached. Do not instantiate directly.
	 */
	// TODO(DRIVERS-2671): clarify CSOT behavior for FLE APIs
	class StateMachine {
	    constructor(options, bsonOptions = (0, bson_1.pluckBSONSerializeOptions)(options)) {
	        this.options = options;
	        this.bsonOptions = bsonOptions;
	    }
	    /**
	     * Executes the state machine according to the specification
	     */
	    async execute(executor, context, options) {
	        const keyVaultNamespace = executor._keyVaultNamespace;
	        const keyVaultClient = executor._keyVaultClient;
	        const metaDataClient = executor._metaDataClient;
	        const mongocryptdClient = executor._mongocryptdClient;
	        const mongocryptdManager = executor._mongocryptdManager;
	        let result = null;
	        // Typescript treats getters just like properties: Once you've tested it for equality
	        // it cannot change. Which is exactly the opposite of what we use state and status for.
	        // Every call to at least `addMongoOperationResponse` and `finalize` can change the state.
	        // These wrappers let us write code more naturally and not add compiler exceptions
	        // to conditions checks inside the state machine.
	        const getStatus = () => context.status;
	        const getState = () => context.state;
	        while (getState() !== MONGOCRYPT_CTX_DONE && getState() !== MONGOCRYPT_CTX_ERROR) {
	            options.signal?.throwIfAborted();
	            debug(`[context#${context.id}] ${stateToString.get(getState()) || getState()}`);
	            switch (getState()) {
	                case MONGOCRYPT_CTX_NEED_MONGO_COLLINFO: {
	                    const filter = (0, bson_1.deserialize)(context.nextMongoOperation());
	                    if (!metaDataClient) {
	                        throw new errors_1.MongoCryptError('unreachable state machine state: entered MONGOCRYPT_CTX_NEED_MONGO_COLLINFO but metadata client is undefined');
	                    }
	                    const collInfoCursor = this.fetchCollectionInfo(metaDataClient, context.ns, filter, options);
	                    for await (const collInfo of collInfoCursor) {
	                        context.addMongoOperationResponse((0, bson_1.serialize)(collInfo));
	                        if (getState() === MONGOCRYPT_CTX_ERROR)
	                            break;
	                    }
	                    if (getState() === MONGOCRYPT_CTX_ERROR)
	                        break;
	                    context.finishMongoOperation();
	                    break;
	                }
	                case MONGOCRYPT_CTX_NEED_MONGO_MARKINGS: {
	                    const command = context.nextMongoOperation();
	                    if (getState() === MONGOCRYPT_CTX_ERROR)
	                        break;
	                    if (!mongocryptdClient) {
	                        throw new errors_1.MongoCryptError('unreachable state machine state: entered MONGOCRYPT_CTX_NEED_MONGO_MARKINGS but mongocryptdClient is undefined');
	                    }
	                    // When we are using the shared library, we don't have a mongocryptd manager.
	                    const markedCommand = mongocryptdManager
	                        ? await mongocryptdManager.withRespawn(this.markCommand.bind(this, mongocryptdClient, context.ns, command, options))
	                        : await this.markCommand(mongocryptdClient, context.ns, command, options);
	                    context.addMongoOperationResponse(markedCommand);
	                    context.finishMongoOperation();
	                    break;
	                }
	                case MONGOCRYPT_CTX_NEED_MONGO_KEYS: {
	                    const filter = context.nextMongoOperation();
	                    const keys = await this.fetchKeys(keyVaultClient, keyVaultNamespace, filter, options);
	                    if (keys.length === 0) {
	                        // See docs on EMPTY_V
	                        result = EMPTY_V ??= (0, bson_1.serialize)({ v: [] });
	                    }
	                    for (const key of keys) {
	                        context.addMongoOperationResponse((0, bson_1.serialize)(key));
	                    }
	                    context.finishMongoOperation();
	                    break;
	                }
	                case MONGOCRYPT_CTX_NEED_KMS_CREDENTIALS: {
	                    const kmsProviders = await executor.askForKMSCredentials();
	                    context.provideKMSProviders((0, bson_1.serialize)(kmsProviders));
	                    break;
	                }
	                case MONGOCRYPT_CTX_NEED_KMS: {
	                    await Promise.all(this.requests(context, options));
	                    context.finishKMSRequests();
	                    break;
	                }
	                case MONGOCRYPT_CTX_READY: {
	                    const finalizedContext = context.finalize();
	                    if (getState() === MONGOCRYPT_CTX_ERROR) {
	                        const message = getStatus().message || 'Finalization error';
	                        throw new errors_1.MongoCryptError(message);
	                    }
	                    result = finalizedContext;
	                    break;
	                }
	                default:
	                    throw new errors_1.MongoCryptError(`Unknown state: ${getState()}`);
	            }
	        }
	        if (getState() === MONGOCRYPT_CTX_ERROR || result == null) {
	            const message = getStatus().message;
	            if (!message) {
	                debug(`unidentifiable error in MongoCrypt - received an error status from \`libmongocrypt\` but received no error message.`);
	            }
	            throw new errors_1.MongoCryptError(message ??
	                'unidentifiable error in MongoCrypt - received an error status from `libmongocrypt` but received no error message.');
	        }
	        return result;
	    }
	    /**
	     * Handles the request to the KMS service. Exposed for testing purposes. Do not directly invoke.
	     * @param kmsContext - A C++ KMS context returned from the bindings
	     * @returns A promise that resolves when the KMS reply has be fully parsed
	     */
	    async kmsRequest(request, options) {
	        const parsedUrl = request.endpoint.split(':');
	        const port = parsedUrl[1] != null ? Number.parseInt(parsedUrl[1], 10) : HTTPS_PORT;
	        const socketOptions = {
	            host: parsedUrl[0],
	            servername: parsedUrl[0],
	            port,
	            ...(0, client_encryption_1.autoSelectSocketOptions)(this.options.socketOptions || {})
	        };
	        const message = request.message;
	        const buffer = new utils_1.BufferPool();
	        let netSocket;
	        let socket;
	        function destroySockets() {
	            for (const sock of [socket, netSocket]) {
	                if (sock) {
	                    sock.destroy();
	                }
	            }
	        }
	        function onerror(cause) {
	            return new errors_1.MongoCryptError('KMS request failed', { cause });
	        }
	        function onclose() {
	            return new errors_1.MongoCryptError('KMS request closed');
	        }
	        const tlsOptions = this.options.tlsOptions;
	        if (tlsOptions) {
	            const kmsProvider = request.kmsProvider;
	            const providerTlsOptions = tlsOptions[kmsProvider];
	            if (providerTlsOptions) {
	                const error = this.validateTlsOptions(kmsProvider, providerTlsOptions);
	                if (error) {
	                    throw error;
	                }
	                try {
	                    await this.setTlsOptions(providerTlsOptions, socketOptions);
	                }
	                catch (err) {
	                    throw onerror(err);
	                }
	            }
	        }
	        let abortListener;
	        try {
	            if (this.options.proxyOptions && this.options.proxyOptions.proxyHost) {
	                netSocket = new net.Socket();
	                const { promise: willConnect, reject: rejectOnNetSocketError, resolve: resolveOnNetSocketConnect } = (0, utils_1.promiseWithResolvers)();
	                netSocket
	                    .once('error', err => rejectOnNetSocketError(onerror(err)))
	                    .once('close', () => rejectOnNetSocketError(onclose()))
	                    .once('connect', () => resolveOnNetSocketConnect());
	                const netSocketOptions = {
	                    ...socketOptions,
	                    host: this.options.proxyOptions.proxyHost,
	                    port: this.options.proxyOptions.proxyPort || 1080
	                };
	                netSocket.connect(netSocketOptions);
	                await willConnect;
	                try {
	                    socks ??= loadSocks();
	                    socketOptions.socket = (await socks.SocksClient.createConnection({
	                        existing_socket: netSocket,
	                        command: 'connect',
	                        destination: { host: socketOptions.host, port: socketOptions.port },
	                        proxy: {
	                            // host and port are ignored because we pass existing_socket
	                            host: 'iLoveJavaScript',
	                            port: 0,
	                            type: 5,
	                            userId: this.options.proxyOptions.proxyUsername,
	                            password: this.options.proxyOptions.proxyPassword
	                        }
	                    })).socket;
	                }
	                catch (err) {
	                    throw onerror(err);
	                }
	            }
	            socket = tls.connect(socketOptions, () => {
	                socket.write(message);
	            });
	            const { promise: willResolveKmsRequest, reject: rejectOnTlsSocketError, resolve } = (0, utils_1.promiseWithResolvers)();
	            abortListener = (0, utils_1.addAbortListener)(options?.signal, function () {
	                destroySockets();
	                rejectOnTlsSocketError(this.reason);
	            });
	            socket
	                .once('error', err => rejectOnTlsSocketError(onerror(err)))
	                .once('close', () => rejectOnTlsSocketError(onclose()))
	                .on('data', data => {
	                buffer.append(data);
	                while (request.bytesNeeded > 0 && buffer.length) {
	                    const bytesNeeded = Math.min(request.bytesNeeded, buffer.length);
	                    request.addResponse(buffer.read(bytesNeeded));
	                }
	                if (request.bytesNeeded <= 0) {
	                    resolve();
	                }
	            });
	            await (options?.timeoutContext?.csotEnabled()
	                ? Promise.all([
	                    willResolveKmsRequest,
	                    timeout_1.Timeout.expires(options.timeoutContext?.remainingTimeMS)
	                ])
	                : willResolveKmsRequest);
	        }
	        catch (error) {
	            if (error instanceof timeout_1.TimeoutError)
	                throw new error_1.MongoOperationTimeoutError('KMS request timed out');
	            throw error;
	        }
	        finally {
	            // There's no need for any more activity on this socket at this point.
	            destroySockets();
	            abortListener?.[utils_1.kDispose]();
	        }
	    }
	    *requests(context, options) {
	        for (let request = context.nextKMSRequest(); request != null; request = context.nextKMSRequest()) {
	            yield this.kmsRequest(request, options);
	        }
	    }
	    /**
	     * Validates the provided TLS options are secure.
	     *
	     * @param kmsProvider - The KMS provider name.
	     * @param tlsOptions - The client TLS options for the provider.
	     *
	     * @returns An error if any option is invalid.
	     */
	    validateTlsOptions(kmsProvider, tlsOptions) {
	        const tlsOptionNames = Object.keys(tlsOptions);
	        for (const option of INSECURE_TLS_OPTIONS) {
	            if (tlsOptionNames.includes(option)) {
	                return new errors_1.MongoCryptError(`Insecure TLS options prohibited for ${kmsProvider}: ${option}`);
	            }
	        }
	    }
	    /**
	     * Sets only the valid secure TLS options.
	     *
	     * @param tlsOptions - The client TLS options for the provider.
	     * @param options - The existing connection options.
	     */
	    async setTlsOptions(tlsOptions, options) {
	        // If a secureContext is provided, ensure it is set.
	        if (tlsOptions.secureContext) {
	            options.secureContext = tlsOptions.secureContext;
	        }
	        if (tlsOptions.tlsCertificateKeyFile) {
	            const cert = await fs.readFile(tlsOptions.tlsCertificateKeyFile);
	            options.cert = options.key = cert;
	        }
	        if (tlsOptions.tlsCAFile) {
	            options.ca = await fs.readFile(tlsOptions.tlsCAFile);
	        }
	        if (tlsOptions.tlsCertificateKeyFilePassword) {
	            options.passphrase = tlsOptions.tlsCertificateKeyFilePassword;
	        }
	    }
	    /**
	     * Fetches collection info for a provided namespace, when libmongocrypt
	     * enters the `MONGOCRYPT_CTX_NEED_MONGO_COLLINFO` state. The result is
	     * used to inform libmongocrypt of the schema associated with this
	     * namespace. Exposed for testing purposes. Do not directly invoke.
	     *
	     * @param client - A MongoClient connected to the topology
	     * @param ns - The namespace to list collections from
	     * @param filter - A filter for the listCollections command
	     * @param callback - Invoked with the info of the requested collection, or with an error
	     */
	    fetchCollectionInfo(client, ns, filter, options) {
	        const { db } = utils_1.MongoDBCollectionNamespace.fromString(ns);
	        const cursor = client.db(db).listCollections(filter, {
	            promoteLongs: false,
	            promoteValues: false,
	            timeoutContext: options?.timeoutContext && new abstract_cursor_1.CursorTimeoutContext(options?.timeoutContext, Symbol()),
	            signal: options?.signal,
	            nameOnly: false
	        });
	        return cursor;
	    }
	    /**
	     * Calls to the mongocryptd to provide markings for a command.
	     * Exposed for testing purposes. Do not directly invoke.
	     * @param client - A MongoClient connected to a mongocryptd
	     * @param ns - The namespace (database.collection) the command is being executed on
	     * @param command - The command to execute.
	     * @param callback - Invoked with the serialized and marked bson command, or with an error
	     */
	    async markCommand(client, ns, command, options) {
	        const { db } = utils_1.MongoDBCollectionNamespace.fromString(ns);
	        const bsonOptions = { promoteLongs: false, promoteValues: false };
	        const rawCommand = (0, bson_1.deserialize)(command, bsonOptions);
	        const commandOptions = {
	            timeoutMS: undefined,
	            signal: undefined
	        };
	        if (options?.timeoutContext?.csotEnabled()) {
	            commandOptions.timeoutMS = options.timeoutContext.remainingTimeMS;
	        }
	        if (options?.signal) {
	            commandOptions.signal = options.signal;
	        }
	        const response = await client.db(db).command(rawCommand, {
	            ...bsonOptions,
	            ...commandOptions
	        });
	        return (0, bson_1.serialize)(response, this.bsonOptions);
	    }
	    /**
	     * Requests keys from the keyVault collection on the topology.
	     * Exposed for testing purposes. Do not directly invoke.
	     * @param client - A MongoClient connected to the topology
	     * @param keyVaultNamespace - The namespace (database.collection) of the keyVault Collection
	     * @param filter - The filter for the find query against the keyVault Collection
	     * @param callback - Invoked with the found keys, or with an error
	     */
	    fetchKeys(client, keyVaultNamespace, filter, options) {
	        const { db: dbName, collection: collectionName } = utils_1.MongoDBCollectionNamespace.fromString(keyVaultNamespace);
	        const commandOptions = {
	            timeoutContext: undefined,
	            signal: undefined
	        };
	        if (options?.timeoutContext != null) {
	            commandOptions.timeoutContext = new abstract_cursor_1.CursorTimeoutContext(options.timeoutContext, Symbol());
	        }
	        if (options?.signal != null) {
	            commandOptions.signal = options.signal;
	        }
	        return client
	            .db(dbName)
	            .collection(collectionName, { readConcern: { level: 'majority' } })
	            .find((0, bson_1.deserialize)(filter), commandOptions)
	            .toArray();
	    }
	}
	state_machine.StateMachine = StateMachine;
	
	return state_machine;
}

var hasRequiredClient_encryption;

function requireClient_encryption () {
	if (hasRequiredClient_encryption) return client_encryption;
	hasRequiredClient_encryption = 1;
	Object.defineProperty(client_encryption, "__esModule", { value: true });
	client_encryption.ClientEncryption = void 0;
	client_encryption.autoSelectSocketOptions = autoSelectSocketOptions;
	const bson_1 = requireBson();
	const deps_1 = mongodb4.requireDeps();
	const timeout_1 = mongodb6.requireTimeout();
	const utils_1 = mongodb7.requireUtils();
	const errors_1 = requireErrors();
	const index_1 = requireProviders();
	const state_machine_1 = requireState_machine();
	/**
	 * @public
	 * The public interface for explicit in-use encryption
	 */
	class ClientEncryption {
	    /** @internal */
	    static getMongoCrypt() {
	        const encryption = (0, deps_1.getMongoDBClientEncryption)();
	        if ('kModuleError' in encryption) {
	            throw encryption.kModuleError;
	        }
	        return encryption.MongoCrypt;
	    }
	    /**
	     * Create a new encryption instance
	     *
	     * @example
	     * ```ts
	     * new ClientEncryption(mongoClient, {
	     *   keyVaultNamespace: 'client.encryption',
	     *   kmsProviders: {
	     *     local: {
	     *       key: masterKey // The master key used for encryption/decryption. A 96-byte long Buffer
	     *     }
	     *   }
	     * });
	     * ```
	     *
	     * @example
	     * ```ts
	     * new ClientEncryption(mongoClient, {
	     *   keyVaultNamespace: 'client.encryption',
	     *   kmsProviders: {
	     *     aws: {
	     *       accessKeyId: AWS_ACCESS_KEY,
	     *       secretAccessKey: AWS_SECRET_KEY
	     *     }
	     *   }
	     * });
	     * ```
	     */
	    constructor(client, options) {
	        this._client = client;
	        this._proxyOptions = options.proxyOptions ?? {};
	        this._tlsOptions = options.tlsOptions ?? {};
	        this._kmsProviders = options.kmsProviders || {};
	        const { timeoutMS } = (0, utils_1.resolveTimeoutOptions)(client, options);
	        this._timeoutMS = timeoutMS;
	        this._credentialProviders = options.credentialProviders;
	        if (options.credentialProviders?.aws && !(0, index_1.isEmptyCredentials)('aws', this._kmsProviders)) {
	            throw new errors_1.MongoCryptInvalidArgumentError('Can only provide a custom AWS credential provider when the state machine is configured for automatic AWS credential fetching');
	        }
	        if (options.keyVaultNamespace == null) {
	            throw new errors_1.MongoCryptInvalidArgumentError('Missing required option `keyVaultNamespace`');
	        }
	        const mongoCryptOptions = {
	            ...options,
	            kmsProviders: (0, bson_1.serialize)(this._kmsProviders),
	            errorWrapper: errors_1.defaultErrorWrapper
	        };
	        this._keyVaultNamespace = options.keyVaultNamespace;
	        this._keyVaultClient = options.keyVaultClient || client;
	        const MongoCrypt = ClientEncryption.getMongoCrypt();
	        this._mongoCrypt = new MongoCrypt(mongoCryptOptions);
	    }
	    /**
	     * Creates a data key used for explicit encryption and inserts it into the key vault namespace
	     *
	     * @example
	     * ```ts
	     * // Using async/await to create a local key
	     * const dataKeyId = await clientEncryption.createDataKey('local');
	     * ```
	     *
	     * @example
	     * ```ts
	     * // Using async/await to create an aws key
	     * const dataKeyId = await clientEncryption.createDataKey('aws', {
	     *   masterKey: {
	     *     region: 'us-east-1',
	     *     key: 'xxxxxxxxxxxxxx' // CMK ARN here
	     *   }
	     * });
	     * ```
	     *
	     * @example
	     * ```ts
	     * // Using async/await to create an aws key with a keyAltName
	     * const dataKeyId = await clientEncryption.createDataKey('aws', {
	     *   masterKey: {
	     *     region: 'us-east-1',
	     *     key: 'xxxxxxxxxxxxxx' // CMK ARN here
	     *   },
	     *   keyAltNames: [ 'mySpecialKey' ]
	     * });
	     * ```
	     */
	    async createDataKey(provider, options = {}) {
	        if (options.keyAltNames && !Array.isArray(options.keyAltNames)) {
	            throw new errors_1.MongoCryptInvalidArgumentError(`Option "keyAltNames" must be an array of strings, but was of type ${typeof options.keyAltNames}.`);
	        }
	        let keyAltNames = undefined;
	        if (options.keyAltNames && options.keyAltNames.length > 0) {
	            keyAltNames = options.keyAltNames.map((keyAltName, i) => {
	                if (typeof keyAltName !== 'string') {
	                    throw new errors_1.MongoCryptInvalidArgumentError(`Option "keyAltNames" must be an array of strings, but item at index ${i} was of type ${typeof keyAltName}`);
	                }
	                return (0, bson_1.serialize)({ keyAltName });
	            });
	        }
	        let keyMaterial = undefined;
	        if (options.keyMaterial) {
	            keyMaterial = (0, bson_1.serialize)({ keyMaterial: options.keyMaterial });
	        }
	        const dataKeyBson = (0, bson_1.serialize)({
	            provider,
	            ...options.masterKey
	        });
	        const context = this._mongoCrypt.makeDataKeyContext(dataKeyBson, {
	            keyAltNames,
	            keyMaterial
	        });
	        const stateMachine = new state_machine_1.StateMachine({
	            proxyOptions: this._proxyOptions,
	            tlsOptions: this._tlsOptions,
	            socketOptions: autoSelectSocketOptions(this._client.s.options)
	        });
	        const timeoutContext = options?.timeoutContext ??
	            timeout_1.TimeoutContext.create((0, utils_1.resolveTimeoutOptions)(this._client, { timeoutMS: this._timeoutMS }));
	        const dataKey = (0, bson_1.deserialize)(await stateMachine.execute(this, context, { timeoutContext }));
	        const { db: dbName, collection: collectionName } = utils_1.MongoDBCollectionNamespace.fromString(this._keyVaultNamespace);
	        const { insertedId } = await this._keyVaultClient
	            .db(dbName)
	            .collection(collectionName)
	            .insertOne(dataKey, {
	            writeConcern: { w: 'majority' },
	            timeoutMS: timeoutContext?.csotEnabled()
	                ? timeoutContext?.getRemainingTimeMSOrThrow()
	                : undefined
	        });
	        return insertedId;
	    }
	    /**
	     * Searches the keyvault for any data keys matching the provided filter.  If there are matches, rewrapManyDataKey then attempts to re-wrap the data keys using the provided options.
	     *
	     * If no matches are found, then no bulk write is performed.
	     *
	     * @example
	     * ```ts
	     * // rewrapping all data data keys (using a filter that matches all documents)
	     * const filter = {};
	     *
	     * const result = await clientEncryption.rewrapManyDataKey(filter);
	     * if (result.bulkWriteResult != null) {
	     *  // keys were re-wrapped, results will be available in the bulkWrite object.
	     * }
	     * ```
	     *
	     * @example
	     * ```ts
	     * // attempting to rewrap all data keys with no matches
	     * const filter = { _id: new Binary() } // assume _id matches no documents in the database
	     * const result = await clientEncryption.rewrapManyDataKey(filter);
	     *
	     * if (result.bulkWriteResult == null) {
	     *  // no keys matched, `bulkWriteResult` does not exist on the result object
	     * }
	     * ```
	     */
	    async rewrapManyDataKey(filter, options) {
	        let keyEncryptionKeyBson = undefined;
	        if (options) {
	            const keyEncryptionKey = Object.assign({ provider: options.provider }, options.masterKey);
	            keyEncryptionKeyBson = (0, bson_1.serialize)(keyEncryptionKey);
	        }
	        const filterBson = (0, bson_1.serialize)(filter);
	        const context = this._mongoCrypt.makeRewrapManyDataKeyContext(filterBson, keyEncryptionKeyBson);
	        const stateMachine = new state_machine_1.StateMachine({
	            proxyOptions: this._proxyOptions,
	            tlsOptions: this._tlsOptions,
	            socketOptions: autoSelectSocketOptions(this._client.s.options)
	        });
	        const timeoutContext = timeout_1.TimeoutContext.create((0, utils_1.resolveTimeoutOptions)(this._client, { timeoutMS: this._timeoutMS }));
	        const { v: dataKeys } = (0, bson_1.deserialize)(await stateMachine.execute(this, context, { timeoutContext }));
	        if (dataKeys.length === 0) {
	            return {};
	        }
	        const { db: dbName, collection: collectionName } = utils_1.MongoDBCollectionNamespace.fromString(this._keyVaultNamespace);
	        const replacements = dataKeys.map((key) => ({
	            updateOne: {
	                filter: { _id: key._id },
	                update: {
	                    $set: {
	                        masterKey: key.masterKey,
	                        keyMaterial: key.keyMaterial
	                    },
	                    $currentDate: {
	                        updateDate: true
	                    }
	                }
	            }
	        }));
	        const result = await this._keyVaultClient
	            .db(dbName)
	            .collection(collectionName)
	            .bulkWrite(replacements, {
	            writeConcern: { w: 'majority' },
	            timeoutMS: timeoutContext.csotEnabled() ? timeoutContext?.remainingTimeMS : undefined
	        });
	        return { bulkWriteResult: result };
	    }
	    /**
	     * Deletes the key with the provided id from the keyvault, if it exists.
	     *
	     * @example
	     * ```ts
	     * // delete a key by _id
	     * const id = new Binary(); // id is a bson binary subtype 4 object
	     * const { deletedCount } = await clientEncryption.deleteKey(id);
	     *
	     * if (deletedCount != null && deletedCount > 0) {
	     *   // successful deletion
	     * }
	     * ```
	     *
	     */
	    async deleteKey(_id) {
	        const { db: dbName, collection: collectionName } = utils_1.MongoDBCollectionNamespace.fromString(this._keyVaultNamespace);
	        return await this._keyVaultClient
	            .db(dbName)
	            .collection(collectionName)
	            .deleteOne({ _id }, { writeConcern: { w: 'majority' }, timeoutMS: this._timeoutMS });
	    }
	    /**
	     * Finds all the keys currently stored in the keyvault.
	     *
	     * This method will not throw.
	     *
	     * @returns a FindCursor over all keys in the keyvault.
	     * @example
	     * ```ts
	     * // fetching all keys
	     * const keys = await clientEncryption.getKeys().toArray();
	     * ```
	     */
	    getKeys() {
	        const { db: dbName, collection: collectionName } = utils_1.MongoDBCollectionNamespace.fromString(this._keyVaultNamespace);
	        return this._keyVaultClient
	            .db(dbName)
	            .collection(collectionName)
	            .find({}, { readConcern: { level: 'majority' }, timeoutMS: this._timeoutMS });
	    }
	    /**
	     * Finds a key in the keyvault with the specified _id.
	     *
	     * Returns a promise that either resolves to a {@link DataKey} if a document matches the key or null if no documents
	     * match the id.  The promise rejects with an error if an error is thrown.
	     * @example
	     * ```ts
	     * // getting a key by id
	     * const id = new Binary(); // id is a bson binary subtype 4 object
	     * const key = await clientEncryption.getKey(id);
	     * if (!key) {
	     *  // key is null if there was no matching key
	     * }
	     * ```
	     */
	    async getKey(_id) {
	        const { db: dbName, collection: collectionName } = utils_1.MongoDBCollectionNamespace.fromString(this._keyVaultNamespace);
	        return await this._keyVaultClient
	            .db(dbName)
	            .collection(collectionName)
	            .findOne({ _id }, { readConcern: { level: 'majority' }, timeoutMS: this._timeoutMS });
	    }
	    /**
	     * Finds a key in the keyvault which has the specified keyAltName.
	     *
	     * @param keyAltName - a keyAltName to search for a key
	     * @returns Returns a promise that either resolves to a {@link DataKey} if a document matches the key or null if no documents
	     * match the keyAltName.  The promise rejects with an error if an error is thrown.
	     * @example
	     * ```ts
	     * // get a key by alt name
	     * const keyAltName = 'keyAltName';
	     * const key = await clientEncryption.getKeyByAltName(keyAltName);
	     * if (!key) {
	     *  // key is null if there is no matching key
	     * }
	     * ```
	     */
	    async getKeyByAltName(keyAltName) {
	        const { db: dbName, collection: collectionName } = utils_1.MongoDBCollectionNamespace.fromString(this._keyVaultNamespace);
	        return await this._keyVaultClient
	            .db(dbName)
	            .collection(collectionName)
	            .findOne({ keyAltNames: keyAltName }, { readConcern: { level: 'majority' }, timeoutMS: this._timeoutMS });
	    }
	    /**
	     * Adds a keyAltName to a key identified by the provided _id.
	     *
	     * This method resolves to/returns the *old* key value (prior to adding the new altKeyName).
	     *
	     * @param _id - The id of the document to update.
	     * @param keyAltName - a keyAltName to search for a key
	     * @returns Returns a promise that either resolves to a {@link DataKey} if a document matches the key or null if no documents
	     * match the id.  The promise rejects with an error if an error is thrown.
	     * @example
	     * ```ts
	     * // adding an keyAltName to a data key
	     * const id = new Binary();  // id is a bson binary subtype 4 object
	     * const keyAltName = 'keyAltName';
	     * const oldKey = await clientEncryption.addKeyAltName(id, keyAltName);
	     * if (!oldKey) {
	     *  // null is returned if there is no matching document with an id matching the supplied id
	     * }
	     * ```
	     */
	    async addKeyAltName(_id, keyAltName) {
	        const { db: dbName, collection: collectionName } = utils_1.MongoDBCollectionNamespace.fromString(this._keyVaultNamespace);
	        const value = await this._keyVaultClient
	            .db(dbName)
	            .collection(collectionName)
	            .findOneAndUpdate({ _id }, { $addToSet: { keyAltNames: keyAltName } }, { writeConcern: { w: 'majority' }, returnDocument: 'before', timeoutMS: this._timeoutMS });
	        return value;
	    }
	    /**
	     * Adds a keyAltName to a key identified by the provided _id.
	     *
	     * This method resolves to/returns the *old* key value (prior to removing the new altKeyName).
	     *
	     * If the removed keyAltName is the last keyAltName for that key, the `altKeyNames` property is unset from the document.
	     *
	     * @param _id - The id of the document to update.
	     * @param keyAltName - a keyAltName to search for a key
	     * @returns Returns a promise that either resolves to a {@link DataKey} if a document matches the key or null if no documents
	     * match the id.  The promise rejects with an error if an error is thrown.
	     * @example
	     * ```ts
	     * // removing a key alt name from a data key
	     * const id = new Binary();  // id is a bson binary subtype 4 object
	     * const keyAltName = 'keyAltName';
	     * const oldKey = await clientEncryption.removeKeyAltName(id, keyAltName);
	     *
	     * if (!oldKey) {
	     *  // null is returned if there is no matching document with an id matching the supplied id
	     * }
	     * ```
	     */
	    async removeKeyAltName(_id, keyAltName) {
	        const { db: dbName, collection: collectionName } = utils_1.MongoDBCollectionNamespace.fromString(this._keyVaultNamespace);
	        const pipeline = [
	            {
	                $set: {
	                    keyAltNames: {
	                        $cond: [
	                            {
	                                $eq: ['$keyAltNames', [keyAltName]]
	                            },
	                            '$$REMOVE',
	                            {
	                                $filter: {
	                                    input: '$keyAltNames',
	                                    cond: {
	                                        $ne: ['$$this', keyAltName]
	                                    }
	                                }
	                            }
	                        ]
	                    }
	                }
	            }
	        ];
	        const value = await this._keyVaultClient
	            .db(dbName)
	            .collection(collectionName)
	            .findOneAndUpdate({ _id }, pipeline, {
	            writeConcern: { w: 'majority' },
	            returnDocument: 'before',
	            timeoutMS: this._timeoutMS
	        });
	        return value;
	    }
	    /**
	     * A convenience method for creating an encrypted collection.
	     * This method will create data keys for any encryptedFields that do not have a `keyId` defined
	     * and then create a new collection with the full set of encryptedFields.
	     *
	     * @param db - A Node.js driver Db object with which to create the collection
	     * @param name - The name of the collection to be created
	     * @param options - Options for createDataKey and for createCollection
	     * @returns created collection and generated encryptedFields
	     * @throws MongoCryptCreateDataKeyError - If part way through the process a createDataKey invocation fails, an error will be rejected that has the partial `encryptedFields` that were created.
	     * @throws MongoCryptCreateEncryptedCollectionError - If creating the collection fails, an error will be rejected that has the entire `encryptedFields` that were created.
	     */
	    async createEncryptedCollection(db, name, options) {
	        const { provider, masterKey, createCollectionOptions: { encryptedFields: { ...encryptedFields }, ...createCollectionOptions } } = options;
	        const timeoutContext = this._timeoutMS != null
	            ? timeout_1.TimeoutContext.create((0, utils_1.resolveTimeoutOptions)(this._client, { timeoutMS: this._timeoutMS }))
	            : undefined;
	        if (Array.isArray(encryptedFields.fields)) {
	            const createDataKeyPromises = encryptedFields.fields.map(async (field) => field == null || typeof field !== 'object' || field.keyId != null
	                ? field
	                : {
	                    ...field,
	                    keyId: await this.createDataKey(provider, {
	                        masterKey,
	                        // clone the timeoutContext
	                        // in order to avoid sharing the same timeout for server selection and connection checkout across different concurrent operations
	                        timeoutContext: timeoutContext?.csotEnabled() ? timeoutContext?.clone() : undefined
	                    })
	                });
	            const createDataKeyResolutions = await Promise.allSettled(createDataKeyPromises);
	            encryptedFields.fields = createDataKeyResolutions.map((resolution, index) => resolution.status === 'fulfilled' ? resolution.value : encryptedFields.fields[index]);
	            const rejection = createDataKeyResolutions.find((result) => result.status === 'rejected');
	            if (rejection != null) {
	                throw new errors_1.MongoCryptCreateDataKeyError(encryptedFields, { cause: rejection.reason });
	            }
	        }
	        try {
	            const collection = await db.createCollection(name, {
	                ...createCollectionOptions,
	                encryptedFields,
	                timeoutMS: timeoutContext?.csotEnabled()
	                    ? timeoutContext?.getRemainingTimeMSOrThrow()
	                    : undefined
	            });
	            return { collection, encryptedFields };
	        }
	        catch (cause) {
	            throw new errors_1.MongoCryptCreateEncryptedCollectionError(encryptedFields, { cause });
	        }
	    }
	    /**
	     * Explicitly encrypt a provided value. Note that either `options.keyId` or `options.keyAltName` must
	     * be specified. Specifying both `options.keyId` and `options.keyAltName` is considered an error.
	     *
	     * @param value - The value that you wish to serialize. Must be of a type that can be serialized into BSON
	     * @param options -
	     * @returns a Promise that either resolves with the encrypted value, or rejects with an error.
	     *
	     * @example
	     * ```ts
	     * // Encryption with async/await api
	     * async function encryptMyData(value) {
	     *   const keyId = await clientEncryption.createDataKey('local');
	     *   return clientEncryption.encrypt(value, { keyId, algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic' });
	     * }
	     * ```
	     *
	     * @example
	     * ```ts
	     * // Encryption using a keyAltName
	     * async function encryptMyData(value) {
	     *   await clientEncryption.createDataKey('local', { keyAltNames: 'mySpecialKey' });
	     *   return clientEncryption.encrypt(value, { keyAltName: 'mySpecialKey', algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic' });
	     * }
	     * ```
	     */
	    async encrypt(value, options) {
	        return await this._encrypt(value, false, options);
	    }
	    /**
	     * Encrypts a Match Expression or Aggregate Expression to query a range index.
	     *
	     * Only supported when queryType is "range" and algorithm is "Range".
	     *
	     * @param expression - a BSON document of one of the following forms:
	     *  1. A Match Expression of this form:
	     *      `{$and: [{<field>: {$gt: <value1>}}, {<field>: {$lt: <value2> }}]}`
	     *  2. An Aggregate Expression of this form:
	     *      `{$and: [{$gt: [<fieldpath>, <value1>]}, {$lt: [<fieldpath>, <value2>]}]}`
	     *
	     *    `$gt` may also be `$gte`. `$lt` may also be `$lte`.
	     *
	     * @param options -
	     * @returns Returns a Promise that either resolves with the encrypted value or rejects with an error.
	     */
	    async encryptExpression(expression, options) {
	        return await this._encrypt(expression, true, options);
	    }
	    /**
	     * Explicitly decrypt a provided encrypted value
	     *
	     * @param value - An encrypted value
	     * @returns a Promise that either resolves with the decrypted value, or rejects with an error
	     *
	     * @example
	     * ```ts
	     * // Decrypting value with async/await API
	     * async function decryptMyValue(value) {
	     *   return clientEncryption.decrypt(value);
	     * }
	     * ```
	     */
	    async decrypt(value) {
	        const valueBuffer = (0, bson_1.serialize)({ v: value });
	        const context = this._mongoCrypt.makeExplicitDecryptionContext(valueBuffer);
	        const stateMachine = new state_machine_1.StateMachine({
	            proxyOptions: this._proxyOptions,
	            tlsOptions: this._tlsOptions,
	            socketOptions: autoSelectSocketOptions(this._client.s.options)
	        });
	        const timeoutContext = this._timeoutMS != null
	            ? timeout_1.TimeoutContext.create((0, utils_1.resolveTimeoutOptions)(this._client, { timeoutMS: this._timeoutMS }))
	            : undefined;
	        const { v } = (0, bson_1.deserialize)(await stateMachine.execute(this, context, { timeoutContext }));
	        return v;
	    }
	    /**
	     * @internal
	     * Ask the user for KMS credentials.
	     *
	     * This returns anything that looks like the kmsProviders original input
	     * option. It can be empty, and any provider specified here will override
	     * the original ones.
	     */
	    async askForKMSCredentials() {
	        return await (0, index_1.refreshKMSCredentials)(this._kmsProviders, this._credentialProviders);
	    }
	    static get libmongocryptVersion() {
	        return ClientEncryption.getMongoCrypt().libmongocryptVersion;
	    }
	    /**
	     * @internal
	     * A helper that perform explicit encryption of values and expressions.
	     * Explicitly encrypt a provided value. Note that either `options.keyId` or `options.keyAltName` must
	     * be specified. Specifying both `options.keyId` and `options.keyAltName` is considered an error.
	     *
	     * @param value - The value that you wish to encrypt. Must be of a type that can be serialized into BSON
	     * @param expressionMode - a boolean that indicates whether or not to encrypt the value as an expression
	     * @param options - options to pass to encrypt
	     * @returns the raw result of the call to stateMachine.execute().  When expressionMode is set to true, the return
	     *          value will be a bson document.  When false, the value will be a BSON Binary.
	     *
	     */
	    async _encrypt(value, expressionMode, options) {
	        const { algorithm, keyId, keyAltName, contentionFactor, queryType, rangeOptions, textOptions } = options;
	        const contextOptions = {
	            expressionMode,
	            algorithm
	        };
	        if (keyId) {
	            contextOptions.keyId = keyId.buffer;
	        }
	        if (keyAltName) {
	            if (keyId) {
	                throw new errors_1.MongoCryptInvalidArgumentError(`"options" cannot contain both "keyId" and "keyAltName"`);
	            }
	            if (typeof keyAltName !== 'string') {
	                throw new errors_1.MongoCryptInvalidArgumentError(`"options.keyAltName" must be of type string, but was of type ${typeof keyAltName}`);
	            }
	            contextOptions.keyAltName = (0, bson_1.serialize)({ keyAltName });
	        }
	        if (typeof contentionFactor === 'number' || typeof contentionFactor === 'bigint') {
	            contextOptions.contentionFactor = contentionFactor;
	        }
	        if (typeof queryType === 'string') {
	            contextOptions.queryType = queryType;
	        }
	        if (typeof rangeOptions === 'object') {
	            contextOptions.rangeOptions = (0, bson_1.serialize)(rangeOptions);
	        }
	        if (typeof textOptions === 'object') {
	            contextOptions.textOptions = (0, bson_1.serialize)(textOptions);
	        }
	        const valueBuffer = (0, bson_1.serialize)({ v: value });
	        const stateMachine = new state_machine_1.StateMachine({
	            proxyOptions: this._proxyOptions,
	            tlsOptions: this._tlsOptions,
	            socketOptions: autoSelectSocketOptions(this._client.s.options)
	        });
	        const context = this._mongoCrypt.makeExplicitEncryptionContext(valueBuffer, contextOptions);
	        const timeoutContext = this._timeoutMS != null
	            ? timeout_1.TimeoutContext.create((0, utils_1.resolveTimeoutOptions)(this._client, { timeoutMS: this._timeoutMS }))
	            : undefined;
	        const { v } = (0, bson_1.deserialize)(await stateMachine.execute(this, context, { timeoutContext }));
	        return v;
	    }
	}
	client_encryption.ClientEncryption = ClientEncryption;
	/**
	 * Get the socket options from the client.
	 * @param baseOptions - The mongo client options.
	 * @returns ClientEncryptionSocketOptions
	 */
	function autoSelectSocketOptions(baseOptions) {
	    const options = { autoSelectFamily: true };
	    if ('autoSelectFamily' in baseOptions) {
	        options.autoSelectFamily = baseOptions.autoSelectFamily;
	    }
	    if ('autoSelectFamilyAttemptTimeout' in baseOptions) {
	        options.autoSelectFamilyAttemptTimeout = baseOptions.autoSelectFamilyAttemptTimeout;
	    }
	    return options;
	}
	
	return client_encryption;
}

var mongocryptd_manager = {};

var hasRequiredMongocryptd_manager;

function requireMongocryptd_manager () {
	if (hasRequiredMongocryptd_manager) return mongocryptd_manager;
	hasRequiredMongocryptd_manager = 1;
	Object.defineProperty(mongocryptd_manager, "__esModule", { value: true });
	mongocryptd_manager.MongocryptdManager = void 0;
	const error_1 = mongodb4.requireError();
	/**
	 * @internal
	 * An internal class that handles spawning a mongocryptd.
	 */
	class MongocryptdManager {
	    static { this.DEFAULT_MONGOCRYPTD_URI = 'mongodb://localhost:27020'; }
	    constructor(extraOptions = {}) {
	        this.spawnPath = '';
	        this.spawnArgs = [];
	        this.uri =
	            typeof extraOptions.mongocryptdURI === 'string' && extraOptions.mongocryptdURI.length > 0
	                ? extraOptions.mongocryptdURI
	                : MongocryptdManager.DEFAULT_MONGOCRYPTD_URI;
	        this.bypassSpawn = !!extraOptions.mongocryptdBypassSpawn;
	        if (Object.hasOwn(extraOptions, 'mongocryptdSpawnPath') && extraOptions.mongocryptdSpawnPath) {
	            this.spawnPath = extraOptions.mongocryptdSpawnPath;
	        }
	        if (Object.hasOwn(extraOptions, 'mongocryptdSpawnArgs') &&
	            Array.isArray(extraOptions.mongocryptdSpawnArgs)) {
	            this.spawnArgs = this.spawnArgs.concat(extraOptions.mongocryptdSpawnArgs);
	        }
	        if (this.spawnArgs
	            .filter(arg => typeof arg === 'string')
	            .every(arg => arg.indexOf('--idleShutdownTimeoutSecs') < 0)) {
	            this.spawnArgs.push('--idleShutdownTimeoutSecs', '60');
	        }
	    }
	    /**
	     * Will check to see if a mongocryptd is up. If it is not up, it will attempt
	     * to spawn a mongocryptd in a detached process, and then wait for it to be up.
	     */
	    async spawn() {
	        const cmdName = this.spawnPath || 'mongocryptd';
	        // eslint-disable-next-line @typescript-eslint/no-require-imports
	        const { spawn } = require$$0$4;
	        // Spawned with stdio: ignore and detached: true
	        // to ensure child can outlive parent.
	        this._child = spawn(cmdName, this.spawnArgs, {
	            stdio: 'ignore',
	            detached: true
	        });
	        this._child.on('error', () => {
	            // From the FLE spec:
	            // "The stdout and stderr of the spawned process MUST not be exposed in the driver
	            // (e.g. redirect to /dev/null). Users can pass the argument --logpath to
	            // extraOptions.mongocryptdSpawnArgs if they need to inspect mongocryptd logs.
	            // If spawning is necessary, the driver MUST spawn mongocryptd whenever server
	            // selection on the MongoClient to mongocryptd fails. If the MongoClient fails to
	            // connect after spawning, the server selection error is propagated to the user."
	            // The AutoEncrypter and MongoCryptdManager should work together to spawn
	            // mongocryptd whenever necessary.  Additionally, the `mongocryptd` intentionally
	            // shuts down after 60s and gets respawned when necessary.  We rely on server
	            // selection timeouts when connecting to the `mongocryptd` to inform users that something
	            // has been configured incorrectly.  For those reasons, we suppress stderr from
	            // the `mongocryptd` process and immediately unref the process.
	        });
	        // unref child to remove handle from event loop
	        this._child.unref();
	    }
	    /**
	     * @returns the result of `fn` or rejects with an error.
	     */
	    async withRespawn(fn) {
	        try {
	            const result = await fn();
	            return result;
	        }
	        catch (err) {
	            // If we are not bypassing spawning, then we should retry once on a MongoTimeoutError (server selection error)
	            const shouldSpawn = err instanceof error_1.MongoNetworkTimeoutError && !this.bypassSpawn;
	            if (!shouldSpawn) {
	                throw err;
	            }
	        }
	        await this.spawn();
	        const result = await fn();
	        return result;
	    }
	}
	mongocryptd_manager.MongocryptdManager = MongocryptdManager;
	
	return mongocryptd_manager;
}

var hasRequiredAuto_encrypter;

function requireAuto_encrypter () {
	if (hasRequiredAuto_encrypter) return auto_encrypter;
	hasRequiredAuto_encrypter = 1;
	var _a;
	Object.defineProperty(auto_encrypter, "__esModule", { value: true });
	auto_encrypter.AutoEncrypter = auto_encrypter.AutoEncryptionLoggerLevel = void 0;
	const net = require$$0$2;
	const bson_1 = requireBson();
	const constants_1 = mongodb3.requireConstants();
	const deps_1 = mongodb4.requireDeps();
	const error_1 = mongodb4.requireError();
	const mongo_client_1 = mongodb4.requireMongo_client();
	const utils_1 = mongodb7.requireUtils();
	const client_encryption_1 = requireClient_encryption();
	const errors_1 = requireErrors();
	const mongocryptd_manager_1 = requireMongocryptd_manager();
	const providers_1 = requireProviders();
	const state_machine_1 = requireState_machine();
	/** @public */
	auto_encrypter.AutoEncryptionLoggerLevel = Object.freeze({
	    FatalError: 0,
	    Error: 1,
	    Warning: 2,
	    Info: 3,
	    Trace: 4
	});
	/**
	 * @internal An internal class to be used by the driver for auto encryption
	 * **NOTE**: Not meant to be instantiated directly, this is for internal use only.
	 */
	class AutoEncrypter {
	    static { _a = constants_1.kDecorateResult; }
	    /** @internal */
	    static getMongoCrypt() {
	        const encryption = (0, deps_1.getMongoDBClientEncryption)();
	        if ('kModuleError' in encryption) {
	            throw encryption.kModuleError;
	        }
	        return encryption.MongoCrypt;
	    }
	    /**
	     * Create an AutoEncrypter
	     *
	     * **Note**: Do not instantiate this class directly. Rather, supply the relevant options to a MongoClient
	     *
	     * **Note**: Supplying `options.schemaMap` provides more security than relying on JSON Schemas obtained from the server.
	     * It protects against a malicious server advertising a false JSON Schema, which could trick the client into sending unencrypted data that should be encrypted.
	     * Schemas supplied in the schemaMap only apply to configuring automatic encryption for Client-Side Field Level Encryption.
	     * Other validation rules in the JSON schema will not be enforced by the driver and will result in an error.
	     *
	     * @example <caption>Create an AutoEncrypter that makes use of mongocryptd</caption>
	     * ```ts
	     * // Enabling autoEncryption via a MongoClient using mongocryptd
	     * const { MongoClient } = require('mongodb');
	     * const client = new MongoClient(URL, {
	     *   autoEncryption: {
	     *     kmsProviders: {
	     *       aws: {
	     *         accessKeyId: AWS_ACCESS_KEY,
	     *         secretAccessKey: AWS_SECRET_KEY
	     *       }
	     *     }
	     *   }
	     * });
	     * ```
	     *
	     * await client.connect();
	     * // From here on, the client will be encrypting / decrypting automatically
	     * @example <caption>Create an AutoEncrypter that makes use of libmongocrypt's CSFLE shared library</caption>
	     * ```ts
	     * // Enabling autoEncryption via a MongoClient using CSFLE shared library
	     * const { MongoClient } = require('mongodb');
	     * const client = new MongoClient(URL, {
	     *   autoEncryption: {
	     *     kmsProviders: {
	     *       aws: {}
	     *     },
	     *     extraOptions: {
	     *       cryptSharedLibPath: '/path/to/local/crypt/shared/lib',
	     *       cryptSharedLibRequired: true
	     *     }
	     *   }
	     * });
	     * ```
	     *
	     * await client.connect();
	     * // From here on, the client will be encrypting / decrypting automatically
	     */
	    constructor(client, options) {
	        /**
	         * Used by devtools to enable decorating decryption results.
	         *
	         * When set and enabled, `decrypt` will automatically recursively
	         * traverse a decrypted document and if a field has been decrypted,
	         * it will mark it as decrypted.  Compass uses this to determine which
	         * fields were decrypted.
	         */
	        this[_a] = false;
	        this._client = client;
	        this._bypassEncryption = options.bypassAutoEncryption === true;
	        this._keyVaultNamespace = options.keyVaultNamespace || 'admin.datakeys';
	        this._keyVaultClient = options.keyVaultClient || client;
	        this._metaDataClient = options.metadataClient || client;
	        this._proxyOptions = options.proxyOptions || {};
	        this._tlsOptions = options.tlsOptions || {};
	        this._kmsProviders = options.kmsProviders || {};
	        this._credentialProviders = options.credentialProviders;
	        if (options.credentialProviders?.aws && !(0, providers_1.isEmptyCredentials)('aws', this._kmsProviders)) {
	            throw new errors_1.MongoCryptInvalidArgumentError('Can only provide a custom AWS credential provider when the state machine is configured for automatic AWS credential fetching');
	        }
	        const mongoCryptOptions = {
	            errorWrapper: errors_1.defaultErrorWrapper
	        };
	        if (options.schemaMap) {
	            if (bson_1.ByteUtils.isUint8Array(options.schemaMap)) {
	                mongoCryptOptions.schemaMap = options.schemaMap;
	            }
	            else {
	                mongoCryptOptions.schemaMap = (0, bson_1.serialize)(options.schemaMap);
	            }
	        }
	        if (options.encryptedFieldsMap) {
	            if (bson_1.ByteUtils.isUint8Array(options.encryptedFieldsMap)) {
	                mongoCryptOptions.encryptedFieldsMap = options.encryptedFieldsMap;
	            }
	            else {
	                mongoCryptOptions.encryptedFieldsMap = (0, bson_1.serialize)(options.encryptedFieldsMap);
	            }
	        }
	        if (bson_1.ByteUtils.isUint8Array(this._kmsProviders)) {
	            mongoCryptOptions.kmsProviders = this._kmsProviders;
	        }
	        else {
	            mongoCryptOptions.kmsProviders = (0, bson_1.serialize)(this._kmsProviders);
	        }
	        if (options.options?.logger) {
	            mongoCryptOptions.logger = options.options.logger;
	        }
	        if (options.extraOptions && options.extraOptions.cryptSharedLibPath) {
	            mongoCryptOptions.cryptSharedLibPath = options.extraOptions.cryptSharedLibPath;
	        }
	        if (options.bypassQueryAnalysis) {
	            mongoCryptOptions.bypassQueryAnalysis = options.bypassQueryAnalysis;
	        }
	        if (options.keyExpirationMS != null) {
	            mongoCryptOptions.keyExpirationMS = options.keyExpirationMS;
	        }
	        this._bypassMongocryptdAndCryptShared = this._bypassEncryption || !!options.bypassQueryAnalysis;
	        if (options.extraOptions && options.extraOptions.cryptSharedLibSearchPaths) {
	            // Only for driver testing
	            mongoCryptOptions.cryptSharedLibSearchPaths = options.extraOptions.cryptSharedLibSearchPaths;
	        }
	        else if (!this._bypassMongocryptdAndCryptShared) {
	            mongoCryptOptions.cryptSharedLibSearchPaths = ['$SYSTEM'];
	        }
	        const MongoCrypt = AutoEncrypter.getMongoCrypt();
	        this._mongocrypt = new MongoCrypt(mongoCryptOptions);
	        this._contextCounter = 0;
	        if (options.extraOptions &&
	            options.extraOptions.cryptSharedLibRequired &&
	            !this.cryptSharedLibVersionInfo) {
	            throw new errors_1.MongoCryptInvalidArgumentError('`cryptSharedLibRequired` set but no crypt_shared library loaded');
	        }
	        // Only instantiate mongocryptd manager/client once we know for sure
	        // that we are not using the CSFLE shared library.
	        if (!this._bypassMongocryptdAndCryptShared && !this.cryptSharedLibVersionInfo) {
	            this._mongocryptdManager = new mongocryptd_manager_1.MongocryptdManager(options.extraOptions);
	            const clientOptions = {
	                serverSelectionTimeoutMS: 10000
	            };
	            if ((options.extraOptions == null || typeof options.extraOptions.mongocryptdURI !== 'string') &&
	                !net.getDefaultAutoSelectFamily) {
	                // Only set family if autoSelectFamily options are not supported.
	                clientOptions.family = 4;
	            }
	            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
	            // @ts-ignore: TS complains as this always returns true on versions where it is present.
	            if (net.getDefaultAutoSelectFamily) {
	                // AutoEncrypter is made inside of MongoClient constructor while options are being parsed,
	                // we do not have access to the options that are in progress.
	                // TODO(NODE-6449): AutoEncrypter does not use client options for autoSelectFamily
	                Object.assign(clientOptions, (0, client_encryption_1.autoSelectSocketOptions)(this._client.s?.options ?? {}));
	            }
	            this._mongocryptdClient = new mongo_client_1.MongoClient(this._mongocryptdManager.uri, clientOptions);
	        }
	    }
	    /**
	     * Initializes the auto encrypter by spawning a mongocryptd and connecting to it.
	     *
	     * This function is a no-op when bypassSpawn is set or the crypt shared library is used.
	     */
	    async init() {
	        if (this._bypassMongocryptdAndCryptShared || this.cryptSharedLibVersionInfo) {
	            return;
	        }
	        if (!this._mongocryptdManager) {
	            throw new error_1.MongoRuntimeError('Reached impossible state: mongocryptdManager is undefined when neither bypassSpawn nor the shared lib are specified.');
	        }
	        if (!this._mongocryptdClient) {
	            throw new error_1.MongoRuntimeError('Reached impossible state: mongocryptdClient is undefined when neither bypassSpawn nor the shared lib are specified.');
	        }
	        if (!this._mongocryptdManager.bypassSpawn) {
	            await this._mongocryptdManager.spawn();
	        }
	        try {
	            const client = await this._mongocryptdClient.connect();
	            return client;
	        }
	        catch (error) {
	            throw new error_1.MongoRuntimeError('Unable to connect to `mongocryptd`, please make sure it is running or in your PATH for auto-spawn', { cause: error });
	        }
	    }
	    /**
	     * Cleans up the `_mongocryptdClient`, if present.
	     */
	    async close() {
	        await this._mongocryptdClient?.close();
	    }
	    /**
	     * Encrypt a command for a given namespace.
	     */
	    async encrypt(ns, cmd, options = {}) {
	        options.signal?.throwIfAborted();
	        if (this._bypassEncryption) {
	            // If `bypassAutoEncryption` has been specified, don't encrypt
	            return cmd;
	        }
	        const commandBuffer = (0, bson_1.serialize)(cmd, options);
	        const context = this._mongocrypt.makeEncryptionContext(utils_1.MongoDBCollectionNamespace.fromString(ns).db, commandBuffer);
	        context.id = this._contextCounter++;
	        context.ns = ns;
	        context.document = cmd;
	        const stateMachine = new state_machine_1.StateMachine({
	            promoteValues: false,
	            promoteLongs: false,
	            proxyOptions: this._proxyOptions,
	            tlsOptions: this._tlsOptions,
	            socketOptions: (0, client_encryption_1.autoSelectSocketOptions)(this._client.s.options)
	        });
	        return (0, bson_1.deserialize)(await stateMachine.execute(this, context, options), {
	            promoteValues: false,
	            promoteLongs: false
	        });
	    }
	    /**
	     * Decrypt a command response
	     */
	    async decrypt(response, options = {}) {
	        options.signal?.throwIfAborted();
	        const context = this._mongocrypt.makeDecryptionContext(response);
	        context.id = this._contextCounter++;
	        const stateMachine = new state_machine_1.StateMachine({
	            ...options,
	            proxyOptions: this._proxyOptions,
	            tlsOptions: this._tlsOptions,
	            socketOptions: (0, client_encryption_1.autoSelectSocketOptions)(this._client.s.options)
	        });
	        return await stateMachine.execute(this, context, options);
	    }
	    /**
	     * Ask the user for KMS credentials.
	     *
	     * This returns anything that looks like the kmsProviders original input
	     * option. It can be empty, and any provider specified here will override
	     * the original ones.
	     */
	    async askForKMSCredentials() {
	        return await (0, providers_1.refreshKMSCredentials)(this._kmsProviders, this._credentialProviders);
	    }
	    /**
	     * Return the current libmongocrypt's CSFLE shared library version
	     * as `{ version: bigint, versionStr: string }`, or `null` if no CSFLE
	     * shared library was loaded.
	     */
	    get cryptSharedLibVersionInfo() {
	        return this._mongocrypt.cryptSharedLibVersionInfo;
	    }
	    static get libmongocryptVersion() {
	        return AutoEncrypter.getMongoCrypt().libmongocryptVersion;
	    }
	}
	auto_encrypter.AutoEncrypter = AutoEncrypter;
	
	return auto_encrypter;
}

var mongodb_aws = {};

var aws4 = {};

var hasRequiredAws4;

function requireAws4 () {
	if (hasRequiredAws4) return aws4;
	hasRequiredAws4 = 1;
	Object.defineProperty(aws4, "__esModule", { value: true });
	aws4.aws4Sign = aws4Sign;
	const bson_1 = requireBson();
	/**
	 * Calculates the SHA-256 hash of a string.
	 *
	 * @param str - String to hash.
	 * @returns Hexadecimal representation of the hash.
	 */
	const getHexSha256 = async (str) => {
	    const data = stringToBuffer(str);
	    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	    const hashHex = bson_1.ByteUtils.toHex(new Uint8Array(hashBuffer));
	    return hashHex;
	};
	/**
	 * Calculates the HMAC-SHA256 of a string using the provided key.
	 * @param key - Key to use for HMAC calculation. Can be a string or Uint8Array.
	 * @param str - String to calculate HMAC for.
	 * @returns Uint8Array containing the HMAC-SHA256 digest.
	 */
	const getHmacSha256 = async (key, str) => {
	    let keyData;
	    if (typeof key === 'string') {
	        keyData = stringToBuffer(key);
	    }
	    else {
	        keyData = key;
	    }
	    const importedKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: { name: 'SHA-256' } }, false, ['sign']);
	    const strData = stringToBuffer(str);
	    const signature = await crypto.subtle.sign('HMAC', importedKey, strData);
	    const digest = new Uint8Array(signature);
	    return digest;
	};
	/**
	 * Converts header values according to AWS requirements,
	 * From https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv-create-signed-request.html#create-canonical-request
	 * For values, you must:
	    - trim any leading or trailing spaces.
	    - convert sequential spaces to a single space.
	 * @param value - Header value to convert.
	 * @returns - Converted header value.
	 */
	const convertHeaderValue = (value) => {
	    return value.toString().trim().replace(/\s+/g, ' ');
	};
	/**
	 * Returns a Uint8Array representation of a string, encoded in UTF-8.
	 * @param str - String to convert.
	 * @returns Uint8Array containing the UTF-8 encoded string.
	 */
	function stringToBuffer(str) {
	    const data = new Uint8Array(bson_1.ByteUtils.utf8ByteLength(str));
	    bson_1.ByteUtils.encodeUTF8Into(data, str, 0);
	    return data;
	}
	/**
	 * This method implements AWS Signature 4 logic for a very specific request format.
	 * The signing logic is described here: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv-create-signed-request.html
	 */
	async function aws4Sign(options, credentials) {
	    /**
	     * From the spec: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv-create-signed-request.html
	     *
	     * Summary of signing steps
	     * 1. Create a canonical request
	     *    Arrange the contents of your request (host, action, headers, etc.) into a standard canonical format. The canonical request is one of the inputs used to create the string to sign.
	     * 2. Create a hash of the canonical request
	     *    Hash the canonical request using the same algorithm that you used to create the hash of the payload. The hash of the canonical request is a string of lowercase hexadecimal characters.
	     * 3. Create a string to sign
	     *    Create a string to sign with the canonical request and extra information such as the algorithm, request date, credential scope, and the hash of the canonical request.
	     * 4. Derive a signing key
	     *    Use the secret access key to derive the key used to sign the request.
	     * 5. Calculate the signature
	     *    Perform a keyed hash operation on the string to sign using the derived signing key as the hash key.
	     * 6. Add the signature to the request
	     *    Add the calculated signature to an HTTP header or to the query string of the request.
	     */
	    // 1: Create a canonical request
	    // Date – The date and time used to sign the request.
	    const date = options.date;
	    // RequestDateTime – The date and time used in the credential scope. This value is the current UTC time in ISO 8601 format (for example, 20130524T000000Z).
	    const requestDateTime = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
	    // RequestDate – The date used in the credential scope. This value is the current UTC date in YYYYMMDD format (for example, 20130524).
	    const requestDate = requestDateTime.substring(0, 8);
	    // Method – The HTTP request method. For us, this is always 'POST'.
	    const method = options.method;
	    // CanonicalUri – The URI-encoded version of the absolute path component URI, starting with the / that follows the domain name and up to the end of the string
	    // For our requests, this is always '/'
	    const canonicalUri = options.path;
	    // CanonicalQueryString – The URI-encoded query string parameters. For our requests, there are no query string parameters, so this is always an empty string.
	    const canonicalQuerystring = '';
	    // CanonicalHeaders – A list of request headers with their values. Individual header name and value pairs are separated by the newline character ("\n").
	    // All of our known/expected headers are included here, there are no extra headers.
	    const headers = new Headers({
	        'content-length': convertHeaderValue(options.headers['Content-Length']),
	        'content-type': convertHeaderValue(options.headers['Content-Type']),
	        host: convertHeaderValue(options.host),
	        'x-amz-date': convertHeaderValue(requestDateTime),
	        'x-mongodb-gs2-cb-flag': convertHeaderValue(options.headers['X-MongoDB-GS2-CB-Flag']),
	        'x-mongodb-server-nonce': convertHeaderValue(options.headers['X-MongoDB-Server-Nonce'])
	    });
	    // If session token is provided, include it in the headers
	    if ('sessionToken' in credentials && credentials.sessionToken) {
	        headers.append('x-amz-security-token', convertHeaderValue(credentials.sessionToken));
	    }
	    // Canonical headers are lowercased and sorted.
	    const canonicalHeaders = Array.from(headers.entries())
	        .map(([key, value]) => `${key.toLowerCase()}:${value}`)
	        .sort()
	        .join('\n');
	    const canonicalHeaderNames = Array.from(headers.keys()).map(header => header.toLowerCase());
	    // SignedHeaders – An alphabetically sorted, semicolon-separated list of lowercase request header names.
	    const signedHeaders = canonicalHeaderNames.sort().join(';');
	    // HashedPayload – A string created using the payload in the body of the HTTP request as input to a hash function. This string uses lowercase hexadecimal characters.
	    const hashedPayload = await getHexSha256(options.body);
	    // CanonicalRequest – A string that includes the above elements, separated by newline characters.
	    const canonicalRequest = [
	        method,
	        canonicalUri,
	        canonicalQuerystring,
	        canonicalHeaders + '\n',
	        signedHeaders,
	        hashedPayload
	    ].join('\n');
	    // 2. Create a hash of the canonical request
	    // HashedCanonicalRequest – A string created by using the canonical request as input to a hash function.
	    const hashedCanonicalRequest = await getHexSha256(canonicalRequest);
	    // 3. Create a string to sign
	    // Algorithm – The algorithm used to create the hash of the canonical request. For SigV4, use AWS4-HMAC-SHA256.
	    const algorithm = 'AWS4-HMAC-SHA256';
	    // CredentialScope – The credential scope, which restricts the resulting signature to the specified Region and service.
	    // Has the following format: YYYYMMDD/region/service/aws4_request.
	    const credentialScope = `${requestDate}/${options.region}/${options.service}/aws4_request`;
	    // StringToSign – A string that includes the above elements, separated by newline characters.
	    const stringToSign = [algorithm, requestDateTime, credentialScope, hashedCanonicalRequest].join('\n');
	    // 4. Derive a signing key
	    // To derive a signing key for SigV4, perform a succession of keyed hash operations (HMAC) on the request date, Region, and service, with your AWS secret access key as the key for the initial hashing operation.
	    const dateKey = await getHmacSha256('AWS4' + credentials.secretAccessKey, requestDate);
	    const dateRegionKey = await getHmacSha256(dateKey, options.region);
	    const dateRegionServiceKey = await getHmacSha256(dateRegionKey, options.service);
	    const signingKey = await getHmacSha256(dateRegionServiceKey, 'aws4_request');
	    // 5. Calculate the signature
	    const signatureBuffer = await getHmacSha256(signingKey, stringToSign);
	    const signature = bson_1.ByteUtils.toHex(signatureBuffer);
	    // 6. Add the signature to the request
	    // Calculate the Authorization header
	    const authorizationHeader = [
	        'AWS4-HMAC-SHA256 Credential=' + credentials.accessKeyId + '/' + credentialScope,
	        'SignedHeaders=' + signedHeaders,
	        'Signature=' + signature
	    ].join(', ');
	    // Return the calculated headers
	    return {
	        Authorization: authorizationHeader,
	        'X-Amz-Date': requestDateTime
	    };
	}
	
	return aws4;
}

var hasRequiredMongodb_aws;

function requireMongodb_aws () {
	if (hasRequiredMongodb_aws) return mongodb_aws;
	hasRequiredMongodb_aws = 1;
	Object.defineProperty(mongodb_aws, "__esModule", { value: true });
	mongodb_aws.MongoDBAWS = void 0;
	const bson_1 = requireBson();
	const BSON = requireBson();
	const error_1 = mongodb4.requireError();
	const utils_1 = mongodb7.requireUtils();
	const auth_provider_1 = requireAuth_provider();
	const aws_temporary_credentials_1 = requireAws_temporary_credentials();
	const aws4_1 = requireAws4();
	const mongo_credentials_1 = requireMongo_credentials();
	const providers_1 = mongodb2.requireProviders();
	const ASCII_N = 110;
	const bsonOptions = {
	    useBigInt64: false,
	    promoteLongs: true,
	    promoteValues: true,
	    promoteBuffers: false,
	    bsonRegExp: false
	};
	class MongoDBAWS extends auth_provider_1.AuthProvider {
	    constructor(credentialProvider) {
	        super();
	        this.credentialFetcher = new aws_temporary_credentials_1.AWSSDKCredentialProvider(credentialProvider);
	    }
	    async auth(authContext) {
	        const { connection } = authContext;
	        if (!authContext.credentials) {
	            throw new error_1.MongoMissingCredentialsError('AuthContext must provide credentials.');
	        }
	        if ((0, utils_1.maxWireVersion)(connection) < 9) {
	            throw new error_1.MongoCompatibilityError('MONGODB-AWS authentication requires MongoDB version 4.4 or later');
	        }
	        authContext.credentials = await makeTempCredentials(authContext.credentials, this.credentialFetcher);
	        const { credentials } = authContext;
	        const accessKeyId = credentials.username;
	        const secretAccessKey = credentials.password;
	        // Allow the user to specify an AWS session token for authentication with temporary credentials.
	        const sessionToken = credentials.mechanismProperties.AWS_SESSION_TOKEN;
	        // If all three defined, include sessionToken, else only include username and pass
	        const awsCredentials = sessionToken
	            ? { accessKeyId, secretAccessKey, sessionToken }
	            : { accessKeyId, secretAccessKey };
	        const db = credentials.source;
	        const nonce = await (0, utils_1.randomBytes)(32);
	        // All messages between MongoDB clients and servers are sent as BSON objects
	        // in the payload field of saslStart and saslContinue.
	        const saslStart = {
	            saslStart: 1,
	            mechanism: 'MONGODB-AWS',
	            payload: BSON.serialize({ r: nonce, p: ASCII_N }, bsonOptions)
	        };
	        const saslStartResponse = await connection.command((0, utils_1.ns)(`${db}.$cmd`), saslStart, undefined);
	        const serverResponse = BSON.deserialize(saslStartResponse.payload.buffer, bsonOptions);
	        const host = serverResponse.h;
	        const serverNonce = serverResponse.s.buffer;
	        if (serverNonce.length !== 64) {
	            // TODO(NODE-3483)
	            throw new error_1.MongoRuntimeError(`Invalid server nonce length ${serverNonce.length}, expected 64`);
	        }
	        if (!bson_1.ByteUtils.equals(serverNonce.subarray(0, nonce.byteLength), nonce)) {
	            // throw because the serverNonce's leading 32 bytes must equal the client nonce's 32 bytes
	            // https://github.com/mongodb/specifications/blob/master/source/auth/auth.md#conversation-5
	            // TODO(NODE-3483)
	            throw new error_1.MongoRuntimeError('Server nonce does not begin with client nonce');
	        }
	        if (host.length < 1 || host.length > 255 || host.indexOf('..') !== -1) {
	            // TODO(NODE-3483)
	            throw new error_1.MongoRuntimeError(`Server returned an invalid host: "${host}"`);
	        }
	        const body = 'Action=GetCallerIdentity&Version=2011-06-15';
	        const headers = await (0, aws4_1.aws4Sign)({
	            method: 'POST',
	            host,
	            region: deriveRegion(serverResponse.h),
	            service: 'sts',
	            headers: {
	                'Content-Type': 'application/x-www-form-urlencoded',
	                'Content-Length': body.length,
	                'X-MongoDB-Server-Nonce': bson_1.ByteUtils.toBase64(serverNonce),
	                'X-MongoDB-GS2-CB-Flag': 'n'
	            },
	            path: '/',
	            body,
	            date: new Date()
	        }, awsCredentials);
	        const payload = {
	            a: headers.Authorization,
	            d: headers['X-Amz-Date']
	        };
	        if (sessionToken) {
	            payload.t = sessionToken;
	        }
	        const saslContinue = {
	            saslContinue: 1,
	            conversationId: saslStartResponse.conversationId,
	            payload: BSON.serialize(payload, bsonOptions)
	        };
	        await connection.command((0, utils_1.ns)(`${db}.$cmd`), saslContinue, undefined);
	    }
	}
	mongodb_aws.MongoDBAWS = MongoDBAWS;
	async function makeTempCredentials(credentials, awsCredentialFetcher) {
	    function makeMongoCredentialsFromAWSTemp(creds) {
	        // The AWS session token (creds.Token) may or may not be set.
	        if (!creds.AccessKeyId || !creds.SecretAccessKey) {
	            throw new error_1.MongoMissingCredentialsError('Could not obtain temporary MONGODB-AWS credentials');
	        }
	        return new mongo_credentials_1.MongoCredentials({
	            username: creds.AccessKeyId,
	            password: creds.SecretAccessKey,
	            source: credentials.source,
	            mechanism: providers_1.AuthMechanism.MONGODB_AWS,
	            mechanismProperties: {
	                AWS_SESSION_TOKEN: creds.Token
	            }
	        });
	    }
	    const temporaryCredentials = await awsCredentialFetcher.getCredentials();
	    return makeMongoCredentialsFromAWSTemp(temporaryCredentials);
	}
	function deriveRegion(host) {
	    const parts = host.split('.');
	    if (parts.length === 1 || parts[1] === 'amazonaws') {
	        return 'us-east-1';
	    }
	    return parts[1];
	}
	
	return mongodb_aws;
}

var mongodb_oidc = {};

var hasRequiredMongodb_oidc;

function requireMongodb_oidc () {
	if (hasRequiredMongodb_oidc) return mongodb_oidc;
	hasRequiredMongodb_oidc = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.MongoDBOIDC = exports.OIDC_WORKFLOWS = exports.OIDC_VERSION = void 0;
		const error_1 = mongodb4.requireError();
		const auth_provider_1 = requireAuth_provider();
		const automated_callback_workflow_1 = mongodb2.requireAutomated_callback_workflow();
		const azure_machine_workflow_1 = mongodb2.requireAzure_machine_workflow();
		const gcp_machine_workflow_1 = mongodb2.requireGcp_machine_workflow();
		const k8s_machine_workflow_1 = mongodb2.requireK8s_machine_workflow();
		const token_cache_1 = mongodb2.requireToken_cache();
		const token_machine_workflow_1 = mongodb2.requireToken_machine_workflow();
		/** Error when credentials are missing. */
		const MISSING_CREDENTIALS_ERROR = 'AuthContext must provide credentials.';
		/** The current version of OIDC implementation. */
		exports.OIDC_VERSION = 1;
		/** @internal */
		exports.OIDC_WORKFLOWS = new Map();
		exports.OIDC_WORKFLOWS.set('test', () => new automated_callback_workflow_1.AutomatedCallbackWorkflow(new token_cache_1.TokenCache(), token_machine_workflow_1.tokenMachineCallback));
		exports.OIDC_WORKFLOWS.set('azure', () => new automated_callback_workflow_1.AutomatedCallbackWorkflow(new token_cache_1.TokenCache(), azure_machine_workflow_1.azureCallback));
		exports.OIDC_WORKFLOWS.set('gcp', () => new automated_callback_workflow_1.AutomatedCallbackWorkflow(new token_cache_1.TokenCache(), gcp_machine_workflow_1.gcpCallback));
		exports.OIDC_WORKFLOWS.set('k8s', () => new automated_callback_workflow_1.AutomatedCallbackWorkflow(new token_cache_1.TokenCache(), k8s_machine_workflow_1.k8sCallback));
		/**
		 * OIDC auth provider.
		 */
		class MongoDBOIDC extends auth_provider_1.AuthProvider {
		    /**
		     * Instantiate the auth provider.
		     */
		    constructor(workflow) {
		        super();
		        if (!workflow) {
		            throw new error_1.MongoInvalidArgumentError('No workflow provided to the OIDC auth provider.');
		        }
		        this.workflow = workflow;
		    }
		    /**
		     * Authenticate using OIDC
		     */
		    async auth(authContext) {
		        const { connection, reauthenticating, response } = authContext;
		        if (response?.speculativeAuthenticate?.done && !reauthenticating) {
		            return;
		        }
		        const credentials = getCredentials(authContext);
		        if (reauthenticating) {
		            await this.workflow.reauthenticate(connection, credentials);
		        }
		        else {
		            await this.workflow.execute(connection, credentials, response);
		        }
		    }
		    /**
		     * Add the speculative auth for the initial handshake.
		     */
		    async prepare(handshakeDoc, authContext) {
		        const { connection } = authContext;
		        const credentials = getCredentials(authContext);
		        const result = await this.workflow.speculativeAuth(connection, credentials);
		        return { ...handshakeDoc, ...result };
		    }
		}
		exports.MongoDBOIDC = MongoDBOIDC;
		/**
		 * Get credentials from the auth context, throwing if they do not exist.
		 */
		function getCredentials(authContext) {
		    const { credentials } = authContext;
		    if (!credentials) {
		        throw new error_1.MongoMissingCredentialsError(MISSING_CREDENTIALS_ERROR);
		    }
		    return credentials;
		}
		
	} (mongodb_oidc));
	return mongodb_oidc;
}

var hasRequiredChange_stream;

function requireChange_stream () {
	if (hasRequiredChange_stream) return change_stream;
	hasRequiredChange_stream = 1;
	Object.defineProperty(change_stream, "__esModule", { value: true });
	change_stream.ChangeStream = void 0;
	change_stream.filterOutOptions = filterOutOptions;
	const collection_1 = mongodb3.requireCollection();
	const constants_1 = mongodb3.requireConstants();
	const abstract_cursor_1 = mongodb3.requireAbstract_cursor();
	const change_stream_cursor_1 = mongodb3.requireChange_stream_cursor();
	const db_1 = mongodb4.requireDb();
	const error_1 = mongodb4.requireError();
	const mongo_client_1 = mongodb4.requireMongo_client();
	const mongo_types_1 = mongodb5.requireMongo_types();
	const server_selection_1 = mongodb6.requireServer_selection();
	const timeout_1 = mongodb6.requireTimeout();
	const utils_1 = mongodb7.requireUtils();
	const CHANGE_DOMAIN_TYPES = {
	    COLLECTION: Symbol('Collection'),
	    DATABASE: Symbol('Database'),
	    CLUSTER: Symbol('Cluster')
	};
	const CHANGE_STREAM_EVENTS = [constants_1.RESUME_TOKEN_CHANGED, constants_1.END, constants_1.CLOSE];
	const NO_RESUME_TOKEN_ERROR = 'A change stream document has been received that lacks a resume token (_id).';
	const CHANGESTREAM_CLOSED_ERROR = 'ChangeStream is closed';
	const INVALID_STAGE_OPTIONS = buildDisallowedChangeStreamOptions();
	function filterOutOptions(options) {
	    return Object.fromEntries(Object.entries(options).filter(([k, _]) => !INVALID_STAGE_OPTIONS.has(k)));
	}
	/**
	 * Creates a new Change Stream instance. Normally created using {@link Collection#watch|Collection.watch()}.
	 * @public
	 */
	class ChangeStream extends mongo_types_1.TypedEventEmitter {
	    /**
	     * @experimental
	     * An alias for {@link ChangeStream.close|ChangeStream.close()}.
	     */
	    async [Symbol.asyncDispose]() {
	        await this.close();
	    }
	    /** @event */
	    static { this.RESPONSE = constants_1.RESPONSE; }
	    /** @event */
	    static { this.MORE = constants_1.MORE; }
	    /** @event */
	    static { this.INIT = constants_1.INIT; }
	    /** @event */
	    static { this.CLOSE = constants_1.CLOSE; }
	    /**
	     * Fired for each new matching change in the specified namespace. Attaching a `change`
	     * event listener to a Change Stream will switch the stream into flowing mode. Data will
	     * then be passed as soon as it is available.
	     * @event
	     */
	    static { this.CHANGE = constants_1.CHANGE; }
	    /** @event */
	    static { this.END = constants_1.END; }
	    /** @event */
	    static { this.ERROR = constants_1.ERROR; }
	    /**
	     * Emitted each time the change stream stores a new resume token.
	     * @event
	     */
	    static { this.RESUME_TOKEN_CHANGED = constants_1.RESUME_TOKEN_CHANGED; }
	    /**
	     * @internal
	     *
	     * @param parent - The parent object that created this change stream
	     * @param pipeline - An array of {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/|aggregation pipeline stages} through which to pass change stream documents
	     */
	    constructor(parent, pipeline = [], options = {}) {
	        super();
	        this.pipeline = pipeline;
	        this.options = { ...options };
	        let serverSelectionTimeoutMS;
	        delete this.options.writeConcern;
	        if (parent instanceof collection_1.Collection) {
	            this.type = CHANGE_DOMAIN_TYPES.COLLECTION;
	            serverSelectionTimeoutMS = parent.s.db.client.options.serverSelectionTimeoutMS;
	        }
	        else if (parent instanceof db_1.Db) {
	            this.type = CHANGE_DOMAIN_TYPES.DATABASE;
	            serverSelectionTimeoutMS = parent.client.options.serverSelectionTimeoutMS;
	        }
	        else if (parent instanceof mongo_client_1.MongoClient) {
	            this.type = CHANGE_DOMAIN_TYPES.CLUSTER;
	            serverSelectionTimeoutMS = parent.options.serverSelectionTimeoutMS;
	        }
	        else {
	            throw new error_1.MongoChangeStreamError('Parent provided to ChangeStream constructor must be an instance of Collection, Db, or MongoClient');
	        }
	        this.contextOwner = Symbol();
	        this.parent = parent;
	        this.namespace = parent.s.namespace;
	        if (!this.options.readPreference && parent.readPreference) {
	            this.options.readPreference = parent.readPreference;
	        }
	        // Create contained Change Stream cursor
	        this.cursor = this._createChangeStreamCursor(options);
	        this.isClosed = false;
	        this.mode = false;
	        // Listen for any `change` listeners being added to ChangeStream
	        this.on('newListener', eventName => {
	            if (eventName === 'change' && this.cursor && this.listenerCount('change') === 0) {
	                this._streamEvents(this.cursor);
	            }
	        });
	        this.on('removeListener', eventName => {
	            if (eventName === 'change' && this.listenerCount('change') === 0 && this.cursor) {
	                this.cursorStream?.removeAllListeners('data');
	            }
	        });
	        if (this.options.timeoutMS != null) {
	            this.timeoutContext = new timeout_1.CSOTTimeoutContext({
	                timeoutMS: this.options.timeoutMS,
	                serverSelectionTimeoutMS
	            });
	        }
	    }
	    /** The cached resume token that is used to resume after the most recently returned change. */
	    get resumeToken() {
	        return this.cursor?.resumeToken;
	    }
	    /** Returns the currently buffered documents length of the underlying cursor. */
	    bufferedCount() {
	        return this.cursor?.bufferedCount() ?? 0;
	    }
	    /** Check if there is any document still available in the Change Stream */
	    async hasNext() {
	        this._setIsIterator();
	        // Change streams must resume indefinitely while each resume event succeeds.
	        // This loop continues until either a change event is received or until a resume attempt
	        // fails.
	        this.timeoutContext?.refresh();
	        try {
	            while (true) {
	                try {
	                    const hasNext = await this.cursor.hasNext();
	                    return hasNext;
	                }
	                catch (error) {
	                    try {
	                        await this._processErrorIteratorMode(error, this.cursor.id != null);
	                    }
	                    catch (error) {
	                        if (error instanceof error_1.MongoOperationTimeoutError && this.cursor.id == null) {
	                            throw error;
	                        }
	                        try {
	                            await this.close();
	                        }
	                        catch (error) {
	                            (0, utils_1.squashError)(error);
	                        }
	                        throw error;
	                    }
	                }
	            }
	        }
	        finally {
	            this.timeoutContext?.clear();
	        }
	    }
	    /** Get the next available document from the Change Stream. */
	    async next() {
	        this._setIsIterator();
	        // Change streams must resume indefinitely while each resume event succeeds.
	        // This loop continues until either a change event is received or until a resume attempt
	        // fails.
	        this.timeoutContext?.refresh();
	        try {
	            while (true) {
	                try {
	                    const change = await this.cursor.next();
	                    const processedChange = this._processChange(change ?? null);
	                    return processedChange;
	                }
	                catch (error) {
	                    try {
	                        await this._processErrorIteratorMode(error, this.cursor.id != null);
	                    }
	                    catch (error) {
	                        if (error instanceof error_1.MongoOperationTimeoutError && this.cursor.id == null) {
	                            throw error;
	                        }
	                        try {
	                            await this.close();
	                        }
	                        catch (error) {
	                            (0, utils_1.squashError)(error);
	                        }
	                        throw error;
	                    }
	                }
	            }
	        }
	        finally {
	            this.timeoutContext?.clear();
	        }
	    }
	    /**
	     * Try to get the next available document from the Change Stream's cursor or `null` if an empty batch is returned
	     */
	    async tryNext() {
	        this._setIsIterator();
	        // Change streams must resume indefinitely while each resume event succeeds.
	        // This loop continues until either a change event is received or until a resume attempt
	        // fails.
	        this.timeoutContext?.refresh();
	        try {
	            while (true) {
	                try {
	                    const change = await this.cursor.tryNext();
	                    if (!change) {
	                        return null;
	                    }
	                    const processedChange = this._processChange(change);
	                    return processedChange;
	                }
	                catch (error) {
	                    try {
	                        await this._processErrorIteratorMode(error, this.cursor.id != null);
	                    }
	                    catch (error) {
	                        if (error instanceof error_1.MongoOperationTimeoutError && this.cursor.id == null)
	                            throw error;
	                        try {
	                            await this.close();
	                        }
	                        catch (error) {
	                            (0, utils_1.squashError)(error);
	                        }
	                        throw error;
	                    }
	                }
	            }
	        }
	        finally {
	            this.timeoutContext?.clear();
	        }
	    }
	    async *[Symbol.asyncIterator]() {
	        if (this.closed) {
	            return;
	        }
	        try {
	            // Change streams run indefinitely as long as errors are resumable
	            // So the only loop breaking condition is if `next()` throws
	            while (true) {
	                yield await this.next();
	            }
	        }
	        finally {
	            try {
	                await this.close();
	            }
	            catch (error) {
	                (0, utils_1.squashError)(error);
	            }
	        }
	    }
	    /** Is the cursor closed */
	    get closed() {
	        return this.isClosed || this.cursor.closed;
	    }
	    /**
	     * Frees the internal resources used by the change stream.
	     */
	    async close() {
	        this.timeoutContext?.clear();
	        this.timeoutContext = undefined;
	        this.isClosed = true;
	        const cursor = this.cursor;
	        try {
	            await cursor.close();
	        }
	        finally {
	            this._endStream();
	        }
	    }
	    /**
	     * Return a modified Readable stream including a possible transform method.
	     *
	     * NOTE: When using a Stream to process change stream events, the stream will
	     * NOT automatically resume in the case a resumable error is encountered.
	     *
	     * @throws MongoChangeStreamError if the underlying cursor or the change stream is closed
	     */
	    stream() {
	        if (this.closed) {
	            throw new error_1.MongoChangeStreamError(CHANGESTREAM_CLOSED_ERROR);
	        }
	        return this.cursor.stream();
	    }
	    /** @internal */
	    _setIsEmitter() {
	        if (this.mode === 'iterator') {
	            // TODO(NODE-3485): Replace with MongoChangeStreamModeError
	            throw new error_1.MongoAPIError('ChangeStream cannot be used as an EventEmitter after being used as an iterator');
	        }
	        this.mode = 'emitter';
	    }
	    /** @internal */
	    _setIsIterator() {
	        if (this.mode === 'emitter') {
	            // TODO(NODE-3485): Replace with MongoChangeStreamModeError
	            throw new error_1.MongoAPIError('ChangeStream cannot be used as an iterator after being used as an EventEmitter');
	        }
	        this.mode = 'iterator';
	    }
	    /**
	     * Create a new change stream cursor based on self's configuration
	     * @internal
	     */
	    _createChangeStreamCursor(options) {
	        const changeStreamStageOptions = filterOutOptions(options);
	        if (this.type === CHANGE_DOMAIN_TYPES.CLUSTER) {
	            changeStreamStageOptions.allChangesForCluster = true;
	        }
	        const pipeline = [{ $changeStream: changeStreamStageOptions }, ...this.pipeline];
	        const client = this.type === CHANGE_DOMAIN_TYPES.CLUSTER
	            ? this.parent
	            : this.type === CHANGE_DOMAIN_TYPES.DATABASE
	                ? this.parent.client
	                : this.type === CHANGE_DOMAIN_TYPES.COLLECTION
	                    ? this.parent.client
	                    : null;
	        if (client == null) {
	            // This should never happen because of the assertion in the constructor
	            throw new error_1.MongoRuntimeError(`Changestream type should only be one of cluster, database, collection. Found ${this.type.toString()}`);
	        }
	        const changeStreamCursor = new change_stream_cursor_1.ChangeStreamCursor(client, this.namespace, pipeline, {
	            ...options,
	            timeoutContext: this.timeoutContext
	                ? new abstract_cursor_1.CursorTimeoutContext(this.timeoutContext, this.contextOwner)
	                : undefined
	        });
	        for (const event of CHANGE_STREAM_EVENTS) {
	            changeStreamCursor.on(event, e => this.emit(event, e));
	        }
	        if (this.listenerCount(ChangeStream.CHANGE) > 0) {
	            this._streamEvents(changeStreamCursor);
	        }
	        return changeStreamCursor;
	    }
	    /** @internal */
	    _closeEmitterModeWithError(error) {
	        this.emit(ChangeStream.ERROR, error);
	        this.close().then(undefined, utils_1.squashError);
	    }
	    /** @internal */
	    _streamEvents(cursor) {
	        this._setIsEmitter();
	        const stream = this.cursorStream ?? cursor.stream();
	        this.cursorStream = stream;
	        stream.on('data', change => {
	            try {
	                const processedChange = this._processChange(change);
	                this.emit(ChangeStream.CHANGE, processedChange);
	            }
	            catch (error) {
	                this.emit(ChangeStream.ERROR, error);
	            }
	            this.timeoutContext?.refresh();
	        });
	        stream.on('error', error => this._processErrorStreamMode(error, this.cursor.id != null));
	    }
	    /** @internal */
	    _endStream() {
	        this.cursorStream?.removeAllListeners('data');
	        this.cursorStream?.removeAllListeners('close');
	        this.cursorStream?.removeAllListeners('end');
	        this.cursorStream?.destroy();
	        this.cursorStream = undefined;
	    }
	    /** @internal */
	    _processChange(change) {
	        if (this.isClosed) {
	            // TODO(NODE-3485): Replace with MongoChangeStreamClosedError
	            throw new error_1.MongoAPIError(CHANGESTREAM_CLOSED_ERROR);
	        }
	        // a null change means the cursor has been notified, implicitly closing the change stream
	        if (change == null) {
	            // TODO(NODE-3485): Replace with MongoChangeStreamClosedError
	            throw new error_1.MongoRuntimeError(CHANGESTREAM_CLOSED_ERROR);
	        }
	        if (change && !change._id) {
	            throw new error_1.MongoChangeStreamError(NO_RESUME_TOKEN_ERROR);
	        }
	        // cache the resume token
	        this.cursor.cacheResumeToken(change._id);
	        // wipe the startAtOperationTime if there was one so that there won't be a conflict
	        // between resumeToken and startAtOperationTime if we need to reconnect the cursor
	        this.options.startAtOperationTime = undefined;
	        return change;
	    }
	    /** @internal */
	    _processErrorStreamMode(changeStreamError, cursorInitialized) {
	        // If the change stream has been closed explicitly, do not process error.
	        if (this.isClosed)
	            return;
	        if (cursorInitialized &&
	            ((0, error_1.isResumableError)(changeStreamError, this.cursor.maxWireVersion) ||
	                changeStreamError instanceof error_1.MongoOperationTimeoutError)) {
	            this._endStream();
	            this.cursor
	                .close()
	                .then(() => this._resume(changeStreamError), e => {
	                (0, utils_1.squashError)(e);
	                return this._resume(changeStreamError);
	            })
	                .then(() => {
	                if (changeStreamError instanceof error_1.MongoOperationTimeoutError)
	                    this.emit(ChangeStream.ERROR, changeStreamError);
	            }, () => this._closeEmitterModeWithError(changeStreamError));
	        }
	        else {
	            this._closeEmitterModeWithError(changeStreamError);
	        }
	    }
	    /** @internal */
	    async _processErrorIteratorMode(changeStreamError, cursorInitialized) {
	        if (this.isClosed) {
	            // TODO(NODE-3485): Replace with MongoChangeStreamClosedError
	            throw new error_1.MongoAPIError(CHANGESTREAM_CLOSED_ERROR);
	        }
	        if (cursorInitialized &&
	            ((0, error_1.isResumableError)(changeStreamError, this.cursor.maxWireVersion) ||
	                changeStreamError instanceof error_1.MongoOperationTimeoutError)) {
	            try {
	                await this.cursor.close();
	            }
	            catch (error) {
	                (0, utils_1.squashError)(error);
	            }
	            await this._resume(changeStreamError);
	            if (changeStreamError instanceof error_1.MongoOperationTimeoutError)
	                throw changeStreamError;
	        }
	        else {
	            try {
	                await this.close();
	            }
	            catch (error) {
	                (0, utils_1.squashError)(error);
	            }
	            throw changeStreamError;
	        }
	    }
	    async _resume(changeStreamError) {
	        this.timeoutContext?.refresh();
	        const topology = (0, utils_1.getTopology)(this.parent);
	        try {
	            await topology.selectServer(this.cursor.readPreference, {
	                operationName: 'reconnect topology in change stream',
	                timeoutContext: this.timeoutContext,
	                deprioritizedServers: new server_selection_1.DeprioritizedServers()
	            });
	            this.cursor = this._createChangeStreamCursor(this.cursor.resumeOptions);
	        }
	        catch {
	            // if the topology can't reconnect, close the stream
	            await this.close();
	            throw changeStreamError;
	        }
	    }
	}
	change_stream.ChangeStream = ChangeStream;
	/**
	 * This function returns a list of options that are *not* supported by the $changeStream
	 * aggregation stage.  This is best-effort - it uses the options "officially supported" by the driver
	 * to derive a list of known, unsupported options for the $changeStream stage.
	 *
	 * Notably, at runtime, users can still provide options unknown to the driver and the driver will
	 * *not* filter them out of the options object (see NODE-5510).
	 */
	function buildDisallowedChangeStreamOptions() {
	    const denyList = {
	        allowDiskUse: '',
	        authdb: '',
	        batchSize: '',
	        bsonRegExp: '',
	        bypassDocumentValidation: '',
	        bypassPinningCheck: '',
	        checkKeys: '',
	        collation: '',
	        comment: '',
	        cursor: '',
	        dbName: '',
	        enableUtf8Validation: '',
	        explain: '',
	        fieldsAsRaw: '',
	        hint: '',
	        ignoreUndefined: '',
	        let: '',
	        maxAwaitTimeMS: '',
	        maxTimeMS: '',
	        omitMaxTimeMS: '',
	        out: '',
	        promoteBuffers: '',
	        promoteLongs: '',
	        promoteValues: '',
	        raw: '',
	        rawData: '',
	        readConcern: '',
	        readPreference: '',
	        serializeFunctions: '',
	        session: '',
	        timeoutContext: '',
	        timeoutMS: '',
	        timeoutMode: '',
	        useBigInt64: '',
	        willRetryWrite: '',
	        writeConcern: ''
	    };
	    return new Set(Object.keys(denyList));
	}
	
	return change_stream;
}

exports.requireAdmin = requireAdmin;
exports.requireAuth_provider = requireAuth_provider;
exports.requireAuto_encrypter = requireAuto_encrypter;
exports.requireAzure = requireAzure;
exports.requireBson = requireBson;
exports.requireChange_stream = requireChange_stream;
exports.requireClient_encryption = requireClient_encryption;
exports.requireCommon = requireCommon;
exports.requireErrors = requireErrors;
exports.requireGssapi = requireGssapi;
exports.requireMongo_credentials = requireMongo_credentials;
exports.requireMongodb_aws = requireMongodb_aws;
exports.requireMongodb_oidc = requireMongodb_oidc;
exports.requireOrdered = requireOrdered;
exports.requireUnordered = requireUnordered;
