/** UUID v4. crypto.randomUUID доступен не везде (например, не-secure context), поэтому есть фолбэки. */
export function uuid(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const random = (Math.random() * 16) | 0;
    const value = ch === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
