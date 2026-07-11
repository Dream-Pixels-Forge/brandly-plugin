import { Tool } from "@opencode-ai/plugin";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PHASE_ORDER, VIDEO_STYLES } from "../constants";
import { ToolContext, ProjectData } from "../types";

interface PlatformConfig {
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
  maxDuration: number; // seconds, 0 = unlimited
  fps: number;
  label: string;
}

const PLATFORMS: Record<string, PlatformConfig> = {
  youtube: {
    name: "YouTube",
    width: 1920,
    height: 1080,
    aspectRatio: "16:9",
    maxDuration: 0,
    fps: 30,
    label: "YouTube (16:9)",
  },
  youtube_shorts: {
    name: "YouTube Shorts",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    maxDuration: 60,
    fps: 30,
    label: "YouTube Shorts (9:16)",
  },
  tiktok: {
    name: "TikTok",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    maxDuration: 180,
    fps: 30,
    label: "TikTok (9:16)",
  },
  instagram_reels: {
    name: "Instagram Reels",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    maxDuration: 90,
    fps: 30,
    label: "Instagram Reels (9:16)",
  },
  instagram_feed: {
    name: "Instagram Feed",
    width: 1080,
    height: 1080,
    aspectRatio: "1:1",
    maxDuration: 60,
    fps: 30,
    label: "Instagram Feed (1:1)",
  },
  square: {
    name: "Square",
    width: 1080,
    height: 1080,
    aspectRatio: "1:1",
    maxDuration: 0,
    fps: 30,
    label: "Square (1:1)",
  },
};

function parseAspectRatio(ratio: string): number {
  const [w, h] = ratio.split(":").map(Number);
  return w / h;
}

function generateReframeComposition(
  platform: PlatformConfig,
  sourceVideo: string,
  hasAudio: boolean
): string {
  return `import { Composition, staticFile } from "remotion";
import { Reframe } from "./Reframe";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="${platform.name.replace(/\s+/g, "")}"
      component={Reframe}
      durationInFrames={30 * 60}
      fps={${platform.fps}}
      width={${platform.width}}
      height={${platform.height}}
      defaultProps={{
        src: staticFile("${sourceVideo}"),
        targetWidth: ${platform.width},
        targetHeight: ${platform.height},
      }}
    />
  );
};
`;
}

function generateReframeComponent(hasAudio: boolean): string {
  return `import { AbsoluteFill, Video, Audio, staticFile, useVideoConfig, calculateScale } from "remotion";

interface ReframeProps {
  src: string;
  targetWidth: number;
  targetHeight: number;
}

export const Reframe: React.FC<ReframeProps> = ({
  src,
  targetWidth,
  targetHeight,
}) => {
  const { width, height } = useVideoConfig();

  const scale = calculateScale({
    width: targetWidth,
    height: targetHeight,
    videoWidth: width,
    videoHeight: height,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Video
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </AbsoluteFill>
  );
};
`;
}

function generatePackageJson(projectId: string): string {
  return JSON.stringify(
    {
      name: "brandly-export-" + projectId,
      version: "1.0.0",
      private: true,
      scripts: {
        studio: "remotion studio",
        render: "remotion render",
        build: "remotion render src/index.ts",
      },
      dependencies: {
        "@remotion/cli": "4.0.0",
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        remotion: "4.0.0",
      },
      devDependencies: {
        "@types/react": "^18.2.0",
        typescript: "^5.3.0",
      },
    },
    null,
    2
  );
}

function generateIndex(): string {
  return `import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
`;
}

function generateRemotionConfig(): string {
  return `import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
`;
}

export function createMultiPlatformExportTool(ctx: ToolContext): Tool {
  return {
    name: "brandly_multi_platform_export",
    description: `Export a video project to multiple platform formats. Takes a source video and generates optimized versions for YouTube, TikTok, Instagram Reels, Instagram Feed, and Square formats with correct aspect ratios and duration limits.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        projectID: {
          type: "string",
          description: "The project ID to export",
        },
        platforms: {
          type: "array",
          items: { type: "string" },
          description: `Platforms to export to. Options: ${Object.keys(PLATFORMS).join(", ")}. Use "all" for all platforms.`,
        },
        sourceVideo: {
          type: "string",
          description: "Path to the source video file (relative to project directory)",
        },
      },
      required: ["projectID", "platforms", "sourceVideo"],
    },
    execute: async (input: {
      projectID: string;
      platforms: string[];
      sourceVideo: string;
    }) => {
      const { projectID, platforms, sourceVideo } = input;

      // Validate project exists
      const projectDir = join(ctx.directory, ".brandly", "projects", projectID);
      if (!existsSync(projectDir)) {
        throw new Error(`Project ${projectID} not found`);
      }

      // Read project data
      const projectPath = join(projectDir, "project.json");
      const project: ProjectData = JSON.parse(
        readFileSync(projectPath, "utf-8")
      );

      // Determine platforms to export
      let targetPlatforms = platforms;
      if (platforms.includes("all")) {
        targetPlatforms = Object.keys(PLATFORMS);
      }

      // Validate platforms
      const validPlatforms = targetPlatforms.filter((p) => PLATFORMS[p]);
      if (validPlatforms.length === 0) {
        throw new Error(
          `Invalid platforms. Available: ${Object.keys(PLATFORMS).join(", ")}`
        );
      }

      // Create export directory
      const exportDir = join(ctx.directory, "export", projectID);
      mkdirSync(exportDir, { recursive: true });

      // Generate Remotion project for each platform
      const exports = [];
      for (const platformKey of validPlatforms) {
        const platform = PLATFORMS[platformKey];

        // Create platform directory
        const platformDir = join(exportDir, platformKey);
        mkdirSync(platformDir, { recursive: true });
        mkdirSync(join(platformDir, "src"), { recursive: true });

        // Copy source video to platform assets
        const assetsDir = join(platformDir, "public");
        mkdirSync(assetsDir, { recursive: true });

        // Generate Remotion files
        writeFileSync(
          join(platformDir, "src", "Root.tsx"),
          generateReframeComposition(platform, sourceVideo, true)
        );
        writeFileSync(
          join(platformDir, "src", "Reframe.tsx"),
          generateReframeComponent(true)
        );
        writeFileSync(
          join(platformDir, "src", "index.ts"),
          generateIndex()
        );
        writeFileSync(
          join(platformDir, "remotion.config.ts"),
          generateRemotionConfig()
        );
        writeFileSync(
          join(platformDir, "package.json"),
          generatePackageJson(`${projectID}-${platformKey}`)
        );

        exports.push({
          platform: platformKey,
          label: platform.label,
          width: platform.width,
          height: platform.height,
          maxDuration: platform.maxDuration || "unlimited",
          path: platformDir,
        });
      }

      // Update project data
      project.output = project.output || {};
      (project.output as any).platforms = exports;
      writeFileSync(projectPath, JSON.stringify(project, null, 2));

      return {
        projectID,
        sourceVideo,
        platforms: exports,
        message: `Generated ${exports.length} platform export(s). Run \`npm install && npm run build\` in each platform directory to render.`,
      };
    },
  };
}
