'use strict';

const crypto = require('crypto');

var urlAlphabet_1;
var hasRequiredUrlAlphabet;

function requireUrlAlphabet () {
	if (hasRequiredUrlAlphabet) return urlAlphabet_1;
	hasRequiredUrlAlphabet = 1;
	let urlAlphabet =
	  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

	urlAlphabet_1 = { urlAlphabet };
	return urlAlphabet_1;
}

var nanoid_1;
var hasRequiredNanoid;

function requireNanoid () {
	if (hasRequiredNanoid) return nanoid_1;
	hasRequiredNanoid = 1;
	let crypto$1 = crypto;

	let { urlAlphabet } = requireUrlAlphabet();

	const POOL_SIZE_MULTIPLIER = 128;
	let pool, poolOffset;

	let fillPool = bytes => {
	  if (bytes < 0 || bytes > 1024) throw new RangeError('Wrong ID size')
	  try {
	    if (!pool || pool.length < bytes) {
	      pool = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER);
	      crypto$1.randomFillSync(pool);
	      poolOffset = 0;
	    } else if (poolOffset + bytes > pool.length) {
	      crypto$1.randomFillSync(pool);
	      poolOffset = 0;
	    }
	  } catch (e) {
	    pool = undefined;
	    throw e
	  }
	  poolOffset += bytes;
	};

	let random = bytes => {
	  fillPool((bytes |= 0));
	  return pool.subarray(poolOffset - bytes, poolOffset)
	};

	let customRandom = (alphabet, defaultSize, getRandom) => {
	  let mask = (2 << (31 - Math.clz32((alphabet.length - 1) | 1))) - 1;


	  let step = Math.ceil((1.6 * mask * defaultSize) / alphabet.length);

	  return (size = defaultSize) => {
	    if (size <= 0) return ''
	    let id = '';
	    while (true) {
	      let bytes = getRandom(step);
	      let i = step;
	      while (i--) {
	        id += alphabet[bytes[i] & mask] || '';
	        if (id.length === size) return id
	      }
	    }
	  }
	};

	let customAlphabet = (alphabet, size = 21) =>
	  customRandom(alphabet, size, random);

	let nanoid = (size = 21) => {
	  fillPool((size |= 0));
	  let id = '';
	  for (let i = poolOffset - size; i < poolOffset; i++) {
	    id += urlAlphabet[pool[i] & 63];
	  }
	  return id
	};

	nanoid_1 = { nanoid, customAlphabet, customRandom, urlAlphabet, random };
	return nanoid_1;
}

let urlAlphabet =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

const POOL_SIZE_MULTIPLIER = 128;
let pool, poolOffset;

let fillPool = bytes => {
  if (bytes < 0 || bytes > 1024) throw new RangeError('Wrong ID size')
  try {
    if (!pool || pool.length < bytes) {
      pool = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER);
      crypto.randomFillSync(pool);
      poolOffset = 0;
    } else if (poolOffset + bytes > pool.length) {
      crypto.randomFillSync(pool);
      poolOffset = 0;
    }
  } catch (e) {
    pool = undefined;
    throw e
  }
  poolOffset += bytes;
};

let nanoid = (size = 21) => {
  fillPool((size |= 0));
  let id = '';
  for (let i = poolOffset - size; i < poolOffset; i++) {
    id += urlAlphabet[pool[i] & 63];
  }
  return id
};

exports.nanoid = nanoid;
exports.requireNanoid = requireNanoid;
