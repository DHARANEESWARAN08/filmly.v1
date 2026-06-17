import * as ExpoCrypto from 'expo-crypto';

type DigestAlgorithm = string | { name: string };

type CryptoLike = {
  getRandomValues?: <T extends ArrayBufferView>(array: T) => T;
  subtle?: {
    digest?: (algorithm: DigestAlgorithm, data: BufferSource) => Promise<ArrayBuffer>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const globalScope = globalThis as typeof globalThis & {
  crypto?: CryptoLike;
  TextEncoder?: typeof TextEncoder;
};

function normalizeDigestAlgorithm(algorithm: DigestAlgorithm) {
  const rawName = typeof algorithm === 'string' ? algorithm : algorithm.name;
  const normalized = rawName.toUpperCase().replace('_', '-');

  switch (normalized) {
    case 'SHA-1':
    case 'SHA1':
      return ExpoCrypto.CryptoDigestAlgorithm.SHA1;
    case 'SHA-256':
    case 'SHA256':
      return ExpoCrypto.CryptoDigestAlgorithm.SHA256;
    case 'SHA-384':
    case 'SHA384':
      return ExpoCrypto.CryptoDigestAlgorithm.SHA384;
    case 'SHA-512':
    case 'SHA512':
      return ExpoCrypto.CryptoDigestAlgorithm.SHA512;
    default:
      throw new Error(`Unsupported digest algorithm: ${rawName}`);
  }
}

function utf8Encode(input: string) {
  const bytes: number[] = [];

  for (let index = 0; index < input.length; index += 1) {
    const codePoint = input.codePointAt(index) || 0;
    if (codePoint > 0xffff) {
      index += 1;
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }

  return new Uint8Array(bytes);
}

function installTextEncoderPolyfill() {
  if (typeof globalScope.TextEncoder !== 'undefined') {
    return;
  }

  globalScope.TextEncoder = class TextEncoder {
    readonly encoding = 'utf-8';

    encode(input = '') {
      return utf8Encode(String(input));
    }
  } as typeof TextEncoder;
}

function installCryptoPolyfill() {
  const cryptoObject: CryptoLike = globalScope.crypto || {};

  if (typeof cryptoObject.getRandomValues !== 'function') {
    cryptoObject.getRandomValues = <T extends ArrayBufferView>(array: T) =>
      ExpoCrypto.getRandomValues(
        array as unknown as Parameters<typeof ExpoCrypto.getRandomValues>[0],
      ) as unknown as T;
  }

  cryptoObject.subtle = cryptoObject.subtle || {};

  if (typeof cryptoObject.subtle.digest !== 'function') {
    cryptoObject.subtle.digest = async (algorithm: DigestAlgorithm, data: BufferSource) =>
      ExpoCrypto.digest(normalizeDigestAlgorithm(algorithm), data);
  }

  if (!globalScope.crypto) {
    Object.defineProperty(globalScope, 'crypto', {
      configurable: true,
      value: cryptoObject,
      writable: true,
    });
  }
}

installTextEncoderPolyfill();
installCryptoPolyfill();
