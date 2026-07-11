# Download & Export

## Download Generated Media
After asset/audio phases, download generated files locally:
```bash
brandly_download(
  projectID="<uuid>",
  mediaType="video",
  mediaUrl="https://higgsfield.ai/...",
  filename="shot-1.mp4",
  jobId="<optional-job-id>"
)
```
**Media Types:**
- `image` → saves to `imagen/{project-id}/`
- `video` → saves to `videgen/{project-id}/`
- `audio` → saves to `audgen/{project-id}/`

## Export Project
Export all artifacts and media files:
```bash
brandly_export(
  projectID="<uuid>",
  outputPath="./my-project-export/"  // optional
)
```
**Export Includes:**
- All phase artifacts (markdown, JSON)
- All downloaded media (images, videos, audio)
- Export manifest with file inventory

**Default Export Location:** `.brandly/projects/{id}/export/`
