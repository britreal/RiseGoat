const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getKeyBytes(): Uint8Array {
  const raw = Deno.env.get("SMTP_ENCRYPTION_KEY");
  if (!raw) throw new Error("SMTP_ENCRYPTION_KEY não configurada");
  const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  if (bytes.length !== 32) throw new Error("SMTP_ENCRYPTION_KEY deve ser uma chave base64 de 32 bytes");
  return bytes;
}

export async function encryptSecret(value: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", getKeyBytes(), "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(value)));
  return [btoa(String.fromCharCode(...iv)), btoa(String.fromCharCode(...ciphertext))].join(".");
}

export async function decryptSecret(value: string): Promise<string> {
  const [ivPart, dataPart] = value.split(".");
  if (!ivPart || !dataPart) throw new Error("Credencial SMTP inválida");
  const iv = Uint8Array.from(atob(ivPart), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(dataPart), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", getKeyBytes(), "AES-GCM", false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return decoder.decode(plaintext);
}
