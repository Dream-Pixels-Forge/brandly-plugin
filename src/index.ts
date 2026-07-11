import { join } from "node:path";
import { existsSync } from "node:fs";
import { createContext } from "./tools/context";
import { createStartTool } from "./tools/start";
import { createStatusTool } from "./tools/status";
import { createApproveTool } from "./tools/approve";
import { createRunTool } from "./tools/run";
import { createEstimateTool } from "./tools/estimate";
import { createReEditTool } from "./tools/re_edit";
import { createValidateTool } from "./tools/validate";
import { createMemoryTool } from "./tools/memory";
import { createImageTool } from "./tools/image";
import { createCostTool } from "./tools/cost";
import { createArtifactTool } from "./tools/artifact";
import { createTemplatesTool } from "./tools/templates";
import { createCancelTool } from "./tools/cancel";
import { createProgressTool } from "./tools/progress";
import { createExportTool } from "./tools/export";
import { createDownloadTool } from "./tools/download";
import { createProviderTool } from "./tools/provider";
import { createVideoEditTool } from "./tools/video-edit";
import { createVideoRenderTool } from "./tools/video-render";
import { createAssemblyTool } from "./tools/assembly";
import { createMultiPlatformExportTool } from "./tools/multi-platform-export";

export default function brandlyPlugin({
  directory,
}: {
  directory: string;
}) {
  const ctx = createContext(directory);

  const tools = [
    createStartTool(ctx),
    createStatusTool(ctx),
    createApproveTool(ctx),
    createRunTool(ctx),
    createEstimateTool(ctx),
    createReEditTool(ctx),
    createValidateTool(ctx),
    createMemoryTool(ctx),
    createImageTool(ctx),
    createCostTool(ctx),
    createArtifactTool(ctx),
    createTemplatesTool(ctx),
    createCancelTool(ctx),
    createProgressTool(ctx),
    createExportTool(ctx),
    createDownloadTool(ctx),
    createProviderTool(ctx),
    createVideoEditTool(ctx),
    createVideoRenderTool(ctx),
    createAssemblyTool(ctx),
    createMultiPlatformExportTool(ctx),
  ];

  return {
    name: "brandly",
    tools,
  };
}
