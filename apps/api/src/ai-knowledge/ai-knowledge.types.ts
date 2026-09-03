export type AiKnowledgeScenarioId =
  | 'gtm-sellout'
  | 'ecommerce-voc'
  | 'mkt-campaign'
  | 'generic';

export type DemandFieldKey =
  | 'problem'
  | 'goal'
  | 'currentMethod'
  | 'inputs'
  | 'aiRole'
  | 'humanCheckpoint';

export type AiKnowledgeMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
};

export type DemandSummary = Record<DemandFieldKey, string> & {
  title: string;
  domain: string;
  pendingKeys: DemandFieldKey[];
};

export type DemandDraft = {
  id: string;
  scenarioId: AiKnowledgeScenarioId;
  originalQuestion: string;
  demand: DemandSummary;
  messages: AiKnowledgeMessage[];
  clarificationCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SolutionResource = {
  id?: string;
  kind: 'case' | 'tool' | 'skill' | 'agent';
  label: string;
  url?: string;
  description?: string;
  evidence?: string;
  capabilities?: string[];
  scenarios?: string[];
  bestFor?: string;
  caseApproach?: string;
  caseLearnings?: string;
  caseResult?: string;
  toolsUsed?: string[];
  relevanceScore?: number;
  matchReasons?: string[];
};

export type SolutionAction = {
  id: string;
  title: string;
  owner: string;
  input?: string;
  capability?: string;
  output: string;
  resources?: SolutionResource[];
};

export type SolutionDiagnosis = {
  need: string;
  currentSituation: string;
  keyProblems: string[];
  solutionDirection: string;
};

export type SolutionToolRecommendation = {
  id: string;
  resource: SolutionResource;
  problemSolved: string;
  introduction: string;
  howToUse: string[];
  output: string;
  expectedEffect: string;
};

export type SolutionCaseInsight = {
  id: string;
  resource: SolutionResource;
  similarProblem: string;
  approach: string;
  result: string;
  lessons: string[];
  applicability: string;
  toolsUsed?: string[];
};

export type AiKnowledgeSolution = {
  id: string;
  scenarioId: AiKnowledgeScenarioId;
  title: string;
  domain: string;
  maturity: '已验证方案' | '有依据建议' | '探索性建议';
  generationSource: 'llm' | 'rule';
  model?: string;
  createdAt: string;
  originalQuestion: string;
  demand: DemandSummary;
  messages: AiKnowledgeMessage[];
  target: string;
  actions: SolutionAction[];
  confirmations: string[];
  evidence: SolutionResource[];
  diagnosis?: SolutionDiagnosis;
  toolRecommendations?: SolutionToolRecommendation[];
  caseInsights?: SolutionCaseInsight[];
};

export type AiKnowledgeActor = {
  key: string;
  type: 'user' | 'guest';
  userId?: string;
};
