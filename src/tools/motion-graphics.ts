import { tool } from "@opencode-ai/plugin/tool";
import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";

function jsStr(value: unknown): string {
  return JSON.stringify(value ?? "");
}

export interface MotionGraphicElement {
  type: "text" | "rect" | "circle" | "line" | "image";
  id?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  borderRadius?: number;
  opacity?: number;
  rotation?: number;
  strokeWidth?: number;
  src?: string;
  animation?: {
    type:
      | "fadeIn"
      | "fadeOut"
      | "slideInLeft"
      | "slideInRight"
      | "slideInTop"
      | "slideInBottom"
      | "scaleIn"
      | "scaleOut"
      | "rotateIn"
      | "typewriter"
      | "bounce"
      | "pulse"
      | "blurIn"
      | "countUp"
      | "drawLine";
    duration?: number;
    delay?: number;
    easing?: "linear" | "easeIn" | "easeOut" | "easeInOut" | "spring";
  };
}

export interface MotionGraphicScene {
  id: string;
  duration: number;
  background?: string;
  backgroundImage?: string;
  elements: MotionGraphicElement[];
}

export interface MotionGraphicProject {
  fps: number;
  width: number;
  height: number;
  scenes: MotionGraphicScene[];
  style?: string;
}

function generateElementAnimation(el: MotionGraphicElement, elementVar: string): string {
  const anim = el.animation;
  if (!anim) return "";

  const dur = anim.duration ?? 0.5;
  const delay = anim.delay ?? 0;
  const startFrame = `(${delay} * fps)`;
  const endFrame = `(${delay} + ${dur}) * fps`;

  switch (anim.type) {
    case "fadeIn":
      return `
    const ${elementVar}_opacity = interpolate(
       frame, ${startFrame}, ${endFrame}, [0, ${el.opacity ?? 1}], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;
    case "fadeOut":
      return `
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [${el.opacity ?? 1}, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;
    case "slideInLeft":
      return `
    const ${elementVar}_x = interpolate(
      frame, ${startFrame}, ${endFrame}, [-100, ${el.x}], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;
    case "slideInRight":
      return `
    const ${elementVar}_x = interpolate(
      frame, ${startFrame}, ${endFrame}, [110, ${el.x}], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;
    case "slideInTop":
      return `
    const ${elementVar}_y = interpolate(
      frame, ${startFrame}, ${endFrame}, [-100, ${el.y}], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;
    case "slideInBottom":
      return `
    const ${elementVar}_y = interpolate(
      frame, ${startFrame}, ${endFrame}, [110, ${el.y}], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;
    case "scaleIn":
      return `
    const ${elementVar}_scale = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;
    case "scaleOut":
      return `
    const ${elementVar}_scale = interpolate(
      frame, ${startFrame}, ${endFrame}, [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;
    case "rotateIn":
      return `
    const ${elementVar}_rotation = interpolate(
      frame, ${startFrame}, ${endFrame}, [-180, ${el.rotation ?? 0}], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;
    case "typewriter":
      return `
    const ${elementVar}_charCount = Math.floor(
      interpolate(frame, ${startFrame}, ${endFrame}, [0, ${(el.text || "").length}], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    );`;
    case "bounce":
      return `
    const ${elementVar}_bounce = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_scale = 1 + Math.sin(${elementVar}_bounce * Math.PI * 3) * 0.1 * (1 - ${elementVar}_bounce);
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;
    case "pulse":
      return `
    const ${elementVar}_pulse = Math.sin((frame - ${startFrame}) / ${dur} * fps * Math.PI * 2) * 0.5 + 0.5;
    const ${elementVar}_scale = 1 + ${elementVar}_pulse * 0.05;
    const ${elementVar}_opacity = interpolate(
       frame, ${startFrame}, ${endFrame}, [0, ${el.opacity ?? 1}], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;
    case "blurIn":
      return `
    const ${elementVar}_blur = interpolate(
      frame, ${startFrame}, ${endFrame}, [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;
    case "countUp":
      return `
    const ${elementVar}_count = Math.floor(
       interpolate(frame, ${startFrame}, ${endFrame}, [0, ${parseInt(jsStr(el.text || "100"), 10) || 100}], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    );`;
    case "drawLine":
      return `
    const ${elementVar}_progress = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;
    default:
      return "";
  }
}

function generateElementStyle(el: MotionGraphicElement, elementVar: string): string {
  const anim = el.animation?.type;
  const parts: string[] = [];

  parts.push(`position: 'absolute'`);
  parts.push(`left: '${el.x}%'`);
  parts.push(`top: '${el.y}%'`);

  if (el.width) parts.push(`width: '${el.width}%'`);
  if (el.height) parts.push(`height: '${el.height}%'`);
  if (el.color && el.type !== "line") parts.push(`color: ${jsStr(el.color)}`);
  if (el.fontSize) parts.push(`fontSize: ${el.fontSize}`);
  if (el.fontWeight) parts.push(`fontWeight: ${jsStr(el.fontWeight)}`);
  if (el.fontFamily) parts.push(`fontFamily: ${jsStr(el.fontFamily)}`);
  if (el.borderRadius) parts.push(`borderRadius: ${el.borderRadius}`);
  if (el.strokeWidth) parts.push(`strokeWidth: ${el.strokeWidth}`);

  if (anim === "fadeIn" || anim === "fadeOut") {
    parts.push(`opacity: ${elementVar}_opacity`);
  }
  if (anim === "slideInLeft" || anim === "slideInRight") {
    parts.push(`left: ${elementVar}_x + '%'`);
    parts.push(`opacity: ${elementVar}_opacity`);
  }
  if (anim === "slideInTop" || anim === "slideInBottom") {
    parts.push(`top: ${elementVar}_y + '%'`);
    parts.push(`opacity: ${elementVar}_opacity`);
  }
  if (anim === "scaleIn" || anim === "scaleOut") {
    parts.push(`transform: 'scale(' + ${elementVar}_scale + ')'`);
    parts.push(`opacity: ${elementVar}_opacity`);
  }
  if (anim === "rotateIn") {
    parts.push(`transform: 'rotate(' + ${elementVar}_rotation + 'deg)'`);
    parts.push(`opacity: ${elementVar}_opacity`);
  }
  if (anim === "bounce") {
    parts.push(`transform: 'scale(' + ${elementVar}_scale + ')'`);
    parts.push(`opacity: ${elementVar}_opacity`);
  }
  if (anim === "pulse") {
    parts.push(`transform: 'scale(' + ${elementVar}_scale + ')'`);
    parts.push(`opacity: ${elementVar}_opacity`);
  }
  if (anim === "blurIn") {
    parts.push(`filter: 'blur(' + ${elementVar}_blur + 'px)'`);
    parts.push(`opacity: ${elementVar}_opacity`);
  }
  if (!anim && el.opacity !== undefined) {
    parts.push(`opacity: ${el.opacity}`);
  }
  if (el.rotation && anim !== "rotateIn") {
    parts.push(`transform: 'rotate(${el.rotation}deg)'`);
  }

  return `{\n          ${parts.join(",\n          ")}\n        }`;
}

function generateElementJSX(el: MotionGraphicElement, index: number, sceneIndex: number): string {
  const tag = `el${sceneIndex}_${index}`;
  const style = generateElementStyle(el, tag);

  let innerJSX = "";

  switch (el.type) {
    case "text": {
      if (el.animation?.type === "typewriter") {
        innerJSX = `<span>{${tag}_text.slice(0, ${tag}_charCount)}</span>`;
      } else if (el.animation?.type === "countUp") {
        innerJSX = `<span>{${tag}_count}</span>`;
      } else {
        innerJSX = `<span>{${tag}_text}</span>`;
      }
      break;
    }
    case "rect":
      innerJSX = "";
      break;
    case "circle":
      innerJSX = "";
      break;
    case "line": {
      const lineColor = jsStr(el.color || "#ffffff");
      const sw = el.strokeWidth || 2;
      if (el.animation?.type === "drawLine") {
        innerJSX = `<div style={{ position: 'absolute', left: '${el.x}%', top: '${el.y}%', width: '${el.width || 50}%', height: ${sw}, background: ${lineColor}, transformOrigin: 'left', transform: 'scaleX(' + ${tag}_progress + ')' }} />`;
        return innerJSX;
      }
      innerJSX = `<div style={{ ...${style}, height: ${sw}, background: ${lineColor} }} />`;
      return innerJSX;
    }
    case "image":
      if (!el.src) return "";
      innerJSX = `<img src={${jsStr(el.src)}} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />`;
      break;
  }

  if (el.type === "rect" || el.type === "circle") {
    const bg = jsStr(el.color || "#ffffff");
    const br =
      el.type === "circle"
        ? "borderRadius: '50%'"
        : el.borderRadius
        ? `borderRadius: ${el.borderRadius}`
        : "";
    const rectStyle = style.replace(
      /^\{/,
      `{ ${br ? br + ", " : ""}background: ${bg},`
    );
    return `<div style={${rectStyle}} />`;
  }

  return `<div style={${style}}>\n        ${innerJSX}\n      </div>`;
}

function generateSceneComponent(scene: MotionGraphicScene, sceneIndex: number, fps: number): string {
  const compName = `Scene_${sceneIndex}`;
  const bg = jsStr(scene.background || "#000000");

  const elementBlocks = scene.elements
    .map((el, i) => generateElementJSX(el, i, sceneIndex))
    .join("\n\n    ");

  const animatedVars = scene.elements
    .map((el, i) => {
      if (!el.animation) return "";
      const varName = `el${sceneIndex}_${i}`;
      return generateElementAnimation(el, varName);
    })
    .filter(Boolean)
    .join("\n");

  const textVars = scene.elements
    .map((el, i) => {
      if (el.type !== "text") return "";
      const tag = `el${sceneIndex}_${i}`;
      return `    const ${tag}_text = ${jsStr(el.text || "Text")};`;
    })
    .filter(Boolean)
    .join("\n");

  return `
  // -- ${compName} (${scene.duration}s) --
  const ${compName} = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
${textVars}
${animatedVars}

    return (
      <AbsoluteFill style={{ background: ${bg}${scene.backgroundImage ? `, backgroundImage: ${jsStr(`url(${scene.backgroundImage})`)}, backgroundSize: 'cover'` : ""} }}>
    ${elementBlocks}
      </AbsoluteFill>
    );
  };`;
}

function generateFullComposition(project: MotionGraphicProject): string {
  const { fps, width, height, scenes } = project;

  let accumulatedFrames = 0;
  const sceneRanges: { from: number; duration: number }[] = [];
  for (const scene of scenes) {
    const dur = scene.duration * fps;
    sceneRanges.push({ from: accumulatedFrames, duration: dur });
    accumulatedFrames += dur;
  }
  const totalFrames = accumulatedFrames;

  const sceneComponents = scenes
    .map((s, i) => generateSceneComponent(s, i, fps))
    .join("\n");

  const sequenceBlocks = scenes
    .map((s, i) => {
      const range = sceneRanges[i];
      return `      <Sequence from={${range.from}} durationInFrames={${range.duration}}>
        <Scene_${i} />
      </Sequence>`;
    })
    .join("\n");

  return `import { Composition, AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

${sceneComponents}

  // -- Main Composition --
  const MotionGraphic = () => {
    return (
      <AbsoluteFill style={{ background: '#000' }}>
${sequenceBlocks}
      </AbsoluteFill>
    );
  };

  export const RemotionComposition = () => {
    return (
      <Composition
        id="MotionGraphic"
        component={MotionGraphic}
        durationInFrames={${totalFrames}}
        fps={${fps}}
        width={${width}}
        height={${height}}
      />
    );
  };
`;
}

function generateRootIndex(): string {
  return `import { registerRoot } from "remotion";
import { RemotionComposition } from "./Composition";

registerRoot(RemotionComposition);
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
      name: (projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-") || "brandly-motion-graphic"),
      version: "1.0.0",
      private: true,
      scripts: {
        start: "npx remotion studio",
        build: "npx remotion render src/index.ts MotionGraphic out/motion-graphic.mp4",
        "build:gif":
          "npx remotion render src/index.ts MotionGraphic out/motion-graphic.gif --codec gif",
        "build:webm":
          "npx remotion render src/index.ts MotionGraphic out/motion-graphic.webm --codec vp8",
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

function generateBuildScript(outputPath: string): string {
  return `#!/bin/bash
# Brandly Motion Graphics Build Script
# Generated: ${new Date().toISOString()}

set -e

echo "🎬 Building motion graphic..."

if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo "🎥 Rendering video..."
npx remotion render src/index.ts MotionGraphic "${outputPath}" --codec h264

echo "✅ Build complete: ${outputPath}"
`;
}

function generatePreset(
  preset: string,
  fps: number,
  width: number,
  height: number
): MotionGraphicProject {
  switch (preset) {
    case "title-reveal":
      return {
        fps,
        width,
        height,
        scenes: [
          {
            id: "title",
            duration: 4,
            background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
            elements: [
              {
                type: "rect",
                x: 5,
                y: 40,
                width: 90,
                height: 20,
                color: "rgba(255,255,255,0.05)",
                borderRadius: 16,
                animation: { type: "scaleIn", duration: 0.8, easing: "spring" },
              },
              {
                type: "text",
                x: 10,
                y: 42,
                width: 80,
                text: "YOUR TITLE",
                color: "#ffffff",
                fontSize: 72,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "typewriter", duration: 1.5, delay: 0.3 },
              },
              {
                type: "text",
                x: 10,
                y: 56,
                width: 80,
                text: "Subtitle goes here",
                color: "rgba(255,255,255,0.7)",
                fontSize: 28,
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.8, delay: 1.8 },
              },
              {
                type: "line",
                x: 30,
                y: 54,
                width: 40,
                color: "#6c63ff",
                strokeWidth: 3,
                animation: { type: "drawLine", duration: 0.6, delay: 1.5 },
              },
            ],
          },
        ],
      };

    case "product-showcase":
      return {
        fps,
        width,
        height,
        scenes: [
          {
            id: "intro",
            duration: 3,
            background: "#0a0a0a",
            elements: [
              {
                type: "circle",
                x: 35,
                y: 25,
                width: 30,
                height: 30,
                color: "#6c63ff",
                animation: { type: "scaleIn", duration: 0.6, easing: "spring" },
              },
              {
                type: "text",
                x: 10,
                y: 60,
                width: 80,
                text: "INTRODUCING",
                color: "rgba(255,255,255,0.5)",
                fontSize: 24,
                fontWeight: "600",
                fontFamily: "Arial, sans-serif",
                animation: { type: "slideInBottom", duration: 0.5, delay: 0.3 },
              },
              {
                type: "text",
                x: 10,
                y: 68,
                width: 80,
                text: "Product Name",
                color: "#ffffff",
                fontSize: 56,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "slideInBottom", duration: 0.6, delay: 0.5, easing: "easeOut" },
              },
            ],
          },
          {
            id: "features",
            duration: 4,
            background: "#0a0a0a",
            elements: [
              {
                type: "rect",
                x: 5,
                y: 10,
                width: 27,
                height: 35,
                color: "#1a1a2e",
                borderRadius: 12,
                animation: { type: "slideInLeft", duration: 0.5 },
              },
              {
                type: "text",
                x: 7,
                y: 15,
                width: 23,
                text: "Fast",
                color: "#6c63ff",
                fontSize: 28,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.4, delay: 0.3 },
              },
              {
                type: "text",
                x: 7,
                y: 25,
                width: 23,
                text: "10x faster than competitors",
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.4, delay: 0.5 },
              },
              {
                type: "rect",
                x: 36,
                y: 10,
                width: 27,
                height: 35,
                color: "#1a1a2e",
                borderRadius: 12,
                animation: { type: "slideInLeft", duration: 0.5, delay: 0.2 },
              },
              {
                type: "text",
                x: 38,
                y: 15,
                width: 23,
                text: "Secure",
                color: "#6c63ff",
                fontSize: 28,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.4, delay: 0.5 },
              },
              {
                type: "text",
                x: 38,
                y: 25,
                width: 23,
                text: "Enterprise-grade encryption",
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.4, delay: 0.7 },
              },
              {
                type: "rect",
                x: 67,
                y: 10,
                width: 27,
                height: 35,
                color: "#1a1a2e",
                borderRadius: 12,
                animation: { type: "slideInLeft", duration: 0.5, delay: 0.4 },
              },
              {
                type: "text",
                x: 69,
                y: 15,
                width: 23,
                text: "Simple",
                color: "#6c63ff",
                fontSize: 28,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.4, delay: 0.7 },
              },
              {
                type: "text",
                x: 69,
                y: 25,
                width: 23,
                text: "Setup in under 2 minutes",
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.4, delay: 0.9 },
              },
            ],
          },
          {
            id: "cta",
            duration: 3,
            background: "linear-gradient(135deg, #6c63ff, #3f3d99)",
            elements: [
              {
                type: "text",
                x: 10,
                y: 35,
                width: 80,
                text: "Get Started Today",
                color: "#ffffff",
                fontSize: 64,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "scaleIn", duration: 0.6, easing: "spring" },
              },
              {
                type: "rect",
                x: 30,
                y: 55,
                width: 40,
                height: 10,
                color: "#ffffff",
                borderRadius: 50,
                animation: { type: "fadeIn", duration: 0.5, delay: 0.5 },
              },
              {
                type: "text",
                x: 30,
                y: 56.5,
                width: 40,
                text: "Start Free Trial",
                color: "#6c63ff",
                fontSize: 24,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.5, delay: 0.6 },
              },
            ],
          },
        ],
      };

    case "kinetic-text":
      return {
        fps,
        width,
        height,
        scenes: [
          {
            id: "word1",
            duration: 1.5,
            background: "#0f0f0f",
            elements: [
              {
                type: "text",
                x: 10,
                y: 30,
                width: 80,
                text: "CREATE",
                color: "#ffffff",
                fontSize: 120,
                fontWeight: "900",
                fontFamily: "Impact, sans-serif",
                animation: { type: "scaleIn", duration: 0.3, easing: "spring" },
              },
            ],
          },
          {
            id: "word2",
            duration: 1.5,
            background: "#1a1a2e",
            elements: [
              {
                type: "text",
                x: 10,
                y: 30,
                width: 80,
                text: "STUNNING",
                color: "#6c63ff",
                fontSize: 120,
                fontWeight: "900",
                fontFamily: "Impact, sans-serif",
                animation: { type: "slideInLeft", duration: 0.3, easing: "spring" },
              },
            ],
          },
          {
            id: "word3",
            duration: 1.5,
            background: "#0f0f0f",
            elements: [
              {
                type: "text",
                x: 10,
                y: 30,
                width: 80,
                text: "MOTION",
                color: "#ffffff",
                fontSize: 120,
                fontWeight: "900",
                fontFamily: "Impact, sans-serif",
                animation: { type: "slideInRight", duration: 0.3, easing: "spring" },
              },
            ],
          },
          {
            id: "word4",
            duration: 2,
            background: "linear-gradient(135deg, #6c63ff, #3f3d99)",
            elements: [
              {
                type: "text",
                x: 10,
                y: 25,
                width: 80,
                text: "GRAPHICS",
                color: "#ffffff",
                fontSize: 100,
                fontWeight: "900",
                fontFamily: "Impact, sans-serif",
                animation: { type: "bounce", duration: 0.8, easing: "spring" },
              },
              {
                type: "text",
                x: 10,
                y: 55,
                width: 80,
                text: "with brandly + remotion",
                color: "rgba(255,255,255,0.8)",
                fontSize: 32,
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.5, delay: 0.5 },
              },
            ],
          },
        ],
      };

    case "stats-counter":
      return {
        fps,
        width,
        height,
        scenes: [
          {
            id: "stats",
            duration: 5,
            background: "#0a0a0a",
            elements: [
              {
                type: "text",
                x: 10,
                y: 8,
                width: 80,
                text: "BY THE NUMBERS",
                color: "rgba(255,255,255,0.4)",
                fontSize: 20,
                fontWeight: "600",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.5 },
              },
              {
                type: "text",
                x: 5,
                y: 25,
                width: 25,
                text: "10000",
                color: "#6c63ff",
                fontSize: 64,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "countUp", duration: 2, delay: 0.3 },
              },
              {
                type: "text",
                x: 5,
                y: 42,
                width: 25,
                text: "Users",
                color: "rgba(255,255,255,0.6)",
                fontSize: 20,
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.4, delay: 0.5 },
              },
              {
                type: "text",
                x: 37,
                y: 25,
                width: 25,
                text: "500",
                color: "#ff6b6b",
                fontSize: 64,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "countUp", duration: 2, delay: 0.6 },
              },
              {
                type: "text",
                x: 37,
                y: 42,
                width: 25,
                text: "Projects",
                color: "rgba(255,255,255,0.6)",
                fontSize: 20,
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.4, delay: 0.8 },
              },
              {
                type: "text",
                x: 70,
                y: 25,
                width: 25,
                text: "99",
                color: "#4ecdc4",
                fontSize: 64,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "countUp", duration: 2, delay: 0.9 },
              },
              {
                type: "text",
                x: 70,
                y: 42,
                width: 25,
                text: "% Uptime",
                color: "rgba(255,255,255,0.6)",
                fontSize: 20,
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.4, delay: 1.1 },
              },
              {
                type: "line",
                x: 5,
                y: 55,
                width: 90,
                color: "rgba(255,255,255,0.1)",
                strokeWidth: 1,
              },
              {
                type: "text",
                x: 10,
                y: 60,
                width: 80,
                text: "Trusted by teams worldwide",
                color: "rgba(255,255,255,0.5)",
                fontSize: 24,
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.6, delay: 2.5 },
              },
            ],
          },
        ],
      };

    case "collage-motion-graphic":
      return {
        fps,
        width,
        height,
        scenes: [
          {
            id: "collage-bg",
            duration: 2,
            background: "linear-gradient(45deg, #1a1a2e, #16213e)",
            elements: [
              {
                type: "rect",
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                color: "rgba(255,255,255,0.03)",
                animation: { type: "fadeIn", duration: 1 },
              },
              {
                type: "rect",
                x: 5,
                y: 10,
                width: 35,
                height: 45,
                color: "#2a2a4a",
                borderRadius: 8,
                rotation: -5,
                animation: { type: "scaleIn", duration: 0.6, delay: 0.2, easing: "spring" },
              },
              {
                type: "rect",
                x: 60,
                y: 15,
                width: 35,
                height: 45,
                color: "#2a2a4a",
                borderRadius: 8,
                rotation: 5,
                animation: { type: "scaleIn", duration: 0.6, delay: 0.4, easing: "spring" },
              },
              {
                type: "rect",
                x: 30,
                y: 50,
                width: 40,
                height: 40,
                color: "#2a2a4a",
                borderRadius: 8,
                animation: { type: "scaleIn", duration: 0.6, delay: 0.6, easing: "spring" },
              },
              {
                type: "text",
                x: 15,
                y: 70,
                width: 70,
                text: "YOUR BRAND",
                color: "#ffffff",
                fontSize: 72,
                fontWeight: "900",
                fontFamily: "Impact, sans-serif",
                animation: { type: "slideInBottom", duration: 0.8, delay: 0.8, easing: "easeOut" },
              },
              {
                type: "text",
                x: 20,
                y: 85,
                width: 60,
                text: "COLLAGE STYLE",
                color: "rgba(255,255,255,0.6)",
                fontSize: 28,
                fontWeight: "600",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.6, delay: 1.2 },
              },
            ],
          },
        ],
      };

    case "brand-short-video":
      return {
        fps,
        width,
        height,
        scenes: [
          {
            id: "intro",
            duration: 2,
            background: "linear-gradient(135deg, #0f0f0f, #1a1a2e)",
            elements: [
              {
                type: "circle",
                x: 40,
                y: 20,
                width: 20,
                height: 20,
                color: "#6c63ff",
                animation: { type: "scaleIn", duration: 0.5, easing: "spring" },
              },
              {
                type: "text",
                x: 10,
                y: 50,
                width: 80,
                text: "BRAND NAME",
                color: "#ffffff",
                fontSize: 80,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "scaleIn", duration: 0.6, delay: 0.3, easing: "spring" },
              },
              {
                type: "line",
                x: 30,
                y: 70,
                width: 40,
                color: "#6c63ff",
                strokeWidth: 3,
                animation: { type: "drawLine", duration: 0.5, delay: 0.6 },
              },
              {
                type: "text",
                x: 10,
                y: 75,
                width: 80,
                text: "Tagline goes here",
                color: "rgba(255,255,255,0.7)",
                fontSize: 28,
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.5, delay: 0.9 },
              },
            ],
          },
          {
            id: "features",
            duration: 3,
            background: "#0f0f0f",
            elements: [
              {
                type: "rect",
                x: 5,
                y: 10,
                width: 90,
                height: 25,
                color: "#1a1a2e",
                borderRadius: 12,
                animation: { type: "slideInLeft", duration: 0.5 },
              },
              {
                type: "text",
                x: 10,
                y: 15,
                width: 35,
                text: "01",
                color: "#6c63ff",
                fontSize: 48,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "countUp", duration: 0.8, delay: 0.3 },
              },
              {
                type: "text",
                x: 45,
                y: 15,
                width: 45,
                text: "Feature One",
                color: "#ffffff",
                fontSize: 32,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.4, delay: 0.4 },
              },
              {
                type: "text",
                x: 45,
                y: 25,
                width: 45,
                text: "Description of the first key feature",
                color: "rgba(255,255,255,0.6)",
                fontSize: 16,
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.4, delay: 0.6 },
              },
              {
                type: "rect",
                x: 5,
                y: 40,
                width: 90,
                height: 25,
                color: "#1a1a2e",
                borderRadius: 12,
                animation: { type: "slideInLeft", duration: 0.5, delay: 0.3 },
              },
              {
                type: "text",
                x: 10,
                y: 45,
                width: 35,
                text: "02",
                color: "#ff6b6b",
                fontSize: 48,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "countUp", duration: 0.8, delay: 0.6 },
              },
              {
                type: "text",
                x: 45,
                y: 45,
                width: 45,
                text: "Feature Two",
                color: "#ffffff",
                fontSize: 32,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.4, delay: 0.7 },
              },
              {
                type: "text",
                x: 45,
                y: 55,
                width: 45,
                text: "Description of the second key feature",
                color: "rgba(255,255,255,0.6)",
                fontSize: 16,
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.4, delay: 0.9 },
              },
            ],
          },
          {
            id: "cta",
            duration: 2,
            background: "linear-gradient(135deg, #6c63ff, #3f3d99)",
            elements: [
              {
                type: "text",
                x: 10,
                y: 30,
                width: 80,
                text: "Get Started",
                color: "#ffffff",
                fontSize: 72,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "scaleIn", duration: 0.5, easing: "spring" },
              },
              {
                type: "rect",
                x: 35,
                y: 55,
                width: 30,
                height: 8,
                color: "#ffffff",
                borderRadius: 50,
                animation: { type: "fadeIn", duration: 0.4, delay: 0.4 },
              },
              {
                type: "text",
                x: 35,
                y: 56,
                width: 30,
                text: "Learn More",
                color: "#6c63ff",
                fontSize: 20,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.4, delay: 0.5 },
              },
            ],
          },
        ],
      };

    case "explainer-video":
      return {
        fps,
        width,
        height,
        scenes: [
          {
            id: "problem",
            duration: 3,
            background: "linear-gradient(180deg, #1a1a2e, #0f0f0f)",
            elements: [
              {
                type: "text",
                x: 10,
                y: 15,
                width: 80,
                text: "THE PROBLEM",
                color: "#ff6b6b",
                fontSize: 24,
                fontWeight: "600",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.5 },
              },
              {
                type: "text",
                x: 10,
                y: 30,
                width: 80,
                text: "Struggling to Create Engaging Content?",
                color: "#ffffff",
                fontSize: 48,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "slideInLeft", duration: 0.6, delay: 0.3, easing: "easeOut" },
              },
              {
                type: "rect",
                x: 10,
                y: 60,
                width: 80,
                height: 30,
                color: "rgba(255,255,255,0.05)",
                borderRadius: 12,
                animation: { type: "fadeIn", duration: 0.5, delay: 0.6 },
              },
              {
                type: "text",
                x: 15,
                y: 65,
                width: 70,
                text: "Most businesses spend hours creating videos that don't convert.",
                color: "rgba(255,255,255,0.7)",
                fontSize: 20,
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.5, delay: 0.8 },
              },
            ],
          },
          {
            id: "solution",
            duration: 3,
            background: "linear-gradient(180deg, #0f0f0f, #1a1a2e)",
            elements: [
              {
                type: "text",
                x: 10,
                y: 15,
                width: 80,
                text: "THE SOLUTION",
                color: "#4ecdc4",
                fontSize: 24,
                fontWeight: "600",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.5 },
              },
              {
                type: "text",
                x: 10,
                y: 30,
                width: 80,
                text: "AI-Powered Video Creation",
                color: "#ffffff",
                fontSize: 48,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "slideInRight", duration: 0.6, delay: 0.3, easing: "easeOut" },
              },
              {
                type: "circle",
                x: 70,
                y: 60,
                width: 20,
                height: 20,
                color: "rgba(78, 205, 196, 0.2)",
                animation: { type: "pulse", duration: 2, delay: 0.5 },
              },
              {
                type: "text",
                x: 10,
                y: 55,
                width: 55,
                text: "Create professional videos in minutes, not hours.",
                color: "rgba(255,255,255,0.7)",
                fontSize: 20,
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.5, delay: 0.6 },
              },
            ],
          },
          {
            id: "benefits",
            duration: 3,
            background: "#0f0f0f",
            elements: [
              {
                type: "text",
                x: 10,
                y: 10,
                width: 80,
                text: "BENEFITS",
                color: "rgba(255,255,255,0.4)",
                fontSize: 20,
                fontWeight: "600",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.4 },
              },
              {
                type: "rect",
                x: 5,
                y: 25,
                width: 27,
                height: 35,
                color: "#1a1a2e",
                borderRadius: 8,
                animation: { type: "scaleIn", duration: 0.4, delay: 0.2 },
              },
              {
                type: "text",
                x: 7,
                y: 30,
                width: 23,
                text: "10x Faster",
                color: "#6c63ff",
                fontSize: 24,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.3, delay: 0.4 },
              },
              {
                type: "rect",
                x: 36,
                y: 25,
                width: 27,
                height: 35,
                color: "#1a1a2e",
                borderRadius: 8,
                animation: { type: "scaleIn", duration: 0.4, delay: 0.4 },
              },
              {
                type: "text",
                x: 38,
                y: 30,
                width: 23,
                text: "50% Less Cost",
                color: "#ff6b6b",
                fontSize: 24,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.3, delay: 0.6 },
              },
              {
                type: "rect",
                x: 67,
                y: 25,
                width: 27,
                height: 35,
                color: "#1a1a2e",
                borderRadius: 8,
                animation: { type: "scaleIn", duration: 0.4, delay: 0.6 },
              },
              {
                type: "text",
                x: 69,
                y: 30,
                width: 23,
                text: "Pro Quality",
                color: "#4ecdc4",
                fontSize: 24,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.3, delay: 0.8 },
              },
            ],
          },
          {
            id: "cta",
            duration: 2,
            background: "linear-gradient(135deg, #6c63ff, #3f3d99)",
            elements: [
              {
                type: "text",
                x: 10,
                y: 30,
                width: 80,
                text: "Start Creating Today",
                color: "#ffffff",
                fontSize: 56,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "scaleIn", duration: 0.5, easing: "spring" },
              },
              {
                type: "rect",
                x: 30,
                y: 55,
                width: 40,
                height: 10,
                color: "#ffffff",
                borderRadius: 50,
                animation: { type: "fadeIn", duration: 0.4, delay: 0.4 },
              },
              {
                type: "text",
                x: 30,
                y: 56,
                width: 40,
                text: "Try Free",
                color: "#6c63ff",
                fontSize: 22,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.4, delay: 0.5 },
              },
            ],
          },
        ],
      };

    default:
      return {
        fps,
        width,
        height,
        scenes: [
          {
            id: "default",
            duration: 3,
            background: "#000000",
            elements: [
              {
                type: "text",
                x: 10,
                y: 40,
                width: 80,
                text: "Motion Graphic",
                color: "#ffffff",
                fontSize: 64,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: { type: "fadeIn", duration: 0.8 },
              },
            ],
          },
        ],
      };
  }
}

export function createMotionGraphicsTool(ctx: ToolContext) {
  return tool({
    name: "brandly_motion_graphics",
    description:
      "Create animated motion graphics using Remotion — kinetic typography, product showcases, stat counters, title reveals, collage-style compositions, brand short videos, explainer videos, and custom scene-based animations. Generates a complete Remotion project with spring physics, easing, and frame-accurate timing.",
    args: {
      projectID: tool.schema.string({ description: "The project UUID" }),
      preset: tool.schema.enum(
        ["title-reveal", "product-showcase", "kinetic-text", "stats-counter", "collage-motion-graphic", "brand-short-video", "explainer-video", "custom"],
        { description: "Preset template. Use 'custom' to provide your own scenes." }
      ),
      scenes: tool.schema.array(
        tool.schema.object({
          id: tool.schema.string(),
          duration: tool.schema.number(),
          background: tool.schema.string(),
          backgroundImage: tool.schema.string(),
          elements: tool.schema.array(
            tool.schema.object({
              type: tool.schema.enum(["text", "rect", "circle", "line", "image"]),
              id: tool.schema.string(),
              x: tool.schema.number(),
              y: tool.schema.number(),
              width: tool.schema.number(),
              height: tool.schema.number(),
              text: tool.schema.string(),
              color: tool.schema.string(),
              fontSize: tool.schema.number(),
              fontWeight: tool.schema.string(),
              fontFamily: tool.schema.string(),
              borderRadius: tool.schema.number(),
              opacity: tool.schema.number(),
              rotation: tool.schema.number(),
              strokeWidth: tool.schema.number(),
              src: tool.schema.string(),
              animation: tool.schema.object({
                type: tool.schema.enum([
                  "fadeIn", "fadeOut", "slideInLeft", "slideInRight", "slideInTop",
                  "slideInBottom", "scaleIn", "scaleOut", "rotateIn", "typewriter",
                  "bounce", "pulse", "blurIn", "countUp", "drawLine",
                ]),
                duration: tool.schema.number(),
                delay: tool.schema.number(),
                easing: tool.schema.enum(["linear", "easeIn", "easeOut", "easeInOut", "spring"]),
              }),
            })
          ),
        }),
        { description: "Custom scenes array (required when preset='custom')." }
      ),
      fps: tool.schema.number({ description: "Frames per second", default: 30 }),
      width: tool.schema.number({ description: "Output width in pixels", default: 1920 }),
      height: tool.schema.number({ description: "Output height in pixels", default: 1080 }),
      outputPath: tool.schema.string({ description: "Output file path for rendered video" }),
      autoRender: tool.schema.boolean({ description: "Automatically render after creating the project", default: false }),
    },
    execute: async (args) => {
      const {
        projectID,
        preset,
        scenes,
        fps: fpsArg = 30,
        width: widthArg = 1920,
        height: heightArg = 1080,
        outputPath,
        autoRender = false,
      } = args;

      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      const fps = fpsArg;
      const width = widthArg;
      const height = heightArg;
      const projectName = project.name || `brandly-${projectID.slice(0, 8)}`;

      let mgProject: MotionGraphicProject;

      if (preset === "custom") {
        if (!scenes || scenes.length === 0) {
          throw new Error("scenes array is required when using preset='custom'");
        }
        mgProject = {
          fps,
          width,
          height,
          scenes: scenes as MotionGraphicScene[],
          style: "custom",
        };
      } else {
        mgProject = generatePreset(preset, fps, width, height);
      }

      const compositionCode = generateFullComposition(mgProject);

      const assemblyDir = join(ctx.directory, "motion-graphics", projectID);
      const srcDir = join(assemblyDir, "src");
      const outDir = join(assemblyDir, "out");

      await mkdir(srcDir, { recursive: true });
      await mkdir(outDir, { recursive: true });

      await writeFile(join(srcDir, "Composition.tsx"), compositionCode, "utf-8");
      await writeFile(join(srcDir, "index.ts"), generateRootIndex(), "utf-8");
      await writeFile(join(assemblyDir, "remotion.config.ts"), generateRemotionConfig(), "utf-8");
      await writeFile(join(assemblyDir, "package.json"), generatePackageJson(projectName), "utf-8");

      const finalOutputPath = outputPath || join(outDir, `motion-graphic-${Date.now()}.mp4`);
      const buildScript = generateBuildScript(finalOutputPath);
      await writeFile(join(assemblyDir, "build.sh"), buildScript, "utf-8");

      const meta = {
        id: `mg-${Date.now()}`,
        projectId: projectID,
        projectName,
        preset,
        fps,
        width,
        height,
        sceneCount: mgProject.scenes.length,
        totalDuration: mgProject.scenes.reduce((sum, s) => sum + s.duration, 0),
        assemblyDir,
        compositionPath: join(srcDir, "Composition.tsx"),
        outputPath: finalOutputPath,
        status: "created" as string,
        createdAt: new Date().toISOString(),
      };

      await writeFile(
        join(assemblyDir, "motion-graphics-meta.json"),
        JSON.stringify(meta, null, 2),
        "utf-8"
      );

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
      if (!phaseOutput.motionGraphics) {
        phaseOutput.motionGraphics = [];
      }
      phaseOutput.motionGraphics.push({
        mgId: meta.id,
        preset,
        assemblyDir,
        totalDuration: meta.totalDuration,
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

      let renderStatus: string | undefined;
      let renderOutput: string | undefined;
      if (autoRender) {
        try {
          const shell = process.platform === "win32" ? "cmd" : "bash";
          const flag = process.platform === "win32" ? "/c" : "-c";
          renderOutput = execFileSync(
            shell,
            [flag, `cd ${JSON.stringify(assemblyDir)} && npm install && npm run build`],
            { encoding: "utf-8", timeout: 20 * 60 * 1000 }
          );
          meta.status = "rendered";
          renderStatus = "rendered";
        } catch (err) {
          meta.status = "render_failed";
          renderStatus = "render_failed";
          renderOutput = String(err);
        }
        await writeFile(
          join(assemblyDir, "motion-graphics-meta.json"),
          JSON.stringify(meta, null, 2),
          "utf-8"
        );
      }

      return {
        output: JSON.stringify({
          projectId: projectID,
          mgId: meta.id,
          projectName,
          preset,
          assemblyDir,
          sceneCount: mgProject.scenes.length,
          totalDuration: `${meta.totalDuration}s`,
          compositionPath: join(srcDir, "Composition.tsx"),
          outputPath: finalOutputPath,
          status: meta.status,
          renderStatus,
          renderOutput: renderStatus === "render_failed" ? renderOutput : undefined,
          message: `Motion graphic project created: ${preset} (${meta.totalDuration}s, ${mgProject.scenes.length} scenes)`,
          nextSteps,
        }),
      };
    },
  });
}
