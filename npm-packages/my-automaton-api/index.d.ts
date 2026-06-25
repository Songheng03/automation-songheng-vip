declare module 'my-automaton-api' {
  interface AutomatonOptions {
    apiKey?: string;
    baseUrl?: string;
    fetch?: any;
  }

  interface AnalysisResult {
    summary: string;
    sentiment: string;
    topics: string[];
    keyPhrases: string[];
  }

  interface SummaryResult {
    summary: string;
    originalLength: number;
    summaryLength: number;
  }

  interface ReviewResult {
    issues: Array<{
      line: number;
      severity: string;
      message: string;
      suggestion: string;
    }>;
    score: number;
  }

  interface SecurityResult {
    vulnerabilities: Array<{
      type: string;
      severity: string;
      line: number;
      description: string;
      fix: string;
    }>;
    riskScore: number;
  }

  interface ExplainResult {
    explanation: string;
    complexity: string;
    keyConcepts: string[];
  }

  interface RefactorResult {
    suggestions: Array<{
      location: string;
      issue: string;
      suggestion: string;
      code: string;
    }>;
  }

  interface ComplexityResult {
    score: number;
    cyclomatic: number;
    cognitive: number;
    maintainability: string;
  }

  class AutomatonError extends Error {
    status: number;
    code: string;
    constructor(message: string, status: number, code: string);
  }

  class Automaton {
    constructor(options?: AutomatonOptions);

    analyze(text: string, mode?: string): Promise<AnalysisResult>;
    summarize(text: string, style?: string): Promise<SummaryResult>;
    review(code: string, language?: string): Promise<ReviewResult>;
    security(code: string, language?: string): Promise<SecurityResult>;
    explain(code: string, language?: string): Promise<ExplainResult>;
    refactor(code: string, language?: string): Promise<RefactorResult>;
    complexity(code: string, language?: string): Promise<ComplexityResult>;

    static free(endpoint: string, data: any): Promise<any>;
    static pricing: Record<string, { credits: number; usd: string }>;
  }

  export default Automaton;
  export { Automaton, AutomatonError };
}
