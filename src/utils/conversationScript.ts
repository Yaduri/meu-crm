export interface ScriptStep {
  type: 'message' | 'wait';
  title: string;
  content: string;
  stepNumber?: number;
}

export function extractFirstMessageFromScript(rawText: string): string {
  if (!rawText) return '';
  if (rawText.includes('[MENSAGEM 1') || rawText.includes('Mensagem 1:')) {
    const cleaned = rawText
      .replace(/^[\s\S]*?(?:\[MENSAGEM 1[^\]]*\]|Mensagem 1:?)\s*/i, '')
      .split(/(?:---|\[AGUARDAR|\[MENSAGEM 2|Mensagem 2:)/i)[0];
    return cleaned.trim();
  }
  return rawText;
}

export function parseConversationScript(rawText: string): ScriptStep[] | null {
  if (!rawText) return null;
  const hasStepMarker =
    rawText.includes('[MENSAGEM 1') ||
    rawText.includes('[AGUARDAR') ||
    rawText.includes('---');

  if (!hasStepMarker) return null;

  const steps: ScriptStep[] = [];
  const lines = rawText.split('\n');

  let currentType: 'message' | 'wait' | null = null;
  let currentTitle = '';
  let currentStepNumber = 1;
  let currentBuffer: string[] = [];

  const flush = () => {
    if (currentType) {
      const content = currentBuffer.join('\n').trim();
      if (content || currentType === 'wait') {
        steps.push({
          type: currentType,
          title: currentTitle,
          content: content || 'Aguarde o cliente responder antes de enviar a próxima etapa.',
          stepNumber: currentType === 'message' ? currentStepNumber : undefined,
        });
        if (currentType === 'message') {
          currentStepNumber++;
        }
      }
      currentBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^\[MENSAGEM\s*\d+/i.test(trimmed)) {
      flush();
      currentType = 'message';
      currentTitle = trimmed.replace(/^\[|\]$/g, '');
    } else if (/^\[AGUARDAR/i.test(trimmed)) {
      flush();
      currentType = 'wait';
      currentTitle = trimmed.replace(/^\[|\]$/g, '');
    } else if (trimmed === '---') {
      // Separador visual
      continue;
    } else {
      if (currentType) {
        currentBuffer.push(line);
      } else {
        // Texto inicial antes de qualquer marcador
        currentType = 'message';
        currentTitle = 'Mensagem 1';
        currentBuffer.push(line);
      }
    }
  }

  flush();
  return steps.length > 0 ? steps : null;
}
