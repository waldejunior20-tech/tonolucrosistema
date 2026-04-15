import { toast } from "sonner";

export const ERROR_CODES = {
  // AUTH
  "ERR-AUTH-001": "Erro ao fazer login",
  "ERR-AUTH-002": "Erro ao fazer login com Google",
  "ERR-AUTH-003": "As senhas não coincidem",
  "ERR-AUTH-004": "Erro ao criar conta",
  "ERR-AUTH-005": "Erro ao enviar email de recuperação",

  // CFG
  "ERR-CFG-001": "Erro ao salvar configurações",
  "ERR-CFG-002": "Erro ao salvar configurações de precificação",

  // INS
  "ERR-INS-001": "Erro ao cadastrar insumo",
  "ERR-INS-002": "Erro ao atualizar insumo",
  "ERR-INS-003": "Erro ao excluir insumo",
  "ERR-INS-004": "Preencha todos os campos obrigatórios",
  "ERR-INS-010": "Erro ao cadastrar insumo produzido",
  "ERR-INS-011": "Erro ao atualizar insumo produzido",
  "ERR-INS-012": "Erro ao excluir insumo produzido",
  "ERR-INS-013": "Preencha todos os campos obrigatórios",

  // FTP
  "ERR-FTP-001": "Erro ao cadastrar ficha técnica",
  "ERR-FTP-002": "Erro ao atualizar ficha técnica",
  "ERR-FTP-003": "Erro ao excluir ficha técnica",
  "ERR-FTP-004": "Preencha os campos obrigatórios",
  "ERR-FTP-010": "Erro ao cadastrar ficha técnica",
  "ERR-FTP-011": "Erro ao atualizar ficha técnica",
  "ERR-FTP-012": "Erro ao excluir ficha técnica",
  "ERR-FTP-013": "Preencha o nome do produto",

  // PRC
  "ERR-PRC-001": "Erro ao salvar configurações",
  "ERR-PRC-002": "Erro ao salvar preço",
  "ERR-PRC-010": "Erro ao salvar preço",
  "ERR-PRC-020": "Erro ao salvar preço",
  "ERR-PRC-021": "Erro ao salvar preço",

  // FIN
  "ERR-FIN-001": "Erro ao salvar lançamento",
  "ERR-FIN-002": "Erro ao salvar caixa rápido",
  "ERR-FIN-010": "Erro ao salvar lançamento",
  "ERR-FIN-011": "Erro ao salvar lançamentos",
  "ERR-FIN-020": "Erro ao salvar conta",

  // PRO
  "ERR-PRO-001": "Erro ao salvar promoção",
  "ERR-PRO-002": "Nome é obrigatório",
  "ERR-PRO-003": "Data de início é obrigatória",
  "ERR-PRO-004": "Selecione ao menos um produto",
  "ERR-PRO-010": "Erro ao salvar combo",
  "ERR-PRO-011": "Erro ao excluir combo",
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * Shows a toast with the error code and logs technical details to console.
 */
export function appError(code: ErrorCode, details?: unknown) {
  const message = ERROR_CODES[code];
  toast.error(`[${code}] ${message}`);
  console.error(`[${code}] ${message}`, details ?? "");
}
