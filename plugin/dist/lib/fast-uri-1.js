'use strict';

var fastUri = {exports: {}};

var utils;
var hasRequiredUtils;

function requireUtils () {
	if (hasRequiredUtils) return utils;
	hasRequiredUtils = 1;

	/** @type {(value: string) => boolean} */
	const isUUID = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu);

	/** @type {(value: string) => boolean} */
	const isIPv4 = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u);

	/** @type {(value: string) => boolean} */
	const isHexPair = RegExp.prototype.test.bind(/^[\da-f]{2}$/iu);

	/** @type {(value: string) => boolean} */
	const isUnreserved = RegExp.prototype.test.bind(/^[\da-z\-._~]$/iu);

	/** @type {(value: string) => boolean} */
	const isPathCharacter = RegExp.prototype.test.bind(/^[\da-z\-._~!$&'()*+,;=:@/]$/iu);

	/**
	 * @param {Array<string>} input
	 * @returns {string}
	 */
	function stringArrayToHexStripped (input) {
	  let acc = '';
	  let code = 0;
	  let i = 0;

	  for (i = 0; i < input.length; i++) {
	    code = input[i].charCodeAt(0);
	    if (code === 48) {
	      continue
	    }
	    if (!((code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102))) {
	      return ''
	    }
	    acc += input[i];
	    break
	  }

	  for (i += 1; i < input.length; i++) {
	    code = input[i].charCodeAt(0);
	    if (!((code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102))) {
	      return ''
	    }
	    acc += input[i];
	  }
	  return acc
	}

	/**
	 * @typedef {Object} GetIPV6Result
	 * @property {boolean} error - Indicates if there was an error parsing the IPv6 address.
	 * @property {string} address - The parsed IPv6 address.
	 * @property {string} [zone] - The zone identifier, if present.
	 */

	/**
	 * @param {string} value
	 * @returns {boolean}
	 */
	const nonSimpleDomain = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);

	/**
	 * @param {Array<string>} buffer
	 * @returns {boolean}
	 */
	function consumeIsZone (buffer) {
	  buffer.length = 0;
	  return true
	}

	/**
	 * @param {Array<string>} buffer
	 * @param {Array<string>} address
	 * @param {GetIPV6Result} output
	 * @returns {boolean}
	 */
	function consumeHextets (buffer, address, output) {
	  if (buffer.length) {
	    const hex = stringArrayToHexStripped(buffer);
	    if (hex !== '') {
	      address.push(hex);
	    } else {
	      output.error = true;
	      return false
	    }
	    buffer.length = 0;
	  }
	  return true
	}

	/**
	 * @param {string} input
	 * @returns {GetIPV6Result}
	 */
	function getIPV6 (input) {
	  let tokenCount = 0;
	  const output = { error: false, address: '', zone: '' };
	  /** @type {Array<string>} */
	  const address = [];
	  /** @type {Array<string>} */
	  const buffer = [];
	  let endipv6Encountered = false;
	  let endIpv6 = false;

	  let consume = consumeHextets;

	  for (let i = 0; i < input.length; i++) {
	    const cursor = input[i];
	    if (cursor === '[' || cursor === ']') { continue }
	    if (cursor === ':') {
	      if (endipv6Encountered === true) {
	        endIpv6 = true;
	      }
	      if (!consume(buffer, address, output)) { break }
	      if (++tokenCount > 7) {
	        // not valid
	        output.error = true;
	        break
	      }
	      if (i > 0 && input[i - 1] === ':') {
	        endipv6Encountered = true;
	      }
	      address.push(':');
	      continue
	    } else if (cursor === '%') {
	      if (!consume(buffer, address, output)) { break }
	      // switch to zone detection
	      consume = consumeIsZone;
	    } else {
	      buffer.push(cursor);
	      continue
	    }
	  }
	  if (buffer.length) {
	    if (consume === consumeIsZone) {
	      output.zone = buffer.join('');
	    } else if (endIpv6) {
	      address.push(buffer.join(''));
	    } else {
	      address.push(stringArrayToHexStripped(buffer));
	    }
	  }
	  output.address = address.join('');
	  return output
	}

	/**
	 * @typedef {Object} NormalizeIPv6Result
	 * @property {string} host - The normalized host.
	 * @property {string} [escapedHost] - The escaped host.
	 * @property {boolean} isIPV6 - Indicates if the host is an IPv6 address.
	 */

	/**
	 * @param {string} host
	 * @returns {NormalizeIPv6Result}
	 */
	function normalizeIPv6 (host) {
	  if (findToken(host, ':') < 2) { return { host, isIPV6: false } }
	  const ipv6 = getIPV6(host);

	  if (!ipv6.error) {
	    let newHost = ipv6.address;
	    let escapedHost = ipv6.address;
	    if (ipv6.zone) {
	      newHost += '%' + ipv6.zone;
	      escapedHost += '%25' + ipv6.zone;
	    }
	    return { host: newHost, isIPV6: true, escapedHost }
	  } else {
	    return { host, isIPV6: false }
	  }
	}

	/**
	 * @param {string} str
	 * @param {string} token
	 * @returns {number}
	 */
	function findToken (str, token) {
	  let ind = 0;
	  for (let i = 0; i < str.length; i++) {
	    if (str[i] === token) ind++;
	  }
	  return ind
	}

	/**
	 * @param {string} path
	 * @returns {string}
	 *
	 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-5.2.4
	 */
	function removeDotSegments (path) {
	  let input = path;
	  const output = [];
	  let nextSlash = -1;
	  let len = 0;

	  // eslint-disable-next-line no-cond-assign
	  while (len = input.length) {
	    if (len === 1) {
	      if (input === '.') {
	        break
	      } else if (input === '/') {
	        output.push('/');
	        break
	      } else {
	        output.push(input);
	        break
	      }
	    } else if (len === 2) {
	      if (input[0] === '.') {
	        if (input[1] === '.') {
	          break
	        } else if (input[1] === '/') {
	          input = input.slice(2);
	          continue
	        }
	      } else if (input[0] === '/') {
	        if (input[1] === '.' || input[1] === '/') {
	          output.push('/');
	          break
	        }
	      }
	    } else if (len === 3) {
	      if (input === '/..') {
	        if (output.length !== 0) {
	          output.pop();
	        }
	        output.push('/');
	        break
	      }
	    }
	    if (input[0] === '.') {
	      if (input[1] === '.') {
	        if (input[2] === '/') {
	          input = input.slice(3);
	          continue
	        }
	      } else if (input[1] === '/') {
	        input = input.slice(2);
	        continue
	      }
	    } else if (input[0] === '/') {
	      if (input[1] === '.') {
	        if (input[2] === '/') {
	          input = input.slice(2);
	          continue
	        } else if (input[2] === '.') {
	          if (input[3] === '/') {
	            input = input.slice(3);
	            if (output.length !== 0) {
	              output.pop();
	            }
	            continue
	          }
	        }
	      }
	    }

	    // Rule 2E: Move normal path segment to output
	    if ((nextSlash = input.indexOf('/', 1)) === -1) {
	      output.push(input);
	      break
	    } else {
	      output.push(input.slice(0, nextSlash));
	      input = input.slice(nextSlash);
	    }
	  }

	  return output.join('')
	}

	/**
	 * Re-escape RFC 3986 gen-delims that must not appear literally in the host.
	 * After the URI regex parses, these characters cannot be literal in the host
	 * field, so any that appear after decoding came from percent-encoding and
	 * must be restored to prevent authority structure changes.
	 *
	 * @param {string} host
	 * @param {boolean} isIP - true for IPv4/IPv6 hosts (skip colon re-escaping)
	 * @returns {string}
	 */
	const HOST_DELIMS = { '@': '%40', '/': '%2F', '?': '%3F', '#': '%23', ':': '%3A' };
	const HOST_DELIM_RE = /[@/?#:]/g;
	const HOST_DELIM_NO_COLON_RE = /[@/?#]/g;

	function reescapeHostDelimiters (host, isIP) {
	  const re = isIP ? HOST_DELIM_NO_COLON_RE : HOST_DELIM_RE;
	  re.lastIndex = 0;
	  return host.replace(re, (ch) => HOST_DELIMS[ch])
	}

	/**
	 * Normalizes percent escapes and optionally decodes only unreserved ASCII bytes.
	 * Reserved delimiters such as `%2F` and `%2E` stay escaped.
	 *
	 * @param {string} input
	 * @param {boolean} [decodeUnreserved=false]
	 * @returns {string}
	 */
	function normalizePercentEncoding (input, decodeUnreserved = false) {
	  if (input.indexOf('%') === -1) {
	    return input
	  }

	  let output = '';

	  for (let i = 0; i < input.length; i++) {
	    if (input[i] === '%' && i + 2 < input.length) {
	      const hex = input.slice(i + 1, i + 3);
	      if (isHexPair(hex)) {
	        const normalizedHex = hex.toUpperCase();
	        const decoded = String.fromCharCode(parseInt(normalizedHex, 16));

	        if (decodeUnreserved && isUnreserved(decoded)) {
	          output += decoded;
	        } else {
	          output += '%' + normalizedHex;
	        }

	        i += 2;
	        continue
	      }
	    }

	    output += input[i];
	  }

	  return output
	}

	/**
	 * Normalizes path data without turning reserved escapes into live path syntax.
	 * Valid escapes are uppercased, raw unsafe characters are escaped, and only
	 * unreserved bytes that are not `.` are decoded.
	 *
	 * @param {string} input
	 * @returns {string}
	 */
	function normalizePathEncoding (input) {
	  let output = '';

	  for (let i = 0; i < input.length; i++) {
	    if (input[i] === '%' && i + 2 < input.length) {
	      const hex = input.slice(i + 1, i + 3);
	      if (isHexPair(hex)) {
	        const normalizedHex = hex.toUpperCase();
	        const decoded = String.fromCharCode(parseInt(normalizedHex, 16));

	        if (decoded !== '.' && isUnreserved(decoded)) {
	          output += decoded;
	        } else {
	          output += '%' + normalizedHex;
	        }

	        i += 2;
	        continue
	      }
	    }

	    if (isPathCharacter(input[i])) {
	      output += input[i];
	    } else {
	      output += escape(input[i]);
	    }
	  }

	  return output
	}

	/**
	 * Escapes a component while preserving existing valid percent escapes.
	 *
	 * @param {string} input
	 * @returns {string}
	 */
	function escapePreservingEscapes (input) {
	  let output = '';

	  for (let i = 0; i < input.length; i++) {
	    if (input[i] === '%' && i + 2 < input.length) {
	      const hex = input.slice(i + 1, i + 3);
	      if (isHexPair(hex)) {
	        output += '%' + hex.toUpperCase();
	        i += 2;
	        continue
	      }
	    }

	    output += escape(input[i]);
	  }

	  return output
	}

	/**
	 * @param {import('../types/index').URIComponent} component
	 * @returns {string|undefined}
	 */
	function recomposeAuthority (component) {
	  const uriTokens = [];

	  if (component.userinfo !== undefined) {
	    uriTokens.push(component.userinfo);
	    uriTokens.push('@');
	  }

	  if (component.host !== undefined) {
	    let host = unescape(component.host);
	    if (!isIPv4(host)) {
	      const ipV6res = normalizeIPv6(host);
	      if (ipV6res.isIPV6 === true) {
	        host = `[${ipV6res.escapedHost}]`;
	      } else {
	        host = reescapeHostDelimiters(host, false);
	      }
	    }
	    uriTokens.push(host);
	  }

	  if (typeof component.port === 'number' || typeof component.port === 'string') {
	    uriTokens.push(':');
	    uriTokens.push(String(component.port));
	  }

	  return uriTokens.length ? uriTokens.join('') : undefined
	}
	utils = {
	  nonSimpleDomain,
	  recomposeAuthority,
	  reescapeHostDelimiters,
	  normalizePercentEncoding,
	  normalizePathEncoding,
	  escapePreservingEscapes,
	  removeDotSegments,
	  isIPv4,
	  isUUID,
	  normalizeIPv6,
	  stringArrayToHexStripped
	};
	return utils;
}

var schemes;
var hasRequiredSchemes;

function requireSchemes () {
	if (hasRequiredSchemes) return schemes;
	hasRequiredSchemes = 1;

	const { isUUID } = requireUtils();
	const URN_REG = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;

	const supportedSchemeNames = /** @type {const} */ (['http', 'https', 'ws',
	  'wss', 'urn', 'urn:uuid']);

	/** @typedef {supportedSchemeNames[number]} SchemeName */

	/**
	 * @param {string} name
	 * @returns {name is SchemeName}
	 */
	function isValidSchemeName (name) {
	  return supportedSchemeNames.indexOf(/** @type {*} */ (name)) !== -1
	}

	/**
	 * @callback SchemeFn
	 * @param {import('../types/index').URIComponent} component
	 * @param {import('../types/index').Options} options
	 * @returns {import('../types/index').URIComponent}
	 */

	/**
	 * @typedef {Object} SchemeHandler
	 * @property {SchemeName} scheme - The scheme name.
	 * @property {boolean} [domainHost] - Indicates if the scheme supports domain hosts.
	 * @property {SchemeFn} parse - Function to parse the URI component for this scheme.
	 * @property {SchemeFn} serialize - Function to serialize the URI component for this scheme.
	 * @property {boolean} [skipNormalize] - Indicates if normalization should be skipped for this scheme.
	 * @property {boolean} [absolutePath] - Indicates if the scheme uses absolute paths.
	 * @property {boolean} [unicodeSupport] - Indicates if the scheme supports Unicode.
	 */

	/**
	 * @param {import('../types/index').URIComponent} wsComponent
	 * @returns {boolean}
	 */
	function wsIsSecure (wsComponent) {
	  if (wsComponent.secure === true) {
	    return true
	  } else if (wsComponent.secure === false) {
	    return false
	  } else if (wsComponent.scheme) {
	    return (
	      wsComponent.scheme.length === 3 &&
	      (wsComponent.scheme[0] === 'w' || wsComponent.scheme[0] === 'W') &&
	      (wsComponent.scheme[1] === 's' || wsComponent.scheme[1] === 'S') &&
	      (wsComponent.scheme[2] === 's' || wsComponent.scheme[2] === 'S')
	    )
	  } else {
	    return false
	  }
	}

	/** @type {SchemeFn} */
	function httpParse (component) {
	  if (!component.host) {
	    component.error = component.error || 'HTTP URIs must have a host.';
	  }

	  return component
	}

	/** @type {SchemeFn} */
	function httpSerialize (component) {
	  const secure = String(component.scheme).toLowerCase() === 'https';

	  // normalize the default port
	  if (component.port === (secure ? 443 : 80) || component.port === '') {
	    component.port = undefined;
	  }

	  // normalize the empty path
	  if (!component.path) {
	    component.path = '/';
	  }

	  // NOTE: We do not parse query strings for HTTP URIs
	  // as WWW Form Url Encoded query strings are part of the HTML4+ spec,
	  // and not the HTTP spec.

	  return component
	}

	/** @type {SchemeFn} */
	function wsParse (wsComponent) {
	// indicate if the secure flag is set
	  wsComponent.secure = wsIsSecure(wsComponent);

	  // construct resouce name
	  wsComponent.resourceName = (wsComponent.path || '/') + (wsComponent.query ? '?' + wsComponent.query : '');
	  wsComponent.path = undefined;
	  wsComponent.query = undefined;

	  return wsComponent
	}

	/** @type {SchemeFn} */
	function wsSerialize (wsComponent) {
	// normalize the default port
	  if (wsComponent.port === (wsIsSecure(wsComponent) ? 443 : 80) || wsComponent.port === '') {
	    wsComponent.port = undefined;
	  }

	  // ensure scheme matches secure flag
	  if (typeof wsComponent.secure === 'boolean') {
	    wsComponent.scheme = (wsComponent.secure ? 'wss' : 'ws');
	    wsComponent.secure = undefined;
	  }

	  // reconstruct path from resource name
	  if (wsComponent.resourceName) {
	    const [path, query] = wsComponent.resourceName.split('?');
	    wsComponent.path = (path && path !== '/' ? path : undefined);
	    wsComponent.query = query;
	    wsComponent.resourceName = undefined;
	  }

	  // forbid fragment component
	  wsComponent.fragment = undefined;

	  return wsComponent
	}

	/** @type {SchemeFn} */
	function urnParse (urnComponent, options) {
	  if (!urnComponent.path) {
	    urnComponent.error = 'URN can not be parsed';
	    return urnComponent
	  }
	  const matches = urnComponent.path.match(URN_REG);
	  if (matches) {
	    const scheme = options.scheme || urnComponent.scheme || 'urn';
	    urnComponent.nid = matches[1].toLowerCase();
	    urnComponent.nss = matches[2];
	    const urnScheme = `${scheme}:${options.nid || urnComponent.nid}`;
	    const schemeHandler = getSchemeHandler(urnScheme);
	    urnComponent.path = undefined;

	    if (schemeHandler) {
	      urnComponent = schemeHandler.parse(urnComponent, options);
	    }
	  } else {
	    urnComponent.error = urnComponent.error || 'URN can not be parsed.';
	  }

	  return urnComponent
	}

	/** @type {SchemeFn} */
	function urnSerialize (urnComponent, options) {
	  if (urnComponent.nid === undefined) {
	    throw new Error('URN without nid cannot be serialized')
	  }
	  const scheme = options.scheme || urnComponent.scheme || 'urn';
	  const nid = urnComponent.nid.toLowerCase();
	  const urnScheme = `${scheme}:${options.nid || nid}`;
	  const schemeHandler = getSchemeHandler(urnScheme);

	  if (schemeHandler) {
	    urnComponent = schemeHandler.serialize(urnComponent, options);
	  }

	  const uriComponent = urnComponent;
	  const nss = urnComponent.nss;
	  uriComponent.path = `${nid || options.nid}:${nss}`;

	  options.skipEscape = true;
	  return uriComponent
	}

	/** @type {SchemeFn} */
	function urnuuidParse (urnComponent, options) {
	  const uuidComponent = urnComponent;
	  uuidComponent.uuid = uuidComponent.nss;
	  uuidComponent.nss = undefined;

	  if (!options.tolerant && (!uuidComponent.uuid || !isUUID(uuidComponent.uuid))) {
	    uuidComponent.error = uuidComponent.error || 'UUID is not valid.';
	  }

	  return uuidComponent
	}

	/** @type {SchemeFn} */
	function urnuuidSerialize (uuidComponent) {
	  const urnComponent = uuidComponent;
	  // normalize UUID
	  urnComponent.nss = (uuidComponent.uuid || '').toLowerCase();
	  return urnComponent
	}

	const http = /** @type {SchemeHandler} */ ({
	  scheme: 'http',
	  domainHost: true,
	  parse: httpParse,
	  serialize: httpSerialize
	});

	const https = /** @type {SchemeHandler} */ ({
	  scheme: 'https',
	  domainHost: http.domainHost,
	  parse: httpParse,
	  serialize: httpSerialize
	});

	const ws = /** @type {SchemeHandler} */ ({
	  scheme: 'ws',
	  domainHost: true,
	  parse: wsParse,
	  serialize: wsSerialize
	});

	const wss = /** @type {SchemeHandler} */ ({
	  scheme: 'wss',
	  domainHost: ws.domainHost,
	  parse: ws.parse,
	  serialize: ws.serialize
	});

	const urn = /** @type {SchemeHandler} */ ({
	  scheme: 'urn',
	  parse: urnParse,
	  serialize: urnSerialize,
	  skipNormalize: true
	});

	const urnuuid = /** @type {SchemeHandler} */ ({
	  scheme: 'urn:uuid',
	  parse: urnuuidParse,
	  serialize: urnuuidSerialize,
	  skipNormalize: true
	});

	const SCHEMES = /** @type {Record<SchemeName, SchemeHandler>} */ ({
	  http,
	  https,
	  ws,
	  wss,
	  urn,
	  'urn:uuid': urnuuid
	});

	Object.setPrototypeOf(SCHEMES, null);

	/**
	 * @param {string|undefined} scheme
	 * @returns {SchemeHandler|undefined}
	 */
	function getSchemeHandler (scheme) {
	  return (
	    scheme && (
	      SCHEMES[/** @type {SchemeName} */ (scheme)] ||
	      SCHEMES[/** @type {SchemeName} */(scheme.toLowerCase())])
	  ) ||
	    undefined
	}

	schemes = {
	  wsIsSecure,
	  SCHEMES,
	  isValidSchemeName,
	  getSchemeHandler,
	};
	return schemes;
}

var hasRequiredFastUri;

function requireFastUri () {
	if (hasRequiredFastUri) return fastUri.exports;
	hasRequiredFastUri = 1;

	const { normalizeIPv6, removeDotSegments, recomposeAuthority, normalizePercentEncoding, normalizePathEncoding, escapePreservingEscapes, reescapeHostDelimiters, isIPv4, nonSimpleDomain } = requireUtils();
	const { SCHEMES, getSchemeHandler } = requireSchemes();

	/**
	 * @template {import('./types/index').URIComponent|string} T
	 * @param {T} uri
	 * @param {import('./types/index').Options} [options]
	 * @returns {T}
	 */
	function normalize (uri, options) {
	  if (typeof uri === 'string') {
	    uri = /** @type {T} */ (normalizeString(uri, options));
	  } else if (typeof uri === 'object') {
	    uri = /** @type {T} */ (parse(serialize(uri, options), options));
	  }
	  return uri
	}

	/**
	 * @param {string} baseURI
	 * @param {string} relativeURI
	 * @param {import('./types/index').Options} [options]
	 * @returns {string}
	 */
	function resolve (baseURI, relativeURI, options) {
	  const schemelessOptions = options ? Object.assign({ scheme: 'null' }, options) : { scheme: 'null' };
	  const resolved = resolveComponent(parse(baseURI, schemelessOptions), parse(relativeURI, schemelessOptions), schemelessOptions, true);
	  schemelessOptions.skipEscape = true;
	  return serialize(resolved, schemelessOptions)
	}

	/**
	 * @param {import ('./types/index').URIComponent} base
	 * @param {import ('./types/index').URIComponent} relative
	 * @param {import('./types/index').Options} [options]
	 * @param {boolean} [skipNormalization=false]
	 * @returns {import ('./types/index').URIComponent}
	 */
	function resolveComponent (base, relative, options, skipNormalization) {
	  /** @type {import('./types/index').URIComponent} */
	  const target = {};
	  if (!skipNormalization) {
	    base = parse(serialize(base, options), options); // normalize base component
	    relative = parse(serialize(relative, options), options); // normalize relative component
	  }
	  options = options || {};

	  if (!options.tolerant && relative.scheme) {
	    target.scheme = relative.scheme;
	    // target.authority = relative.authority;
	    target.userinfo = relative.userinfo;
	    target.host = relative.host;
	    target.port = relative.port;
	    target.path = removeDotSegments(relative.path || '');
	    target.query = relative.query;
	  } else {
	    if (relative.userinfo !== undefined || relative.host !== undefined || relative.port !== undefined) {
	      // target.authority = relative.authority;
	      target.userinfo = relative.userinfo;
	      target.host = relative.host;
	      target.port = relative.port;
	      target.path = removeDotSegments(relative.path || '');
	      target.query = relative.query;
	    } else {
	      if (!relative.path) {
	        target.path = base.path;
	        if (relative.query !== undefined) {
	          target.query = relative.query;
	        } else {
	          target.query = base.query;
	        }
	      } else {
	        if (relative.path[0] === '/') {
	          target.path = removeDotSegments(relative.path);
	        } else {
	          if ((base.userinfo !== undefined || base.host !== undefined || base.port !== undefined) && !base.path) {
	            target.path = '/' + relative.path;
	          } else if (!base.path) {
	            target.path = relative.path;
	          } else {
	            target.path = base.path.slice(0, base.path.lastIndexOf('/') + 1) + relative.path;
	          }
	          target.path = removeDotSegments(target.path);
	        }
	        target.query = relative.query;
	      }
	      // target.authority = base.authority;
	      target.userinfo = base.userinfo;
	      target.host = base.host;
	      target.port = base.port;
	    }
	    target.scheme = base.scheme;
	  }

	  target.fragment = relative.fragment;

	  return target
	}

	/**
	 * @param {import ('./types/index').URIComponent|string} uriA
	 * @param {import ('./types/index').URIComponent|string} uriB
	 * @param {import ('./types/index').Options} options
	 * @returns {boolean}
	 */
	function equal (uriA, uriB, options) {
	  const normalizedA = normalizeComparableURI(uriA, options);
	  const normalizedB = normalizeComparableURI(uriB, options);

	  return normalizedA !== undefined && normalizedB !== undefined && normalizedA.toLowerCase() === normalizedB.toLowerCase()
	}

	/**
	 * @param {Readonly<import('./types/index').URIComponent>} cmpts
	 * @param {import('./types/index').Options} [opts]
	 * @returns {string}
	 */
	function serialize (cmpts, opts) {
	  const component = {
	    host: cmpts.host,
	    scheme: cmpts.scheme,
	    userinfo: cmpts.userinfo,
	    port: cmpts.port,
	    path: cmpts.path,
	    query: cmpts.query,
	    nid: cmpts.nid,
	    nss: cmpts.nss,
	    uuid: cmpts.uuid,
	    fragment: cmpts.fragment,
	    reference: cmpts.reference,
	    resourceName: cmpts.resourceName,
	    secure: cmpts.secure,
	    error: ''
	  };
	  const options = Object.assign({}, opts);
	  const uriTokens = [];

	  // find scheme handler
	  const schemeHandler = getSchemeHandler(options.scheme || component.scheme);

	  // perform scheme specific serialization
	  if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(component, options);

	  if (component.path !== undefined) {
	    if (!options.skipEscape) {
	      component.path = escapePreservingEscapes(component.path);

	      if (component.scheme !== undefined) {
	        component.path = component.path.split('%3A').join(':');
	      }
	    } else {
	      component.path = normalizePercentEncoding(component.path);
	    }
	  }

	  if (options.reference !== 'suffix' && component.scheme) {
	    uriTokens.push(component.scheme, ':');
	  }

	  const authority = recomposeAuthority(component);
	  if (authority !== undefined) {
	    if (options.reference !== 'suffix') {
	      uriTokens.push('//');
	    }

	    uriTokens.push(authority);

	    if (component.path && component.path[0] !== '/') {
	      uriTokens.push('/');
	    }
	  }
	  if (component.path !== undefined) {
	    let s = component.path;

	    if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
	      s = removeDotSegments(s);
	    }

	    if (
	      authority === undefined &&
	      s[0] === '/' &&
	      s[1] === '/'
	    ) {
	      // don't allow the path to start with "//"
	      s = '/%2F' + s.slice(2);
	    }

	    uriTokens.push(s);
	  }

	  if (component.query !== undefined) {
	    uriTokens.push('?', component.query);
	  }

	  if (component.fragment !== undefined) {
	    uriTokens.push('#', component.fragment);
	  }
	  return uriTokens.join('')
	}

	const URI_PARSE = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;

	/**
	 * @param {import('./types/index').URIComponent} parsed
	 * @param {RegExpMatchArray} matches
	 * @returns {string|undefined}
	 */
	function getParseError (parsed, matches) {
	  if (matches[2] !== undefined && parsed.path && parsed.path[0] !== '/') {
	    return 'URI path must start with "/" when authority is present.'
	  }

	  if (typeof parsed.port === 'number' && (parsed.port < 0 || parsed.port > 65535)) {
	    return 'URI port is malformed.'
	  }

	  return undefined
	}

	/**
	 * @param {string} uri
	 * @param {import('./types/index').Options} [opts]
	 * @returns {{ parsed: import('./types/index').URIComponent, malformedAuthorityOrPort: boolean }}
	 */
	function parseWithStatus (uri, opts) {
	  const options = Object.assign({}, opts);
	  /** @type {import('./types/index').URIComponent} */
	  const parsed = {
	    scheme: undefined,
	    userinfo: undefined,
	    host: '',
	    port: undefined,
	    path: '',
	    query: undefined,
	    fragment: undefined
	  };

	  let malformedAuthorityOrPort = false;

	  let isIP = false;
	  if (options.reference === 'suffix') {
	    if (options.scheme) {
	      uri = options.scheme + ':' + uri;
	    } else {
	      uri = '//' + uri;
	    }
	  }

	  const matches = uri.match(URI_PARSE);

	  if (matches) {
	    // store each component
	    parsed.scheme = matches[1];
	    parsed.userinfo = matches[3];
	    parsed.host = matches[4];
	    parsed.port = parseInt(matches[5], 10);
	    parsed.path = matches[6] || '';
	    parsed.query = matches[7];
	    parsed.fragment = matches[8];

	    // fix port number
	    if (isNaN(parsed.port)) {
	      parsed.port = matches[5];
	    }

	    const parseError = getParseError(parsed, matches);
	    if (parseError !== undefined) {
	      parsed.error = parsed.error || parseError;
	      malformedAuthorityOrPort = true;
	    }

	    if (parsed.host) {
	      const ipv4result = isIPv4(parsed.host);
	      if (ipv4result === false) {
	        const ipv6result = normalizeIPv6(parsed.host);
	        parsed.host = ipv6result.host.toLowerCase();
	        isIP = ipv6result.isIPV6;
	      } else {
	        isIP = true;
	      }
	    }
	    if (parsed.scheme === undefined && parsed.userinfo === undefined && parsed.host === undefined && parsed.port === undefined && parsed.query === undefined && !parsed.path) {
	      parsed.reference = 'same-document';
	    } else if (parsed.scheme === undefined) {
	      parsed.reference = 'relative';
	    } else if (parsed.fragment === undefined) {
	      parsed.reference = 'absolute';
	    } else {
	      parsed.reference = 'uri';
	    }

	    // check for reference errors
	    if (options.reference && options.reference !== 'suffix' && options.reference !== parsed.reference) {
	      parsed.error = parsed.error || 'URI is not a ' + options.reference + ' reference.';
	    }

	    // find scheme handler
	    const schemeHandler = getSchemeHandler(options.scheme || parsed.scheme);

	    // check if scheme can't handle IRIs
	    if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
	      // if host component is a domain name
	      if (parsed.host && (options.domainHost || (schemeHandler && schemeHandler.domainHost)) && isIP === false && nonSimpleDomain(parsed.host)) {
	        // convert Unicode IDN -> ASCII IDN
	        try {
	          parsed.host = URL.domainToASCII(parsed.host.toLowerCase());
	        } catch (e) {
	          parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e;
	        }
	      }
	      // convert IRI -> URI
	    }

	    if (!schemeHandler || (schemeHandler && !schemeHandler.skipNormalize)) {
	      if (uri.indexOf('%') !== -1) {
	        if (parsed.scheme !== undefined) {
	          parsed.scheme = unescape(parsed.scheme);
	        }
	        if (parsed.host !== undefined) {
	          parsed.host = reescapeHostDelimiters(unescape(parsed.host), isIP);
	        }
	      }
	      if (parsed.path) {
	        parsed.path = normalizePathEncoding(parsed.path);
	      }
	      if (parsed.fragment) {
	        try {
	          parsed.fragment = encodeURI(decodeURIComponent(parsed.fragment));
	        } catch {
	          parsed.error = parsed.error || 'URI malformed';
	        }
	      }
	    }

	    // perform scheme specific parsing
	    if (schemeHandler && schemeHandler.parse) {
	      schemeHandler.parse(parsed, options);
	    }
	  } else {
	    parsed.error = parsed.error || 'URI can not be parsed.';
	  }
	  return { parsed, malformedAuthorityOrPort }
	}

	/**
	 * @param {string} uri
	 * @param {import('./types/index').Options} [opts]
	 * @returns
	 */
	function parse (uri, opts) {
	  return parseWithStatus(uri, opts).parsed
	}

	/**
	 * @param {string} uri
	 * @param {import('./types/index').Options} [opts]
	 * @returns {string}
	 */
	function normalizeString (uri, opts) {
	  return normalizeStringWithStatus(uri, opts).normalized
	}

	/**
	 * @param {string} uri
	 * @param {import('./types/index').Options} [opts]
	 * @returns {{ normalized: string, malformedAuthorityOrPort: boolean }}
	 */
	function normalizeStringWithStatus (uri, opts) {
	  const { parsed, malformedAuthorityOrPort } = parseWithStatus(uri, opts);
	  return {
	    normalized: malformedAuthorityOrPort ? uri : serialize(parsed, opts),
	    malformedAuthorityOrPort
	  }
	}

	/**
	 * @param {import ('./types/index').URIComponent|string} uri
	 * @param {import('./types/index').Options} [opts]
	 * @returns {string|undefined}
	 */
	function normalizeComparableURI (uri, opts) {
	  if (typeof uri === 'string') {
	    const { normalized, malformedAuthorityOrPort } = normalizeStringWithStatus(uri, opts);
	    return malformedAuthorityOrPort ? undefined : normalized
	  }

	  if (typeof uri === 'object') {
	    return serialize(uri, opts)
	  }
	}

	const fastUri$1 = {
	  SCHEMES,
	  normalize,
	  resolve,
	  resolveComponent,
	  equal,
	  serialize,
	  parse
	};

	fastUri.exports = fastUri$1;
	fastUri.exports.default = fastUri$1;
	fastUri.exports.fastUri = fastUri$1;
	return fastUri.exports;
}

exports.requireFastUri = requireFastUri;
