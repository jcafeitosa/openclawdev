/**
 * GitHub Actions integration tool.
 * Allows agents to trigger, monitor, and read workflow runs.
 */

import { z } from "zod";
import { zodToToolJsonSchema } from "../schema/zod-tool-schema.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult } from "./common.js";

const GitHubActionsZodSchema = z.object({
  action: z.enum(["trigger", "status", "logs", "list-workflows"]),
  owner: z.string().describe("GitHub repo owner"),
  repo: z.string().describe("GitHub repo name"),
  workflow_id: z.string().optional().describe("Workflow file name or ID"),
  run_id: z.number().optional().describe("Specific run ID for status/logs"),
  ref: z.string().optional().describe("Git ref (branch/tag) for trigger"),
  inputs: z.record(z.string(), z.string()).optional().describe("Workflow dispatch inputs"),
});

export const GitHubActionsToolSchema = zodToToolJsonSchema(GitHubActionsZodSchema);

export type GitHubActionsToolInput = z.infer<typeof GitHubActionsZodSchema>;

export const GITHUB_ACTIONS_TOOL_NAME = "github_actions";

export const GITHUB_ACTIONS_TOOL_DESCRIPTION = `Interact with GitHub Actions workflows. Actions:
- trigger: Dispatch a workflow run
- status: Check status of a workflow run
- logs: Fetch logs from a workflow run
- list-workflows: List available workflows in a repo`;

/**
 * Execute the GitHub Actions tool.
 * Requires GITHUB_TOKEN environment variable to be set.
 */
export async function executeGitHubActionsTool(
  input: GitHubActionsToolInput,
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { ok: false, error: "GITHUB_TOKEN environment variable is required" };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const baseUrl = `https://api.github.com/repos/${input.owner}/${input.repo}`;

  try {
    switch (input.action) {
      case "list-workflows": {
        const resp = await fetch(`${baseUrl}/actions/workflows`, { headers });
        if (!resp.ok) {
          return {
            ok: false,
            error: `GitHub API error: ${resp.status} ${resp.statusText}`,
          };
        }
        const data = (await resp.json()) as {
          workflows: Array<{
            id: number;
            name: string;
            state: string;
            path: string;
          }>;
        };
        return {
          ok: true,
          result: data.workflows.map((w) => ({
            id: w.id,
            name: w.name,
            state: w.state,
            path: w.path,
          })),
        };
      }

      case "trigger": {
        if (!input.workflow_id) {
          return { ok: false, error: "workflow_id required for trigger" };
        }
        const ref = input.ref ?? "main";
        const resp = await fetch(`${baseUrl}/actions/workflows/${input.workflow_id}/dispatches`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ ref, inputs: input.inputs ?? {} }),
        });
        if (!resp.ok) {
          const body = await resp.text();
          return { ok: false, error: `Trigger failed: ${resp.status} ${body}` };
        }
        return {
          ok: true,
          result: { message: `Workflow ${input.workflow_id} triggered on ${ref}` },
        };
      }

      case "status": {
        if (!input.run_id) {
          return { ok: false, error: "run_id required for status" };
        }
        const resp = await fetch(`${baseUrl}/actions/runs/${input.run_id}`, { headers });
        if (!resp.ok) {
          return {
            ok: false,
            error: `Status check failed: ${resp.status}`,
          };
        }
        const data = (await resp.json()) as {
          id: number;
          status: string;
          conclusion: string | null;
          html_url: string;
          created_at: string;
          updated_at: string;
          run_started_at: string;
        };
        return {
          ok: true,
          result: {
            id: data.id,
            status: data.status,
            conclusion: data.conclusion,
            url: data.html_url,
            created_at: data.created_at,
            updated_at: data.updated_at,
          },
        };
      }

      case "logs": {
        if (!input.run_id) {
          return { ok: false, error: "run_id required for logs" };
        }
        const resp = await fetch(`${baseUrl}/actions/runs/${input.run_id}/jobs`, { headers });
        if (!resp.ok) {
          return {
            ok: false,
            error: `Logs fetch failed: ${resp.status}`,
          };
        }
        const data = (await resp.json()) as {
          jobs: Array<{
            id: number;
            name: string;
            status: string;
            conclusion: string | null;
            started_at: string;
            completed_at: string;
            steps: Array<{
              name: string;
              status: string;
              conclusion: string | null;
            }>;
          }>;
        };
        return {
          ok: true,
          result: data.jobs.map((j) => ({
            name: j.name,
            status: j.status,
            conclusion: j.conclusion,
            steps: j.steps?.map((s) => ({
              name: s.name,
              status: s.status,
              conclusion: s.conclusion,
            })),
          })),
        };
      }
    }
  } catch (err) {
    return {
      ok: false,
      error: `GitHub API error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Create the GitHub Actions tool for agent use.
 */
export function createGitHubActionsTool(): AnyAgentTool {
  return {
    label: "GitHub Actions",
    name: GITHUB_ACTIONS_TOOL_NAME,
    description: GITHUB_ACTIONS_TOOL_DESCRIPTION,
    parameters: GitHubActionsToolSchema,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const parsed = GitHubActionsZodSchema.parse(params);
      const result = await executeGitHubActionsTool(parsed);
      return jsonResult(result);
    },
  };
}
