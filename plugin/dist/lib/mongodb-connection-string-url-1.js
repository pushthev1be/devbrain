'use strict';

const whatwgUrl1 = require('./whatwg-url-1.js');

var lib = {};

var redact = {};

var hasRequiredRedact;

function requireRedact () {
	if (hasRequiredRedact) return redact;
	hasRequiredRedact = 1;
	var __createBinding = (redact && redact.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    var desc = Object.getOwnPropertyDescriptor(m, k);
	    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
	      desc = { enumerable: true, get: function() { return m[k]; } };
	    }
	    Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    o[k2] = m[k];
	}));
	var __setModuleDefault = (redact && redact.__setModuleDefault) || (Object.create ? (function(o, v) {
	    Object.defineProperty(o, "default", { enumerable: true, value: v });
	}) : function(o, v) {
	    o["default"] = v;
	});
	var __importStar = (redact && redact.__importStar) || (function () {
	    var ownKeys = function(o) {
	        ownKeys = Object.getOwnPropertyNames || function (o) {
	            var ar = [];
	            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
	            return ar;
	        };
	        return ownKeys(o);
	    };
	    return function (mod) {
	        if (mod && mod.__esModule) return mod;
	        var result = {};
	        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
	        __setModuleDefault(result, mod);
	        return result;
	    };
	})();
	Object.defineProperty(redact, "__esModule", { value: true });
	redact.redactValidConnectionString = redactValidConnectionString;
	redact.redactConnectionString = redactConnectionString;
	const index_1 = __importStar(requireLib());
	function redactValidConnectionString(inputUrl, options) {
	    const url = inputUrl.clone();
	    const replacementString = options?.replacementString ?? '_credentials_';
	    const redactUsernames = options?.redactUsernames ?? true;
	    if ((url.username || url.password) && redactUsernames) {
	        url.username = replacementString;
	        url.password = '';
	    }
	    else if (url.password) {
	        url.password = replacementString;
	    }
	    if (url.searchParams.has('authMechanismProperties')) {
	        const props = new index_1.CommaAndColonSeparatedRecord(url.searchParams.get('authMechanismProperties'));
	        if (props.get('AWS_SESSION_TOKEN')) {
	            props.set('AWS_SESSION_TOKEN', replacementString);
	            url.searchParams.set('authMechanismProperties', props.toString());
	        }
	    }
	    if (url.searchParams.has('tlsCertificateKeyFilePassword')) {
	        url.searchParams.set('tlsCertificateKeyFilePassword', replacementString);
	    }
	    if (url.searchParams.has('proxyUsername') && redactUsernames) {
	        url.searchParams.set('proxyUsername', replacementString);
	    }
	    if (url.searchParams.has('proxyPassword')) {
	        url.searchParams.set('proxyPassword', replacementString);
	    }
	    return url;
	}
	function redactConnectionString(uri, options) {
	    const replacementString = options?.replacementString ?? '<credentials>';
	    const redactUsernames = options?.redactUsernames ?? true;
	    let parsed;
	    try {
	        parsed = new index_1.default(uri);
	    }
	    catch {
	    }
	    if (parsed) {
	        options = { ...options, replacementString: '___credentials___' };
	        return parsed
	            .redact(options)
	            .toString()
	            .replace(/___credentials___/g, replacementString);
	    }
	    const R = replacementString;
	    const replacements = [
	        uri => uri.replace(redactUsernames ? /(\/\/)(.*)(@)/g : /(\/\/[^@]*:)(.*)(@)/g, `$1${R}$3`),
	        uri => uri.replace(/(AWS_SESSION_TOKEN(:|%3A))([^,&]+)/gi, `$1${R}`),
	        uri => uri.replace(/(tlsCertificateKeyFilePassword=)([^&]+)/gi, `$1${R}`),
	        uri => (redactUsernames ? uri.replace(/(proxyUsername=)([^&]+)/gi, `$1${R}`) : uri),
	        uri => uri.replace(/(proxyPassword=)([^&]+)/gi, `$1${R}`)
	    ];
	    for (const replacer of replacements) {
	        uri = replacer(uri);
	    }
	    return uri;
	}
	
	return redact;
}

var hasRequiredLib;

function requireLib () {
	if (hasRequiredLib) return lib;
	hasRequiredLib = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.CommaAndColonSeparatedRecord = exports.ConnectionString = exports.redactConnectionString = void 0;
		const whatwg_url_1 = whatwgUrl1.requireWhatwgUrl();
		const redact_1 = requireRedact();
		Object.defineProperty(exports, "redactConnectionString", { enumerable: true, get: function () { return redact_1.redactConnectionString; } });
		const DUMMY_HOSTNAME = '__this_is_a_placeholder__';
		function connectionStringHasValidScheme(connectionString) {
		    return connectionString.startsWith('mongodb://') || connectionString.startsWith('mongodb+srv://');
		}
		const HOSTS_REGEX = /^(?<protocol>[^/]+):\/\/(?:(?<username>[^:@]*)(?::(?<password>[^@]*))?@)?(?<hosts>(?!:)[^/?@]*)(?<rest>.*)/;
		class CaseInsensitiveMap extends Map {
		    delete(name) {
		        return super.delete(this._normalizeKey(name));
		    }
		    get(name) {
		        return super.get(this._normalizeKey(name));
		    }
		    has(name) {
		        return super.has(this._normalizeKey(name));
		    }
		    set(name, value) {
		        return super.set(this._normalizeKey(name), value);
		    }
		    _normalizeKey(name) {
		        name = `${name}`;
		        for (const key of this.keys()) {
		            if (key.toLowerCase() === name.toLowerCase()) {
		                name = key;
		                break;
		            }
		        }
		        return name;
		    }
		}
		function caseInsenstiveURLSearchParams(Ctor) {
		    return class CaseInsenstiveURLSearchParams extends Ctor {
		        append(name, value) {
		            return super.append(this._normalizeKey(name), value);
		        }
		        delete(name) {
		            return super.delete(this._normalizeKey(name));
		        }
		        get(name) {
		            return super.get(this._normalizeKey(name));
		        }
		        getAll(name) {
		            return super.getAll(this._normalizeKey(name));
		        }
		        has(name) {
		            return super.has(this._normalizeKey(name));
		        }
		        set(name, value) {
		            return super.set(this._normalizeKey(name), value);
		        }
		        keys() {
		            return super.keys();
		        }
		        values() {
		            return super.values();
		        }
		        entries() {
		            return super.entries();
		        }
		        [Symbol.iterator]() {
		            return super[Symbol.iterator]();
		        }
		        _normalizeKey(name) {
		            return CaseInsensitiveMap.prototype._normalizeKey.call(this, name);
		        }
		    };
		}
		class URLWithoutHost extends whatwg_url_1.URL {
		}
		class MongoParseError extends Error {
		    get name() {
		        return 'MongoParseError';
		    }
		}
		class ConnectionString extends URLWithoutHost {
		    _hosts;
		    constructor(uri, options = {}) {
		        const { looseValidation } = options;
		        if (!looseValidation && !connectionStringHasValidScheme(uri)) {
		            throw new MongoParseError('Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"');
		        }
		        const match = uri.match(HOSTS_REGEX);
		        if (!match) {
		            throw new MongoParseError(`Invalid connection string "${uri}"`);
		        }
		        const { protocol, username, password, hosts, rest } = match.groups ?? {};
		        if (!looseValidation) {
		            if (!protocol || !hosts) {
		                throw new MongoParseError(`Protocol and host list are required in "${uri}"`);
		            }
		            try {
		                decodeURIComponent(username ?? '');
		                decodeURIComponent(password ?? '');
		            }
		            catch (err) {
		                throw new MongoParseError(err.message);
		            }
		            const illegalCharacters = /[:/?#[\]@]/gi;
		            if (username?.match(illegalCharacters)) {
		                throw new MongoParseError(`Username contains unescaped characters ${username}`);
		            }
		            if (!username || !password) {
		                const uriWithoutProtocol = uri.replace(`${protocol}://`, '');
		                if (uriWithoutProtocol.startsWith('@') || uriWithoutProtocol.startsWith(':')) {
		                    throw new MongoParseError('URI contained empty userinfo section');
		                }
		            }
		            if (password?.match(illegalCharacters)) {
		                throw new MongoParseError('Password contains unescaped characters');
		            }
		        }
		        let authString = '';
		        if (typeof username === 'string')
		            authString += username;
		        if (typeof password === 'string')
		            authString += `:${password}`;
		        if (authString)
		            authString += '@';
		        try {
		            super(`${protocol.toLowerCase()}://${authString}${DUMMY_HOSTNAME}${rest}`);
		        }
		        catch (err) {
		            if (looseValidation) {
		                new ConnectionString(uri, {
		                    ...options,
		                    looseValidation: false
		                });
		            }
		            if (typeof err.message === 'string') {
		                err.message = err.message.replace(DUMMY_HOSTNAME, hosts);
		            }
		            throw err;
		        }
		        this._hosts = hosts.split(',');
		        if (!looseValidation) {
		            if (this.isSRV && this.hosts.length !== 1) {
		                throw new MongoParseError('mongodb+srv URI cannot have multiple service names');
		            }
		            if (this.isSRV && this.hosts.some(host => host.includes(':'))) {
		                throw new MongoParseError('mongodb+srv URI cannot have port number');
		            }
		        }
		        if (!this.pathname) {
		            this.pathname = '/';
		        }
		        Object.setPrototypeOf(this.searchParams, caseInsenstiveURLSearchParams(this.searchParams.constructor).prototype);
		    }
		    get host() {
		        return DUMMY_HOSTNAME;
		    }
		    set host(_ignored) {
		        throw new Error('No single host for connection string');
		    }
		    get hostname() {
		        return DUMMY_HOSTNAME;
		    }
		    set hostname(_ignored) {
		        throw new Error('No single host for connection string');
		    }
		    get port() {
		        return '';
		    }
		    set port(_ignored) {
		        throw new Error('No single host for connection string');
		    }
		    get href() {
		        return this.toString();
		    }
		    set href(_ignored) {
		        throw new Error('Cannot set href for connection strings');
		    }
		    get isSRV() {
		        return this.protocol.includes('srv');
		    }
		    get hosts() {
		        return this._hosts;
		    }
		    set hosts(list) {
		        this._hosts = list;
		    }
		    toString() {
		        return super.toString().replace(DUMMY_HOSTNAME, this.hosts.join(','));
		    }
		    clone() {
		        return new ConnectionString(this.toString(), {
		            looseValidation: true
		        });
		    }
		    redact(options) {
		        return (0, redact_1.redactValidConnectionString)(this, options);
		    }
		    typedSearchParams() {
		        return this.searchParams;
		    }
		    [Symbol.for('nodejs.util.inspect.custom')]() {
		        const { href, origin, protocol, username, password, hosts, pathname, search, searchParams, hash } = this;
		        return {
		            href,
		            origin,
		            protocol,
		            username,
		            password,
		            hosts,
		            pathname,
		            search,
		            searchParams,
		            hash
		        };
		    }
		}
		exports.ConnectionString = ConnectionString;
		class CommaAndColonSeparatedRecord extends CaseInsensitiveMap {
		    constructor(from) {
		        super();
		        for (const entry of (from ?? '').split(',')) {
		            if (!entry)
		                continue;
		            const colonIndex = entry.indexOf(':');
		            if (colonIndex === -1) {
		                this.set(entry, '');
		            }
		            else {
		                this.set(entry.slice(0, colonIndex), entry.slice(colonIndex + 1));
		            }
		        }
		    }
		    toString() {
		        return [...this].map(entry => entry.join(':')).join(',');
		    }
		}
		exports.CommaAndColonSeparatedRecord = CommaAndColonSeparatedRecord;
		exports.default = ConnectionString;
		
	} (lib));
	return lib;
}

exports.requireLib = requireLib;
