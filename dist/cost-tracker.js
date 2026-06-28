// @bun
// src/cost-tracker.ts
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

class CostTracker {
  projectDir;
  constructor(projectDir) {
    this.projectDir = projectDir;
  }
  getProjectPath(id) {
    return join(this.projectDir, id, "project.json");
  }
  async readState(id) {
    const raw = await readFile(this.getProjectPath(id), "utf-8");
    return JSON.parse(raw);
  }
  async writeState(id, state) {
    await writeFile(this.getProjectPath(id), JSON.stringify(state, null, 2));
  }
  async canAfford(projectId, credits) {
    const state = await this.readState(projectId);
    const remaining = state.budgetCredits - state.creditsSpent;
    const overBudget = credits - remaining;
    return {
      allowed: credits <= remaining,
      remaining,
      overBudget: Math.max(0, overBudget)
    };
  }
  async recordSpend(projectId, phase, action, credits) {
    const state = await this.readState(projectId);
    if (state.creditsSpent + credits > state.budgetCredits) {
      throw new Error(`Budget exceeded! Attempted: ${state.creditsSpent + credits}, Budget: ${state.budgetCredits}`);
    }
    state.creditsSpent += credits;
    state.costLog.push({
      phase,
      action,
      credits,
      timestamp: new Date().toISOString()
    });
    await this.writeState(projectId, state);
    return {
      newTotal: state.creditsSpent,
      remaining: state.budgetCredits - state.creditsSpent
    };
  }
  async getSummary(projectId) {
    const state = await this.readState(projectId);
    const byPhase = {};
    for (const entry of state.costLog) {
      byPhase[entry.phase] = (byPhase[entry.phase] || 0) + entry.credits;
    }
    return {
      total: state.creditsSpent,
      budget: state.budgetCredits,
      remaining: state.budgetCredits - state.creditsSpent,
      percentUsed: Math.round(state.creditsSpent / state.budgetCredits * 100),
      byPhase,
      entries: state.costLog
    };
  }
}
export {
  CostTracker
};
