const flag = (value: string | undefined, fallback: boolean) => {
  if (value === undefined || value.trim() === '') return fallback;
  return value.trim().toLowerCase() === 'true';
};

/** Build-time flags. Public preview is opt-in; the complete directory stays behind authentication. */
export const FEATURES = {
  TABULEIRO: flag(import.meta.env.VITE_FEATURE_TABULEIRO, true),
  TABULEIRO_PUBLIC_PREVIEW: flag(import.meta.env.VITE_FEATURE_TABULEIRO_PUBLIC_PREVIEW, false),
  TABULEIRO_CIRCLE_NOTES: flag(import.meta.env.VITE_FEATURE_TABULEIRO_CIRCLE_NOTES, true),
  TABULEIRO_GRAPH_VIEW: flag(import.meta.env.VITE_FEATURE_TABULEIRO_GRAPH_VIEW, true),
} as const;
