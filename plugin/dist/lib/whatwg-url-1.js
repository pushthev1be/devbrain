'use strict';

const webidlConversions1 = require('./webidl-conversions-1.js');
const tr461 = require('./tr46-1.js');

var whatwgUrl = {};

var webidl2jsWrapper = {};

var URL = {};

var utils = {exports: {}};

var hasRequiredUtils;

function requireUtils () {
	if (hasRequiredUtils) return utils.exports;
	hasRequiredUtils = 1;
	(function (module, exports) {

		// Returns "Type(value) is Object" in ES terminology.
		function isObject(value) {
		  return (typeof value === "object" && value !== null) || typeof value === "function";
		}

		const hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

		// Like `Object.assign`, but using `[[GetOwnProperty]]` and `[[DefineOwnProperty]]`
		// instead of `[[Get]]` and `[[Set]]` and only allowing objects
		function define(target, source) {
		  for (const key of Reflect.ownKeys(source)) {
		    const descriptor = Reflect.getOwnPropertyDescriptor(source, key);
		    if (descriptor && !Reflect.defineProperty(target, key, descriptor)) {
		      throw new TypeError(`Cannot redefine property: ${String(key)}`);
		    }
		  }
		}

		function newObjectInRealm(globalObject, object) {
		  const ctorRegistry = initCtorRegistry(globalObject);
		  return Object.defineProperties(
		    Object.create(ctorRegistry["%Object.prototype%"]),
		    Object.getOwnPropertyDescriptors(object)
		  );
		}

		const wrapperSymbol = Symbol("wrapper");
		const implSymbol = Symbol("impl");
		const sameObjectCaches = Symbol("SameObject caches");
		const ctorRegistrySymbol = Symbol.for("[webidl2js] constructor registry");

		const AsyncIteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(async function* () {}).prototype);

		function initCtorRegistry(globalObject) {
		  if (hasOwn(globalObject, ctorRegistrySymbol)) {
		    return globalObject[ctorRegistrySymbol];
		  }

		  const ctorRegistry = Object.create(null);

		  // In addition to registering all the WebIDL2JS-generated types in the constructor registry,
		  // we also register a few intrinsics that we make use of in generated code, since they are not
		  // easy to grab from the globalObject variable.
		  ctorRegistry["%Object.prototype%"] = globalObject.Object.prototype;
		  ctorRegistry["%IteratorPrototype%"] = Object.getPrototypeOf(
		    Object.getPrototypeOf(new globalObject.Array()[Symbol.iterator]())
		  );

		  try {
		    ctorRegistry["%AsyncIteratorPrototype%"] = Object.getPrototypeOf(
		      Object.getPrototypeOf(
		        globalObject.eval("(async function* () {})").prototype
		      )
		    );
		  } catch {
		    ctorRegistry["%AsyncIteratorPrototype%"] = AsyncIteratorPrototype;
		  }

		  globalObject[ctorRegistrySymbol] = ctorRegistry;
		  return ctorRegistry;
		}

		function getSameObject(wrapper, prop, creator) {
		  if (!wrapper[sameObjectCaches]) {
		    wrapper[sameObjectCaches] = Object.create(null);
		  }

		  if (prop in wrapper[sameObjectCaches]) {
		    return wrapper[sameObjectCaches][prop];
		  }

		  wrapper[sameObjectCaches][prop] = creator();
		  return wrapper[sameObjectCaches][prop];
		}

		function wrapperForImpl(impl) {
		  return impl ? impl[wrapperSymbol] : null;
		}

		function implForWrapper(wrapper) {
		  return wrapper ? wrapper[implSymbol] : null;
		}

		function tryWrapperForImpl(impl) {
		  const wrapper = wrapperForImpl(impl);
		  return wrapper ? wrapper : impl;
		}

		function tryImplForWrapper(wrapper) {
		  const impl = implForWrapper(wrapper);
		  return impl ? impl : wrapper;
		}

		const iterInternalSymbol = Symbol("internal");

		function isArrayIndexPropName(P) {
		  if (typeof P !== "string") {
		    return false;
		  }
		  const i = P >>> 0;
		  if (i === 2 ** 32 - 1) {
		    return false;
		  }
		  const s = `${i}`;
		  if (P !== s) {
		    return false;
		  }
		  return true;
		}

		const byteLengthGetter =
		    Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength").get;
		function isArrayBuffer(value) {
		  try {
		    byteLengthGetter.call(value);
		    return true;
		  } catch (e) {
		    return false;
		  }
		}

		function iteratorResult([key, value], kind) {
		  let result;
		  switch (kind) {
		    case "key":
		      result = key;
		      break;
		    case "value":
		      result = value;
		      break;
		    case "key+value":
		      result = [key, value];
		      break;
		  }
		  return { value: result, done: false };
		}

		const supportsPropertyIndex = Symbol("supports property index");
		const supportedPropertyIndices = Symbol("supported property indices");
		const supportsPropertyName = Symbol("supports property name");
		const supportedPropertyNames = Symbol("supported property names");
		const indexedGet = Symbol("indexed property get");
		const indexedSetNew = Symbol("indexed property set new");
		const indexedSetExisting = Symbol("indexed property set existing");
		const namedGet = Symbol("named property get");
		const namedSetNew = Symbol("named property set new");
		const namedSetExisting = Symbol("named property set existing");
		const namedDelete = Symbol("named property delete");

		const asyncIteratorNext = Symbol("async iterator get the next iteration result");
		const asyncIteratorReturn = Symbol("async iterator return steps");
		const asyncIteratorInit = Symbol("async iterator initialization steps");
		const asyncIteratorEOI = Symbol("async iterator end of iteration");

		module.exports = {
		  isObject,
		  hasOwn,
		  define,
		  newObjectInRealm,
		  wrapperSymbol,
		  implSymbol,
		  getSameObject,
		  ctorRegistrySymbol,
		  initCtorRegistry,
		  wrapperForImpl,
		  implForWrapper,
		  tryWrapperForImpl,
		  tryImplForWrapper,
		  iterInternalSymbol,
		  isArrayBuffer,
		  isArrayIndexPropName,
		  supportsPropertyIndex,
		  supportedPropertyIndices,
		  supportsPropertyName,
		  supportedPropertyNames,
		  indexedGet,
		  indexedSetNew,
		  indexedSetExisting,
		  namedGet,
		  namedSetNew,
		  namedSetExisting,
		  namedDelete,
		  asyncIteratorNext,
		  asyncIteratorReturn,
		  asyncIteratorInit,
		  asyncIteratorEOI,
		  iteratorResult
		}; 
	} (utils));
	return utils.exports;
}

var URLImpl = {};

var urlStateMachine = {exports: {}};

var infra;
var hasRequiredInfra;

function requireInfra () {
	if (hasRequiredInfra) return infra;
	hasRequiredInfra = 1;

	// Note that we take code points as JS numbers, not JS strings.

	function isASCIIDigit(c) {
	  return c >= 0x30 && c <= 0x39;
	}

	function isASCIIAlpha(c) {
	  return (c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A);
	}

	function isASCIIAlphanumeric(c) {
	  return isASCIIAlpha(c) || isASCIIDigit(c);
	}

	function isASCIIHex(c) {
	  return isASCIIDigit(c) || (c >= 0x41 && c <= 0x46) || (c >= 0x61 && c <= 0x66);
	}

	infra = {
	  isASCIIDigit,
	  isASCIIAlpha,
	  isASCIIAlphanumeric,
	  isASCIIHex
	};
	return infra;
}

var encoding;
var hasRequiredEncoding;

function requireEncoding () {
	if (hasRequiredEncoding) return encoding;
	hasRequiredEncoding = 1;
	const utf8Encoder = new TextEncoder();
	const utf8Decoder = new TextDecoder("utf-8", { ignoreBOM: true });

	function utf8Encode(string) {
	  return utf8Encoder.encode(string);
	}

	function utf8DecodeWithoutBOM(bytes) {
	  return utf8Decoder.decode(bytes);
	}

	encoding = {
	  utf8Encode,
	  utf8DecodeWithoutBOM
	};
	return encoding;
}

var percentEncoding;
var hasRequiredPercentEncoding;

function requirePercentEncoding () {
	if (hasRequiredPercentEncoding) return percentEncoding;
	hasRequiredPercentEncoding = 1;
	const { isASCIIHex } = requireInfra();
	const { utf8Encode } = requireEncoding();

	function p(char) {
	  return char.codePointAt(0);
	}

	// https://url.spec.whatwg.org/#percent-encode
	function percentEncode(c) {
	  let hex = c.toString(16).toUpperCase();
	  if (hex.length === 1) {
	    hex = `0${hex}`;
	  }

	  return `%${hex}`;
	}

	// https://url.spec.whatwg.org/#percent-decode
	function percentDecodeBytes(input) {
	  const output = new Uint8Array(input.byteLength);
	  let outputIndex = 0;
	  for (let i = 0; i < input.byteLength; ++i) {
	    const byte = input[i];
	    if (byte !== 0x25) {
	      output[outputIndex++] = byte;
	    } else if (byte === 0x25 && (!isASCIIHex(input[i + 1]) || !isASCIIHex(input[i + 2]))) {
	      output[outputIndex++] = byte;
	    } else {
	      const bytePoint = parseInt(String.fromCodePoint(input[i + 1], input[i + 2]), 16);
	      output[outputIndex++] = bytePoint;
	      i += 2;
	    }
	  }

	  return output.slice(0, outputIndex);
	}

	// https://url.spec.whatwg.org/#string-percent-decode
	function percentDecodeString(input) {
	  const bytes = utf8Encode(input);
	  return percentDecodeBytes(bytes);
	}

	// https://url.spec.whatwg.org/#c0-control-percent-encode-set
	function isC0ControlPercentEncode(c) {
	  return c <= 0x1F || c > 0x7E;
	}

	// https://url.spec.whatwg.org/#fragment-percent-encode-set
	const extraFragmentPercentEncodeSet = new Set([p(" "), p("\""), p("<"), p(">"), p("`")]);
	function isFragmentPercentEncode(c) {
	  return isC0ControlPercentEncode(c) || extraFragmentPercentEncodeSet.has(c);
	}

	// https://url.spec.whatwg.org/#query-percent-encode-set
	const extraQueryPercentEncodeSet = new Set([p(" "), p("\""), p("#"), p("<"), p(">")]);
	function isQueryPercentEncode(c) {
	  return isC0ControlPercentEncode(c) || extraQueryPercentEncodeSet.has(c);
	}

	// https://url.spec.whatwg.org/#special-query-percent-encode-set
	function isSpecialQueryPercentEncode(c) {
	  return isQueryPercentEncode(c) || c === p("'");
	}

	// https://url.spec.whatwg.org/#path-percent-encode-set
	const extraPathPercentEncodeSet = new Set([p("?"), p("`"), p("{"), p("}"), p("^")]);
	function isPathPercentEncode(c) {
	  return isQueryPercentEncode(c) || extraPathPercentEncodeSet.has(c);
	}

	// https://url.spec.whatwg.org/#userinfo-percent-encode-set
	const extraUserinfoPercentEncodeSet =
	  new Set([p("/"), p(":"), p(";"), p("="), p("@"), p("["), p("\\"), p("]"), p("|")]);
	function isUserinfoPercentEncode(c) {
	  return isPathPercentEncode(c) || extraUserinfoPercentEncodeSet.has(c);
	}

	// https://url.spec.whatwg.org/#component-percent-encode-set
	const extraComponentPercentEncodeSet = new Set([p("$"), p("%"), p("&"), p("+"), p(",")]);
	function isComponentPercentEncode(c) {
	  return isUserinfoPercentEncode(c) || extraComponentPercentEncodeSet.has(c);
	}

	// https://url.spec.whatwg.org/#application-x-www-form-urlencoded-percent-encode-set
	const extraURLEncodedPercentEncodeSet = new Set([p("!"), p("'"), p("("), p(")"), p("~")]);
	function isURLEncodedPercentEncode(c) {
	  return isComponentPercentEncode(c) || extraURLEncodedPercentEncodeSet.has(c);
	}

	// https://url.spec.whatwg.org/#code-point-percent-encode-after-encoding
	// https://url.spec.whatwg.org/#utf-8-percent-encode
	// Assuming encoding is always utf-8 allows us to trim one of the logic branches. TODO: support encoding.
	// The "-Internal" variant here has code points as JS strings. The external version used by other files has code points
	// as JS numbers, like the rest of the codebase.
	function utf8PercentEncodeCodePointInternal(codePoint, percentEncodePredicate) {
	  const bytes = utf8Encode(codePoint);
	  let output = "";
	  for (const byte of bytes) {
	    // Our percentEncodePredicate operates on bytes, not code points, so this is slightly different from the spec.
	    if (!percentEncodePredicate(byte)) {
	      output += String.fromCharCode(byte);
	    } else {
	      output += percentEncode(byte);
	    }
	  }

	  return output;
	}

	function utf8PercentEncodeCodePoint(codePoint, percentEncodePredicate) {
	  return utf8PercentEncodeCodePointInternal(String.fromCodePoint(codePoint), percentEncodePredicate);
	}

	// https://url.spec.whatwg.org/#string-percent-encode-after-encoding
	// https://url.spec.whatwg.org/#string-utf-8-percent-encode
	function utf8PercentEncodeString(input, percentEncodePredicate, spaceAsPlus = false) {
	  let output = "";
	  for (const codePoint of input) {
	    if (spaceAsPlus && codePoint === " ") {
	      output += "+";
	    } else {
	      output += utf8PercentEncodeCodePointInternal(codePoint, percentEncodePredicate);
	    }
	  }
	  return output;
	}

	percentEncoding = {
	  isC0ControlPercentEncode,
	  isFragmentPercentEncode,
	  isQueryPercentEncode,
	  isSpecialQueryPercentEncode,
	  isPathPercentEncode,
	  isUserinfoPercentEncode,
	  isURLEncodedPercentEncode,
	  percentDecodeString,
	  percentDecodeBytes,
	  utf8PercentEncodeString,
	  utf8PercentEncodeCodePoint
	};
	return percentEncoding;
}

var hasRequiredUrlStateMachine;

function requireUrlStateMachine () {
	if (hasRequiredUrlStateMachine) return urlStateMachine.exports;
	hasRequiredUrlStateMachine = 1;
	(function (module) {
		const tr46 = tr461.requireTr46();

		const infra = requireInfra();
		const { utf8DecodeWithoutBOM } = requireEncoding();
		const { percentDecodeString, utf8PercentEncodeCodePoint, utf8PercentEncodeString, isC0ControlPercentEncode,
		  isFragmentPercentEncode, isQueryPercentEncode, isSpecialQueryPercentEncode, isPathPercentEncode,
		  isUserinfoPercentEncode } = requirePercentEncoding();

		function p(char) {
		  return char.codePointAt(0);
		}

		const specialSchemes = {
		  ftp: 21,
		  file: null,
		  http: 80,
		  https: 443,
		  ws: 80,
		  wss: 443
		};

		const failure = Symbol("failure");

		function countSymbols(str) {
		  return [...str].length;
		}

		function at(input, idx) {
		  const c = input[idx];
		  return isNaN(c) ? undefined : String.fromCodePoint(c);
		}

		function isSingleDot(buffer) {
		  return buffer === "." || buffer.toLowerCase() === "%2e";
		}

		function isDoubleDot(buffer) {
		  buffer = buffer.toLowerCase();
		  return buffer === ".." || buffer === "%2e." || buffer === ".%2e" || buffer === "%2e%2e";
		}

		function isWindowsDriveLetterCodePoints(cp1, cp2) {
		  return infra.isASCIIAlpha(cp1) && (cp2 === p(":") || cp2 === p("|"));
		}

		function isWindowsDriveLetterString(string) {
		  return string.length === 2 && infra.isASCIIAlpha(string.codePointAt(0)) && (string[1] === ":" || string[1] === "|");
		}

		function isNormalizedWindowsDriveLetterString(string) {
		  return string.length === 2 && infra.isASCIIAlpha(string.codePointAt(0)) && string[1] === ":";
		}

		function containsForbiddenHostCodePoint(string) {
		  return string.search(/\u0000|\u0009|\u000A|\u000D|\u0020|#|\/|:|<|>|\?|@|\[|\\|\]|\^|\|/u) !== -1;
		}

		function containsForbiddenDomainCodePoint(string) {
		  return containsForbiddenHostCodePoint(string) || string.search(/[\u0000-\u001F]|%|\u007F/u) !== -1;
		}

		function isSpecialScheme(scheme) {
		  return specialSchemes[scheme] !== undefined;
		}

		function isSpecial(url) {
		  return isSpecialScheme(url.scheme);
		}

		function isNotSpecial(url) {
		  return !isSpecialScheme(url.scheme);
		}

		function defaultPort(scheme) {
		  return specialSchemes[scheme];
		}

		function parseIPv4Number(input) {
		  if (input === "") {
		    return failure;
		  }

		  let R = 10;

		  if (input.length >= 2 && input.charAt(0) === "0" && input.charAt(1).toLowerCase() === "x") {
		    input = input.substring(2);
		    R = 16;
		  } else if (input.length >= 2 && input.charAt(0) === "0") {
		    input = input.substring(1);
		    R = 8;
		  }

		  if (input === "") {
		    return 0;
		  }

		  let regex = /[^0-7]/u;
		  if (R === 10) {
		    regex = /[^0-9]/u;
		  }
		  if (R === 16) {
		    regex = /[^0-9A-Fa-f]/u;
		  }

		  if (regex.test(input)) {
		    return failure;
		  }

		  return parseInt(input, R);
		}

		function parseIPv4(input) {
		  const parts = input.split(".");
		  if (parts[parts.length - 1] === "") {
		    if (parts.length > 1) {
		      parts.pop();
		    }
		  }

		  if (parts.length > 4) {
		    return failure;
		  }

		  const numbers = [];
		  for (const part of parts) {
		    const n = parseIPv4Number(part);
		    if (n === failure) {
		      return failure;
		    }

		    numbers.push(n);
		  }

		  for (let i = 0; i < numbers.length - 1; ++i) {
		    if (numbers[i] > 255) {
		      return failure;
		    }
		  }
		  if (numbers[numbers.length - 1] >= 256 ** (5 - numbers.length)) {
		    return failure;
		  }

		  let ipv4 = numbers.pop();
		  let counter = 0;

		  for (const n of numbers) {
		    ipv4 += n * 256 ** (3 - counter);
		    ++counter;
		  }

		  return ipv4;
		}

		function serializeIPv4(address) {
		  let output = "";
		  let n = address;

		  for (let i = 1; i <= 4; ++i) {
		    output = String(n % 256) + output;
		    if (i !== 4) {
		      output = `.${output}`;
		    }
		    n = Math.floor(n / 256);
		  }

		  return output;
		}

		function parseIPv6(input) {
		  const address = [0, 0, 0, 0, 0, 0, 0, 0];
		  let pieceIndex = 0;
		  let compress = null;
		  let pointer = 0;

		  input = Array.from(input, c => c.codePointAt(0));

		  if (input[pointer] === p(":")) {
		    if (input[pointer + 1] !== p(":")) {
		      return failure;
		    }

		    pointer += 2;
		    ++pieceIndex;
		    compress = pieceIndex;
		  }

		  while (pointer < input.length) {
		    if (pieceIndex === 8) {
		      return failure;
		    }

		    if (input[pointer] === p(":")) {
		      if (compress !== null) {
		        return failure;
		      }
		      ++pointer;
		      ++pieceIndex;
		      compress = pieceIndex;
		      continue;
		    }

		    let value = 0;
		    let length = 0;

		    while (length < 4 && infra.isASCIIHex(input[pointer])) {
		      value = value * 0x10 + parseInt(at(input, pointer), 16);
		      ++pointer;
		      ++length;
		    }

		    if (input[pointer] === p(".")) {
		      if (length === 0) {
		        return failure;
		      }

		      pointer -= length;

		      if (pieceIndex > 6) {
		        return failure;
		      }

		      let numbersSeen = 0;

		      while (input[pointer] !== undefined) {
		        let ipv4Piece = null;

		        if (numbersSeen > 0) {
		          if (input[pointer] === p(".") && numbersSeen < 4) {
		            ++pointer;
		          } else {
		            return failure;
		          }
		        }

		        if (!infra.isASCIIDigit(input[pointer])) {
		          return failure;
		        }

		        while (infra.isASCIIDigit(input[pointer])) {
		          const number = parseInt(at(input, pointer));
		          if (ipv4Piece === null) {
		            ipv4Piece = number;
		          } else if (ipv4Piece === 0) {
		            return failure;
		          } else {
		            ipv4Piece = ipv4Piece * 10 + number;
		          }
		          if (ipv4Piece > 255) {
		            return failure;
		          }
		          ++pointer;
		        }

		        address[pieceIndex] = address[pieceIndex] * 0x100 + ipv4Piece;

		        ++numbersSeen;

		        if (numbersSeen === 2 || numbersSeen === 4) {
		          ++pieceIndex;
		        }
		      }

		      if (numbersSeen !== 4) {
		        return failure;
		      }

		      break;
		    } else if (input[pointer] === p(":")) {
		      ++pointer;
		      if (input[pointer] === undefined) {
		        return failure;
		      }
		    } else if (input[pointer] !== undefined) {
		      return failure;
		    }

		    address[pieceIndex] = value;
		    ++pieceIndex;
		  }

		  if (compress !== null) {
		    let swaps = pieceIndex - compress;
		    pieceIndex = 7;
		    while (pieceIndex !== 0 && swaps > 0) {
		      const temp = address[compress + swaps - 1];
		      address[compress + swaps - 1] = address[pieceIndex];
		      address[pieceIndex] = temp;
		      --pieceIndex;
		      --swaps;
		    }
		  } else if (compress === null && pieceIndex !== 8) {
		    return failure;
		  }

		  return address;
		}

		function serializeIPv6(address) {
		  let output = "";
		  const compress = findTheIPv6AddressCompressedPieceIndex(address);
		  let ignore0 = false;

		  for (let pieceIndex = 0; pieceIndex <= 7; ++pieceIndex) {
		    if (ignore0 && address[pieceIndex] === 0) {
		      continue;
		    } else if (ignore0) {
		      ignore0 = false;
		    }

		    if (compress === pieceIndex) {
		      const separator = pieceIndex === 0 ? "::" : ":";
		      output += separator;
		      ignore0 = true;
		      continue;
		    }

		    output += address[pieceIndex].toString(16);

		    if (pieceIndex !== 7) {
		      output += ":";
		    }
		  }

		  return output;
		}

		function parseHost(input, isOpaque = false) {
		  if (input[0] === "[") {
		    if (input[input.length - 1] !== "]") {
		      return failure;
		    }

		    return parseIPv6(input.substring(1, input.length - 1));
		  }

		  if (isOpaque) {
		    return parseOpaqueHost(input);
		  }

		  const domain = utf8DecodeWithoutBOM(percentDecodeString(input));
		  const asciiDomain = domainToASCII(domain);
		  if (asciiDomain === failure) {
		    return failure;
		  }

		  if (endsInANumber(asciiDomain)) {
		    return parseIPv4(asciiDomain);
		  }

		  return asciiDomain;
		}

		function endsInANumber(input) {
		  const parts = input.split(".");
		  if (parts[parts.length - 1] === "") {
		    if (parts.length === 1) {
		      return false;
		    }
		    parts.pop();
		  }

		  const last = parts[parts.length - 1];
		  if (parseIPv4Number(last) !== failure) {
		    return true;
		  }

		  if (/^[0-9]+$/u.test(last)) {
		    return true;
		  }

		  return false;
		}

		function parseOpaqueHost(input) {
		  if (containsForbiddenHostCodePoint(input)) {
		    return failure;
		  }

		  return utf8PercentEncodeString(input, isC0ControlPercentEncode);
		}

		function findTheIPv6AddressCompressedPieceIndex(address) {
		  let longestIndex = null;
		  let longestSize = 1; // only find elements > 1
		  let foundIndex = null;
		  let foundSize = 0;

		  for (let pieceIndex = 0; pieceIndex < address.length; ++pieceIndex) {
		    if (address[pieceIndex] !== 0) {
		      if (foundSize > longestSize) {
		        longestIndex = foundIndex;
		        longestSize = foundSize;
		      }

		      foundIndex = null;
		      foundSize = 0;
		    } else {
		      if (foundIndex === null) {
		        foundIndex = pieceIndex;
		      }
		      ++foundSize;
		    }
		  }

		  if (foundSize > longestSize) {
		    return foundIndex;
		  }

		  return longestIndex;
		}

		function serializeHost(host) {
		  if (typeof host === "number") {
		    return serializeIPv4(host);
		  }

		  // IPv6 serializer
		  if (host instanceof Array) {
		    return `[${serializeIPv6(host)}]`;
		  }

		  return host;
		}

		function domainToASCII(domain, beStrict = false) {
		  const result = tr46.toASCII(domain, {
		    checkHyphens: beStrict,
		    checkBidi: true,
		    checkJoiners: true,
		    useSTD3ASCIIRules: beStrict,
		    transitionalProcessing: false,
		    verifyDNSLength: beStrict,
		    ignoreInvalidPunycode: false
		  });
		  if (result === null) {
		    return failure;
		  }

		  if (!beStrict) {
		    if (result === "") {
		      return failure;
		    }
		    if (containsForbiddenDomainCodePoint(result)) {
		      return failure;
		    }
		  }
		  return result;
		}

		function trimControlChars(string) {
		  // Avoid using regexp because of this V8 bug: https://issues.chromium.org/issues/42204424

		  let start = 0;
		  let end = string.length;
		  for (; start < end; ++start) {
		    if (string.charCodeAt(start) > 0x20) {
		      break;
		    }
		  }
		  for (; end > start; --end) {
		    if (string.charCodeAt(end - 1) > 0x20) {
		      break;
		    }
		  }
		  return string.substring(start, end);
		}

		function trimTabAndNewline(url) {
		  return url.replace(/\u0009|\u000A|\u000D/ug, "");
		}

		function shortenPath(url) {
		  const { path } = url;
		  if (path.length === 0) {
		    return;
		  }
		  if (url.scheme === "file" && path.length === 1 && isNormalizedWindowsDriveLetter(path[0])) {
		    return;
		  }

		  path.pop();
		}

		function includesCredentials(url) {
		  return url.username !== "" || url.password !== "";
		}

		function cannotHaveAUsernamePasswordPort(url) {
		  return url.host === null || url.host === "" || url.scheme === "file";
		}

		function hasAnOpaquePath(url) {
		  return typeof url.path === "string";
		}

		function isNormalizedWindowsDriveLetter(string) {
		  return /^[A-Za-z]:$/u.test(string);
		}

		function URLStateMachine(input, base, encodingOverride, url, stateOverride) {
		  this.pointer = 0;
		  this.input = input;
		  this.base = base || null;
		  this.encodingOverride = encodingOverride || "utf-8";
		  this.stateOverride = stateOverride;
		  this.url = url;
		  this.failure = false;
		  this.parseError = false;

		  if (!this.url) {
		    this.url = {
		      scheme: "",
		      username: "",
		      password: "",
		      host: null,
		      port: null,
		      path: [],
		      query: null,
		      fragment: null
		    };

		    const res = trimControlChars(this.input);
		    if (res !== this.input) {
		      this.parseError = true;
		    }
		    this.input = res;
		  }

		  const res = trimTabAndNewline(this.input);
		  if (res !== this.input) {
		    this.parseError = true;
		  }
		  this.input = res;

		  this.state = stateOverride || "scheme start";

		  this.buffer = "";
		  this.atFlag = false;
		  this.arrFlag = false;
		  this.passwordTokenSeenFlag = false;

		  this.input = Array.from(this.input, c => c.codePointAt(0));

		  for (; this.pointer <= this.input.length; ++this.pointer) {
		    const c = this.input[this.pointer];
		    const cStr = isNaN(c) ? undefined : String.fromCodePoint(c);

		    // exec state machine
		    const ret = this[`parse ${this.state}`](c, cStr);
		    if (!ret) {
		      break; // terminate algorithm
		    } else if (ret === failure) {
		      this.failure = true;
		      break;
		    }
		  }
		}

		URLStateMachine.prototype["parse scheme start"] = function parseSchemeStart(c, cStr) {
		  if (infra.isASCIIAlpha(c)) {
		    this.buffer += cStr.toLowerCase();
		    this.state = "scheme";
		  } else if (!this.stateOverride) {
		    this.state = "no scheme";
		    --this.pointer;
		  } else {
		    this.parseError = true;
		    return failure;
		  }

		  return true;
		};

		URLStateMachine.prototype["parse scheme"] = function parseScheme(c, cStr) {
		  if (infra.isASCIIAlphanumeric(c) || c === p("+") || c === p("-") || c === p(".")) {
		    this.buffer += cStr.toLowerCase();
		  } else if (c === p(":")) {
		    if (this.stateOverride) {
		      if (isSpecial(this.url) && !isSpecialScheme(this.buffer)) {
		        return false;
		      }

		      if (!isSpecial(this.url) && isSpecialScheme(this.buffer)) {
		        return false;
		      }

		      if ((includesCredentials(this.url) || this.url.port !== null) && this.buffer === "file") {
		        return false;
		      }

		      if (this.url.scheme === "file" && this.url.host === "") {
		        return false;
		      }
		    }
		    this.url.scheme = this.buffer;
		    if (this.stateOverride) {
		      if (this.url.port === defaultPort(this.url.scheme)) {
		        this.url.port = null;
		      }
		      return false;
		    }
		    this.buffer = "";
		    if (this.url.scheme === "file") {
		      if (this.input[this.pointer + 1] !== p("/") || this.input[this.pointer + 2] !== p("/")) {
		        this.parseError = true;
		      }
		      this.state = "file";
		    } else if (isSpecial(this.url) && this.base !== null && this.base.scheme === this.url.scheme) {
		      this.state = "special relative or authority";
		    } else if (isSpecial(this.url)) {
		      this.state = "special authority slashes";
		    } else if (this.input[this.pointer + 1] === p("/")) {
		      this.state = "path or authority";
		      ++this.pointer;
		    } else {
		      this.url.path = "";
		      this.state = "opaque path";
		    }
		  } else if (!this.stateOverride) {
		    this.buffer = "";
		    this.state = "no scheme";
		    this.pointer = -1;
		  } else {
		    this.parseError = true;
		    return failure;
		  }

		  return true;
		};

		URLStateMachine.prototype["parse no scheme"] = function parseNoScheme(c) {
		  if (this.base === null || (hasAnOpaquePath(this.base) && c !== p("#"))) {
		    return failure;
		  } else if (hasAnOpaquePath(this.base) && c === p("#")) {
		    this.url.scheme = this.base.scheme;
		    this.url.path = this.base.path;
		    this.url.query = this.base.query;
		    this.url.fragment = "";
		    this.state = "fragment";
		  } else if (this.base.scheme === "file") {
		    this.state = "file";
		    --this.pointer;
		  } else {
		    this.state = "relative";
		    --this.pointer;
		  }

		  return true;
		};

		URLStateMachine.prototype["parse special relative or authority"] = function parseSpecialRelativeOrAuthority(c) {
		  if (c === p("/") && this.input[this.pointer + 1] === p("/")) {
		    this.state = "special authority ignore slashes";
		    ++this.pointer;
		  } else {
		    this.parseError = true;
		    this.state = "relative";
		    --this.pointer;
		  }

		  return true;
		};

		URLStateMachine.prototype["parse path or authority"] = function parsePathOrAuthority(c) {
		  if (c === p("/")) {
		    this.state = "authority";
		  } else {
		    this.state = "path";
		    --this.pointer;
		  }

		  return true;
		};

		URLStateMachine.prototype["parse relative"] = function parseRelative(c) {
		  this.url.scheme = this.base.scheme;
		  if (c === p("/")) {
		    this.state = "relative slash";
		  } else if (isSpecial(this.url) && c === p("\\")) {
		    this.parseError = true;
		    this.state = "relative slash";
		  } else {
		    this.url.username = this.base.username;
		    this.url.password = this.base.password;
		    this.url.host = this.base.host;
		    this.url.port = this.base.port;
		    this.url.path = this.base.path.slice();
		    this.url.query = this.base.query;
		    if (c === p("?")) {
		      this.url.query = "";
		      this.state = "query";
		    } else if (c === p("#")) {
		      this.url.fragment = "";
		      this.state = "fragment";
		    } else if (!isNaN(c)) {
		      this.url.query = null;
		      this.url.path.pop();
		      this.state = "path";
		      --this.pointer;
		    }
		  }

		  return true;
		};

		URLStateMachine.prototype["parse relative slash"] = function parseRelativeSlash(c) {
		  if (isSpecial(this.url) && (c === p("/") || c === p("\\"))) {
		    if (c === p("\\")) {
		      this.parseError = true;
		    }
		    this.state = "special authority ignore slashes";
		  } else if (c === p("/")) {
		    this.state = "authority";
		  } else {
		    this.url.username = this.base.username;
		    this.url.password = this.base.password;
		    this.url.host = this.base.host;
		    this.url.port = this.base.port;
		    this.state = "path";
		    --this.pointer;
		  }

		  return true;
		};

		URLStateMachine.prototype["parse special authority slashes"] = function parseSpecialAuthoritySlashes(c) {
		  if (c === p("/") && this.input[this.pointer + 1] === p("/")) {
		    this.state = "special authority ignore slashes";
		    ++this.pointer;
		  } else {
		    this.parseError = true;
		    this.state = "special authority ignore slashes";
		    --this.pointer;
		  }

		  return true;
		};

		URLStateMachine.prototype["parse special authority ignore slashes"] = function parseSpecialAuthorityIgnoreSlashes(c) {
		  if (c !== p("/") && c !== p("\\")) {
		    this.state = "authority";
		    --this.pointer;
		  } else {
		    this.parseError = true;
		  }

		  return true;
		};

		URLStateMachine.prototype["parse authority"] = function parseAuthority(c, cStr) {
		  if (c === p("@")) {
		    this.parseError = true;
		    if (this.atFlag) {
		      this.buffer = `%40${this.buffer}`;
		    }
		    this.atFlag = true;

		    // careful, this is based on buffer and has its own pointer (this.pointer != pointer) and inner chars
		    const len = countSymbols(this.buffer);
		    for (let pointer = 0; pointer < len; ++pointer) {
		      const codePoint = this.buffer.codePointAt(pointer);

		      if (codePoint === p(":") && !this.passwordTokenSeenFlag) {
		        this.passwordTokenSeenFlag = true;
		        continue;
		      }
		      const encodedCodePoints = utf8PercentEncodeCodePoint(codePoint, isUserinfoPercentEncode);
		      if (this.passwordTokenSeenFlag) {
		        this.url.password += encodedCodePoints;
		      } else {
		        this.url.username += encodedCodePoints;
		      }
		    }
		    this.buffer = "";
		  } else if (isNaN(c) || c === p("/") || c === p("?") || c === p("#") ||
		             (isSpecial(this.url) && c === p("\\"))) {
		    if (this.atFlag && this.buffer === "") {
		      this.parseError = true;
		      return failure;
		    }
		    this.pointer -= countSymbols(this.buffer) + 1;
		    this.buffer = "";
		    this.state = "host";
		  } else {
		    this.buffer += cStr;
		  }

		  return true;
		};

		URLStateMachine.prototype["parse hostname"] =
		URLStateMachine.prototype["parse host"] = function parseHostName(c, cStr) {
		  if (this.stateOverride && this.url.scheme === "file") {
		    --this.pointer;
		    this.state = "file host";
		  } else if (c === p(":") && !this.arrFlag) {
		    if (this.buffer === "") {
		      this.parseError = true;
		      return failure;
		    }

		    if (this.stateOverride === "hostname") {
		      return false;
		    }

		    const host = parseHost(this.buffer, isNotSpecial(this.url));
		    if (host === failure) {
		      return failure;
		    }

		    this.url.host = host;
		    this.buffer = "";
		    this.state = "port";
		  } else if (isNaN(c) || c === p("/") || c === p("?") || c === p("#") ||
		             (isSpecial(this.url) && c === p("\\"))) {
		    --this.pointer;
		    if (isSpecial(this.url) && this.buffer === "") {
		      this.parseError = true;
		      return failure;
		    } else if (this.stateOverride && this.buffer === "" &&
		               (includesCredentials(this.url) || this.url.port !== null)) {
		      this.parseError = true;
		      return false;
		    }

		    const host = parseHost(this.buffer, isNotSpecial(this.url));
		    if (host === failure) {
		      return failure;
		    }

		    this.url.host = host;
		    this.buffer = "";
		    this.state = "path start";
		    if (this.stateOverride) {
		      return false;
		    }
		  } else {
		    if (c === p("[")) {
		      this.arrFlag = true;
		    } else if (c === p("]")) {
		      this.arrFlag = false;
		    }
		    this.buffer += cStr;
		  }

		  return true;
		};

		URLStateMachine.prototype["parse port"] = function parsePort(c, cStr) {
		  if (infra.isASCIIDigit(c)) {
		    this.buffer += cStr;
		  } else if (isNaN(c) || c === p("/") || c === p("?") || c === p("#") ||
		             (isSpecial(this.url) && c === p("\\")) ||
		             this.stateOverride) {
		    if (this.buffer !== "") {
		      const port = parseInt(this.buffer);
		      if (port > 2 ** 16 - 1) {
		        this.parseError = true;
		        return failure;
		      }
		      this.url.port = port === defaultPort(this.url.scheme) ? null : port;
		      this.buffer = "";
		    }
		    if (this.stateOverride) {
		      return false;
		    }
		    this.state = "path start";
		    --this.pointer;
		  } else {
		    this.parseError = true;
		    return failure;
		  }

		  return true;
		};

		const fileOtherwiseCodePoints = new Set([p("/"), p("\\"), p("?"), p("#")]);

		function startsWithWindowsDriveLetter(input, pointer) {
		  const length = input.length - pointer;
		  return length >= 2 &&
		    isWindowsDriveLetterCodePoints(input[pointer], input[pointer + 1]) &&
		    (length === 2 || fileOtherwiseCodePoints.has(input[pointer + 2]));
		}

		URLStateMachine.prototype["parse file"] = function parseFile(c) {
		  this.url.scheme = "file";
		  this.url.host = "";

		  if (c === p("/") || c === p("\\")) {
		    if (c === p("\\")) {
		      this.parseError = true;
		    }
		    this.state = "file slash";
		  } else if (this.base !== null && this.base.scheme === "file") {
		    this.url.host = this.base.host;
		    this.url.path = this.base.path.slice();
		    this.url.query = this.base.query;
		    if (c === p("?")) {
		      this.url.query = "";
		      this.state = "query";
		    } else if (c === p("#")) {
		      this.url.fragment = "";
		      this.state = "fragment";
		    } else if (!isNaN(c)) {
		      this.url.query = null;
		      if (!startsWithWindowsDriveLetter(this.input, this.pointer)) {
		        shortenPath(this.url);
		      } else {
		        this.parseError = true;
		        this.url.path = [];
		      }

		      this.state = "path";
		      --this.pointer;
		    }
		  } else {
		    this.state = "path";
		    --this.pointer;
		  }

		  return true;
		};

		URLStateMachine.prototype["parse file slash"] = function parseFileSlash(c) {
		  if (c === p("/") || c === p("\\")) {
		    if (c === p("\\")) {
		      this.parseError = true;
		    }
		    this.state = "file host";
		  } else {
		    if (this.base !== null && this.base.scheme === "file") {
		      if (!startsWithWindowsDriveLetter(this.input, this.pointer) &&
		          isNormalizedWindowsDriveLetterString(this.base.path[0])) {
		        this.url.path.push(this.base.path[0]);
		      }
		      this.url.host = this.base.host;
		    }
		    this.state = "path";
		    --this.pointer;
		  }

		  return true;
		};

		URLStateMachine.prototype["parse file host"] = function parseFileHost(c, cStr) {
		  if (isNaN(c) || c === p("/") || c === p("\\") || c === p("?") || c === p("#")) {
		    --this.pointer;
		    if (!this.stateOverride && isWindowsDriveLetterString(this.buffer)) {
		      this.parseError = true;
		      this.state = "path";
		    } else if (this.buffer === "") {
		      this.url.host = "";
		      if (this.stateOverride) {
		        return false;
		      }
		      this.state = "path start";
		    } else {
		      let host = parseHost(this.buffer, isNotSpecial(this.url));
		      if (host === failure) {
		        return failure;
		      }
		      if (host === "localhost") {
		        host = "";
		      }
		      this.url.host = host;

		      if (this.stateOverride) {
		        return false;
		      }

		      this.buffer = "";
		      this.state = "path start";
		    }
		  } else {
		    this.buffer += cStr;
		  }

		  return true;
		};

		URLStateMachine.prototype["parse path start"] = function parsePathStart(c) {
		  if (isSpecial(this.url)) {
		    if (c === p("\\")) {
		      this.parseError = true;
		    }
		    this.state = "path";

		    if (c !== p("/") && c !== p("\\")) {
		      --this.pointer;
		    }
		  } else if (!this.stateOverride && c === p("?")) {
		    this.url.query = "";
		    this.state = "query";
		  } else if (!this.stateOverride && c === p("#")) {
		    this.url.fragment = "";
		    this.state = "fragment";
		  } else if (c !== undefined) {
		    this.state = "path";
		    if (c !== p("/")) {
		      --this.pointer;
		    }
		  } else if (this.stateOverride && this.url.host === null) {
		    this.url.path.push("");
		  }

		  return true;
		};

		URLStateMachine.prototype["parse path"] = function parsePath(c) {
		  if (isNaN(c) || c === p("/") || (isSpecial(this.url) && c === p("\\")) ||
		      (!this.stateOverride && (c === p("?") || c === p("#")))) {
		    if (isSpecial(this.url) && c === p("\\")) {
		      this.parseError = true;
		    }

		    if (isDoubleDot(this.buffer)) {
		      shortenPath(this.url);
		      if (c !== p("/") && !(isSpecial(this.url) && c === p("\\"))) {
		        this.url.path.push("");
		      }
		    } else if (isSingleDot(this.buffer) && c !== p("/") &&
		               !(isSpecial(this.url) && c === p("\\"))) {
		      this.url.path.push("");
		    } else if (!isSingleDot(this.buffer)) {
		      if (this.url.scheme === "file" && this.url.path.length === 0 && isWindowsDriveLetterString(this.buffer)) {
		        this.buffer = `${this.buffer[0]}:`;
		      }
		      this.url.path.push(this.buffer);
		    }
		    this.buffer = "";
		    if (c === p("?")) {
		      this.url.query = "";
		      this.state = "query";
		    }
		    if (c === p("#")) {
		      this.url.fragment = "";
		      this.state = "fragment";
		    }
		  } else {
		    // TODO: If c is not a URL code point and not "%", parse error.

		    if (c === p("%") &&
		      (!infra.isASCIIHex(this.input[this.pointer + 1]) ||
		        !infra.isASCIIHex(this.input[this.pointer + 2]))) {
		      this.parseError = true;
		    }

		    this.buffer += utf8PercentEncodeCodePoint(c, isPathPercentEncode);
		  }

		  return true;
		};

		URLStateMachine.prototype["parse opaque path"] = function parseOpaquePath(c) {
		  if (c === p("?")) {
		    this.url.query = "";
		    this.state = "query";
		  } else if (c === p("#")) {
		    this.url.fragment = "";
		    this.state = "fragment";
		  } else if (c === p(" ")) {
		    const remaining = this.input[this.pointer + 1];
		    if (remaining === p("?") || remaining === p("#")) {
		      this.url.path += "%20";
		    } else {
		      this.url.path += " ";
		    }
		  } else {
		    // TODO: Add: not a URL code point
		    if (!isNaN(c) && c !== p("%")) {
		      this.parseError = true;
		    }

		    if (c === p("%") &&
		        (!infra.isASCIIHex(this.input[this.pointer + 1]) ||
		         !infra.isASCIIHex(this.input[this.pointer + 2]))) {
		      this.parseError = true;
		    }

		    if (!isNaN(c)) {
		      this.url.path += utf8PercentEncodeCodePoint(c, isC0ControlPercentEncode);
		    }
		  }

		  return true;
		};

		URLStateMachine.prototype["parse query"] = function parseQuery(c, cStr) {
		  if (!isSpecial(this.url) || this.url.scheme === "ws" || this.url.scheme === "wss") {
		    this.encodingOverride = "utf-8";
		  }

		  if ((!this.stateOverride && c === p("#")) || isNaN(c)) {
		    const queryPercentEncodePredicate = isSpecial(this.url) ? isSpecialQueryPercentEncode : isQueryPercentEncode;
		    this.url.query += utf8PercentEncodeString(this.buffer, queryPercentEncodePredicate);

		    this.buffer = "";

		    if (c === p("#")) {
		      this.url.fragment = "";
		      this.state = "fragment";
		    }
		  } else if (!isNaN(c)) {
		    // TODO: If c is not a URL code point and not "%", parse error.

		    if (c === p("%") &&
		      (!infra.isASCIIHex(this.input[this.pointer + 1]) ||
		        !infra.isASCIIHex(this.input[this.pointer + 2]))) {
		      this.parseError = true;
		    }

		    this.buffer += cStr;
		  }

		  return true;
		};

		URLStateMachine.prototype["parse fragment"] = function parseFragment(c) {
		  if (!isNaN(c)) {
		    // TODO: If c is not a URL code point and not "%", parse error.
		    if (c === p("%") &&
		      (!infra.isASCIIHex(this.input[this.pointer + 1]) ||
		        !infra.isASCIIHex(this.input[this.pointer + 2]))) {
		      this.parseError = true;
		    }

		    this.url.fragment += utf8PercentEncodeCodePoint(c, isFragmentPercentEncode);
		  }

		  return true;
		};

		function serializeURL(url, excludeFragment) {
		  let output = `${url.scheme}:`;
		  if (url.host !== null) {
		    output += "//";

		    if (url.username !== "" || url.password !== "") {
		      output += url.username;
		      if (url.password !== "") {
		        output += `:${url.password}`;
		      }
		      output += "@";
		    }

		    output += serializeHost(url.host);

		    if (url.port !== null) {
		      output += `:${url.port}`;
		    }
		  }

		  if (url.host === null && !hasAnOpaquePath(url) && url.path.length > 1 && url.path[0] === "") {
		    output += "/.";
		  }
		  output += serializePath(url);

		  if (url.query !== null) {
		    output += `?${url.query}`;
		  }

		  if (!excludeFragment && url.fragment !== null) {
		    output += `#${url.fragment}`;
		  }

		  return output;
		}

		function serializeOrigin(tuple) {
		  let result = `${tuple.scheme}://`;
		  result += serializeHost(tuple.host);

		  if (tuple.port !== null) {
		    result += `:${tuple.port}`;
		  }

		  return result;
		}

		function serializePath(url) {
		  if (hasAnOpaquePath(url)) {
		    return url.path;
		  }

		  let output = "";
		  for (const segment of url.path) {
		    output += `/${segment}`;
		  }
		  return output;
		}

		module.exports.serializeURL = serializeURL;

		module.exports.serializePath = serializePath;

		module.exports.serializeURLOrigin = function (url) {
		  // https://url.spec.whatwg.org/#concept-url-origin
		  switch (url.scheme) {
		    case "blob": {
		      const pathURL = module.exports.parseURL(serializePath(url));
		      if (pathURL === null) {
		        return "null";
		      }
		      if (pathURL.scheme !== "http" && pathURL.scheme !== "https") {
		        return "null";
		      }
		      return module.exports.serializeURLOrigin(pathURL);
		    }
		    case "ftp":
		    case "http":
		    case "https":
		    case "ws":
		    case "wss":
		      return serializeOrigin({
		        scheme: url.scheme,
		        host: url.host,
		        port: url.port
		      });
		    case "file":
		      // The spec says:
		      // > Unfortunate as it is, this is left as an exercise to the reader. When in doubt, return a new opaque origin.
		      // Browsers tested so far:
		      // - Chrome says "file://", but treats file: URLs as cross-origin for most (all?) purposes; see e.g.
		      //   https://bugs.chromium.org/p/chromium/issues/detail?id=37586
		      // - Firefox says "null", but treats file: URLs as same-origin sometimes based on directory stuff; see
		      //   https://developer.mozilla.org/en-US/docs/Archive/Misc_top_level/Same-origin_policy_for_file:_URIs
		      return "null";
		    default:
		      // serializing an opaque origin returns "null"
		      return "null";
		  }
		};

		module.exports.basicURLParse = function (input, options) {
		  if (options === undefined) {
		    options = {};
		  }

		  const usm = new URLStateMachine(input, options.baseURL, options.encodingOverride, options.url, options.stateOverride);
		  if (usm.failure) {
		    return null;
		  }

		  return usm.url;
		};

		module.exports.setTheUsername = function (url, username) {
		  url.username = utf8PercentEncodeString(username, isUserinfoPercentEncode);
		};

		module.exports.setThePassword = function (url, password) {
		  url.password = utf8PercentEncodeString(password, isUserinfoPercentEncode);
		};

		module.exports.serializeHost = serializeHost;

		module.exports.cannotHaveAUsernamePasswordPort = cannotHaveAUsernamePasswordPort;

		module.exports.hasAnOpaquePath = hasAnOpaquePath;

		module.exports.serializeInteger = function (integer) {
		  return String(integer);
		};

		module.exports.parseURL = function (input, options) {
		  if (options === undefined) {
		    options = {};
		  }

		  // We don't handle blobs, so this just delegates:
		  return module.exports.basicURLParse(input, { baseURL: options.baseURL, encodingOverride: options.encodingOverride });
		}; 
	} (urlStateMachine));
	return urlStateMachine.exports;
}

var urlencoded;
var hasRequiredUrlencoded;

function requireUrlencoded () {
	if (hasRequiredUrlencoded) return urlencoded;
	hasRequiredUrlencoded = 1;
	const { utf8Encode, utf8DecodeWithoutBOM } = requireEncoding();
	const { percentDecodeBytes, utf8PercentEncodeString, isURLEncodedPercentEncode } = requirePercentEncoding();

	function p(char) {
	  return char.codePointAt(0);
	}

	// https://url.spec.whatwg.org/#concept-urlencoded-parser
	function parseUrlencoded(input) {
	  const sequences = strictlySplitByteSequence(input, p("&"));
	  const output = [];
	  for (const bytes of sequences) {
	    if (bytes.length === 0) {
	      continue;
	    }

	    let name, value;
	    const indexOfEqual = bytes.indexOf(p("="));

	    if (indexOfEqual >= 0) {
	      name = bytes.slice(0, indexOfEqual);
	      value = bytes.slice(indexOfEqual + 1);
	    } else {
	      name = bytes;
	      value = new Uint8Array(0);
	    }

	    name = replaceByteInByteSequence(name, 0x2B, 0x20);
	    value = replaceByteInByteSequence(value, 0x2B, 0x20);

	    const nameString = utf8DecodeWithoutBOM(percentDecodeBytes(name));
	    const valueString = utf8DecodeWithoutBOM(percentDecodeBytes(value));

	    output.push([nameString, valueString]);
	  }
	  return output;
	}

	// https://url.spec.whatwg.org/#concept-urlencoded-string-parser
	function parseUrlencodedString(input) {
	  return parseUrlencoded(utf8Encode(input));
	}

	// https://url.spec.whatwg.org/#concept-urlencoded-serializer
	function serializeUrlencoded(tuples) {
	  // TODO: accept and use encoding argument

	  let output = "";
	  for (const [i, tuple] of tuples.entries()) {
	    const name = utf8PercentEncodeString(tuple[0], isURLEncodedPercentEncode, true);
	    const value = utf8PercentEncodeString(tuple[1], isURLEncodedPercentEncode, true);

	    if (i !== 0) {
	      output += "&";
	    }
	    output += `${name}=${value}`;
	  }
	  return output;
	}

	function strictlySplitByteSequence(buf, cp) {
	  const list = [];
	  let last = 0;
	  let i = buf.indexOf(cp);
	  while (i >= 0) {
	    list.push(buf.slice(last, i));
	    last = i + 1;
	    i = buf.indexOf(cp, last);
	  }
	  if (last !== buf.length) {
	    list.push(buf.slice(last));
	  }
	  return list;
	}

	function replaceByteInByteSequence(buf, from, to) {
	  let i = buf.indexOf(from);
	  while (i >= 0) {
	    buf[i] = to;
	    i = buf.indexOf(from, i + 1);
	  }
	  return buf;
	}

	urlencoded = {
	  parseUrlencodedString,
	  serializeUrlencoded
	};
	return urlencoded;
}

var URLSearchParams = {};

var _Function = {};

var hasRequired_Function;

function require_Function () {
	if (hasRequired_Function) return _Function;
	hasRequired_Function = 1;

	const conversions = webidlConversions1.requireLib();
	const utils = requireUtils();

	_Function.convert = (globalObject, value, { context = "The provided value" } = {}) => {
	  if (typeof value !== "function") {
	    throw new globalObject.TypeError(context + " is not a function");
	  }

	  function invokeTheCallbackFunction(...args) {
	    const thisArg = utils.tryWrapperForImpl(this);
	    let callResult;

	    for (let i = 0; i < args.length; i++) {
	      args[i] = utils.tryWrapperForImpl(args[i]);
	    }

	    callResult = Reflect.apply(value, thisArg, args);

	    callResult = conversions["any"](callResult, { context: context, globals: globalObject });

	    return callResult;
	  }

	  invokeTheCallbackFunction.construct = (...args) => {
	    for (let i = 0; i < args.length; i++) {
	      args[i] = utils.tryWrapperForImpl(args[i]);
	    }

	    let callResult = Reflect.construct(value, args);

	    callResult = conversions["any"](callResult, { context: context, globals: globalObject });

	    return callResult;
	  };

	  invokeTheCallbackFunction[utils.wrapperSymbol] = value;
	  invokeTheCallbackFunction.objectReference = value;

	  return invokeTheCallbackFunction;
	};
	return _Function;
}

var URLSearchParamsImpl = {};

var hasRequiredURLSearchParamsImpl;

function requireURLSearchParamsImpl () {
	if (hasRequiredURLSearchParamsImpl) return URLSearchParamsImpl;
	hasRequiredURLSearchParamsImpl = 1;
	const urlencoded = requireUrlencoded();

	URLSearchParamsImpl.implementation = class URLSearchParamsImpl {
	  constructor(globalObject, constructorArgs, { doNotStripQMark = false }) {
	    let init = constructorArgs[0];
	    this._list = [];
	    this._url = null;

	    if (!doNotStripQMark && typeof init === "string" && init[0] === "?") {
	      init = init.slice(1);
	    }

	    if (Array.isArray(init)) {
	      for (const pair of init) {
	        if (pair.length !== 2) {
	          throw new TypeError("Failed to construct 'URLSearchParams': parameter 1 sequence's element does not " +
	                              "contain exactly two elements.");
	        }
	        this._list.push([pair[0], pair[1]]);
	      }
	    } else if (typeof init === "object" && Object.getPrototypeOf(init) === null) {
	      for (const name of Object.keys(init)) {
	        const value = init[name];
	        this._list.push([name, value]);
	      }
	    } else {
	      this._list = urlencoded.parseUrlencodedString(init);
	    }
	  }

	  _updateSteps() {
	    if (this._url !== null) {
	      let serializedQuery = urlencoded.serializeUrlencoded(this._list);
	      if (serializedQuery === "") {
	        serializedQuery = null;
	      }

	      this._url._url.query = serializedQuery;
	    }
	  }

	  get size() {
	    return this._list.length;
	  }

	  append(name, value) {
	    this._list.push([name, value]);
	    this._updateSteps();
	  }

	  delete(name, value) {
	    let i = 0;
	    while (i < this._list.length) {
	      if (this._list[i][0] === name && (value === undefined || this._list[i][1] === value)) {
	        this._list.splice(i, 1);
	      } else {
	        i++;
	      }
	    }
	    this._updateSteps();
	  }

	  get(name) {
	    for (const tuple of this._list) {
	      if (tuple[0] === name) {
	        return tuple[1];
	      }
	    }
	    return null;
	  }

	  getAll(name) {
	    const output = [];
	    for (const tuple of this._list) {
	      if (tuple[0] === name) {
	        output.push(tuple[1]);
	      }
	    }
	    return output;
	  }

	  has(name, value) {
	    for (const tuple of this._list) {
	      if (tuple[0] === name && (value === undefined || tuple[1] === value)) {
	        return true;
	      }
	    }
	    return false;
	  }

	  set(name, value) {
	    let found = false;
	    let i = 0;
	    while (i < this._list.length) {
	      if (this._list[i][0] === name) {
	        if (found) {
	          this._list.splice(i, 1);
	        } else {
	          found = true;
	          this._list[i][1] = value;
	          i++;
	        }
	      } else {
	        i++;
	      }
	    }
	    if (!found) {
	      this._list.push([name, value]);
	    }
	    this._updateSteps();
	  }

	  sort() {
	    this._list.sort((a, b) => {
	      if (a[0] < b[0]) {
	        return -1;
	      }
	      if (a[0] > b[0]) {
	        return 1;
	      }
	      return 0;
	    });

	    this._updateSteps();
	  }

	  [Symbol.iterator]() {
	    return this._list[Symbol.iterator]();
	  }

	  toString() {
	    return urlencoded.serializeUrlencoded(this._list);
	  }
	};
	return URLSearchParamsImpl;
}

var hasRequiredURLSearchParams;

function requireURLSearchParams () {
	if (hasRequiredURLSearchParams) return URLSearchParams;
	hasRequiredURLSearchParams = 1;
	(function (exports) {

		const conversions = webidlConversions1.requireLib();
		const utils = requireUtils();

		const Function = require_Function();
		const newObjectInRealm = utils.newObjectInRealm;
		const implSymbol = utils.implSymbol;
		const ctorRegistrySymbol = utils.ctorRegistrySymbol;

		const interfaceName = "URLSearchParams";

		exports.is = value => {
		  return utils.isObject(value) && utils.hasOwn(value, implSymbol) && value[implSymbol] instanceof Impl.implementation;
		};
		exports.isImpl = value => {
		  return utils.isObject(value) && value instanceof Impl.implementation;
		};
		exports.convert = (globalObject, value, { context = "The provided value" } = {}) => {
		  if (exports.is(value)) {
		    return utils.implForWrapper(value);
		  }
		  throw new globalObject.TypeError(`${context} is not of type 'URLSearchParams'.`);
		};

		exports.createDefaultIterator = (globalObject, target, kind) => {
		  const ctorRegistry = globalObject[ctorRegistrySymbol];
		  const iteratorPrototype = ctorRegistry["URLSearchParams Iterator"];
		  const iterator = Object.create(iteratorPrototype);
		  Object.defineProperty(iterator, utils.iterInternalSymbol, {
		    value: { target, kind, index: 0 },
		    configurable: true
		  });
		  return iterator;
		};

		function makeWrapper(globalObject, newTarget) {
		  let proto;
		  if (newTarget !== undefined) {
		    proto = newTarget.prototype;
		  }

		  if (!utils.isObject(proto)) {
		    proto = globalObject[ctorRegistrySymbol]["URLSearchParams"].prototype;
		  }

		  return Object.create(proto);
		}

		exports.create = (globalObject, constructorArgs, privateData) => {
		  const wrapper = makeWrapper(globalObject);
		  return exports.setup(wrapper, globalObject, constructorArgs, privateData);
		};

		exports.createImpl = (globalObject, constructorArgs, privateData) => {
		  const wrapper = exports.create(globalObject, constructorArgs, privateData);
		  return utils.implForWrapper(wrapper);
		};

		exports._internalSetup = (wrapper, globalObject) => {};

		exports.setup = (wrapper, globalObject, constructorArgs = [], privateData = {}) => {
		  privateData.wrapper = wrapper;

		  exports._internalSetup(wrapper, globalObject);
		  Object.defineProperty(wrapper, implSymbol, {
		    value: new Impl.implementation(globalObject, constructorArgs, privateData),
		    configurable: true
		  });

		  wrapper[implSymbol][utils.wrapperSymbol] = wrapper;
		  if (Impl.init) {
		    Impl.init(wrapper[implSymbol]);
		  }
		  return wrapper;
		};

		exports.new = (globalObject, newTarget) => {
		  const wrapper = makeWrapper(globalObject, newTarget);

		  exports._internalSetup(wrapper, globalObject);
		  Object.defineProperty(wrapper, implSymbol, {
		    value: Object.create(Impl.implementation.prototype),
		    configurable: true
		  });

		  wrapper[implSymbol][utils.wrapperSymbol] = wrapper;
		  if (Impl.init) {
		    Impl.init(wrapper[implSymbol]);
		  }
		  return wrapper[implSymbol];
		};

		const exposed = new Set(["Window", "Worker"]);

		exports.install = (globalObject, globalNames) => {
		  if (!globalNames.some(globalName => exposed.has(globalName))) {
		    return;
		  }

		  const ctorRegistry = utils.initCtorRegistry(globalObject);
		  class URLSearchParams {
		    constructor() {
		      const args = [];
		      {
		        let curArg = arguments[0];
		        if (curArg !== undefined) {
		          if (utils.isObject(curArg)) {
		            if (curArg[Symbol.iterator] !== undefined) {
		              if (!utils.isObject(curArg)) {
		                throw new globalObject.TypeError(
		                  "Failed to construct 'URLSearchParams': parameter 1" + " sequence" + " is not an iterable object."
		                );
		              } else {
		                const V = [];
		                const tmp = curArg;
		                for (let nextItem of tmp) {
		                  if (!utils.isObject(nextItem)) {
		                    throw new globalObject.TypeError(
		                      "Failed to construct 'URLSearchParams': parameter 1" +
		                        " sequence" +
		                        "'s element" +
		                        " is not an iterable object."
		                    );
		                  } else {
		                    const V = [];
		                    const tmp = nextItem;
		                    for (let nextItem of tmp) {
		                      nextItem = conversions["USVString"](nextItem, {
		                        context:
		                          "Failed to construct 'URLSearchParams': parameter 1" +
		                          " sequence" +
		                          "'s element" +
		                          "'s element",
		                        globals: globalObject
		                      });

		                      V.push(nextItem);
		                    }
		                    nextItem = V;
		                  }

		                  V.push(nextItem);
		                }
		                curArg = V;
		              }
		            } else {
		              if (!utils.isObject(curArg)) {
		                throw new globalObject.TypeError(
		                  "Failed to construct 'URLSearchParams': parameter 1" + " record" + " is not an object."
		                );
		              } else {
		                const result = Object.create(null);
		                for (const key of Reflect.ownKeys(curArg)) {
		                  const desc = Object.getOwnPropertyDescriptor(curArg, key);
		                  if (desc && desc.enumerable) {
		                    let typedKey = key;

		                    typedKey = conversions["USVString"](typedKey, {
		                      context: "Failed to construct 'URLSearchParams': parameter 1" + " record" + "'s key",
		                      globals: globalObject
		                    });

		                    let typedValue = curArg[key];

		                    typedValue = conversions["USVString"](typedValue, {
		                      context: "Failed to construct 'URLSearchParams': parameter 1" + " record" + "'s value",
		                      globals: globalObject
		                    });

		                    result[typedKey] = typedValue;
		                  }
		                }
		                curArg = result;
		              }
		            }
		          } else {
		            curArg = conversions["USVString"](curArg, {
		              context: "Failed to construct 'URLSearchParams': parameter 1",
		              globals: globalObject
		            });
		          }
		        } else {
		          curArg = "";
		        }
		        args.push(curArg);
		      }
		      return exports.setup(Object.create(new.target.prototype), globalObject, args);
		    }

		    append(name, value) {
		      const esValue = this !== null && this !== undefined ? this : globalObject;
		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError(
		          "'append' called on an object that is not a valid instance of URLSearchParams."
		        );
		      }

		      if (arguments.length < 2) {
		        throw new globalObject.TypeError(
		          `Failed to execute 'append' on 'URLSearchParams': 2 arguments required, but only ${arguments.length} present.`
		        );
		      }
		      const args = [];
		      {
		        let curArg = arguments[0];
		        curArg = conversions["USVString"](curArg, {
		          context: "Failed to execute 'append' on 'URLSearchParams': parameter 1",
		          globals: globalObject
		        });
		        args.push(curArg);
		      }
		      {
		        let curArg = arguments[1];
		        curArg = conversions["USVString"](curArg, {
		          context: "Failed to execute 'append' on 'URLSearchParams': parameter 2",
		          globals: globalObject
		        });
		        args.push(curArg);
		      }
		      return utils.tryWrapperForImpl(esValue[implSymbol].append(...args));
		    }

		    delete(name) {
		      const esValue = this !== null && this !== undefined ? this : globalObject;
		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError(
		          "'delete' called on an object that is not a valid instance of URLSearchParams."
		        );
		      }

		      if (arguments.length < 1) {
		        throw new globalObject.TypeError(
		          `Failed to execute 'delete' on 'URLSearchParams': 1 argument required, but only ${arguments.length} present.`
		        );
		      }
		      const args = [];
		      {
		        let curArg = arguments[0];
		        curArg = conversions["USVString"](curArg, {
		          context: "Failed to execute 'delete' on 'URLSearchParams': parameter 1",
		          globals: globalObject
		        });
		        args.push(curArg);
		      }
		      {
		        let curArg = arguments[1];
		        if (curArg !== undefined) {
		          curArg = conversions["USVString"](curArg, {
		            context: "Failed to execute 'delete' on 'URLSearchParams': parameter 2",
		            globals: globalObject
		          });
		        }
		        args.push(curArg);
		      }
		      return utils.tryWrapperForImpl(esValue[implSymbol].delete(...args));
		    }

		    get(name) {
		      const esValue = this !== null && this !== undefined ? this : globalObject;
		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'get' called on an object that is not a valid instance of URLSearchParams.");
		      }

		      if (arguments.length < 1) {
		        throw new globalObject.TypeError(
		          `Failed to execute 'get' on 'URLSearchParams': 1 argument required, but only ${arguments.length} present.`
		        );
		      }
		      const args = [];
		      {
		        let curArg = arguments[0];
		        curArg = conversions["USVString"](curArg, {
		          context: "Failed to execute 'get' on 'URLSearchParams': parameter 1",
		          globals: globalObject
		        });
		        args.push(curArg);
		      }
		      return esValue[implSymbol].get(...args);
		    }

		    getAll(name) {
		      const esValue = this !== null && this !== undefined ? this : globalObject;
		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError(
		          "'getAll' called on an object that is not a valid instance of URLSearchParams."
		        );
		      }

		      if (arguments.length < 1) {
		        throw new globalObject.TypeError(
		          `Failed to execute 'getAll' on 'URLSearchParams': 1 argument required, but only ${arguments.length} present.`
		        );
		      }
		      const args = [];
		      {
		        let curArg = arguments[0];
		        curArg = conversions["USVString"](curArg, {
		          context: "Failed to execute 'getAll' on 'URLSearchParams': parameter 1",
		          globals: globalObject
		        });
		        args.push(curArg);
		      }
		      return utils.tryWrapperForImpl(esValue[implSymbol].getAll(...args));
		    }

		    has(name) {
		      const esValue = this !== null && this !== undefined ? this : globalObject;
		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'has' called on an object that is not a valid instance of URLSearchParams.");
		      }

		      if (arguments.length < 1) {
		        throw new globalObject.TypeError(
		          `Failed to execute 'has' on 'URLSearchParams': 1 argument required, but only ${arguments.length} present.`
		        );
		      }
		      const args = [];
		      {
		        let curArg = arguments[0];
		        curArg = conversions["USVString"](curArg, {
		          context: "Failed to execute 'has' on 'URLSearchParams': parameter 1",
		          globals: globalObject
		        });
		        args.push(curArg);
		      }
		      {
		        let curArg = arguments[1];
		        if (curArg !== undefined) {
		          curArg = conversions["USVString"](curArg, {
		            context: "Failed to execute 'has' on 'URLSearchParams': parameter 2",
		            globals: globalObject
		          });
		        }
		        args.push(curArg);
		      }
		      return esValue[implSymbol].has(...args);
		    }

		    set(name, value) {
		      const esValue = this !== null && this !== undefined ? this : globalObject;
		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'set' called on an object that is not a valid instance of URLSearchParams.");
		      }

		      if (arguments.length < 2) {
		        throw new globalObject.TypeError(
		          `Failed to execute 'set' on 'URLSearchParams': 2 arguments required, but only ${arguments.length} present.`
		        );
		      }
		      const args = [];
		      {
		        let curArg = arguments[0];
		        curArg = conversions["USVString"](curArg, {
		          context: "Failed to execute 'set' on 'URLSearchParams': parameter 1",
		          globals: globalObject
		        });
		        args.push(curArg);
		      }
		      {
		        let curArg = arguments[1];
		        curArg = conversions["USVString"](curArg, {
		          context: "Failed to execute 'set' on 'URLSearchParams': parameter 2",
		          globals: globalObject
		        });
		        args.push(curArg);
		      }
		      return utils.tryWrapperForImpl(esValue[implSymbol].set(...args));
		    }

		    sort() {
		      const esValue = this !== null && this !== undefined ? this : globalObject;
		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'sort' called on an object that is not a valid instance of URLSearchParams.");
		      }

		      return utils.tryWrapperForImpl(esValue[implSymbol].sort());
		    }

		    toString() {
		      const esValue = this !== null && this !== undefined ? this : globalObject;
		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError(
		          "'toString' called on an object that is not a valid instance of URLSearchParams."
		        );
		      }

		      return esValue[implSymbol].toString();
		    }

		    keys() {
		      if (!exports.is(this)) {
		        throw new globalObject.TypeError("'keys' called on an object that is not a valid instance of URLSearchParams.");
		      }
		      return exports.createDefaultIterator(globalObject, this, "key");
		    }

		    values() {
		      if (!exports.is(this)) {
		        throw new globalObject.TypeError(
		          "'values' called on an object that is not a valid instance of URLSearchParams."
		        );
		      }
		      return exports.createDefaultIterator(globalObject, this, "value");
		    }

		    entries() {
		      if (!exports.is(this)) {
		        throw new globalObject.TypeError(
		          "'entries' called on an object that is not a valid instance of URLSearchParams."
		        );
		      }
		      return exports.createDefaultIterator(globalObject, this, "key+value");
		    }

		    forEach(callback) {
		      if (!exports.is(this)) {
		        throw new globalObject.TypeError(
		          "'forEach' called on an object that is not a valid instance of URLSearchParams."
		        );
		      }
		      if (arguments.length < 1) {
		        throw new globalObject.TypeError(
		          "Failed to execute 'forEach' on 'iterable': 1 argument required, but only 0 present."
		        );
		      }
		      callback = Function.convert(globalObject, callback, {
		        context: "Failed to execute 'forEach' on 'iterable': The callback provided as parameter 1"
		      });
		      const thisArg = arguments[1];
		      let pairs = Array.from(this[implSymbol]);
		      let i = 0;
		      while (i < pairs.length) {
		        const [key, value] = pairs[i].map(utils.tryWrapperForImpl);
		        callback.call(thisArg, value, key, this);
		        pairs = Array.from(this[implSymbol]);
		        i++;
		      }
		    }

		    get size() {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError(
		          "'get size' called on an object that is not a valid instance of URLSearchParams."
		        );
		      }

		      return esValue[implSymbol]["size"];
		    }
		  }
		  Object.defineProperties(URLSearchParams.prototype, {
		    append: { enumerable: true },
		    delete: { enumerable: true },
		    get: { enumerable: true },
		    getAll: { enumerable: true },
		    has: { enumerable: true },
		    set: { enumerable: true },
		    sort: { enumerable: true },
		    toString: { enumerable: true },
		    keys: { enumerable: true },
		    values: { enumerable: true },
		    entries: { enumerable: true },
		    forEach: { enumerable: true },
		    size: { enumerable: true },
		    [Symbol.toStringTag]: { value: "URLSearchParams", configurable: true },
		    [Symbol.iterator]: { value: URLSearchParams.prototype.entries, configurable: true, writable: true }
		  });
		  ctorRegistry[interfaceName] = URLSearchParams;

		  ctorRegistry["URLSearchParams Iterator"] = Object.create(ctorRegistry["%IteratorPrototype%"], {
		    [Symbol.toStringTag]: {
		      configurable: true,
		      value: "URLSearchParams Iterator"
		    }
		  });
		  utils.define(ctorRegistry["URLSearchParams Iterator"], {
		    next() {
		      const internal = this && this[utils.iterInternalSymbol];
		      if (!internal) {
		        throw new globalObject.TypeError("next() called on a value that is not a URLSearchParams iterator object");
		      }

		      const { target, kind, index } = internal;
		      const values = Array.from(target[implSymbol]);
		      const len = values.length;
		      if (index >= len) {
		        return newObjectInRealm(globalObject, { value: undefined, done: true });
		      }

		      const pair = values[index];
		      internal.index = index + 1;
		      return newObjectInRealm(globalObject, utils.iteratorResult(pair.map(utils.tryWrapperForImpl), kind));
		    }
		  });

		  Object.defineProperty(globalObject, interfaceName, {
		    configurable: true,
		    writable: true,
		    value: URLSearchParams
		  });
		};

		const Impl = requireURLSearchParamsImpl(); 
	} (URLSearchParams));
	return URLSearchParams;
}

var hasRequiredURLImpl;

function requireURLImpl () {
	if (hasRequiredURLImpl) return URLImpl;
	hasRequiredURLImpl = 1;
	const usm = requireUrlStateMachine();
	const urlencoded = requireUrlencoded();
	const URLSearchParams = requireURLSearchParams();

	URLImpl.implementation = class URLImpl {
	  // Unlike the spec, we duplicate some code between the constructor and canParse, because we want to give useful error
	  // messages in the constructor that distinguish between the different causes of failure.
	  constructor(globalObject, [url, base]) {
	    let parsedBase = null;
	    if (base !== undefined) {
	      parsedBase = usm.basicURLParse(base);
	      if (parsedBase === null) {
	        throw new TypeError(`Invalid base URL: ${base}`);
	      }
	    }

	    const parsedURL = usm.basicURLParse(url, { baseURL: parsedBase });
	    if (parsedURL === null) {
	      throw new TypeError(`Invalid URL: ${url}`);
	    }

	    const query = parsedURL.query !== null ? parsedURL.query : "";

	    this._url = parsedURL;

	    // We cannot invoke the "new URLSearchParams object" algorithm without going through the constructor, which strips
	    // question mark by default. Therefore the doNotStripQMark hack is used.
	    this._query = URLSearchParams.createImpl(globalObject, [query], { doNotStripQMark: true });
	    this._query._url = this;
	  }

	  static parse(globalObject, input, base) {
	    try {
	      return new URLImpl(globalObject, [input, base]);
	    } catch {
	      return null;
	    }
	  }

	  static canParse(url, base) {
	    let parsedBase = null;
	    if (base !== undefined) {
	      parsedBase = usm.basicURLParse(base);
	      if (parsedBase === null) {
	        return false;
	      }
	    }

	    const parsedURL = usm.basicURLParse(url, { baseURL: parsedBase });
	    if (parsedURL === null) {
	      return false;
	    }

	    return true;
	  }

	  get href() {
	    return usm.serializeURL(this._url);
	  }

	  set href(v) {
	    const parsedURL = usm.basicURLParse(v);
	    if (parsedURL === null) {
	      throw new TypeError(`Invalid URL: ${v}`);
	    }

	    this._url = parsedURL;

	    this._query._list.splice(0);
	    const { query } = parsedURL;
	    if (query !== null) {
	      this._query._list = urlencoded.parseUrlencodedString(query);
	    }
	  }

	  get origin() {
	    return usm.serializeURLOrigin(this._url);
	  }

	  get protocol() {
	    return `${this._url.scheme}:`;
	  }

	  set protocol(v) {
	    usm.basicURLParse(`${v}:`, { url: this._url, stateOverride: "scheme start" });
	  }

	  get username() {
	    return this._url.username;
	  }

	  set username(v) {
	    if (usm.cannotHaveAUsernamePasswordPort(this._url)) {
	      return;
	    }

	    usm.setTheUsername(this._url, v);
	  }

	  get password() {
	    return this._url.password;
	  }

	  set password(v) {
	    if (usm.cannotHaveAUsernamePasswordPort(this._url)) {
	      return;
	    }

	    usm.setThePassword(this._url, v);
	  }

	  get host() {
	    const url = this._url;

	    if (url.host === null) {
	      return "";
	    }

	    if (url.port === null) {
	      return usm.serializeHost(url.host);
	    }

	    return `${usm.serializeHost(url.host)}:${usm.serializeInteger(url.port)}`;
	  }

	  set host(v) {
	    if (usm.hasAnOpaquePath(this._url)) {
	      return;
	    }

	    usm.basicURLParse(v, { url: this._url, stateOverride: "host" });
	  }

	  get hostname() {
	    if (this._url.host === null) {
	      return "";
	    }

	    return usm.serializeHost(this._url.host);
	  }

	  set hostname(v) {
	    if (usm.hasAnOpaquePath(this._url)) {
	      return;
	    }

	    usm.basicURLParse(v, { url: this._url, stateOverride: "hostname" });
	  }

	  get port() {
	    if (this._url.port === null) {
	      return "";
	    }

	    return usm.serializeInteger(this._url.port);
	  }

	  set port(v) {
	    if (usm.cannotHaveAUsernamePasswordPort(this._url)) {
	      return;
	    }

	    if (v === "") {
	      this._url.port = null;
	    } else {
	      usm.basicURLParse(v, { url: this._url, stateOverride: "port" });
	    }
	  }

	  get pathname() {
	    return usm.serializePath(this._url);
	  }

	  set pathname(v) {
	    if (usm.hasAnOpaquePath(this._url)) {
	      return;
	    }

	    this._url.path = [];
	    usm.basicURLParse(v, { url: this._url, stateOverride: "path start" });
	  }

	  get search() {
	    if (this._url.query === null || this._url.query === "") {
	      return "";
	    }

	    return `?${this._url.query}`;
	  }

	  set search(v) {
	    const url = this._url;

	    if (v === "") {
	      url.query = null;
	      this._query._list = [];
	      return;
	    }

	    const input = v[0] === "?" ? v.substring(1) : v;
	    url.query = "";
	    usm.basicURLParse(input, { url, stateOverride: "query" });
	    this._query._list = urlencoded.parseUrlencodedString(input);
	  }

	  get searchParams() {
	    return this._query;
	  }

	  get hash() {
	    if (this._url.fragment === null || this._url.fragment === "") {
	      return "";
	    }

	    return `#${this._url.fragment}`;
	  }

	  set hash(v) {
	    if (v === "") {
	      this._url.fragment = null;
	      return;
	    }

	    const input = v[0] === "#" ? v.substring(1) : v;
	    this._url.fragment = "";
	    usm.basicURLParse(input, { url: this._url, stateOverride: "fragment" });
	  }

	  toJSON() {
	    return this.href;
	  }
	};
	return URLImpl;
}

var hasRequiredURL;

function requireURL () {
	if (hasRequiredURL) return URL;
	hasRequiredURL = 1;
	(function (exports) {

		const conversions = webidlConversions1.requireLib();
		const utils = requireUtils();

		const implSymbol = utils.implSymbol;
		const ctorRegistrySymbol = utils.ctorRegistrySymbol;

		const interfaceName = "URL";

		exports.is = value => {
		  return utils.isObject(value) && utils.hasOwn(value, implSymbol) && value[implSymbol] instanceof Impl.implementation;
		};
		exports.isImpl = value => {
		  return utils.isObject(value) && value instanceof Impl.implementation;
		};
		exports.convert = (globalObject, value, { context = "The provided value" } = {}) => {
		  if (exports.is(value)) {
		    return utils.implForWrapper(value);
		  }
		  throw new globalObject.TypeError(`${context} is not of type 'URL'.`);
		};

		function makeWrapper(globalObject, newTarget) {
		  let proto;
		  if (newTarget !== undefined) {
		    proto = newTarget.prototype;
		  }

		  if (!utils.isObject(proto)) {
		    proto = globalObject[ctorRegistrySymbol]["URL"].prototype;
		  }

		  return Object.create(proto);
		}

		exports.create = (globalObject, constructorArgs, privateData) => {
		  const wrapper = makeWrapper(globalObject);
		  return exports.setup(wrapper, globalObject, constructorArgs, privateData);
		};

		exports.createImpl = (globalObject, constructorArgs, privateData) => {
		  const wrapper = exports.create(globalObject, constructorArgs, privateData);
		  return utils.implForWrapper(wrapper);
		};

		exports._internalSetup = (wrapper, globalObject) => {};

		exports.setup = (wrapper, globalObject, constructorArgs = [], privateData = {}) => {
		  privateData.wrapper = wrapper;

		  exports._internalSetup(wrapper, globalObject);
		  Object.defineProperty(wrapper, implSymbol, {
		    value: new Impl.implementation(globalObject, constructorArgs, privateData),
		    configurable: true
		  });

		  wrapper[implSymbol][utils.wrapperSymbol] = wrapper;
		  if (Impl.init) {
		    Impl.init(wrapper[implSymbol]);
		  }
		  return wrapper;
		};

		exports.new = (globalObject, newTarget) => {
		  const wrapper = makeWrapper(globalObject, newTarget);

		  exports._internalSetup(wrapper, globalObject);
		  Object.defineProperty(wrapper, implSymbol, {
		    value: Object.create(Impl.implementation.prototype),
		    configurable: true
		  });

		  wrapper[implSymbol][utils.wrapperSymbol] = wrapper;
		  if (Impl.init) {
		    Impl.init(wrapper[implSymbol]);
		  }
		  return wrapper[implSymbol];
		};

		const exposed = new Set(["Window", "Worker"]);

		exports.install = (globalObject, globalNames) => {
		  if (!globalNames.some(globalName => exposed.has(globalName))) {
		    return;
		  }

		  const ctorRegistry = utils.initCtorRegistry(globalObject);
		  class URL {
		    constructor(url) {
		      if (arguments.length < 1) {
		        throw new globalObject.TypeError(
		          `Failed to construct 'URL': 1 argument required, but only ${arguments.length} present.`
		        );
		      }
		      const args = [];
		      {
		        let curArg = arguments[0];
		        curArg = conversions["USVString"](curArg, {
		          context: "Failed to construct 'URL': parameter 1",
		          globals: globalObject
		        });
		        args.push(curArg);
		      }
		      {
		        let curArg = arguments[1];
		        if (curArg !== undefined) {
		          curArg = conversions["USVString"](curArg, {
		            context: "Failed to construct 'URL': parameter 2",
		            globals: globalObject
		          });
		        }
		        args.push(curArg);
		      }
		      return exports.setup(Object.create(new.target.prototype), globalObject, args);
		    }

		    toJSON() {
		      const esValue = this !== null && this !== undefined ? this : globalObject;
		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'toJSON' called on an object that is not a valid instance of URL.");
		      }

		      return esValue[implSymbol].toJSON();
		    }

		    get href() {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'get href' called on an object that is not a valid instance of URL.");
		      }

		      return esValue[implSymbol]["href"];
		    }

		    set href(V) {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'set href' called on an object that is not a valid instance of URL.");
		      }

		      V = conversions["USVString"](V, {
		        context: "Failed to set the 'href' property on 'URL': The provided value",
		        globals: globalObject
		      });

		      esValue[implSymbol]["href"] = V;
		    }

		    toString() {
		      const esValue = this;
		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'toString' called on an object that is not a valid instance of URL.");
		      }

		      return esValue[implSymbol]["href"];
		    }

		    get origin() {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'get origin' called on an object that is not a valid instance of URL.");
		      }

		      return esValue[implSymbol]["origin"];
		    }

		    get protocol() {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'get protocol' called on an object that is not a valid instance of URL.");
		      }

		      return esValue[implSymbol]["protocol"];
		    }

		    set protocol(V) {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'set protocol' called on an object that is not a valid instance of URL.");
		      }

		      V = conversions["USVString"](V, {
		        context: "Failed to set the 'protocol' property on 'URL': The provided value",
		        globals: globalObject
		      });

		      esValue[implSymbol]["protocol"] = V;
		    }

		    get username() {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'get username' called on an object that is not a valid instance of URL.");
		      }

		      return esValue[implSymbol]["username"];
		    }

		    set username(V) {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'set username' called on an object that is not a valid instance of URL.");
		      }

		      V = conversions["USVString"](V, {
		        context: "Failed to set the 'username' property on 'URL': The provided value",
		        globals: globalObject
		      });

		      esValue[implSymbol]["username"] = V;
		    }

		    get password() {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'get password' called on an object that is not a valid instance of URL.");
		      }

		      return esValue[implSymbol]["password"];
		    }

		    set password(V) {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'set password' called on an object that is not a valid instance of URL.");
		      }

		      V = conversions["USVString"](V, {
		        context: "Failed to set the 'password' property on 'URL': The provided value",
		        globals: globalObject
		      });

		      esValue[implSymbol]["password"] = V;
		    }

		    get host() {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'get host' called on an object that is not a valid instance of URL.");
		      }

		      return esValue[implSymbol]["host"];
		    }

		    set host(V) {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'set host' called on an object that is not a valid instance of URL.");
		      }

		      V = conversions["USVString"](V, {
		        context: "Failed to set the 'host' property on 'URL': The provided value",
		        globals: globalObject
		      });

		      esValue[implSymbol]["host"] = V;
		    }

		    get hostname() {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'get hostname' called on an object that is not a valid instance of URL.");
		      }

		      return esValue[implSymbol]["hostname"];
		    }

		    set hostname(V) {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'set hostname' called on an object that is not a valid instance of URL.");
		      }

		      V = conversions["USVString"](V, {
		        context: "Failed to set the 'hostname' property on 'URL': The provided value",
		        globals: globalObject
		      });

		      esValue[implSymbol]["hostname"] = V;
		    }

		    get port() {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'get port' called on an object that is not a valid instance of URL.");
		      }

		      return esValue[implSymbol]["port"];
		    }

		    set port(V) {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'set port' called on an object that is not a valid instance of URL.");
		      }

		      V = conversions["USVString"](V, {
		        context: "Failed to set the 'port' property on 'URL': The provided value",
		        globals: globalObject
		      });

		      esValue[implSymbol]["port"] = V;
		    }

		    get pathname() {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'get pathname' called on an object that is not a valid instance of URL.");
		      }

		      return esValue[implSymbol]["pathname"];
		    }

		    set pathname(V) {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'set pathname' called on an object that is not a valid instance of URL.");
		      }

		      V = conversions["USVString"](V, {
		        context: "Failed to set the 'pathname' property on 'URL': The provided value",
		        globals: globalObject
		      });

		      esValue[implSymbol]["pathname"] = V;
		    }

		    get search() {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'get search' called on an object that is not a valid instance of URL.");
		      }

		      return esValue[implSymbol]["search"];
		    }

		    set search(V) {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'set search' called on an object that is not a valid instance of URL.");
		      }

		      V = conversions["USVString"](V, {
		        context: "Failed to set the 'search' property on 'URL': The provided value",
		        globals: globalObject
		      });

		      esValue[implSymbol]["search"] = V;
		    }

		    get searchParams() {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'get searchParams' called on an object that is not a valid instance of URL.");
		      }

		      return utils.getSameObject(this, "searchParams", () => {
		        return utils.tryWrapperForImpl(esValue[implSymbol]["searchParams"]);
		      });
		    }

		    get hash() {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'get hash' called on an object that is not a valid instance of URL.");
		      }

		      return esValue[implSymbol]["hash"];
		    }

		    set hash(V) {
		      const esValue = this !== null && this !== undefined ? this : globalObject;

		      if (!exports.is(esValue)) {
		        throw new globalObject.TypeError("'set hash' called on an object that is not a valid instance of URL.");
		      }

		      V = conversions["USVString"](V, {
		        context: "Failed to set the 'hash' property on 'URL': The provided value",
		        globals: globalObject
		      });

		      esValue[implSymbol]["hash"] = V;
		    }

		    static parse(url) {
		      if (arguments.length < 1) {
		        throw new globalObject.TypeError(
		          `Failed to execute 'parse' on 'URL': 1 argument required, but only ${arguments.length} present.`
		        );
		      }
		      const args = [];
		      {
		        let curArg = arguments[0];
		        curArg = conversions["USVString"](curArg, {
		          context: "Failed to execute 'parse' on 'URL': parameter 1",
		          globals: globalObject
		        });
		        args.push(curArg);
		      }
		      {
		        let curArg = arguments[1];
		        if (curArg !== undefined) {
		          curArg = conversions["USVString"](curArg, {
		            context: "Failed to execute 'parse' on 'URL': parameter 2",
		            globals: globalObject
		          });
		        }
		        args.push(curArg);
		      }
		      return utils.tryWrapperForImpl(Impl.implementation.parse(globalObject, ...args));
		    }

		    static canParse(url) {
		      if (arguments.length < 1) {
		        throw new globalObject.TypeError(
		          `Failed to execute 'canParse' on 'URL': 1 argument required, but only ${arguments.length} present.`
		        );
		      }
		      const args = [];
		      {
		        let curArg = arguments[0];
		        curArg = conversions["USVString"](curArg, {
		          context: "Failed to execute 'canParse' on 'URL': parameter 1",
		          globals: globalObject
		        });
		        args.push(curArg);
		      }
		      {
		        let curArg = arguments[1];
		        if (curArg !== undefined) {
		          curArg = conversions["USVString"](curArg, {
		            context: "Failed to execute 'canParse' on 'URL': parameter 2",
		            globals: globalObject
		          });
		        }
		        args.push(curArg);
		      }
		      return Impl.implementation.canParse(...args);
		    }
		  }
		  Object.defineProperties(URL.prototype, {
		    toJSON: { enumerable: true },
		    href: { enumerable: true },
		    toString: { enumerable: true },
		    origin: { enumerable: true },
		    protocol: { enumerable: true },
		    username: { enumerable: true },
		    password: { enumerable: true },
		    host: { enumerable: true },
		    hostname: { enumerable: true },
		    port: { enumerable: true },
		    pathname: { enumerable: true },
		    search: { enumerable: true },
		    searchParams: { enumerable: true },
		    hash: { enumerable: true },
		    [Symbol.toStringTag]: { value: "URL", configurable: true }
		  });
		  Object.defineProperties(URL, { parse: { enumerable: true }, canParse: { enumerable: true } });
		  ctorRegistry[interfaceName] = URL;

		  Object.defineProperty(globalObject, interfaceName, {
		    configurable: true,
		    writable: true,
		    value: URL
		  });

		  if (globalNames.includes("Window")) {
		    Object.defineProperty(globalObject, "webkitURL", {
		      configurable: true,
		      writable: true,
		      value: URL
		    });
		  }
		};

		const Impl = requireURLImpl(); 
	} (URL));
	return URL;
}

var hasRequiredWebidl2jsWrapper;

function requireWebidl2jsWrapper () {
	if (hasRequiredWebidl2jsWrapper) return webidl2jsWrapper;
	hasRequiredWebidl2jsWrapper = 1;

	const URL = requireURL();
	const URLSearchParams = requireURLSearchParams();

	webidl2jsWrapper.URL = URL;
	webidl2jsWrapper.URLSearchParams = URLSearchParams;
	return webidl2jsWrapper;
}

var hasRequiredWhatwgUrl;

function requireWhatwgUrl () {
	if (hasRequiredWhatwgUrl) return whatwgUrl;
	hasRequiredWhatwgUrl = 1;

	const { URL, URLSearchParams } = requireWebidl2jsWrapper();
	const urlStateMachine = requireUrlStateMachine();
	const percentEncoding = requirePercentEncoding();

	const sharedGlobalObject = { Array, Object, Promise, String, TypeError };
	URL.install(sharedGlobalObject, ["Window"]);
	URLSearchParams.install(sharedGlobalObject, ["Window"]);

	whatwgUrl.URL = sharedGlobalObject.URL;
	whatwgUrl.URLSearchParams = sharedGlobalObject.URLSearchParams;

	whatwgUrl.parseURL = urlStateMachine.parseURL;
	whatwgUrl.basicURLParse = urlStateMachine.basicURLParse;
	whatwgUrl.serializeURL = urlStateMachine.serializeURL;
	whatwgUrl.serializePath = urlStateMachine.serializePath;
	whatwgUrl.serializeHost = urlStateMachine.serializeHost;
	whatwgUrl.serializeInteger = urlStateMachine.serializeInteger;
	whatwgUrl.serializeURLOrigin = urlStateMachine.serializeURLOrigin;
	whatwgUrl.setTheUsername = urlStateMachine.setTheUsername;
	whatwgUrl.setThePassword = urlStateMachine.setThePassword;
	whatwgUrl.cannotHaveAUsernamePasswordPort = urlStateMachine.cannotHaveAUsernamePasswordPort;
	whatwgUrl.hasAnOpaquePath = urlStateMachine.hasAnOpaquePath;

	whatwgUrl.percentDecodeString = percentEncoding.percentDecodeString;
	whatwgUrl.percentDecodeBytes = percentEncoding.percentDecodeBytes;
	return whatwgUrl;
}

exports.requireWhatwgUrl = requireWhatwgUrl;
