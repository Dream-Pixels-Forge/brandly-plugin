import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = join(__filename, "..", "..", "..", "..");
const PROJECTS_DIR = join(WORKSPACE_ROOT, ".brandly", "projects");
const DIST_DIR = join(__dirname, "..", "dist");

function readProject(id: string): any | null {
  const filePath = join(PROJECTS_DIR, id, "project.json");
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

function listProjectDirs(): string[] {
  if (!existsSync(PROJECTS_DIR)) return [];
  return readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((e: any) => e.isDirectory())
    .map((e: any) => e.name);
}

function mapProjectToSummary(raw: any, id: string) {
  return {
    id,
    name: raw.name || "Untitled Project",
    status: raw.status || "pending",
    currentPhase: raw.currentPhase || "init",
    budget: raw.budget || 0,
    spent: raw.spent || 0,
    provider: raw.provider || "Brandly",
    platform: raw.targetPlatforms || [],
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

function mapProjectToDetail(raw: any, id: string) {
  const summary = mapProjectToSummary(raw, id);
  return {
    ...summary,
    phases: raw.phases || {},
    targetPlatforms: raw.targetPlatforms || [],
  };
}

function computeProgress(raw: any, id: string) {
  const phases = (raw.phases as Record<string, any>) || {};
  const phaseOrder = ["init", "trends", "concept", "script", "asset", "audio", "re_edit", "validate", "publish", "done"];
  const totalPhases = phaseOrder.length;
  const completedPhases = phaseOrder.filter((p) => phases[p]?.status === "completed").length;
  const overallPercent = Math.round((completedPhases / totalPhases) * 100);
  const currentPhase = raw.currentPhase || "init";

  const phaseStatuses: Record<string, string> = {};
  for (const p of phaseOrder) {
    phaseStatuses[p] = phases[p]?.status || "pending";
  }

  let timeInCurrentPhase: string | null = null;
  const currentPhaseData = phases[currentPhase];
  if (currentPhaseData?.startedAt) {
    const elapsed = Date.now() - new Date(currentPhaseData.startedAt).getTime();
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    timeInCurrentPhase = `${minutes}m ${seconds}s`;
  }

  const remaining = phaseOrder.filter(
    (p) => !phases[p] || phases[p].status === "pending"
  ).length;

  let estimatedRemaining: string | null = null;
  if (completedPhases > 0 && remaining > 0) {
    const completed = phaseOrder.filter(
      (p) => phases[p]?.status === "completed" && phases[p]?.startedAt && phases[p]?.completedAt
    );
    if (completed.length > 0) {
      const totalTime = completed.reduce((sum, p) => {
        const start = new Date(phases[p].startedAt).getTime();
        const end = new Date(phases[p].completedAt).getTime();
        return sum + (end - start);
      }, 0);
      const avgPhaseTime = totalTime / completed.length;
      const estMs = avgPhaseTime * remaining;
      const estMin = Math.floor(estMs / 60000);
      const estSec = Math.floor((estMs % 60000) / 1000);
      estimatedRemaining = `~${estMin}m ${estSec}s`;
    }
  }

  let statusText = "Running";
  if (raw.status === "cancelled") statusText = "Project cancelled";
  else if (raw.status === "paused") statusText = "Project paused";
  else if (raw.status === "completed") statusText = "All phases complete";
  else statusText = `Phase ${completedPhases}/${totalPhases} (${overallPercent}%)`;

  return {
    projectId: id,
    projectStatus: raw.status,
    currentPhase,
    overallPercent,
    completedPhases,
    totalPhases,
    phases: phaseStatuses,
    timeInCurrentPhase,
    estimatedRemaining,
    status: statusText,
  };
}

export default {
  port: 5175,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({ status: "ok" });
    }

    if (url.pathname === "/api/projects" && request.method === "GET") {
      const ids = listProjectDirs();
      const projects = ids
        .map((id) => {
          const raw = readProject(id);
          if (!raw) return null;
          return mapProjectToSummary(raw, id);
        })
        .filter(Boolean);
      return Response.json(projects);
    }

    const projectMatch = url.pathname.match(/^\/api\/projects\/([^\/]+)$/);
    if (projectMatch && request.method === "GET") {
      const id = decodeURIComponent(projectMatch[1]);
      const raw = readProject(id);
      if (!raw) {
        return Response.json({ error: `Project not found: ${id}` }, { status: 404 });
      }
      return Response.json(mapProjectToDetail(raw, id));
    }

    const progressMatch = url.pathname.match(/^\/api\/projects\/([^\/]+)\/progress$/);
    if (progressMatch && request.method === "GET") {
      const id = decodeURIComponent(progressMatch[1]);
      const raw = readProject(id);
      if (!raw) {
        return Response.json({ error: `Project not found: ${id}` }, { status: 404 });
      }
      return Response.json(computeProgress(raw, id));
    }

    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    if (existsSync(DIST_DIR)) {
      const filePath = join(DIST_DIR, url.pathname === "/" ? "index.html" : url.pathname);
      if (existsSync(filePath)) {
        const ext = url.pathname.split(".").pop() || "";
        const contentType = {
          html: "text/html",
          js: "application/javascript",
          css: "text/css",
          svg: "image/svg+xml",
          png: "image/png",
          json: "application/json",
        }[ext] || "application/octet-stream";
        const file = readFileSync(filePath);
        return new Response(file, { headers: { "Content-Type": contentType } });
      }
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
};
