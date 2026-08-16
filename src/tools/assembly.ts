import { tool } from "@opencode-ai/plugin/tool";
import { join } from "node:path";
import { mkdir, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";

interface ClipAsset {
  path: string;
  type: "video" | "image" | "audio";
  name: string;
}

interface MontageSegment {
  clip: ClipAsset;
  duration: number;
  transition?: string;
  transitionDuration?: number;
  startTime?: number;
  text?: string;
  textPosition?: string;
  effect?: string;
  volume?: number;
}

interface AssemblyPlan {
  segments: MontageSegment[];
  totalDuration: number;
  fps: number;
  width: number;
  height: number;
  audioTrack?: ClipAsset;
  backgroundMusic?: ClipAsset;
  style: string;
}

async function discoverMedia(dir: string): Promise<ClipAsset[]> {
  if (!existsSync(dir)) return [];

  const clips: ClipAsset[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const subClips = await discoverMedia(fullPath);
      clips.push(...subClips);
    } else {
      const ext = entry.name.toLowerCase();
      if (ext.endsWith(".mp4") || ext.endsWith(".webm") || ext.endsWith(".mov")) {
        clips.push({ path: fullPath, type: "video", name: entry.name });
      } else if (ext.endsWith(".png") || ext.endsWith(".jpg") || ext.endsWith(".jpeg") || ext.endsWith(".gif")) {
        clips.push({ path: fullPath, type: "image", name: entry.name });
      } else if (ext.endsWith(".mp3") || ext.endsWith(".wav") || ext.endsWith(".ogg")) {
        clips.push({ path: fullPath, type: "audio", name: entry.name });
      }
    }
  }

  return clips;
}

function generateAssemblyPlan(
  assets: ClipAsset[],
  params: Record<string, unknown>,
  style: string
): AssemblyPlan {
  const fps = (params.fps as number) || 30;
  const width = (params.width as number) || 1920;
  const height = (params.height as number) || 1080;
  const clipDuration = (params.clipDuration as number) || 3;
  const transitionType = (params.transitionType as string) || "fade";
  const transitionDuration = (params.transitionDuration as number) || 0.5;

  const videos = assets.filter((a) => a.type === "video");
  const images = assets.filter((a) => a.type === "image");
  const audios = assets.filter((a) => a.type === "audio");

  const backgroundMusic = audios.length > 0 ? audios[0] : undefined;

  const orderedClips = [...videos, ...images];
  const segments: MontageSegment[] = [];

  for (const clip of orderedClips) {
    const duration = clip.type === "image" ? 3 : clipDuration;
    segments.push({
      clip,
      duration,
      transition: transitionType,
      transitionDuration,
    });
  }

  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);

  return {
    segments,
    totalDuration,
    fps,
    width,
    height,
    backgroundMusic,
    style,
  };
}

function generateRemotionProject(plan: AssemblyPlan, projectName: string): string {
  const { segments, fps, width, height, backgroundMusic } = plan;

  const clipImports = segments
    .map((seg, i) => {
      const ext = seg.clip.name.split(".").pop();
      const isVideo = ["mp4", "webm", "mov"].includes(ext || "");
      const importPath = `./assets/${seg.clip.name}`;
      return `import ${isVideo ? "Video" : "Img"}_${i} from "${importPath}";`;
    })
    .join("\n");

  const audioImport = backgroundMusic
    ? `import audioTrack from "./assets/${backgroundMusic.name}";`
    : "";

  const clipDeclarations = segments
    .map((seg, i) => {
      const ext = seg.clip.name.split(".").pop();
      const isVideo = ["mp4", "webm", "mov"].includes(ext || "");
      return `  const Clip_${i}: ${isVideo ? "typeof Video" : "typeof Img"}_${i} = ${isVideo ? "Video" : "Img"}_${i};`;
    })
    .join("\n");

  const sequenceBlocks = segments
    .map((seg, i) => {
      const frameStart = segments
        .slice(0, i)
        .reduce((sum, s) => sum + s.duration * fps, 0);
      const durationFrames = Math.round(seg.duration * fps);
      const ext = seg.clip.name.split(".").pop();
      const isVideo = ["mp4", "webm", "mov"].includes(ext || "");

      return `      <Sequence from={${frameStart}} durationInFrames={${durationFrames}}>
        <${isVideo ? "Video" : "Img"}
          src={${isVideo ? "Video" : "Img"}_${i}}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          ${isVideo ? "" : `durationInFrames={${durationFrames}}`}
        />
        ${seg.text ? `<TextOverlay text="${seg.text}" position="${seg.textPosition || "bottom"}" />` : ""}
      </Sequence>`;
    })
    .join("\n");

  const totalFrames = Math.round(plan.totalDuration * fps);

  return `import { Composition, Sequence, Audio, staticFile } from 'remotion';
${clipImports}
${audioImport}

${clipDeclarations}

const TextOverlay = ({ text, position }: { text: string; position: string }) => {
  const posStyle = position === 'top'
    ? { top: '10%' }
    : position === 'center'
    ? { top: '50%', transform: 'translateY(-50%)' }
    : { bottom: '10%' };

  return (
    <div style={{
      position: 'absolute',
      left: '50%',
      transform: position === 'center' ? 'translate(-50%, -50%)' : 'translateX(-50%)',
      ...posStyle,
      color: 'white',
      fontSize: 48,
      fontWeight: 'bold',
      textShadow: '2px 2px 8px rgba(0,0,0,0.7)',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      padding: '8px 24px',
      borderRadius: 8,
      background: 'rgba(0,0,0,0.4)',
    }}>
      {text}
    </div>
  );
};

const MontageComposition = () => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: 'black' }}>
${sequenceBlocks}
${backgroundMusic ? `      <Audio src={audioTrack} volume={0.8} />` : ""}
    </div>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="${projectName}"
      component={MontageComposition}
      durationInFrames={${totalFrames}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}

function generateRemotionConfig(): string {
  return `import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
`;
}

function generatePackageJson(projectName: string): string {
  return JSON.stringify(
    {
      name: projectName.toLowerCase().replace(/\s+/g, "-"),
      version: "1.0.0",
      private: true,
      scripts: {
        start: "npx remotion studio",
        build: "npx remotion render src/index.ts " + projectName + " out/video.mp4",
        "build:gif": "npx remotion render src/index.ts " + projectName + " out/video.gif --codec gif",
        "build:webm": "npx remotion render src/index.ts " + projectName + " out/video.webm --codec vp8",
      },
      dependencies: {
        "@remotion/cli": "^4.0.0",
        remotion: "^4.0.0",
        react: "^18.2.0",
        "react-dom": "^18.2.0",
      },
      devDependencies: {
        "@types/react": "^18.2.0",
        typescript: "^5.4.0",
      },
    },
    null,
    2
  );
}

function generateRootIndex(projectName: string): string {
  return `import { registerRoot } from "remotion";
import { RemotionComposition } from "./Composition";

registerRoot(RemotionComposition);
`;
}

function generateBuildScript(projectDir: string, outputPath: string): string {
  return `#!/bin/bash
# Brandly Assembly Build Script
# Generated: ${new Date().toISOString()}

set -e

echo "🎬 Building montage: ${projectDir}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Render the video
echo "🎥 Rendering video..."
npx remotion render src/index.ts Montage "${outputPath}" --codec h264

echo "✅ Build complete: ${outputPath}"
`;
}

export function createAssemblyTool(ctx: ToolContext) {
  return tool({
    name: "brandly_assemble",
    description:
      "Assemble all generated video clips, images, and audio into a final montage using a complete Remotion project. Discovers assets, creates project structure, and optionally renders the final video.",
    args: {
      projectID: tool.schema.string({ description: "The project UUID" }),
      style: tool.schema.enum(["montage", "cinematic", "ugc", "continuous", "simple"], {
        description: "Assembly style preset",
        default: "montage",
      }),
      clipDuration: tool.schema.number({ description: "Default duration in seconds for each video clip (images always use 3s)", default: 3 }),
      transitionType: tool.schema.enum(["fade", "slide", "wipe", "none"], {
        description: "Transition type between clips",
        default: "fade",
      }),
      transitionDuration: tool.schema.number({ description: "Transition duration in seconds", default: 0.5 }),
      fps: tool.schema.number({ description: "Frames per second", default: 30 }),
      width: tool.schema.number({ description: "Output width in pixels", default: 1920 }),
      height: tool.schema.number({ description: "Output height in pixels", default: 1080 }),
      outputPath: tool.schema.string({ description: "Output file path for rendered video" }),
      autoRender: tool.schema.boolean({ description: "Automatically render after creating the project", default: false }),
      clipOrder: tool.schema.array(tool.schema.string(), { description: "Optional explicit clip order by filename. Unlisted clips are appended." }),
    },
    execute: async (args) => {
      const {
        projectID,
        style = "montage",
        clipDuration = 3,
        transitionType = "fade",
        transitionDuration = 0.5,
        fps = 30,
        width = 1920,
        height = 1080,
        outputPath,
        autoRender = false,
        clipOrder,
      } = args;

      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      const projectName = project.name || `brandly-${projectID.slice(0, 8)}`;

      const mediaFolders = ["imagen", "videgen", "audgen"];
      const allAssets: ClipAsset[] = [];

      for (const folder of mediaFolders) {
        const mediaDir = join(ctx.directory, folder, projectID);
        const assets = await discoverMedia(mediaDir);
        allAssets.push(...assets);
      }

      const projectDir = join(ctx.projectsDir, projectID);
      const artifactsDir = join(projectDir, "artifacts");
      const artifactAssets = await discoverMedia(artifactsDir);
      allAssets.push(...artifactAssets);

      if (allAssets.length === 0) {
        throw new Error(
          "No media assets found. Generate videos/images/audio first using brandly_image, brandly_video tools."
        );
      }

      let orderedAssets = allAssets;
      if (clipOrder && clipOrder.length > 0) {
        const orderMap = new Map(clipOrder.map((name, i) => [name, i]));
        orderedAssets = [...allAssets].sort((a, b) => {
          const aIdx = orderMap.has(a.name) ? orderMap.get(a.name)! : Infinity;
          const bIdx = orderMap.has(b.name) ? orderMap.get(b.name)! : Infinity;
          return aIdx - bIdx;
        });
      }

      const plan = generateAssemblyPlan(
        orderedAssets,
        { fps, width, height, clipDuration, transitionType, transitionDuration },
        style
      );

      const assemblyDir = join(ctx.directory, "assembly", projectID);
      const srcDir = join(assemblyDir, "src");
      const assetsDir = join(assemblyDir, "assets");
      const outDir = join(assemblyDir, "out");

      await mkdir(srcDir, { recursive: true });
      await mkdir(assetsDir, { recursive: true });
      await mkdir(outDir, { recursive: true });

      const copiedAssets: string[] = [];
      for (const asset of orderedAssets) {
        const srcPath = asset.path;
        const destPath = join(assetsDir, asset.name);
        if (!existsSync(destPath)) {
          const { copyFile } = await import("node:fs/promises");
          await copyFile(srcPath, destPath);
        }
        copiedAssets.push(asset.name);
      }

      const compositionCode = generateRemotionProject(plan, projectName);
      await writeFile(join(srcDir, "Composition.tsx"), compositionCode, "utf-8");

      const rootIndex = generateRootIndex(projectName);
      await writeFile(join(srcDir, "index.ts"), rootIndex, "utf-8");

      const remotionConfig = generateRemotionConfig();
      await writeFile(join(assemblyDir, "remotion.config.ts"), remotionConfig, "utf-8");

      const packageJson = generatePackageJson(projectName);
      await writeFile(join(assemblyDir, "package.json"), packageJson, "utf-8");

      const finalOutputPath =
        outputPath || join(outDir, `${projectName.toLowerCase().replace(/\s+/g, "-")}.mp4`);
      const buildScript = generateBuildScript(assemblyDir, finalOutputPath);
      const buildScriptPath = join(assemblyDir, "build.sh");
      await writeFile(buildScriptPath, buildScript, "utf-8");

      const assemblyMeta = {
        id: `assembly-${Date.now()}`,
        projectId: projectID,
        projectName,
        style: plan.style,
        segmentCount: plan.segments.length,
        totalDuration: plan.totalDuration,
        fps: plan.fps,
        width: plan.width,
        height: plan.height,
        clips: copiedAssets,
        backgroundMusic: plan.backgroundMusic?.name || null,
        assemblyDir,
        compositionPath: join(srcDir, "Composition.tsx"),
        outputPath: finalOutputPath,
        status: "created",
        createdAt: new Date().toISOString(),
      };

      const metaPath = join(assemblyDir, "assembly-meta.json");
      await writeFile(metaPath, JSON.stringify(assemblyMeta, null, 2), "utf-8");

      if (!project.phases) {
        project.phases = {};
      }

      const currentPhase = project.currentPhase as string;
      if (!project.phases[currentPhase]) {
        project.phases[currentPhase] = {
          status: "running",
          startedAt: new Date().toISOString(),
        };
      }

      const phaseOutput = project.phases[currentPhase].output
        ? JSON.parse(project.phases[currentPhase].output || "{}")
        : {};

      if (!phaseOutput.assemblies) {
        phaseOutput.assemblies = [];
      }

      phaseOutput.assemblies.push({
        assemblyId: assemblyMeta.id,
        assemblyDir,
        segmentCount: plan.segments.length,
        totalDuration: plan.totalDuration,
        outputPath: finalOutputPath,
        createdAt: new Date().toISOString(),
      });

      project.phases[currentPhase].output = JSON.stringify(phaseOutput);
      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(projectID, project);

      const nextSteps = [
        `1. cd ${assemblyDir}`,
        "2. Install dependencies: npm install",
        "3. Preview in Remotion Studio: npm start",
        `4. Render final video: npm run build`,
        `   Output: ${finalOutputPath}`,
      ];

      if (autoRender) {
        nextSteps.push("5. Auto-render was requested — run: bash " + buildScriptPath);
      }

      return {
        output: JSON.stringify({
          projectId: projectID,
          assemblyId: assemblyMeta.id,
          projectName,
          style: plan.style,
          assemblyDir,
          segmentCount: plan.segments.length,
          totalDuration: `${plan.totalDuration.toFixed(1)}s`,
          clips: copiedAssets,
          backgroundMusic: plan.backgroundMusic?.name || null,
          compositionPath: join(srcDir, "Composition.tsx"),
          outputPath: finalOutputPath,
          status: "created",
          message: `Remotion assembly project created with ${plan.segments.length} clips (${plan.totalDuration.toFixed(1)}s total)`,
          nextSteps,
        }),
      };
    },
  });
}
