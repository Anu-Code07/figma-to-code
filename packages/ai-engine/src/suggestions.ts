export interface AISuggestion {
  id: string;
  type:
    | 'naming'
    | 'accessibility'
    | 'performance'
    | 'architecture'
    | 'responsiveness'
    | 'duplication'
    | 'token';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  nodeId?: string;
  autoFixable: boolean;
}

export function createSuggestion(
  partial: Omit<AISuggestion, 'id'> & { id?: string },
): AISuggestion {
  return {
    id: partial.id ?? `suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...partial,
  };
}
