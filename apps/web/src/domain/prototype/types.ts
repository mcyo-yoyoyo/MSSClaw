/** 与根目录 index.html 设计稿对齐的原始种子类型（单一数据源） */

export type EfficiencyCategory = 'office' | 'manage' | 'process' | 'experience';

export type HomeCategory = 'gtm' | 'mkt' | 'ecommerce' | 'retail' | 'service' | 'channel' | 'hr';

export interface PrototypeAgentSeed {
  id: string;
  name: string;
  desc: string;
  category: EfficiencyCategory;
  bizLine: string;
  homeTag: HomeCategory;
  author: string;
  published: boolean;
  invokes: number;
  skillIds: string[];
  chatId: string;
  icon: string;
  color: string;
  systemPrompt?: string;
}

export interface PrototypeSkillSeed {
  id: string;
  name: string;
  desc: string;
  category: EfficiencyCategory;
  command: string;
  author: string;
  version: string;
  connector: string;
  published: boolean;
  invokes: number;
  icon: string;
  tags: string[];
}

export interface PrototypeKbCollection {
  id: string;
  name: string;
  icon: string;
  desc?: string;
}

export interface PrototypeKbDocument {
  id: string;
  title: string;
  desc: string;
  collection: string;
  type: string;
  size: string;
  pages: number;
  clearance: string;
  indexed: boolean;
  chunks: number;
  tags: string[];
  updatedAt: string;
  author: string;
  chunkTexts?: string[];
}

export interface PrototypeAutomation {
  id: string;
  name: string;
  desc: string;
  agentId: string;
  skillIds: string[];
  schedule: string;
  enabled: boolean;
  lastRun: string;
}

export interface PrototypeWorkspace {
  id: string;
  label: string;
  short: string;
}
