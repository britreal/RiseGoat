import { create } from 'zustand';
import type { FluxGraph, FluxNode, FluxEdge } from './types';

interface FluxEditorState {
  nodes: FluxNode[];
  edges: FluxEdge[];
  selectedNodeId: string | null;
  past: FluxGraph[];
  future: FluxGraph[];
  setGraph: (graph: FluxGraph) => void;
  selectNode: (id: string | null) => void;
  mutate: (next: FluxGraph, previous?: FluxGraph) => void;
  undo: () => void;
  redo: () => void;
}

export const useFluxEditorStore = create<FluxEditorState>((set) => ({
  nodes: [], edges: [], selectedNodeId: null, past: [], future: [],
  setGraph: (graph) => set({ nodes: graph.nodes, edges: graph.edges, selectedNodeId: null, past: [], future: [] }),
  selectNode: (id) => set({ selectedNodeId: id }),
  mutate: (next, previous) => set((state) => ({
    nodes: next.nodes, edges: next.edges,
    past: previous && JSON.stringify(previous) !== JSON.stringify({ nodes: state.nodes, edges: state.edges })
      ? [...state.past.slice(-49), previous] : state.past,
    future: [],
  })),
  undo: () => set((state) => {
    const previous = state.past[state.past.length - 1];
    if (!previous) return state;
    const current = { nodes: state.nodes, edges: state.edges };
    return { nodes: previous.nodes, edges: previous.edges, past: state.past.slice(0, -1), future: [current, ...state.future.slice(0, 49)], selectedNodeId: null };
  }),
  redo: () => set((state) => {
    const next = state.future[0];
    if (!next) return state;
    const current = { nodes: state.nodes, edges: state.edges };
    return { nodes: next.nodes, edges: next.edges, past: [...state.past, current].slice(-50), future: state.future.slice(1), selectedNodeId: null };
  }),
}));
