'use strict';

const crypto = require('crypto');

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
