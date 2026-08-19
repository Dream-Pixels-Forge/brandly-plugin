const AGNES_BASE_URL_DEFAULT = "https://apihub.agnes-ai.com/v1";

function getApiKey(): string {
  const key = process.env.AGNES_API_KEY;
  if (!key) {
    throw new Error(
      "AGNES_API_KEY environment variable is not set. " +
        "Get your API key from https://apihub.agnes-ai.com and set it: " +
        "export AGNES_API_KEY=your_key"
    );
  }
  return key;
}

function getBaseUrl(): string {
  return process.env.AGNES_BASE_URL || AGNES_BASE_URL_DEFAULT;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// Image Generation
// ---------------------------------------------------------------------------

export interface AgnesImageParams {
  prompt: string;
  model?: string;
  size?: string;
  ratio?: string;
  images?: string[];
  returnBase64?: boolean;
}

export interface AgnesImageResult {
  url: string | null;
  b64Json: string | null;
  revisedPrompt: string | null;
}

export async function generateImage(
  params: AgnesImageParams
): Promise<AgnesImageResult> {
  const body: Record<string, unknown> = {
    model: params.model || "agnes-image-2.1-flash",
    prompt: params.prompt,
    size: params.size || "2K",
  };

  if (params.ratio) {
    body.ratio = params.ratio;
  }

  if (params.images && params.images.length > 0) {
    (body as Record<string, unknown>).extra_body = {
      image: params.images,
      response_format: params.returnBase64 ? "b64_json" : "url",
    };
  } else if (params.returnBase64) {
    body.return_base64 = true;
  } else {
    (body as Record<string, unknown>).extra_body = {
      response_format: "url",
    };
  }

  const res = await fetch(`${getBaseUrl()}/images/generations`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Agnes image generation failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    data: { url: string | null; b64_json: string | null; revised_prompt: string | null }[];
  };

  const first = data.data?.[0];
  if (!first) {
    throw new Error("Agnes image generation returned no results");
  }

  return {
    url: first.url,
    b64Json: first.b64_json,
    revisedPrompt: first.revised_prompt,
  };
}

// ---------------------------------------------------------------------------
// Video Generation
// ---------------------------------------------------------------------------

export type AgnesVideoMode = "text" | "keyframe" | "reference";

export interface AgnesVideoParams {
  prompt: string;
  model?: string;
  mode?: AgnesVideoMode;
  seconds?: number;
  aspectRatio?: string;
  size?: string;
  seed?: number;
  negativePrompt?: string;
  firstFrame?: string;
  lastFrame?: string;
  images?: string[];
  audios?: string[];
  videos?: { url: string; start_seconds?: number; require_audio?: boolean }[];
}

export interface AgnesVideoTask {
  id: string;
  videoId: string;
  status: string;
  progress: number;
  url: string | null;
  error: string | null;
  createdAt: number;
}

export async function createVideoTask(
  params: AgnesVideoParams
): Promise<AgnesVideoTask> {
  const mode = params.mode || "text";

  const body: Record<string, unknown> = {
    model: params.model || "agnes-video-v2.0",
    prompt: params.prompt,
  };

  if (params.negativePrompt) {
    body.negative_prompt = params.negativePrompt;
  }

  if (params.seed !== undefined) body.seed = params.seed;

  // Agnes Video v2.0 uses width/height/num_frames/frame_rate
  // Agnes Video 2.5 uses seconds/size/aspect_ratio/mode
  const isV25 = (params.model || "").includes("2.5");

  if (isV25) {
    body.seconds = params.seconds || 5;
    body.size = params.size || "720P";
    body.aspect_ratio = params.aspectRatio || "16:9";
    body.mode = mode;

    if (mode === "keyframe") {
      if (params.firstFrame) body.first_frame = params.firstFrame;
      if (params.lastFrame) body.last_frame = params.lastFrame;
    } else if (mode === "reference") {
      if (params.images) body.images = params.images;
      if (params.audios) body.audios = params.audios;
      if (params.videos) body.videos = params.videos;
    }
  } else {
    // v2.0 style
    body.num_frames = params.seconds
      ? Math.min(441, Math.round(params.seconds * 24) + 1)
      : 121;
    body.frame_rate = 24;
    // v2.0 uses `ratio` not `aspect_ratio`
    if (params.aspectRatio) body.ratio = params.aspectRatio;

    if (mode === "keyframe" && params.images) {
      (body as Record<string, unknown>).extra_body = {
        image: params.images,
        mode: "keyframes",
      };
    } else if (mode === "reference" && params.images) {
      (body as Record<string, unknown>).extra_body = {
        image: params.images,
        mode: "reference",
      };
    } else if (params.images && params.images.length > 0) {
      // image-to-video (simple)
      body.image = params.images[0];
    }
  }

  const res = await fetch(`${getBaseUrl()}/videos`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Agnes video task creation failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    id: string;
    task_id?: string;
    video_id?: string;
    status: string;
    progress: number;
    created_at: number;
  };

  return {
    id: data.id,
    videoId: data.video_id || data.task_id || data.id,
    status: data.status,
    progress: data.progress,
    url: null,
    error: null,
    createdAt: data.created_at,
  };
}

// ---------------------------------------------------------------------------
// Poll video task
// ---------------------------------------------------------------------------

export async function getVideoStatus(
  videoId: string
): Promise<AgnesVideoTask> {
  const res = await fetch(`${getBaseUrl()}/agnesapi?video_id=${videoId}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Agnes video status check failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    id: string;
    video_id?: string;
    task_id?: string;
    status: string;
    progress: number;
    created_at: number;
    completed_at?: number;
    url?: string;
    metadata?: { url?: string };
    error?: { message?: string } | string | null;
  };

  const errorMsg =
    typeof data.error === "string"
      ? data.error
      : data.error?.message || null;

  return {
    id: data.id,
    videoId: data.video_id || data.task_id || data.id,
    status: data.status,
    progress: data.progress,
    // API returns URL at top level; fallback to metadata.url
    url: data.url || data.metadata?.url || null,
    error: errorMsg,
    createdAt: data.created_at,
  };
}

export async function pollVideo(
  videoId: string,
  maxWaitMs: number = 300_000,
  intervalMs: number = 2_000
): Promise<AgnesVideoTask> {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const task = await getVideoStatus(videoId);

    if (task.status === "completed") return task;
    if (task.status === "failed") {
      throw new Error(`Agnes video generation failed: ${task.error || "unknown error"}`);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `Agnes video generation timed out after ${maxWaitMs / 1000}s. ` +
      `Task ID: ${videoId}. Check status manually.`
  );
}
