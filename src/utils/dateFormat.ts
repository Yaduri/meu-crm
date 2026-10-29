/**
 * Formata com segurança qualquer string de data (ISO com horário ou YYYY-MM-DD) para DD/MM/YYYY
 */
export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Formata data no formato curto DD/MM (ex: 29/10) para badges e cards
 */
export function formatDateShortBR(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}
