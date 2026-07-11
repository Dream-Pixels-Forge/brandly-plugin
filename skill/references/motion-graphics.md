# Motion Graphics — Remotion Animations

Create animated motion graphics with frame-accurate timing, spring physics, and easing curves. Generates a complete Remotion project ready for preview and render.

## Quick Start (Preset)
```bash
brandly_motion_graphics(
  projectID="<uuid>",
  preset="title-reveal"
)
```

## Custom Scene
```bash
brandly_motion_graphics(
  projectID="<uuid>",
  preset="custom",
  scenes=[{
    id: "intro",
    duration: 3,
    background: "#0a0a0a",
    elements: [{
      type: "text",
      x: 10, y: 40,
      width: 80,
      text: "HELLO WORLD",
      color: "#ffffff",
      fontSize: 72,
      fontWeight: "bold",
      fontFamily: "Arial, sans-serif",
      animation: { type: "fadeIn", duration: 0.8, easing: "spring" }
    }]
  }]
)
```

## Presets
| Preset | Duration | Description |
|--------|----------|-------------|
| `title-reveal` | 4s | Typewriter title + subtitle with gradient background, animated line divider |
| `product-showcase` | 10s | Intro circle + feature cards sliding in + CTA button |
| `kinetic-text` | 6.5s | 4-word sequence: scale, slide, bounce — big impact typography |
| `stats-counter` | 5s | 3 animated counters (countUp) with labels + divider line |
| `custom` | variable | Full control: provide your own scenes and elements |

## Animation Types
| Animation | Effect |
|-----------|--------|
| `fadeIn` | Opacity 0→1 |
| `fadeOut` | Opacity 1→0 |
| `slideInLeft` | Slide from -100% left |
| `slideInRight` | Slide from +110% right |
| `slideInTop` | Slide from -100% top |
| `slideInBottom` | Slide from +110% bottom |
| `scaleIn` | Scale 0→1 |
| `scaleOut` | Scale 1→0 |
| `rotateIn` | Rotate -180°→0° |
| `typewriter` | Character-by-character reveal |
| `bounce` | Elastic overshoot (3 bounces) |
| `pulse` | Continuous scale oscillation |
| `blurIn` | Blur 20px→0px |
| `countUp` | Number 0→target value |
| `drawLine` | Line 0%→100% width (scaleX) |

## Easing Modes
| Easing | Curve |
|--------|-------|
| `linear` | `[0, 0, 1, 1]` — constant speed |
| `easeIn` | `[0.4, 0, 1, 1]` — slow start |
| `easeOut` | `[0, 0, 0.2, 1]` — slow end |
| `easeInOut` | `[0.4, 0, 0.2, 1]` — slow start + end |
| `spring` | `spring({ damping: 10, stiffness: 100 })` — spring physics |

## Element Types
| Type | Properties |
|------|------------|
| `text` | `text`, `color`, `fontSize`, `fontWeight`, `fontFamily` |
| `rect` | `color`, `borderRadius`, `opacity` |
| `circle` | `color`, `width`, `height` (rendered as border-radius: 50%) |
| `line` | `color`, `strokeWidth`, `width` (percentage) |
| `image` | `src` (URL), `width`, `height` |

## Positioning
All elements use **percentage-based** positioning relative to the canvas:
- `x`: horizontal position (0 = left, 100 = right)
- `y`: vertical position (0 = top, 100 = bottom)
- `width`: element width as percentage of canvas
- `height`: element height as percentage of canvas

## Output
The tool generates a complete Remotion project in `motion-graphics/{project-id}/`:
```
motion-graphics/{project-id}/
  src/
    Composition.tsx    # Full animation code with interpolate/spring
    index.ts           # Remotion root
  remotion.config.ts  # Remotion config
  package.json        # Dependencies
  build.sh            # Build script
  motion-graphics-meta.json  # Project metadata
```
**Preview:** `npm start` (opens Remotion Studio)
**Render:** `npm run build` (outputs MP4)
**Render GIF:** `npm run build:gif`
**Render WebM:** `npm run build:webm`

Set `autoRender: true` to install deps and render immediately after scaffolding.

## Custom Scene Structure
Each scene object:
```json
{
  "id": "scene-name",
  "duration": 3,
  "background": "#000000",
  "backgroundImage": "https://...",
  "elements": [
    {
      "type": "text",
      "x": 10, "y": 40, "width": 80,
      "text": "YOUR TEXT",
      "color": "#ffffff",
      "fontSize": 72,
      "fontWeight": "bold",
      "fontFamily": "Arial, sans-serif",
      "animation": { "type": "fadeIn", "duration": 0.8, "delay": 0.3, "easing": "spring" }
    }
  ]
}
```

## Parameters
| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `projectID` | yes | — | Project UUID |
| `preset` | yes | — | `title-reveal`, `product-showcase`, `kinetic-text`, `stats-counter`, `custom` |
| `scenes` | no* | — | Custom scenes array (*required when `preset="custom"`) |
| `fps` | no | 30 | Frames per second |
| `width` | no | 1920 | Output width in pixels |
| `height` | no | 1080 | Output height in pixels |
| `outputPath` | no | auto | Custom output file path |
| `autoRender` | no | false | Auto-render after creation |
