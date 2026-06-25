// my-automaton TypeScript SDK
// Full type-safe client for the AI API with x402 payment support

export interface AnalyzeRequest {
  text: string;
  mode?: 'analyze' | 'sentiment' | 'entities' | 'keywords' | 'all';
}

export interface SummarizeRequest {
  text: string;
  max_length?: number;
  style?: 'brief' | 'detailed' | 'bullets';
}

export interface ReviewRequest {
  code: string;
  language?: string;
  focus?: string[];
}

export interface SecurityRequest {
  code: string;
  language?: string;
}

export interface ExplainRequest {
  code: string;
  language?: string;
  detail?: 'simple' | 'detailed';
}

export interface RefactorRequest {
  code: string;
  language?: string;
  goals?: string[];
}

export interface ComplexityRequest {
  code: string;
  language?: string;
}

export interface BatchRequest {
  items: Array<{
    text: string;
    mode: 'analyze' | 'sentiment' | 'entities' | 'keywords';
  }>;
}

export interface RenderRequest {
  markdown: string;
  template?: 'default' | 'blog' | 'docs' | 'minimal';
}

export interface APIResponse<T = any> {
  result: T;
  metadata?: {
    tokens_used?: number;
    processing_time?: string;
    model?: string;
  };
}

export interface PaymentRequired {
  error: string;
  amount: string;
  currency: string;
  chain: string;
  address: string;
  endpoint: string;
}

export type PaymentCallback = (payment: PaymentRequired) => Promise<string>;

export class AutomatonClient {
  private baseUrl: string;
  private paymentCallback?: PaymentCallback;
  private freeEndpoint: string;

  constructor(baseUrl = 'https://automation.songheng.vip') {
    this.baseUrl = baseUrl;
    this.freeEndpoint = `${baseUrl}/free/v1`;
  }

  /**
   * Set a callback to handle x402 payments automatically.
   * The callback receives payment details and should return the transaction hash.
   */
  onPayment(callback: PaymentCallback): this {
    this.paymentCallback = callback;
    return this;
  }

  private async request<T>(endpoint: string, data: any, isFree = false): Promise<APIResponse<T>> {
    const url = isFree
      ? `${this.freeEndpoint}${endpoint}`
      : `${this.baseUrl}/v1${endpoint}`;

    let resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (resp.status === 402 && this.paymentCallback && !isFree) {
      const payment: PaymentRequired = await resp.json() as PaymentRequired;
      const txHash = await this.paymentCallback(payment);

      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-X402-Payment': txHash,
        },
        body: JSON.stringify(data),
      });
    }

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(`API Error ${resp.status}: ${(err as any).error || resp.statusText}`);
    }

    return resp.json() as Promise<APIResponse<T>>;
  }

  // === Free tier methods (3/day per IP) ===

  async analyzeFree(text: string, mode?: AnalyzeRequest['mode']) {
    return this.request<any>('/analyze', { text, mode }, true);
  }

  async summarizeFree(text: string, maxLength?: number) {
    return this.request<any>('/summarize', { text, max_length: maxLength }, true);
  }

  async reviewFree(code: string, language?: string) {
    return this.request<any>('/review', { code, language }, true);
  }

  async securityFree(code: string, language?: string) {
    return this.request<any>('/security', { code, language }, true);
  }

  async explainFree(code: string, language?: string) {
    return this.request<any>('/explain', { code, language }, true);
  }

  // === Premium methods (x402 payment) ===

  async analyze(text: string, mode?: AnalyzeRequest['mode']) {
    return this.request<any>('/analyze', { text, mode });
  }

  async summarize(text: string, maxLength?: number, style?: SummarizeRequest['style']) {
    return this.request<any>('/summarize', { text, max_length: maxLength, style });
  }

  async review(code: string, language?: string, focus?: string[]) {
    return this.request<any>('/review', { code, language, focus });
  }

  async security(code: string, language?: string) {
    return this.request<any>('/security', { code, language });
  }

  async explain(code: string, language?: string, detail?: ExplainRequest['detail']) {
    return this.request<any>('/explain', { code, language, detail });
  }

  async refactor(code: string, language?: string, goals?: string[]) {
    return this.request<any>('/refactor', { code, language, goals });
  }

  async complexity(code: string, language?: string) {
    return this.request<any>('/complexity', { code, language });
  }

  async batch(items: BatchRequest['items']) {
    return this.request<any>('/batch', { items });
  }

  async render(markdown: string, template?: RenderRequest['template']) {
    return this.request<any>('/render', { markdown, template });
  }

  // === Health check ===

  async health(): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/api/health`);
    return resp.json();
  }
}

// === Usage Example ===
/*
import { AutomatonClient } from './sdk';

const client = new AutomatonClient();

// Free tier
const review = await client.reviewFree(`
  function add(a, b) { return a + b }
`, 'javascript');

console.log(review.result);

// Premium with auto-payment
client.onPayment(async (payment) => {
  console.log(`Sending ${payment.amount} USDC...`);
  const txHash = await sendUSDC(payment.address, parseFloat(payment.amount));
  return txHash;
});

const analysis = await client.analyze('Your text here', 'all');
console.log(analysis.result);
*/

export default AutomatonClient;
