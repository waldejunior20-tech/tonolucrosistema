// validate-image.ts — Valida imagem base64 recebida do WhatsApp
// Uso no n8n Code node:
//   const result = validateImage(base64String);
//   if (!result.valid) return [{ json: { error: result.error } }];

export interface ImageValidation {
  valid: boolean;
  error?: string;
  mimeType?: string;
  sizeKb?: number;
}

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_KB = 10_240; // 10MB

export function validateImage(base64OrDataUrl: string): ImageValidation {
  if (!base64OrDataUrl || typeof base64OrDataUrl !== "string") {
    return { valid: false, error: "Imagem vazia ou inválida" };
  }

  let mime = "image/jpeg";
  let raw = base64OrDataUrl;

  // Se veio como data URL, extrair mime e base64
  const dataUrlMatch = base64OrDataUrl.match(
    /^data:(image\/\w+);base64,(.+)$/,
  );
  if (dataUrlMatch) {
    mime = dataUrlMatch[1];
    raw = dataUrlMatch[2];
  }

  // Verificar MIME
  if (!ALLOWED_MIMES.includes(mime)) {
    return {
      valid: false,
      error: `Formato ${mime} não suportado. Use JPEG, PNG ou WebP.`,
    };
  }

  // Verificar tamanho (base64 = ~4/3 do original)
  const sizeKb = Math.round((raw.length * 3) / 4 / 1024);
  if (sizeKb > MAX_SIZE_KB) {
    return {
      valid: false,
      error: `Imagem muito grande (${sizeKb}KB). Máximo: ${MAX_SIZE_KB}KB.`,
    };
  }

  // Verificar se é base64 válido
  try {
    atob(raw.slice(0, 100)); // testa decodificação dos primeiros bytes
  } catch {
    return { valid: false, error: "Base64 inválido" };
  }

  return { valid: true, mimeType: mime, sizeKb };
}
