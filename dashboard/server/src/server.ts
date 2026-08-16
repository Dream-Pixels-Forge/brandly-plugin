import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, rmSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = join(__filename, "..", "..", "..", "..");
const PROJECTS_DIR = join(WORKSPACE_ROOT, ".brandly", "projects");
const DIST_DIR = join(__dirname, "..", "dist");

const PHASE_ORDER = ["init", "trends", "concept", "script", "asset", "audio", "re_edit", "validate", "publish", "done"];

// SSE clients
const sseClients = new Set<ReadableStreamDefaultController>();

function broadcast(event: string, data: any) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const controller of sseClients) {
    try {
      controller.enqueue(new TextEncoder().encode(msg));
    } catch {
      sseClients.delete(controller);
    }
  }
}

function readProject(id: string): any | null {
  const filePath = join(PROJECTS_DIR, id, "project.json");
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function writeProject(id: string, data: any) {
  const dir = join(PROJECTS_DIR, id);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "project.json"), JSON.stringify(data, null, 2));
}

function listProjectDirs(): string[] {
  if (!existsSync(PROJECTS_DIR)) return [];
  return readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

function appendLog(projectId: string, entry: { icon: string; msg: string; ts: string }) {
  const dir = join(PROJECTS_DIR, projectId);
  if (!existsSync(dir)) return;
  const logPath = join(dir, "history.jsonl");
  const line = JSON.stringify(entry) + "\n";
  if (existsSync(logPath)) {
    const existing = readFileSync(logPath, "utf-8");
    writeFileSync(logPath, existing + line);
  } else {
    writeFileSync(logPath, line);
  }
}

function readLog(projectId: string): Array<{ icon: string; msg: string; ts: string }> {
  const logPath = join(PROJECTS_DIR, projectId, "history.jsonl");
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function readCosts(projectId: string): Array<{ phase: string; amount: number; description: string; ts: string }> {
  const costPath = join(PROJECTS_DIR, projectId, "costs.json");
  if (!existsSync(costPath)) return [];
  return JSON.parse(readFileSync(costPath, "utf-8"));
}

function appendCost(projectId: string, entry: { phase: string; amount: number; description: string; ts: string }) {
  const costs = readCosts(projectId);
  costs.push(entry);
  writeFileSync(join(PROJECTS_DIR, projectId, "costs.json"), JSON.stringify(costs, null, 2));
}

function listArtifacts(projectId: string): Array<{ name: string; size: number; ts: string }> {
  const artDir = join(PROJECTS_DIR, projectId, "artifacts");
  if (!existsSync(artDir)) return [];
  return readdirSync(artDir).map((name) => {
    const stat = require("node:fs").statSync(join(artDir, name));
    return { name, size: stat.size, ts: stat.mtime.toISOString() };
  });
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
  return {
    ...mapProjectToSummary(raw, id),
    phases: raw.phases || {},
    targetPlatforms: raw.targetPlatforms || [],
    description: raw.description || "",
    style: raw.style || "cinematic",
    shotCount: raw.shotCount || 5,
    imageAnalysis: raw.imageAnalysis || null,
  };
}

function computeProgress(raw: any, id: string) {
  const phases = raw.phases || {};
  const totalPhases = PHASE_ORDER.length;
  const completedPhases = PHASE_ORDER.filter((p) => phases[p]?.status === "completed").length;
  const overallPercent = Math.round((completedPhases / totalPhases) * 100);
  const currentPhase = raw.currentPhase || "init";

  const phaseStatuses: Record<string, string> = {};
  for (const p of PHASE_ORDER) {
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

  const remaining = PHASE_ORDER.filter((p) => !phases[p] || phases[p].status === "pending").length;

  let estimatedRemaining: string | null = null;
  if (completedPhases > 0 && remaining > 0) {
    const completed = PHASE_ORDER.filter(
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
    status:
      raw.status === "completed" ? "All phases complete" :
      raw.status === "cancelled" ? "Project cancelled" :
      `Phase ${completedPhases}/${totalPhases} (${overallPercent}%)`,
  };
}

function generateId(): string {
  return "prj-" + Math.random().toString(36).slice(2, 10);
}

export default {
  port: 5175,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // --- SSE ---
    if (url.pathname === "/api/events" && method === "GET") {
      const stream = new ReadableStream({
        start(controller) {
          sseClients.add(controller);
          controller.enqueue(new TextEncoder().encode(`event: connected\ndata: {}\n\n`));
          request.signal?.addEventListener("abort", () => {
            sseClients.delete(controller);
            controller.close();
          });
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          ...corsHeaders,
        },
      });
    }

    // --- Health ---
    if (url.pathname === "/api/health") {
      return Response.json({ status: "ok" }, { headers: corsHeaders });
    }

    // --- GET /api/projects ---
    if (url.pathname === "/api/projects" && method === "GET") {
      const ids = listProjectDirs();
      const projects = ids.map((id) => {
        const raw = readProject(id);
        return raw ? mapProjectToSummary(raw, id) : null;
      }).filter(Boolean);
      return Response.json(projects, { headers: corsHeaders });
    }

    // --- POST /api/projects (create) ---
    if (url.pathname === "/api/projects" && method === "POST") {
      const body = await request.json();
      const id = generateId();
      const now = new Date().toISOString();
      const project = {
        id,
        name: body.name || "Untitled Project",
        description: body.description || "",
        status: "pending",
        style: body.style || "cinematic",
        shotCount: body.shotCount || 5,
        budget: body.budget || 500,
        spent: 0,
        currentPhase: "init",
        phases: { init: { status: "pending" } },
        hooks: [],
        settings: [],
        targetPlatforms: body.targetPlatforms || ["tiktok", "instagram"],
        provider: body.provider || "Brandly",
        createdAt: now,
        updatedAt: now,
      };
      const dir = join(PROJECTS_DIR, id);
      mkdirSync(dir, { recursive: true });
      mkdirSync(join(dir, "artifacts"), { recursive: true });
      writeProject(id, project);
      appendLog(id, { icon: "🎬", msg: `Project "${project.name}" created — budget: ${project.budget} credits.`, ts: now });
      broadcast("project.created", { id, name: project.name });
      return Response.json(mapProjectToDetail(project, id), { status: 201, headers: corsHeaders });
    }

    // --- GET /api/projects/:id ---
    const projectMatch = url.pathname.match(/^\/api\/projects\/([^\/]+)$/);
    if (projectMatch && method === "GET") {
      const id = decodeURIComponent(projectMatch[1]);
      const raw = readProject(id);
      if (!raw) return Response.json({ error: `Project not found: ${id}` }, { status: 404, headers: corsHeaders });
      return Response.json(mapProjectToDetail(raw, id), { headers: corsHeaders });
    }

    // --- DELETE /api/projects/:id ---
    if (projectMatch && method === "DELETE") {
      const id = decodeURIComponent(projectMatch[1]);
      const dir = join(PROJECTS_DIR, id);
      if (!existsSync(dir)) return Response.json({ error: `Project not found: ${id}` }, { status: 404, headers: corsHeaders });
      rmSync(dir, { recursive: true, force: true });
      broadcast("project.deleted", { id });
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    // --- GET /api/projects/:id/progress ---
    const progressMatch = url.pathname.match(/^\/api\/projects\/([^\/]+)\/progress$/);
    if (progressMatch && method === "GET") {
      const id = decodeURIComponent(progressMatch[1]);
      const raw = readProject(id);
      if (!raw) return Response.json({ error: `Project not found: ${id}` }, { status: 404, headers: corsHeaders });
      return Response.json(computeProgress(raw, id), { headers: corsHeaders });
    }

    // --- POST /api/projects/:id/run (start next phase) ---
    const runMatch = url.pathname.match(/^\/api\/projects\/([^\/]+)\/run$/);
    if (runMatch && method === "POST") {
      const id = decodeURIComponent(runMatch[1]);
      const raw = readProject(id);
      if (!raw) return Response.json({ error: `Project not found: ${id}` }, { status: 404, headers: corsHeaders });

      const currentPhase = raw.currentPhase || "init";
      const currentData = raw.phases?.[currentPhase];

      // If current phase is pending, start it
      if (!currentData || currentData.status === "pending") {
        raw.phases[currentPhase] = { status: "running", startedAt: new Date().toISOString() };
        raw.status = "running";
        raw.updatedAt = new Date().toISOString();
        writeProject(id, raw);
        appendLog(id, { icon: "▶", msg: `Phase "${currentPhase}" started.`, ts: new Date().toISOString() });
        broadcast("project.updated", { id, phase: currentPhase, status: "running" });
        return Response.json(mapProjectToDetail(raw, id), { headers: corsHeaders });
      }

      // If current phase is running, complete it and advance
      if (currentData.status === "running") {
        raw.phases[currentPhase].status = "completed";
        raw.phases[currentPhase].completedAt = new Date().toISOString();

        // Advance to next phase
        const idx = PHASE_ORDER.indexOf(currentPhase as any);
        if (idx < PHASE_ORDER.length - 1) {
          const nextPhase = PHASE_ORDER[idx + 1];
          raw.currentPhase = nextPhase;
          if (!raw.phases[nextPhase]) raw.phases[nextPhase] = { status: "pending" };
        } else {
          raw.status = "completed";
        }

        raw.updatedAt = new Date().toISOString();
        writeProject(id, raw);
        appendLog(id, { icon: "✅", msg: `Phase "${currentPhase}" completed.`, ts: new Date().toISOString() });
        broadcast("project.updated", { id, phase: currentPhase, status: "completed" });
        return Response.json(mapProjectToDetail(raw, id), { headers: corsHeaders });
      }

      return Response.json({ error: `Phase "${currentPhase}" is in unexpected state: ${currentData.status}` }, { status: 400, headers: corsHeaders });
    }

    // --- POST /api/projects/:id/approve ---
    const approveMatch = url.pathname.match(/^\/api\/projects\/([^\/]+)\/approve$/);
    if (approveMatch && method === "POST") {
      const id = decodeURIComponent(approveMatch[1]);
      const raw = readProject(id);
      if (!raw) return Response.json({ error: `Project not found: ${id}` }, { status: 404, headers: corsHeaders });

      const body = await request.json().catch(() => ({}));
      const phase = body.phase || raw.currentPhase;

      if (raw.phases[phase]?.status === "running") {
        raw.phases[phase].status = "completed";
        raw.phases[phase].completedAt = new Date().toISOString();

        const idx = PHASE_ORDER.indexOf(phase as any);
        if (idx < PHASE_ORDER.length - 1) {
          const nextPhase = PHASE_ORDER[idx + 1];
          raw.currentPhase = nextPhase;
          if (!raw.phases[nextPhase]) raw.phases[nextPhase] = { status: "pending" };
        } else {
          raw.status = "completed";
        }

        raw.updatedAt = new Date().toISOString();
        writeProject(id, raw);
        appendLog(id, { icon: "👍", msg: `Phase "${phase}" approved.`, ts: new Date().toISOString() });
        broadcast("project.updated", { id, phase, status: "approved" });
        return Response.json(mapProjectToDetail(raw, id), { headers: corsHeaders });
      }

      return Response.json({ error: `Cannot approve phase "${phase}" — status: ${raw.phases[phase]?.status || "unknown"}` }, { status: 400, headers: corsHeaders });
    }

    // --- POST /api/projects/:id/cancel ---
    const cancelMatch = url.pathname.match(/^\/api\/projects\/([^\/]+)\/cancel$/);
    if (cancelMatch && method === "POST") {
      const id = decodeURIComponent(cancelMatch[1]);
      const raw = readProject(id);
      if (!raw) return Response.json({ error: `Project not found: ${id}` }, { status: 404, headers: corsHeaders });

      raw.status = "cancelled";
      raw.updatedAt = new Date().toISOString();
      writeProject(id, raw);
      appendLog(id, { icon: "⛔", msg: "Project cancelled.", ts: new Date().toISOString() });
      broadcast("project.updated", { id, status: "cancelled" });
      return Response.json(mapProjectToDetail(raw, id), { headers: corsHeaders });
    }

    // --- POST /api/projects/:id/re_edit ---
    const reEditMatch = url.pathname.match(/^\/api\/projects\/([^\/]+)\/re_edit$/);
    if (reEditMatch && method === "POST") {
      const id = decodeURIComponent(reEditMatch[1]);
      const raw = readProject(id);
      if (!raw) return Response.json({ error: `Project not found: ${id}` }, { status: 404, headers: corsHeaders });

      const body = await request.json().catch(() => ({}));
      const targetPhase = body.phase || raw.currentPhase;

      // Reset target phase and all phases after it
      const idx = PHASE_ORDER.indexOf(targetPhase as any);
      if (idx >= 0) {
        for (let i = idx; i < PHASE_ORDER.length; i++) {
          const p = PHASE_ORDER[i];
          raw.phases[p] = { status: "pending" };
        }
        raw.currentPhase = targetPhase;
        raw.status = "running";
        raw.updatedAt = new Date().toISOString();
        writeProject(id, raw);
        appendLog(id, { icon: "✂️", msg: `Re-edit from phase "${targetPhase}".`, ts: new Date().toISOString() });
        broadcast("project.updated", { id, phase: targetPhase, status: "re_edit" });
        return Response.json(mapProjectToDetail(raw, id), { headers: corsHeaders });
      }

      return Response.json({ error: `Invalid phase: ${targetPhase}` }, { status: 400, headers: corsHeaders });
    }

    // --- GET /api/projects/:id/artifacts ---
    const artifactsMatch = url.pathname.match(/^\/api\/projects\/([^\/]+)\/artifacts$/);
    if (artifactsMatch && method === "GET") {
      const id = decodeURIComponent(artifactsMatch[1]);
      const raw = readProject(id);
      if (!raw) return Response.json({ error: `Project not found: ${id}` }, { status: 404, headers: corsHeaders });
      return Response.json(listArtifacts(id), { headers: corsHeaders });
    }

    // --- GET /api/projects/:id/artifacts/:name ---
    const artifactMatch = url.pathname.match(/^\/api\/projects\/([^\/]+)\/artifacts\/([^\/]+)$/);
    if (artifactMatch && method === "GET") {
      const id = decodeURIComponent(artifactMatch[1]);
      const name = decodeURIComponent(artifactMatch[2]);
      const filePath = join(PROJECTS_DIR, id, "artifacts", name);
      if (!existsSync(filePath)) return Response.json({ error: "Artifact not found" }, { status: 404, headers: corsHeaders });
      const content = readFileSync(filePath);
      const ext = name.split(".").pop() || "";
      const contentType: Record<string, string> = {
        mp4: "video/mp4", webm: "video/webm", png: "image/png",
        jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
        svg: "image/svg+xml", json: "application/json", txt: "text/plain",
      }[ext] || "application/octet-stream";
      return new Response(content, { headers: { "Content-Type": contentType, ...corsHeaders } });
    }

    // --- POST /api/projects/:id/artifacts (upload) ---
    if (artifactsMatch && method === "POST") {
      const id = decodeURIComponent(artifactsMatch[1]);
      const raw = readProject(id);
      if (!raw) return Response.json({ error: `Project not found: ${id}` }, { status: 404, headers: corsHeaders });

      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) return Response.json({ error: "No file provided" }, { status: 400, headers: corsHeaders });

      const artDir = join(PROJECTS_DIR, id, "artifacts");
      if (!existsSync(artDir)) mkdirSync(artDir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      writeFileSync(join(artDir, file.name), buffer);
      appendLog(id, { icon: "📦", msg: `Artifact "${file.name}" uploaded.`, ts: new Date().toISOString() });
      broadcast("artifact.uploaded", { id, name: file.name });
      return Response.json({ ok: true, name: file.name }, { headers: corsHeaders });
    }

    // --- GET /api/projects/:id/costs ---
    const costsMatch = url.pathname.match(/^\/api\/projects\/([^\/]+)\/costs$/);
    if (costsMatch && method === "GET") {
      const id = decodeURIComponent(costsMatch[1]);
      const raw = readProject(id);
      if (!raw) return Response.json({ error: `Project not found: ${id}` }, { status: 404, headers: corsHeaders });
      return Response.json(readCosts(id), { headers: corsHeaders });
    }

    // --- POST /api/projects/:id/costs ---
    if (costsMatch && method === "POST") {
      const id = decodeURIComponent(costsMatch[1]);
      const raw = readProject(id);
      if (!raw) return Response.json({ error: `Project not found: ${id}` }, { status: 404, headers: corsHeaders });

      const body = await request.json();
      const entry = {
        phase: body.phase || raw.currentPhase,
        amount: body.amount || 0,
        description: body.description || "",
        ts: new Date().toISOString(),
      };
      appendCost(id, entry);
      raw.spent = (raw.spent || 0) + entry.amount;
      raw.updatedAt = new Date().toISOString();
      writeProject(id, raw);
      appendLog(id, { icon: "💰", msg: `Cost: ${entry.amount} credits — ${entry.description}.`, ts: entry.ts });
      broadcast("cost.recorded", { id, ...entry });
      return Response.json({ ok: true, spent: raw.spent }, { headers: corsHeaders });
    }

    // --- GET /api/projects/:id/history ---
    const historyMatch = url.pathname.match(/^\/api\/projects\/([^\/]+)\/history$/);
    if (historyMatch && method === "GET") {
      const id = decodeURIComponent(historyMatch[1]);
      const raw = readProject(id);
      if (!raw) return Response.json({ error: `Project not found: ${id}` }, { status: 404, headers: corsHeaders });
      return Response.json(readLog(id), { headers: corsHeaders });
    }

    // --- POST /api/projects/:id/export ---
    const exportMatch = url.pathname.match(/^\/api\/projects\/([^\/]+)\/export$/);
    if (exportMatch && method === "POST") {
      const id = decodeURIComponent(exportMatch[1]);
      const raw = readProject(id);
      if (!raw) return Response.json({ error: `Project not found: ${id}` }, { status: 404, headers: corsHeaders });

      const body = await request.json().catch(() => ({}));
      const format = body.format || "mp4";
      const resolution = body.resolution || "1080x1920";
      appendLog(id, { icon: "🚀", msg: `Export started — ${format} @ ${resolution}.`, ts: new Date().toISOString() });
      broadcast("export.started", { id, format, resolution });
      return Response.json({ ok: true, message: "Export queued" }, { headers: corsHeaders });
    }

    // --- GET /api/stats (global) ---
    if (url.pathname === "/api/stats" && method === "GET") {
      const ids = listProjectDirs();
      let totalSpent = 0;
      let totalBudget = 0;
      let running = 0;
      let completed = 0;
      for (const id of ids) {
        const raw = readProject(id);
        if (!raw) continue;
        totalSpent += raw.spent || 0;
        totalBudget += raw.budget || 0;
        if (raw.status === "running") running++;
        if (raw.status === "completed") completed++;
      }
      return Response.json({
        totalProjects: ids.length,
        running,
        completed,
        totalSpent,
        totalBudget,
      }, { headers: corsHeaders });
    }

    // --- Favicon ---
    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    // --- Static files ---
    if (existsSync(DIST_DIR)) {
      const filePath = join(DIST_DIR, url.pathname === "/" ? "index.html" : url.pathname);
      if (existsSync(filePath)) {
        const ext = url.pathname.split(".").pop() || "";
        const contentType: Record<string, string> = {
          html: "text/html", js: "application/javascript", css: "text/css",
          svg: "image/svg+xml", png: "image/png", json: "application/json",
        }[ext] || "application/octet-stream";
        const file = readFileSync(filePath);
        return new Response(file, { headers: { "Content-Type": contentType, ...corsHeaders } });
      }
    }

    return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
  },
};
