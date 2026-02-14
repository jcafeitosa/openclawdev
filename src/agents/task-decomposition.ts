/**
 * Intelligent task decomposition engine.
 *
 * Analyzes complex tasks and generates a subtask DAG (directed acyclic graph)
 * with dependency ordering and agent assignment.
 *
 * Flow:
 * 1. Classify task complexity (trivial/moderate/complex)
 * 2. If complex, use LLM to decompose into subtasks with dependencies
 * 3. Validate DAG (no cycles)
 * 4. Map subtasks to agents via capabilities registry
 * 5. Return ordered execution plan
 */

import { findBestAgentForTask, findTopAgentsForTask } from "./capabilities-registry.js";
import { classifyComplexity, classifyTask, type TaskComplexity } from "./task-classifier.js";

// ── Types ──

export type SubtaskNode = {
  id: string;
  description: string;
  dependencies: string[];
  requiredCapabilities: string[];
  /** Assigned agent ID (resolved via capabilities registry). */
  assignedAgent?: string;
  /** Confidence of the agent assignment (0-1). */
  assignmentConfidence?: number;
};

export type DecompositionResult = {
  /** Whether decomposition was applied. */
  decomposed: boolean;
  /** Original task complexity. */
  complexity: TaskComplexity;
  /** Ordered subtasks (topologically sorted). Empty if not decomposed. */
  subtasks: SubtaskNode[];
  /** Execution phases: groups of subtasks that can run in parallel. */
  phases: SubtaskNode[][];
  /** Reason decomposition was or was not applied. */
  reason: string;
};

// ── DAG Validation ──

/**
 * Topological sort of subtasks. Returns sorted array or null if cycle detected.
 */
export function topologicalSort(subtasks: SubtaskNode[]): SubtaskNode[] | null {
  const nodeMap = new Map<string, SubtaskNode>();
  for (const node of subtasks) {
    nodeMap.set(node.id, node);
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sorted: SubtaskNode[] = [];

  function visit(id: string): boolean {
    if (visited.has(id)) {
      return true;
    }
    if (visiting.has(id)) {
      return false; // cycle detected
    }
    visiting.add(id);

    const node = nodeMap.get(id);
    if (!node) {
      return false;
    }

    for (const dep of node.dependencies) {
      if (!visit(dep)) {
        return false;
      }
    }

    visiting.delete(id);
    visited.add(id);
    sorted.push(node);
    return true;
  }

  for (const node of subtasks) {
    if (!visit(node.id)) {
      return null; // cycle
    }
  }

  return sorted;
}

/**
 * Validate a subtask DAG: check for cycles, missing dependency references,
 * and duplicate IDs.
 */
export function validateDag(subtasks: SubtaskNode[]): {
  valid: boolean;
  error?: string;
} {
  const ids = new Set<string>();
  for (const node of subtasks) {
    if (ids.has(node.id)) {
      return { valid: false, error: `Duplicate subtask ID: ${node.id}` };
    }
    ids.add(node.id);
  }

  for (const node of subtasks) {
    for (const dep of node.dependencies) {
      if (!ids.has(dep)) {
        return {
          valid: false,
          error: `Subtask "${node.id}" depends on unknown subtask "${dep}"`,
        };
      }
    }
  }

  const sorted = topologicalSort(subtasks);
  if (!sorted) {
    return { valid: false, error: "Dependency cycle detected" };
  }

  return { valid: true };
}

// ── Execution phases ──

/**
 * Group subtasks into parallel execution phases based on dependencies.
 * Each phase contains subtasks whose dependencies are all in previous phases.
 */
export function computeExecutionPhases(subtasks: SubtaskNode[]): SubtaskNode[][] {
  const sorted = topologicalSort(subtasks);
  if (!sorted) {
    return [subtasks]; // fallback: all in one phase
  }

  const phases: SubtaskNode[][] = [];
  const assigned = new Set<string>();

  while (assigned.size < sorted.length) {
    const phase: SubtaskNode[] = [];
    for (const node of sorted) {
      if (assigned.has(node.id)) {
        continue;
      }
      const depsReady = node.dependencies.every((dep) => assigned.has(dep));
      if (depsReady) {
        phase.push(node);
      }
    }
    if (phase.length === 0) {
      break; // safety: avoid infinite loop
    }
    for (const node of phase) {
      assigned.add(node.id);
    }
    phases.push(phase);
  }

  return phases;
}

// ── Agent assignment ──

/**
 * Assign agents to subtasks based on capabilities matching.
 */
export function assignAgentsToSubtasks(subtasks: SubtaskNode[]): SubtaskNode[] {
  return subtasks.map((node) => {
    const match = findBestAgentForTask(node.description);
    if (match && match.confidence > 0.3) {
      return {
        ...node,
        assignedAgent: match.agentId,
        assignmentConfidence: match.confidence,
      };
    }
    return node;
  });
}

// ── Main decomposition ──

/**
 * Analyze whether a task should be decomposed and return the plan.
 *
 * This function performs local analysis only (no LLM call).
 * For LLM-based decomposition, use the task_decompose tool.
 */
export function analyzeTaskForDecomposition(task: string): DecompositionResult {
  const complexity = classifyComplexity(task);
  const taskType = classifyTask(task);

  if (complexity === "trivial") {
    return {
      decomposed: false,
      complexity,
      subtasks: [],
      phases: [],
      reason: "Task is trivial — no decomposition needed",
    };
  }

  if (complexity === "moderate") {
    // For moderate tasks, check if multiple agents would be beneficial
    const topAgents = findTopAgentsForTask(task, 3);
    if (topAgents.length <= 1) {
      return {
        decomposed: false,
        complexity,
        subtasks: [],
        phases: [],
        reason: "Task is moderate complexity with single-agent coverage — no decomposition needed",
      };
    }
  }

  // Complex task or moderate with multi-agent potential: recommend decomposition
  return {
    decomposed: true,
    complexity,
    subtasks: [],
    phases: [],
    reason: `Task classified as ${complexity} (${taskType}) — LLM decomposition recommended. Use the task_decompose tool to generate subtask DAG.`,
  };
}

/**
 * Process an LLM-generated decomposition result.
 * Validates the DAG, assigns agents, and computes execution phases.
 */
export function processDecomposition(
  rawSubtasks: Array<{
    id: string;
    description: string;
    dependencies?: string[];
    requiredCapabilities?: string[];
  }>,
): DecompositionResult {
  // Normalize
  const subtasks: SubtaskNode[] = rawSubtasks.map((raw) => ({
    id: raw.id,
    description: raw.description,
    dependencies: raw.dependencies ?? [],
    requiredCapabilities: raw.requiredCapabilities ?? [],
  }));

  // Validate DAG
  const validation = validateDag(subtasks);
  if (!validation.valid) {
    return {
      decomposed: false,
      complexity: "complex",
      subtasks: [],
      phases: [],
      reason: `Invalid decomposition: ${validation.error}`,
    };
  }

  // Assign agents
  const assigned = assignAgentsToSubtasks(subtasks);

  // Compute parallel phases
  const phases = computeExecutionPhases(assigned);

  return {
    decomposed: true,
    complexity: "complex",
    subtasks: assigned,
    phases,
    reason: `Decomposed into ${assigned.length} subtasks across ${phases.length} execution phases`,
  };
}
