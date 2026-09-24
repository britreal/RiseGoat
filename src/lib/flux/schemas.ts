import { z } from 'zod';
import type { FluxNode, FluxNodeConfig, FluxNodeType } from './types';

export const EntradaFieldSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  type: z.enum(['text', 'textarea', 'number', 'list']),
  required: z.boolean().optional().default(false),
  placeholder: z.string().max(240).optional(),
});

export const EntradaConfigSchema = z.object({
  fields: z.array(EntradaFieldSchema).min(1).max(30),
});

export const TemplateConfigSchema = z.object({
  template: z.string().min(1).max(50000),
});

export const ExportarConfigSchema = z.object({
  format: z.enum(['md', 'html', 'json']),
  name: z.string().min(1).max(120),
});

export function validateNodeConfig(node: FluxNode) {
  switch (node.data.nodeType) {
    case 'entrada': return EntradaConfigSchema.safeParse(node.data.config);
    case 'template': return TemplateConfigSchema.safeParse(node.data.config);
    case 'exportar': return ExportarConfigSchema.safeParse(node.data.config);
  }
}

export function parseConfig(nodeType: FluxNodeType, config: FluxNodeConfig) {
  if (nodeType === 'entrada') return EntradaConfigSchema.parse(config);
  if (nodeType === 'template') return TemplateConfigSchema.parse(config);
  return ExportarConfigSchema.parse(config);
}
