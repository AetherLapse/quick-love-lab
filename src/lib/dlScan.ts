import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";

// PDF417 only — fastest decode path
export const PDF417_HINTS = new Map<DecodeHintType, unknown>();
PDF417_HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417]);

export interface AAMVAData {
  dlNumber:    string | null;
  dobMMDDYYYY: string | null;
  fullName:    string | null;
  address:     string | null;
}

/** Parse AAMVA PDF417 barcode text into human-readable fields. */
export function parseAAMVA(text: string): AAMVAData {
  const field = (code: string) =>
    text.match(new RegExp(`${code}([^\n\r\u001e\u001c]+)`))?.[1]?.trim() ?? null;

  const lastName  = field("DCS");
  const firstName = field("DAC");
  const fullName  = firstName && lastName ? `${firstName} ${lastName}`
                  : firstName ?? lastName ?? null;

  const street  = field("DAG");
  const city    = field("DAI");
  const state   = field("DAJ");
  const zipRaw  = field("DAK");
  const zip     = zipRaw ? zipRaw.replace(/\D/g, "").slice(0, 5) : null;
  const addressParts = [street, city, state, zip].filter(Boolean);

  return {
    dlNumber:    field("DAQ"),
    dobMMDDYYYY: text.match(/DBB(\d{8})/)?.[1] ?? null,
    fullName,
    address:     addressParts.length > 0 ? addressParts.join(", ") : null,
  };
}

/** Parse an 8-digit DOB string (MMDDYYYY or YYYYMMDD) into a Date. */
export function parseDOB(dobStr: string): Date | null {
  if (dobStr.length !== 8) return null;
  let mm: number, dd: number, yyyy: number;
  const first4 = parseInt(dobStr.slice(0, 4), 10);
  if (first4 >= 1900 && first4 <= 2099) {
    yyyy = first4;
    mm   = parseInt(dobStr.slice(4, 6), 10) - 1;
    dd   = parseInt(dobStr.slice(6, 8), 10);
  } else {
    mm   = parseInt(dobStr.slice(0, 2), 10) - 1;
    dd   = parseInt(dobStr.slice(2, 4), 10);
    yyyy = parseInt(dobStr.slice(4, 8), 10);
  }
  const date = new Date(yyyy, mm, dd);
  return isNaN(date.getTime()) ? null : date;
}

/** Return true if the 8-digit DOB string represents someone 21+. */
export function isOver21(dobStr: string): boolean {
  const dob = parseDOB(dobStr);
  if (!dob) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 21);
  return dob <= cutoff;
}

/** Format an 8-digit DOB string to a readable date. */
export function formatDOB(dobStr: string): string {
  const d = parseDOB(dobStr);
  if (!d) return dobStr;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Convert an 8-digit DOB string to ISO date YYYY-MM-DD for DB storage. */
export function dobToISO(dobStr: string): string | null {
  const d = parseDOB(dobStr);
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

/** SHA-256 hash a string and return lower-hex. */
export async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Mask a DL number — show only last 4 chars. */
export function maskDL(dlNumber: string): string {
  if (dlNumber.length <= 4) return dlNumber;
  return `···${dlNumber.slice(-4)}`;
}

// ─── Shared scanner helper ────────────────────────────────────────────────────

export type ScannerControls = IScannerControls;

/**
 * Attach a continuous PDF417 decoder to a <video> element.
 * Resolves once on first successful decode; rejects on hard error.
 * Returns controls so the caller can stop scanning.
 */
export async function attachPDF417Decoder(
  videoEl: HTMLVideoElement,
  onDecode: (text: string, controls: IScannerControls) => void
): Promise<IScannerControls> {
  const reader = new BrowserMultiFormatReader(PDF417_HINTS);
  const controls = await reader.decodeFromVideoElement(videoEl, (result, _err, ctrl) => {
    if (!result) return;
    ctrl.stop();
    onDecode(result.getText(), ctrl);
  });
  return controls;
}

/**
 * AES-256-GCM encrypt a string.
 * Key is derived via SHA-256 of the provided key material.
 * Returns base64-encoded ciphertext + IV — never stores plain text in the DB.
 */
export async function encryptField(
  plaintext: string,
  keyMaterial: string
): Promise<{ ciphertext: string; iv: string }> {
  const enc       = new TextEncoder();
  const keyHash   = await crypto.subtle.digest("SHA-256", enc.encode(keyMaterial));
  const cryptoKey = await crypto.subtle.importKey("raw", keyHash, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv        = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, enc.encode(plaintext));
  const toB64 = (buf: ArrayBuffer | Uint8Array) =>
    btoa(String.fromCharCode(...new Uint8Array(buf instanceof ArrayBuffer ? buf : (buf as Uint8Array).buffer)));
  return { ciphertext: toB64(encrypted), iv: toB64(iv) };
}

/** Decode a single frame from a data-URL image. */
export async function decodeFromDataURL(dataUrl: string): Promise<string> {
  const reader = new BrowserMultiFormatReader(PDF417_HINTS);
  const result = await reader.decodeFromImageUrl(dataUrl);
  return result.getText();
}
