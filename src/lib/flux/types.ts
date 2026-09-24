import type { Edge, Node } from '@xyflow/react';

export type FluxNodeType = 'entrada' | 'template' | 'exportar';
export type EntradaFieldType = 'text' | 'textarea' | 'number' | 'list';
export type ExportFormat = 'md' | 'html' | 'json';

export interface EntradaField {
  id: string;
  label: string;
  type: EntradaFieldType;
  required?: boolean;
  placeholder?: string;
}

export interface EntradaConfig { fields: EntradaField[]; }
export interface TemplateConfig { template: string; }
export interface ExportarConfig { format: ExportFormat; name: string; }
export type FluxNodeConfig = EntradaConfig | TemplateConfig | ExportarConfig;

interface FluxNodeCommon {
  title: string;
  description: string;
  key: string;
  [key: string]: unknown;
}

export interface EntradaNodeData extends FluxNodeCommon {
  nodeType: 'entrada';
  config: EntradaConfig;
}

export interface TemplateNodeData extends FluxNodeCommon {
  nodeType: 'template';
  config: TemplateConfig;
}

export interface ExportarNodeData extends FluxNodeCommon {
  nodeType: 'exportar';
  config: ExportarConfig;
}

export type FluxNodeData = EntradaNodeData | TemplateNodeData | ExportarNodeData;
export type FluxNode = Node<FluxNodeData, 'flux'>;
export type FluxEdge = Edge;

export interface FluxGraph {
  nodes: FluxNode[];
  edges: FluxEdge[];
}

export interface RunInput {
  [key: string]: unknown;
}

export interface StepExecution {
  nodeId: string;
  nodeType: FluxNodeType;
  input: unknown;
  output: unknown;
}

export interface ExecutionResult {
  outputs: Record<string, unknown>;
  steps: StepExecution[];
}
