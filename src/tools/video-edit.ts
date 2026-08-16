import { tool } from "@opencode-ai/plugin/tool";
import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";

export interface VideoEditOperation {
  type: "trim" | "concat" | "overlay" | "transition" | "text" | "audio" | "effect" | "resize" | "crop";
  params: Record<string, unknown>;
}

export interface RemotionProject {
  id: string;
  name: string;
  composition: string;
  fps: number;
  durationInFrames: number;
  width: number;
  height: number;
  operations: VideoEditOperation[];
  inputFiles: string[];
  outputFormat: "mp4" | "webm" | "gif";
  status: "pending" | "rendering" | "completed" | "failed";
}

export function createVideoEditTool(ctx: ToolContext) {
  return tool({
    name: "brandly_video_edit",
    description:
      "Edit videos using Remotion — trim, concat, overlay, add transitions, text, audio, effects. Creates Remotion compositions for programmatic video editing.",
    args: {
      projectID: tool.schema.string({ description: "The project UUID" }),
      operation: tool.schema.enum(
        ["trim", "concat", "overlay", "transition", "add-text", "add-audio", "add-effect", "resize", "crop", "render"],
        { description: "Video editing operation to perform" }
      ),
      inputFiles: tool.schema.array(tool.schema.string(), { description: "Input video file paths or URLs" }),
      params: tool.schema.record({ description: "Operation-specific parameters" }),
      outputFormat: tool.schema.enum(["mp4", "webm", "gif"], { description: "Output video format", default: "mp4" }),
    },
    execute: async (args) => {
      const { projectID, operation, inputFiles, params = {}, outputFormat = "mp4" } = args;

      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      const editDir = join(ctx.directory, "video-edits", projectID);
      await mkdir(editDir, { recursive: true });

      const composition = generateRemotionComposition(operation, inputFiles, params, outputFormat);

      const compositionPath = join(editDir, `composition-${Date.now()}.tsx`);
      await writeFile(compositionPath, composition, "utf-8");

      const editMeta: RemotionProject = {
        id: `edit-${Date.now()}`,
        name: `${operation}-edit`,
        composition: compositionPath,
        fps: 30,
        durationInFrames: 300,
        width: 1920,
        height: 1080,
        operations: [{ type: operation as VideoEditOperation["type"], params }],
        inputFiles,
        outputFormat: outputFormat as RemotionProject["outputFormat"],
        status: "pending",
      };

      const metaPath = join(editDir, `edit-${editMeta.id}.json`);
      await writeFile(metaPath, JSON.stringify(editMeta, null, 2), "utf-8");

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

      if (!phaseOutput.videoEdits) {
        phaseOutput.videoEdits = [];
      }

      phaseOutput.videoEdits.push({
        editId: editMeta.id,
        operation,
        compositionPath,
        inputFiles,
        outputFormat,
        createdAt: new Date().toISOString(),
      });

      project.phases[currentPhase].output = JSON.stringify(phaseOutput);
      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(projectID, project);

      return {
        output: JSON.stringify({
          projectId: projectID,
          editId: editMeta.id,
          operation,
          compositionPath,
          inputFiles,
          outputFormat,
          status: "created",
          message: `Video edit composition created: ${compositionPath}`,
          nextSteps: [
            "1. Review the generated Remotion composition",
            "2. Install Remotion if not present: npm i -g remotion",
            "3. Render the video: remotion render <composition-path>",
            "4. Or use brandly_render_video tool to render",
          ],
        }),
      };
    },
  });
}

function generateRemotionComposition(
  operation: string,
  inputFiles: string[],
  params: Record<string, unknown>,
  outputFormat: string
): string {
  const width = (params.width as number) || 1920;
  const height = (params.height as number) || 1080;
  const fps = (params.fps as number) || 30;

  switch (operation) {
    case "trim":
      return generateTrimComposition(inputFiles[0], params, width, height, fps);
    case "concat":
      return generateConcatComposition(inputFiles, params, width, height, fps);
    case "overlay":
      return generateOverlayComposition(inputFiles, params, width, height, fps);
    case "transition":
      return generateTransitionComposition(inputFiles, params, width, height, fps);
    case "add-text":
      return generateTextComposition(inputFiles[0], params, width, height, fps);
    case "add-audio":
      return generateAudioComposition(inputFiles[0], params, width, height, fps);
    case "add-effect":
      return generateEffectComposition(inputFiles[0], params, width, height, fps);
    case "resize":
      return generateResizeComposition(inputFiles[0], params, width, height, fps);
    case "crop":
      return generateCropComposition(inputFiles[0], params, width, height, fps);
    default:
      return generateDefaultComposition(inputFiles, width, height, fps);
  }
}

function generateTrimComposition(
  input: string,
  params: Record<string, unknown>,
  width: number,
  height: number,
  fps: number
): string {
  const startTime = (params.startTime as number) || 0;
  const duration = (params.duration as number) || 5;

  return `import { Composition, Video, staticFile } from 'remotion';

const TrimmedVideo = () => {
  return (
    <Video
      src={staticFile('${input}')}
      startFrom={${startTime * fps}}
      endAt={${(startTime + duration) * fps}}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="TrimmedVideo"
      component={TrimmedVideo}
      durationInFrames={${duration * fps}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}

function generateConcatComposition(
  inputs: string[],
  params: Record<string, unknown>,
  width: number,
  height: number,
  fps: number
): string {
  const totalDuration = inputs.length * 3;

  return `import { Composition, Sequence, Video, staticFile } from 'remotion';

const ConcatenatedVideo = () => {
  const clips = [
    ${inputs.map((input) => `"${input}"`).join(",\n    ")}
  ];

  return (
    <>
      {clips.map((clip, index) => (
        <Sequence
          key={index}
          from={index * ${3 * fps}}
          durationInFrames={${3 * fps}}
        >
          <Video
            src={staticFile(clip)}
            style={{ width: '100%', height: '100%' }}
          />
        </Sequence>
      ))}
    </>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="ConcatenatedVideo"
      component={ConcatenatedVideo}
      durationInFrames={${totalDuration * fps}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}

function generateOverlayComposition(
  inputs: string[],
  params: Record<string, unknown>,
  width: number,
  height: number,
  fps: number
): string {
  const overlayPosition = (params.position as string) || "top-right";
  const overlayScale = (params.scale as number) || 0.3;

  return `import { Composition, Video, Img, staticFile } from 'remotion';

const OverlayVideo = () => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Video
        src={staticFile('${inputs[0]}')}
        style={{ width: '100%', height: '100%' }}
      />
      <Img
        src={staticFile('${inputs[1] || inputs[0]}')}
        style={{
          position: 'absolute',
          ${overlayPosition.includes("top") ? "top: 20px" : "bottom: 20px"},
          ${overlayPosition.includes("left") ? "left: 20px" : "right: 20px"},
          width: '${overlayScale * 100}%',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      />
    </div>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="OverlayVideo"
      component={OverlayVideo}
      durationInFrames={${10 * fps}}
      fps={${fps}}
      width={${width}}
      height=${height}
    />
  );
};
`;
}

function generateTransitionComposition(
  inputs: string[],
  params: Record<string, unknown>,
  width: number,
  height: number,
  fps: number
): string {
  const transitionDuration = (params.transitionDuration as number) || 1;

  return `import { Composition, Sequence, Video, staticFile, interpolate, useCurrentFrame } from 'remotion';

const TransitionVideo = () => {
  const frame = useCurrentFrame();
  const clipDuration = ${3 * fps};
  const transitionFrames = ${transitionDuration * fps};

  return (
    <>
      ${inputs
        .map(
          (input, i) => `
      <Sequence from={${i * (3 - transitionDuration) * fps}} durationInFrames={clipDuration}>
        <Video
          src={staticFile('${input}')}
          style={{
            width: '100%',
            height: '100%',
            opacity: interpolate(
              frame,
              [0, transitionFrames, clipDuration - transitionFrames, clipDuration],
              [0, 1, 1, 0],
              { extrapolateRight: 'clamp' }
            )
          }}
        />
      </Sequence>`
        )
        .join("\n")}
    </>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="TransitionVideo"
      component={TransitionVideo}
      durationInFrames={${inputs.length * 3 * fps}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}

function generateTextComposition(
  input: string,
  params: Record<string, unknown>,
  width: number,
  height: number,
  fps: number
): string {
  const text = (params.text as string) || "Your Text Here";
  const fontSize = (params.fontSize as number) || 72;
  const color = (params.color as string) || "#ffffff";
  const position = (params.position as string) || "center";

  return `import { Composition, Video, Text, staticFile, interpolate, useCurrentFrame } from 'remotion';

const TextOverlayVideo = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Video
        src={staticFile('${input}')}
        style={{ width: '100%', height: '100%' }}
      />
      <Text
        text="${text}"
        style={{
          position: 'absolute',
          ${position === "center" ? "top: 50%, left: 50%, transform: 'translate(-50%, -50%)" :
            position === "top" ? "top: 10%" : "bottom: 10%"},
          fontSize: ${fontSize},
          color: '${color}',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          fontFamily: 'Arial, sans-serif'
        }}
      />
    </div>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="TextOverlayVideo"
      component={TextOverlayVideo}
      durationInFrames={${10 * fps}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}

function generateAudioComposition(
  input: string,
  params: Record<string, unknown>,
  width: number,
  height: number,
  fps: number
): string {
  const audioFile = (params.audioFile as string) || "audio.mp3";
  const volume = (params.volume as number) || 0.8;

  return `import { Composition, Video, Audio, staticFile } from 'remotion';

const AudioVideo = () => {
  return (
    <>
      <Video
        src={staticFile('${input}')}
        style={{ width: '100%', height: '100%' }}
      />
      <Audio
        src={staticFile('${audioFile}')}
        volume={${volume}}
      />
    </>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="AudioVideo"
      component={AudioVideo}
      durationInFrames={${10 * fps}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}

function generateEffectComposition(
  input: string,
  params: Record<string, unknown>,
  width: number,
  height: number,
  fps: number
): string {
  const effectType = (params.effectType as string) || "blur";
  const intensity = (params.intensity as number) || 5;

  return `import { Composition, Video, staticFile, interpolate, useCurrentFrame } from 'remotion';

const EffectVideo = () => {
  const frame = useCurrentFrame();

  return (
    <Video
      src={staticFile('${input}')}
      style={{
        width: '100%',
        height: '100%',
        filter: '${effectType}(${intensity}px)'
      }}
    />
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="EffectVideo"
      component={EffectVideo}
      durationInFrames={${10 * fps}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}

function generateResizeComposition(
  input: string,
  params: Record<string, unknown>,
  width: number,
  height: number,
  fps: number
): string {
  const newWidth = (params.newWidth as number) || 1280;
  const newHeight = (params.newHeight as number) || 720;

  return `import { Composition, Video, staticFile } from 'remotion';

const ResizedVideo = () => {
  return (
    <Video
      src={staticFile('${input}')}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="ResizedVideo"
      component={ResizedVideo}
      durationInFrames={${10 * fps}}
      fps={${fps}}
      width={${newWidth}}
      height={${newHeight}}
    />
  );
};
`;
}

function generateCropComposition(
  input: string,
  params: Record<string, unknown>,
  width: number,
  height: number,
  fps: number
): string {
  const cropX = (params.x as number) || 0;
  const cropY = (params.y as number) || 0;
  const cropWidth = (params.width as number) || width;
  const cropHeight = (params.height as number) || height;

  return `import { Composition, Video, staticFile } from 'remotion';

const CroppedVideo = () => {
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <Video
        src={staticFile('${input}')}
        style={{
          width: '${(width / cropWidth) * 100}%',
          height: '${(height / cropHeight) * 100}%',
          objectFit: 'cover',
          objectPosition: '-${cropX}px -${cropY}px'
        }}
      />
    </div>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="CroppedVideo"
      component={CroppedVideo}
      durationInFrames={${10 * fps}}
      fps={${fps}}
      width={${cropWidth}}
      height={${cropHeight}}
    />
  );
};
`;
}

function generateDefaultComposition(
  inputs: string[],
  width: number,
  height: number,
  fps: number
): string {
  return `import { Composition, Video, staticFile } from 'remotion';

const DefaultVideo = () => {
  return (
    <Video
      src={staticFile('${inputs[0]}')}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="DefaultVideo"
      component={DefaultVideo}
      durationInFrames={${10 * fps}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}
