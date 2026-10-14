'use strict';

const mongodb4 = require('./mongodb-4.js');
const require$$0$1 = require('timers/promises');
const mongodb1 = require('./mongodb-1.js');
const mongodb2 = require('./mongodb-2.js');
const mongodb3 = require('./mongodb-3.js');
const mongodb5 = require('./mongodb-5.js');
const mongodb7 = require('./mongodb-7.js');
const require$$0 = require('timers');
const require$$0$2 = require('dns');

var server_selection = {};

var hasRequiredServer_selection;

function requireServer_selection () {
	if (hasRequiredServer_selection) return server_selection;
	hasRequiredServer_selection = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.DeprioritizedServers = exports.MIN_SECONDARY_WRITE_WIRE_VERSION = void 0;
		exports.writableServerSelector = writableServerSelector;
		exports.sameServerSelector = sameServerSelector;
		exports.secondaryWritableServerSelector = secondaryWritableServerSelector;
		exports.readPreferenceServerSelector = readPreferenceServerSelector;
		const error_1 = mongodb4.requireError();
		const read_preference_1 = mongodb5.requireRead_preference();
		const common_1 = mongodb5.requireCommon();
		// max staleness constants
		const IDLE_WRITE_PERIOD = 10000;
		const SMALLEST_MAX_STALENESS_SECONDS = 90;
		//  Minimum version to try writes on secondaries.
		exports.MIN_SECONDARY_WRITE_WIRE_VERSION = 13;
		/** @internal */
		class DeprioritizedServers {
		    constructor(descriptions) {
		        this.deprioritized = new Set();
		        for (const description of descriptions ?? []) {
		            this.add(description);
		        }
		    }
		    add({ address }) {
		        this.deprioritized.add(address);
		    }
		    has({ address }) {
		        return this.deprioritized.has(address);
		    }
		}
		exports.DeprioritizedServers = DeprioritizedServers;
		function filterDeprioritized(candidates, deprioritized) {
		    const filtered = candidates.filter(candidate => !deprioritized.has(candidate));
		    return filtered.length ? filtered : candidates;
		}
		/**
		 * Returns a server selector that selects for writable servers
		 */
		function writableServerSelector() {
		    return function writableServer(topologyDescription, servers, deprioritized) {
		        const eligibleServers = filterDeprioritized(servers.filter(({ isWritable }) => isWritable), deprioritized);
		        return latencyWindowReducer(topologyDescription, eligibleServers);
		    };
		}
		/**
		 * The purpose of this selector is to select the same server, only
		 * if it is in a state that it can have commands sent to it.
		 */
		function sameServerSelector(description) {
		    return function sameServerSelector(_topologyDescription, servers, _deprioritized) {
		        if (!description)
		            return [];
		        // Filter the servers to match the provided description only if
		        // the type is not unknown.
		        return servers.filter(sd => {
		            return sd.address === description.address && sd.type !== common_1.ServerType.Unknown;
		        });
		    };
		}
		/**
		 * Returns a server selector that uses a read preference to select a
		 * server potentially for a write on a secondary.
		 */
		function secondaryWritableServerSelector(wireVersion, readPreference) {
		    // If server version < 5.0, read preference always primary.
		    // If server version >= 5.0...
		    // - If read preference is supplied, use that.
		    // - If no read preference is supplied, use primary.
		    if (!readPreference ||
		        !wireVersion ||
		        (wireVersion && wireVersion < exports.MIN_SECONDARY_WRITE_WIRE_VERSION)) {
		        return readPreferenceServerSelector(read_preference_1.ReadPreference.primary);
		    }
		    return readPreferenceServerSelector(readPreference);
		}
		/**
		 * Reduces the passed in array of servers by the rules of the "Max Staleness" specification
		 * found here:
		 *
		 * @see https://github.com/mongodb/specifications/blob/master/source/max-staleness/max-staleness.md
		 *
		 * @param readPreference - The read preference providing max staleness guidance
		 * @param topologyDescription - The topology description
		 * @param servers - The list of server descriptions to be reduced
		 * @returns The list of servers that satisfy the requirements of max staleness
		 */
		function maxStalenessReducer(readPreference, topologyDescription, servers) {
		    if (readPreference.maxStalenessSeconds == null || readPreference.maxStalenessSeconds < 0) {
		        return servers;
		    }
		    const maxStaleness = readPreference.maxStalenessSeconds;
		    const maxStalenessVariance = (topologyDescription.heartbeatFrequencyMS + IDLE_WRITE_PERIOD) / 1000;
		    if (maxStaleness < maxStalenessVariance) {
		        throw new error_1.MongoInvalidArgumentError(`Option "maxStalenessSeconds" must be at least ${maxStalenessVariance} seconds`);
		    }
		    if (maxStaleness < SMALLEST_MAX_STALENESS_SECONDS) {
		        throw new error_1.MongoInvalidArgumentError(`Option "maxStalenessSeconds" must be at least ${SMALLEST_MAX_STALENESS_SECONDS} seconds`);
		    }
		    if (topologyDescription.type === common_1.TopologyType.ReplicaSetWithPrimary) {
		        const primary = Array.from(topologyDescription.servers.values()).filter(primaryFilter)[0];
		        return servers.filter((server) => {
		            const stalenessMS = server.lastUpdateTime -
		                server.lastWriteDate -
		                (primary.lastUpdateTime - primary.lastWriteDate) +
		                topologyDescription.heartbeatFrequencyMS;
		            const staleness = stalenessMS / 1000;
		            const maxStalenessSeconds = readPreference.maxStalenessSeconds ?? 0;
		            return staleness <= maxStalenessSeconds;
		        });
		    }
		    if (topologyDescription.type === common_1.TopologyType.ReplicaSetNoPrimary) {
		        if (servers.length === 0) {
		            return servers;
		        }
		        const sMax = servers.reduce((max, s) => s.lastWriteDate > max.lastWriteDate ? s : max);
		        return servers.filter((server) => {
		            const stalenessMS = sMax.lastWriteDate - server.lastWriteDate + topologyDescription.heartbeatFrequencyMS;
		            const staleness = stalenessMS / 1000;
		            const maxStalenessSeconds = readPreference.maxStalenessSeconds ?? 0;
		            return staleness <= maxStalenessSeconds;
		        });
		    }
		    return servers;
		}
		/**
		 * Determines whether a server's tags match a given set of tags.
		 *
		 * A tagset matches the server's tags if every k-v pair in the tagset
		 * is also in the server's tagset.
		 *
		 * Note that this does not requires that every k-v pair in the server's tagset is also
		 * in the client's tagset.  The server's tagset is required only to be a superset of the
		 * client's tags.
		 *
		 * @see https://github.com/mongodb/specifications/blob/master/source/server-selection/server-selection.md#tag_sets
		 *
		 * @param tagSet - The requested tag set to match
		 * @param serverTags - The server's tags
		 */
		function tagSetMatch(tagSet, serverTags) {
		    return Object.entries(tagSet).every(([key, value]) => serverTags[key] != null && serverTags[key] === value);
		}
		/**
		 * Reduces a set of server descriptions based on tags requested by the read preference
		 *
		 * @param readPreference - The read preference providing the requested tags
		 * @param servers - The list of server descriptions to reduce
		 * @returns The list of servers matching the requested tags
		 */
		function tagSetReducer({ tags }, servers) {
		    if (tags == null || tags.length === 0) {
		        // empty tag sets match all servers
		        return servers;
		    }
		    for (const tagSet of tags) {
		        const serversMatchingTagset = servers.filter((s) => tagSetMatch(tagSet, s.tags));
		        if (serversMatchingTagset.length) {
		            return serversMatchingTagset;
		        }
		    }
		    return [];
		}
		/**
		 * Reduces a list of servers to ensure they fall within an acceptable latency window. This is
		 * further specified in the "Server Selection" specification, found here:
		 *
		 * @see https://github.com/mongodb/specifications/blob/master/source/server-selection/server-selection.md
		 *
		 * @param topologyDescription - The topology description
		 * @param servers - The list of servers to reduce
		 * @returns The servers which fall within an acceptable latency window
		 */
		function latencyWindowReducer(topologyDescription, servers) {
		    const low = servers.reduce((min, server) => Math.min(server.roundTripTime, min), Infinity);
		    const high = low + topologyDescription.localThresholdMS;
		    return servers.filter(server => server.roundTripTime <= high && server.roundTripTime >= low);
		}
		// filters
		function primaryFilter(server) {
		    return server.type === common_1.ServerType.RSPrimary;
		}
		function secondaryFilter(server) {
		    return server.type === common_1.ServerType.RSSecondary;
		}
		function nearestFilter(server) {
		    return server.type === common_1.ServerType.RSSecondary || server.type === common_1.ServerType.RSPrimary;
		}
		function knownFilter(server) {
		    return server.type !== common_1.ServerType.Unknown;
		}
		function loadBalancerFilter(server) {
		    return server.type === common_1.ServerType.LoadBalancer;
		}
		function isDeprioritizedFactory(deprioritized) {
		    return server => 
		    // if any deprioritized servers equal the server, here we are.
		    !deprioritized.has(server);
		}
		function secondarySelector(readPreference, topologyDescription, servers, deprioritized) {
		    const mode = readPreference.mode;
		    switch (mode) {
		        case 'primary':
		            // Note: no need to filter for deprioritized servers.  A replica set has only one primary; that means that
		            // we are in one of two scenarios:
		            // 1. deprioritized servers is empty - return the primary.
		            // 2. deprioritized servers contains the primary - return the primary.
		            return servers.filter(primaryFilter);
		        case 'primaryPreferred': {
		            const primary = servers.filter(primaryFilter);
		            // If there is a primary and it is not deprioritized, use the primary.  Otherwise,
		            // check for secondaries.
		            const eligiblePrimary = primary.filter(isDeprioritizedFactory(deprioritized));
		            if (eligiblePrimary.length) {
		                return eligiblePrimary;
		            }
		            // If we make it here, we either have:
		            // 1. a deprioritized primary
		            // 2. no eligible primary
		            // secondaries take precedence of deprioritized primaries.
		            const secondaries = tagSetReducer(readPreference, maxStalenessReducer(readPreference, topologyDescription, servers.filter(secondaryFilter)));
		            const eligibleSecondaries = secondaries.filter(isDeprioritizedFactory(deprioritized));
		            if (eligibleSecondaries.length) {
		                return latencyWindowReducer(topologyDescription, eligibleSecondaries);
		            }
		            // if we make it here, we have no primaries or secondaries that not deprioritized.
		            // prefer the primary (which may not exist, if the topology has no primary).
		            // otherwise, return the secondaries (which also may not exist, but there is nothing else to check here).
		            return primary.length ? primary : latencyWindowReducer(topologyDescription, secondaries);
		        }
		        case 'nearest': {
		            const eligible = filterDeprioritized(tagSetReducer(readPreference, maxStalenessReducer(readPreference, topologyDescription, servers.filter(nearestFilter))), deprioritized);
		            return latencyWindowReducer(topologyDescription, eligible);
		        }
		        case 'secondary':
		        case 'secondaryPreferred': {
		            const secondaries = tagSetReducer(readPreference, maxStalenessReducer(readPreference, topologyDescription, servers.filter(secondaryFilter)));
		            const eligibleSecondaries = secondaries.filter(isDeprioritizedFactory(deprioritized));
		            if (eligibleSecondaries.length) {
		                return latencyWindowReducer(topologyDescription, eligibleSecondaries);
		            }
		            // we have no eligible secondaries, try for a primary if we can.
		            if (mode === read_preference_1.ReadPreference.SECONDARY_PREFERRED) {
		                const primary = servers.filter(primaryFilter);
		                // unlike readPreference=primary, here we do filter for deprioritized servers.
		                // if the primary is deprioritized, deprioritized secondaries take precedence.
		                const eligiblePrimary = primary.filter(isDeprioritizedFactory(deprioritized));
		                if (eligiblePrimary.length)
		                    return eligiblePrimary;
		                // we have no eligible primary nor secondaries that have not been deprioritized
		                return secondaries.length
		                    ? latencyWindowReducer(topologyDescription, secondaries)
		                    : primary;
		            }
		            // return all secondaries in the latency window.
		            return latencyWindowReducer(topologyDescription, secondaries);
		        }
		        default: {
		            throw new error_1.MongoRuntimeError(`unexpected readPreference=${mode} (should never happen).  Please report a bug in the Node driver Jira project.`);
		        }
		    }
		}
		/**
		 * Returns a function which selects servers based on a provided read preference
		 *
		 * @param readPreference - The read preference to select with
		 */
		function readPreferenceServerSelector(readPreference) {
		    if (!readPreference.isValid()) {
		        throw new error_1.MongoInvalidArgumentError('Invalid read preference specified');
		    }
		    return function readPreferenceServers(topologyDescription, servers, deprioritized) {
		        switch (topologyDescription.type) {
		            case 'Single':
		                return latencyWindowReducer(topologyDescription, servers.filter(knownFilter));
		            case 'ReplicaSetNoPrimary':
		            case 'ReplicaSetWithPrimary':
		                return secondarySelector(readPreference, topologyDescription, servers, deprioritized);
		            case 'Sharded': {
		                const selectable = filterDeprioritized(servers, deprioritized);
		                return latencyWindowReducer(topologyDescription, selectable.filter(knownFilter));
		            }
		            case 'Unknown':
		                return [];
		            case 'LoadBalanced':
		                return servers.filter(loadBalancerFilter);
		            default: {
		                topologyDescription.type;
		                throw new error_1.MongoRuntimeError(`unexpected topology type: ${topologyDescription.type} (this should never happen).  Please file a bug in the Node driver Jira project.`);
		            }
		        }
		    };
		}
		
	} (server_selection));
	return server_selection;
}

var timeout = {};

var hasRequiredTimeout;

function requireTimeout () {
	if (hasRequiredTimeout) return timeout;
	hasRequiredTimeout = 1;
	Object.defineProperty(timeout, "__esModule", { value: true });
	timeout.LegacyTimeoutContext = timeout.CSOTTimeoutContext = timeout.TimeoutContext = timeout.Timeout = timeout.TimeoutError = void 0;
	const timers_1 = require$$0;
	const error_1 = mongodb4.requireError();
	const utils_1 = mongodb7.requireUtils();
	/** @internal */
	class TimeoutError extends Error {
	    get name() {
	        return 'TimeoutError';
	    }
	    constructor(message, options) {
	        super(message, options);
	        this.duration = options.duration;
	    }
	    static is(error) {
	        return (error != null && typeof error === 'object' && 'name' in error && error.name === 'TimeoutError');
	    }
	}
	timeout.TimeoutError = TimeoutError;
	/**
	 * @internal
	 * This class is an abstraction over timeouts
	 * The Timeout class can only be in the pending or rejected states. It is guaranteed not to resolve
	 * if interacted with exclusively through its public API
	 * */
	class Timeout extends Promise {
	    get remainingTime() {
	        if (this.timedOut)
	            return 0;
	        if (this.duration === 0)
	            return Infinity;
	        return this.start + this.duration - Math.trunc(performance.now());
	    }
	    get timeElapsed() {
	        return Math.trunc(performance.now()) - this.start;
	    }
	    /** Create a new timeout that expires in `duration` ms */
	    constructor(executor = () => null, options) {
	        const duration = options?.duration ?? 0;
	        const unref = !!options?.unref;
	        const rejection = options?.rejection;
	        if (duration < 0) {
	            throw new error_1.MongoInvalidArgumentError('Cannot create a Timeout with a negative duration');
	        }
	        let reject;
	        super((_, promiseReject) => {
	            reject = promiseReject;
	            executor(utils_1.noop, promiseReject);
	        });
	        this.ended = null;
	        this.timedOut = false;
	        this.cleared = false;
	        this.duration = duration;
	        this.start = Math.trunc(performance.now());
	        if (rejection == null && this.duration > 0) {
	            this.id = (0, timers_1.setTimeout)(() => {
	                this.ended = Math.trunc(performance.now());
	                this.timedOut = true;
	                reject(new TimeoutError(`Expired after ${duration}ms`, { duration }));
	            }, this.duration);
	            if (typeof this.id.unref === 'function' && unref) {
	                // Ensure we do not keep the Node.js event loop running
	                this.id.unref();
	            }
	        }
	        else if (rejection != null) {
	            this.ended = Math.trunc(performance.now());
	            this.timedOut = true;
	            reject(rejection);
	        }
	    }
	    /**
	     * Clears the underlying timeout. This method is idempotent
	     */
	    clear() {
	        (0, timers_1.clearTimeout)(this.id);
	        this.id = undefined;
	        this.timedOut = false;
	        this.cleared = true;
	    }
	    throwIfExpired() {
	        if (this.timedOut) {
	            // This method is invoked when someone wants to throw immediately instead of await the result of this promise
	            // Since they won't be handling the rejection from the promise (because we're about to throw here)
	            // attach handling to prevent this from bubbling up to Node.js
	            this.then(undefined, utils_1.squashError);
	            throw new TimeoutError('Timed out', { duration: this.duration });
	        }
	    }
	    static expires(duration, unref) {
	        return new Timeout(undefined, { duration, unref });
	    }
	    static reject(rejection) {
	        return new Timeout(undefined, { duration: 0, unref: true, rejection });
	    }
	}
	timeout.Timeout = Timeout;
	function isLegacyTimeoutContextOptions(v) {
	    return (v != null &&
	        typeof v === 'object' &&
	        'serverSelectionTimeoutMS' in v &&
	        typeof v.serverSelectionTimeoutMS === 'number' &&
	        'waitQueueTimeoutMS' in v &&
	        typeof v.waitQueueTimeoutMS === 'number');
	}
	function isCSOTTimeoutContextOptions(v) {
	    return (v != null &&
	        typeof v === 'object' &&
	        'serverSelectionTimeoutMS' in v &&
	        typeof v.serverSelectionTimeoutMS === 'number' &&
	        'timeoutMS' in v &&
	        typeof v.timeoutMS === 'number');
	}
	/** @internal */
	class TimeoutContext {
	    static create(options) {
	        if (options.session?.timeoutContext != null)
	            return options.session?.timeoutContext;
	        if (isCSOTTimeoutContextOptions(options))
	            return new CSOTTimeoutContext(options);
	        else if (isLegacyTimeoutContextOptions(options))
	            return new LegacyTimeoutContext(options);
	        else
	            throw new error_1.MongoRuntimeError('Unrecognized options');
	    }
	}
	timeout.TimeoutContext = TimeoutContext;
	/** @internal */
	class CSOTTimeoutContext extends TimeoutContext {
	    constructor(options) {
	        super();
	        this.minRoundTripTime = 0;
	        this.start = Math.trunc(performance.now());
	        this.timeoutMS = options.timeoutMS;
	        this.serverSelectionTimeoutMS = options.serverSelectionTimeoutMS;
	        this.socketTimeoutMS = options.socketTimeoutMS;
	        this.clearServerSelectionTimeout = false;
	    }
	    get maxTimeMS() {
	        return this.remainingTimeMS - this.minRoundTripTime;
	    }
	    get remainingTimeMS() {
	        const timePassed = Math.trunc(performance.now()) - this.start;
	        return this.timeoutMS <= 0 ? Infinity : this.timeoutMS - timePassed;
	    }
	    csotEnabled() {
	        return true;
	    }
	    get serverSelectionTimeout() {
	        // check for undefined
	        if (typeof this._serverSelectionTimeout !== 'object' || this._serverSelectionTimeout?.cleared) {
	            const { remainingTimeMS, serverSelectionTimeoutMS } = this;
	            if (remainingTimeMS <= 0)
	                return Timeout.reject(new error_1.MongoOperationTimeoutError(`Timed out in server selection after ${this.timeoutMS}ms`));
	            const usingServerSelectionTimeoutMS = serverSelectionTimeoutMS !== 0 &&
	                (0, utils_1.csotMin)(remainingTimeMS, serverSelectionTimeoutMS) === serverSelectionTimeoutMS;
	            if (usingServerSelectionTimeoutMS) {
	                this._serverSelectionTimeout = Timeout.expires(serverSelectionTimeoutMS);
	            }
	            else {
	                if (remainingTimeMS > 0 && Number.isFinite(remainingTimeMS)) {
	                    this._serverSelectionTimeout = Timeout.expires(remainingTimeMS);
	                }
	                else {
	                    this._serverSelectionTimeout = null;
	                }
	            }
	        }
	        return this._serverSelectionTimeout;
	    }
	    get connectionCheckoutTimeout() {
	        if (typeof this._connectionCheckoutTimeout !== 'object' ||
	            this._connectionCheckoutTimeout?.cleared) {
	            if (typeof this._serverSelectionTimeout === 'object') {
	                // null or Timeout
	                this._connectionCheckoutTimeout = this._serverSelectionTimeout;
	            }
	            else {
	                throw new error_1.MongoRuntimeError('Unreachable. If you are seeing this error, please file a ticket on the NODE driver project on Jira');
	            }
	        }
	        return this._connectionCheckoutTimeout;
	    }
	    get timeoutForSocketWrite() {
	        const { remainingTimeMS } = this;
	        if (!Number.isFinite(remainingTimeMS))
	            return null;
	        if (remainingTimeMS > 0)
	            return Timeout.expires(remainingTimeMS);
	        return Timeout.reject(new error_1.MongoOperationTimeoutError('Timed out before socket write'));
	    }
	    get timeoutForSocketRead() {
	        const { remainingTimeMS } = this;
	        if (!Number.isFinite(remainingTimeMS))
	            return null;
	        if (remainingTimeMS > 0)
	            return Timeout.expires(remainingTimeMS);
	        return Timeout.reject(new error_1.MongoOperationTimeoutError('Timed out before socket read'));
	    }
	    refresh() {
	        this.start = Math.trunc(performance.now());
	        this.minRoundTripTime = 0;
	        this._serverSelectionTimeout?.clear();
	        this._connectionCheckoutTimeout?.clear();
	    }
	    clear() {
	        this._serverSelectionTimeout?.clear();
	        this._connectionCheckoutTimeout?.clear();
	    }
	    /**
	     * @internal
	     * Throws a MongoOperationTimeoutError if the context has expired.
	     * If the context has not expired, returns the `remainingTimeMS`
	     **/
	    getRemainingTimeMSOrThrow(message) {
	        const { remainingTimeMS } = this;
	        if (remainingTimeMS <= 0)
	            throw new error_1.MongoOperationTimeoutError(message ?? `Expired after ${this.timeoutMS}ms`);
	        return remainingTimeMS;
	    }
	    /**
	     * @internal
	     * This method is intended to be used in situations where concurrent operation are on the same deadline, but cannot share a single `TimeoutContext` instance.
	     * Returns a new instance of `CSOTTimeoutContext` constructed with identical options, but setting the `start` property to `this.start`.
	     */
	    clone() {
	        const timeoutContext = new CSOTTimeoutContext({
	            timeoutMS: this.timeoutMS,
	            serverSelectionTimeoutMS: this.serverSelectionTimeoutMS
	        });
	        timeoutContext.start = this.start;
	        return timeoutContext;
	    }
	    refreshed() {
	        return new CSOTTimeoutContext(this);
	    }
	    addMaxTimeMSToCommand(command, options) {
	        if (options.omitMaxTimeMS)
	            return;
	        const maxTimeMS = this.remainingTimeMS - this.minRoundTripTime;
	        if (maxTimeMS > 0 && Number.isFinite(maxTimeMS))
	            command.maxTimeMS = maxTimeMS;
	    }
	    getSocketTimeoutMS() {
	        return 0;
	    }
	}
	timeout.CSOTTimeoutContext = CSOTTimeoutContext;
	/** @internal */
	class LegacyTimeoutContext extends TimeoutContext {
	    constructor(options) {
	        super();
	        this.options = options;
	        this.clearServerSelectionTimeout = true;
	    }
	    csotEnabled() {
	        return false;
	    }
	    get serverSelectionTimeout() {
	        if (this.options.serverSelectionTimeoutMS != null && this.options.serverSelectionTimeoutMS > 0)
	            return Timeout.expires(this.options.serverSelectionTimeoutMS);
	        return null;
	    }
	    get connectionCheckoutTimeout() {
	        if (this.options.waitQueueTimeoutMS != null && this.options.waitQueueTimeoutMS > 0)
	            return Timeout.expires(this.options.waitQueueTimeoutMS);
	        return null;
	    }
	    get timeoutForSocketWrite() {
	        return null;
	    }
	    get timeoutForSocketRead() {
	        return null;
	    }
	    refresh() {
	        return;
	    }
	    clear() {
	        return;
	    }
	    get maxTimeMS() {
	        return null;
	    }
	    refreshed() {
	        return new LegacyTimeoutContext(this.options);
	    }
	    addMaxTimeMSToCommand(_command, _options) {
	        // No max timeMS is added to commands in legacy timeout mode.
	    }
	    getSocketTimeoutMS() {
	        return this.options.socketTimeoutMS;
	    }
	}
	timeout.LegacyTimeoutContext = LegacyTimeoutContext;
	
	return timeout;
}

var sort = {};

var hasRequiredSort;

function requireSort () {
	if (hasRequiredSort) return sort;
	hasRequiredSort = 1;
	Object.defineProperty(sort, "__esModule", { value: true });
	sort.formatSort = formatSort;
	const error_1 = mongodb4.requireError();
	/** @internal */
	function prepareDirection(direction = 1) {
	    const value = `${direction}`.toLowerCase();
	    if (isMeta(direction))
	        return direction;
	    switch (value) {
	        case 'ascending':
	        case 'asc':
	        case '1':
	            return 1;
	        case 'descending':
	        case 'desc':
	        case '-1':
	            return -1;
	        default:
	            throw new error_1.MongoInvalidArgumentError(`Invalid sort direction: ${JSON.stringify(direction)}`);
	    }
	}
	/** @internal */
	function isMeta(t) {
	    return typeof t === 'object' && t != null && '$meta' in t && typeof t.$meta === 'string';
	}
	/** @internal */
	function isPair(t) {
	    if (Array.isArray(t) && t.length === 2) {
	        try {
	            prepareDirection(t[1]);
	            return true;
	        }
	        catch {
	            return false;
	        }
	    }
	    return false;
	}
	function isDeep(t) {
	    return Array.isArray(t) && Array.isArray(t[0]);
	}
	function isMap(t) {
	    return t instanceof Map && t.size > 0;
	}
	function isReadonlyArray(value) {
	    return Array.isArray(value);
	}
	/** @internal */
	function pairToMap(v) {
	    return new Map([[`${v[0]}`, prepareDirection([v[1]])]]);
	}
	/** @internal */
	function deepToMap(t) {
	    const sortEntries = t.map(([k, v]) => [`${k}`, prepareDirection(v)]);
	    return new Map(sortEntries);
	}
	/** @internal */
	function stringsToMap(t) {
	    const sortEntries = t.map(key => [`${key}`, 1]);
	    return new Map(sortEntries);
	}
	/** @internal */
	function objectToMap(t) {
	    const sortEntries = Object.entries(t).map(([k, v]) => [
	        `${k}`,
	        prepareDirection(v)
	    ]);
	    return new Map(sortEntries);
	}
	/** @internal */
	function mapToMap(t) {
	    const sortEntries = Array.from(t).map(([k, v]) => [
	        `${k}`,
	        prepareDirection(v)
	    ]);
	    return new Map(sortEntries);
	}
	/** converts a Sort type into a type that is valid for the server (SortForCmd) */
	function formatSort(sort, direction) {
	    if (sort == null)
	        return undefined;
	    if (typeof sort === 'string')
	        return new Map([[sort, prepareDirection(direction)]]); // 'fieldName'
	    if (typeof sort !== 'object') {
	        throw new error_1.MongoInvalidArgumentError(`Invalid sort format: ${JSON.stringify(sort)} Sort must be a valid object`);
	    }
	    if (!isReadonlyArray(sort)) {
	        if (isMap(sort))
	            return mapToMap(sort); // Map<fieldName, SortDirection>
	        if (Object.keys(sort).length)
	            return objectToMap(sort); // { [fieldName: string]: SortDirection }
	        return undefined;
	    }
	    if (!sort.length)
	        return undefined;
	    if (isDeep(sort))
	        return deepToMap(sort); // [ [fieldName, sortDir], [fieldName, sortDir] ... ]
	    if (isPair(sort))
	        return pairToMap(sort); // [ fieldName, sortDir ]
	    return stringsToMap(sort); // [ fieldName, fieldName ]
	}
	
	return sort;
}

var sessions = {};

var transactions = {};

var hasRequiredTransactions;

function requireTransactions () {
	if (hasRequiredTransactions) return transactions;
	hasRequiredTransactions = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.Transaction = exports.TxnState = void 0;
		exports.isTransactionCommand = isTransactionCommand;
		const error_1 = mongodb4.requireError();
		const read_concern_1 = mongodb5.requireRead_concern();
		const read_preference_1 = mongodb5.requireRead_preference();
		const write_concern_1 = mongodb7.requireWrite_concern();
		/** @internal */
		exports.TxnState = Object.freeze({
		    NO_TRANSACTION: 'NO_TRANSACTION',
		    STARTING_TRANSACTION: 'STARTING_TRANSACTION',
		    TRANSACTION_IN_PROGRESS: 'TRANSACTION_IN_PROGRESS',
		    TRANSACTION_COMMITTED: 'TRANSACTION_COMMITTED',
		    TRANSACTION_COMMITTED_EMPTY: 'TRANSACTION_COMMITTED_EMPTY',
		    TRANSACTION_ABORTED: 'TRANSACTION_ABORTED'
		});
		const stateMachine = {
		    [exports.TxnState.NO_TRANSACTION]: [exports.TxnState.NO_TRANSACTION, exports.TxnState.STARTING_TRANSACTION],
		    [exports.TxnState.STARTING_TRANSACTION]: [
		        exports.TxnState.TRANSACTION_IN_PROGRESS,
		        exports.TxnState.TRANSACTION_COMMITTED,
		        exports.TxnState.TRANSACTION_COMMITTED_EMPTY,
		        exports.TxnState.TRANSACTION_ABORTED
		    ],
		    [exports.TxnState.TRANSACTION_IN_PROGRESS]: [
		        exports.TxnState.TRANSACTION_IN_PROGRESS,
		        exports.TxnState.TRANSACTION_COMMITTED,
		        exports.TxnState.TRANSACTION_ABORTED
		    ],
		    [exports.TxnState.TRANSACTION_COMMITTED]: [
		        exports.TxnState.TRANSACTION_COMMITTED,
		        exports.TxnState.TRANSACTION_COMMITTED_EMPTY,
		        exports.TxnState.STARTING_TRANSACTION,
		        exports.TxnState.NO_TRANSACTION
		    ],
		    [exports.TxnState.TRANSACTION_ABORTED]: [exports.TxnState.STARTING_TRANSACTION, exports.TxnState.NO_TRANSACTION],
		    [exports.TxnState.TRANSACTION_COMMITTED_EMPTY]: [
		        exports.TxnState.TRANSACTION_COMMITTED_EMPTY,
		        exports.TxnState.NO_TRANSACTION
		    ]
		};
		const ACTIVE_STATES = new Set([
		    exports.TxnState.STARTING_TRANSACTION,
		    exports.TxnState.TRANSACTION_IN_PROGRESS
		]);
		const COMMITTED_STATES = new Set([
		    exports.TxnState.TRANSACTION_COMMITTED,
		    exports.TxnState.TRANSACTION_COMMITTED_EMPTY,
		    exports.TxnState.TRANSACTION_ABORTED
		]);
		/**
		 * @internal
		 */
		class Transaction {
		    /** Create a transaction */
		    constructor(options) {
		        options = options ?? {};
		        this.state = exports.TxnState.NO_TRANSACTION;
		        this.options = {};
		        const writeConcern = write_concern_1.WriteConcern.fromOptions(options);
		        if (writeConcern) {
		            if (writeConcern.w === 0) {
		                throw new error_1.MongoTransactionError('Transactions do not support unacknowledged write concern');
		            }
		            this.options.writeConcern = writeConcern;
		        }
		        if (options.readConcern) {
		            this.options.readConcern = read_concern_1.ReadConcern.fromOptions(options);
		        }
		        if (options.readPreference) {
		            this.options.readPreference = read_preference_1.ReadPreference.fromOptions(options);
		        }
		        if (options.maxCommitTimeMS) {
		            this.options.maxTimeMS = options.maxCommitTimeMS;
		        }
		        // TODO: This isn't technically necessary
		        this._pinnedServer = undefined;
		        this._recoveryToken = undefined;
		    }
		    get server() {
		        return this._pinnedServer;
		    }
		    get recoveryToken() {
		        return this._recoveryToken;
		    }
		    get isPinned() {
		        return !!this.server;
		    }
		    /**
		     * @returns Whether the transaction has started
		     */
		    get isStarting() {
		        return this.state === exports.TxnState.STARTING_TRANSACTION;
		    }
		    /**
		     * @returns Whether this session is presently in a transaction
		     */
		    get isActive() {
		        return ACTIVE_STATES.has(this.state);
		    }
		    get isCommitted() {
		        return COMMITTED_STATES.has(this.state);
		    }
		    /**
		     * Transition the transaction in the state machine
		     * @param nextState - The new state to transition to
		     */
		    transition(nextState) {
		        const nextStates = stateMachine[this.state];
		        if (nextStates && nextStates.includes(nextState)) {
		            this.state = nextState;
		            if (this.state === exports.TxnState.NO_TRANSACTION ||
		                this.state === exports.TxnState.STARTING_TRANSACTION ||
		                this.state === exports.TxnState.TRANSACTION_ABORTED) {
		                this.unpinServer();
		            }
		            return;
		        }
		        throw new error_1.MongoRuntimeError(`Attempted illegal state transition from [${this.state}] to [${nextState}]`);
		    }
		    pinServer(server) {
		        if (this.isActive) {
		            this._pinnedServer = server;
		        }
		    }
		    unpinServer() {
		        this._pinnedServer = undefined;
		    }
		}
		exports.Transaction = Transaction;
		function isTransactionCommand(command) {
		    return !!(command.commitTransaction || command.abortTransaction);
		}
		
	} (transactions));
	return transactions;
}

var hasRequiredSessions;

function requireSessions () {
	if (hasRequiredSessions) return sessions;
	hasRequiredSessions = 1;
	Object.defineProperty(sessions, "__esModule", { value: true });
	sessions.ServerSessionPool = sessions.ServerSession = sessions.ClientSession = void 0;
	sessions.maybeClearPinnedConnection = maybeClearPinnedConnection;
	sessions.applySession = applySession;
	sessions.updateSessionFromResponse = updateSessionFromResponse;
	const promises_1 = require$$0$1;
	const bson_1 = mongodb1.requireBson();
	const metrics_1 = mongodb2.requireMetrics();
	const constants_1 = mongodb3.requireConstants();
	const error_1 = mongodb4.requireError();
	const mongo_types_1 = mongodb5.requireMongo_types();
	const execute_operation_1 = mongodb5.requireExecute_operation();
	const run_command_1 = mongodb5.requireRun_command();
	const read_concern_1 = mongodb5.requireRead_concern();
	const read_preference_1 = mongodb5.requireRead_preference();
	const common_1 = mongodb5.requireCommon();
	const timeout_1 = requireTimeout();
	const transactions_1 = requireTransactions();
	const utils_1 = mongodb7.requireUtils();
	const write_concern_1 = mongodb7.requireWrite_concern();
	/**
	 * A class representing a client session on the server
	 *
	 * NOTE: not meant to be instantiated directly.
	 * @public
	 */
	class ClientSession extends mongo_types_1.TypedEventEmitter {
	    /**
	     * Create a client session.
	     * @internal
	     * @param client - The current client
	     * @param sessionPool - The server session pool (Internal Class)
	     * @param options - Optional settings
	     * @param clientOptions - Optional settings provided when creating a MongoClient
	     */
	    constructor(client, sessionPool, options, clientOptions) {
	        super();
	        /** @internal */
	        this.timeoutContext = null;
	        this.on('error', utils_1.noop);
	        if (client == null) {
	            // TODO(NODE-3483)
	            throw new error_1.MongoRuntimeError('ClientSession requires a MongoClient');
	        }
	        if (sessionPool == null || !(sessionPool instanceof ServerSessionPool)) {
	            // TODO(NODE-3483)
	            throw new error_1.MongoRuntimeError('ClientSession requires a ServerSessionPool');
	        }
	        options = options ?? {};
	        this.snapshotEnabled = options.snapshot === true;
	        if (options.causalConsistency === true && this.snapshotEnabled) {
	            throw new error_1.MongoInvalidArgumentError('Properties "causalConsistency" and "snapshot" are mutually exclusive');
	        }
	        this.client = client;
	        this.sessionPool = sessionPool;
	        this.hasEnded = false;
	        this.clientOptions = clientOptions;
	        this.timeoutMS = options.defaultTimeoutMS ?? client.s.options?.timeoutMS;
	        this.explicit = !!options.explicit;
	        this._serverSession = this.explicit ? this.sessionPool.acquire() : null;
	        this.txnNumberIncrement = 0;
	        const defaultCausalConsistencyValue = this.explicit && options.snapshot !== true;
	        this.supports = {
	            // if we can enable causal consistency, do so by default
	            causalConsistency: options.causalConsistency ?? defaultCausalConsistencyValue
	        };
	        this.clusterTime = options.initialClusterTime;
	        this.operationTime = undefined;
	        this.owner = options.owner;
	        this.defaultTransactionOptions = { ...options.defaultTransactionOptions };
	        this.transaction = new transactions_1.Transaction();
	    }
	    /** The server id associated with this session */
	    get id() {
	        return this.serverSession?.id;
	    }
	    get serverSession() {
	        let serverSession = this._serverSession;
	        if (serverSession == null) {
	            if (this.explicit) {
	                throw new error_1.MongoRuntimeError('Unexpected null serverSession for an explicit session');
	            }
	            if (this.hasEnded) {
	                throw new error_1.MongoRuntimeError('Unexpected null serverSession for an ended implicit session');
	            }
	            serverSession = this.sessionPool.acquire();
	            this._serverSession = serverSession;
	        }
	        return serverSession;
	    }
	    get loadBalanced() {
	        return this.client.topology?.description.type === common_1.TopologyType.LoadBalanced;
	    }
	    /** @internal */
	    pin(conn) {
	        if (this.pinnedConnection) {
	            throw TypeError('Cannot pin multiple connections to the same session');
	        }
	        this.pinnedConnection = conn;
	        conn.emit(constants_1.PINNED, this.inTransaction() ? metrics_1.ConnectionPoolMetrics.TXN : metrics_1.ConnectionPoolMetrics.CURSOR);
	    }
	    /** @internal */
	    unpin(options) {
	        if (this.loadBalanced) {
	            return maybeClearPinnedConnection(this, options);
	        }
	        this.transaction.unpinServer();
	    }
	    get isPinned() {
	        return this.loadBalanced ? !!this.pinnedConnection : this.transaction.isPinned;
	    }
	    /**
	     * Frees any client-side resources held by the current session.  If a session is in a transaction,
	     * the transaction is aborted.
	     *
	     * Does not end the session on the server.
	     *
	     * @param options - Optional settings. Currently reserved for future use
	     */
	    async endSession(options) {
	        try {
	            if (this.inTransaction()) {
	                await this.abortTransaction({ ...options, throwTimeout: true });
	            }
	        }
	        catch (error) {
	            // spec indicates that we should ignore all errors for `endSessions`
	            if (error.name === 'MongoOperationTimeoutError')
	                throw error;
	            (0, utils_1.squashError)(error);
	        }
	        finally {
	            if (!this.hasEnded) {
	                const serverSession = this.serverSession;
	                if (serverSession != null) {
	                    // release the server session back to the pool
	                    this.sessionPool.release(serverSession);
	                    // Store a clone of the server session for reference (debugging)
	                    this._serverSession = new ServerSession(serverSession);
	                }
	                // mark the session as ended, and emit a signal
	                this.hasEnded = true;
	                this.emit('ended', this);
	            }
	            maybeClearPinnedConnection(this, { force: true, ...options });
	        }
	    }
	    /**
	     * @experimental
	     * An alias for {@link ClientSession.endSession|ClientSession.endSession()}.
	     */
	    async [Symbol.asyncDispose]() {
	        await this.endSession({ force: true });
	    }
	    /**
	     * Advances the operationTime for a ClientSession.
	     *
	     * @param operationTime - the `BSON.Timestamp` of the operation type it is desired to advance to
	     */
	    advanceOperationTime(operationTime) {
	        if (this.operationTime == null) {
	            this.operationTime = operationTime;
	            return;
	        }
	        if (operationTime.greaterThan(this.operationTime)) {
	            this.operationTime = operationTime;
	        }
	    }
	    /**
	     * Advances the clusterTime for a ClientSession to the provided clusterTime of another ClientSession
	     *
	     * @param clusterTime - the $clusterTime returned by the server from another session in the form of a document containing the `BSON.Timestamp` clusterTime and signature
	     */
	    advanceClusterTime(clusterTime) {
	        if (!clusterTime || typeof clusterTime !== 'object') {
	            throw new error_1.MongoInvalidArgumentError('input cluster time must be an object');
	        }
	        if (!clusterTime.clusterTime || clusterTime.clusterTime._bsontype !== 'Timestamp') {
	            throw new error_1.MongoInvalidArgumentError('input cluster time "clusterTime" property must be a valid BSON Timestamp');
	        }
	        if (!clusterTime.signature ||
	            clusterTime.signature.hash?._bsontype !== 'Binary' ||
	            (typeof clusterTime.signature.keyId !== 'bigint' &&
	                typeof clusterTime.signature.keyId !== 'number' &&
	                clusterTime.signature.keyId?._bsontype !== 'Long') // apparently we decode the key to number?
	        ) {
	            throw new error_1.MongoInvalidArgumentError('input cluster time must have a valid "signature" property with BSON Binary hash and BSON Long keyId');
	        }
	        (0, common_1._advanceClusterTime)(this, clusterTime);
	    }
	    /**
	     * Used to determine if this session equals another
	     *
	     * @param session - The session to compare to
	     */
	    equals(session) {
	        if (!(session instanceof ClientSession)) {
	            return false;
	        }
	        if (this.id == null || session.id == null) {
	            return false;
	        }
	        return bson_1.ByteUtils.equals(this.id.id.buffer, session.id.id.buffer);
	    }
	    /**
	     * Increment the transaction number on the internal ServerSession
	     *
	     * @privateRemarks
	     * This helper increments a value stored on the client session that will be
	     * added to the serverSession's txnNumber upon applying it to a command.
	     * This is because the serverSession is lazily acquired after a connection is obtained
	     */
	    incrementTransactionNumber() {
	        this.txnNumberIncrement += 1;
	    }
	    /** @returns whether this session is currently in a transaction or not */
	    inTransaction() {
	        return this.transaction.isActive;
	    }
	    /**
	     * Starts a new transaction with the given options.
	     *
	     * @remarks
	     * **IMPORTANT**: Running operations in parallel is not supported during a transaction. The use of `Promise.all`,
	     * `Promise.allSettled`, `Promise.race`, etc to parallelize operations inside a transaction is
	     * undefined behaviour.
	     *
	     * @param options - Options for the transaction
	     */
	    startTransaction(options) {
	        if (this.snapshotEnabled) {
	            throw new error_1.MongoCompatibilityError('Transactions are not supported in snapshot sessions');
	        }
	        if (this.inTransaction()) {
	            throw new error_1.MongoTransactionError('Transaction already in progress');
	        }
	        if (this.isPinned && this.transaction.isCommitted) {
	            this.unpin();
	        }
	        this.commitAttempted = false;
	        // increment txnNumber
	        this.incrementTransactionNumber();
	        // create transaction state
	        this.transaction = new transactions_1.Transaction({
	            readConcern: options?.readConcern ??
	                this.defaultTransactionOptions.readConcern ??
	                this.clientOptions?.readConcern,
	            writeConcern: options?.writeConcern ??
	                this.defaultTransactionOptions.writeConcern ??
	                this.clientOptions?.writeConcern,
	            readPreference: options?.readPreference ??
	                this.defaultTransactionOptions.readPreference ??
	                this.clientOptions?.readPreference,
	            maxCommitTimeMS: options?.maxCommitTimeMS ?? this.defaultTransactionOptions.maxCommitTimeMS
	        });
	        this.transaction.transition(transactions_1.TxnState.STARTING_TRANSACTION);
	    }
	    /**
	     * Commits the currently active transaction in this session.
	     *
	     * @param options - Optional options, can be used to override `defaultTimeoutMS`.
	     */
	    async commitTransaction(options) {
	        if (this.transaction.state === transactions_1.TxnState.NO_TRANSACTION) {
	            throw new error_1.MongoTransactionError('No transaction started');
	        }
	        if (this.transaction.state === transactions_1.TxnState.STARTING_TRANSACTION ||
	            this.transaction.state === transactions_1.TxnState.TRANSACTION_COMMITTED_EMPTY) {
	            // the transaction was never started, we can safely exit here
	            this.transaction.transition(transactions_1.TxnState.TRANSACTION_COMMITTED_EMPTY);
	            return;
	        }
	        if (this.transaction.state === transactions_1.TxnState.TRANSACTION_ABORTED) {
	            throw new error_1.MongoTransactionError('Cannot call commitTransaction after calling abortTransaction');
	        }
	        const command = { commitTransaction: 1 };
	        const timeoutMS = typeof options?.timeoutMS === 'number'
	            ? options.timeoutMS
	            : typeof this.timeoutMS === 'number'
	                ? this.timeoutMS
	                : null;
	        const wc = this.transaction.options.writeConcern ?? this.clientOptions?.writeConcern;
	        if (wc != null) {
	            if (timeoutMS == null && this.timeoutContext == null) {
	                write_concern_1.WriteConcern.apply(command, { wtimeoutMS: 10000, w: 'majority', ...wc });
	            }
	            else {
	                const wcKeys = Object.keys(wc);
	                if (wcKeys.length > 2 || (!wcKeys.includes('wtimeoutMS') && !wcKeys.includes('wTimeoutMS')))
	                    // if the write concern was specified with wTimeoutMS, then we set both wtimeoutMS
	                    // and wTimeoutMS, guaranteeing at least two keys, so if we have more than two keys,
	                    // then we can automatically assume that we should add the write concern to the command.
	                    // If it has 2 or fewer keys, we need to check that those keys aren't the wtimeoutMS
	                    // or wTimeoutMS options before we add the write concern to the command
	                    write_concern_1.WriteConcern.apply(command, { ...wc, wtimeoutMS: undefined });
	            }
	        }
	        if (this.transaction.state === transactions_1.TxnState.TRANSACTION_COMMITTED || this.commitAttempted) {
	            if (timeoutMS == null && this.timeoutContext == null) {
	                write_concern_1.WriteConcern.apply(command, { wtimeoutMS: 10000, ...wc, w: 'majority' });
	            }
	            else {
	                write_concern_1.WriteConcern.apply(command, { w: 'majority', ...wc, wtimeoutMS: undefined });
	            }
	        }
	        if (typeof this.transaction.options.maxTimeMS === 'number') {
	            command.maxTimeMS = this.transaction.options.maxTimeMS;
	        }
	        if (this.transaction.recoveryToken) {
	            command.recoveryToken = this.transaction.recoveryToken;
	        }
	        const operation = new run_command_1.RunCommandOperation(new utils_1.MongoDBNamespace('admin'), command, {
	            session: this,
	            readPreference: read_preference_1.ReadPreference.primary,
	            bypassPinningCheck: true
	        });
	        operation.maxAttempts = this.clientOptions.maxAdaptiveRetries + 1;
	        const timeoutContext = this.timeoutContext ??
	            (typeof timeoutMS === 'number'
	                ? timeout_1.TimeoutContext.create({
	                    serverSelectionTimeoutMS: this.clientOptions.serverSelectionTimeoutMS,
	                    socketTimeoutMS: this.clientOptions.socketTimeoutMS,
	                    timeoutMS
	                })
	                : null);
	        try {
	            await (0, execute_operation_1.executeOperation)(this.client, operation, timeoutContext);
	            this.commitAttempted = undefined;
	            return;
	        }
	        catch (firstCommitError) {
	            this.commitAttempted = true;
	            const remainingAttempts = this.clientOptions.maxAdaptiveRetries + 1 - operation.attemptsMade;
	            if (remainingAttempts <= 0) {
	                throw firstCommitError;
	            }
	            if (firstCommitError instanceof error_1.MongoError && (0, error_1.isRetryableWriteError)(firstCommitError)) {
	                // SPEC-1185: apply majority write concern when retrying commitTransaction
	                write_concern_1.WriteConcern.apply(command, { wtimeoutMS: 10000, ...wc, w: 'majority' });
	                // per txns spec, must unpin session in this case
	                this.unpin({ force: true });
	                try {
	                    const op = new run_command_1.RunCommandOperation(new utils_1.MongoDBNamespace('admin'), command, {
	                        session: this,
	                        readPreference: read_preference_1.ReadPreference.primary,
	                        bypassPinningCheck: true
	                    });
	                    op.maxAttempts = remainingAttempts;
	                    await (0, execute_operation_1.executeOperation)(this.client, op, timeoutContext);
	                    return;
	                }
	                catch (retryCommitError) {
	                    // If the retry failed, we process that error instead of the original
	                    if (shouldAddUnknownTransactionCommitResultLabel(retryCommitError)) {
	                        retryCommitError.addErrorLabel(error_1.MongoErrorLabel.UnknownTransactionCommitResult);
	                    }
	                    if (shouldUnpinAfterCommitError(retryCommitError)) {
	                        this.unpin({ error: retryCommitError });
	                    }
	                    throw retryCommitError;
	                }
	            }
	            if (shouldAddUnknownTransactionCommitResultLabel(firstCommitError)) {
	                firstCommitError.addErrorLabel(error_1.MongoErrorLabel.UnknownTransactionCommitResult);
	            }
	            if (shouldUnpinAfterCommitError(firstCommitError)) {
	                this.unpin({ error: firstCommitError });
	            }
	            throw firstCommitError;
	        }
	        finally {
	            this.transaction.transition(transactions_1.TxnState.TRANSACTION_COMMITTED);
	        }
	    }
	    async abortTransaction(options) {
	        if (this.transaction.state === transactions_1.TxnState.NO_TRANSACTION) {
	            throw new error_1.MongoTransactionError('No transaction started');
	        }
	        if (this.transaction.state === transactions_1.TxnState.STARTING_TRANSACTION) {
	            // the transaction was never started, we can safely exit here
	            this.transaction.transition(transactions_1.TxnState.TRANSACTION_ABORTED);
	            return;
	        }
	        if (this.transaction.state === transactions_1.TxnState.TRANSACTION_ABORTED) {
	            throw new error_1.MongoTransactionError('Cannot call abortTransaction twice');
	        }
	        if (this.transaction.state === transactions_1.TxnState.TRANSACTION_COMMITTED ||
	            this.transaction.state === transactions_1.TxnState.TRANSACTION_COMMITTED_EMPTY) {
	            throw new error_1.MongoTransactionError('Cannot call abortTransaction after calling commitTransaction');
	        }
	        const command = { abortTransaction: 1 };
	        const timeoutMS = typeof options?.timeoutMS === 'number'
	            ? options.timeoutMS
	            : this.timeoutContext?.csotEnabled()
	                ? this.timeoutContext.timeoutMS // refresh timeoutMS for abort operation
	                : typeof this.timeoutMS === 'number'
	                    ? this.timeoutMS
	                    : null;
	        const timeoutContext = timeoutMS != null
	            ? timeout_1.TimeoutContext.create({
	                timeoutMS,
	                serverSelectionTimeoutMS: this.clientOptions.serverSelectionTimeoutMS,
	                socketTimeoutMS: this.clientOptions.socketTimeoutMS
	            })
	            : null;
	        const wc = this.transaction.options.writeConcern ?? this.clientOptions?.writeConcern;
	        if (wc != null && timeoutMS == null) {
	            write_concern_1.WriteConcern.apply(command, { wtimeoutMS: 10000, w: 'majority', ...wc });
	        }
	        if (this.transaction.recoveryToken) {
	            command.recoveryToken = this.transaction.recoveryToken;
	        }
	        const operation = new run_command_1.RunCommandOperation(new utils_1.MongoDBNamespace('admin'), command, {
	            session: this,
	            readPreference: read_preference_1.ReadPreference.primary,
	            bypassPinningCheck: true
	        });
	        try {
	            await (0, execute_operation_1.executeOperation)(this.client, operation, timeoutContext);
	            this.unpin();
	            return;
	        }
	        catch (firstAbortError) {
	            this.unpin();
	            if (firstAbortError.name === 'MongoRuntimeError')
	                throw firstAbortError;
	            if (options?.throwTimeout && firstAbortError.name === 'MongoOperationTimeoutError') {
	                throw firstAbortError;
	            }
	            if (firstAbortError instanceof error_1.MongoError && (0, error_1.isRetryableWriteError)(firstAbortError)) {
	                try {
	                    await (0, execute_operation_1.executeOperation)(this.client, operation, timeoutContext);
	                    return;
	                }
	                catch (secondAbortError) {
	                    if (secondAbortError.name === 'MongoRuntimeError')
	                        throw secondAbortError;
	                    if (options?.throwTimeout && secondAbortError.name === 'MongoOperationTimeoutError') {
	                        throw secondAbortError;
	                    }
	                    // we do not retry the retry
	                }
	            }
	            // The spec indicates that if the operation times out or fails with a non-retryable error, we should ignore all errors on `abortTransaction`
	        }
	        finally {
	            this.transaction.transition(transactions_1.TxnState.TRANSACTION_ABORTED);
	            if (this.loadBalanced) {
	                maybeClearPinnedConnection(this, { force: false });
	            }
	        }
	    }
	    /**
	     * This is here to ensure that ClientSession is never serialized to BSON.
	     */
	    toBSON() {
	        throw new error_1.MongoRuntimeError('ClientSession cannot be serialized to BSON.');
	    }
	    /**
	     * Starts a transaction and runs a provided function, ensuring the commitTransaction is always attempted when all operations run in the function have completed.
	     *
	     * **IMPORTANT:** This method requires the function passed in to return a Promise. That promise must be made by `await`-ing all operations in such a way that rejections are propagated to the returned promise.
	     *
	     * **IMPORTANT:** Running operations in parallel is not supported during a transaction. The use of `Promise.all`,
	     * `Promise.allSettled`, `Promise.race`, etc to parallelize operations inside a transaction is
	     * undefined behaviour.
	     *
	     * **IMPORTANT:** When running an operation inside a `withTransaction` callback, if it is not
	     * provided the explicit session in its options, it will not be part of the transaction and it will not respect timeoutMS.
	     *
	     *
	     * @remarks
	     * - If all operations successfully complete and the `commitTransaction` operation is successful, then the provided function will return the result of the provided function.
	     * - If the transaction is unable to complete or an error is thrown from within the provided function, then the provided function will throw an error.
	     *   - If the transaction is manually aborted within the provided function it will not throw.
	     * - If the driver needs to attempt to retry the operations, the provided function may be called multiple times.
	     *
	     * Checkout a descriptive example here:
	     * @see https://www.mongodb.com/blog/post/quick-start-nodejs--mongodb--how-to-implement-transactions
	     *
	     * If a command inside withTransaction fails:
	     * - It may cause the transaction on the server to be aborted.
	     * - This situation is normally handled transparently by the driver.
	     * - However, if the application catches such an error and does not rethrow it, the driver will not be able to determine whether the transaction was aborted or not.
	     * - The driver will then retry the transaction indefinitely.
	     *
	     * To avoid this situation, the application must not silently handle errors within the provided function.
	     * If the application needs to handle errors within, it must await all operations such that if an operation is rejected it becomes the rejection of the callback function passed into withTransaction.
	     *
	     * @param fn - callback to run within a transaction
	     * @param options - optional settings for the transaction
	     * @returns A raw command response or undefined
	     */
	    async withTransaction(fn, options) {
	        const MAX_TIMEOUT = 120_000;
	        const timeoutMS = options?.timeoutMS ?? this.timeoutMS ?? null;
	        this.timeoutContext =
	            timeoutMS != null
	                ? timeout_1.TimeoutContext.create({
	                    timeoutMS,
	                    serverSelectionTimeoutMS: this.clientOptions.serverSelectionTimeoutMS,
	                    socketTimeoutMS: this.clientOptions.socketTimeoutMS
	                })
	                : null;
	        // 1. Define the following:
	        // 1.1 Record the current monotonic time, which will be used to enforce the 120-second / CSOT timeout before later retry attempts.
	        // 1.2 Set `transactionAttempt` to `0`.
	        // 1.3 Set `TIMEOUT_MS` to be `timeoutMS` if given, otherwise MAX_TIMEOUT (120-seconds).
	        // Timeout Error propagation
	        // When the previously encountered error needs to be propagated because there is no more time for another attempt,
	        // and it is not already a timeout error, then:
	        //  - A timeout error MUST be propagated instead. It MUST expose the previously encountered error as specified in
	        //    the "Errors" section of the CSOT specification.
	        //  - If exposing the previously encountered error from a timeout error is impossible in a driver, then the driver
	        //    is exempt from the requirement and MUST propagate the previously encountered error as is. The timeout error
	        //    MUST copy all error labels from the previously encountered error.
	        // The spec describes timeout checks as "elapsed time < TIMEOUT_MS" (where elapsed = now - start).
	        // We precompute `deadline = now + remainingTimeMS` so each check becomes simply `now < deadline`.
	        const csotEnabled = !!this.timeoutContext?.csotEnabled();
	        const remainingTimeMS = this.timeoutContext?.csotEnabled()
	            ? this.timeoutContext.remainingTimeMS
	            : MAX_TIMEOUT;
	        const deadline = (0, utils_1.processTimeMS)() + remainingTimeMS;
	        let committed = false;
	        let result;
	        let lastError = null;
	        try {
	            retryTransaction: for (let transactionAttempt = 0, isRetry = false; !committed; ++transactionAttempt, isRetry = transactionAttempt > 0) {
	                // 2. If `transactionAttempt` > 0:
	                if (isRetry) {
	                    // 2.1 Calculate backoffMS to be jitter * min(BACKOFF_INITIAL * 1.5 ** (transactionAttempt - 1), BACKOFF_MAX).
	                    //  If elapsed time + backoffMS > TIMEOUT_MS, then propagate the previously encountered error to the caller of
	                    //  withTransaction as per timeout error propagation and return immediately. Otherwise, sleep for backoffMS.
	                    //  2.1.1 jitter is a random float between [0, 1), optionally including 1, depending on what is most natural
	                    //    for the given driver language.
	                    //  2.1.2 transactionAttempt is the variable defined in step 1.
	                    //  2.1.3 BACKOFF_INITIAL is 5ms
	                    //  2.1.4 BACKOFF_MAX is 500ms
	                    const BACKOFF_INITIAL_MS = 5;
	                    const BACKOFF_MAX_MS = 500;
	                    const BACKOFF_GROWTH = 1.5;
	                    const jitter = Math.random();
	                    const backoffMS = jitter *
	                        Math.min(BACKOFF_INITIAL_MS * BACKOFF_GROWTH ** (transactionAttempt - 1), BACKOFF_MAX_MS);
	                    if ((0, utils_1.processTimeMS)() + backoffMS >= deadline) {
	                        throw makeTimeoutError(lastError ??
	                            new error_1.MongoRuntimeError(`Transaction retry did not record an error: should never occur. Please file a bug.`), csotEnabled);
	                    }
	                    await (0, promises_1.setTimeout)(backoffMS);
	                }
	                // 3. Invoke startTransaction on the session and increment transactionAttempt. If TransactionOptions were
	                // specified in the call to withTransaction, those MUST be used for startTransaction. Note that
	                // ClientSession.defaultTransactionOptions will be used in the absence of any explicit TransactionOptions.
	                // 4. If startTransaction reported an error, propagate that error to the caller of withTransaction as is and
	                // return immediately.
	                this.startTransaction(options);
	                try {
	                    // 5. Invoke the callback. Drivers MUST ensure that the ClientSession can be accessed within the callback
	                    // (e.g. pass ClientSession as the first parameter, rely on lexical scoping). Drivers MAY pass additional
	                    // parameters as needed (e.g. user data solicited by withTransaction).
	                    const promise = fn(this);
	                    if (!(0, utils_1.isPromiseLike)(promise)) {
	                        throw new error_1.MongoInvalidArgumentError('Function provided to `withTransaction` must return a Promise');
	                    }
	                    // 6. Control returns to withTransaction. Determine the current state of the ClientSession and whether the
	                    // callback reported an error (e.g. thrown exception, error output parameter).
	                    result = await promise;
	                    // 8. If the ClientSession is in the "no transaction", "transaction aborted", or "transaction committed"
	                    // state, assume the callback intentionally aborted or committed the transaction and return immediately.
	                    if (this.transaction.state === transactions_1.TxnState.NO_TRANSACTION ||
	                        this.transaction.state === transactions_1.TxnState.TRANSACTION_COMMITTED ||
	                        this.transaction.state === transactions_1.TxnState.TRANSACTION_ABORTED) {
	                        return result;
	                    }
	                }
	                catch (fnError) {
	                    // 7. If the callback reported an error
	                    if (!(fnError instanceof error_1.MongoError) || fnError instanceof error_1.MongoInvalidArgumentError) {
	                        // This first preemptive abort regardless of TxnState isn't spec,
	                        // and it's unclear whether it's serving a practical purpose, but this logic is OLD
	                        await this.abortTransaction();
	                        throw fnError;
	                    }
	                    lastError = fnError;
	                    // 7.1 If the ClientSession is in the "starting transaction" or "transaction in progress"
	                    // state, invoke abortTransaction on the session.
	                    if (this.transaction.state === transactions_1.TxnState.STARTING_TRANSACTION ||
	                        this.transaction.state === transactions_1.TxnState.TRANSACTION_IN_PROGRESS) {
	                        await this.abortTransaction();
	                    }
	                    // 7.2 If the callback's error includes a "TransientTransactionError" label, jump back to step two.
	                    if (fnError.hasErrorLabel(error_1.MongoErrorLabel.TransientTransactionError)) {
	                        if ((0, utils_1.processTimeMS)() >= deadline) {
	                            throw makeTimeoutError(lastError, csotEnabled);
	                        }
	                        continue retryTransaction;
	                    }
	                    // 7.3 If the callback's error includes a "UnknownTransactionCommitResult" label, the callback must
	                    // have manually committed a transaction, propagate the callback's error to the caller of withTransaction
	                    // as is and return immediately.
	                    // 7.4 Otherwise, propagate the callback's error to the caller of withTransaction as is and return immediately.
	                    throw fnError;
	                }
	                retryCommit: while (!committed) {
	                    try {
	                        // 9. Invoke commitTransaction on the session.
	                        await this.commitTransaction();
	                        committed = true;
	                    }
	                    catch (commitError) {
	                        // 10. If commitTransaction reported an error:
	                        lastError = commitError;
	                        // 10.1 If the commitTransaction error includes a UnknownTransactionCommitResult label and the error is
	                        // not MaxTimeMSExpired
	                        if (commitError.hasErrorLabel(error_1.MongoErrorLabel.UnknownTransactionCommitResult) &&
	                            !isMaxTimeMSExpiredError(commitError)) {
	                            // 10.1.1 If the elapsed time of withTransaction exceeded TIMEOUT_MS, propagate the commitTransaction
	                            // error to the caller of withTransaction as per timeout error propagation and return immediately.
	                            if ((0, utils_1.processTimeMS)() >= deadline) {
	                                throw makeTimeoutError(commitError, csotEnabled);
	                            }
	                            // 10.1.2 Otherwise, jump back to step nine. We will trust commitTransaction to apply a majority write
	                            // concern on retry attempts (see: Majority write concern is used when retrying commitTransaction).
	                            continue retryCommit;
	                        }
	                        // 10.2 If the commitTransaction error includes a TransientTransactionError label, jump back to step two.
	                        if (commitError.hasErrorLabel(error_1.MongoErrorLabel.TransientTransactionError)) {
	                            continue retryTransaction;
	                        }
	                        // 10.3 Otherwise, propagate the commitTransaction error to the caller of withTransaction as is and return
	                        // immediately.
	                        throw commitError;
	                    }
	                }
	            }
	            // 11. The transaction was committed successfully. Return immediately.
	            // @ts-expect-error Result is always defined if we reach here, the for-loop above convinces TS it is not.
	            return result;
	        }
	        finally {
	            this.timeoutContext = null;
	        }
	    }
	}
	sessions.ClientSession = ClientSession;
	function makeTimeoutError(cause, csotEnabled) {
	    // Async APIs know how to cancel themselves and might return CSOT error
	    if (cause instanceof error_1.MongoOperationTimeoutError) {
	        return cause;
	    }
	    if (csotEnabled) {
	        const timeoutError = new error_1.MongoOperationTimeoutError('Timed out during withTransaction', {
	            cause
	        });
	        if (cause instanceof error_1.MongoError) {
	            for (const label of cause.errorLabels) {
	                timeoutError.addErrorLabel(label);
	            }
	        }
	        return timeoutError;
	    }
	    return cause;
	}
	const NON_DETERMINISTIC_WRITE_CONCERN_ERRORS = new Set([
	    'CannotSatisfyWriteConcern',
	    'UnknownReplWriteConcern',
	    'UnsatisfiableWriteConcern'
	]);
	function shouldUnpinAfterCommitError(commitError) {
	    if (commitError instanceof error_1.MongoError) {
	        if ((0, error_1.isRetryableWriteError)(commitError) ||
	            commitError instanceof error_1.MongoWriteConcernError ||
	            isMaxTimeMSExpiredError(commitError)) {
	            if (isUnknownTransactionCommitResult(commitError)) {
	                // per txns spec, must unpin session in this case
	                return true;
	            }
	        }
	        else if (commitError.hasErrorLabel(error_1.MongoErrorLabel.TransientTransactionError)) {
	            return true;
	        }
	    }
	    return false;
	}
	function shouldAddUnknownTransactionCommitResultLabel(commitError) {
	    let ok = (0, error_1.isRetryableWriteError)(commitError);
	    ok ||= commitError instanceof error_1.MongoWriteConcernError;
	    ok ||= isMaxTimeMSExpiredError(commitError);
	    ok &&= isUnknownTransactionCommitResult(commitError);
	    return ok;
	}
	function isUnknownTransactionCommitResult(err) {
	    const isNonDeterministicWriteConcernError = err instanceof error_1.MongoServerError &&
	        err.codeName &&
	        NON_DETERMINISTIC_WRITE_CONCERN_ERRORS.has(err.codeName);
	    return (isMaxTimeMSExpiredError(err) ||
	        (!isNonDeterministicWriteConcernError &&
	            err.code !== error_1.MONGODB_ERROR_CODES.UnsatisfiableWriteConcern &&
	            err.code !== error_1.MONGODB_ERROR_CODES.UnknownReplWriteConcern));
	}
	function maybeClearPinnedConnection(session, options) {
	    // unpin a connection if it has been pinned
	    const conn = session.pinnedConnection;
	    const error = options?.error;
	    if (session.inTransaction() &&
	        error &&
	        error instanceof error_1.MongoError &&
	        error.hasErrorLabel(error_1.MongoErrorLabel.TransientTransactionError)) {
	        return;
	    }
	    const topology = session.client.topology;
	    // NOTE: the spec talks about what to do on a network error only, but the tests seem to
	    //       to validate that we don't unpin on _all_ errors?
	    if (conn && topology != null) {
	        const servers = Array.from(topology.s.servers.values());
	        const loadBalancer = servers[0];
	        if (options?.error == null || options?.force) {
	            loadBalancer.pool.checkIn(conn);
	            session.pinnedConnection = undefined;
	            conn.emit(constants_1.UNPINNED, session.transaction.state !== transactions_1.TxnState.NO_TRANSACTION
	                ? metrics_1.ConnectionPoolMetrics.TXN
	                : metrics_1.ConnectionPoolMetrics.CURSOR);
	            if (options?.forceClear) {
	                loadBalancer.pool.clear({ serviceId: conn.serviceId });
	            }
	        }
	    }
	}
	function isMaxTimeMSExpiredError(err) {
	    if (err == null || !(err instanceof error_1.MongoServerError)) {
	        return false;
	    }
	    return (err.code === error_1.MONGODB_ERROR_CODES.MaxTimeMSExpired ||
	        err.writeConcernError?.code === error_1.MONGODB_ERROR_CODES.MaxTimeMSExpired);
	}
	/**
	 * Reflects the existence of a session on the server. Can be reused by the session pool.
	 * WARNING: not meant to be instantiated directly. For internal use only.
	 * @public
	 */
	class ServerSession {
	    /** @internal */
	    constructor(cloned) {
	        if (cloned != null) {
	            const idBytes = bson_1.ByteUtils.allocateUnsafe(16);
	            idBytes.set(cloned.id.id.buffer);
	            this.id = { id: new bson_1.Binary(idBytes, cloned.id.id.sub_type) };
	            this.lastUse = cloned.lastUse;
	            this.txnNumber = cloned.txnNumber;
	            this.isDirty = cloned.isDirty;
	            return;
	        }
	        this.id = { id: new bson_1.Binary((0, utils_1.uuidV4)(), bson_1.Binary.SUBTYPE_UUID) };
	        this.lastUse = (0, utils_1.processTimeMS)();
	        this.txnNumber = 0;
	        this.isDirty = false;
	    }
	    /**
	     * Determines if the server session has timed out.
	     *
	     * @param sessionTimeoutMinutes - The server's "logicalSessionTimeoutMinutes"
	     */
	    hasTimedOut(sessionTimeoutMinutes) {
	        // Take the difference of the lastUse timestamp and now, which will result in a value in
	        // milliseconds, and then convert milliseconds to minutes to compare to `sessionTimeoutMinutes`
	        const idleTimeMinutes = Math.round((((0, utils_1.calculateDurationInMs)(this.lastUse) % 86400000) % 3600000) / 60000);
	        return idleTimeMinutes > sessionTimeoutMinutes - 1;
	    }
	}
	sessions.ServerSession = ServerSession;
	/**
	 * Maintains a pool of Server Sessions.
	 * For internal use only
	 * @internal
	 */
	class ServerSessionPool {
	    constructor(client) {
	        if (client == null) {
	            throw new error_1.MongoRuntimeError('ServerSessionPool requires a MongoClient');
	        }
	        this.client = client;
	        this.sessions = new utils_1.List();
	    }
	    /**
	     * Acquire a Server Session from the pool.
	     * Iterates through each session in the pool, removing any stale sessions
	     * along the way. The first non-stale session found is removed from the
	     * pool and returned. If no non-stale session is found, a new ServerSession is created.
	     */
	    acquire() {
	        const sessionTimeoutMinutes = this.client.topology?.logicalSessionTimeoutMinutes ?? 10;
	        let session = null;
	        // Try to obtain from session pool
	        while (this.sessions.length > 0) {
	            const potentialSession = this.sessions.shift();
	            if (potentialSession != null &&
	                (!!this.client.topology?.loadBalanced ||
	                    !potentialSession.hasTimedOut(sessionTimeoutMinutes))) {
	                session = potentialSession;
	                break;
	            }
	        }
	        // If nothing valid came from the pool make a new one
	        if (session == null) {
	            session = new ServerSession();
	        }
	        return session;
	    }
	    /**
	     * Release a session to the session pool
	     * Adds the session back to the session pool if the session has not timed out yet.
	     * This method also removes any stale sessions from the pool.
	     *
	     * @param session - The session to release to the pool
	     */
	    release(session) {
	        const sessionTimeoutMinutes = this.client.topology?.logicalSessionTimeoutMinutes ?? 10;
	        if (this.client.topology?.loadBalanced && !sessionTimeoutMinutes) {
	            this.sessions.unshift(session);
	        }
	        if (!sessionTimeoutMinutes) {
	            return;
	        }
	        this.sessions.prune(session => session.hasTimedOut(sessionTimeoutMinutes));
	        if (!session.hasTimedOut(sessionTimeoutMinutes)) {
	            if (session.isDirty) {
	                return;
	            }
	            // otherwise, readd this session to the session pool
	            this.sessions.unshift(session);
	        }
	    }
	}
	sessions.ServerSessionPool = ServerSessionPool;
	/**
	 * Optionally decorate a command with sessions specific keys
	 *
	 * @param session - the session tracking transaction state
	 * @param command - the command to decorate
	 * @param options - Optional settings passed to calling operation
	 *
	 * @internal
	 */
	function applySession(session, command, options) {
	    if (session.hasEnded) {
	        return new error_1.MongoExpiredSessionError();
	    }
	    // May acquire serverSession here
	    const serverSession = session.serverSession;
	    if (serverSession == null) {
	        return new error_1.MongoRuntimeError('Unable to acquire server session');
	    }
	    if (options.writeConcern?.w === 0) {
	        if (session && session.explicit) {
	            // Error if user provided an explicit session to an unacknowledged write (SPEC-1019)
	            return new error_1.MongoAPIError('Cannot have explicit session with unacknowledged writes');
	        }
	        return;
	    }
	    // mark the last use of this session, and apply the `lsid`
	    serverSession.lastUse = (0, utils_1.processTimeMS)();
	    command.lsid = serverSession.id;
	    const inTxnOrTxnCommand = session.inTransaction() || (0, transactions_1.isTransactionCommand)(command);
	    const isRetryableWrite = !!options.willRetryWrite;
	    if (isRetryableWrite || inTxnOrTxnCommand) {
	        serverSession.txnNumber += session.txnNumberIncrement;
	        session.txnNumberIncrement = 0;
	        // TODO(NODE-2674): Preserve int64 sent from MongoDB
	        command.txnNumber = bson_1.Long.fromNumber(serverSession.txnNumber);
	    }
	    if (!inTxnOrTxnCommand) {
	        if (session.transaction.state !== transactions_1.TxnState.NO_TRANSACTION) {
	            session.transaction.transition(transactions_1.TxnState.NO_TRANSACTION);
	        }
	        if (session.supports.causalConsistency &&
	            session.operationTime &&
	            (0, utils_1.commandSupportsReadConcern)(command)) {
	            command.readConcern = command.readConcern || {};
	            Object.assign(command.readConcern, { afterClusterTime: session.operationTime });
	        }
	        else if (session.snapshotEnabled) {
	            command.readConcern = command.readConcern || { level: read_concern_1.ReadConcernLevel.snapshot };
	            if (session.snapshotTime != null) {
	                Object.assign(command.readConcern, { atClusterTime: session.snapshotTime });
	            }
	        }
	        return;
	    }
	    // now attempt to apply transaction-specific sessions data
	    // `autocommit` must always be false to differentiate from retryable writes
	    command.autocommit = false;
	    if (session.transaction.state === transactions_1.TxnState.STARTING_TRANSACTION) {
	        command.startTransaction = true;
	        const readConcern = session.transaction.options.readConcern || session?.clientOptions?.readConcern;
	        if (readConcern) {
	            command.readConcern = readConcern;
	        }
	        if (session.supports.causalConsistency && session.operationTime) {
	            command.readConcern = command.readConcern || {};
	            Object.assign(command.readConcern, { afterClusterTime: session.operationTime });
	        }
	    }
	    return;
	}
	function updateSessionFromResponse(session, document) {
	    if (document.$clusterTime) {
	        (0, common_1._advanceClusterTime)(session, document.$clusterTime);
	    }
	    if (document.operationTime && session && session.supports.causalConsistency) {
	        session.advanceOperationTime(document.operationTime);
	    }
	    if (document.recoveryToken && session && session.inTransaction()) {
	        session.transaction._recoveryToken = document.recoveryToken;
	    }
	    if (session?.snapshotEnabled && session.snapshotTime == null) {
	        // find and aggregate commands return atClusterTime on the cursor
	        // distinct includes it in the response body
	        const atClusterTime = document.atClusterTime;
	        if (atClusterTime) {
	            session.snapshotTime = atClusterTime;
	        }
	    }
	    if (session.transaction.state === transactions_1.TxnState.STARTING_TRANSACTION) {
	        if (document.ok === 1) {
	            session.transaction.transition(transactions_1.TxnState.TRANSACTION_IN_PROGRESS);
	        }
	        else {
	            const error = new error_1.MongoServerError(document.toObject());
	            const isRetryableError = error.hasErrorLabel(error_1.MongoErrorLabel.RetryableError);
	            if (!isRetryableError) {
	                session.transaction.transition(transactions_1.TxnState.TRANSACTION_IN_PROGRESS);
	            }
	        }
	    }
	}
	
	return sessions;
}

var monitor = {};

var server_description = {};

var hasRequiredServer_description;

function requireServer_description () {
	if (hasRequiredServer_description) return server_description;
	hasRequiredServer_description = 1;
	Object.defineProperty(server_description, "__esModule", { value: true });
	server_description.ServerDescription = void 0;
	server_description.parseServerType = parseServerType;
	server_description.compareTopologyVersion = compareTopologyVersion;
	const bson_1 = mongodb1.requireBson();
	const error_1 = mongodb4.requireError();
	const utils_1 = mongodb7.requireUtils();
	const common_1 = mongodb5.requireCommon();
	const WRITABLE_SERVER_TYPES = new Set([
	    common_1.ServerType.RSPrimary,
	    common_1.ServerType.Standalone,
	    common_1.ServerType.Mongos,
	    common_1.ServerType.LoadBalancer
	]);
	const DATA_BEARING_SERVER_TYPES = new Set([
	    common_1.ServerType.RSPrimary,
	    common_1.ServerType.RSSecondary,
	    common_1.ServerType.Mongos,
	    common_1.ServerType.Standalone,
	    common_1.ServerType.LoadBalancer
	]);
	/**
	 * The client's view of a single server, based on the most recent hello outcome.
	 *
	 * Internal type, not meant to be directly instantiated
	 * @public
	 */
	class ServerDescription {
	    /**
	     * Create a ServerDescription
	     * @internal
	     *
	     * @param address - The address of the server
	     * @param hello - An optional hello response for this server
	     */
	    constructor(address, hello, options = {}) {
	        if (address == null || address === '') {
	            throw new error_1.MongoRuntimeError('ServerDescription must be provided with a non-empty address');
	        }
	        this.address =
	            typeof address === 'string'
	                ? utils_1.HostAddress.fromString(address).toString() // Use HostAddress to normalize
	                : address.toString();
	        this.type = parseServerType(hello, options);
	        this.hosts = hello?.hosts?.map((host) => host.toLowerCase()) ?? [];
	        this.passives = hello?.passives?.map((host) => host.toLowerCase()) ?? [];
	        this.arbiters = hello?.arbiters?.map((host) => host.toLowerCase()) ?? [];
	        this.tags = hello?.tags ?? {};
	        this.minWireVersion = hello?.minWireVersion ?? 0;
	        this.maxWireVersion = hello?.maxWireVersion ?? 0;
	        this.roundTripTime = options?.roundTripTime ?? -1;
	        this.minRoundTripTime = options?.minRoundTripTime ?? 0;
	        this.lastUpdateTime = (0, utils_1.processTimeMS)();
	        this.lastWriteDate = hello?.lastWrite?.lastWriteDate ?? 0;
	        // NOTE: This actually builds the stack string instead of holding onto the getter and all its
	        // associated references. This is done to prevent a memory leak.
	        this.error = options.error ?? null;
	        this.error?.stack;
	        // TODO(NODE-2674): Preserve int64 sent from MongoDB
	        this.topologyVersion = this.error?.topologyVersion ?? hello?.topologyVersion ?? null;
	        this.setName = hello?.setName ?? null;
	        this.setVersion = hello?.setVersion ?? null;
	        this.electionId = hello?.electionId ?? null;
	        this.logicalSessionTimeoutMinutes = hello?.logicalSessionTimeoutMinutes ?? null;
	        this.maxMessageSizeBytes = hello?.maxMessageSizeBytes ?? null;
	        this.maxWriteBatchSize = hello?.maxWriteBatchSize ?? null;
	        this.maxBsonObjectSize = hello?.maxBsonObjectSize ?? null;
	        this.primary = hello?.primary ?? null;
	        this.me = hello?.me?.toLowerCase() ?? null;
	        this.$clusterTime = hello?.$clusterTime ?? null;
	        this.iscryptd = Boolean(hello?.iscryptd);
	    }
	    get hostAddress() {
	        return utils_1.HostAddress.fromString(this.address);
	    }
	    get allHosts() {
	        return this.hosts.concat(this.arbiters).concat(this.passives);
	    }
	    /** Is this server available for reads*/
	    get isReadable() {
	        return this.type === common_1.ServerType.RSSecondary || this.isWritable;
	    }
	    /** Is this server data bearing */
	    get isDataBearing() {
	        return DATA_BEARING_SERVER_TYPES.has(this.type);
	    }
	    /** Is this server available for writes */
	    get isWritable() {
	        return WRITABLE_SERVER_TYPES.has(this.type);
	    }
	    get host() {
	        const chopLength = `:${this.port}`.length;
	        return this.address.slice(0, -chopLength);
	    }
	    get port() {
	        const port = this.address.split(':').pop();
	        return port ? Number.parseInt(port, 10) : 27017;
	    }
	    /**
	     * Determines if another `ServerDescription` is equal to this one per the rules defined in the SDAM specification.
	     * @see https://github.com/mongodb/specifications/blob/master/source/server-discovery-and-monitoring/server-discovery-and-monitoring.md
	     */
	    equals(other) {
	        // Despite using the comparator that would determine a nullish topologyVersion as greater than
	        // for equality we should only always perform direct equality comparison
	        const topologyVersionsEqual = this.topologyVersion === other?.topologyVersion ||
	            compareTopologyVersion(this.topologyVersion, other?.topologyVersion) === 0;
	        const electionIdsEqual = this.electionId != null && other?.electionId != null
	            ? (0, utils_1.compareObjectId)(this.electionId, other.electionId) === 0
	            : this.electionId === other?.electionId;
	        return (other != null &&
	            other.iscryptd === this.iscryptd &&
	            (0, utils_1.errorStrictEqual)(this.error, other.error) &&
	            this.type === other.type &&
	            this.minWireVersion === other.minWireVersion &&
	            (0, utils_1.arrayStrictEqual)(this.hosts, other.hosts) &&
	            tagsStrictEqual(this.tags, other.tags) &&
	            this.setName === other.setName &&
	            this.setVersion === other.setVersion &&
	            electionIdsEqual &&
	            this.primary === other.primary &&
	            this.logicalSessionTimeoutMinutes === other.logicalSessionTimeoutMinutes &&
	            topologyVersionsEqual);
	    }
	}
	server_description.ServerDescription = ServerDescription;
	// Parses a `hello` message and determines the server type
	function parseServerType(hello, options) {
	    if (options?.loadBalanced) {
	        return common_1.ServerType.LoadBalancer;
	    }
	    if (!hello || !hello.ok) {
	        return common_1.ServerType.Unknown;
	    }
	    if (hello.isreplicaset) {
	        return common_1.ServerType.RSGhost;
	    }
	    if (hello.msg && hello.msg === 'isdbgrid') {
	        return common_1.ServerType.Mongos;
	    }
	    if (hello.setName) {
	        if (hello.hidden) {
	            return common_1.ServerType.RSOther;
	        }
	        else if (hello.isWritablePrimary) {
	            return common_1.ServerType.RSPrimary;
	        }
	        else if (hello.secondary) {
	            return common_1.ServerType.RSSecondary;
	        }
	        else if (hello.arbiterOnly) {
	            return common_1.ServerType.RSArbiter;
	        }
	        else {
	            return common_1.ServerType.RSOther;
	        }
	    }
	    return common_1.ServerType.Standalone;
	}
	function tagsStrictEqual(tags, tags2) {
	    const tagsKeys = Object.keys(tags);
	    const tags2Keys = Object.keys(tags2);
	    return (tagsKeys.length === tags2Keys.length &&
	        tagsKeys.every((key) => tags2[key] === tags[key]));
	}
	/**
	 * Compares two topology versions.
	 *
	 * 1. If the response topologyVersion is unset or the ServerDescription's
	 *    topologyVersion is null, the client MUST assume the response is more recent.
	 * 1. If the response's topologyVersion.processId is not equal to the
	 *    ServerDescription's, the client MUST assume the response is more recent.
	 * 1. If the response's topologyVersion.processId is equal to the
	 *    ServerDescription's, the client MUST use the counter field to determine
	 *    which topologyVersion is more recent.
	 *
	 * ```ts
	 * currentTv <   newTv === -1
	 * currentTv === newTv === 0
	 * currentTv >   newTv === 1
	 * ```
	 */
	function compareTopologyVersion(currentTv, newTv) {
	    if (currentTv == null || newTv == null) {
	        return -1;
	    }
	    if (!currentTv.processId.equals(newTv.processId)) {
	        return -1;
	    }
	    // TODO(NODE-2674): Preserve int64 sent from MongoDB
	    const currentCounter = typeof currentTv.counter === 'bigint'
	        ? bson_1.Long.fromBigInt(currentTv.counter)
	        : bson_1.Long.isLong(currentTv.counter)
	            ? currentTv.counter
	            : bson_1.Long.fromNumber(currentTv.counter);
	    const newCounter = typeof newTv.counter === 'bigint'
	        ? bson_1.Long.fromBigInt(newTv.counter)
	        : bson_1.Long.isLong(newTv.counter)
	            ? newTv.counter
	            : bson_1.Long.fromNumber(newTv.counter);
	    return currentCounter.compare(newCounter);
	}
	
	return server_description;
}

var topology_description = {};

var hasRequiredTopology_description;

function requireTopology_description () {
	if (hasRequiredTopology_description) return topology_description;
	hasRequiredTopology_description = 1;
	Object.defineProperty(topology_description, "__esModule", { value: true });
	topology_description.TopologyDescription = void 0;
	const bson_1 = mongodb1.requireBson();
	const WIRE_CONSTANTS = mongodb2.requireConstants();
	const error_1 = mongodb4.requireError();
	const utils_1 = mongodb7.requireUtils();
	const common_1 = mongodb5.requireCommon();
	const server_description_1 = requireServer_description();
	// constants related to compatibility checks
	const MIN_SUPPORTED_SERVER_VERSION = WIRE_CONSTANTS.MIN_SUPPORTED_SERVER_VERSION;
	const MAX_SUPPORTED_SERVER_VERSION = WIRE_CONSTANTS.MAX_SUPPORTED_SERVER_VERSION;
	const MIN_SUPPORTED_WIRE_VERSION = WIRE_CONSTANTS.MIN_SUPPORTED_WIRE_VERSION;
	const MAX_SUPPORTED_WIRE_VERSION = WIRE_CONSTANTS.MAX_SUPPORTED_WIRE_VERSION;
	const MONGOS_OR_UNKNOWN = new Set([common_1.ServerType.Mongos, common_1.ServerType.Unknown]);
	const MONGOS_OR_STANDALONE = new Set([common_1.ServerType.Mongos, common_1.ServerType.Standalone]);
	const NON_PRIMARY_RS_MEMBERS = new Set([
	    common_1.ServerType.RSSecondary,
	    common_1.ServerType.RSArbiter,
	    common_1.ServerType.RSOther
	]);
	/**
	 * Representation of a deployment of servers
	 * @public
	 */
	class TopologyDescription {
	    /**
	     * Create a TopologyDescription
	     */
	    constructor(topologyType, serverDescriptions = null, setName = null, maxSetVersion = null, maxElectionId = null, commonWireVersion = null, options = null) {
	        options = options ?? {};
	        this.type = topologyType ?? common_1.TopologyType.Unknown;
	        this.servers = serverDescriptions ?? new Map();
	        this.stale = false;
	        this.compatible = true;
	        this.heartbeatFrequencyMS = options.heartbeatFrequencyMS ?? 0;
	        this.localThresholdMS = options.localThresholdMS ?? 15;
	        this.setName = setName ?? null;
	        this.maxElectionId = maxElectionId ?? null;
	        this.maxSetVersion = maxSetVersion ?? null;
	        this.commonWireVersion = commonWireVersion ?? 0;
	        // determine server compatibility
	        for (const serverDescription of this.servers.values()) {
	            // Load balancer mode is always compatible.
	            if (serverDescription.type === common_1.ServerType.Unknown ||
	                serverDescription.type === common_1.ServerType.LoadBalancer) {
	                continue;
	            }
	            if (serverDescription.minWireVersion > MAX_SUPPORTED_WIRE_VERSION) {
	                this.compatible = false;
	                this.compatibilityError = `Server at ${serverDescription.address} requires wire version ${serverDescription.minWireVersion}, but this version of the driver only supports up to ${MAX_SUPPORTED_WIRE_VERSION} (MongoDB ${MAX_SUPPORTED_SERVER_VERSION})`;
	            }
	            if (serverDescription.maxWireVersion < MIN_SUPPORTED_WIRE_VERSION) {
	                this.compatible = false;
	                this.compatibilityError = `Server at ${serverDescription.address} reports wire version ${serverDescription.maxWireVersion}, but this version of the driver requires at least ${MIN_SUPPORTED_WIRE_VERSION} (MongoDB ${MIN_SUPPORTED_SERVER_VERSION}).`;
	                break;
	            }
	        }
	        // Whenever a client updates the TopologyDescription from a hello response, it MUST set
	        // TopologyDescription.logicalSessionTimeoutMinutes to the smallest logicalSessionTimeoutMinutes
	        // value among ServerDescriptions of all data-bearing server types. If any have a null
	        // logicalSessionTimeoutMinutes, then TopologyDescription.logicalSessionTimeoutMinutes MUST be
	        // set to null.
	        this.logicalSessionTimeoutMinutes = null;
	        for (const [, server] of this.servers) {
	            if (server.isReadable) {
	                if (server.logicalSessionTimeoutMinutes == null) {
	                    // If any of the servers have a null logicalSessionsTimeout, then the whole topology does
	                    this.logicalSessionTimeoutMinutes = null;
	                    break;
	                }
	                if (this.logicalSessionTimeoutMinutes == null) {
	                    // First server with a non null logicalSessionsTimeout
	                    this.logicalSessionTimeoutMinutes = server.logicalSessionTimeoutMinutes;
	                    continue;
	                }
	                // Always select the smaller of the:
	                // current server logicalSessionsTimeout and the topologies logicalSessionsTimeout
	                this.logicalSessionTimeoutMinutes = Math.min(this.logicalSessionTimeoutMinutes, server.logicalSessionTimeoutMinutes);
	            }
	        }
	    }
	    /**
	     * Returns a new TopologyDescription based on the SrvPollingEvent
	     * @internal
	     */
	    updateFromSrvPollingEvent(ev, srvMaxHosts = 0) {
	        /** The SRV addresses defines the set of addresses we should be using */
	        const incomingHostnames = ev.hostnames();
	        const currentHostnames = new Set(this.servers.keys());
	        const hostnamesToAdd = new Set(incomingHostnames);
	        const hostnamesToRemove = new Set();
	        for (const hostname of currentHostnames) {
	            // filter hostnamesToAdd (made from incomingHostnames) down to what is *not* present in currentHostnames
	            hostnamesToAdd.delete(hostname);
	            if (!incomingHostnames.has(hostname)) {
	                // If the SRV Records no longer include this hostname
	                // we have to stop using it
	                hostnamesToRemove.add(hostname);
	            }
	        }
	        if (hostnamesToAdd.size === 0 && hostnamesToRemove.size === 0) {
	            // No new hosts to add and none to remove
	            return this;
	        }
	        const serverDescriptions = new Map(this.servers);
	        for (const removedHost of hostnamesToRemove) {
	            serverDescriptions.delete(removedHost);
	        }
	        if (hostnamesToAdd.size > 0) {
	            if (srvMaxHosts === 0) {
	                // Add all!
	                for (const hostToAdd of hostnamesToAdd) {
	                    serverDescriptions.set(hostToAdd, new server_description_1.ServerDescription(hostToAdd));
	                }
	            }
	            else if (serverDescriptions.size < srvMaxHosts) {
	                // Add only the amount needed to get us back to srvMaxHosts
	                const selectedHosts = (0, utils_1.shuffle)(hostnamesToAdd, srvMaxHosts - serverDescriptions.size);
	                for (const selectedHostToAdd of selectedHosts) {
	                    serverDescriptions.set(selectedHostToAdd, new server_description_1.ServerDescription(selectedHostToAdd));
	                }
	            }
	        }
	        return new TopologyDescription(this.type, serverDescriptions, this.setName, this.maxSetVersion, this.maxElectionId, this.commonWireVersion, { heartbeatFrequencyMS: this.heartbeatFrequencyMS, localThresholdMS: this.localThresholdMS });
	    }
	    /**
	     * Returns a copy of this description updated with a given ServerDescription
	     * @internal
	     */
	    update(serverDescription) {
	        const address = serverDescription.address;
	        // potentially mutated values
	        let { type: topologyType, setName, maxSetVersion, maxElectionId, commonWireVersion } = this;
	        const serverType = serverDescription.type;
	        const serverDescriptions = new Map(this.servers);
	        // update common wire version
	        if (serverDescription.maxWireVersion !== 0) {
	            if (commonWireVersion === 0) {
	                commonWireVersion = serverDescription.maxWireVersion;
	            }
	            else {
	                commonWireVersion = Math.min(commonWireVersion, serverDescription.maxWireVersion);
	            }
	        }
	        if (typeof serverDescription.setName === 'string' &&
	            typeof setName === 'string' &&
	            serverDescription.setName !== setName) {
	            if (topologyType === common_1.TopologyType.Single) {
	                // "Single" Topology with setName mismatch is direct connection usage, mark unknown do not remove
	                serverDescription = new server_description_1.ServerDescription(address);
	            }
	            else {
	                serverDescriptions.delete(address);
	            }
	        }
	        // update the actual server description
	        serverDescriptions.set(address, serverDescription);
	        if (topologyType === common_1.TopologyType.Single) {
	            // once we are defined as single, that never changes
	            return new TopologyDescription(common_1.TopologyType.Single, serverDescriptions, setName, maxSetVersion, maxElectionId, commonWireVersion, { heartbeatFrequencyMS: this.heartbeatFrequencyMS, localThresholdMS: this.localThresholdMS });
	        }
	        if (topologyType === common_1.TopologyType.Unknown) {
	            if (serverType === common_1.ServerType.Standalone && this.servers.size !== 1) {
	                serverDescriptions.delete(address);
	            }
	            else {
	                topologyType = topologyTypeForServerType(serverType);
	            }
	        }
	        if (topologyType === common_1.TopologyType.Sharded) {
	            if (!MONGOS_OR_UNKNOWN.has(serverType)) {
	                serverDescriptions.delete(address);
	            }
	        }
	        if (topologyType === common_1.TopologyType.ReplicaSetNoPrimary) {
	            if (MONGOS_OR_STANDALONE.has(serverType)) {
	                serverDescriptions.delete(address);
	            }
	            if (serverType === common_1.ServerType.RSPrimary) {
	                const result = updateRsFromPrimary(serverDescriptions, serverDescription, setName, maxSetVersion, maxElectionId);
	                topologyType = result[0];
	                setName = result[1];
	                maxSetVersion = result[2];
	                maxElectionId = result[3];
	            }
	            else if (NON_PRIMARY_RS_MEMBERS.has(serverType)) {
	                const result = updateRsNoPrimaryFromMember(serverDescriptions, serverDescription, setName);
	                topologyType = result[0];
	                setName = result[1];
	            }
	        }
	        if (topologyType === common_1.TopologyType.ReplicaSetWithPrimary) {
	            if (MONGOS_OR_STANDALONE.has(serverType)) {
	                serverDescriptions.delete(address);
	                topologyType = checkHasPrimary(serverDescriptions);
	            }
	            else if (serverType === common_1.ServerType.RSPrimary) {
	                const result = updateRsFromPrimary(serverDescriptions, serverDescription, setName, maxSetVersion, maxElectionId);
	                topologyType = result[0];
	                setName = result[1];
	                maxSetVersion = result[2];
	                maxElectionId = result[3];
	            }
	            else if (NON_PRIMARY_RS_MEMBERS.has(serverType)) {
	                topologyType = updateRsWithPrimaryFromMember(serverDescriptions, serverDescription, setName);
	            }
	            else {
	                topologyType = checkHasPrimary(serverDescriptions);
	            }
	        }
	        return new TopologyDescription(topologyType, serverDescriptions, setName, maxSetVersion, maxElectionId, commonWireVersion, { heartbeatFrequencyMS: this.heartbeatFrequencyMS, localThresholdMS: this.localThresholdMS });
	    }
	    get error() {
	        const descriptionsWithError = Array.from(this.servers.values()).filter((sd) => sd.error);
	        if (descriptionsWithError.length > 0) {
	            return descriptionsWithError[0].error;
	        }
	        return null;
	    }
	    /**
	     * Determines if the topology description has any known servers
	     */
	    get hasKnownServers() {
	        return Array.from(this.servers.values()).some((sd) => sd.type !== common_1.ServerType.Unknown);
	    }
	    /**
	     * Determines if this topology description has a data-bearing server available.
	     */
	    get hasDataBearingServers() {
	        return Array.from(this.servers.values()).some((sd) => sd.isDataBearing);
	    }
	    /**
	     * Determines if the topology has a definition for the provided address
	     * @internal
	     */
	    hasServer(address) {
	        return this.servers.has(address);
	    }
	    /**
	     * Returns a JSON-serializable representation of the TopologyDescription.  This is primarily
	     * intended for use with JSON.stringify().
	     *
	     * This method will not throw.
	     */
	    toJSON() {
	        return bson_1.EJSON.serialize(this);
	    }
	}
	topology_description.TopologyDescription = TopologyDescription;
	function topologyTypeForServerType(serverType) {
	    switch (serverType) {
	        case common_1.ServerType.Standalone:
	            return common_1.TopologyType.Single;
	        case common_1.ServerType.Mongos:
	            return common_1.TopologyType.Sharded;
	        case common_1.ServerType.RSPrimary:
	            return common_1.TopologyType.ReplicaSetWithPrimary;
	        case common_1.ServerType.RSOther:
	        case common_1.ServerType.RSSecondary:
	            return common_1.TopologyType.ReplicaSetNoPrimary;
	        default:
	            return common_1.TopologyType.Unknown;
	    }
	}
	function updateRsFromPrimary(serverDescriptions, serverDescription, setName = null, maxSetVersion = null, maxElectionId = null) {
	    const setVersionElectionIdMismatch = (serverDescription, maxSetVersion, maxElectionId) => {
	        return (`primary marked stale due to electionId/setVersion mismatch:` +
	            ` server setVersion: ${serverDescription.setVersion},` +
	            ` server electionId: ${serverDescription.electionId},` +
	            ` topology setVersion: ${maxSetVersion},` +
	            ` topology electionId: ${maxElectionId}`);
	    };
	    setName = setName || serverDescription.setName;
	    if (setName !== serverDescription.setName) {
	        serverDescriptions.delete(serverDescription.address);
	        return [checkHasPrimary(serverDescriptions), setName, maxSetVersion, maxElectionId];
	    }
	    if (serverDescription.maxWireVersion >= 17) {
	        const electionIdComparison = (0, utils_1.compareObjectId)(maxElectionId, serverDescription.electionId);
	        const maxElectionIdIsEqual = electionIdComparison === 0;
	        const maxElectionIdIsLess = electionIdComparison === -1;
	        const maxSetVersionIsLessOrEqual = (maxSetVersion ?? -1) <= (serverDescription.setVersion ?? -1);
	        if (maxElectionIdIsLess || (maxElectionIdIsEqual && maxSetVersionIsLessOrEqual)) {
	            // The reported electionId was greater
	            // or the electionId was equal and reported setVersion was greater
	            // Always update both values, they are a tuple
	            maxElectionId = serverDescription.electionId;
	            maxSetVersion = serverDescription.setVersion;
	        }
	        else {
	            // Stale primary
	            // replace serverDescription with a default ServerDescription of type "Unknown"
	            serverDescriptions.set(serverDescription.address, new server_description_1.ServerDescription(serverDescription.address, undefined, {
	                error: new error_1.MongoStalePrimaryError(setVersionElectionIdMismatch(serverDescription, maxSetVersion, maxElectionId))
	            }));
	            return [checkHasPrimary(serverDescriptions), setName, maxSetVersion, maxElectionId];
	        }
	    }
	    else {
	        const electionId = serverDescription.electionId ? serverDescription.electionId : null;
	        if (serverDescription.setVersion && electionId) {
	            if (maxSetVersion && maxElectionId) {
	                if (maxSetVersion > serverDescription.setVersion ||
	                    (0, utils_1.compareObjectId)(maxElectionId, electionId) > 0) {
	                    // this primary is stale, we must remove it
	                    serverDescriptions.set(serverDescription.address, new server_description_1.ServerDescription(serverDescription.address, undefined, {
	                        error: new error_1.MongoStalePrimaryError(setVersionElectionIdMismatch(serverDescription, maxSetVersion, maxElectionId))
	                    }));
	                    return [checkHasPrimary(serverDescriptions), setName, maxSetVersion, maxElectionId];
	                }
	            }
	            maxElectionId = serverDescription.electionId;
	        }
	        if (serverDescription.setVersion != null &&
	            (maxSetVersion == null || serverDescription.setVersion > maxSetVersion)) {
	            maxSetVersion = serverDescription.setVersion;
	        }
	    }
	    // We've heard from the primary. Is it the same primary as before?
	    for (const [address, server] of serverDescriptions) {
	        if (server.type === common_1.ServerType.RSPrimary && server.address !== serverDescription.address) {
	            // Reset old primary's type to Unknown.
	            serverDescriptions.set(address, new server_description_1.ServerDescription(server.address, undefined, {
	                error: new error_1.MongoStalePrimaryError('primary marked stale due to discovery of newer primary')
	            }));
	            // There can only be one primary
	            break;
	        }
	    }
	    // Discover new hosts from this primary's response.
	    serverDescription.allHosts.forEach((address) => {
	        if (!serverDescriptions.has(address)) {
	            serverDescriptions.set(address, new server_description_1.ServerDescription(address));
	        }
	    });
	    // Remove hosts not in the response.
	    const currentAddresses = Array.from(serverDescriptions.keys());
	    const responseAddresses = serverDescription.allHosts;
	    currentAddresses
	        .filter((addr) => responseAddresses.indexOf(addr) === -1)
	        .forEach((address) => {
	        serverDescriptions.delete(address);
	    });
	    return [checkHasPrimary(serverDescriptions), setName, maxSetVersion, maxElectionId];
	}
	function updateRsWithPrimaryFromMember(serverDescriptions, serverDescription, setName = null) {
	    if (setName == null) {
	        // TODO(NODE-3483): should be an appropriate runtime error
	        throw new error_1.MongoRuntimeError('Argument "setName" is required if connected to a replica set');
	    }
	    if (setName !== serverDescription.setName ||
	        (serverDescription.me && serverDescription.address !== serverDescription.me)) {
	        serverDescriptions.delete(serverDescription.address);
	    }
	    return checkHasPrimary(serverDescriptions);
	}
	function updateRsNoPrimaryFromMember(serverDescriptions, serverDescription, setName = null) {
	    const topologyType = common_1.TopologyType.ReplicaSetNoPrimary;
	    setName = setName ?? serverDescription.setName;
	    if (setName !== serverDescription.setName) {
	        serverDescriptions.delete(serverDescription.address);
	        return [topologyType, setName];
	    }
	    serverDescription.allHosts.forEach((address) => {
	        if (!serverDescriptions.has(address)) {
	            serverDescriptions.set(address, new server_description_1.ServerDescription(address));
	        }
	    });
	    if (serverDescription.me && serverDescription.address !== serverDescription.me) {
	        serverDescriptions.delete(serverDescription.address);
	    }
	    return [topologyType, setName];
	}
	function checkHasPrimary(serverDescriptions) {
	    for (const serverDescription of serverDescriptions.values()) {
	        if (serverDescription.type === common_1.ServerType.RSPrimary) {
	            return common_1.TopologyType.ReplicaSetWithPrimary;
	        }
	    }
	    return common_1.TopologyType.ReplicaSetNoPrimary;
	}
	
	return topology_description;
}

var server = {};

var hasRequiredServer;

function requireServer () {
	if (hasRequiredServer) return server;
	hasRequiredServer = 1;
	Object.defineProperty(server, "__esModule", { value: true });
	server.Server = void 0;
	const connection_1 = mongodb2.requireConnection();
	const connection_pool_1 = mongodb2.requireConnection_pool();
	const errors_1 = mongodb2.requireErrors();
	const constants_1 = mongodb3.requireConstants();
	const error_1 = mongodb4.requireError();
	const mongo_types_1 = mongodb5.requireMongo_types();
	const aggregate_1 = mongodb5.requireAggregate();
	const transactions_1 = requireTransactions();
	const utils_1 = mongodb7.requireUtils();
	const write_concern_1 = mongodb7.requireWrite_concern();
	const common_1 = mongodb5.requireCommon();
	const monitor_1 = requireMonitor();
	const server_description_1 = requireServer_description();
	const server_selection_1 = requireServer_selection();
	const stateTransition = (0, utils_1.makeStateMachine)({
	    [common_1.STATE_CLOSED]: [common_1.STATE_CLOSED, common_1.STATE_CONNECTING],
	    [common_1.STATE_CONNECTING]: [common_1.STATE_CONNECTING, common_1.STATE_CLOSING, common_1.STATE_CONNECTED, common_1.STATE_CLOSED],
	    [common_1.STATE_CONNECTED]: [common_1.STATE_CONNECTED, common_1.STATE_CLOSING, common_1.STATE_CLOSED],
	    [common_1.STATE_CLOSING]: [common_1.STATE_CLOSING, common_1.STATE_CLOSED]
	});
	/** @internal */
	class Server extends mongo_types_1.TypedEventEmitter {
	    /** @event */
	    static { this.SERVER_HEARTBEAT_STARTED = constants_1.SERVER_HEARTBEAT_STARTED; }
	    /** @event */
	    static { this.SERVER_HEARTBEAT_SUCCEEDED = constants_1.SERVER_HEARTBEAT_SUCCEEDED; }
	    /** @event */
	    static { this.SERVER_HEARTBEAT_FAILED = constants_1.SERVER_HEARTBEAT_FAILED; }
	    /** @event */
	    static { this.CONNECT = constants_1.CONNECT; }
	    /** @event */
	    static { this.DESCRIPTION_RECEIVED = constants_1.DESCRIPTION_RECEIVED; }
	    /** @event */
	    static { this.CLOSED = constants_1.CLOSED; }
	    /** @event */
	    static { this.ENDED = constants_1.ENDED; }
	    /**
	     * Create a server
	     */
	    constructor(topology, description, options) {
	        super();
	        this.on('error', utils_1.noop);
	        this.serverApi = options.serverApi;
	        const poolOptions = { hostAddress: description.hostAddress, ...options };
	        this.topology = topology;
	        this.pool = new connection_pool_1.ConnectionPool(this, poolOptions);
	        this.s = {
	            description,
	            options,
	            state: common_1.STATE_CLOSED,
	            operationCount: 0
	        };
	        for (const event of [...constants_1.CMAP_EVENTS, ...constants_1.APM_EVENTS]) {
	            this.pool.on(event, (e) => this.emit(event, e));
	        }
	        this.pool.on(connection_1.Connection.CLUSTER_TIME_RECEIVED, (clusterTime) => {
	            this.clusterTime = clusterTime;
	        });
	        if (this.loadBalanced) {
	            this.monitor = null;
	            // monitoring is disabled in load balancing mode
	            return;
	        }
	        // create the monitor
	        this.monitor = new monitor_1.Monitor(this, this.s.options);
	        for (const event of constants_1.HEARTBEAT_EVENTS) {
	            this.monitor.on(event, (e) => this.emit(event, e));
	        }
	        this.monitor.on('resetServer', (error) => markServerUnknown(this, error));
	        this.monitor.on(Server.SERVER_HEARTBEAT_SUCCEEDED, (event) => {
	            this.emit(Server.DESCRIPTION_RECEIVED, new server_description_1.ServerDescription(this.description.hostAddress, event.reply, {
	                roundTripTime: this.monitor?.roundTripTime,
	                minRoundTripTime: this.monitor?.minRoundTripTime
	            }));
	            if (this.s.state === common_1.STATE_CONNECTING) {
	                stateTransition(this, common_1.STATE_CONNECTED);
	                this.emit(Server.CONNECT, this);
	            }
	        });
	    }
	    get clusterTime() {
	        return this.topology.clusterTime;
	    }
	    set clusterTime(clusterTime) {
	        this.topology.clusterTime = clusterTime;
	    }
	    get description() {
	        return this.s.description;
	    }
	    get name() {
	        return this.s.description.address;
	    }
	    get autoEncrypter() {
	        if (this.s.options && this.s.options.autoEncrypter) {
	            return this.s.options.autoEncrypter;
	        }
	        return;
	    }
	    get loadBalanced() {
	        return this.topology.description.type === common_1.TopologyType.LoadBalanced;
	    }
	    /**
	     * Initiate server connect
	     */
	    connect() {
	        if (this.s.state !== common_1.STATE_CLOSED) {
	            return;
	        }
	        stateTransition(this, common_1.STATE_CONNECTING);
	        // If in load balancer mode we automatically set the server to
	        // a load balancer. It never transitions out of this state and
	        // has no monitor.
	        if (!this.loadBalanced) {
	            this.monitor?.connect();
	        }
	        else {
	            stateTransition(this, common_1.STATE_CONNECTED);
	            this.emit(Server.CONNECT, this);
	        }
	    }
	    closeCheckedOutConnections() {
	        return this.pool.closeCheckedOutConnections();
	    }
	    /** Destroy the server connection */
	    close() {
	        if (this.s.state === common_1.STATE_CLOSED) {
	            return;
	        }
	        stateTransition(this, common_1.STATE_CLOSING);
	        if (!this.loadBalanced) {
	            this.monitor?.close();
	        }
	        this.pool.close();
	        stateTransition(this, common_1.STATE_CLOSED);
	        this.emit('closed');
	    }
	    /**
	     * Immediately schedule monitoring of this server. If there already an attempt being made
	     * this will be a no-op.
	     */
	    requestCheck() {
	        if (!this.loadBalanced) {
	            this.monitor?.requestCheck();
	        }
	    }
	    async command(operation, timeoutContext) {
	        if (this.s.state === common_1.STATE_CLOSING || this.s.state === common_1.STATE_CLOSED) {
	            throw new error_1.MongoServerClosedError();
	        }
	        const session = operation.session;
	        let conn = session?.pinnedConnection;
	        this.incrementOperationCount();
	        if (conn == null) {
	            try {
	                conn = await this.pool.checkOut({ timeoutContext, signal: operation.options.signal });
	            }
	            catch (checkoutError) {
	                this.decrementOperationCount();
	                if (!(checkoutError instanceof errors_1.PoolClearedError))
	                    this.handleError(checkoutError);
	                throw checkoutError;
	            }
	        }
	        let reauthPromise = null;
	        const cleanup = () => {
	            this.decrementOperationCount();
	            if (session?.pinnedConnection !== conn) {
	                if (reauthPromise != null) {
	                    // The reauth promise only exists if it hasn't thrown.
	                    const checkBackIn = () => {
	                        this.pool.checkIn(conn);
	                    };
	                    void reauthPromise.then(checkBackIn, checkBackIn);
	                }
	                else {
	                    this.pool.checkIn(conn);
	                }
	            }
	        };
	        let cmd;
	        try {
	            cmd = operation.buildCommand(conn, session);
	        }
	        catch (e) {
	            cleanup();
	            throw e;
	        }
	        const options = operation.buildOptions(timeoutContext);
	        const ns = operation.ns;
	        if (this.loadBalanced && isPinnableCommand(cmd, session) && !session?.pinnedConnection) {
	            session?.pin(conn);
	        }
	        options.directConnection = this.topology.s.options.directConnection;
	        const omitReadPreference = operation instanceof aggregate_1.AggregateOperation &&
	            operation.hasWriteStage &&
	            (0, utils_1.maxWireVersion)(conn) < server_selection_1.MIN_SECONDARY_WRITE_WIRE_VERSION;
	        if (omitReadPreference) {
	            delete options.readPreference;
	        }
	        if (this.description.iscryptd) {
	            options.omitMaxTimeMS = true;
	        }
	        try {
	            try {
	                const res = await conn.command(ns, cmd, options, operation.SERVER_COMMAND_RESPONSE_TYPE);
	                (0, write_concern_1.throwIfWriteConcernError)(res);
	                return res;
	            }
	            catch (commandError) {
	                throw this.decorateCommandError(conn, cmd, options, commandError);
	            }
	        }
	        catch (operationError) {
	            if (operationError instanceof error_1.MongoError &&
	                operationError.code?.valueOf() === error_1.MONGODB_ERROR_CODES.Reauthenticate) {
	                reauthPromise = this.pool.reauthenticate(conn);
	                reauthPromise.then(undefined, error => {
	                    reauthPromise = null;
	                    (0, utils_1.squashError)(error);
	                });
	                await (0, utils_1.abortable)(reauthPromise, options);
	                reauthPromise = null; // only reachable if reauth succeeds
	                try {
	                    const res = await conn.command(ns, cmd, options, operation.SERVER_COMMAND_RESPONSE_TYPE);
	                    (0, write_concern_1.throwIfWriteConcernError)(res);
	                    return res;
	                }
	                catch (commandError) {
	                    throw this.decorateCommandError(conn, cmd, options, commandError);
	                }
	            }
	            else {
	                throw operationError;
	            }
	        }
	        finally {
	            cleanup();
	        }
	    }
	    /**
	     * Handle SDAM error
	     * @internal
	     */
	    handleError(error, connection) {
	        if (!(error instanceof error_1.MongoError)) {
	            return;
	        }
	        if (isStaleError(this, error)) {
	            return;
	        }
	        const isNetworkNonTimeoutError = error instanceof error_1.MongoNetworkError && !(error instanceof error_1.MongoNetworkTimeoutError);
	        const isNetworkTimeoutBeforeHandshakeError = error instanceof error_1.MongoNetworkError && error.beforeHandshake;
	        const isAuthOrEstablishmentHandshakeError = error.hasErrorLabel(error_1.MongoErrorLabel.HandshakeError);
	        const isSystemOverloadError = error.hasErrorLabel(error_1.MongoErrorLabel.SystemOverloadedError);
	        // Perhaps questionable and divergent from the spec, but considering MongoParseErrors like state change errors was legacy behavior.
	        if ((0, error_1.isStateChangeError)(error) || error instanceof error_1.MongoParseError) {
	            const shouldClearPool = (0, error_1.isNodeShuttingDownError)(error);
	            // from the SDAM spec: The driver MUST synchronize clearing the pool with updating the topology.
	            // In load balanced mode: there is no monitoring, so there is no topology to update.  We simply clear the pool.
	            // For other topologies: the `ResetPool` label instructs the topology to clear the server's pool in `updateServer()`.
	            if (!this.loadBalanced) {
	                if (shouldClearPool) {
	                    error.addErrorLabel(error_1.MongoErrorLabel.ResetPool);
	                }
	                markServerUnknown(this, error);
	                queueMicrotask(() => this.requestCheck());
	                return;
	            }
	            if (connection && shouldClearPool) {
	                this.pool.clear({ serviceId: connection.serviceId });
	            }
	        }
	        else if (isNetworkNonTimeoutError ||
	            isNetworkTimeoutBeforeHandshakeError ||
	            isAuthOrEstablishmentHandshakeError) {
	            // Do NOT clear the pool if we encounter a system overloaded error.
	            if (isSystemOverloadError) {
	                return;
	            }
	            // from the SDAM spec: The driver MUST synchronize clearing the pool with updating the topology.
	            // In load balanced mode: there is no monitoring, so there is no topology to update.  We simply clear the pool.
	            // For other topologies: the `ResetPool` label instructs the topology to clear the server's pool in `updateServer()`.
	            if (!this.loadBalanced) {
	                error.addErrorLabel(error_1.MongoErrorLabel.ResetPool);
	                markServerUnknown(this, error);
	            }
	            else if (connection) {
	                this.pool.clear({ serviceId: connection.serviceId });
	            }
	        }
	    }
	    /**
	     * Ensure that error is properly decorated and internal state is updated before throwing
	     * @internal
	     */
	    decorateCommandError(connection, cmd, options, error) {
	        if (typeof error !== 'object' || error == null || !('name' in error)) {
	            throw new error_1.MongoRuntimeError('An unexpected error type: ' + typeof error);
	        }
	        if (error.name === 'AbortError' && 'cause' in error && error.cause instanceof error_1.MongoError) {
	            error = error.cause;
	        }
	        if (!(error instanceof error_1.MongoError)) {
	            // Node.js or some other error we have not special handling for
	            return error;
	        }
	        if (connectionIsStale(this.pool, connection)) {
	            return error;
	        }
	        const session = options?.session;
	        if (error instanceof error_1.MongoNetworkError) {
	            if (session && !session.hasEnded && session.serverSession) {
	                session.serverSession.isDirty = true;
	            }
	            // inActiveTransaction check handles commit and abort.
	            if (inActiveTransaction(session, cmd) &&
	                !error.hasErrorLabel(error_1.MongoErrorLabel.TransientTransactionError)) {
	                error.addErrorLabel(error_1.MongoErrorLabel.TransientTransactionError);
	            }
	            if ((isRetryableWritesEnabled(this.topology) || (0, transactions_1.isTransactionCommand)(cmd)) &&
	                (0, utils_1.supportsRetryableWrites)(this) &&
	                !inActiveTransaction(session, cmd)) {
	                error.addErrorLabel(error_1.MongoErrorLabel.RetryableWriteError);
	            }
	        }
	        else {
	            if ((isRetryableWritesEnabled(this.topology) || (0, transactions_1.isTransactionCommand)(cmd)) &&
	                (0, error_1.needsRetryableWriteLabel)(error, (0, utils_1.maxWireVersion)(this), this.description.type) &&
	                !inActiveTransaction(session, cmd)) {
	                error.addErrorLabel(error_1.MongoErrorLabel.RetryableWriteError);
	            }
	        }
	        if (session &&
	            session.isPinned &&
	            error.hasErrorLabel(error_1.MongoErrorLabel.TransientTransactionError)) {
	            session.unpin({ force: true });
	        }
	        this.handleError(error, connection);
	        return error;
	    }
	    /**
	     * Decrement the operation count, returning the new count.
	     */
	    decrementOperationCount() {
	        return (this.s.operationCount -= 1);
	    }
	    /**
	     * Increment the operation count, returning the new count.
	     */
	    incrementOperationCount() {
	        return (this.s.operationCount += 1);
	    }
	}
	server.Server = Server;
	function markServerUnknown(server, error) {
	    // Load balancer servers can never be marked unknown.
	    if (server.loadBalanced) {
	        return;
	    }
	    if (error instanceof error_1.MongoNetworkError && !(error instanceof error_1.MongoNetworkTimeoutError)) {
	        server.monitor?.reset();
	    }
	    server.emit(Server.DESCRIPTION_RECEIVED, new server_description_1.ServerDescription(server.description.hostAddress, undefined, { error }));
	}
	function isPinnableCommand(cmd, session) {
	    if (session) {
	        return (session.inTransaction() ||
	            (session.transaction.isCommitted && 'commitTransaction' in cmd) ||
	            'aggregate' in cmd ||
	            'find' in cmd ||
	            'getMore' in cmd ||
	            'listCollections' in cmd ||
	            'listIndexes' in cmd ||
	            'bulkWrite' in cmd);
	    }
	    return false;
	}
	function connectionIsStale(pool, connection) {
	    if (connection.serviceId) {
	        return (connection.generation !== pool.serviceGenerations.get(connection.serviceId.toHexString()));
	    }
	    return connection.generation !== pool.generation;
	}
	function inActiveTransaction(session, cmd) {
	    return session && session.inTransaction() && !(0, transactions_1.isTransactionCommand)(cmd);
	}
	/** this checks the retryWrites option passed down from the client options, it
	 * does not check if the server supports retryable writes */
	function isRetryableWritesEnabled(topology) {
	    return topology.s.options.retryWrites !== false;
	}
	function isStaleError(server, error) {
	    const currentGeneration = server.pool.generation;
	    const generation = error.connectionGeneration;
	    if (generation && generation < currentGeneration) {
	        return true;
	    }
	    const currentTopologyVersion = server.description.topologyVersion;
	    return (0, server_description_1.compareTopologyVersion)(currentTopologyVersion, error.topologyVersion) >= 0;
	}
	
	return server;
}

var hasRequiredMonitor;

function requireMonitor () {
	if (hasRequiredMonitor) return monitor;
	hasRequiredMonitor = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.RTTSampler = exports.MonitorInterval = exports.RTTPinger = exports.Monitor = exports.ServerMonitoringMode = void 0;
		const timers_1 = require$$0;
		const bson_1 = mongodb1.requireBson();
		const connect_1 = mongodb2.requireConnect();
		const client_metadata_1 = mongodb2.requireClient_metadata();
		const constants_1 = mongodb3.requireConstants();
		const error_1 = mongodb4.requireError();
		const mongo_logger_1 = mongodb5.requireMongo_logger();
		const mongo_types_1 = mongodb5.requireMongo_types();
		const utils_1 = mongodb7.requireUtils();
		const common_1 = mongodb5.requireCommon();
		const events_1 = mongodb5.requireEvents();
		const server_1 = requireServer();
		const STATE_IDLE = 'idle';
		const STATE_MONITORING = 'monitoring';
		const stateTransition = (0, utils_1.makeStateMachine)({
		    [common_1.STATE_CLOSING]: [common_1.STATE_CLOSING, STATE_IDLE, common_1.STATE_CLOSED],
		    [common_1.STATE_CLOSED]: [common_1.STATE_CLOSED, STATE_MONITORING],
		    [STATE_IDLE]: [STATE_IDLE, STATE_MONITORING, common_1.STATE_CLOSING],
		    [STATE_MONITORING]: [STATE_MONITORING, STATE_IDLE, common_1.STATE_CLOSING]
		});
		const INVALID_REQUEST_CHECK_STATES = new Set([common_1.STATE_CLOSING, common_1.STATE_CLOSED, STATE_MONITORING]);
		function isInCloseState(monitor) {
		    return monitor.s.state === common_1.STATE_CLOSED || monitor.s.state === common_1.STATE_CLOSING;
		}
		/** @public */
		exports.ServerMonitoringMode = Object.freeze({
		    auto: 'auto',
		    poll: 'poll',
		    stream: 'stream'
		});
		/** @internal */
		class Monitor extends mongo_types_1.TypedEventEmitter {
		    constructor(server, options) {
		        super();
		        /** @internal */
		        this.component = mongo_logger_1.MongoLoggableComponent.TOPOLOGY;
		        this.on('error', utils_1.noop);
		        this.server = server;
		        this.connection = null;
		        this.cancellationToken = new mongo_types_1.CancellationToken();
		        this.cancellationToken.setMaxListeners(Infinity);
		        this.monitorId = undefined;
		        this.s = {
		            state: common_1.STATE_CLOSED
		        };
		        this.address = server.description.address;
		        this.options = Object.freeze({
		            connectTimeoutMS: options.connectTimeoutMS ?? 10000,
		            heartbeatFrequencyMS: options.heartbeatFrequencyMS ?? 10000,
		            minHeartbeatFrequencyMS: options.minHeartbeatFrequencyMS ?? 500,
		            serverMonitoringMode: options.serverMonitoringMode
		        });
		        this.isRunningInFaasEnv = (0, client_metadata_1.getFAASEnv)() != null;
		        this.mongoLogger = this.server.topology.client?.mongoLogger;
		        this.rttSampler = new RTTSampler(10);
		        const cancellationToken = this.cancellationToken;
		        // TODO: refactor this to pull it directly from the pool, requires new ConnectionPool integration
		        const connectOptions = {
		            id: '<monitor>',
		            generation: server.pool.generation,
		            cancellationToken,
		            hostAddress: server.description.hostAddress,
		            ...options,
		            // force BSON serialization options
		            raw: false,
		            useBigInt64: false,
		            promoteLongs: true,
		            promoteValues: true,
		            promoteBuffers: true
		        };
		        // ensure no authentication is used for monitoring
		        delete connectOptions.credentials;
		        if (connectOptions.autoEncrypter) {
		            delete connectOptions.autoEncrypter;
		        }
		        this.connectOptions = Object.freeze(connectOptions);
		    }
		    connect() {
		        if (this.s.state !== common_1.STATE_CLOSED) {
		            return;
		        }
		        // start
		        const heartbeatFrequencyMS = this.options.heartbeatFrequencyMS;
		        const minHeartbeatFrequencyMS = this.options.minHeartbeatFrequencyMS;
		        this.monitorId = new MonitorInterval(monitorServer(this), {
		            heartbeatFrequencyMS: heartbeatFrequencyMS,
		            minHeartbeatFrequencyMS: minHeartbeatFrequencyMS,
		            immediate: true
		        });
		    }
		    requestCheck() {
		        if (INVALID_REQUEST_CHECK_STATES.has(this.s.state)) {
		            return;
		        }
		        this.monitorId?.wake();
		    }
		    reset() {
		        const topologyVersion = this.server.description.topologyVersion;
		        if (isInCloseState(this) || topologyVersion == null) {
		            return;
		        }
		        stateTransition(this, common_1.STATE_CLOSING);
		        resetMonitorState(this);
		        // restart monitor
		        stateTransition(this, STATE_IDLE);
		        // restart monitoring
		        const heartbeatFrequencyMS = this.options.heartbeatFrequencyMS;
		        const minHeartbeatFrequencyMS = this.options.minHeartbeatFrequencyMS;
		        this.monitorId = new MonitorInterval(monitorServer(this), {
		            heartbeatFrequencyMS: heartbeatFrequencyMS,
		            minHeartbeatFrequencyMS: minHeartbeatFrequencyMS
		        });
		    }
		    close() {
		        if (isInCloseState(this)) {
		            return;
		        }
		        stateTransition(this, common_1.STATE_CLOSING);
		        resetMonitorState(this);
		        // close monitor
		        this.emit('close');
		        stateTransition(this, common_1.STATE_CLOSED);
		    }
		    get roundTripTime() {
		        return this.rttSampler.average();
		    }
		    get minRoundTripTime() {
		        return this.rttSampler.min();
		    }
		    get latestRtt() {
		        return this.rttSampler.last;
		    }
		    addRttSample(rtt) {
		        this.rttSampler.addSample(rtt);
		    }
		    clearRttSamples() {
		        this.rttSampler.clear();
		    }
		}
		exports.Monitor = Monitor;
		function resetMonitorState(monitor) {
		    monitor.monitorId?.stop();
		    monitor.monitorId = undefined;
		    monitor.rttPinger?.close();
		    monitor.rttPinger = undefined;
		    monitor.cancellationToken.emit('cancel');
		    monitor.connection?.destroy();
		    monitor.connection = null;
		    monitor.clearRttSamples();
		}
		function useStreamingProtocol(monitor, topologyVersion) {
		    // If we have no topology version we always poll no matter
		    // what the user provided, since the server does not support
		    // the streaming protocol.
		    if (topologyVersion == null)
		        return false;
		    const serverMonitoringMode = monitor.options.serverMonitoringMode;
		    if (serverMonitoringMode === exports.ServerMonitoringMode.poll)
		        return false;
		    if (serverMonitoringMode === exports.ServerMonitoringMode.stream)
		        return true;
		    // If we are in auto mode, we need to figure out if we're in a FaaS
		    // environment or not and choose the appropriate mode.
		    if (monitor.isRunningInFaasEnv)
		        return false;
		    return true;
		}
		function checkServer(monitor, callback) {
		    let start;
		    let awaited;
		    const topologyVersion = monitor.server.description.topologyVersion;
		    const isAwaitable = useStreamingProtocol(monitor, topologyVersion);
		    monitor.emitAndLogHeartbeat(server_1.Server.SERVER_HEARTBEAT_STARTED, monitor.server.topology.s.id, undefined, new events_1.ServerHeartbeatStartedEvent(monitor.address, isAwaitable));
		    function onHeartbeatFailed(err) {
		        monitor.connection?.destroy();
		        monitor.connection = null;
		        monitor.emitAndLogHeartbeat(server_1.Server.SERVER_HEARTBEAT_FAILED, monitor.server.topology.s.id, undefined, new events_1.ServerHeartbeatFailedEvent(monitor.address, (0, utils_1.calculateDurationInMs)(start), err, awaited));
		        const error = !(err instanceof error_1.MongoError)
		            ? new error_1.MongoError(error_1.MongoError.buildErrorMessage(err), { cause: err })
		            : err;
		        error.addErrorLabel(error_1.MongoErrorLabel.ResetPool);
		        if (error instanceof error_1.MongoNetworkTimeoutError) {
		            error.addErrorLabel(error_1.MongoErrorLabel.InterruptInUseConnections);
		        }
		        monitor.emit('resetServer', error);
		        callback(err);
		    }
		    function onHeartbeatSucceeded(hello) {
		        if (!('isWritablePrimary' in hello)) {
		            // Provide hello-style response document.
		            hello.isWritablePrimary = hello[constants_1.LEGACY_HELLO_COMMAND];
		        }
		        // NOTE: here we use the latestRtt as this measurement corresponds with the value
		        // obtained for this successful heartbeat, if there is no latestRtt, then we calculate the
		        // duration
		        const duration = isAwaitable && monitor.rttPinger
		            ? (monitor.rttPinger.latestRtt ?? (0, utils_1.calculateDurationInMs)(start))
		            : (0, utils_1.calculateDurationInMs)(start);
		        monitor.addRttSample(duration);
		        monitor.emitAndLogHeartbeat(server_1.Server.SERVER_HEARTBEAT_SUCCEEDED, monitor.server.topology.s.id, hello.connectionId, new events_1.ServerHeartbeatSucceededEvent(monitor.address, duration, hello, isAwaitable));
		        if (isAwaitable) {
		            // If we are using the streaming protocol then we immediately issue another 'started'
		            // event, otherwise the "check" is complete and return to the main monitor loop
		            monitor.emitAndLogHeartbeat(server_1.Server.SERVER_HEARTBEAT_STARTED, monitor.server.topology.s.id, undefined, new events_1.ServerHeartbeatStartedEvent(monitor.address, true));
		            // We have not actually sent an outgoing handshake, but when we get the next response we
		            // want the duration to reflect the time since we last heard from the server
		            start = (0, utils_1.processTimeMS)();
		        }
		        else {
		            monitor.rttPinger?.close();
		            monitor.rttPinger = undefined;
		            callback(undefined, hello);
		        }
		    }
		    const { connection } = monitor;
		    if (connection && !connection.closed) {
		        const { serverApi, helloOk } = connection;
		        const connectTimeoutMS = monitor.options.connectTimeoutMS;
		        const maxAwaitTimeMS = monitor.options.heartbeatFrequencyMS;
		        const cmd = {
		            [serverApi?.version || helloOk ? 'hello' : constants_1.LEGACY_HELLO_COMMAND]: 1,
		            ...(isAwaitable && topologyVersion
		                ? { maxAwaitTimeMS, topologyVersion: makeTopologyVersion(topologyVersion) }
		                : {})
		        };
		        const options = isAwaitable
		            ? {
		                socketTimeoutMS: connectTimeoutMS ? connectTimeoutMS + maxAwaitTimeMS : 0,
		                exhaustAllowed: true
		            }
		            : { socketTimeoutMS: connectTimeoutMS };
		        if (isAwaitable && monitor.rttPinger == null) {
		            monitor.rttPinger = new RTTPinger(monitor);
		        }
		        // Record new start time before sending handshake
		        start = (0, utils_1.processTimeMS)();
		        if (isAwaitable) {
		            awaited = true;
		            return connection.exhaustCommand((0, utils_1.ns)('admin.$cmd'), cmd, options, (error, hello) => {
		                if (error)
		                    return onHeartbeatFailed(error);
		                return onHeartbeatSucceeded(hello);
		            });
		        }
		        awaited = false;
		        connection
		            .command((0, utils_1.ns)('admin.$cmd'), cmd, options)
		            .then(onHeartbeatSucceeded, onHeartbeatFailed);
		        return;
		    }
		    // connecting does an implicit `hello`
		    (async () => {
		        const socket = await (0, connect_1.makeSocket)(monitor.connectOptions);
		        const connection = (0, connect_1.makeConnection)(monitor.connectOptions, socket);
		        // The start time is after socket creation but before the handshake
		        start = (0, utils_1.processTimeMS)();
		        try {
		            await (0, connect_1.performInitialHandshake)(connection, monitor.connectOptions);
		            return connection;
		        }
		        catch (error) {
		            connection.destroy();
		            throw error;
		        }
		    })().then(connection => {
		        if (isInCloseState(monitor)) {
		            connection.destroy();
		            return;
		        }
		        const duration = (0, utils_1.calculateDurationInMs)(start);
		        monitor.addRttSample(duration);
		        monitor.connection = connection;
		        monitor.emitAndLogHeartbeat(server_1.Server.SERVER_HEARTBEAT_SUCCEEDED, monitor.server.topology.s.id, connection.hello?.connectionId, new events_1.ServerHeartbeatSucceededEvent(monitor.address, duration, connection.hello, useStreamingProtocol(monitor, connection.hello?.topologyVersion)));
		        callback(undefined, connection.hello);
		    }, error => {
		        monitor.connection = null;
		        awaited = false;
		        onHeartbeatFailed(error);
		    });
		}
		function monitorServer(monitor) {
		    return (callback) => {
		        if (monitor.s.state === STATE_MONITORING) {
		            queueMicrotask(callback);
		            return;
		        }
		        stateTransition(monitor, STATE_MONITORING);
		        function done() {
		            if (!isInCloseState(monitor)) {
		                stateTransition(monitor, STATE_IDLE);
		            }
		            callback();
		        }
		        checkServer(monitor, (err, hello) => {
		            if (err) {
		                // otherwise an error occurred on initial discovery, also bail
		                if (monitor.server.description.type === common_1.ServerType.Unknown) {
		                    return done();
		                }
		            }
		            // if the check indicates streaming is supported, immediately reschedule monitoring
		            if (useStreamingProtocol(monitor, hello?.topologyVersion)) {
		                (0, timers_1.setTimeout)(() => {
		                    if (!isInCloseState(monitor)) {
		                        monitor.monitorId?.wake();
		                    }
		                }, 0);
		            }
		            done();
		        });
		    };
		}
		function makeTopologyVersion(tv) {
		    return {
		        processId: tv.processId,
		        // tests mock counter as just number, but in a real situation counter should always be a Long
		        // TODO(NODE-2674): Preserve int64 sent from MongoDB
		        counter: bson_1.Long.isLong(tv.counter) ? tv.counter : bson_1.Long.fromNumber(tv.counter)
		    };
		}
		/** @internal */
		class RTTPinger {
		    constructor(monitor) {
		        this.connection = undefined;
		        this.cancellationToken = monitor.cancellationToken;
		        this.closed = false;
		        this.monitor = monitor;
		        this.latestRtt = monitor.latestRtt ?? undefined;
		        const heartbeatFrequencyMS = monitor.options.heartbeatFrequencyMS;
		        this.monitorId = (0, timers_1.setTimeout)(() => this.measureRoundTripTime(), heartbeatFrequencyMS);
		    }
		    get roundTripTime() {
		        return this.monitor.roundTripTime;
		    }
		    get minRoundTripTime() {
		        return this.monitor.minRoundTripTime;
		    }
		    close() {
		        this.closed = true;
		        (0, timers_1.clearTimeout)(this.monitorId);
		        this.connection?.destroy();
		        this.connection = undefined;
		    }
		    measureAndReschedule(start, conn) {
		        if (this.closed) {
		            conn?.destroy();
		            return;
		        }
		        if (this.connection == null) {
		            this.connection = conn;
		        }
		        this.latestRtt = (0, utils_1.calculateDurationInMs)(start);
		        this.monitorId = (0, timers_1.setTimeout)(() => this.measureRoundTripTime(), this.monitor.options.heartbeatFrequencyMS);
		    }
		    measureRoundTripTime() {
		        const start = (0, utils_1.processTimeMS)();
		        if (this.closed) {
		            return;
		        }
		        const connection = this.connection;
		        if (connection == null) {
		            (0, connect_1.connect)(this.monitor.connectOptions).then(connection => {
		                this.measureAndReschedule(start, connection);
		            }, () => {
		                this.connection = undefined;
		            });
		            return;
		        }
		        const commandName = connection.serverApi?.version || connection.helloOk ? 'hello' : constants_1.LEGACY_HELLO_COMMAND;
		        connection.command((0, utils_1.ns)('admin.$cmd'), { [commandName]: 1 }, undefined).then(() => this.measureAndReschedule(start), () => {
		            this.connection?.destroy();
		            this.connection = undefined;
		            return;
		        });
		    }
		}
		exports.RTTPinger = RTTPinger;
		/**
		 * @internal
		 */
		class MonitorInterval {
		    constructor(fn, options = {}) {
		        this.isExpeditedCallToFnScheduled = false;
		        this.stopped = false;
		        this.isExecutionInProgress = false;
		        this.hasExecutedOnce = false;
		        this._executeAndReschedule = () => {
		            if (this.stopped)
		                return;
		            if (this.timerId) {
		                (0, timers_1.clearTimeout)(this.timerId);
		            }
		            this.isExpeditedCallToFnScheduled = false;
		            this.isExecutionInProgress = true;
		            this.fn(() => {
		                this.lastExecutionEnded = (0, utils_1.processTimeMS)();
		                this.isExecutionInProgress = false;
		                this._reschedule(this.heartbeatFrequencyMS);
		            });
		        };
		        this.fn = fn;
		        this.lastExecutionEnded = -Infinity;
		        this.heartbeatFrequencyMS = options.heartbeatFrequencyMS ?? 1000;
		        this.minHeartbeatFrequencyMS = options.minHeartbeatFrequencyMS ?? 500;
		        if (options.immediate) {
		            this._executeAndReschedule();
		        }
		        else {
		            this._reschedule(undefined);
		        }
		    }
		    wake() {
		        const currentTime = (0, utils_1.processTimeMS)();
		        const timeSinceLastCall = currentTime - this.lastExecutionEnded;
		        // TODO(NODE-4674): Add error handling and logging to the monitor
		        if (timeSinceLastCall < 0) {
		            return this._executeAndReschedule();
		        }
		        if (this.isExecutionInProgress) {
		            return;
		        }
		        // debounce multiple calls to wake within the `minInterval`
		        if (this.isExpeditedCallToFnScheduled) {
		            return;
		        }
		        // reschedule a call as soon as possible, ensuring the call never happens
		        // faster than the `minInterval`
		        if (timeSinceLastCall < this.minHeartbeatFrequencyMS) {
		            this.isExpeditedCallToFnScheduled = true;
		            this._reschedule(this.minHeartbeatFrequencyMS - timeSinceLastCall);
		            return;
		        }
		        this._executeAndReschedule();
		    }
		    stop() {
		        this.stopped = true;
		        if (this.timerId) {
		            (0, timers_1.clearTimeout)(this.timerId);
		            this.timerId = undefined;
		        }
		        this.lastExecutionEnded = -Infinity;
		        this.isExpeditedCallToFnScheduled = false;
		    }
		    toString() {
		        return JSON.stringify(this);
		    }
		    toJSON() {
		        const currentTime = (0, utils_1.processTimeMS)();
		        const timeSinceLastCall = currentTime - this.lastExecutionEnded;
		        return {
		            timerId: this.timerId != null ? 'set' : 'cleared',
		            lastCallTime: this.lastExecutionEnded,
		            isExpeditedCheckScheduled: this.isExpeditedCallToFnScheduled,
		            stopped: this.stopped,
		            heartbeatFrequencyMS: this.heartbeatFrequencyMS,
		            minHeartbeatFrequencyMS: this.minHeartbeatFrequencyMS,
		            currentTime,
		            timeSinceLastCall
		        };
		    }
		    _reschedule(ms) {
		        if (this.stopped)
		            return;
		        if (this.timerId) {
		            (0, timers_1.clearTimeout)(this.timerId);
		        }
		        this.timerId = (0, timers_1.setTimeout)(this._executeAndReschedule, ms || this.heartbeatFrequencyMS);
		    }
		}
		exports.MonitorInterval = MonitorInterval;
		/** @internal
		 * This class implements the RTT sampling logic specified for [CSOT](https://github.com/mongodb/specifications/blob/bbb335e60cd7ea1e0f7cd9a9443cb95fc9d3b64d/source/client-side-operations-timeout/client-side-operations-timeout.md#drivers-use-minimum-rtt-to-short-circuit-operations)
		 *
		 * This is implemented as a [circular buffer](https://en.wikipedia.org/wiki/Circular_buffer) keeping
		 * the most recent `windowSize` samples
		 * */
		class RTTSampler {
		    constructor(windowSize = 10) {
		        this.rttSamples = new Float64Array(windowSize);
		        this.length = 0;
		        this.writeIndex = 0;
		    }
		    /**
		     * Adds an rtt sample to the end of the circular buffer
		     * When `windowSize` samples have been collected, `addSample` overwrites the least recently added
		     * sample
		     */
		    addSample(sample) {
		        this.rttSamples[this.writeIndex++] = sample;
		        if (this.length < this.rttSamples.length) {
		            this.length++;
		        }
		        this.writeIndex %= this.rttSamples.length;
		    }
		    /**
		     * When \< 2 samples have been collected, returns 0
		     * Otherwise computes the minimum value samples contained in the buffer
		     */
		    min() {
		        if (this.length < 2)
		            return 0;
		        let min = this.rttSamples[0];
		        for (let i = 1; i < this.length; i++) {
		            if (this.rttSamples[i] < min)
		                min = this.rttSamples[i];
		        }
		        return min;
		    }
		    /**
		     * Returns mean of samples contained in the buffer
		     */
		    average() {
		        if (this.length === 0)
		            return 0;
		        let sum = 0;
		        for (let i = 0; i < this.length; i++) {
		            sum += this.rttSamples[i];
		        }
		        return sum / this.length;
		    }
		    /**
		     * Returns most recently inserted element in the buffer
		     * Returns null if the buffer is empty
		     * */
		    get last() {
		        if (this.length === 0)
		            return null;
		        return this.rttSamples[this.writeIndex === 0 ? this.length - 1 : this.writeIndex - 1];
		    }
		    /**
		     * Clear the buffer
		     * NOTE: this does not overwrite the data held in the internal array, just the pointers into
		     * this array
		     */
		    clear() {
		        this.length = 0;
		        this.writeIndex = 0;
		    }
		}
		exports.RTTSampler = RTTSampler;
		
	} (monitor));
	return monitor;
}

var topology = {};

var server_selection_events = {};

var hasRequiredServer_selection_events;

function requireServer_selection_events () {
	if (hasRequiredServer_selection_events) return server_selection_events;
	hasRequiredServer_selection_events = 1;
	Object.defineProperty(server_selection_events, "__esModule", { value: true });
	server_selection_events.WaitingForSuitableServerEvent = server_selection_events.ServerSelectionSucceededEvent = server_selection_events.ServerSelectionFailedEvent = server_selection_events.ServerSelectionStartedEvent = server_selection_events.ServerSelectionEvent = void 0;
	const utils_1 = mongodb7.requireUtils();
	const constants_1 = mongodb3.requireConstants();
	/**
	 * The base export class for all logs published from server selection
	 * @internal
	 * @category Log Type
	 */
	class ServerSelectionEvent {
	    /** @internal */
	    constructor(selector, topologyDescription, operation) {
	        this.selector = selector;
	        this.operation = operation;
	        this.topologyDescription = topologyDescription;
	    }
	}
	server_selection_events.ServerSelectionEvent = ServerSelectionEvent;
	/**
	 * An event published when server selection starts
	 * @internal
	 * @category Event
	 */
	class ServerSelectionStartedEvent extends ServerSelectionEvent {
	    /** @internal */
	    constructor(selector, topologyDescription, operation) {
	        super(selector, topologyDescription, operation);
	        /** @internal */
	        this.name = constants_1.SERVER_SELECTION_STARTED;
	        this.message = 'Server selection started';
	    }
	}
	server_selection_events.ServerSelectionStartedEvent = ServerSelectionStartedEvent;
	/**
	 * An event published when a server selection fails
	 * @internal
	 * @category Event
	 */
	class ServerSelectionFailedEvent extends ServerSelectionEvent {
	    /** @internal */
	    constructor(selector, topologyDescription, error, operation) {
	        super(selector, topologyDescription, operation);
	        /** @internal */
	        this.name = constants_1.SERVER_SELECTION_FAILED;
	        this.message = 'Server selection failed';
	        this.failure = error;
	    }
	}
	server_selection_events.ServerSelectionFailedEvent = ServerSelectionFailedEvent;
	/**
	 * An event published when server selection succeeds
	 * @internal
	 * @category Event
	 */
	class ServerSelectionSucceededEvent extends ServerSelectionEvent {
	    /** @internal */
	    constructor(selector, topologyDescription, address, operation) {
	        super(selector, topologyDescription, operation);
	        /** @internal */
	        this.name = constants_1.SERVER_SELECTION_SUCCEEDED;
	        this.message = 'Server selection succeeded';
	        const { host, port } = utils_1.HostAddress.fromString(address).toHostPort();
	        this.serverHost = host;
	        this.serverPort = port;
	    }
	}
	server_selection_events.ServerSelectionSucceededEvent = ServerSelectionSucceededEvent;
	/**
	 * An event published when server selection is waiting for a suitable server to become available
	 * @internal
	 * @category Event
	 */
	class WaitingForSuitableServerEvent extends ServerSelectionEvent {
	    /** @internal */
	    constructor(selector, topologyDescription, remainingTimeMS, operation) {
	        super(selector, topologyDescription, operation);
	        /** @internal */
	        this.name = constants_1.WAITING_FOR_SUITABLE_SERVER;
	        this.message = 'Waiting for suitable server to become available';
	        this.remainingTimeMS = remainingTimeMS;
	    }
	}
	server_selection_events.WaitingForSuitableServerEvent = WaitingForSuitableServerEvent;
	
	return server_selection_events;
}

var srv_polling = {};

var hasRequiredSrv_polling;

function requireSrv_polling () {
	if (hasRequiredSrv_polling) return srv_polling;
	hasRequiredSrv_polling = 1;
	Object.defineProperty(srv_polling, "__esModule", { value: true });
	srv_polling.SrvPoller = srv_polling.SrvPollingEvent = void 0;
	const dns = require$$0$2;
	const timers_1 = require$$0;
	const error_1 = mongodb4.requireError();
	const mongo_types_1 = mongodb5.requireMongo_types();
	const utils_1 = mongodb7.requireUtils();
	/**
	 * @internal
	 * @category Event
	 */
	class SrvPollingEvent {
	    constructor(srvRecords) {
	        this.srvRecords = srvRecords;
	    }
	    hostnames() {
	        return new Set(this.srvRecords.map(r => utils_1.HostAddress.fromSrvRecord(r).toString()));
	    }
	}
	srv_polling.SrvPollingEvent = SrvPollingEvent;
	/** @internal */
	class SrvPoller extends mongo_types_1.TypedEventEmitter {
	    /** @event */
	    static { this.SRV_RECORD_DISCOVERY = 'srvRecordDiscovery'; }
	    constructor(options) {
	        super();
	        this.on('error', utils_1.noop);
	        if (!options || !options.srvHost) {
	            throw new error_1.MongoRuntimeError('Options for SrvPoller must exist and include srvHost');
	        }
	        this.srvHost = options.srvHost;
	        this.srvMaxHosts = options.srvMaxHosts ?? 0;
	        this.srvServiceName = options.srvServiceName ?? 'mongodb';
	        this.rescanSrvIntervalMS = 60000;
	        this.heartbeatFrequencyMS = options.heartbeatFrequencyMS ?? 10000;
	        this.haMode = false;
	        this.generation = 0;
	        this._timeout = undefined;
	    }
	    get srvAddress() {
	        return `_${this.srvServiceName}._tcp.${this.srvHost}`;
	    }
	    get intervalMS() {
	        return this.haMode ? this.heartbeatFrequencyMS : this.rescanSrvIntervalMS;
	    }
	    start() {
	        if (!this._timeout) {
	            this.schedule();
	        }
	    }
	    stop() {
	        if (this._timeout) {
	            (0, timers_1.clearTimeout)(this._timeout);
	            this.generation += 1;
	            this._timeout = undefined;
	        }
	    }
	    // TODO(NODE-4994): implement new logging logic for SrvPoller failures
	    schedule() {
	        if (this._timeout) {
	            (0, timers_1.clearTimeout)(this._timeout);
	        }
	        this._timeout = (0, timers_1.setTimeout)(() => {
	            this._poll().then(undefined, utils_1.squashError);
	        }, this.intervalMS);
	    }
	    success(srvRecords) {
	        this.haMode = false;
	        this.schedule();
	        this.emit(SrvPoller.SRV_RECORD_DISCOVERY, new SrvPollingEvent(srvRecords));
	    }
	    failure() {
	        this.haMode = true;
	        this.schedule();
	    }
	    async _poll() {
	        const generation = this.generation;
	        let srvRecords;
	        try {
	            srvRecords = await dns.promises.resolve(this.srvAddress, 'SRV');
	        }
	        catch {
	            this.failure();
	            return;
	        }
	        if (generation !== this.generation) {
	            return;
	        }
	        const finalAddresses = [];
	        for (const record of srvRecords) {
	            try {
	                (0, utils_1.checkParentDomainMatch)(record.name, this.srvHost);
	                finalAddresses.push(record);
	            }
	            catch (error) {
	                (0, utils_1.squashError)(error);
	            }
	        }
	        if (!finalAddresses.length) {
	            this.failure();
	            return;
	        }
	        this.success(finalAddresses);
	    }
	}
	srv_polling.SrvPoller = SrvPoller;
	
	return srv_polling;
}

var hasRequiredTopology;

function requireTopology () {
	if (hasRequiredTopology) return topology;
	hasRequiredTopology = 1;
	Object.defineProperty(topology, "__esModule", { value: true });
	topology.Topology = void 0;
	const connection_string_1 = mongodb3.requireConnection_string();
	const constants_1 = mongodb3.requireConstants();
	const error_1 = mongodb4.requireError();
	const mongo_logger_1 = mongodb5.requireMongo_logger();
	const mongo_types_1 = mongodb5.requireMongo_types();
	const read_preference_1 = mongodb5.requireRead_preference();
	const timeout_1 = requireTimeout();
	const utils_1 = mongodb7.requireUtils();
	const common_1 = mongodb5.requireCommon();
	const events_1 = mongodb5.requireEvents();
	const server_1 = requireServer();
	const server_description_1 = requireServer_description();
	const server_selection_1 = requireServer_selection();
	const server_selection_events_1 = requireServer_selection_events();
	const srv_polling_1 = requireSrv_polling();
	const topology_description_1 = requireTopology_description();
	// Global state
	let globalTopologyCounter = 0;
	const stateTransition = (0, utils_1.makeStateMachine)({
	    [common_1.STATE_CLOSED]: [common_1.STATE_CLOSED, common_1.STATE_CONNECTING],
	    [common_1.STATE_CONNECTING]: [common_1.STATE_CONNECTING, common_1.STATE_CLOSING, common_1.STATE_CONNECTED, common_1.STATE_CLOSED],
	    [common_1.STATE_CONNECTED]: [common_1.STATE_CONNECTED, common_1.STATE_CLOSING, common_1.STATE_CLOSED],
	    [common_1.STATE_CLOSING]: [common_1.STATE_CLOSING, common_1.STATE_CLOSED]
	});
	/**
	 * A container of server instances representing a connection to a MongoDB topology.
	 * @internal
	 */
	class Topology extends mongo_types_1.TypedEventEmitter {
	    /** @event */
	    static { this.SERVER_OPENING = constants_1.SERVER_OPENING; }
	    /** @event */
	    static { this.SERVER_CLOSED = constants_1.SERVER_CLOSED; }
	    /** @event */
	    static { this.SERVER_DESCRIPTION_CHANGED = constants_1.SERVER_DESCRIPTION_CHANGED; }
	    /** @event */
	    static { this.TOPOLOGY_OPENING = constants_1.TOPOLOGY_OPENING; }
	    /** @event */
	    static { this.TOPOLOGY_CLOSED = constants_1.TOPOLOGY_CLOSED; }
	    /** @event */
	    static { this.TOPOLOGY_DESCRIPTION_CHANGED = constants_1.TOPOLOGY_DESCRIPTION_CHANGED; }
	    /** @event */
	    static { this.ERROR = constants_1.ERROR; }
	    /** @event */
	    static { this.OPEN = constants_1.OPEN; }
	    /** @event */
	    static { this.CONNECT = constants_1.CONNECT; }
	    /** @event */
	    static { this.CLOSE = constants_1.CLOSE; }
	    /** @event */
	    static { this.TIMEOUT = constants_1.TIMEOUT; }
	    /**
	     * @param seedlist - a list of HostAddress instances to connect to
	     */
	    constructor(client, seeds, options) {
	        super();
	        this.on('error', utils_1.noop);
	        this.client = client;
	        // Options should only be undefined in tests, MongoClient will always have defined options
	        options = options ?? {
	            hosts: [utils_1.HostAddress.fromString('localhost:27017')],
	            ...Object.fromEntries(connection_string_1.DEFAULT_OPTIONS.entries())
	        };
	        if (typeof seeds === 'string') {
	            seeds = [utils_1.HostAddress.fromString(seeds)];
	        }
	        else if (!Array.isArray(seeds)) {
	            seeds = [seeds];
	        }
	        const seedlist = [];
	        for (const seed of seeds) {
	            if (typeof seed === 'string') {
	                seedlist.push(utils_1.HostAddress.fromString(seed));
	            }
	            else if (seed instanceof utils_1.HostAddress) {
	                seedlist.push(seed);
	            }
	            else {
	                // FIXME(NODE-3483): May need to be a MongoParseError
	                throw new error_1.MongoRuntimeError(`Topology cannot be constructed from ${JSON.stringify(seed)}`);
	            }
	        }
	        const topologyType = topologyTypeFromOptions(options);
	        const topologyId = globalTopologyCounter++;
	        const selectedHosts = options.srvMaxHosts == null ||
	            options.srvMaxHosts === 0 ||
	            options.srvMaxHosts >= seedlist.length
	            ? seedlist
	            : (0, utils_1.shuffle)(seedlist, options.srvMaxHosts);
	        const serverDescriptions = new Map();
	        for (const hostAddress of selectedHosts) {
	            serverDescriptions.set(hostAddress.toString(), new server_description_1.ServerDescription(hostAddress));
	        }
	        this.waitQueue = new utils_1.List();
	        this.s = {
	            // the id of this topology
	            id: topologyId,
	            // passed in options
	            options,
	            // initial seedlist of servers to connect to
	            seedlist,
	            // initial state
	            state: common_1.STATE_CLOSED,
	            // the topology description
	            description: new topology_description_1.TopologyDescription(topologyType, serverDescriptions, options.replicaSet, undefined, undefined, undefined, options),
	            serverSelectionTimeoutMS: options.serverSelectionTimeoutMS,
	            heartbeatFrequencyMS: options.heartbeatFrequencyMS,
	            minHeartbeatFrequencyMS: options.minHeartbeatFrequencyMS,
	            // a map of server instances to normalized addresses
	            servers: new Map(),
	            credentials: options?.credentials,
	            clusterTime: undefined,
	            detectShardedTopology: ev => this.detectShardedTopology(ev),
	            detectSrvRecords: ev => this.detectSrvRecords(ev)
	        };
	        this.mongoLogger = client.mongoLogger;
	        this.component = 'topology';
	        if (options.srvHost && !options.loadBalanced) {
	            this.s.srvPoller =
	                options.srvPoller ??
	                    new srv_polling_1.SrvPoller({
	                        heartbeatFrequencyMS: this.s.heartbeatFrequencyMS,
	                        srvHost: options.srvHost,
	                        srvMaxHosts: options.srvMaxHosts,
	                        srvServiceName: options.srvServiceName
	                    });
	            this.on(Topology.TOPOLOGY_DESCRIPTION_CHANGED, this.s.detectShardedTopology);
	        }
	        this.connectionLock = undefined;
	    }
	    detectShardedTopology(event) {
	        const previousType = event.previousDescription.type;
	        const newType = event.newDescription.type;
	        const transitionToSharded = previousType !== common_1.TopologyType.Sharded && newType === common_1.TopologyType.Sharded;
	        const srvListeners = this.s.srvPoller?.listeners(srv_polling_1.SrvPoller.SRV_RECORD_DISCOVERY);
	        const listeningToSrvPolling = !!srvListeners?.includes(this.s.detectSrvRecords);
	        if (transitionToSharded && !listeningToSrvPolling) {
	            this.s.srvPoller?.on(srv_polling_1.SrvPoller.SRV_RECORD_DISCOVERY, this.s.detectSrvRecords);
	            this.s.srvPoller?.start();
	        }
	    }
	    detectSrvRecords(ev) {
	        const previousTopologyDescription = this.s.description;
	        this.s.description = this.s.description.updateFromSrvPollingEvent(ev, this.s.options.srvMaxHosts);
	        if (this.s.description === previousTopologyDescription) {
	            // Nothing changed, so return
	            return;
	        }
	        updateServers(this);
	        this.emitAndLog(Topology.TOPOLOGY_DESCRIPTION_CHANGED, new events_1.TopologyDescriptionChangedEvent(this.s.id, previousTopologyDescription, this.s.description));
	    }
	    /**
	     * @returns A `TopologyDescription` for this topology
	     */
	    get description() {
	        return this.s.description;
	    }
	    get loadBalanced() {
	        return this.s.options.loadBalanced;
	    }
	    get serverApi() {
	        return this.s.options.serverApi;
	    }
	    /** Initiate server connect */
	    async connect(options) {
	        this.connectionLock ??= this._connect(options);
	        try {
	            await this.connectionLock;
	            return this;
	        }
	        finally {
	            this.connectionLock = undefined;
	        }
	    }
	    async _connect(options) {
	        options = options ?? {};
	        if (this.s.state === common_1.STATE_CONNECTED) {
	            return this;
	        }
	        stateTransition(this, common_1.STATE_CONNECTING);
	        // emit SDAM monitoring events
	        this.emitAndLog(Topology.TOPOLOGY_OPENING, new events_1.TopologyOpeningEvent(this.s.id));
	        // emit an event for the topology change
	        this.emitAndLog(Topology.TOPOLOGY_DESCRIPTION_CHANGED, new events_1.TopologyDescriptionChangedEvent(this.s.id, new topology_description_1.TopologyDescription(common_1.TopologyType.Unknown), // initial is always Unknown
	        this.s.description));
	        // connect all known servers, then attempt server selection to connect
	        const serverDescriptions = Array.from(this.s.description.servers.values());
	        this.s.servers = new Map(serverDescriptions.map(serverDescription => [
	            serverDescription.address,
	            createAndConnectServer(this, serverDescription)
	        ]));
	        // In load balancer mode we need to fake a server description getting
	        // emitted from the monitor, since the monitor doesn't exist.
	        if (this.s.options.loadBalanced) {
	            for (const description of serverDescriptions) {
	                const newDescription = new server_description_1.ServerDescription(description.hostAddress, undefined, {
	                    loadBalanced: this.s.options.loadBalanced
	                });
	                this.serverUpdateHandler(newDescription);
	            }
	        }
	        const serverSelectionTimeoutMS = this.client.s.options.serverSelectionTimeoutMS;
	        const readPreference = options.readPreference ?? read_preference_1.ReadPreference.primary;
	        const timeoutContext = timeout_1.TimeoutContext.create({
	            // TODO(NODE-6448): auto-connect ignores timeoutMS; potential future feature
	            timeoutMS: undefined,
	            serverSelectionTimeoutMS,
	            waitQueueTimeoutMS: this.client.s.options.waitQueueTimeoutMS
	        });
	        const selectServerOptions = {
	            operationName: 'handshake',
	            ...options,
	            timeoutContext,
	            deprioritizedServers: new server_selection_1.DeprioritizedServers()
	        };
	        try {
	            const server = await this.selectServer((0, server_selection_1.readPreferenceServerSelector)(readPreference), selectServerOptions);
	            const skipPingOnConnect = this.s.options.__skipPingOnConnect === true;
	            if (!skipPingOnConnect) {
	                const connection = await server.pool.checkOut({ timeoutContext: timeoutContext });
	                server.pool.checkIn(connection);
	                stateTransition(this, common_1.STATE_CONNECTED);
	                this.emit(Topology.OPEN, this);
	                this.emit(Topology.CONNECT, this);
	                return this;
	            }
	            stateTransition(this, common_1.STATE_CONNECTED);
	            this.emit(Topology.OPEN, this);
	            this.emit(Topology.CONNECT, this);
	            return this;
	        }
	        catch (error) {
	            this.close();
	            throw error;
	        }
	    }
	    closeCheckedOutConnections() {
	        for (const server of this.s.servers.values()) {
	            return server.closeCheckedOutConnections();
	        }
	    }
	    /** Close this topology */
	    close() {
	        if (this.s.state === common_1.STATE_CLOSED || this.s.state === common_1.STATE_CLOSING) {
	            return;
	        }
	        for (const server of this.s.servers.values()) {
	            closeServer(server, this);
	        }
	        this.s.servers.clear();
	        stateTransition(this, common_1.STATE_CLOSING);
	        drainWaitQueue(this.waitQueue, new error_1.MongoTopologyClosedError());
	        if (this.s.srvPoller) {
	            this.s.srvPoller.stop();
	            this.s.srvPoller.removeListener(srv_polling_1.SrvPoller.SRV_RECORD_DISCOVERY, this.s.detectSrvRecords);
	        }
	        this.removeListener(Topology.TOPOLOGY_DESCRIPTION_CHANGED, this.s.detectShardedTopology);
	        stateTransition(this, common_1.STATE_CLOSED);
	        // emit an event for close
	        this.emitAndLog(Topology.TOPOLOGY_CLOSED, new events_1.TopologyClosedEvent(this.s.id));
	    }
	    /**
	     * Selects a server according to the selection predicate provided
	     *
	     * @param selector - An optional selector to select servers by, defaults to a random selection within a latency window
	     * @param options - Optional settings related to server selection
	     * @param callback - The callback used to indicate success or failure
	     * @returns An instance of a `Server` meeting the criteria of the predicate provided
	     */
	    async selectServer(selector, options) {
	        let serverSelector;
	        if (typeof selector !== 'function') {
	            if (typeof selector === 'string') {
	                serverSelector = (0, server_selection_1.readPreferenceServerSelector)(read_preference_1.ReadPreference.fromString(selector));
	            }
	            else {
	                let readPreference;
	                if (selector instanceof read_preference_1.ReadPreference) {
	                    readPreference = selector;
	                }
	                else {
	                    read_preference_1.ReadPreference.translate(options);
	                    readPreference = options.readPreference || read_preference_1.ReadPreference.primary;
	                }
	                serverSelector = (0, server_selection_1.readPreferenceServerSelector)(readPreference);
	            }
	        }
	        else {
	            serverSelector = selector;
	        }
	        options = { serverSelectionTimeoutMS: this.s.serverSelectionTimeoutMS, ...options };
	        if (this.client.mongoLogger?.willLog(mongo_logger_1.MongoLoggableComponent.SERVER_SELECTION, mongo_logger_1.SeverityLevel.DEBUG)) {
	            this.client.mongoLogger?.debug(mongo_logger_1.MongoLoggableComponent.SERVER_SELECTION, new server_selection_events_1.ServerSelectionStartedEvent(selector, this.description, options.operationName));
	        }
	        let timeout;
	        if (options.timeoutContext)
	            timeout = options.timeoutContext.serverSelectionTimeout;
	        else {
	            timeout = timeout_1.Timeout.expires(options.serverSelectionTimeoutMS ?? 0);
	        }
	        const isSharded = this.description.type === common_1.TopologyType.Sharded;
	        const session = options.session;
	        const transaction = session && session.transaction;
	        if (isSharded && transaction && transaction.server) {
	            if (this.client.mongoLogger?.willLog(mongo_logger_1.MongoLoggableComponent.SERVER_SELECTION, mongo_logger_1.SeverityLevel.DEBUG)) {
	                this.client.mongoLogger?.debug(mongo_logger_1.MongoLoggableComponent.SERVER_SELECTION, new server_selection_events_1.ServerSelectionSucceededEvent(selector, this.description, transaction.server.pool.address, options.operationName));
	            }
	            if (!options.timeoutContext || options.timeoutContext.clearServerSelectionTimeout) {
	                timeout?.clear();
	            }
	            return transaction.server;
	        }
	        const { promise: serverPromise, resolve, reject } = (0, utils_1.promiseWithResolvers)();
	        const waitQueueMember = {
	            serverSelector,
	            topologyDescription: this.description,
	            mongoLogger: this.client.mongoLogger,
	            transaction,
	            resolve,
	            reject,
	            cancelled: false,
	            startTime: (0, utils_1.processTimeMS)(),
	            operationName: options.operationName,
	            waitingLogged: false,
	            deprioritizedServers: options.deprioritizedServers
	        };
	        const abortListener = (0, utils_1.addAbortListener)(options.signal, function () {
	            waitQueueMember.cancelled = true;
	            reject(this.reason);
	        });
	        this.waitQueue.push(waitQueueMember);
	        processWaitQueue(this);
	        try {
	            timeout?.throwIfExpired();
	            const server = await (timeout ? Promise.race([serverPromise, timeout]) : serverPromise);
	            if (options.timeoutContext?.csotEnabled() && server.description.minRoundTripTime !== 0) {
	                options.timeoutContext.minRoundTripTime = server.description.minRoundTripTime;
	            }
	            return server;
	        }
	        catch (error) {
	            if (timeout_1.TimeoutError.is(error)) {
	                // Timeout
	                waitQueueMember.cancelled = true;
	                const timeoutError = new error_1.MongoServerSelectionError(`Server selection timed out after ${timeout?.duration} ms`, this.description);
	                if (this.client.mongoLogger?.willLog(mongo_logger_1.MongoLoggableComponent.SERVER_SELECTION, mongo_logger_1.SeverityLevel.DEBUG)) {
	                    this.client.mongoLogger?.debug(mongo_logger_1.MongoLoggableComponent.SERVER_SELECTION, new server_selection_events_1.ServerSelectionFailedEvent(selector, this.description, timeoutError, options.operationName));
	                }
	                if (options.timeoutContext?.csotEnabled()) {
	                    throw new error_1.MongoOperationTimeoutError('Timed out during server selection', {
	                        cause: timeoutError
	                    });
	                }
	                throw timeoutError;
	            }
	            // Other server selection error
	            throw error;
	        }
	        finally {
	            abortListener?.[utils_1.kDispose]();
	            if (!options.timeoutContext || options.timeoutContext.clearServerSelectionTimeout) {
	                timeout?.clear();
	            }
	        }
	    }
	    /**
	     * Update the internal TopologyDescription with a ServerDescription
	     *
	     * @param serverDescription - The server to update in the internal list of server descriptions
	     */
	    serverUpdateHandler(serverDescription) {
	        if (!this.s.description.hasServer(serverDescription.address)) {
	            return;
	        }
	        // ignore this server update if its from an outdated topologyVersion
	        if (isStaleServerDescription(this.s.description, serverDescription)) {
	            return;
	        }
	        // these will be used for monitoring events later
	        const previousTopologyDescription = this.s.description;
	        const previousServerDescription = this.s.description.servers.get(serverDescription.address);
	        if (!previousServerDescription) {
	            return;
	        }
	        // Driver Sessions Spec: "Whenever a driver receives a cluster time from
	        // a server it MUST compare it to the current highest seen cluster time
	        // for the deployment. If the new cluster time is higher than the
	        // highest seen cluster time it MUST become the new highest seen cluster
	        // time. Two cluster times are compared using only the BsonTimestamp
	        // value of the clusterTime embedded field."
	        const clusterTime = serverDescription.$clusterTime;
	        if (clusterTime) {
	            (0, common_1._advanceClusterTime)(this, clusterTime);
	        }
	        // If we already know all the information contained in this updated description, then
	        // we don't need to emit SDAM events, but still need to update the description, in order
	        // to keep client-tracked attributes like last update time and round trip time up to date
	        const equalDescriptions = previousServerDescription && previousServerDescription.equals(serverDescription);
	        // first update the TopologyDescription
	        this.s.description = this.s.description.update(serverDescription);
	        if (this.s.description.compatibilityError) {
	            this.emit(Topology.ERROR, new error_1.MongoCompatibilityError(this.s.description.compatibilityError));
	            return;
	        }
	        // emit monitoring events for this change
	        if (!equalDescriptions) {
	            const newDescription = this.s.description.servers.get(serverDescription.address);
	            if (newDescription) {
	                this.emit(Topology.SERVER_DESCRIPTION_CHANGED, new events_1.ServerDescriptionChangedEvent(this.s.id, serverDescription.address, previousServerDescription, newDescription));
	            }
	        }
	        // update server list from updated descriptions
	        updateServers(this, serverDescription);
	        // attempt to resolve any outstanding server selection attempts
	        if (this.waitQueue.length > 0) {
	            processWaitQueue(this);
	        }
	        if (!equalDescriptions) {
	            this.emitAndLog(Topology.TOPOLOGY_DESCRIPTION_CHANGED, new events_1.TopologyDescriptionChangedEvent(this.s.id, previousTopologyDescription, this.s.description));
	        }
	    }
	    auth(credentials, callback) {
	        if (typeof credentials === 'function')
	            ((callback = credentials), (credentials = undefined));
	        if (typeof callback === 'function')
	            callback(undefined, true);
	    }
	    isConnected() {
	        return this.s.state === common_1.STATE_CONNECTED;
	    }
	    isDestroyed() {
	        return this.s.state === common_1.STATE_CLOSED;
	    }
	    // NOTE: There are many places in code where we explicitly check the last hello
	    //       to do feature support detection. This should be done any other way, but for
	    //       now we will just return the first hello seen, which should suffice.
	    lastHello() {
	        const serverDescriptions = Array.from(this.description.servers.values());
	        if (serverDescriptions.length === 0)
	            return {};
	        const sd = serverDescriptions.filter((sd) => sd.type !== common_1.ServerType.Unknown)[0];
	        const result = sd || { maxWireVersion: this.description.commonWireVersion };
	        return result;
	    }
	    get commonWireVersion() {
	        return this.description.commonWireVersion;
	    }
	    get logicalSessionTimeoutMinutes() {
	        return this.description.logicalSessionTimeoutMinutes;
	    }
	    get clusterTime() {
	        return this.s.clusterTime;
	    }
	    set clusterTime(clusterTime) {
	        this.s.clusterTime = clusterTime;
	    }
	}
	topology.Topology = Topology;
	/** Destroys a server, and removes all event listeners from the instance */
	function closeServer(server, topology) {
	    for (const event of constants_1.LOCAL_SERVER_EVENTS) {
	        server.removeAllListeners(event);
	    }
	    server.close();
	    topology.emitAndLog(Topology.SERVER_CLOSED, new events_1.ServerClosedEvent(topology.s.id, server.description.address));
	    for (const event of constants_1.SERVER_RELAY_EVENTS) {
	        server.removeAllListeners(event);
	    }
	}
	/** Predicts the TopologyType from options */
	function topologyTypeFromOptions(options) {
	    if (options?.directConnection) {
	        return common_1.TopologyType.Single;
	    }
	    if (options?.replicaSet) {
	        return common_1.TopologyType.ReplicaSetNoPrimary;
	    }
	    if (options?.loadBalanced) {
	        return common_1.TopologyType.LoadBalanced;
	    }
	    return common_1.TopologyType.Unknown;
	}
	/**
	 * Creates new server instances and attempts to connect them
	 *
	 * @param topology - The topology that this server belongs to
	 * @param serverDescription - The description for the server to initialize and connect to
	 */
	function createAndConnectServer(topology, serverDescription) {
	    topology.emitAndLog(Topology.SERVER_OPENING, new events_1.ServerOpeningEvent(topology.s.id, serverDescription.address));
	    const server = new server_1.Server(topology, serverDescription, topology.s.options);
	    for (const event of constants_1.SERVER_RELAY_EVENTS) {
	        server.on(event, (e) => topology.emit(event, e));
	    }
	    server.on(server_1.Server.DESCRIPTION_RECEIVED, description => topology.serverUpdateHandler(description));
	    server.connect();
	    return server;
	}
	/**
	 * @param topology - Topology to update.
	 * @param incomingServerDescription - New server description.
	 */
	function updateServers(topology, incomingServerDescription) {
	    // update the internal server's description
	    if (incomingServerDescription && topology.s.servers.has(incomingServerDescription.address)) {
	        const server = topology.s.servers.get(incomingServerDescription.address);
	        if (server) {
	            server.s.description = incomingServerDescription;
	            if (incomingServerDescription.error instanceof error_1.MongoError &&
	                incomingServerDescription.error.hasErrorLabel(error_1.MongoErrorLabel.ResetPool)) {
	                const interruptInUseConnections = incomingServerDescription.error.hasErrorLabel(error_1.MongoErrorLabel.InterruptInUseConnections);
	                server.pool.clear({ interruptInUseConnections });
	            }
	            else if (incomingServerDescription.error == null) {
	                const newTopologyType = topology.s.description.type;
	                const shouldMarkPoolReady = incomingServerDescription.isDataBearing ||
	                    (incomingServerDescription.type !== common_1.ServerType.Unknown &&
	                        newTopologyType === common_1.TopologyType.Single);
	                if (shouldMarkPoolReady) {
	                    server.pool.ready();
	                }
	            }
	        }
	    }
	    // add new servers for all descriptions we currently don't know about locally
	    for (const serverDescription of topology.description.servers.values()) {
	        if (!topology.s.servers.has(serverDescription.address)) {
	            const server = createAndConnectServer(topology, serverDescription);
	            topology.s.servers.set(serverDescription.address, server);
	        }
	    }
	    // for all servers no longer known, remove their descriptions and destroy their instances
	    for (const entry of topology.s.servers) {
	        const serverAddress = entry[0];
	        if (topology.description.hasServer(serverAddress)) {
	            continue;
	        }
	        if (!topology.s.servers.has(serverAddress)) {
	            continue;
	        }
	        const server = topology.s.servers.get(serverAddress);
	        topology.s.servers.delete(serverAddress);
	        // prepare server for garbage collection
	        if (server) {
	            closeServer(server, topology);
	        }
	    }
	}
	function drainWaitQueue(queue, drainError) {
	    while (queue.length) {
	        const waitQueueMember = queue.shift();
	        if (!waitQueueMember) {
	            continue;
	        }
	        if (!waitQueueMember.cancelled) {
	            if (waitQueueMember.mongoLogger?.willLog(mongo_logger_1.MongoLoggableComponent.SERVER_SELECTION, mongo_logger_1.SeverityLevel.DEBUG)) {
	                waitQueueMember.mongoLogger?.debug(mongo_logger_1.MongoLoggableComponent.SERVER_SELECTION, new server_selection_events_1.ServerSelectionFailedEvent(waitQueueMember.serverSelector, waitQueueMember.topologyDescription, drainError, waitQueueMember.operationName));
	            }
	            waitQueueMember.reject(drainError);
	        }
	    }
	}
	function processWaitQueue(topology) {
	    if (topology.s.state === common_1.STATE_CLOSED) {
	        drainWaitQueue(topology.waitQueue, new error_1.MongoTopologyClosedError());
	        return;
	    }
	    const isSharded = topology.description.type === common_1.TopologyType.Sharded;
	    const serverDescriptions = Array.from(topology.description.servers.values());
	    const membersToProcess = topology.waitQueue.length;
	    for (let i = 0; i < membersToProcess; ++i) {
	        const waitQueueMember = topology.waitQueue.shift();
	        if (!waitQueueMember) {
	            continue;
	        }
	        if (waitQueueMember.cancelled) {
	            continue;
	        }
	        let selectedDescriptions;
	        try {
	            const serverSelector = waitQueueMember.serverSelector;
	            const deprioritizedServers = waitQueueMember.deprioritizedServers;
	            selectedDescriptions = serverSelector
	                ? serverSelector(topology.description, serverDescriptions, deprioritizedServers)
	                : serverDescriptions;
	        }
	        catch (selectorError) {
	            if (topology.client.mongoLogger?.willLog(mongo_logger_1.MongoLoggableComponent.SERVER_SELECTION, mongo_logger_1.SeverityLevel.DEBUG)) {
	                topology.client.mongoLogger?.debug(mongo_logger_1.MongoLoggableComponent.SERVER_SELECTION, new server_selection_events_1.ServerSelectionFailedEvent(waitQueueMember.serverSelector, topology.description, selectorError, waitQueueMember.operationName));
	            }
	            waitQueueMember.reject(selectorError);
	            continue;
	        }
	        let selectedServer;
	        if (selectedDescriptions.length === 0) {
	            if (!waitQueueMember.waitingLogged) {
	                if (topology.client.mongoLogger?.willLog(mongo_logger_1.MongoLoggableComponent.SERVER_SELECTION, mongo_logger_1.SeverityLevel.INFORMATIONAL)) {
	                    topology.client.mongoLogger?.info(mongo_logger_1.MongoLoggableComponent.SERVER_SELECTION, new server_selection_events_1.WaitingForSuitableServerEvent(waitQueueMember.serverSelector, topology.description, topology.s.serverSelectionTimeoutMS !== 0
	                        ? topology.s.serverSelectionTimeoutMS -
	                            ((0, utils_1.processTimeMS)() - waitQueueMember.startTime)
	                        : -1, waitQueueMember.operationName));
	                }
	                waitQueueMember.waitingLogged = true;
	            }
	            topology.waitQueue.push(waitQueueMember);
	            continue;
	        }
	        else if (selectedDescriptions.length === 1) {
	            selectedServer = topology.s.servers.get(selectedDescriptions[0].address);
	        }
	        else {
	            const descriptions = (0, utils_1.shuffle)(selectedDescriptions, 2);
	            const server1 = topology.s.servers.get(descriptions[0].address);
	            const server2 = topology.s.servers.get(descriptions[1].address);
	            selectedServer =
	                server1 && server2 && server1.s.operationCount < server2.s.operationCount
	                    ? server1
	                    : server2;
	        }
	        if (!selectedServer) {
	            const serverSelectionError = new error_1.MongoServerSelectionError('server selection returned a server description but the server was not found in the topology', topology.description);
	            if (topology.client.mongoLogger?.willLog(mongo_logger_1.MongoLoggableComponent.SERVER_SELECTION, mongo_logger_1.SeverityLevel.DEBUG)) {
	                topology.client.mongoLogger?.debug(mongo_logger_1.MongoLoggableComponent.SERVER_SELECTION, new server_selection_events_1.ServerSelectionFailedEvent(waitQueueMember.serverSelector, topology.description, serverSelectionError, waitQueueMember.operationName));
	            }
	            waitQueueMember.reject(serverSelectionError);
	            return;
	        }
	        const transaction = waitQueueMember.transaction;
	        if (isSharded && transaction && transaction.isActive && selectedServer) {
	            transaction.pinServer(selectedServer);
	        }
	        if (topology.client.mongoLogger?.willLog(mongo_logger_1.MongoLoggableComponent.SERVER_SELECTION, mongo_logger_1.SeverityLevel.DEBUG)) {
	            topology.client.mongoLogger?.debug(mongo_logger_1.MongoLoggableComponent.SERVER_SELECTION, new server_selection_events_1.ServerSelectionSucceededEvent(waitQueueMember.serverSelector, waitQueueMember.topologyDescription, selectedServer.pool.address, waitQueueMember.operationName));
	        }
	        waitQueueMember.resolve(selectedServer);
	    }
	    if (topology.waitQueue.length > 0) {
	        // ensure all server monitors attempt monitoring soon
	        for (const [, server] of topology.s.servers) {
	            queueMicrotask(function scheduleServerCheck() {
	                return server.requestCheck();
	            });
	        }
	    }
	}
	function isStaleServerDescription(topologyDescription, incomingServerDescription) {
	    const currentServerDescription = topologyDescription.servers.get(incomingServerDescription.address);
	    const currentTopologyVersion = currentServerDescription?.topologyVersion;
	    return ((0, server_description_1.compareTopologyVersion)(currentTopologyVersion, incomingServerDescription.topologyVersion) > 0);
	}
	
	return topology;
}

exports.requireMonitor = requireMonitor;
exports.requireServer_description = requireServer_description;
exports.requireServer_selection = requireServer_selection;
exports.requireServer_selection_events = requireServer_selection_events;
exports.requireSessions = requireSessions;
exports.requireSort = requireSort;
exports.requireSrv_polling = requireSrv_polling;
exports.requireTimeout = requireTimeout;
exports.requireTopology = requireTopology;
exports.requireTopology_description = requireTopology_description;
