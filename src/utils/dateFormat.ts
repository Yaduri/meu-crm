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

/**
 * Adiciona dias a uma data base e, se cair em sábado ou domingo, avança automaticamente para a próxima segunda-feira.
 * @param daysOffset Quantidade de dias a somar (ex: 1, 2, 3, 7). Se for 0 (hoje) e hoje for sábado/domingo, também joga pra segunda.
 * @param fromDate Data de partida (opcional, padrão: data atual)
 * @returns String no formato YYYY-MM-DD
 */
export function calcularDataFollowup(daysOffset: number = 0, fromDate: Date = new Date()): string {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth();
  const day = fromDate.getDate();

  const target = new Date(year, month, day + daysOffset, 12, 0, 0);

  const dayOfWeek = target.getDay(); // 0 = Domingo, 6 = Sábado
  if (dayOfWeek === 6) {
    // Sábado -> avança 2 dias para Segunda-feira
    target.setDate(target.getDate() + 2);
  } else if (dayOfWeek === 0) {
    // Domingo -> avança 1 dia para Segunda-feira
    target.setDate(target.getDate() + 1);
  }

  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Se uma data já existente (formato YYYY-MM-DD) cair em sábado ou domingo, avança para a próxima segunda-feira.
 */
export function ajustarSeFimDeSemana(dateStr?: string | null): string | undefined {
  if (!dateStr) return undefined;
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return dateStr;
  }

  const target = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  const dayOfWeek = target.getDay();
  if (dayOfWeek === 6) {
    target.setDate(target.getDate() + 2);
  } else if (dayOfWeek === 0) {
    target.setDate(target.getDate() + 1);
  } else {
    return clean;
  }

  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
