const PBKDF2_ITERATIONS = 100000;

function bytesToBase64(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function derivePasswordHash(password, salt) {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return new Uint8Array(hash);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const hash = await derivePasswordHash(password, salt);

  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToBase64(
    salt
  )}$${bytesToBase64(hash)}`;
}

export async function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split("$");

    if (parts.length !== 4) {
      return false;
    }

    const [
      algorithm,
      iterations,
      saltBase64,
      hashBase64,
    ] = parts;

    if (algorithm !== "pbkdf2") {
      return false;
    }

    const salt = base64ToBytes(saltBase64);
    const expectedHash = base64ToBytes(hashBase64);

    const encoder = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: Number(iterations),
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );

    const actualHash = new Uint8Array(derivedBits);

    if (actualHash.length !== expectedHash.length) {
      return false;
    }

    let result = 0;

    for (let i = 0; i < actualHash.length; i++) {
      result |= actualHash[i] ^ expectedHash[i];
    }

    return result === 0;
  } catch {
    return false;
  }
}

export function createUserId() {
  return crypto.randomUUID();
}

export function createSessionToken() {
  return crypto.randomUUID() + "-" + crypto.randomUUID();
}