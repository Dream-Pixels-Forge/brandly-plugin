# Video Editing with Remotion

Brandly includes **Remotion** for programmatic video editing. Create compositions, trim, concat, overlay, add transitions, text, audio, and effects.

## Video Edit Operations

### Trim Video
```bash
brandly_video_edit(
  projectID="<uuid>",
  operation="trim",
  inputFiles=["shot-1.mp4"],
  params={ "startTime": 2, "duration": 5, "width": 1920, "height": 1080 }
)
```

### Concatenate Videos
```bash
brandly_video_edit(
  projectID="<uuid>",
  operation="concat",
  inputFiles=["shot-1.mp4", "shot-2.mp4", "shot-3.mp4"],
  params={ "transitionDuration": 1, "width": 1920, "height": 1080 }
)
```

### Overlay Image/Video
```bash
brandly_video_edit(
  projectID="<uuid>",
  operation="overlay",
  inputFiles=["main-video.mp4", "logo.png"],
  params={ "position": "top-right", "scale": 0.2, "width": 1920, "height": 1080 }
)
```

### Add Transitions
```bash
brandly_video_edit(
  projectID="<uuid>",
  operation="transition",
  inputFiles=["clip-1.mp4", "clip-2.mp4"],
  params={ "transitionType": "fade", "transitionDuration": 1, "width": 1920, "height": 1080 }
)
```

### Add Text Overlay
```bash
brandly_video_edit(
  projectID="<uuid>",
  operation="add-text",
  inputFiles=["video.mp4"],
  params={ "text": "Brand Name", "fontSize": 72, "color": "#ffffff", "position": "center", "width": 1920, "height": 1080 }
)
```

### Add Audio
```bash
brandly_video_edit(
  projectID="<uuid>",
  operation="add-audio",
  inputFiles=["video.mp4"],
  params={ "audioFile": "background-music.mp3", "volume": 0.8, "width": 1920, "height": 1080 }
)
```

### Add Effects
```bash
brandly_video_edit(
  projectID="<uuid>",
  operation="add-effect",
  inputFiles=["video.mp4"],
  params={ "effectType": "blur", "intensity": 5, "width": 1920, "height": 1080 }
)
```

### Resize Video
```bash
brandly_video_edit(
  projectID="<uuid>",
  operation="resize",
  inputFiles=["video.mp4"],
  params={ "newWidth": 1280, "newHeight": 720, "width": 1920, "height": 1080 }
)
```

### Crop Video
```bash
brandly_video_edit(
  projectID="<uuid>",
  operation="crop",
  inputFiles=["video.mp4"],
  params={ "x": 100, "y": 50, "width": 1280, "height": 720 }
)
```

## Render Video
After creating a composition, render it to produce the final video:
```bash
brandly_render_video(
  projectID="<uuid>",
  compositionPath="./video-edits/<project-id>/composition-<timestamp>.tsx",
  outputPath="./renders/<project-id>/final-video.mp4",
  format="mp4",
  quality="high"
)
```
**Quality Presets:** `low` (fast), `medium` (balanced), `high` (recommended), `ultra` (max).
**Output Formats:** `mp4` (H.264), `webm` (VP8), `gif` (animated).

## Video Editing Workflow
1. **Generate assets** — Use Higgsfield/Kling to generate images and videos
2. **Download assets** — Use `brandly_download` to save locally
3. **Edit videos** — Use `brandly_video_edit` to create compositions
4. **Render** — Use `brandly_render_video` to produce final video
5. **Validate** — Use `brandly_validate` with Virality Predictor
6. **Export** — Use `brandly_export` to package everything
