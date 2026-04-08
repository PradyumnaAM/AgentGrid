// Prices in USD per token
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o':             { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
  'gpt-4o-mini':        { input: 0.150 / 1_000_000, output: 0.600 / 1_000_000 },
  'gpt-4-turbo':        { input: 10.00 / 1_000_000, output: 30.00 / 1_000_000 },
  'gpt-3.5-turbo':      { input: 0.50 / 1_000_000,  output: 1.50 / 1_000_000 },
  'claude-3-5-sonnet':  { input: 3.00 / 1_000_000,  output: 15.00 / 1_000_000 },
  'claude-3-haiku':     { input: 0.25 / 1_000_000,  output: 1.25 / 1_000_000 },
};

const DEFAULT_PRICING = MODEL_PRICING['gpt-4o-mini'];

function getPricing(model?: string) {
  if (!model) return DEFAULT_PRICING;
  const key = Object.keys(MODEL_PRICING).find((k) => model.toLowerCase().includes(k));
  return key ? MODEL_PRICING[key] : DEFAULT_PRICING;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateCost(inputTokens: number, outputTokens: number, model?: string): number {
  const pricing = getPricing(model);
  return inputTokens * pricing.input + outputTokens * pricing.output;
}

export function estimateCostFromText(text: string, isOutput: boolean = false, model?: string): number {
  const tokens = estimateTokens(text);
  return isOutput ? estimateCost(0, tokens, model) : estimateCost(tokens, 0, model);
}

export function formatCost(usd: number): string {
  if (usd < 0.001) return `${(usd * 100).toFixed(3)}¢`;
  return `$${usd.toFixed(4)}`;
}
