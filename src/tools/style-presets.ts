export type StylePreset =
  | "none"
  | "photorealistic"
  | "editorial"
  | "cinematic"
  | "commercial"
  | "documentary";

export interface StyleConfig {
  promptSuffix: string;
  negativePrompt: string;
}

const PRESETS: Record<StylePreset, StyleConfig> = {
  none: {
    promptSuffix: "",
    negativePrompt: "",
  },
  photorealistic: {
    promptSuffix:
      ", shot on Sony A7IV, 85mm f/1.4 lens, shallow depth of field, natural skin texture with visible pores, subtle film grain, soft natural window light, slight lens imperfections, raw unedited photograph look",
    negativePrompt:
      "ai generated, smooth plastic skin, airbrushed, oversaturated colors, perfect symmetry, uncanny valley, digital art, 3d render, illustration, painting, cartoon, anime, oversharpened, hdr overprocessed",
  },
  editorial: {
    promptSuffix:
      ", magazine editorial photography, studio lighting with soft key and fill, clean composition, professional color grading, high-end retouching style, fashion photography aesthetic",
    negativePrompt:
      "ai generated, amateur photography, flat lighting, cluttered background, oversaturated, plastic skin, uncanny valley, clipart, illustration, low quality",
  },
  cinematic: {
    promptSuffix:
      ", anamorphic lens, 2.39:1 widescreen aspect, teal and orange color grading, film grain, volumetric light rays, shallow depth of field, cinematic color science, Kodak Vision3 500T film stock look",
    negativePrompt:
      "ai generated, flat lighting, oversaturated, plastic look, digital art, illustration, cartoon, anime, overexposed, underexposed, blurry, low quality",
  },
  commercial: {
    promptSuffix:
      ", product photography, clean white or dark studio background, three-point lighting setup, sharp focus on product, subtle reflections, high-end commercial quality, professional retouching",
    negativePrompt:
      "ai generated, cluttered background, harsh shadows, flat lighting, oversaturated, plastic look, low quality, amateur, blurry, noisy",
  },
  documentary: {
    promptSuffix:
      ", documentary photography, available light only, photojournalistic style, candid moment, natural colors, slight motion blur, gritty realistic texture, Leica M11 with 50mm summilux",
    negativePrompt:
      "ai generated, staged, artificial lighting, oversaturated, plastic skin, perfect composition, studio, posed, artificial, digital art, illustration",
  },
};

export function getStyleConfig(preset: StylePreset): StyleConfig {
  return PRESETS[preset] || PRESETS.none;
}

export function applyStylePreset(
  prompt: string,
  preset: StylePreset
): string {
  const config = getStyleConfig(preset);
  if (!config.promptSuffix) return prompt;
  return `${prompt}${config.promptSuffix}`;
}

export function getNegativePrompt(preset: StylePreset): string {
  return getStyleConfig(preset).negativePrompt;
}

export const STYLE_PRESET_OPTIONS = Object.keys(PRESETS).filter(
  (k) => k !== "none"
) as StylePreset[];
