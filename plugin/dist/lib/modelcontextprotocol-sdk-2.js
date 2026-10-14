'use strict';

const zod1 = require('./zod-1.js');
const omitted1 = require('./omitted-1.js');
const ajv1 = require('./ajv-1.js');
const ajvFormats1 = require('./ajv-formats-1.js');

const LATEST_PROTOCOL_VERSION = '2025-11-25';
const DEFAULT_NEGOTIATED_PROTOCOL_VERSION = '2025-03-26';
const SUPPORTED_PROTOCOL_VERSIONS = [LATEST_PROTOCOL_VERSION, '2025-06-18', '2025-03-26', '2024-11-05', '2024-10-07'];
const RELATED_TASK_META_KEY = 'io.modelcontextprotocol/related-task';
/* JSON-RPC types */
const JSONRPC_VERSION = '2.0';
/**
 * Assert 'object' type schema.
 *
 * @internal
 */
const AssertObjectSchema = zod1.custom((v) => v !== null && (typeof v === 'object' || typeof v === 'function'));
/**
 * A progress token, used to associate progress notifications with the original request.
 */
const ProgressTokenSchema = zod1.union([zod1.string(), zod1.number().int()]);
/**
 * An opaque token used to represent a cursor for pagination.
 */
const CursorSchema = zod1.string();
/**
 * Task creation parameters, used to ask that the server create a task to represent a request.
 */
zod1.looseObject({
    /**
     * Requested duration in milliseconds to retain task from creation.
     */
    ttl: zod1.number().optional(),
    /**
     * Time in milliseconds to wait between task status requests.
     */
    pollInterval: zod1.number().optional()
});
const TaskMetadataSchema = zod1.object({
    ttl: zod1.number().optional()
});
/**
 * Metadata for associating messages with a task.
 * Include this in the `_meta` field under the key `io.modelcontextprotocol/related-task`.
 */
const RelatedTaskMetadataSchema = zod1.object({
    taskId: zod1.string()
});
const RequestMetaSchema = zod1.looseObject({
    /**
     * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
     */
    progressToken: ProgressTokenSchema.optional(),
    /**
     * If specified, this request is related to the provided task.
     */
    [RELATED_TASK_META_KEY]: RelatedTaskMetadataSchema.optional()
});
/**
 * Common params for any request.
 */
const BaseRequestParamsSchema = zod1.object({
    /**
     * See [General fields: `_meta`](/specification/draft/basic/index#meta) for notes on `_meta` usage.
     */
    _meta: RequestMetaSchema.optional()
});
/**
 * Common params for any task-augmented request.
 */
const TaskAugmentedRequestParamsSchema = BaseRequestParamsSchema.extend({
    /**
     * If specified, the caller is requesting task-augmented execution for this request.
     * The request will return a CreateTaskResult immediately, and the actual result can be
     * retrieved later via tasks/result.
     *
     * Task augmentation is subject to capability negotiation - receivers MUST declare support
     * for task augmentation of specific request types in their capabilities.
     */
    task: TaskMetadataSchema.optional()
});
/**
 * Checks if a value is a valid TaskAugmentedRequestParams.
 * @param value - The value to check.
 *
 * @returns True if the value is a valid TaskAugmentedRequestParams, false otherwise.
 */
const isTaskAugmentedRequestParams = (value) => TaskAugmentedRequestParamsSchema.safeParse(value).success;
const RequestSchema = zod1.object({
    method: zod1.string(),
    params: BaseRequestParamsSchema.loose().optional()
});
const NotificationsParamsSchema = zod1.object({
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: RequestMetaSchema.optional()
});
const NotificationSchema = zod1.object({
    method: zod1.string(),
    params: NotificationsParamsSchema.loose().optional()
});
const ResultSchema = zod1.looseObject({
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: RequestMetaSchema.optional()
});
/**
 * A uniquely identifying ID for a request in JSON-RPC.
 */
const RequestIdSchema = zod1.union([zod1.string(), zod1.number().int()]);
/**
 * A request that expects a response.
 */
const JSONRPCRequestSchema = zod1.object({
    jsonrpc: zod1.literal(JSONRPC_VERSION),
    id: RequestIdSchema,
    ...RequestSchema.shape
})
    .strict();
const isJSONRPCRequest = (value) => JSONRPCRequestSchema.safeParse(value).success;
/**
 * A notification which does not expect a response.
 */
const JSONRPCNotificationSchema = zod1.object({
    jsonrpc: zod1.literal(JSONRPC_VERSION),
    ...NotificationSchema.shape
})
    .strict();
const isJSONRPCNotification = (value) => JSONRPCNotificationSchema.safeParse(value).success;
/**
 * A successful (non-error) response to a request.
 */
const JSONRPCResultResponseSchema = zod1.object({
    jsonrpc: zod1.literal(JSONRPC_VERSION),
    id: RequestIdSchema,
    result: ResultSchema
})
    .strict();
/**
 * Checks if a value is a valid JSONRPCResultResponse.
 * @param value - The value to check.
 *
 * @returns True if the value is a valid JSONRPCResultResponse, false otherwise.
 */
const isJSONRPCResultResponse = (value) => JSONRPCResultResponseSchema.safeParse(value).success;
/**
 * Error codes defined by the JSON-RPC specification.
 */
exports.ErrorCode = void 0;
(function (ErrorCode) {
    // SDK error codes
    ErrorCode[ErrorCode["ConnectionClosed"] = -32e3] = "ConnectionClosed";
    ErrorCode[ErrorCode["RequestTimeout"] = -32001] = "RequestTimeout";
    // Standard JSON-RPC error codes
    ErrorCode[ErrorCode["ParseError"] = -32700] = "ParseError";
    ErrorCode[ErrorCode["InvalidRequest"] = -32600] = "InvalidRequest";
    ErrorCode[ErrorCode["MethodNotFound"] = -32601] = "MethodNotFound";
    ErrorCode[ErrorCode["InvalidParams"] = -32602] = "InvalidParams";
    ErrorCode[ErrorCode["InternalError"] = -32603] = "InternalError";
    // MCP-specific error codes
    ErrorCode[ErrorCode["UrlElicitationRequired"] = -32042] = "UrlElicitationRequired";
})(exports.ErrorCode || (exports.ErrorCode = {}));
/**
 * A response to a request that indicates an error occurred.
 */
const JSONRPCErrorResponseSchema = zod1.object({
    jsonrpc: zod1.literal(JSONRPC_VERSION),
    id: RequestIdSchema.optional(),
    error: zod1.object({
        /**
         * The error type that occurred.
         */
        code: zod1.number().int(),
        /**
         * A short description of the error. The message SHOULD be limited to a concise single sentence.
         */
        message: zod1.string(),
        /**
         * Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
         */
        data: zod1.unknown().optional()
    })
})
    .strict();
/**
 * Checks if a value is a valid JSONRPCErrorResponse.
 * @param value - The value to check.
 *
 * @returns True if the value is a valid JSONRPCErrorResponse, false otherwise.
 */
const isJSONRPCErrorResponse = (value) => JSONRPCErrorResponseSchema.safeParse(value).success;
const JSONRPCMessageSchema = zod1.union([
    JSONRPCRequestSchema,
    JSONRPCNotificationSchema,
    JSONRPCResultResponseSchema,
    JSONRPCErrorResponseSchema
]);
zod1.union([JSONRPCResultResponseSchema, JSONRPCErrorResponseSchema]);
/* Empty result */
/**
 * A response that indicates success but carries no data.
 */
const EmptyResultSchema = ResultSchema.strict();
const CancelledNotificationParamsSchema = NotificationsParamsSchema.extend({
    /**
     * The ID of the request to cancel.
     *
     * This MUST correspond to the ID of a request previously issued in the same direction.
     */
    requestId: RequestIdSchema.optional(),
    /**
     * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
     */
    reason: zod1.string().optional()
});
/* Cancellation */
/**
 * This notification can be sent by either side to indicate that it is cancelling a previously-issued request.
 *
 * The request SHOULD still be in-flight, but due to communication latency, it is always possible that this notification MAY arrive after the request has already finished.
 *
 * This notification indicates that the result will be unused, so any associated processing SHOULD cease.
 *
 * A client MUST NOT attempt to cancel its `initialize` request.
 */
const CancelledNotificationSchema = NotificationSchema.extend({
    method: zod1.literal('notifications/cancelled'),
    params: CancelledNotificationParamsSchema
});
/* Base Metadata */
/**
 * Icon schema for use in tools, prompts, resources, and implementations.
 */
const IconSchema = zod1.object({
    /**
     * URL or data URI for the icon.
     */
    src: zod1.string(),
    /**
     * Optional MIME type for the icon.
     */
    mimeType: zod1.string().optional(),
    /**
     * Optional array of strings that specify sizes at which the icon can be used.
     * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
     *
     * If not provided, the client should assume that the icon can be used at any size.
     */
    sizes: zod1.array(zod1.string()).optional(),
    /**
     * Optional specifier for the theme this icon is designed for. `light` indicates
     * the icon is designed to be used with a light background, and `dark` indicates
     * the icon is designed to be used with a dark background.
     *
     * If not provided, the client should assume the icon can be used with any theme.
     */
    theme: zod1._enum(['light', 'dark']).optional()
});
/**
 * Base schema to add `icons` property.
 *
 */
const IconsSchema = zod1.object({
    /**
     * Optional set of sized icons that the client can display in a user interface.
     *
     * Clients that support rendering icons MUST support at least the following MIME types:
     * - `image/png` - PNG images (safe, universal compatibility)
     * - `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)
     *
     * Clients that support rendering icons SHOULD also support:
     * - `image/svg+xml` - SVG images (scalable but requires security precautions)
     * - `image/webp` - WebP images (modern, efficient format)
     */
    icons: zod1.array(IconSchema).optional()
});
/**
 * Base metadata interface for common properties across resources, tools, prompts, and implementations.
 */
const BaseMetadataSchema = zod1.object({
    /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
    name: zod1.string(),
    /**
     * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
     * even by those unfamiliar with domain-specific terminology.
     *
     * If not provided, the name should be used for display (except for Tool,
     * where `annotations.title` should be given precedence over using `name`,
     * if present).
     */
    title: zod1.string().optional()
});
/* Initialization */
/**
 * Describes the name and version of an MCP implementation.
 */
const ImplementationSchema = BaseMetadataSchema.extend({
    ...BaseMetadataSchema.shape,
    ...IconsSchema.shape,
    version: zod1.string(),
    /**
     * An optional URL of the website for this implementation.
     */
    websiteUrl: zod1.string().optional(),
    /**
     * An optional human-readable description of what this implementation does.
     *
     * This can be used by clients or servers to provide context about their purpose
     * and capabilities. For example, a server might describe the types of resources
     * or tools it provides, while a client might describe its intended use case.
     */
    description: zod1.string().optional()
});
const FormElicitationCapabilitySchema = zod1.intersection(zod1.object({
    applyDefaults: zod1.boolean().optional()
}), zod1.record(zod1.string(), zod1.unknown()));
const ElicitationCapabilitySchema = zod1.preprocess(value => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (Object.keys(value).length === 0) {
            return { form: {} };
        }
    }
    return value;
}, zod1.intersection(zod1.object({
    form: FormElicitationCapabilitySchema.optional(),
    url: AssertObjectSchema.optional()
}), zod1.record(zod1.string(), zod1.unknown()).optional()));
/**
 * Task capabilities for clients, indicating which request types support task creation.
 */
const ClientTasksCapabilitySchema = zod1.looseObject({
    /**
     * Present if the client supports listing tasks.
     */
    list: AssertObjectSchema.optional(),
    /**
     * Present if the client supports cancelling tasks.
     */
    cancel: AssertObjectSchema.optional(),
    /**
     * Capabilities for task creation on specific request types.
     */
    requests: zod1.looseObject({
        /**
         * Task support for sampling requests.
         */
        sampling: zod1.looseObject({
            createMessage: AssertObjectSchema.optional()
        })
            .optional(),
        /**
         * Task support for elicitation requests.
         */
        elicitation: zod1.looseObject({
            create: AssertObjectSchema.optional()
        })
            .optional()
    })
        .optional()
});
/**
 * Task capabilities for servers, indicating which request types support task creation.
 */
const ServerTasksCapabilitySchema = zod1.looseObject({
    /**
     * Present if the server supports listing tasks.
     */
    list: AssertObjectSchema.optional(),
    /**
     * Present if the server supports cancelling tasks.
     */
    cancel: AssertObjectSchema.optional(),
    /**
     * Capabilities for task creation on specific request types.
     */
    requests: zod1.looseObject({
        /**
         * Task support for tool requests.
         */
        tools: zod1.looseObject({
            call: AssertObjectSchema.optional()
        })
            .optional()
    })
        .optional()
});
/**
 * Capabilities a client may support. Known capabilities are defined here, in this schema, but this is not a closed set: any client can define its own, additional capabilities.
 */
const ClientCapabilitiesSchema = zod1.object({
    /**
     * Experimental, non-standard capabilities that the client supports.
     */
    experimental: zod1.record(zod1.string(), AssertObjectSchema).optional(),
    /**
     * Present if the client supports sampling from an LLM.
     */
    sampling: zod1.object({
        /**
         * Present if the client supports context inclusion via includeContext parameter.
         * If not declared, servers SHOULD only use `includeContext: "none"` (or omit it).
         */
        context: AssertObjectSchema.optional(),
        /**
         * Present if the client supports tool use via tools and toolChoice parameters.
         */
        tools: AssertObjectSchema.optional()
    })
        .optional(),
    /**
     * Present if the client supports eliciting user input.
     */
    elicitation: ElicitationCapabilitySchema.optional(),
    /**
     * Present if the client supports listing roots.
     */
    roots: zod1.object({
        /**
         * Whether the client supports issuing notifications for changes to the roots list.
         */
        listChanged: zod1.boolean().optional()
    })
        .optional(),
    /**
     * Present if the client supports task creation.
     */
    tasks: ClientTasksCapabilitySchema.optional(),
    /**
     * Extensions that the client supports. Keys are extension identifiers (vendor-prefix/extension-name).
     */
    extensions: zod1.record(zod1.string(), AssertObjectSchema).optional()
});
const InitializeRequestParamsSchema = BaseRequestParamsSchema.extend({
    /**
     * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
     */
    protocolVersion: zod1.string(),
    capabilities: ClientCapabilitiesSchema,
    clientInfo: ImplementationSchema
});
/**
 * This request is sent from the client to the server when it first connects, asking it to begin initialization.
 */
const InitializeRequestSchema = RequestSchema.extend({
    method: zod1.literal('initialize'),
    params: InitializeRequestParamsSchema
});
const isInitializeRequest = (value) => InitializeRequestSchema.safeParse(value).success;
/**
 * Capabilities that a server may support. Known capabilities are defined here, in this schema, but this is not a closed set: any server can define its own, additional capabilities.
 */
const ServerCapabilitiesSchema = zod1.object({
    /**
     * Experimental, non-standard capabilities that the server supports.
     */
    experimental: zod1.record(zod1.string(), AssertObjectSchema).optional(),
    /**
     * Present if the server supports sending log messages to the client.
     */
    logging: AssertObjectSchema.optional(),
    /**
     * Present if the server supports sending completions to the client.
     */
    completions: AssertObjectSchema.optional(),
    /**
     * Present if the server offers any prompt templates.
     */
    prompts: zod1.object({
        /**
         * Whether this server supports issuing notifications for changes to the prompt list.
         */
        listChanged: zod1.boolean().optional()
    })
        .optional(),
    /**
     * Present if the server offers any resources to read.
     */
    resources: zod1.object({
        /**
         * Whether this server supports clients subscribing to resource updates.
         */
        subscribe: zod1.boolean().optional(),
        /**
         * Whether this server supports issuing notifications for changes to the resource list.
         */
        listChanged: zod1.boolean().optional()
    })
        .optional(),
    /**
     * Present if the server offers any tools to call.
     */
    tools: zod1.object({
        /**
         * Whether this server supports issuing notifications for changes to the tool list.
         */
        listChanged: zod1.boolean().optional()
    })
        .optional(),
    /**
     * Present if the server supports task creation.
     */
    tasks: ServerTasksCapabilitySchema.optional(),
    /**
     * Extensions that the server supports. Keys are extension identifiers (vendor-prefix/extension-name).
     */
    extensions: zod1.record(zod1.string(), AssertObjectSchema).optional()
});
/**
 * After receiving an initialize request from the client, the server sends this response.
 */
const InitializeResultSchema = ResultSchema.extend({
    /**
     * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
     */
    protocolVersion: zod1.string(),
    capabilities: ServerCapabilitiesSchema,
    serverInfo: ImplementationSchema,
    /**
     * Instructions describing how to use the server and its features.
     *
     * This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
     */
    instructions: zod1.string().optional()
});
/**
 * This notification is sent from the client to the server after initialization has finished.
 */
const InitializedNotificationSchema = NotificationSchema.extend({
    method: zod1.literal('notifications/initialized'),
    params: NotificationsParamsSchema.optional()
});
/* Ping */
/**
 * A ping, issued by either the server or the client, to check that the other party is still alive. The receiver must promptly respond, or else may be disconnected.
 */
const PingRequestSchema = RequestSchema.extend({
    method: zod1.literal('ping'),
    params: BaseRequestParamsSchema.optional()
});
/* Progress notifications */
const ProgressSchema = zod1.object({
    /**
     * The progress thus far. This should increase every time progress is made, even if the total is unknown.
     */
    progress: zod1.number(),
    /**
     * Total number of items to process (or total progress required), if known.
     */
    total: zod1.optional(zod1.number()),
    /**
     * An optional message describing the current progress.
     */
    message: zod1.optional(zod1.string())
});
const ProgressNotificationParamsSchema = zod1.object({
    ...NotificationsParamsSchema.shape,
    ...ProgressSchema.shape,
    /**
     * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
     */
    progressToken: ProgressTokenSchema
});
/**
 * An out-of-band notification used to inform the receiver of a progress update for a long-running request.
 *
 * @category notifications/progress
 */
const ProgressNotificationSchema = NotificationSchema.extend({
    method: zod1.literal('notifications/progress'),
    params: ProgressNotificationParamsSchema
});
const PaginatedRequestParamsSchema = BaseRequestParamsSchema.extend({
    /**
     * An opaque token representing the current pagination position.
     * If provided, the server should return results starting after this cursor.
     */
    cursor: CursorSchema.optional()
});
/* Pagination */
const PaginatedRequestSchema = RequestSchema.extend({
    params: PaginatedRequestParamsSchema.optional()
});
const PaginatedResultSchema = ResultSchema.extend({
    /**
     * An opaque token representing the pagination position after the last returned result.
     * If present, there may be more results available.
     */
    nextCursor: CursorSchema.optional()
});
/**
 * The status of a task.
 * */
const TaskStatusSchema = zod1._enum(['working', 'input_required', 'completed', 'failed', 'cancelled']);
/* Tasks */
/**
 * A pollable state object associated with a request.
 */
const TaskSchema = zod1.object({
    taskId: zod1.string(),
    status: TaskStatusSchema,
    /**
     * Time in milliseconds to keep task results available after completion.
     * If null, the task has unlimited lifetime until manually cleaned up.
     */
    ttl: zod1.union([zod1.number(), zod1._null()]),
    /**
     * ISO 8601 timestamp when the task was created.
     */
    createdAt: zod1.string(),
    /**
     * ISO 8601 timestamp when the task was last updated.
     */
    lastUpdatedAt: zod1.string(),
    pollInterval: zod1.optional(zod1.number()),
    /**
     * Optional diagnostic message for failed tasks or other status information.
     */
    statusMessage: zod1.optional(zod1.string())
});
/**
 * Result returned when a task is created, containing the task data wrapped in a task field.
 */
const CreateTaskResultSchema = ResultSchema.extend({
    task: TaskSchema
});
/**
 * Parameters for task status notification.
 */
const TaskStatusNotificationParamsSchema = NotificationsParamsSchema.merge(TaskSchema);
/**
 * A notification sent when a task's status changes.
 */
const TaskStatusNotificationSchema = NotificationSchema.extend({
    method: zod1.literal('notifications/tasks/status'),
    params: TaskStatusNotificationParamsSchema
});
/**
 * A request to get the state of a specific task.
 */
const GetTaskRequestSchema = RequestSchema.extend({
    method: zod1.literal('tasks/get'),
    params: BaseRequestParamsSchema.extend({
        taskId: zod1.string()
    })
});
/**
 * The response to a tasks/get request.
 */
const GetTaskResultSchema = ResultSchema.merge(TaskSchema);
/**
 * A request to get the result of a specific task.
 */
const GetTaskPayloadRequestSchema = RequestSchema.extend({
    method: zod1.literal('tasks/result'),
    params: BaseRequestParamsSchema.extend({
        taskId: zod1.string()
    })
});
/**
 * The response to a tasks/result request.
 * The structure matches the result type of the original request.
 * For example, a tools/call task would return the CallToolResult structure.
 *
 */
ResultSchema.loose();
/**
 * A request to list tasks.
 */
const ListTasksRequestSchema = PaginatedRequestSchema.extend({
    method: zod1.literal('tasks/list')
});
/**
 * The response to a tasks/list request.
 */
const ListTasksResultSchema = PaginatedResultSchema.extend({
    tasks: zod1.array(TaskSchema)
});
/**
 * A request to cancel a specific task.
 */
const CancelTaskRequestSchema = RequestSchema.extend({
    method: zod1.literal('tasks/cancel'),
    params: BaseRequestParamsSchema.extend({
        taskId: zod1.string()
    })
});
/**
 * The response to a tasks/cancel request.
 */
const CancelTaskResultSchema = ResultSchema.merge(TaskSchema);
/* Resources */
/**
 * The contents of a specific resource or sub-resource.
 */
const ResourceContentsSchema = zod1.object({
    /**
     * The URI of this resource.
     */
    uri: zod1.string(),
    /**
     * The MIME type of this resource, if known.
     */
    mimeType: zod1.optional(zod1.string()),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: zod1.record(zod1.string(), zod1.unknown()).optional()
});
const TextResourceContentsSchema = ResourceContentsSchema.extend({
    /**
     * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
     */
    text: zod1.string()
});
/**
 * A Zod schema for validating Base64 strings that is more performant and
 * robust for very large inputs than the default regex-based check. It avoids
 * stack overflows by using the native `atob` function for validation.
 */
const Base64Schema = zod1.string().refine(val => {
    try {
        // atob throws a DOMException if the string contains characters
        // that are not part of the Base64 character set.
        atob(val);
        return true;
    }
    catch {
        return false;
    }
}, { message: 'Invalid Base64 string' });
const BlobResourceContentsSchema = ResourceContentsSchema.extend({
    /**
     * A base64-encoded string representing the binary data of the item.
     */
    blob: Base64Schema
});
/**
 * The sender or recipient of messages and data in a conversation.
 */
const RoleSchema = zod1._enum(['user', 'assistant']);
/**
 * Optional annotations providing clients additional context about a resource.
 */
const AnnotationsSchema = zod1.object({
    /**
     * Intended audience(s) for the resource.
     */
    audience: zod1.array(RoleSchema).optional(),
    /**
     * Importance hint for the resource, from 0 (least) to 1 (most).
     */
    priority: zod1.number().min(0).max(1).optional(),
    /**
     * ISO 8601 timestamp for the most recent modification.
     */
    lastModified: zod1.datetime({ offset: true }).optional()
});
/**
 * A known resource that the server is capable of reading.
 */
const ResourceSchema = zod1.object({
    ...BaseMetadataSchema.shape,
    ...IconsSchema.shape,
    /**
     * The URI of this resource.
     */
    uri: zod1.string(),
    /**
     * A description of what this resource represents.
     *
     * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
     */
    description: zod1.optional(zod1.string()),
    /**
     * The MIME type of this resource, if known.
     */
    mimeType: zod1.optional(zod1.string()),
    /**
     * The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.
     *
     * This can be used by Hosts to display file sizes and estimate context window usage.
     */
    size: zod1.optional(zod1.number()),
    /**
     * Optional annotations for the client.
     */
    annotations: AnnotationsSchema.optional(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: zod1.optional(zod1.looseObject({}))
});
/**
 * A template description for resources available on the server.
 */
const ResourceTemplateSchema = zod1.object({
    ...BaseMetadataSchema.shape,
    ...IconsSchema.shape,
    /**
     * A URI template (according to RFC 6570) that can be used to construct resource URIs.
     */
    uriTemplate: zod1.string(),
    /**
     * A description of what this template is for.
     *
     * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
     */
    description: zod1.optional(zod1.string()),
    /**
     * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
     */
    mimeType: zod1.optional(zod1.string()),
    /**
     * Optional annotations for the client.
     */
    annotations: AnnotationsSchema.optional(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: zod1.optional(zod1.looseObject({}))
});
/**
 * Sent from the client to request a list of resources the server has.
 */
const ListResourcesRequestSchema = PaginatedRequestSchema.extend({
    method: zod1.literal('resources/list')
});
/**
 * The server's response to a resources/list request from the client.
 */
const ListResourcesResultSchema = PaginatedResultSchema.extend({
    resources: zod1.array(ResourceSchema)
});
/**
 * Sent from the client to request a list of resource templates the server has.
 */
const ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({
    method: zod1.literal('resources/templates/list')
});
/**
 * The server's response to a resources/templates/list request from the client.
 */
const ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({
    resourceTemplates: zod1.array(ResourceTemplateSchema)
});
const ResourceRequestParamsSchema = BaseRequestParamsSchema.extend({
    /**
     * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
     *
     * @format uri
     */
    uri: zod1.string()
});
/**
 * Parameters for a `resources/read` request.
 */
const ReadResourceRequestParamsSchema = ResourceRequestParamsSchema;
/**
 * Sent from the client to the server, to read a specific resource URI.
 */
const ReadResourceRequestSchema = RequestSchema.extend({
    method: zod1.literal('resources/read'),
    params: ReadResourceRequestParamsSchema
});
/**
 * The server's response to a resources/read request from the client.
 */
const ReadResourceResultSchema = ResultSchema.extend({
    contents: zod1.array(zod1.union([TextResourceContentsSchema, BlobResourceContentsSchema]))
});
/**
 * An optional notification from the server to the client, informing it that the list of resources it can read from has changed. This may be issued by servers without any previous subscription from the client.
 */
const ResourceListChangedNotificationSchema = NotificationSchema.extend({
    method: zod1.literal('notifications/resources/list_changed'),
    params: NotificationsParamsSchema.optional()
});
const SubscribeRequestParamsSchema = ResourceRequestParamsSchema;
/**
 * Sent from the client to request resources/updated notifications from the server whenever a particular resource changes.
 */
const SubscribeRequestSchema = RequestSchema.extend({
    method: zod1.literal('resources/subscribe'),
    params: SubscribeRequestParamsSchema
});
const UnsubscribeRequestParamsSchema = ResourceRequestParamsSchema;
/**
 * Sent from the client to request cancellation of resources/updated notifications from the server. This should follow a previous resources/subscribe request.
 */
const UnsubscribeRequestSchema = RequestSchema.extend({
    method: zod1.literal('resources/unsubscribe'),
    params: UnsubscribeRequestParamsSchema
});
/**
 * Parameters for a `notifications/resources/updated` notification.
 */
const ResourceUpdatedNotificationParamsSchema = NotificationsParamsSchema.extend({
    /**
     * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
     */
    uri: zod1.string()
});
/**
 * A notification from the server to the client, informing it that a resource has changed and may need to be read again. This should only be sent if the client previously sent a resources/subscribe request.
 */
const ResourceUpdatedNotificationSchema = NotificationSchema.extend({
    method: zod1.literal('notifications/resources/updated'),
    params: ResourceUpdatedNotificationParamsSchema
});
/* Prompts */
/**
 * Describes an argument that a prompt can accept.
 */
const PromptArgumentSchema = zod1.object({
    /**
     * The name of the argument.
     */
    name: zod1.string(),
    /**
     * A human-readable description of the argument.
     */
    description: zod1.optional(zod1.string()),
    /**
     * Whether this argument must be provided.
     */
    required: zod1.optional(zod1.boolean())
});
/**
 * A prompt or prompt template that the server offers.
 */
const PromptSchema = zod1.object({
    ...BaseMetadataSchema.shape,
    ...IconsSchema.shape,
    /**
     * An optional description of what this prompt provides
     */
    description: zod1.optional(zod1.string()),
    /**
     * A list of arguments to use for templating the prompt.
     */
    arguments: zod1.optional(zod1.array(PromptArgumentSchema)),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: zod1.optional(zod1.looseObject({}))
});
/**
 * Sent from the client to request a list of prompts and prompt templates the server has.
 */
const ListPromptsRequestSchema = PaginatedRequestSchema.extend({
    method: zod1.literal('prompts/list')
});
/**
 * The server's response to a prompts/list request from the client.
 */
const ListPromptsResultSchema = PaginatedResultSchema.extend({
    prompts: zod1.array(PromptSchema)
});
/**
 * Parameters for a `prompts/get` request.
 */
const GetPromptRequestParamsSchema = BaseRequestParamsSchema.extend({
    /**
     * The name of the prompt or prompt template.
     */
    name: zod1.string(),
    /**
     * Arguments to use for templating the prompt.
     */
    arguments: zod1.record(zod1.string(), zod1.string()).optional()
});
/**
 * Used by the client to get a prompt provided by the server.
 */
const GetPromptRequestSchema = RequestSchema.extend({
    method: zod1.literal('prompts/get'),
    params: GetPromptRequestParamsSchema
});
/**
 * Text provided to or from an LLM.
 */
const TextContentSchema = zod1.object({
    type: zod1.literal('text'),
    /**
     * The text content of the message.
     */
    text: zod1.string(),
    /**
     * Optional annotations for the client.
     */
    annotations: AnnotationsSchema.optional(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: zod1.record(zod1.string(), zod1.unknown()).optional()
});
/**
 * An image provided to or from an LLM.
 */
const ImageContentSchema = zod1.object({
    type: zod1.literal('image'),
    /**
     * The base64-encoded image data.
     */
    data: Base64Schema,
    /**
     * The MIME type of the image. Different providers may support different image types.
     */
    mimeType: zod1.string(),
    /**
     * Optional annotations for the client.
     */
    annotations: AnnotationsSchema.optional(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: zod1.record(zod1.string(), zod1.unknown()).optional()
});
/**
 * An Audio provided to or from an LLM.
 */
const AudioContentSchema = zod1.object({
    type: zod1.literal('audio'),
    /**
     * The base64-encoded audio data.
     */
    data: Base64Schema,
    /**
     * The MIME type of the audio. Different providers may support different audio types.
     */
    mimeType: zod1.string(),
    /**
     * Optional annotations for the client.
     */
    annotations: AnnotationsSchema.optional(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: zod1.record(zod1.string(), zod1.unknown()).optional()
});
/**
 * A tool call request from an assistant (LLM).
 * Represents the assistant's request to use a tool.
 */
const ToolUseContentSchema = zod1.object({
    type: zod1.literal('tool_use'),
    /**
     * The name of the tool to invoke.
     * Must match a tool name from the request's tools array.
     */
    name: zod1.string(),
    /**
     * Unique identifier for this tool call.
     * Used to correlate with ToolResultContent in subsequent messages.
     */
    id: zod1.string(),
    /**
     * Arguments to pass to the tool.
     * Must conform to the tool's inputSchema.
     */
    input: zod1.record(zod1.string(), zod1.unknown()),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: zod1.record(zod1.string(), zod1.unknown()).optional()
});
/**
 * The contents of a resource, embedded into a prompt or tool call result.
 */
const EmbeddedResourceSchema = zod1.object({
    type: zod1.literal('resource'),
    resource: zod1.union([TextResourceContentsSchema, BlobResourceContentsSchema]),
    /**
     * Optional annotations for the client.
     */
    annotations: AnnotationsSchema.optional(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: zod1.record(zod1.string(), zod1.unknown()).optional()
});
/**
 * A resource that the server is capable of reading, included in a prompt or tool call result.
 *
 * Note: resource links returned by tools are not guaranteed to appear in the results of `resources/list` requests.
 */
const ResourceLinkSchema = ResourceSchema.extend({
    type: zod1.literal('resource_link')
});
/**
 * A content block that can be used in prompts and tool results.
 */
const ContentBlockSchema = zod1.union([
    TextContentSchema,
    ImageContentSchema,
    AudioContentSchema,
    ResourceLinkSchema,
    EmbeddedResourceSchema
]);
/**
 * Describes a message returned as part of a prompt.
 */
const PromptMessageSchema = zod1.object({
    role: RoleSchema,
    content: ContentBlockSchema
});
/**
 * The server's response to a prompts/get request from the client.
 */
const GetPromptResultSchema = ResultSchema.extend({
    /**
     * An optional description for the prompt.
     */
    description: zod1.string().optional(),
    messages: zod1.array(PromptMessageSchema)
});
/**
 * An optional notification from the server to the client, informing it that the list of prompts it offers has changed. This may be issued by servers without any previous subscription from the client.
 */
const PromptListChangedNotificationSchema = NotificationSchema.extend({
    method: zod1.literal('notifications/prompts/list_changed'),
    params: NotificationsParamsSchema.optional()
});
/* Tools */
/**
 * Additional properties describing a Tool to clients.
 *
 * NOTE: all properties in ToolAnnotations are **hints**.
 * They are not guaranteed to provide a faithful description of
 * tool behavior (including descriptive properties like `title`).
 *
 * Clients should never make tool use decisions based on ToolAnnotations
 * received from untrusted servers.
 */
const ToolAnnotationsSchema = zod1.object({
    /**
     * A human-readable title for the tool.
     */
    title: zod1.string().optional(),
    /**
     * If true, the tool does not modify its environment.
     *
     * Default: false
     */
    readOnlyHint: zod1.boolean().optional(),
    /**
     * If true, the tool may perform destructive updates to its environment.
     * If false, the tool performs only additive updates.
     *
     * (This property is meaningful only when `readOnlyHint == false`)
     *
     * Default: true
     */
    destructiveHint: zod1.boolean().optional(),
    /**
     * If true, calling the tool repeatedly with the same arguments
     * will have no additional effect on the its environment.
     *
     * (This property is meaningful only when `readOnlyHint == false`)
     *
     * Default: false
     */
    idempotentHint: zod1.boolean().optional(),
    /**
     * If true, this tool may interact with an "open world" of external
     * entities. If false, the tool's domain of interaction is closed.
     * For example, the world of a web search tool is open, whereas that
     * of a memory tool is not.
     *
     * Default: true
     */
    openWorldHint: zod1.boolean().optional()
});
/**
 * Execution-related properties for a tool.
 */
const ToolExecutionSchema = zod1.object({
    /**
     * Indicates the tool's preference for task-augmented execution.
     * - "required": Clients MUST invoke the tool as a task
     * - "optional": Clients MAY invoke the tool as a task or normal request
     * - "forbidden": Clients MUST NOT attempt to invoke the tool as a task
     *
     * If not present, defaults to "forbidden".
     */
    taskSupport: zod1._enum(['required', 'optional', 'forbidden']).optional()
});
/**
 * Definition for a tool the client can call.
 */
const ToolSchema = zod1.object({
    ...BaseMetadataSchema.shape,
    ...IconsSchema.shape,
    /**
     * A human-readable description of the tool.
     */
    description: zod1.string().optional(),
    /**
     * A JSON Schema 2020-12 object defining the expected parameters for the tool.
     * Must have type: 'object' at the root level per MCP spec.
     */
    inputSchema: zod1.object({
        type: zod1.literal('object'),
        properties: zod1.record(zod1.string(), AssertObjectSchema).optional(),
        required: zod1.array(zod1.string()).optional()
    })
        .catchall(zod1.unknown()),
    /**
     * An optional JSON Schema 2020-12 object defining the structure of the tool's output
     * returned in the structuredContent field of a CallToolResult.
     * Must have type: 'object' at the root level per MCP spec.
     */
    outputSchema: zod1.object({
        type: zod1.literal('object'),
        properties: zod1.record(zod1.string(), AssertObjectSchema).optional(),
        required: zod1.array(zod1.string()).optional()
    })
        .catchall(zod1.unknown())
        .optional(),
    /**
     * Optional additional tool information.
     */
    annotations: ToolAnnotationsSchema.optional(),
    /**
     * Execution-related properties for this tool.
     */
    execution: ToolExecutionSchema.optional(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: zod1.record(zod1.string(), zod1.unknown()).optional()
});
/**
 * Sent from the client to request a list of tools the server has.
 */
const ListToolsRequestSchema = PaginatedRequestSchema.extend({
    method: zod1.literal('tools/list')
});
/**
 * The server's response to a tools/list request from the client.
 */
const ListToolsResultSchema = PaginatedResultSchema.extend({
    tools: zod1.array(ToolSchema)
});
/**
 * The server's response to a tool call.
 */
const CallToolResultSchema = ResultSchema.extend({
    /**
     * A list of content objects that represent the result of the tool call.
     *
     * If the Tool does not define an outputSchema, this field MUST be present in the result.
     * For backwards compatibility, this field is always present, but it may be empty.
     */
    content: zod1.array(ContentBlockSchema).default([]),
    /**
     * An object containing structured tool output.
     *
     * If the Tool defines an outputSchema, this field MUST be present in the result, and contain a JSON object that matches the schema.
     */
    structuredContent: zod1.record(zod1.string(), zod1.unknown()).optional(),
    /**
     * Whether the tool call ended in an error.
     *
     * If not set, this is assumed to be false (the call was successful).
     *
     * Any errors that originate from the tool SHOULD be reported inside the result
     * object, with `isError` set to true, _not_ as an MCP protocol-level error
     * response. Otherwise, the LLM would not be able to see that an error occurred
     * and self-correct.
     *
     * However, any errors in _finding_ the tool, an error indicating that the
     * server does not support tool calls, or any other exceptional conditions,
     * should be reported as an MCP error response.
     */
    isError: zod1.boolean().optional()
});
/**
 * CallToolResultSchema extended with backwards compatibility to protocol version 2024-10-07.
 */
CallToolResultSchema.or(ResultSchema.extend({
    toolResult: zod1.unknown()
}));
/**
 * Parameters for a `tools/call` request.
 */
const CallToolRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
    /**
     * The name of the tool to call.
     */
    name: zod1.string(),
    /**
     * Arguments to pass to the tool.
     */
    arguments: zod1.record(zod1.string(), zod1.unknown()).optional()
});
/**
 * Used by the client to invoke a tool provided by the server.
 */
const CallToolRequestSchema = RequestSchema.extend({
    method: zod1.literal('tools/call'),
    params: CallToolRequestParamsSchema
});
/**
 * An optional notification from the server to the client, informing it that the list of tools it offers has changed. This may be issued by servers without any previous subscription from the client.
 */
const ToolListChangedNotificationSchema = NotificationSchema.extend({
    method: zod1.literal('notifications/tools/list_changed'),
    params: NotificationsParamsSchema.optional()
});
/**
 * Base schema for list changed subscription options (without callback).
 * Used internally for Zod validation of autoRefresh and debounceMs.
 */
zod1.object({
    /**
     * If true, the list will be refreshed automatically when a list changed notification is received.
     * The callback will be called with the updated list.
     *
     * If false, the callback will be called with null items, allowing manual refresh.
     *
     * @default true
     */
    autoRefresh: zod1.boolean().default(true),
    /**
     * Debounce time in milliseconds for list changed notification processing.
     *
     * Multiple notifications received within this timeframe will only trigger one refresh.
     * Set to 0 to disable debouncing.
     *
     * @default 300
     */
    debounceMs: zod1.number().int().nonnegative().default(300)
});
/* Logging */
/**
 * The severity of a log message.
 */
const LoggingLevelSchema = zod1._enum(['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency']);
/**
 * Parameters for a `logging/setLevel` request.
 */
const SetLevelRequestParamsSchema = BaseRequestParamsSchema.extend({
    /**
     * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
     */
    level: LoggingLevelSchema
});
/**
 * A request from the client to the server, to enable or adjust logging.
 */
const SetLevelRequestSchema = RequestSchema.extend({
    method: zod1.literal('logging/setLevel'),
    params: SetLevelRequestParamsSchema
});
/**
 * Parameters for a `notifications/message` notification.
 */
const LoggingMessageNotificationParamsSchema = NotificationsParamsSchema.extend({
    /**
     * The severity of this log message.
     */
    level: LoggingLevelSchema,
    /**
     * An optional name of the logger issuing this message.
     */
    logger: zod1.string().optional(),
    /**
     * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
     */
    data: zod1.unknown()
});
/**
 * Notification of a log message passed from server to client. If no logging/setLevel request has been sent from the client, the server MAY decide which messages to send automatically.
 */
const LoggingMessageNotificationSchema = NotificationSchema.extend({
    method: zod1.literal('notifications/message'),
    params: LoggingMessageNotificationParamsSchema
});
/* Sampling */
/**
 * Hints to use for model selection.
 */
const ModelHintSchema = zod1.object({
    /**
     * A hint for a model name.
     */
    name: zod1.string().optional()
});
/**
 * The server's preferences for model selection, requested of the client during sampling.
 */
const ModelPreferencesSchema = zod1.object({
    /**
     * Optional hints to use for model selection.
     */
    hints: zod1.array(ModelHintSchema).optional(),
    /**
     * How much to prioritize cost when selecting a model.
     */
    costPriority: zod1.number().min(0).max(1).optional(),
    /**
     * How much to prioritize sampling speed (latency) when selecting a model.
     */
    speedPriority: zod1.number().min(0).max(1).optional(),
    /**
     * How much to prioritize intelligence and capabilities when selecting a model.
     */
    intelligencePriority: zod1.number().min(0).max(1).optional()
});
/**
 * Controls tool usage behavior in sampling requests.
 */
const ToolChoiceSchema = zod1.object({
    /**
     * Controls when tools are used:
     * - "auto": Model decides whether to use tools (default)
     * - "required": Model MUST use at least one tool before completing
     * - "none": Model MUST NOT use any tools
     */
    mode: zod1._enum(['auto', 'required', 'none']).optional()
});
/**
 * The result of a tool execution, provided by the user (server).
 * Represents the outcome of invoking a tool requested via ToolUseContent.
 */
const ToolResultContentSchema = zod1.object({
    type: zod1.literal('tool_result'),
    toolUseId: zod1.string().describe('The unique identifier for the corresponding tool call.'),
    content: zod1.array(ContentBlockSchema).default([]),
    structuredContent: zod1.object({}).loose().optional(),
    isError: zod1.boolean().optional(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: zod1.record(zod1.string(), zod1.unknown()).optional()
});
/**
 * Basic content types for sampling responses (without tool use).
 * Used for backwards-compatible CreateMessageResult when tools are not used.
 */
const SamplingContentSchema = zod1.discriminatedUnion('type', [TextContentSchema, ImageContentSchema, AudioContentSchema]);
/**
 * Content block types allowed in sampling messages.
 * This includes text, image, audio, tool use requests, and tool results.
 */
const SamplingMessageContentBlockSchema = zod1.discriminatedUnion('type', [
    TextContentSchema,
    ImageContentSchema,
    AudioContentSchema,
    ToolUseContentSchema,
    ToolResultContentSchema
]);
/**
 * Describes a message issued to or received from an LLM API.
 */
const SamplingMessageSchema = zod1.object({
    role: RoleSchema,
    content: zod1.union([SamplingMessageContentBlockSchema, zod1.array(SamplingMessageContentBlockSchema)]),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: zod1.record(zod1.string(), zod1.unknown()).optional()
});
/**
 * Parameters for a `sampling/createMessage` request.
 */
const CreateMessageRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
    messages: zod1.array(SamplingMessageSchema),
    /**
     * The server's preferences for which model to select. The client MAY modify or omit this request.
     */
    modelPreferences: ModelPreferencesSchema.optional(),
    /**
     * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
     */
    systemPrompt: zod1.string().optional(),
    /**
     * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt.
     * The client MAY ignore this request.
     *
     * Default is "none". Values "thisServer" and "allServers" are soft-deprecated. Servers SHOULD only use these values if the client
     * declares ClientCapabilities.sampling.context. These values may be removed in future spec releases.
     */
    includeContext: zod1._enum(['none', 'thisServer', 'allServers']).optional(),
    temperature: zod1.number().optional(),
    /**
     * The requested maximum number of tokens to sample (to prevent runaway completions).
     *
     * The client MAY choose to sample fewer tokens than the requested maximum.
     */
    maxTokens: zod1.number().int(),
    stopSequences: zod1.array(zod1.string()).optional(),
    /**
     * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
     */
    metadata: AssertObjectSchema.optional(),
    /**
     * Tools that the model may use during generation.
     * The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
     */
    tools: zod1.array(ToolSchema).optional(),
    /**
     * Controls how the model uses tools.
     * The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
     * Default is `{ mode: "auto" }`.
     */
    toolChoice: ToolChoiceSchema.optional()
});
/**
 * A request from the server to sample an LLM via the client. The client has full discretion over which model to select. The client should also inform the user before beginning sampling, to allow them to inspect the request (human in the loop) and decide whether to approve it.
 */
const CreateMessageRequestSchema = RequestSchema.extend({
    method: zod1.literal('sampling/createMessage'),
    params: CreateMessageRequestParamsSchema
});
/**
 * The client's response to a sampling/create_message request from the server.
 * This is the backwards-compatible version that returns single content (no arrays).
 * Used when the request does not include tools.
 */
const CreateMessageResultSchema = ResultSchema.extend({
    /**
     * The name of the model that generated the message.
     */
    model: zod1.string(),
    /**
     * The reason why sampling stopped, if known.
     *
     * Standard values:
     * - "endTurn": Natural end of the assistant's turn
     * - "stopSequence": A stop sequence was encountered
     * - "maxTokens": Maximum token limit was reached
     *
     * This field is an open string to allow for provider-specific stop reasons.
     */
    stopReason: zod1.optional(zod1._enum(['endTurn', 'stopSequence', 'maxTokens']).or(zod1.string())),
    role: RoleSchema,
    /**
     * Response content. Single content block (text, image, or audio).
     */
    content: SamplingContentSchema
});
/**
 * The client's response to a sampling/create_message request when tools were provided.
 * This version supports array content for tool use flows.
 */
const CreateMessageResultWithToolsSchema = ResultSchema.extend({
    /**
     * The name of the model that generated the message.
     */
    model: zod1.string(),
    /**
     * The reason why sampling stopped, if known.
     *
     * Standard values:
     * - "endTurn": Natural end of the assistant's turn
     * - "stopSequence": A stop sequence was encountered
     * - "maxTokens": Maximum token limit was reached
     * - "toolUse": The model wants to use one or more tools
     *
     * This field is an open string to allow for provider-specific stop reasons.
     */
    stopReason: zod1.optional(zod1._enum(['endTurn', 'stopSequence', 'maxTokens', 'toolUse']).or(zod1.string())),
    role: RoleSchema,
    /**
     * Response content. May be a single block or array. May include ToolUseContent if stopReason is "toolUse".
     */
    content: zod1.union([SamplingMessageContentBlockSchema, zod1.array(SamplingMessageContentBlockSchema)])
});
/* Elicitation */
/**
 * Primitive schema definition for boolean fields.
 */
const BooleanSchemaSchema = zod1.object({
    type: zod1.literal('boolean'),
    title: zod1.string().optional(),
    description: zod1.string().optional(),
    default: zod1.boolean().optional()
});
/**
 * Primitive schema definition for string fields.
 */
const StringSchemaSchema = zod1.object({
    type: zod1.literal('string'),
    title: zod1.string().optional(),
    description: zod1.string().optional(),
    minLength: zod1.number().optional(),
    maxLength: zod1.number().optional(),
    format: zod1._enum(['email', 'uri', 'date', 'date-time']).optional(),
    default: zod1.string().optional()
});
/**
 * Primitive schema definition for number fields.
 */
const NumberSchemaSchema = zod1.object({
    type: zod1._enum(['number', 'integer']),
    title: zod1.string().optional(),
    description: zod1.string().optional(),
    minimum: zod1.number().optional(),
    maximum: zod1.number().optional(),
    default: zod1.number().optional()
});
/**
 * Schema for single-selection enumeration without display titles for options.
 */
const UntitledSingleSelectEnumSchemaSchema = zod1.object({
    type: zod1.literal('string'),
    title: zod1.string().optional(),
    description: zod1.string().optional(),
    enum: zod1.array(zod1.string()),
    default: zod1.string().optional()
});
/**
 * Schema for single-selection enumeration with display titles for each option.
 */
const TitledSingleSelectEnumSchemaSchema = zod1.object({
    type: zod1.literal('string'),
    title: zod1.string().optional(),
    description: zod1.string().optional(),
    oneOf: zod1.array(zod1.object({
        const: zod1.string(),
        title: zod1.string()
    })),
    default: zod1.string().optional()
});
/**
 * Use TitledSingleSelectEnumSchema instead.
 * This interface will be removed in a future version.
 */
const LegacyTitledEnumSchemaSchema = zod1.object({
    type: zod1.literal('string'),
    title: zod1.string().optional(),
    description: zod1.string().optional(),
    enum: zod1.array(zod1.string()),
    enumNames: zod1.array(zod1.string()).optional(),
    default: zod1.string().optional()
});
// Combined single selection enumeration
const SingleSelectEnumSchemaSchema = zod1.union([UntitledSingleSelectEnumSchemaSchema, TitledSingleSelectEnumSchemaSchema]);
/**
 * Schema for multiple-selection enumeration without display titles for options.
 */
const UntitledMultiSelectEnumSchemaSchema = zod1.object({
    type: zod1.literal('array'),
    title: zod1.string().optional(),
    description: zod1.string().optional(),
    minItems: zod1.number().optional(),
    maxItems: zod1.number().optional(),
    items: zod1.object({
        type: zod1.literal('string'),
        enum: zod1.array(zod1.string())
    }),
    default: zod1.array(zod1.string()).optional()
});
/**
 * Schema for multiple-selection enumeration with display titles for each option.
 */
const TitledMultiSelectEnumSchemaSchema = zod1.object({
    type: zod1.literal('array'),
    title: zod1.string().optional(),
    description: zod1.string().optional(),
    minItems: zod1.number().optional(),
    maxItems: zod1.number().optional(),
    items: zod1.object({
        anyOf: zod1.array(zod1.object({
            const: zod1.string(),
            title: zod1.string()
        }))
    }),
    default: zod1.array(zod1.string()).optional()
});
/**
 * Combined schema for multiple-selection enumeration
 */
const MultiSelectEnumSchemaSchema = zod1.union([UntitledMultiSelectEnumSchemaSchema, TitledMultiSelectEnumSchemaSchema]);
/**
 * Primitive schema definition for enum fields.
 */
const EnumSchemaSchema = zod1.union([LegacyTitledEnumSchemaSchema, SingleSelectEnumSchemaSchema, MultiSelectEnumSchemaSchema]);
/**
 * Union of all primitive schema definitions.
 */
const PrimitiveSchemaDefinitionSchema = zod1.union([EnumSchemaSchema, BooleanSchemaSchema, StringSchemaSchema, NumberSchemaSchema]);
/**
 * Parameters for an `elicitation/create` request for form-based elicitation.
 */
const ElicitRequestFormParamsSchema = TaskAugmentedRequestParamsSchema.extend({
    /**
     * The elicitation mode.
     *
     * Optional for backward compatibility. Clients MUST treat missing mode as "form".
     */
    mode: zod1.literal('form').optional(),
    /**
     * The message to present to the user describing what information is being requested.
     */
    message: zod1.string(),
    /**
     * A restricted subset of JSON Schema.
     * Only top-level properties are allowed, without nesting.
     */
    requestedSchema: zod1.object({
        type: zod1.literal('object'),
        properties: zod1.record(zod1.string(), PrimitiveSchemaDefinitionSchema),
        required: zod1.array(zod1.string()).optional()
    })
});
/**
 * Parameters for an `elicitation/create` request for URL-based elicitation.
 */
const ElicitRequestURLParamsSchema = TaskAugmentedRequestParamsSchema.extend({
    /**
     * The elicitation mode.
     */
    mode: zod1.literal('url'),
    /**
     * The message to present to the user explaining why the interaction is needed.
     */
    message: zod1.string(),
    /**
     * The ID of the elicitation, which must be unique within the context of the server.
     * The client MUST treat this ID as an opaque value.
     */
    elicitationId: zod1.string(),
    /**
     * The URL that the user should navigate to.
     */
    url: zod1.string().url()
});
/**
 * The parameters for a request to elicit additional information from the user via the client.
 */
const ElicitRequestParamsSchema = zod1.union([ElicitRequestFormParamsSchema, ElicitRequestURLParamsSchema]);
/**
 * A request from the server to elicit user input via the client.
 * The client should present the message and form fields to the user (form mode)
 * or navigate to a URL (URL mode).
 */
const ElicitRequestSchema = RequestSchema.extend({
    method: zod1.literal('elicitation/create'),
    params: ElicitRequestParamsSchema
});
/**
 * Parameters for a `notifications/elicitation/complete` notification.
 *
 * @category notifications/elicitation/complete
 */
const ElicitationCompleteNotificationParamsSchema = NotificationsParamsSchema.extend({
    /**
     * The ID of the elicitation that completed.
     */
    elicitationId: zod1.string()
});
/**
 * A notification from the server to the client, informing it of a completion of an out-of-band elicitation request.
 *
 * @category notifications/elicitation/complete
 */
const ElicitationCompleteNotificationSchema = NotificationSchema.extend({
    method: zod1.literal('notifications/elicitation/complete'),
    params: ElicitationCompleteNotificationParamsSchema
});
/**
 * The client's response to an elicitation/create request from the server.
 */
const ElicitResultSchema = ResultSchema.extend({
    /**
     * The user action in response to the elicitation.
     * - "accept": User submitted the form/confirmed the action
     * - "decline": User explicitly decline the action
     * - "cancel": User dismissed without making an explicit choice
     */
    action: zod1._enum(['accept', 'decline', 'cancel']),
    /**
     * The submitted form data, only present when action is "accept".
     * Contains values matching the requested schema.
     * Per MCP spec, content is "typically omitted" for decline/cancel actions.
     * We normalize null to undefined for leniency while maintaining type compatibility.
     */
    content: zod1.preprocess(val => (val === null ? undefined : val), zod1.record(zod1.string(), zod1.union([zod1.string(), zod1.number(), zod1.boolean(), zod1.array(zod1.string())])).optional())
});
/* Autocomplete */
/**
 * A reference to a resource or resource template definition.
 */
const ResourceTemplateReferenceSchema = zod1.object({
    type: zod1.literal('ref/resource'),
    /**
     * The URI or URI template of the resource.
     */
    uri: zod1.string()
});
/**
 * Identifies a prompt.
 */
const PromptReferenceSchema = zod1.object({
    type: zod1.literal('ref/prompt'),
    /**
     * The name of the prompt or prompt template
     */
    name: zod1.string()
});
/**
 * Parameters for a `completion/complete` request.
 */
const CompleteRequestParamsSchema = BaseRequestParamsSchema.extend({
    ref: zod1.union([PromptReferenceSchema, ResourceTemplateReferenceSchema]),
    /**
     * The argument's information
     */
    argument: zod1.object({
        /**
         * The name of the argument
         */
        name: zod1.string(),
        /**
         * The value of the argument to use for completion matching.
         */
        value: zod1.string()
    }),
    context: zod1.object({
        /**
         * Previously-resolved variables in a URI template or prompt.
         */
        arguments: zod1.record(zod1.string(), zod1.string()).optional()
    })
        .optional()
});
/**
 * A request from the client to the server, to ask for completion options.
 */
const CompleteRequestSchema = RequestSchema.extend({
    method: zod1.literal('completion/complete'),
    params: CompleteRequestParamsSchema
});
/**
 * The server's response to a completion/complete request
 */
const CompleteResultSchema = ResultSchema.extend({
    completion: zod1.looseObject({
        /**
         * An array of completion values. Must not exceed 100 items.
         */
        values: zod1.array(zod1.string()).max(100),
        /**
         * The total number of completion options available. This can exceed the number of values actually sent in the response.
         */
        total: zod1.optional(zod1.number().int()),
        /**
         * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
         */
        hasMore: zod1.optional(zod1.boolean())
    })
});
/* Roots */
/**
 * Represents a root directory or file that the server can operate on.
 */
const RootSchema = zod1.object({
    /**
     * The URI identifying the root. This *must* start with file:// for now.
     */
    uri: zod1.string().startsWith('file://'),
    /**
     * An optional name for the root.
     */
    name: zod1.string().optional(),
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: zod1.record(zod1.string(), zod1.unknown()).optional()
});
/**
 * Sent from the server to request a list of root URIs from the client.
 */
const ListRootsRequestSchema = RequestSchema.extend({
    method: zod1.literal('roots/list'),
    params: BaseRequestParamsSchema.optional()
});
/**
 * The client's response to a roots/list request from the server.
 */
const ListRootsResultSchema = ResultSchema.extend({
    roots: zod1.array(RootSchema)
});
/**
 * A notification from the client to the server, informing it that the list of roots has changed.
 */
const RootsListChangedNotificationSchema = NotificationSchema.extend({
    method: zod1.literal('notifications/roots/list_changed'),
    params: NotificationsParamsSchema.optional()
});
/* Client messages */
zod1.union([
    PingRequestSchema,
    InitializeRequestSchema,
    CompleteRequestSchema,
    SetLevelRequestSchema,
    GetPromptRequestSchema,
    ListPromptsRequestSchema,
    ListResourcesRequestSchema,
    ListResourceTemplatesRequestSchema,
    ReadResourceRequestSchema,
    SubscribeRequestSchema,
    UnsubscribeRequestSchema,
    CallToolRequestSchema,
    ListToolsRequestSchema,
    GetTaskRequestSchema,
    GetTaskPayloadRequestSchema,
    ListTasksRequestSchema,
    CancelTaskRequestSchema
]);
zod1.union([
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    InitializedNotificationSchema,
    RootsListChangedNotificationSchema,
    TaskStatusNotificationSchema
]);
zod1.union([
    EmptyResultSchema,
    CreateMessageResultSchema,
    CreateMessageResultWithToolsSchema,
    ElicitResultSchema,
    ListRootsResultSchema,
    GetTaskResultSchema,
    ListTasksResultSchema,
    CreateTaskResultSchema
]);
/* Server messages */
zod1.union([
    PingRequestSchema,
    CreateMessageRequestSchema,
    ElicitRequestSchema,
    ListRootsRequestSchema,
    GetTaskRequestSchema,
    GetTaskPayloadRequestSchema,
    ListTasksRequestSchema,
    CancelTaskRequestSchema
]);
zod1.union([
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    LoggingMessageNotificationSchema,
    ResourceUpdatedNotificationSchema,
    ResourceListChangedNotificationSchema,
    ToolListChangedNotificationSchema,
    PromptListChangedNotificationSchema,
    TaskStatusNotificationSchema,
    ElicitationCompleteNotificationSchema
]);
zod1.union([
    EmptyResultSchema,
    InitializeResultSchema,
    CompleteResultSchema,
    GetPromptResultSchema,
    ListPromptsResultSchema,
    ListResourcesResultSchema,
    ListResourceTemplatesResultSchema,
    ReadResourceResultSchema,
    CallToolResultSchema,
    ListToolsResultSchema,
    GetTaskResultSchema,
    ListTasksResultSchema,
    CreateTaskResultSchema
]);
class McpError extends Error {
    constructor(code, message, data) {
        super(`MCP error ${code}: ${message}`);
        this.code = code;
        this.data = data;
        this.name = 'McpError';
    }
    /**
     * Factory method to create the appropriate error type based on the error code and data
     */
    static fromError(code, message, data) {
        // Check for specific error types
        if (code === exports.ErrorCode.UrlElicitationRequired && data) {
            const errorData = data;
            if (errorData.elicitations) {
                return new UrlElicitationRequiredError(errorData.elicitations, message);
            }
        }
        // Default to generic McpError
        return new McpError(code, message, data);
    }
}
/**
 * Specialized error type when a tool requires a URL mode elicitation.
 * This makes it nicer for the client to handle since there is specific data to work with instead of just a code to check against.
 */
class UrlElicitationRequiredError extends McpError {
    constructor(elicitations, message = `URL elicitation${elicitations.length > 1 ? 's' : ''} required`) {
        super(exports.ErrorCode.UrlElicitationRequired, message, {
            elicitations: elicitations
        });
    }
    get elicitations() {
        return this.data?.elicitations ?? [];
    }
}

var ajvExports = /*@__PURE__*/ ajv1.requireAjv();
const Ajv = /*@__PURE__*/omitted1.getDefaultExportFromCjs(ajvExports);

var distExports = ajvFormats1.requireDist();
const _addFormats = /*@__PURE__*/omitted1.getDefaultExportFromCjs(distExports);

/**
 * AJV-based JSON Schema validator provider
 */
function createDefaultAjvInstance() {
    const ajv = new Ajv({
        strict: false,
        validateFormats: true,
        validateSchema: false,
        allErrors: true
    });
    const addFormats = _addFormats;
    addFormats(ajv);
    return ajv;
}
/**
 * @example
 * ```typescript
 * // Use with default AJV instance (recommended)
 * import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
 * const validator = new AjvJsonSchemaValidator();
 *
 * // Use with custom AJV instance
 * import { Ajv } from 'ajv';
 * const ajv = new Ajv({ strict: true, allErrors: true });
 * const validator = new AjvJsonSchemaValidator(ajv);
 * ```
 */
class AjvJsonSchemaValidator {
    /**
     * Create an AJV validator
     *
     * @param ajv - Optional pre-configured AJV instance. If not provided, a default instance will be created.
     *
     * @example
     * ```typescript
     * // Use default configuration (recommended for most cases)
     * import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
     * const validator = new AjvJsonSchemaValidator();
     *
     * // Or provide custom AJV instance for advanced configuration
     * import { Ajv } from 'ajv';
     * import addFormats from 'ajv-formats';
     *
     * const ajv = new Ajv({ validateFormats: true });
     * addFormats(ajv);
     * const validator = new AjvJsonSchemaValidator(ajv);
     * ```
     */
    constructor(ajv) {
        this._ajv = ajv ?? createDefaultAjvInstance();
    }
    /**
     * Create a validator for the given JSON Schema
     *
     * The validator is compiled once and can be reused multiple times.
     * If the schema has an $id, it will be cached by AJV automatically.
     *
     * @param schema - Standard JSON Schema object
     * @returns A validator function that validates input data
     */
    getValidator(schema) {
        // Check if schema has $id and is already compiled/cached
        const ajvValidator = '$id' in schema && typeof schema.$id === 'string'
            ? (this._ajv.getSchema(schema.$id) ?? this._ajv.compile(schema))
            : this._ajv.compile(schema);
        return (input) => {
            const valid = ajvValidator(input);
            if (valid) {
                return {
                    valid: true,
                    data: input,
                    errorMessage: undefined
                };
            }
            else {
                return {
                    valid: false,
                    data: undefined,
                    errorMessage: this._ajv.errorsText(ajvValidator.errors)
                };
            }
        };
    }
}

exports.AjvJsonSchemaValidator = AjvJsonSchemaValidator;
exports.CallToolRequestSchema = CallToolRequestSchema;
exports.CallToolResultSchema = CallToolResultSchema;
exports.CancelTaskRequestSchema = CancelTaskRequestSchema;
exports.CancelTaskResultSchema = CancelTaskResultSchema;
exports.CancelledNotificationSchema = CancelledNotificationSchema;
exports.CreateMessageResultSchema = CreateMessageResultSchema;
exports.CreateMessageResultWithToolsSchema = CreateMessageResultWithToolsSchema;
exports.CreateTaskResultSchema = CreateTaskResultSchema;
exports.DEFAULT_NEGOTIATED_PROTOCOL_VERSION = DEFAULT_NEGOTIATED_PROTOCOL_VERSION;
exports.ElicitResultSchema = ElicitResultSchema;
exports.EmptyResultSchema = EmptyResultSchema;
exports.GetTaskPayloadRequestSchema = GetTaskPayloadRequestSchema;
exports.GetTaskRequestSchema = GetTaskRequestSchema;
exports.GetTaskResultSchema = GetTaskResultSchema;
exports.InitializeRequestSchema = InitializeRequestSchema;
exports.InitializedNotificationSchema = InitializedNotificationSchema;
exports.JSONRPCMessageSchema = JSONRPCMessageSchema;
exports.LATEST_PROTOCOL_VERSION = LATEST_PROTOCOL_VERSION;
exports.ListRootsResultSchema = ListRootsResultSchema;
exports.ListTasksRequestSchema = ListTasksRequestSchema;
exports.ListTasksResultSchema = ListTasksResultSchema;
exports.ListToolsRequestSchema = ListToolsRequestSchema;
exports.LoggingLevelSchema = LoggingLevelSchema;
exports.McpError = McpError;
exports.PingRequestSchema = PingRequestSchema;
exports.ProgressNotificationSchema = ProgressNotificationSchema;
exports.RELATED_TASK_META_KEY = RELATED_TASK_META_KEY;
exports.SUPPORTED_PROTOCOL_VERSIONS = SUPPORTED_PROTOCOL_VERSIONS;
exports.SetLevelRequestSchema = SetLevelRequestSchema;
exports.TaskStatusNotificationSchema = TaskStatusNotificationSchema;
exports.isInitializeRequest = isInitializeRequest;
exports.isJSONRPCErrorResponse = isJSONRPCErrorResponse;
exports.isJSONRPCNotification = isJSONRPCNotification;
exports.isJSONRPCRequest = isJSONRPCRequest;
exports.isJSONRPCResultResponse = isJSONRPCResultResponse;
exports.isTaskAugmentedRequestParams = isTaskAugmentedRequestParams;
