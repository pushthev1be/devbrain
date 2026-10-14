'use strict';

require('./zod-to-json-schema-1.js');
const zod1 = require('./zod-1.js');
const modelcontextprotocolSdk2 = require('./modelcontextprotocol-sdk-2.js');
const process = require('node:process');
const honoNodeServer1 = require('./hono-node-server-1.js');

// zod-compat.ts
// ----------------------------------------------------
// Unified types + helpers to accept Zod v3 and v4 (Mini)
// ----------------------------------------------------
// --- Runtime detection ---
function isZ4Schema(s) {
    // Present on Zod 4 (Classic & Mini) schemas; absent on Zod 3
    const schema = s;
    return !!schema._zod;
}
// --- Unified parsing ---
function safeParse(schema, data) {
    if (isZ4Schema(schema)) {
        // Mini exposes top-level safeParse
        const result = zod1.safeParse(schema, data);
        return result;
    }
    const v3Schema = schema;
    const result = v3Schema.safeParse(data);
    return result;
}
// --- Shape extraction ---
function getObjectShape(schema) {
    if (!schema)
        return undefined;
    // Zod v3 exposes `.shape`; Zod v4 keeps the shape on `_zod.def.shape`
    let rawShape;
    if (isZ4Schema(schema)) {
        const v4Schema = schema;
        rawShape = v4Schema._zod?.def?.shape;
    }
    else {
        const v3Schema = schema;
        rawShape = v3Schema.shape;
    }
    if (!rawShape)
        return undefined;
    if (typeof rawShape === 'function') {
        try {
            return rawShape();
        }
        catch {
            return undefined;
        }
    }
    return rawShape;
}
/**
 * Gets the literal value from a schema, if it's a literal schema.
 * Works with both Zod v3 and v4.
 * Returns undefined if the schema is not a literal or the value cannot be determined.
 */
function getLiteralValue(schema) {
    if (isZ4Schema(schema)) {
        const v4Schema = schema;
        const def = v4Schema._zod?.def;
        if (def) {
            // Try various ways to get the literal value
            if (def.value !== undefined)
                return def.value;
            if (Array.isArray(def.values) && def.values.length > 0) {
                return def.values[0];
            }
        }
    }
    const v3Schema = schema;
    const def = v3Schema._def;
    if (def) {
        if (def.value !== undefined)
            return def.value;
        if (Array.isArray(def.values) && def.values.length > 0) {
            return def.values[0];
        }
    }
    // Fallback: check for direct value property (some Zod versions)
    const directValue = schema.value;
    if (directValue !== undefined)
        return directValue;
    return undefined;
}

/**
 * Experimental task interfaces for MCP SDK.
 * WARNING: These APIs are experimental and may change without notice.
 */
/**
 * Checks if a task status represents a terminal state.
 * Terminal states are those where the task has finished and will not change.
 *
 * @param status - The task status to check
 * @returns True if the status is terminal (completed, failed, or cancelled)
 * @experimental
 */
function isTerminal(status) {
    return status === 'completed' || status === 'failed' || status === 'cancelled';
}

// zod-json-schema-compat.ts
// ----------------------------------------------------
// JSON Schema conversion for both Zod v3 and Zod v4 (Mini)
// v3 uses your vendored converter; v4 uses Mini's toJSONSchema
// ----------------------------------------------------
function getMethodLiteral(schema) {
    const shape = getObjectShape(schema);
    const methodSchema = shape?.method;
    if (!methodSchema) {
        throw new Error('Schema is missing a method literal');
    }
    const value = getLiteralValue(methodSchema);
    if (typeof value !== 'string') {
        throw new Error('Schema method literal must be a string');
    }
    return value;
}
function parseWithCompat(schema, data) {
    const result = safeParse(schema, data);
    if (!result.success) {
        throw result.error;
    }
    return result.data;
}

/**
 * The default request timeout, in miliseconds.
 */
const DEFAULT_REQUEST_TIMEOUT_MSEC = 60000;
/**
 * Implements MCP protocol framing on top of a pluggable transport, including
 * features like request/response linking, notifications, and progress.
 */
class Protocol {
    constructor(_options) {
        this._options = _options;
        this._requestMessageId = 0;
        this._requestHandlers = new Map();
        this._requestHandlerAbortControllers = new Map();
        this._notificationHandlers = new Map();
        this._responseHandlers = new Map();
        this._progressHandlers = new Map();
        this._timeoutInfo = new Map();
        this._pendingDebouncedNotifications = new Set();
        // Maps task IDs to progress tokens to keep handlers alive after CreateTaskResult
        this._taskProgressTokens = new Map();
        this._requestResolvers = new Map();
        this.setNotificationHandler(modelcontextprotocolSdk2.CancelledNotificationSchema, notification => {
            this._oncancel(notification);
        });
        this.setNotificationHandler(modelcontextprotocolSdk2.ProgressNotificationSchema, notification => {
            this._onprogress(notification);
        });
        this.setRequestHandler(modelcontextprotocolSdk2.PingRequestSchema, 
        // Automatic pong by default.
        _request => ({}));
        // Install task handlers if TaskStore is provided
        this._taskStore = _options?.taskStore;
        this._taskMessageQueue = _options?.taskMessageQueue;
        if (this._taskStore) {
            this.setRequestHandler(modelcontextprotocolSdk2.GetTaskRequestSchema, async (request, extra) => {
                const task = await this._taskStore.getTask(request.params.taskId, extra.sessionId);
                if (!task) {
                    throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InvalidParams, 'Failed to retrieve task: Task not found');
                }
                // Per spec: tasks/get responses SHALL NOT include related-task metadata
                // as the taskId parameter is the source of truth
                // @ts-expect-error SendResultT cannot contain GetTaskResult, but we include it in our derived types everywhere else
                return {
                    ...task
                };
            });
            this.setRequestHandler(modelcontextprotocolSdk2.GetTaskPayloadRequestSchema, async (request, extra) => {
                const handleTaskResult = async () => {
                    const taskId = request.params.taskId;
                    // Deliver queued messages
                    if (this._taskMessageQueue) {
                        let queuedMessage;
                        while ((queuedMessage = await this._taskMessageQueue.dequeue(taskId, extra.sessionId))) {
                            // Handle response and error messages by routing them to the appropriate resolver
                            if (queuedMessage.type === 'response' || queuedMessage.type === 'error') {
                                const message = queuedMessage.message;
                                const requestId = message.id;
                                // Lookup resolver in _requestResolvers map
                                const resolver = this._requestResolvers.get(requestId);
                                if (resolver) {
                                    // Remove resolver from map after invocation
                                    this._requestResolvers.delete(requestId);
                                    // Invoke resolver with response or error
                                    if (queuedMessage.type === 'response') {
                                        resolver(message);
                                    }
                                    else {
                                        // Convert JSONRPCError to McpError
                                        const errorMessage = message;
                                        const error = new modelcontextprotocolSdk2.McpError(errorMessage.error.code, errorMessage.error.message, errorMessage.error.data);
                                        resolver(error);
                                    }
                                }
                                else {
                                    // Handle missing resolver gracefully with error logging
                                    const messageType = queuedMessage.type === 'response' ? 'Response' : 'Error';
                                    this._onerror(new Error(`${messageType} handler missing for request ${requestId}`));
                                }
                                // Continue to next message
                                continue;
                            }
                            // Send the message on the response stream by passing the relatedRequestId
                            // This tells the transport to write the message to the tasks/result response stream
                            await this._transport?.send(queuedMessage.message, { relatedRequestId: extra.requestId });
                        }
                    }
                    // Now check task status
                    const task = await this._taskStore.getTask(taskId, extra.sessionId);
                    if (!task) {
                        throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InvalidParams, `Task not found: ${taskId}`);
                    }
                    // Block if task is not terminal (we've already delivered all queued messages above)
                    if (!isTerminal(task.status)) {
                        // Wait for status change or new messages
                        await this._waitForTaskUpdate(taskId, extra.signal);
                        // After waking up, recursively call to deliver any new messages or result
                        return await handleTaskResult();
                    }
                    // If task is terminal, return the result
                    if (isTerminal(task.status)) {
                        const result = await this._taskStore.getTaskResult(taskId, extra.sessionId);
                        this._clearTaskQueue(taskId);
                        return {
                            ...result,
                            _meta: {
                                ...result._meta,
                                [modelcontextprotocolSdk2.RELATED_TASK_META_KEY]: {
                                    taskId: taskId
                                }
                            }
                        };
                    }
                    return await handleTaskResult();
                };
                return await handleTaskResult();
            });
            this.setRequestHandler(modelcontextprotocolSdk2.ListTasksRequestSchema, async (request, extra) => {
                try {
                    const { tasks, nextCursor } = await this._taskStore.listTasks(request.params?.cursor, extra.sessionId);
                    // @ts-expect-error SendResultT cannot contain ListTasksResult, but we include it in our derived types everywhere else
                    return {
                        tasks,
                        nextCursor,
                        _meta: {}
                    };
                }
                catch (error) {
                    throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InvalidParams, `Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`);
                }
            });
            this.setRequestHandler(modelcontextprotocolSdk2.CancelTaskRequestSchema, async (request, extra) => {
                try {
                    // Get the current task to check if it's in a terminal state, in case the implementation is not atomic
                    const task = await this._taskStore.getTask(request.params.taskId, extra.sessionId);
                    if (!task) {
                        throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InvalidParams, `Task not found: ${request.params.taskId}`);
                    }
                    // Reject cancellation of terminal tasks
                    if (isTerminal(task.status)) {
                        throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InvalidParams, `Cannot cancel task in terminal status: ${task.status}`);
                    }
                    await this._taskStore.updateTaskStatus(request.params.taskId, 'cancelled', 'Client cancelled task execution.', extra.sessionId);
                    this._clearTaskQueue(request.params.taskId);
                    const cancelledTask = await this._taskStore.getTask(request.params.taskId, extra.sessionId);
                    if (!cancelledTask) {
                        // Task was deleted during cancellation (e.g., cleanup happened)
                        throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InvalidParams, `Task not found after cancellation: ${request.params.taskId}`);
                    }
                    return {
                        _meta: {},
                        ...cancelledTask
                    };
                }
                catch (error) {
                    // Re-throw McpError as-is
                    if (error instanceof modelcontextprotocolSdk2.McpError) {
                        throw error;
                    }
                    throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InvalidRequest, `Failed to cancel task: ${error instanceof Error ? error.message : String(error)}`);
                }
            });
        }
    }
    async _oncancel(notification) {
        if (!notification.params.requestId) {
            return;
        }
        // Handle request cancellation
        const controller = this._requestHandlerAbortControllers.get(notification.params.requestId);
        controller?.abort(notification.params.reason);
    }
    _setupTimeout(messageId, timeout, maxTotalTimeout, onTimeout, resetTimeoutOnProgress = false) {
        this._timeoutInfo.set(messageId, {
            timeoutId: setTimeout(onTimeout, timeout),
            startTime: Date.now(),
            timeout,
            maxTotalTimeout,
            resetTimeoutOnProgress,
            onTimeout
        });
    }
    _resetTimeout(messageId) {
        const info = this._timeoutInfo.get(messageId);
        if (!info)
            return false;
        const totalElapsed = Date.now() - info.startTime;
        if (info.maxTotalTimeout && totalElapsed >= info.maxTotalTimeout) {
            this._timeoutInfo.delete(messageId);
            throw modelcontextprotocolSdk2.McpError.fromError(modelcontextprotocolSdk2.ErrorCode.RequestTimeout, 'Maximum total timeout exceeded', {
                maxTotalTimeout: info.maxTotalTimeout,
                totalElapsed
            });
        }
        clearTimeout(info.timeoutId);
        info.timeoutId = setTimeout(info.onTimeout, info.timeout);
        return true;
    }
    _cleanupTimeout(messageId) {
        const info = this._timeoutInfo.get(messageId);
        if (info) {
            clearTimeout(info.timeoutId);
            this._timeoutInfo.delete(messageId);
        }
    }
    /**
     * Attaches to the given transport, starts it, and starts listening for messages.
     *
     * The Protocol object assumes ownership of the Transport, replacing any callbacks that have already been set, and expects that it is the only user of the Transport instance going forward.
     */
    async connect(transport) {
        if (this._transport) {
            throw new Error('Already connected to a transport. Call close() before connecting to a new transport, or use a separate Protocol instance per connection.');
        }
        this._transport = transport;
        const _onclose = this.transport?.onclose;
        this._transport.onclose = () => {
            _onclose?.();
            this._onclose();
        };
        const _onerror = this.transport?.onerror;
        this._transport.onerror = (error) => {
            _onerror?.(error);
            this._onerror(error);
        };
        const _onmessage = this._transport?.onmessage;
        this._transport.onmessage = (message, extra) => {
            _onmessage?.(message, extra);
            if (modelcontextprotocolSdk2.isJSONRPCResultResponse(message) || modelcontextprotocolSdk2.isJSONRPCErrorResponse(message)) {
                this._onresponse(message);
            }
            else if (modelcontextprotocolSdk2.isJSONRPCRequest(message)) {
                this._onrequest(message, extra);
            }
            else if (modelcontextprotocolSdk2.isJSONRPCNotification(message)) {
                this._onnotification(message);
            }
            else {
                this._onerror(new Error(`Unknown message type: ${JSON.stringify(message)}`));
            }
        };
        await this._transport.start();
    }
    _onclose() {
        const responseHandlers = this._responseHandlers;
        this._responseHandlers = new Map();
        this._progressHandlers.clear();
        this._taskProgressTokens.clear();
        this._pendingDebouncedNotifications.clear();
        for (const info of this._timeoutInfo.values()) {
            clearTimeout(info.timeoutId);
        }
        this._timeoutInfo.clear();
        // Abort all in-flight request handlers so they stop sending messages
        for (const controller of this._requestHandlerAbortControllers.values()) {
            controller.abort();
        }
        this._requestHandlerAbortControllers.clear();
        const error = modelcontextprotocolSdk2.McpError.fromError(modelcontextprotocolSdk2.ErrorCode.ConnectionClosed, 'Connection closed');
        this._transport = undefined;
        this.onclose?.();
        for (const handler of responseHandlers.values()) {
            handler(error);
        }
    }
    _onerror(error) {
        this.onerror?.(error);
    }
    _onnotification(notification) {
        const handler = this._notificationHandlers.get(notification.method) ?? this.fallbackNotificationHandler;
        // Ignore notifications not being subscribed to.
        if (handler === undefined) {
            return;
        }
        // Starting with Promise.resolve() puts any synchronous errors into the monad as well.
        Promise.resolve()
            .then(() => handler(notification))
            .catch(error => this._onerror(new Error(`Uncaught error in notification handler: ${error}`)));
    }
    _onrequest(request, extra) {
        const handler = this._requestHandlers.get(request.method) ?? this.fallbackRequestHandler;
        // Capture the current transport at request time to ensure responses go to the correct client
        const capturedTransport = this._transport;
        // Extract taskId from request metadata if present (needed early for method not found case)
        const relatedTaskId = request.params?._meta?.[modelcontextprotocolSdk2.RELATED_TASK_META_KEY]?.taskId;
        if (handler === undefined) {
            const errorResponse = {
                jsonrpc: '2.0',
                id: request.id,
                error: {
                    code: modelcontextprotocolSdk2.ErrorCode.MethodNotFound,
                    message: 'Method not found'
                }
            };
            // Queue or send the error response based on whether this is a task-related request
            if (relatedTaskId && this._taskMessageQueue) {
                this._enqueueTaskMessage(relatedTaskId, {
                    type: 'error',
                    message: errorResponse,
                    timestamp: Date.now()
                }, capturedTransport?.sessionId).catch(error => this._onerror(new Error(`Failed to enqueue error response: ${error}`)));
            }
            else {
                capturedTransport
                    ?.send(errorResponse)
                    .catch(error => this._onerror(new Error(`Failed to send an error response: ${error}`)));
            }
            return;
        }
        const abortController = new AbortController();
        this._requestHandlerAbortControllers.set(request.id, abortController);
        const taskCreationParams = modelcontextprotocolSdk2.isTaskAugmentedRequestParams(request.params) ? request.params.task : undefined;
        const taskStore = this._taskStore ? this.requestTaskStore(request, capturedTransport?.sessionId) : undefined;
        const fullExtra = {
            signal: abortController.signal,
            sessionId: capturedTransport?.sessionId,
            _meta: request.params?._meta,
            sendNotification: async (notification) => {
                if (abortController.signal.aborted)
                    return;
                // Include related-task metadata if this request is part of a task
                const notificationOptions = { relatedRequestId: request.id };
                if (relatedTaskId) {
                    notificationOptions.relatedTask = { taskId: relatedTaskId };
                }
                await this.notification(notification, notificationOptions);
            },
            sendRequest: async (r, resultSchema, options) => {
                if (abortController.signal.aborted) {
                    throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.ConnectionClosed, 'Request was cancelled');
                }
                // Include related-task metadata if this request is part of a task
                const requestOptions = { ...options, relatedRequestId: request.id };
                if (relatedTaskId && !requestOptions.relatedTask) {
                    requestOptions.relatedTask = { taskId: relatedTaskId };
                }
                // Set task status to input_required when sending a request within a task context
                // Use the taskId from options (explicit) or fall back to relatedTaskId (inherited)
                const effectiveTaskId = requestOptions.relatedTask?.taskId ?? relatedTaskId;
                if (effectiveTaskId && taskStore) {
                    await taskStore.updateTaskStatus(effectiveTaskId, 'input_required');
                }
                return await this.request(r, resultSchema, requestOptions);
            },
            authInfo: extra?.authInfo,
            requestId: request.id,
            requestInfo: extra?.requestInfo,
            taskId: relatedTaskId,
            taskStore: taskStore,
            taskRequestedTtl: taskCreationParams?.ttl,
            closeSSEStream: extra?.closeSSEStream,
            closeStandaloneSSEStream: extra?.closeStandaloneSSEStream
        };
        // Starting with Promise.resolve() puts any synchronous errors into the monad as well.
        Promise.resolve()
            .then(() => {
            // If this request asked for task creation, check capability first
            if (taskCreationParams) {
                // Check if the request method supports task creation
                this.assertTaskHandlerCapability(request.method);
            }
        })
            .then(() => handler(request, fullExtra))
            .then(async (result) => {
            if (abortController.signal.aborted) {
                // Request was cancelled
                return;
            }
            const response = {
                result,
                jsonrpc: '2.0',
                id: request.id
            };
            // Queue or send the response based on whether this is a task-related request
            if (relatedTaskId && this._taskMessageQueue) {
                await this._enqueueTaskMessage(relatedTaskId, {
                    type: 'response',
                    message: response,
                    timestamp: Date.now()
                }, capturedTransport?.sessionId);
            }
            else {
                await capturedTransport?.send(response);
            }
        }, async (error) => {
            if (abortController.signal.aborted) {
                // Request was cancelled
                return;
            }
            const errorResponse = {
                jsonrpc: '2.0',
                id: request.id,
                error: {
                    code: Number.isSafeInteger(error['code']) ? error['code'] : modelcontextprotocolSdk2.ErrorCode.InternalError,
                    message: error.message ?? 'Internal error',
                    ...(error['data'] !== undefined && { data: error['data'] })
                }
            };
            // Queue or send the error response based on whether this is a task-related request
            if (relatedTaskId && this._taskMessageQueue) {
                await this._enqueueTaskMessage(relatedTaskId, {
                    type: 'error',
                    message: errorResponse,
                    timestamp: Date.now()
                }, capturedTransport?.sessionId);
            }
            else {
                await capturedTransport?.send(errorResponse);
            }
        })
            .catch(error => this._onerror(new Error(`Failed to send response: ${error}`)))
            .finally(() => {
            // Only delete if the stored controller is still ours; after close()+connect(),
            // a new connection may have reused the same request ID with a different controller.
            if (this._requestHandlerAbortControllers.get(request.id) === abortController) {
                this._requestHandlerAbortControllers.delete(request.id);
            }
        });
    }
    _onprogress(notification) {
        const { progressToken, ...params } = notification.params;
        const messageId = Number(progressToken);
        const handler = this._progressHandlers.get(messageId);
        if (!handler) {
            this._onerror(new Error(`Received a progress notification for an unknown token: ${JSON.stringify(notification)}`));
            return;
        }
        const responseHandler = this._responseHandlers.get(messageId);
        const timeoutInfo = this._timeoutInfo.get(messageId);
        if (timeoutInfo && responseHandler && timeoutInfo.resetTimeoutOnProgress) {
            try {
                this._resetTimeout(messageId);
            }
            catch (error) {
                // Clean up if maxTotalTimeout was exceeded
                this._responseHandlers.delete(messageId);
                this._progressHandlers.delete(messageId);
                this._cleanupTimeout(messageId);
                responseHandler(error);
                return;
            }
        }
        handler(params);
    }
    _onresponse(response) {
        const messageId = Number(response.id);
        // Check if this is a response to a queued request
        const resolver = this._requestResolvers.get(messageId);
        if (resolver) {
            this._requestResolvers.delete(messageId);
            if (modelcontextprotocolSdk2.isJSONRPCResultResponse(response)) {
                resolver(response);
            }
            else {
                const error = new modelcontextprotocolSdk2.McpError(response.error.code, response.error.message, response.error.data);
                resolver(error);
            }
            return;
        }
        const handler = this._responseHandlers.get(messageId);
        if (handler === undefined) {
            this._onerror(new Error(`Received a response for an unknown message ID: ${JSON.stringify(response)}`));
            return;
        }
        this._responseHandlers.delete(messageId);
        this._cleanupTimeout(messageId);
        // Keep progress handler alive for CreateTaskResult responses
        let isTaskResponse = false;
        if (modelcontextprotocolSdk2.isJSONRPCResultResponse(response) && response.result && typeof response.result === 'object') {
            const result = response.result;
            if (result.task && typeof result.task === 'object') {
                const task = result.task;
                if (typeof task.taskId === 'string') {
                    isTaskResponse = true;
                    this._taskProgressTokens.set(task.taskId, messageId);
                }
            }
        }
        if (!isTaskResponse) {
            this._progressHandlers.delete(messageId);
        }
        if (modelcontextprotocolSdk2.isJSONRPCResultResponse(response)) {
            handler(response);
        }
        else {
            const error = modelcontextprotocolSdk2.McpError.fromError(response.error.code, response.error.message, response.error.data);
            handler(error);
        }
    }
    get transport() {
        return this._transport;
    }
    /**
     * Closes the connection.
     */
    async close() {
        await this._transport?.close();
    }
    /**
     * Sends a request and returns an AsyncGenerator that yields response messages.
     * The generator is guaranteed to end with either a 'result' or 'error' message.
     *
     * @example
     * ```typescript
     * const stream = protocol.requestStream(request, resultSchema, options);
     * for await (const message of stream) {
     *   switch (message.type) {
     *     case 'taskCreated':
     *       console.log('Task created:', message.task.taskId);
     *       break;
     *     case 'taskStatus':
     *       console.log('Task status:', message.task.status);
     *       break;
     *     case 'result':
     *       console.log('Final result:', message.result);
     *       break;
     *     case 'error':
     *       console.error('Error:', message.error);
     *       break;
     *   }
     * }
     * ```
     *
     * @experimental Use `client.experimental.tasks.requestStream()` to access this method.
     */
    async *requestStream(request, resultSchema, options) {
        const { task } = options ?? {};
        // For non-task requests, just yield the result
        if (!task) {
            try {
                const result = await this.request(request, resultSchema, options);
                yield { type: 'result', result };
            }
            catch (error) {
                yield {
                    type: 'error',
                    error: error instanceof modelcontextprotocolSdk2.McpError ? error : new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InternalError, String(error))
                };
            }
            return;
        }
        // For task-augmented requests, we need to poll for status
        // First, make the request to create the task
        let taskId;
        try {
            // Send the request and get the CreateTaskResult
            const createResult = await this.request(request, modelcontextprotocolSdk2.CreateTaskResultSchema, options);
            // Extract taskId from the result
            if (createResult.task) {
                taskId = createResult.task.taskId;
                yield { type: 'taskCreated', task: createResult.task };
            }
            else {
                throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InternalError, 'Task creation did not return a task');
            }
            // Poll for task completion
            while (true) {
                // Get current task status
                const task = await this.getTask({ taskId }, options);
                yield { type: 'taskStatus', task };
                // Check if task is terminal
                if (isTerminal(task.status)) {
                    if (task.status === 'completed') {
                        // Get the final result
                        const result = await this.getTaskResult({ taskId }, resultSchema, options);
                        yield { type: 'result', result };
                    }
                    else if (task.status === 'failed') {
                        yield {
                            type: 'error',
                            error: new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InternalError, `Task ${taskId} failed`)
                        };
                    }
                    else if (task.status === 'cancelled') {
                        yield {
                            type: 'error',
                            error: new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InternalError, `Task ${taskId} was cancelled`)
                        };
                    }
                    return;
                }
                // When input_required, call tasks/result to deliver queued messages
                // (elicitation, sampling) via SSE and block until terminal
                if (task.status === 'input_required') {
                    const result = await this.getTaskResult({ taskId }, resultSchema, options);
                    yield { type: 'result', result };
                    return;
                }
                // Wait before polling again
                const pollInterval = task.pollInterval ?? this._options?.defaultTaskPollInterval ?? 1000;
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                // Check if cancelled
                options?.signal?.throwIfAborted();
            }
        }
        catch (error) {
            yield {
                type: 'error',
                error: error instanceof modelcontextprotocolSdk2.McpError ? error : new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InternalError, String(error))
            };
        }
    }
    /**
     * Sends a request and waits for a response.
     *
     * Do not use this method to emit notifications! Use notification() instead.
     */
    request(request, resultSchema, options) {
        const { relatedRequestId, resumptionToken, onresumptiontoken, task, relatedTask } = options ?? {};
        // Send the request
        return new Promise((resolve, reject) => {
            const earlyReject = (error) => {
                reject(error);
            };
            if (!this._transport) {
                earlyReject(new Error('Not connected'));
                return;
            }
            if (this._options?.enforceStrictCapabilities === true) {
                try {
                    this.assertCapabilityForMethod(request.method);
                    // If task creation is requested, also check task capabilities
                    if (task) {
                        this.assertTaskCapability(request.method);
                    }
                }
                catch (e) {
                    earlyReject(e);
                    return;
                }
            }
            options?.signal?.throwIfAborted();
            const messageId = this._requestMessageId++;
            const jsonrpcRequest = {
                ...request,
                jsonrpc: '2.0',
                id: messageId
            };
            if (options?.onprogress) {
                this._progressHandlers.set(messageId, options.onprogress);
                jsonrpcRequest.params = {
                    ...request.params,
                    _meta: {
                        ...(request.params?._meta || {}),
                        progressToken: messageId
                    }
                };
            }
            // Augment with task creation parameters if provided
            if (task) {
                jsonrpcRequest.params = {
                    ...jsonrpcRequest.params,
                    task: task
                };
            }
            // Augment with related task metadata if relatedTask is provided
            if (relatedTask) {
                jsonrpcRequest.params = {
                    ...jsonrpcRequest.params,
                    _meta: {
                        ...(jsonrpcRequest.params?._meta || {}),
                        [modelcontextprotocolSdk2.RELATED_TASK_META_KEY]: relatedTask
                    }
                };
            }
            const cancel = (reason) => {
                this._responseHandlers.delete(messageId);
                this._progressHandlers.delete(messageId);
                this._cleanupTimeout(messageId);
                this._transport
                    ?.send({
                    jsonrpc: '2.0',
                    method: 'notifications/cancelled',
                    params: {
                        requestId: messageId,
                        reason: String(reason)
                    }
                }, { relatedRequestId, resumptionToken, onresumptiontoken })
                    .catch(error => this._onerror(new Error(`Failed to send cancellation: ${error}`)));
                // Wrap the reason in an McpError if it isn't already
                const error = reason instanceof modelcontextprotocolSdk2.McpError ? reason : new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.RequestTimeout, String(reason));
                reject(error);
            };
            this._responseHandlers.set(messageId, response => {
                if (options?.signal?.aborted) {
                    return;
                }
                if (response instanceof Error) {
                    return reject(response);
                }
                try {
                    const parseResult = safeParse(resultSchema, response.result);
                    if (!parseResult.success) {
                        // Type guard: if success is false, error is guaranteed to exist
                        reject(parseResult.error);
                    }
                    else {
                        resolve(parseResult.data);
                    }
                }
                catch (error) {
                    reject(error);
                }
            });
            options?.signal?.addEventListener('abort', () => {
                cancel(options?.signal?.reason);
            });
            const timeout = options?.timeout ?? DEFAULT_REQUEST_TIMEOUT_MSEC;
            const timeoutHandler = () => cancel(modelcontextprotocolSdk2.McpError.fromError(modelcontextprotocolSdk2.ErrorCode.RequestTimeout, 'Request timed out', { timeout }));
            this._setupTimeout(messageId, timeout, options?.maxTotalTimeout, timeoutHandler, options?.resetTimeoutOnProgress ?? false);
            // Queue request if related to a task
            const relatedTaskId = relatedTask?.taskId;
            if (relatedTaskId) {
                // Store the response resolver for this request so responses can be routed back
                const responseResolver = (response) => {
                    const handler = this._responseHandlers.get(messageId);
                    if (handler) {
                        handler(response);
                    }
                    else {
                        // Log error when resolver is missing, but don't fail
                        this._onerror(new Error(`Response handler missing for side-channeled request ${messageId}`));
                    }
                };
                this._requestResolvers.set(messageId, responseResolver);
                this._enqueueTaskMessage(relatedTaskId, {
                    type: 'request',
                    message: jsonrpcRequest,
                    timestamp: Date.now()
                }).catch(error => {
                    this._cleanupTimeout(messageId);
                    reject(error);
                });
                // Don't send through transport - queued messages are delivered via tasks/result only
                // This prevents duplicate delivery for bidirectional transports
            }
            else {
                // No related task - send through transport normally
                this._transport.send(jsonrpcRequest, { relatedRequestId, resumptionToken, onresumptiontoken }).catch(error => {
                    this._cleanupTimeout(messageId);
                    reject(error);
                });
            }
        });
    }
    /**
     * Gets the current status of a task.
     *
     * @experimental Use `client.experimental.tasks.getTask()` to access this method.
     */
    async getTask(params, options) {
        // @ts-expect-error SendRequestT cannot directly contain GetTaskRequest, but we ensure all type instantiations contain it anyways
        return this.request({ method: 'tasks/get', params }, modelcontextprotocolSdk2.GetTaskResultSchema, options);
    }
    /**
     * Retrieves the result of a completed task.
     *
     * @experimental Use `client.experimental.tasks.getTaskResult()` to access this method.
     */
    async getTaskResult(params, resultSchema, options) {
        // @ts-expect-error SendRequestT cannot directly contain GetTaskPayloadRequest, but we ensure all type instantiations contain it anyways
        return this.request({ method: 'tasks/result', params }, resultSchema, options);
    }
    /**
     * Lists tasks, optionally starting from a pagination cursor.
     *
     * @experimental Use `client.experimental.tasks.listTasks()` to access this method.
     */
    async listTasks(params, options) {
        // @ts-expect-error SendRequestT cannot directly contain ListTasksRequest, but we ensure all type instantiations contain it anyways
        return this.request({ method: 'tasks/list', params }, modelcontextprotocolSdk2.ListTasksResultSchema, options);
    }
    /**
     * Cancels a specific task.
     *
     * @experimental Use `client.experimental.tasks.cancelTask()` to access this method.
     */
    async cancelTask(params, options) {
        // @ts-expect-error SendRequestT cannot directly contain CancelTaskRequest, but we ensure all type instantiations contain it anyways
        return this.request({ method: 'tasks/cancel', params }, modelcontextprotocolSdk2.CancelTaskResultSchema, options);
    }
    /**
     * Emits a notification, which is a one-way message that does not expect a response.
     */
    async notification(notification, options) {
        if (!this._transport) {
            throw new Error('Not connected');
        }
        this.assertNotificationCapability(notification.method);
        // Queue notification if related to a task
        const relatedTaskId = options?.relatedTask?.taskId;
        if (relatedTaskId) {
            // Build the JSONRPC notification with metadata
            const jsonrpcNotification = {
                ...notification,
                jsonrpc: '2.0',
                params: {
                    ...notification.params,
                    _meta: {
                        ...(notification.params?._meta || {}),
                        [modelcontextprotocolSdk2.RELATED_TASK_META_KEY]: options.relatedTask
                    }
                }
            };
            await this._enqueueTaskMessage(relatedTaskId, {
                type: 'notification',
                message: jsonrpcNotification,
                timestamp: Date.now()
            });
            // Don't send through transport - queued messages are delivered via tasks/result only
            // This prevents duplicate delivery for bidirectional transports
            return;
        }
        const debouncedMethods = this._options?.debouncedNotificationMethods ?? [];
        // A notification can only be debounced if it's in the list AND it's "simple"
        // (i.e., has no parameters and no related request ID or related task that could be lost).
        const canDebounce = debouncedMethods.includes(notification.method) && !notification.params && !options?.relatedRequestId && !options?.relatedTask;
        if (canDebounce) {
            // If a notification of this type is already scheduled, do nothing.
            if (this._pendingDebouncedNotifications.has(notification.method)) {
                return;
            }
            // Mark this notification type as pending.
            this._pendingDebouncedNotifications.add(notification.method);
            // Schedule the actual send to happen in the next microtask.
            // This allows all synchronous calls in the current event loop tick to be coalesced.
            Promise.resolve().then(() => {
                // Un-mark the notification so the next one can be scheduled.
                this._pendingDebouncedNotifications.delete(notification.method);
                // SAFETY CHECK: If the connection was closed while this was pending, abort.
                if (!this._transport) {
                    return;
                }
                let jsonrpcNotification = {
                    ...notification,
                    jsonrpc: '2.0'
                };
                // Augment with related task metadata if relatedTask is provided
                if (options?.relatedTask) {
                    jsonrpcNotification = {
                        ...jsonrpcNotification,
                        params: {
                            ...jsonrpcNotification.params,
                            _meta: {
                                ...(jsonrpcNotification.params?._meta || {}),
                                [modelcontextprotocolSdk2.RELATED_TASK_META_KEY]: options.relatedTask
                            }
                        }
                    };
                }
                // Send the notification, but don't await it here to avoid blocking.
                // Handle potential errors with a .catch().
                this._transport?.send(jsonrpcNotification, options).catch(error => this._onerror(error));
            });
            // Return immediately.
            return;
        }
        let jsonrpcNotification = {
            ...notification,
            jsonrpc: '2.0'
        };
        // Augment with related task metadata if relatedTask is provided
        if (options?.relatedTask) {
            jsonrpcNotification = {
                ...jsonrpcNotification,
                params: {
                    ...jsonrpcNotification.params,
                    _meta: {
                        ...(jsonrpcNotification.params?._meta || {}),
                        [modelcontextprotocolSdk2.RELATED_TASK_META_KEY]: options.relatedTask
                    }
                }
            };
        }
        await this._transport.send(jsonrpcNotification, options);
    }
    /**
     * Registers a handler to invoke when this protocol object receives a request with the given method.
     *
     * Note that this will replace any previous request handler for the same method.
     */
    setRequestHandler(requestSchema, handler) {
        const method = getMethodLiteral(requestSchema);
        this.assertRequestHandlerCapability(method);
        this._requestHandlers.set(method, (request, extra) => {
            const parsed = parseWithCompat(requestSchema, request);
            return Promise.resolve(handler(parsed, extra));
        });
    }
    /**
     * Removes the request handler for the given method.
     */
    removeRequestHandler(method) {
        this._requestHandlers.delete(method);
    }
    /**
     * Asserts that a request handler has not already been set for the given method, in preparation for a new one being automatically installed.
     */
    assertCanSetRequestHandler(method) {
        if (this._requestHandlers.has(method)) {
            throw new Error(`A request handler for ${method} already exists, which would be overridden`);
        }
    }
    /**
     * Registers a handler to invoke when this protocol object receives a notification with the given method.
     *
     * Note that this will replace any previous notification handler for the same method.
     */
    setNotificationHandler(notificationSchema, handler) {
        const method = getMethodLiteral(notificationSchema);
        this._notificationHandlers.set(method, notification => {
            const parsed = parseWithCompat(notificationSchema, notification);
            return Promise.resolve(handler(parsed));
        });
    }
    /**
     * Removes the notification handler for the given method.
     */
    removeNotificationHandler(method) {
        this._notificationHandlers.delete(method);
    }
    /**
     * Cleans up the progress handler associated with a task.
     * This should be called when a task reaches a terminal status.
     */
    _cleanupTaskProgressHandler(taskId) {
        const progressToken = this._taskProgressTokens.get(taskId);
        if (progressToken !== undefined) {
            this._progressHandlers.delete(progressToken);
            this._taskProgressTokens.delete(taskId);
        }
    }
    /**
     * Enqueues a task-related message for side-channel delivery via tasks/result.
     * @param taskId The task ID to associate the message with
     * @param message The message to enqueue
     * @param sessionId Optional session ID for binding the operation to a specific session
     * @throws Error if taskStore is not configured or if enqueue fails (e.g., queue overflow)
     *
     * Note: If enqueue fails, it's the TaskMessageQueue implementation's responsibility to handle
     * the error appropriately (e.g., by failing the task, logging, etc.). The Protocol layer
     * simply propagates the error.
     */
    async _enqueueTaskMessage(taskId, message, sessionId) {
        // Task message queues are only used when taskStore is configured
        if (!this._taskStore || !this._taskMessageQueue) {
            throw new Error('Cannot enqueue task message: taskStore and taskMessageQueue are not configured');
        }
        const maxQueueSize = this._options?.maxTaskQueueSize;
        await this._taskMessageQueue.enqueue(taskId, message, sessionId, maxQueueSize);
    }
    /**
     * Clears the message queue for a task and rejects any pending request resolvers.
     * @param taskId The task ID whose queue should be cleared
     * @param sessionId Optional session ID for binding the operation to a specific session
     */
    async _clearTaskQueue(taskId, sessionId) {
        if (this._taskMessageQueue) {
            // Reject any pending request resolvers
            const messages = await this._taskMessageQueue.dequeueAll(taskId, sessionId);
            for (const message of messages) {
                if (message.type === 'request' && modelcontextprotocolSdk2.isJSONRPCRequest(message.message)) {
                    // Extract request ID from the message
                    const requestId = message.message.id;
                    const resolver = this._requestResolvers.get(requestId);
                    if (resolver) {
                        resolver(new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InternalError, 'Task cancelled or completed'));
                        this._requestResolvers.delete(requestId);
                    }
                    else {
                        // Log error when resolver is missing during cleanup for better observability
                        this._onerror(new Error(`Resolver missing for request ${requestId} during task ${taskId} cleanup`));
                    }
                }
            }
        }
    }
    /**
     * Waits for a task update (new messages or status change) with abort signal support.
     * Uses polling to check for updates at the task's configured poll interval.
     * @param taskId The task ID to wait for
     * @param signal Abort signal to cancel the wait
     * @returns Promise that resolves when an update occurs or rejects if aborted
     */
    async _waitForTaskUpdate(taskId, signal) {
        // Get the task's poll interval, falling back to default
        let interval = this._options?.defaultTaskPollInterval ?? 1000;
        try {
            const task = await this._taskStore?.getTask(taskId);
            if (task?.pollInterval) {
                interval = task.pollInterval;
            }
        }
        catch {
            // Use default interval if task lookup fails
        }
        return new Promise((resolve, reject) => {
            if (signal.aborted) {
                reject(new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InvalidRequest, 'Request cancelled'));
                return;
            }
            // Wait for the poll interval, then resolve so caller can check for updates
            const timeoutId = setTimeout(resolve, interval);
            // Clean up timeout and reject if aborted
            signal.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                reject(new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InvalidRequest, 'Request cancelled'));
            }, { once: true });
        });
    }
    requestTaskStore(request, sessionId) {
        const taskStore = this._taskStore;
        if (!taskStore) {
            throw new Error('No task store configured');
        }
        return {
            createTask: async (taskParams) => {
                if (!request) {
                    throw new Error('No request provided');
                }
                return await taskStore.createTask(taskParams, request.id, {
                    method: request.method,
                    params: request.params
                }, sessionId);
            },
            getTask: async (taskId) => {
                const task = await taskStore.getTask(taskId, sessionId);
                if (!task) {
                    throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InvalidParams, 'Failed to retrieve task: Task not found');
                }
                return task;
            },
            storeTaskResult: async (taskId, status, result) => {
                await taskStore.storeTaskResult(taskId, status, result, sessionId);
                // Get updated task state and send notification
                const task = await taskStore.getTask(taskId, sessionId);
                if (task) {
                    const notification = modelcontextprotocolSdk2.TaskStatusNotificationSchema.parse({
                        method: 'notifications/tasks/status',
                        params: task
                    });
                    await this.notification(notification);
                    if (isTerminal(task.status)) {
                        this._cleanupTaskProgressHandler(taskId);
                        // Don't clear queue here - it will be cleared after delivery via tasks/result
                    }
                }
            },
            getTaskResult: taskId => {
                return taskStore.getTaskResult(taskId, sessionId);
            },
            updateTaskStatus: async (taskId, status, statusMessage) => {
                // Check if task exists
                const task = await taskStore.getTask(taskId, sessionId);
                if (!task) {
                    throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InvalidParams, `Task "${taskId}" not found - it may have been cleaned up`);
                }
                // Don't allow transitions from terminal states
                if (isTerminal(task.status)) {
                    throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InvalidParams, `Cannot update task "${taskId}" from terminal status "${task.status}" to "${status}". Terminal states (completed, failed, cancelled) cannot transition to other states.`);
                }
                await taskStore.updateTaskStatus(taskId, status, statusMessage, sessionId);
                // Get updated task state and send notification
                const updatedTask = await taskStore.getTask(taskId, sessionId);
                if (updatedTask) {
                    const notification = modelcontextprotocolSdk2.TaskStatusNotificationSchema.parse({
                        method: 'notifications/tasks/status',
                        params: updatedTask
                    });
                    await this.notification(notification);
                    if (isTerminal(updatedTask.status)) {
                        this._cleanupTaskProgressHandler(taskId);
                        // Don't clear queue here - it will be cleared after delivery via tasks/result
                    }
                }
            },
            listTasks: cursor => {
                return taskStore.listTasks(cursor, sessionId);
            }
        };
    }
}
function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function mergeCapabilities(base, additional) {
    const result = { ...base };
    for (const key in additional) {
        const k = key;
        const addValue = additional[k];
        if (addValue === undefined)
            continue;
        const baseValue = result[k];
        if (isPlainObject(baseValue) && isPlainObject(addValue)) {
            result[k] = { ...baseValue, ...addValue };
        }
        else {
            result[k] = addValue;
        }
    }
    return result;
}

/**
 * Experimental server task features for MCP SDK.
 * WARNING: These APIs are experimental and may change without notice.
 *
 * @experimental
 */
/**
 * Experimental task features for low-level MCP servers.
 *
 * Access via `server.experimental.tasks`:
 * ```typescript
 * const stream = server.experimental.tasks.requestStream(request, schema, options);
 * ```
 *
 * For high-level server usage with task-based tools, use `McpServer.experimental.tasks` instead.
 *
 * @experimental
 */
class ExperimentalServerTasks {
    constructor(_server) {
        this._server = _server;
    }
    /**
     * Sends a request and returns an AsyncGenerator that yields response messages.
     * The generator is guaranteed to end with either a 'result' or 'error' message.
     *
     * This method provides streaming access to request processing, allowing you to
     * observe intermediate task status updates for task-augmented requests.
     *
     * @param request - The request to send
     * @param resultSchema - Zod schema for validating the result
     * @param options - Optional request options (timeout, signal, task creation params, etc.)
     * @returns AsyncGenerator that yields ResponseMessage objects
     *
     * @experimental
     */
    requestStream(request, resultSchema, options) {
        return this._server.requestStream(request, resultSchema, options);
    }
    /**
     * Sends a sampling request and returns an AsyncGenerator that yields response messages.
     * The generator is guaranteed to end with either a 'result' or 'error' message.
     *
     * For task-augmented requests, yields 'taskCreated' and 'taskStatus' messages
     * before the final result.
     *
     * @example
     * ```typescript
     * const stream = server.experimental.tasks.createMessageStream({
     *     messages: [{ role: 'user', content: { type: 'text', text: 'Hello' } }],
     *     maxTokens: 100
     * }, {
     *     onprogress: (progress) => {
     *         // Handle streaming tokens via progress notifications
     *         console.log('Progress:', progress.message);
     *     }
     * });
     *
     * for await (const message of stream) {
     *     switch (message.type) {
     *         case 'taskCreated':
     *             console.log('Task created:', message.task.taskId);
     *             break;
     *         case 'taskStatus':
     *             console.log('Task status:', message.task.status);
     *             break;
     *         case 'result':
     *             console.log('Final result:', message.result);
     *             break;
     *         case 'error':
     *             console.error('Error:', message.error);
     *             break;
     *     }
     * }
     * ```
     *
     * @param params - The sampling request parameters
     * @param options - Optional request options (timeout, signal, task creation params, onprogress, etc.)
     * @returns AsyncGenerator that yields ResponseMessage objects
     *
     * @experimental
     */
    createMessageStream(params, options) {
        // Access client capabilities via the server
        const clientCapabilities = this._server.getClientCapabilities();
        // Capability check - only required when tools/toolChoice are provided
        if ((params.tools || params.toolChoice) && !clientCapabilities?.sampling?.tools) {
            throw new Error('Client does not support sampling tools capability.');
        }
        // Message structure validation - always validate tool_use/tool_result pairs.
        // These may appear even without tools/toolChoice in the current request when
        // a previous sampling request returned tool_use and this is a follow-up with results.
        if (params.messages.length > 0) {
            const lastMessage = params.messages[params.messages.length - 1];
            const lastContent = Array.isArray(lastMessage.content) ? lastMessage.content : [lastMessage.content];
            const hasToolResults = lastContent.some(c => c.type === 'tool_result');
            const previousMessage = params.messages.length > 1 ? params.messages[params.messages.length - 2] : undefined;
            const previousContent = previousMessage
                ? Array.isArray(previousMessage.content)
                    ? previousMessage.content
                    : [previousMessage.content]
                : [];
            const hasPreviousToolUse = previousContent.some(c => c.type === 'tool_use');
            if (hasToolResults) {
                if (lastContent.some(c => c.type !== 'tool_result')) {
                    throw new Error('The last message must contain only tool_result content if any is present');
                }
                if (!hasPreviousToolUse) {
                    throw new Error('tool_result blocks are not matching any tool_use from the previous message');
                }
            }
            if (hasPreviousToolUse) {
                // Extract tool_use IDs from previous message and tool_result IDs from current message
                const toolUseIds = new Set(previousContent.filter(c => c.type === 'tool_use').map(c => c.id));
                const toolResultIds = new Set(lastContent.filter(c => c.type === 'tool_result').map(c => c.toolUseId));
                if (toolUseIds.size !== toolResultIds.size || ![...toolUseIds].every(id => toolResultIds.has(id))) {
                    throw new Error('ids of tool_result blocks and tool_use blocks from previous message do not match');
                }
            }
        }
        return this.requestStream({
            method: 'sampling/createMessage',
            params
        }, modelcontextprotocolSdk2.CreateMessageResultSchema, options);
    }
    /**
     * Sends an elicitation request and returns an AsyncGenerator that yields response messages.
     * The generator is guaranteed to end with either a 'result' or 'error' message.
     *
     * For task-augmented requests (especially URL-based elicitation), yields 'taskCreated'
     * and 'taskStatus' messages before the final result.
     *
     * @example
     * ```typescript
     * const stream = server.experimental.tasks.elicitInputStream({
     *     mode: 'url',
     *     message: 'Please authenticate',
     *     elicitationId: 'auth-123',
     *     url: 'https://example.com/auth'
     * }, {
     *     task: { ttl: 300000 } // Task-augmented for long-running auth flow
     * });
     *
     * for await (const message of stream) {
     *     switch (message.type) {
     *         case 'taskCreated':
     *             console.log('Task created:', message.task.taskId);
     *             break;
     *         case 'taskStatus':
     *             console.log('Task status:', message.task.status);
     *             break;
     *         case 'result':
     *             console.log('User action:', message.result.action);
     *             break;
     *         case 'error':
     *             console.error('Error:', message.error);
     *             break;
     *     }
     * }
     * ```
     *
     * @param params - The elicitation request parameters
     * @param options - Optional request options (timeout, signal, task creation params, etc.)
     * @returns AsyncGenerator that yields ResponseMessage objects
     *
     * @experimental
     */
    elicitInputStream(params, options) {
        // Access client capabilities via the server
        const clientCapabilities = this._server.getClientCapabilities();
        const mode = params.mode ?? 'form';
        // Capability check based on mode
        switch (mode) {
            case 'url': {
                if (!clientCapabilities?.elicitation?.url) {
                    throw new Error('Client does not support url elicitation.');
                }
                break;
            }
            case 'form': {
                if (!clientCapabilities?.elicitation?.form) {
                    throw new Error('Client does not support form elicitation.');
                }
                break;
            }
        }
        // Normalize params to ensure mode is set for form mode (defaults to 'form' per spec)
        const normalizedParams = mode === 'form' && params.mode === undefined ? { ...params, mode: 'form' } : params;
        // Cast to ServerRequest needed because TypeScript can't narrow the union type
        // based on the discriminated 'method' field when constructing the object literal
        return this.requestStream({
            method: 'elicitation/create',
            params: normalizedParams
        }, modelcontextprotocolSdk2.ElicitResultSchema, options);
    }
    /**
     * Gets the current status of a task.
     *
     * @param taskId - The task identifier
     * @param options - Optional request options
     * @returns The task status
     *
     * @experimental
     */
    async getTask(taskId, options) {
        return this._server.getTask({ taskId }, options);
    }
    /**
     * Retrieves the result of a completed task.
     *
     * @param taskId - The task identifier
     * @param resultSchema - Zod schema for validating the result
     * @param options - Optional request options
     * @returns The task result
     *
     * @experimental
     */
    async getTaskResult(taskId, resultSchema, options) {
        return this._server.getTaskResult({ taskId }, resultSchema, options);
    }
    /**
     * Lists tasks with optional pagination.
     *
     * @param cursor - Optional pagination cursor
     * @param options - Optional request options
     * @returns List of tasks with optional next cursor
     *
     * @experimental
     */
    async listTasks(cursor, options) {
        return this._server.listTasks(cursor ? { cursor } : undefined, options);
    }
    /**
     * Cancels a running task.
     *
     * @param taskId - The task identifier
     * @param options - Optional request options
     *
     * @experimental
     */
    async cancelTask(taskId, options) {
        return this._server.cancelTask({ taskId }, options);
    }
}

/**
 * Experimental task capability assertion helpers.
 * WARNING: These APIs are experimental and may change without notice.
 *
 * @experimental
 */
/**
 * Asserts that task creation is supported for tools/call.
 * Used by Client.assertTaskCapability and Server.assertTaskHandlerCapability.
 *
 * @param requests - The task requests capability object
 * @param method - The method being checked
 * @param entityName - 'Server' or 'Client' for error messages
 * @throws Error if the capability is not supported
 *
 * @experimental
 */
function assertToolsCallTaskCapability(requests, method, entityName) {
    if (!requests) {
        throw new Error(`${entityName} does not support task creation (required for ${method})`);
    }
    switch (method) {
        case 'tools/call':
            if (!requests.tools?.call) {
                throw new Error(`${entityName} does not support task creation for tools/call (required for ${method})`);
            }
            break;
    }
}
/**
 * Asserts that task creation is supported for sampling/createMessage or elicitation/create.
 * Used by Server.assertTaskCapability and Client.assertTaskHandlerCapability.
 *
 * @param requests - The task requests capability object
 * @param method - The method being checked
 * @param entityName - 'Server' or 'Client' for error messages
 * @throws Error if the capability is not supported
 *
 * @experimental
 */
function assertClientRequestTaskCapability(requests, method, entityName) {
    if (!requests) {
        throw new Error(`${entityName} does not support task creation (required for ${method})`);
    }
    switch (method) {
        case 'sampling/createMessage':
            if (!requests.sampling?.createMessage) {
                throw new Error(`${entityName} does not support task creation for sampling/createMessage (required for ${method})`);
            }
            break;
        case 'elicitation/create':
            if (!requests.elicitation?.create) {
                throw new Error(`${entityName} does not support task creation for elicitation/create (required for ${method})`);
            }
            break;
    }
}

/**
 * An MCP server on top of a pluggable transport.
 *
 * This server will automatically respond to the initialization flow as initiated from the client.
 *
 * To use with custom types, extend the base Request/Notification/Result types and pass them as type parameters:
 *
 * ```typescript
 * // Custom schemas
 * const CustomRequestSchema = RequestSchema.extend({...})
 * const CustomNotificationSchema = NotificationSchema.extend({...})
 * const CustomResultSchema = ResultSchema.extend({...})
 *
 * // Type aliases
 * type CustomRequest = z.infer<typeof CustomRequestSchema>
 * type CustomNotification = z.infer<typeof CustomNotificationSchema>
 * type CustomResult = z.infer<typeof CustomResultSchema>
 *
 * // Create typed server
 * const server = new Server<CustomRequest, CustomNotification, CustomResult>({
 *   name: "CustomServer",
 *   version: "1.0.0"
 * })
 * ```
 * @deprecated Use `McpServer` instead for the high-level API. Only use `Server` for advanced use cases.
 */
class Server extends Protocol {
    /**
     * Initializes this server with the given name and version information.
     */
    constructor(_serverInfo, options) {
        super(options);
        this._serverInfo = _serverInfo;
        // Map log levels by session id
        this._loggingLevels = new Map();
        // Map LogLevelSchema to severity index
        this.LOG_LEVEL_SEVERITY = new Map(modelcontextprotocolSdk2.LoggingLevelSchema.options.map((level, index) => [level, index]));
        // Is a message with the given level ignored in the log level set for the given session id?
        this.isMessageIgnored = (level, sessionId) => {
            const currentLevel = this._loggingLevels.get(sessionId);
            return currentLevel ? this.LOG_LEVEL_SEVERITY.get(level) < this.LOG_LEVEL_SEVERITY.get(currentLevel) : false;
        };
        this._capabilities = options?.capabilities ?? {};
        this._instructions = options?.instructions;
        this._jsonSchemaValidator = options?.jsonSchemaValidator ?? new modelcontextprotocolSdk2.AjvJsonSchemaValidator();
        this.setRequestHandler(modelcontextprotocolSdk2.InitializeRequestSchema, request => this._oninitialize(request));
        this.setNotificationHandler(modelcontextprotocolSdk2.InitializedNotificationSchema, () => this.oninitialized?.());
        if (this._capabilities.logging) {
            this.setRequestHandler(modelcontextprotocolSdk2.SetLevelRequestSchema, async (request, extra) => {
                const transportSessionId = extra.sessionId || extra.requestInfo?.headers['mcp-session-id'] || undefined;
                const { level } = request.params;
                const parseResult = modelcontextprotocolSdk2.LoggingLevelSchema.safeParse(level);
                if (parseResult.success) {
                    this._loggingLevels.set(transportSessionId, parseResult.data);
                }
                return {};
            });
        }
    }
    /**
     * Access experimental features.
     *
     * WARNING: These APIs are experimental and may change without notice.
     *
     * @experimental
     */
    get experimental() {
        if (!this._experimental) {
            this._experimental = {
                tasks: new ExperimentalServerTasks(this)
            };
        }
        return this._experimental;
    }
    /**
     * Registers new capabilities. This can only be called before connecting to a transport.
     *
     * The new capabilities will be merged with any existing capabilities previously given (e.g., at initialization).
     */
    registerCapabilities(capabilities) {
        if (this.transport) {
            throw new Error('Cannot register capabilities after connecting to transport');
        }
        this._capabilities = mergeCapabilities(this._capabilities, capabilities);
    }
    /**
     * Override request handler registration to enforce server-side validation for tools/call.
     */
    setRequestHandler(requestSchema, handler) {
        const shape = getObjectShape(requestSchema);
        const methodSchema = shape?.method;
        if (!methodSchema) {
            throw new Error('Schema is missing a method literal');
        }
        // Extract literal value using type-safe property access
        let methodValue;
        if (isZ4Schema(methodSchema)) {
            const v4Schema = methodSchema;
            const v4Def = v4Schema._zod?.def;
            methodValue = v4Def?.value ?? v4Schema.value;
        }
        else {
            const v3Schema = methodSchema;
            const legacyDef = v3Schema._def;
            methodValue = legacyDef?.value ?? v3Schema.value;
        }
        if (typeof methodValue !== 'string') {
            throw new Error('Schema method literal must be a string');
        }
        const method = methodValue;
        if (method === 'tools/call') {
            const wrappedHandler = async (request, extra) => {
                const validatedRequest = safeParse(modelcontextprotocolSdk2.CallToolRequestSchema, request);
                if (!validatedRequest.success) {
                    const errorMessage = validatedRequest.error instanceof Error ? validatedRequest.error.message : String(validatedRequest.error);
                    throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InvalidParams, `Invalid tools/call request: ${errorMessage}`);
                }
                const { params } = validatedRequest.data;
                const result = await Promise.resolve(handler(request, extra));
                // When task creation is requested, validate and return CreateTaskResult
                if (params.task) {
                    const taskValidationResult = safeParse(modelcontextprotocolSdk2.CreateTaskResultSchema, result);
                    if (!taskValidationResult.success) {
                        const errorMessage = taskValidationResult.error instanceof Error
                            ? taskValidationResult.error.message
                            : String(taskValidationResult.error);
                        throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InvalidParams, `Invalid task creation result: ${errorMessage}`);
                    }
                    return taskValidationResult.data;
                }
                // For non-task requests, validate against CallToolResultSchema
                const validationResult = safeParse(modelcontextprotocolSdk2.CallToolResultSchema, result);
                if (!validationResult.success) {
                    const errorMessage = validationResult.error instanceof Error ? validationResult.error.message : String(validationResult.error);
                    throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InvalidParams, `Invalid tools/call result: ${errorMessage}`);
                }
                return validationResult.data;
            };
            // Install the wrapped handler
            return super.setRequestHandler(requestSchema, wrappedHandler);
        }
        // Other handlers use default behavior
        return super.setRequestHandler(requestSchema, handler);
    }
    assertCapabilityForMethod(method) {
        switch (method) {
            case 'sampling/createMessage':
                if (!this._clientCapabilities?.sampling) {
                    throw new Error(`Client does not support sampling (required for ${method})`);
                }
                break;
            case 'elicitation/create':
                if (!this._clientCapabilities?.elicitation) {
                    throw new Error(`Client does not support elicitation (required for ${method})`);
                }
                break;
            case 'roots/list':
                if (!this._clientCapabilities?.roots) {
                    throw new Error(`Client does not support listing roots (required for ${method})`);
                }
                break;
        }
    }
    assertNotificationCapability(method) {
        switch (method) {
            case 'notifications/message':
                if (!this._capabilities.logging) {
                    throw new Error(`Server does not support logging (required for ${method})`);
                }
                break;
            case 'notifications/resources/updated':
            case 'notifications/resources/list_changed':
                if (!this._capabilities.resources) {
                    throw new Error(`Server does not support notifying about resources (required for ${method})`);
                }
                break;
            case 'notifications/tools/list_changed':
                if (!this._capabilities.tools) {
                    throw new Error(`Server does not support notifying of tool list changes (required for ${method})`);
                }
                break;
            case 'notifications/prompts/list_changed':
                if (!this._capabilities.prompts) {
                    throw new Error(`Server does not support notifying of prompt list changes (required for ${method})`);
                }
                break;
            case 'notifications/elicitation/complete':
                if (!this._clientCapabilities?.elicitation?.url) {
                    throw new Error(`Client does not support URL elicitation (required for ${method})`);
                }
                break;
        }
    }
    assertRequestHandlerCapability(method) {
        // Task handlers are registered in Protocol constructor before _capabilities is initialized
        // Skip capability check for task methods during initialization
        if (!this._capabilities) {
            return;
        }
        switch (method) {
            case 'completion/complete':
                if (!this._capabilities.completions) {
                    throw new Error(`Server does not support completions (required for ${method})`);
                }
                break;
            case 'logging/setLevel':
                if (!this._capabilities.logging) {
                    throw new Error(`Server does not support logging (required for ${method})`);
                }
                break;
            case 'prompts/get':
            case 'prompts/list':
                if (!this._capabilities.prompts) {
                    throw new Error(`Server does not support prompts (required for ${method})`);
                }
                break;
            case 'resources/list':
            case 'resources/templates/list':
            case 'resources/read':
                if (!this._capabilities.resources) {
                    throw new Error(`Server does not support resources (required for ${method})`);
                }
                break;
            case 'tools/call':
            case 'tools/list':
                if (!this._capabilities.tools) {
                    throw new Error(`Server does not support tools (required for ${method})`);
                }
                break;
            case 'tasks/get':
            case 'tasks/list':
            case 'tasks/result':
            case 'tasks/cancel':
                if (!this._capabilities.tasks) {
                    throw new Error(`Server does not support tasks capability (required for ${method})`);
                }
                break;
        }
    }
    assertTaskCapability(method) {
        assertClientRequestTaskCapability(this._clientCapabilities?.tasks?.requests, method, 'Client');
    }
    assertTaskHandlerCapability(method) {
        // Task handlers are registered in Protocol constructor before _capabilities is initialized
        // Skip capability check for task methods during initialization
        if (!this._capabilities) {
            return;
        }
        assertToolsCallTaskCapability(this._capabilities.tasks?.requests, method, 'Server');
    }
    async _oninitialize(request) {
        const requestedVersion = request.params.protocolVersion;
        this._clientCapabilities = request.params.capabilities;
        this._clientVersion = request.params.clientInfo;
        const protocolVersion = modelcontextprotocolSdk2.SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion) ? requestedVersion : modelcontextprotocolSdk2.LATEST_PROTOCOL_VERSION;
        return {
            protocolVersion,
            capabilities: this.getCapabilities(),
            serverInfo: this._serverInfo,
            ...(this._instructions && { instructions: this._instructions })
        };
    }
    /**
     * After initialization has completed, this will be populated with the client's reported capabilities.
     */
    getClientCapabilities() {
        return this._clientCapabilities;
    }
    /**
     * After initialization has completed, this will be populated with information about the client's name and version.
     */
    getClientVersion() {
        return this._clientVersion;
    }
    getCapabilities() {
        return this._capabilities;
    }
    async ping() {
        return this.request({ method: 'ping' }, modelcontextprotocolSdk2.EmptyResultSchema);
    }
    // Implementation
    async createMessage(params, options) {
        // Capability check - only required when tools/toolChoice are provided
        if (params.tools || params.toolChoice) {
            if (!this._clientCapabilities?.sampling?.tools) {
                throw new Error('Client does not support sampling tools capability.');
            }
        }
        // Message structure validation - always validate tool_use/tool_result pairs.
        // These may appear even without tools/toolChoice in the current request when
        // a previous sampling request returned tool_use and this is a follow-up with results.
        if (params.messages.length > 0) {
            const lastMessage = params.messages[params.messages.length - 1];
            const lastContent = Array.isArray(lastMessage.content) ? lastMessage.content : [lastMessage.content];
            const hasToolResults = lastContent.some(c => c.type === 'tool_result');
            const previousMessage = params.messages.length > 1 ? params.messages[params.messages.length - 2] : undefined;
            const previousContent = previousMessage
                ? Array.isArray(previousMessage.content)
                    ? previousMessage.content
                    : [previousMessage.content]
                : [];
            const hasPreviousToolUse = previousContent.some(c => c.type === 'tool_use');
            if (hasToolResults) {
                if (lastContent.some(c => c.type !== 'tool_result')) {
                    throw new Error('The last message must contain only tool_result content if any is present');
                }
                if (!hasPreviousToolUse) {
                    throw new Error('tool_result blocks are not matching any tool_use from the previous message');
                }
            }
            if (hasPreviousToolUse) {
                const toolUseIds = new Set(previousContent.filter(c => c.type === 'tool_use').map(c => c.id));
                const toolResultIds = new Set(lastContent.filter(c => c.type === 'tool_result').map(c => c.toolUseId));
                if (toolUseIds.size !== toolResultIds.size || ![...toolUseIds].every(id => toolResultIds.has(id))) {
                    throw new Error('ids of tool_result blocks and tool_use blocks from previous message do not match');
                }
            }
        }
        // Use different schemas based on whether tools are provided
        if (params.tools) {
            return this.request({ method: 'sampling/createMessage', params }, modelcontextprotocolSdk2.CreateMessageResultWithToolsSchema, options);
        }
        return this.request({ method: 'sampling/createMessage', params }, modelcontextprotocolSdk2.CreateMessageResultSchema, options);
    }
    /**
     * Creates an elicitation request for the given parameters.
     * For backwards compatibility, `mode` may be omitted for form requests and will default to `'form'`.
     * @param params The parameters for the elicitation request.
     * @param options Optional request options.
     * @returns The result of the elicitation request.
     */
    async elicitInput(params, options) {
        const mode = (params.mode ?? 'form');
        switch (mode) {
            case 'url': {
                if (!this._clientCapabilities?.elicitation?.url) {
                    throw new Error('Client does not support url elicitation.');
                }
                const urlParams = params;
                return this.request({ method: 'elicitation/create', params: urlParams }, modelcontextprotocolSdk2.ElicitResultSchema, options);
            }
            case 'form': {
                if (!this._clientCapabilities?.elicitation?.form) {
                    throw new Error('Client does not support form elicitation.');
                }
                const formParams = params.mode === 'form' ? params : { ...params, mode: 'form' };
                const result = await this.request({ method: 'elicitation/create', params: formParams }, modelcontextprotocolSdk2.ElicitResultSchema, options);
                if (result.action === 'accept' && result.content && formParams.requestedSchema) {
                    try {
                        const validator = this._jsonSchemaValidator.getValidator(formParams.requestedSchema);
                        const validationResult = validator(result.content);
                        if (!validationResult.valid) {
                            throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InvalidParams, `Elicitation response content does not match requested schema: ${validationResult.errorMessage}`);
                        }
                    }
                    catch (error) {
                        if (error instanceof modelcontextprotocolSdk2.McpError) {
                            throw error;
                        }
                        throw new modelcontextprotocolSdk2.McpError(modelcontextprotocolSdk2.ErrorCode.InternalError, `Error validating elicitation response: ${error instanceof Error ? error.message : String(error)}`);
                    }
                }
                return result;
            }
        }
    }
    /**
     * Creates a reusable callback that, when invoked, will send a `notifications/elicitation/complete`
     * notification for the specified elicitation ID.
     *
     * @param elicitationId The ID of the elicitation to mark as complete.
     * @param options Optional notification options. Useful when the completion notification should be related to a prior request.
     * @returns A function that emits the completion notification when awaited.
     */
    createElicitationCompletionNotifier(elicitationId, options) {
        if (!this._clientCapabilities?.elicitation?.url) {
            throw new Error('Client does not support URL elicitation (required for notifications/elicitation/complete)');
        }
        return () => this.notification({
            method: 'notifications/elicitation/complete',
            params: {
                elicitationId
            }
        }, options);
    }
    async listRoots(params, options) {
        return this.request({ method: 'roots/list', params }, modelcontextprotocolSdk2.ListRootsResultSchema, options);
    }
    /**
     * Sends a logging message to the client, if connected.
     * Note: You only need to send the parameters object, not the entire JSON RPC message
     * @see LoggingMessageNotification
     * @param params
     * @param sessionId optional for stateless and backward compatibility
     */
    async sendLoggingMessage(params, sessionId) {
        if (this._capabilities.logging) {
            if (!this.isMessageIgnored(params.level, sessionId)) {
                return this.notification({ method: 'notifications/message', params });
            }
        }
    }
    async sendResourceUpdated(params) {
        return this.notification({
            method: 'notifications/resources/updated',
            params
        });
    }
    async sendResourceListChanged() {
        return this.notification({
            method: 'notifications/resources/list_changed'
        });
    }
    async sendToolListChanged() {
        return this.notification({ method: 'notifications/tools/list_changed' });
    }
    async sendPromptListChanged() {
        return this.notification({ method: 'notifications/prompts/list_changed' });
    }
}

/**
 * Buffers a continuous stdio stream into discrete JSON-RPC messages.
 */
class ReadBuffer {
    append(chunk) {
        this._buffer = this._buffer ? Buffer.concat([this._buffer, chunk]) : chunk;
    }
    readMessage() {
        if (!this._buffer) {
            return null;
        }
        const index = this._buffer.indexOf('\n');
        if (index === -1) {
            return null;
        }
        const line = this._buffer.toString('utf8', 0, index).replace(/\r$/, '');
        this._buffer = this._buffer.subarray(index + 1);
        return deserializeMessage(line);
    }
    clear() {
        this._buffer = undefined;
    }
}
function deserializeMessage(line) {
    return modelcontextprotocolSdk2.JSONRPCMessageSchema.parse(JSON.parse(line));
}
function serializeMessage(message) {
    return JSON.stringify(message) + '\n';
}

/**
 * Server transport for stdio: this communicates with an MCP client by reading from the current process' stdin and writing to stdout.
 *
 * This transport is only available in Node.js environments.
 */
class StdioServerTransport {
    constructor(_stdin = process.stdin, _stdout = process.stdout) {
        this._stdin = _stdin;
        this._stdout = _stdout;
        this._readBuffer = new ReadBuffer();
        this._started = false;
        // Arrow functions to bind `this` properly, while maintaining function identity.
        this._ondata = (chunk) => {
            this._readBuffer.append(chunk);
            this.processReadBuffer();
        };
        this._onerror = (error) => {
            this.onerror?.(error);
        };
    }
    /**
     * Starts listening for messages on stdin.
     */
    async start() {
        if (this._started) {
            throw new Error('StdioServerTransport already started! If using Server class, note that connect() calls start() automatically.');
        }
        this._started = true;
        this._stdin.on('data', this._ondata);
        this._stdin.on('error', this._onerror);
    }
    processReadBuffer() {
        while (true) {
            try {
                const message = this._readBuffer.readMessage();
                if (message === null) {
                    break;
                }
                this.onmessage?.(message);
            }
            catch (error) {
                this.onerror?.(error);
            }
        }
    }
    async close() {
        // Remove our event listeners first
        this._stdin.off('data', this._ondata);
        this._stdin.off('error', this._onerror);
        // Check if we were the only data listener
        const remainingDataListeners = this._stdin.listenerCount('data');
        if (remainingDataListeners === 0) {
            // Only pause stdin if we were the only listener
            // This prevents interfering with other parts of the application that might be using stdin
            this._stdin.pause();
        }
        // Clear the buffer and notify closure
        this._readBuffer.clear();
        this.onclose?.();
    }
    send(message) {
        return new Promise(resolve => {
            const json = serializeMessage(message);
            if (this._stdout.write(json)) {
                resolve();
            }
            else {
                this._stdout.once('drain', resolve);
            }
        });
    }
}

/**
 * Web Standards Streamable HTTP Server Transport
 *
 * This is the core transport implementation using Web Standard APIs (Request, Response, ReadableStream).
 * It can run on any runtime that supports Web Standards: Node.js 18+, Cloudflare Workers, Deno, Bun, etc.
 *
 * For Node.js Express/HTTP compatibility, use `StreamableHTTPServerTransport` which wraps this transport.
 */
/**
 * Server transport for Web Standards Streamable HTTP: this implements the MCP Streamable HTTP transport specification
 * using Web Standard APIs (Request, Response, ReadableStream).
 *
 * This transport works on any runtime that supports Web Standards: Node.js 18+, Cloudflare Workers, Deno, Bun, etc.
 *
 * Usage example:
 *
 * ```typescript
 * // Stateful mode - server sets the session ID
 * const statefulTransport = new WebStandardStreamableHTTPServerTransport({
 *   sessionIdGenerator: () => crypto.randomUUID(),
 * });
 *
 * // Stateless mode - explicitly set session ID to undefined
 * const statelessTransport = new WebStandardStreamableHTTPServerTransport({
 *   sessionIdGenerator: undefined,
 * });
 *
 * // Hono.js usage
 * app.all('/mcp', async (c) => {
 *   return transport.handleRequest(c.req.raw);
 * });
 *
 * // Cloudflare Workers usage
 * export default {
 *   async fetch(request: Request): Promise<Response> {
 *     return transport.handleRequest(request);
 *   }
 * };
 * ```
 *
 * In stateful mode:
 * - Session ID is generated and included in response headers
 * - Session ID is always included in initialization responses
 * - Requests with invalid session IDs are rejected with 404 Not Found
 * - Non-initialization requests without a session ID are rejected with 400 Bad Request
 * - State is maintained in-memory (connections, message history)
 *
 * In stateless mode:
 * - No Session ID is included in any responses
 * - No session validation is performed
 */
class WebStandardStreamableHTTPServerTransport {
    constructor(options = {}) {
        this._started = false;
        this._hasHandledRequest = false;
        this._streamMapping = new Map();
        this._requestToStreamMapping = new Map();
        this._requestResponseMap = new Map();
        this._initialized = false;
        this._enableJsonResponse = false;
        this._standaloneSseStreamId = '_GET_stream';
        this.sessionIdGenerator = options.sessionIdGenerator;
        this._enableJsonResponse = options.enableJsonResponse ?? false;
        this._eventStore = options.eventStore;
        this._onsessioninitialized = options.onsessioninitialized;
        this._onsessionclosed = options.onsessionclosed;
        this._allowedHosts = options.allowedHosts;
        this._allowedOrigins = options.allowedOrigins;
        this._enableDnsRebindingProtection = options.enableDnsRebindingProtection ?? false;
        this._retryInterval = options.retryInterval;
    }
    /**
     * Starts the transport. This is required by the Transport interface but is a no-op
     * for the Streamable HTTP transport as connections are managed per-request.
     */
    async start() {
        if (this._started) {
            throw new Error('Transport already started');
        }
        this._started = true;
    }
    /**
     * Helper to create a JSON error response
     */
    createJsonErrorResponse(status, code, message, options) {
        const error = { code, message };
        if (options?.data !== undefined) {
            error.data = options.data;
        }
        return new Response(JSON.stringify({
            jsonrpc: '2.0',
            error,
            id: null
        }), {
            status,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers
            }
        });
    }
    /**
     * Validates request headers for DNS rebinding protection.
     * @returns Error response if validation fails, undefined if validation passes.
     */
    validateRequestHeaders(req) {
        // Skip validation if protection is not enabled
        if (!this._enableDnsRebindingProtection) {
            return undefined;
        }
        // Validate Host header if allowedHosts is configured
        if (this._allowedHosts && this._allowedHosts.length > 0) {
            const hostHeader = req.headers.get('host');
            if (!hostHeader || !this._allowedHosts.includes(hostHeader)) {
                const error = `Invalid Host header: ${hostHeader}`;
                this.onerror?.(new Error(error));
                return this.createJsonErrorResponse(403, -32e3, error);
            }
        }
        // Validate Origin header if allowedOrigins is configured
        if (this._allowedOrigins && this._allowedOrigins.length > 0) {
            const originHeader = req.headers.get('origin');
            if (originHeader && !this._allowedOrigins.includes(originHeader)) {
                const error = `Invalid Origin header: ${originHeader}`;
                this.onerror?.(new Error(error));
                return this.createJsonErrorResponse(403, -32e3, error);
            }
        }
        return undefined;
    }
    /**
     * Handles an incoming HTTP request, whether GET, POST, or DELETE
     * Returns a Response object (Web Standard)
     */
    async handleRequest(req, options) {
        // In stateless mode (no sessionIdGenerator), each request must use a fresh transport.
        // Reusing a stateless transport causes message ID collisions between clients.
        if (!this.sessionIdGenerator && this._hasHandledRequest) {
            throw new Error('Stateless transport cannot be reused across requests. Create a new transport per request.');
        }
        this._hasHandledRequest = true;
        // Validate request headers for DNS rebinding protection
        const validationError = this.validateRequestHeaders(req);
        if (validationError) {
            return validationError;
        }
        switch (req.method) {
            case 'POST':
                return this.handlePostRequest(req, options);
            case 'GET':
                return this.handleGetRequest(req);
            case 'DELETE':
                return this.handleDeleteRequest(req);
            default:
                return this.handleUnsupportedRequest();
        }
    }
    /**
     * Writes a priming event to establish resumption capability.
     * Only sends if eventStore is configured (opt-in for resumability) and
     * the client's protocol version supports empty SSE data (>= 2025-11-25).
     */
    async writePrimingEvent(controller, encoder, streamId, protocolVersion) {
        if (!this._eventStore) {
            return;
        }
        // Priming events have empty data which older clients cannot handle.
        // Only send priming events to clients with protocol version >= 2025-11-25
        // which includes the fix for handling empty SSE data.
        if (protocolVersion < '2025-11-25') {
            return;
        }
        const primingEventId = await this._eventStore.storeEvent(streamId, {});
        let primingEvent = `id: ${primingEventId}\ndata: \n\n`;
        if (this._retryInterval !== undefined) {
            primingEvent = `id: ${primingEventId}\nretry: ${this._retryInterval}\ndata: \n\n`;
        }
        controller.enqueue(encoder.encode(primingEvent));
    }
    /**
     * Handles GET requests for SSE stream
     */
    async handleGetRequest(req) {
        // The client MUST include an Accept header, listing text/event-stream as a supported content type.
        const acceptHeader = req.headers.get('accept');
        if (!acceptHeader?.includes('text/event-stream')) {
            this.onerror?.(new Error('Not Acceptable: Client must accept text/event-stream'));
            return this.createJsonErrorResponse(406, -32e3, 'Not Acceptable: Client must accept text/event-stream');
        }
        // If an Mcp-Session-Id is returned by the server during initialization,
        // clients using the Streamable HTTP transport MUST include it
        // in the Mcp-Session-Id header on all of their subsequent HTTP requests.
        const sessionError = this.validateSession(req);
        if (sessionError) {
            return sessionError;
        }
        const protocolError = this.validateProtocolVersion(req);
        if (protocolError) {
            return protocolError;
        }
        // Handle resumability: check for Last-Event-ID header
        if (this._eventStore) {
            const lastEventId = req.headers.get('last-event-id');
            if (lastEventId) {
                return this.replayEvents(lastEventId);
            }
        }
        // Check if there's already an active standalone SSE stream for this session
        if (this._streamMapping.get(this._standaloneSseStreamId) !== undefined) {
            // Only one GET SSE stream is allowed per session
            this.onerror?.(new Error('Conflict: Only one SSE stream is allowed per session'));
            return this.createJsonErrorResponse(409, -32e3, 'Conflict: Only one SSE stream is allowed per session');
        }
        const encoder = new TextEncoder();
        let streamController;
        // Create a ReadableStream with a controller we can use to push SSE events
        const readable = new ReadableStream({
            start: controller => {
                streamController = controller;
            },
            cancel: () => {
                // Stream was cancelled by client
                this._streamMapping.delete(this._standaloneSseStreamId);
            }
        });
        const headers = {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive'
        };
        // After initialization, always include the session ID if we have one
        if (this.sessionId !== undefined) {
            headers['mcp-session-id'] = this.sessionId;
        }
        // Store the stream mapping with the controller for pushing data
        this._streamMapping.set(this._standaloneSseStreamId, {
            controller: streamController,
            encoder,
            cleanup: () => {
                this._streamMapping.delete(this._standaloneSseStreamId);
                try {
                    streamController.close();
                }
                catch {
                    // Controller might already be closed
                }
            }
        });
        return new Response(readable, { headers });
    }
    /**
     * Replays events that would have been sent after the specified event ID
     * Only used when resumability is enabled
     */
    async replayEvents(lastEventId) {
        if (!this._eventStore) {
            this.onerror?.(new Error('Event store not configured'));
            return this.createJsonErrorResponse(400, -32e3, 'Event store not configured');
        }
        try {
            // If getStreamIdForEventId is available, use it for conflict checking
            let streamId;
            if (this._eventStore.getStreamIdForEventId) {
                streamId = await this._eventStore.getStreamIdForEventId(lastEventId);
                if (!streamId) {
                    this.onerror?.(new Error('Invalid event ID format'));
                    return this.createJsonErrorResponse(400, -32000, 'Invalid event ID format');
                }
                // Check conflict with the SAME streamId we'll use for mapping
                if (this._streamMapping.get(streamId) !== undefined) {
                    this.onerror?.(new Error('Conflict: Stream already has an active connection'));
                    return this.createJsonErrorResponse(409, -32000, 'Conflict: Stream already has an active connection');
                }
            }
            const headers = {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive'
            };
            if (this.sessionId !== undefined) {
                headers['mcp-session-id'] = this.sessionId;
            }
            // Create a ReadableStream with controller for SSE
            const encoder = new TextEncoder();
            let streamController;
            const readable = new ReadableStream({
                start: controller => {
                    streamController = controller;
                },
                cancel: () => {
                    // Stream was cancelled by client
                    // Cleanup will be handled by the mapping
                }
            });
            // Replay events - returns the streamId for backwards compatibility
            const replayedStreamId = await this._eventStore.replayEventsAfter(lastEventId, {
                send: async (eventId, message) => {
                    const success = this.writeSSEEvent(streamController, encoder, message, eventId);
                    if (!success) {
                        this.onerror?.(new Error('Failed replay events'));
                        try {
                            streamController.close();
                        }
                        catch {
                            // Controller might already be closed
                        }
                    }
                }
            });
            this._streamMapping.set(replayedStreamId, {
                controller: streamController,
                encoder,
                cleanup: () => {
                    this._streamMapping.delete(replayedStreamId);
                    try {
                        streamController.close();
                    }
                    catch {
                        // Controller might already be closed
                    }
                }
            });
            return new Response(readable, { headers });
        }
        catch (error) {
            this.onerror?.(error);
            return this.createJsonErrorResponse(500, -32e3, 'Error replaying events');
        }
    }
    /**
     * Writes an event to an SSE stream via controller with proper formatting
     */
    writeSSEEvent(controller, encoder, message, eventId) {
        try {
            let eventData = `event: message\n`;
            // Include event ID if provided - this is important for resumability
            if (eventId) {
                eventData += `id: ${eventId}\n`;
            }
            eventData += `data: ${JSON.stringify(message)}\n\n`;
            controller.enqueue(encoder.encode(eventData));
            return true;
        }
        catch (error) {
            this.onerror?.(error);
            return false;
        }
    }
    /**
     * Handles unsupported requests (PUT, PATCH, etc.)
     */
    handleUnsupportedRequest() {
        this.onerror?.(new Error('Method not allowed.'));
        return new Response(JSON.stringify({
            jsonrpc: '2.0',
            error: {
                code: -32e3,
                message: 'Method not allowed.'
            },
            id: null
        }), {
            status: 405,
            headers: {
                Allow: 'GET, POST, DELETE',
                'Content-Type': 'application/json'
            }
        });
    }
    /**
     * Handles POST requests containing JSON-RPC messages
     */
    async handlePostRequest(req, options) {
        try {
            // Validate the Accept header
            const acceptHeader = req.headers.get('accept');
            // The client MUST include an Accept header, listing both application/json and text/event-stream as supported content types.
            if (!acceptHeader?.includes('application/json') || !acceptHeader.includes('text/event-stream')) {
                this.onerror?.(new Error('Not Acceptable: Client must accept both application/json and text/event-stream'));
                return this.createJsonErrorResponse(406, -32000, 'Not Acceptable: Client must accept both application/json and text/event-stream');
            }
            const ct = req.headers.get('content-type');
            if (!ct || !ct.includes('application/json')) {
                this.onerror?.(new Error('Unsupported Media Type: Content-Type must be application/json'));
                return this.createJsonErrorResponse(415, -32000, 'Unsupported Media Type: Content-Type must be application/json');
            }
            // Build request info from headers and URL
            const requestInfo = {
                headers: Object.fromEntries(req.headers.entries()),
                url: new URL(req.url)
            };
            let rawMessage;
            if (options?.parsedBody !== undefined) {
                rawMessage = options.parsedBody;
            }
            else {
                try {
                    rawMessage = await req.json();
                }
                catch {
                    this.onerror?.(new Error('Parse error: Invalid JSON'));
                    return this.createJsonErrorResponse(400, -32700, 'Parse error: Invalid JSON');
                }
            }
            let messages;
            // handle batch and single messages
            try {
                if (Array.isArray(rawMessage)) {
                    messages = rawMessage.map(msg => modelcontextprotocolSdk2.JSONRPCMessageSchema.parse(msg));
                }
                else {
                    messages = [modelcontextprotocolSdk2.JSONRPCMessageSchema.parse(rawMessage)];
                }
            }
            catch {
                this.onerror?.(new Error('Parse error: Invalid JSON-RPC message'));
                return this.createJsonErrorResponse(400, -32700, 'Parse error: Invalid JSON-RPC message');
            }
            // Check if this is an initialization request
            // https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/lifecycle/
            const isInitializationRequest = messages.some(modelcontextprotocolSdk2.isInitializeRequest);
            if (isInitializationRequest) {
                // If it's a server with session management and the session ID is already set we should reject the request
                // to avoid re-initialization.
                if (this._initialized && this.sessionId !== undefined) {
                    this.onerror?.(new Error('Invalid Request: Server already initialized'));
                    return this.createJsonErrorResponse(400, -32600, 'Invalid Request: Server already initialized');
                }
                if (messages.length > 1) {
                    this.onerror?.(new Error('Invalid Request: Only one initialization request is allowed'));
                    return this.createJsonErrorResponse(400, -32600, 'Invalid Request: Only one initialization request is allowed');
                }
                this.sessionId = this.sessionIdGenerator?.();
                this._initialized = true;
                // If we have a session ID and an onsessioninitialized handler, call it immediately
                // This is needed in cases where the server needs to keep track of multiple sessions
                if (this.sessionId && this._onsessioninitialized) {
                    await Promise.resolve(this._onsessioninitialized(this.sessionId));
                }
            }
            if (!isInitializationRequest) {
                // If an Mcp-Session-Id is returned by the server during initialization,
                // clients using the Streamable HTTP transport MUST include it
                // in the Mcp-Session-Id header on all of their subsequent HTTP requests.
                const sessionError = this.validateSession(req);
                if (sessionError) {
                    return sessionError;
                }
                // Mcp-Protocol-Version header is required for all requests after initialization.
                const protocolError = this.validateProtocolVersion(req);
                if (protocolError) {
                    return protocolError;
                }
            }
            // check if it contains requests
            const hasRequests = messages.some(modelcontextprotocolSdk2.isJSONRPCRequest);
            if (!hasRequests) {
                // if it only contains notifications or responses, return 202
                for (const message of messages) {
                    this.onmessage?.(message, { authInfo: options?.authInfo, requestInfo });
                }
                return new Response(null, { status: 202 });
            }
            // The default behavior is to use SSE streaming
            // but in some cases server will return JSON responses
            const streamId = crypto.randomUUID();
            // Extract protocol version for priming event decision.
            // For initialize requests, get from request params.
            // For other requests, get from header (already validated).
            const initRequest = messages.find(m => modelcontextprotocolSdk2.isInitializeRequest(m));
            const clientProtocolVersion = initRequest
                ? initRequest.params.protocolVersion
                : (req.headers.get('mcp-protocol-version') ?? modelcontextprotocolSdk2.DEFAULT_NEGOTIATED_PROTOCOL_VERSION);
            if (this._enableJsonResponse) {
                // For JSON response mode, return a Promise that resolves when all responses are ready
                return new Promise(resolve => {
                    this._streamMapping.set(streamId, {
                        resolveJson: resolve,
                        cleanup: () => {
                            this._streamMapping.delete(streamId);
                        }
                    });
                    for (const message of messages) {
                        if (modelcontextprotocolSdk2.isJSONRPCRequest(message)) {
                            this._requestToStreamMapping.set(message.id, streamId);
                        }
                    }
                    for (const message of messages) {
                        this.onmessage?.(message, { authInfo: options?.authInfo, requestInfo });
                    }
                });
            }
            // SSE streaming mode - use ReadableStream with controller for more reliable data pushing
            const encoder = new TextEncoder();
            let streamController;
            const readable = new ReadableStream({
                start: controller => {
                    streamController = controller;
                },
                cancel: () => {
                    // Stream was cancelled by client
                    this._streamMapping.delete(streamId);
                }
            });
            const headers = {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive'
            };
            // After initialization, always include the session ID if we have one
            if (this.sessionId !== undefined) {
                headers['mcp-session-id'] = this.sessionId;
            }
            // Store the response for this request to send messages back through this connection
            // We need to track by request ID to maintain the connection
            for (const message of messages) {
                if (modelcontextprotocolSdk2.isJSONRPCRequest(message)) {
                    this._streamMapping.set(streamId, {
                        controller: streamController,
                        encoder,
                        cleanup: () => {
                            this._streamMapping.delete(streamId);
                            try {
                                streamController.close();
                            }
                            catch {
                                // Controller might already be closed
                            }
                        }
                    });
                    this._requestToStreamMapping.set(message.id, streamId);
                }
            }
            // Write priming event if event store is configured (after mapping is set up)
            await this.writePrimingEvent(streamController, encoder, streamId, clientProtocolVersion);
            // handle each message
            for (const message of messages) {
                // Build closeSSEStream callback for requests when eventStore is configured
                // AND client supports resumability (protocol version >= 2025-11-25).
                // Old clients can't resume if the stream is closed early because they
                // didn't receive a priming event with an event ID.
                let closeSSEStream;
                let closeStandaloneSSEStream;
                if (modelcontextprotocolSdk2.isJSONRPCRequest(message) && this._eventStore && clientProtocolVersion >= '2025-11-25') {
                    closeSSEStream = () => {
                        this.closeSSEStream(message.id);
                    };
                    closeStandaloneSSEStream = () => {
                        this.closeStandaloneSSEStream();
                    };
                }
                this.onmessage?.(message, { authInfo: options?.authInfo, requestInfo, closeSSEStream, closeStandaloneSSEStream });
            }
            // The server SHOULD NOT close the SSE stream before sending all JSON-RPC responses
            // This will be handled by the send() method when responses are ready
            return new Response(readable, { status: 200, headers });
        }
        catch (error) {
            // return JSON-RPC formatted error
            this.onerror?.(error);
            return this.createJsonErrorResponse(400, -32700, 'Parse error', { data: String(error) });
        }
    }
    /**
     * Handles DELETE requests to terminate sessions
     */
    async handleDeleteRequest(req) {
        const sessionError = this.validateSession(req);
        if (sessionError) {
            return sessionError;
        }
        const protocolError = this.validateProtocolVersion(req);
        if (protocolError) {
            return protocolError;
        }
        await Promise.resolve(this._onsessionclosed?.(this.sessionId));
        await this.close();
        return new Response(null, { status: 200 });
    }
    /**
     * Validates session ID for non-initialization requests.
     * Returns Response error if invalid, undefined otherwise
     */
    validateSession(req) {
        if (this.sessionIdGenerator === undefined) {
            // If the sessionIdGenerator ID is not set, the session management is disabled
            // and we don't need to validate the session ID
            return undefined;
        }
        if (!this._initialized) {
            // If the server has not been initialized yet, reject all requests
            this.onerror?.(new Error('Bad Request: Server not initialized'));
            return this.createJsonErrorResponse(400, -32e3, 'Bad Request: Server not initialized');
        }
        const sessionId = req.headers.get('mcp-session-id');
        if (!sessionId) {
            // Non-initialization requests without a session ID should return 400 Bad Request
            this.onerror?.(new Error('Bad Request: Mcp-Session-Id header is required'));
            return this.createJsonErrorResponse(400, -32e3, 'Bad Request: Mcp-Session-Id header is required');
        }
        if (sessionId !== this.sessionId) {
            // Reject requests with invalid session ID with 404 Not Found
            this.onerror?.(new Error('Session not found'));
            return this.createJsonErrorResponse(404, -32001, 'Session not found');
        }
        return undefined;
    }
    /**
     * Validates the MCP-Protocol-Version header on incoming requests.
     *
     * For initialization: Version negotiation handles unknown versions gracefully
     * (server responds with its supported version).
     *
     * For subsequent requests with MCP-Protocol-Version header:
     * - Accept if in supported list
     * - 400 if unsupported
     *
     * For HTTP requests without the MCP-Protocol-Version header:
     * - Accept and default to the version negotiated at initialization
     */
    validateProtocolVersion(req) {
        const protocolVersion = req.headers.get('mcp-protocol-version');
        if (protocolVersion !== null && !modelcontextprotocolSdk2.SUPPORTED_PROTOCOL_VERSIONS.includes(protocolVersion)) {
            this.onerror?.(new Error(`Bad Request: Unsupported protocol version: ${protocolVersion}` +
                ` (supported versions: ${modelcontextprotocolSdk2.SUPPORTED_PROTOCOL_VERSIONS.join(', ')})`));
            return this.createJsonErrorResponse(400, -32e3, `Bad Request: Unsupported protocol version: ${protocolVersion} (supported versions: ${modelcontextprotocolSdk2.SUPPORTED_PROTOCOL_VERSIONS.join(', ')})`);
        }
        return undefined;
    }
    async close() {
        // Close all SSE connections
        this._streamMapping.forEach(({ cleanup }) => {
            cleanup();
        });
        this._streamMapping.clear();
        // Clear any pending responses
        this._requestResponseMap.clear();
        this.onclose?.();
    }
    /**
     * Close an SSE stream for a specific request, triggering client reconnection.
     * Use this to implement polling behavior during long-running operations -
     * client will reconnect after the retry interval specified in the priming event.
     */
    closeSSEStream(requestId) {
        const streamId = this._requestToStreamMapping.get(requestId);
        if (!streamId)
            return;
        const stream = this._streamMapping.get(streamId);
        if (stream) {
            stream.cleanup();
        }
    }
    /**
     * Close the standalone GET SSE stream, triggering client reconnection.
     * Use this to implement polling behavior for server-initiated notifications.
     */
    closeStandaloneSSEStream() {
        const stream = this._streamMapping.get(this._standaloneSseStreamId);
        if (stream) {
            stream.cleanup();
        }
    }
    async send(message, options) {
        let requestId = options?.relatedRequestId;
        if (modelcontextprotocolSdk2.isJSONRPCResultResponse(message) || modelcontextprotocolSdk2.isJSONRPCErrorResponse(message)) {
            // If the message is a response, use the request ID from the message
            requestId = message.id;
        }
        // Check if this message should be sent on the standalone SSE stream (no request ID)
        // Ignore notifications from tools (which have relatedRequestId set)
        // Those will be sent via dedicated response SSE streams
        if (requestId === undefined) {
            // For standalone SSE streams, we can only send requests and notifications
            if (modelcontextprotocolSdk2.isJSONRPCResultResponse(message) || modelcontextprotocolSdk2.isJSONRPCErrorResponse(message)) {
                throw new Error('Cannot send a response on a standalone SSE stream unless resuming a previous client request');
            }
            // Generate and store event ID if event store is provided
            // Store even if stream is disconnected so events can be replayed on reconnect
            let eventId;
            if (this._eventStore) {
                // Stores the event and gets the generated event ID
                eventId = await this._eventStore.storeEvent(this._standaloneSseStreamId, message);
            }
            const standaloneSse = this._streamMapping.get(this._standaloneSseStreamId);
            if (standaloneSse === undefined) {
                // Stream is disconnected - event is stored for replay, nothing more to do
                return;
            }
            // Send the message to the standalone SSE stream
            if (standaloneSse.controller && standaloneSse.encoder) {
                this.writeSSEEvent(standaloneSse.controller, standaloneSse.encoder, message, eventId);
            }
            return;
        }
        // Get the response for this request
        const streamId = this._requestToStreamMapping.get(requestId);
        if (!streamId) {
            throw new Error(`No connection established for request ID: ${String(requestId)}`);
        }
        const stream = this._streamMapping.get(streamId);
        if (!this._enableJsonResponse && stream?.controller && stream?.encoder) {
            // For SSE responses, generate event ID if event store is provided
            let eventId;
            if (this._eventStore) {
                eventId = await this._eventStore.storeEvent(streamId, message);
            }
            // Write the event to the response stream
            this.writeSSEEvent(stream.controller, stream.encoder, message, eventId);
        }
        if (modelcontextprotocolSdk2.isJSONRPCResultResponse(message) || modelcontextprotocolSdk2.isJSONRPCErrorResponse(message)) {
            this._requestResponseMap.set(requestId, message);
            const relatedIds = Array.from(this._requestToStreamMapping.entries())
                .filter(([_, sid]) => sid === streamId)
                .map(([id]) => id);
            // Check if we have responses for all requests using this connection
            const allResponsesReady = relatedIds.every(id => this._requestResponseMap.has(id));
            if (allResponsesReady) {
                if (!stream) {
                    throw new Error(`No connection established for request ID: ${String(requestId)}`);
                }
                if (this._enableJsonResponse && stream.resolveJson) {
                    // All responses ready, send as JSON
                    const headers = {
                        'Content-Type': 'application/json'
                    };
                    if (this.sessionId !== undefined) {
                        headers['mcp-session-id'] = this.sessionId;
                    }
                    const responses = relatedIds.map(id => this._requestResponseMap.get(id));
                    if (responses.length === 1) {
                        stream.resolveJson(new Response(JSON.stringify(responses[0]), { status: 200, headers }));
                    }
                    else {
                        stream.resolveJson(new Response(JSON.stringify(responses), { status: 200, headers }));
                    }
                }
                else {
                    // End the SSE stream
                    stream.cleanup();
                }
                // Clean up
                for (const id of relatedIds) {
                    this._requestResponseMap.delete(id);
                    this._requestToStreamMapping.delete(id);
                }
            }
        }
    }
}

/**
 * Node.js HTTP Streamable HTTP Server Transport
 *
 * This is a thin wrapper around `WebStandardStreamableHTTPServerTransport` that provides
 * compatibility with Node.js HTTP server (IncomingMessage/ServerResponse).
 *
 * For web-standard environments (Cloudflare Workers, Deno, Bun), use `WebStandardStreamableHTTPServerTransport` directly.
 */
/**
 * Server transport for Streamable HTTP: this implements the MCP Streamable HTTP transport specification.
 * It supports both SSE streaming and direct HTTP responses.
 *
 * This is a wrapper around `WebStandardStreamableHTTPServerTransport` that provides Node.js HTTP compatibility.
 * It uses the `@hono/node-server` library to convert between Node.js HTTP and Web Standard APIs.
 *
 * Usage example:
 *
 * ```typescript
 * // Stateful mode - server sets the session ID
 * const statefulTransport = new StreamableHTTPServerTransport({
 *   sessionIdGenerator: () => randomUUID(),
 * });
 *
 * // Stateless mode - explicitly set session ID to undefined
 * const statelessTransport = new StreamableHTTPServerTransport({
 *   sessionIdGenerator: undefined,
 * });
 *
 * // Using with pre-parsed request body
 * app.post('/mcp', (req, res) => {
 *   transport.handleRequest(req, res, req.body);
 * });
 * ```
 *
 * In stateful mode:
 * - Session ID is generated and included in response headers
 * - Session ID is always included in initialization responses
 * - Requests with invalid session IDs are rejected with 404 Not Found
 * - Non-initialization requests without a session ID are rejected with 400 Bad Request
 * - State is maintained in-memory (connections, message history)
 *
 * In stateless mode:
 * - No Session ID is included in any responses
 * - No session validation is performed
 */
class StreamableHTTPServerTransport {
    constructor(options = {}) {
        // Store auth and parsedBody per request for passing through to handleRequest
        this._requestContext = new WeakMap();
        this._webStandardTransport = new WebStandardStreamableHTTPServerTransport(options);
        // Create a request listener that wraps the web standard transport
        // getRequestListener converts Node.js HTTP to Web Standard and properly handles SSE streaming
        // overrideGlobalObjects: false prevents Hono from overwriting global Response, which would
        // break frameworks like Next.js whose response classes extend the native Response
        this._requestListener = honoNodeServer1.getRequestListener(async (webRequest) => {
            // Get context if available (set during handleRequest)
            const context = this._requestContext.get(webRequest);
            return this._webStandardTransport.handleRequest(webRequest, {
                authInfo: context?.authInfo,
                parsedBody: context?.parsedBody
            });
        }, { overrideGlobalObjects: false });
    }
    /**
     * Gets the session ID for this transport instance.
     */
    get sessionId() {
        return this._webStandardTransport.sessionId;
    }
    /**
     * Sets callback for when the transport is closed.
     */
    set onclose(handler) {
        this._webStandardTransport.onclose = handler;
    }
    get onclose() {
        return this._webStandardTransport.onclose;
    }
    /**
     * Sets callback for transport errors.
     */
    set onerror(handler) {
        this._webStandardTransport.onerror = handler;
    }
    get onerror() {
        return this._webStandardTransport.onerror;
    }
    /**
     * Sets callback for incoming messages.
     */
    set onmessage(handler) {
        this._webStandardTransport.onmessage = handler;
    }
    get onmessage() {
        return this._webStandardTransport.onmessage;
    }
    /**
     * Starts the transport. This is required by the Transport interface but is a no-op
     * for the Streamable HTTP transport as connections are managed per-request.
     */
    async start() {
        return this._webStandardTransport.start();
    }
    /**
     * Closes the transport and all active connections.
     */
    async close() {
        return this._webStandardTransport.close();
    }
    /**
     * Sends a JSON-RPC message through the transport.
     */
    async send(message, options) {
        return this._webStandardTransport.send(message, options);
    }
    /**
     * Handles an incoming HTTP request, whether GET or POST.
     *
     * This method converts Node.js HTTP objects to Web Standard Request/Response
     * and delegates to the underlying WebStandardStreamableHTTPServerTransport.
     *
     * @param req - Node.js IncomingMessage, optionally with auth property from middleware
     * @param res - Node.js ServerResponse
     * @param parsedBody - Optional pre-parsed body from body-parser middleware
     */
    async handleRequest(req, res, parsedBody) {
        // Store context for this request to pass through auth and parsedBody
        // We need to intercept the request creation to attach this context
        const authInfo = req.auth;
        // Create a custom handler that includes our context
        // overrideGlobalObjects: false prevents Hono from overwriting global Response, which would
        // break frameworks like Next.js whose response classes extend the native Response
        const handler = honoNodeServer1.getRequestListener(async (webRequest) => {
            return this._webStandardTransport.handleRequest(webRequest, {
                authInfo,
                parsedBody
            });
        }, { overrideGlobalObjects: false });
        // Delegate to the request listener which handles all the Node.js <-> Web Standard conversion
        // including proper SSE streaming support
        await handler(req, res);
    }
    /**
     * Close an SSE stream for a specific request, triggering client reconnection.
     * Use this to implement polling behavior during long-running operations -
     * client will reconnect after the retry interval specified in the priming event.
     */
    closeSSEStream(requestId) {
        this._webStandardTransport.closeSSEStream(requestId);
    }
    /**
     * Close the standalone GET SSE stream, triggering client reconnection.
     * Use this to implement polling behavior for server-initiated notifications.
     */
    closeStandaloneSSEStream() {
        this._webStandardTransport.closeStandaloneSSEStream();
    }
}

exports.Server = Server;
exports.StdioServerTransport = StdioServerTransport;
exports.StreamableHTTPServerTransport = StreamableHTTPServerTransport;
