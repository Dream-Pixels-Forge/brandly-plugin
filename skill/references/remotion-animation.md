# Remotion Animation — Current Best Practices (2026)

This reference covers Remotion animation fundamentals, `interpolate()` options, easing, springs, sequencing, and common pitfalls. It is based on the official Remotion v4+ documentation and the official Remotion skills repository.

## Core Rule

Every animated value MUST be a pure function of the current frame number. Use `useCurrentFrame()` as the clock; never use CSS transitions, `setTimeout`, `Date.now()`, or `requestAnimationFrame` — they do not execute during Remotion’s frame-by-frame render pipeline.

```tsx
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const opacity = interpolate(frame, [0, 1 * fps], [0, 1], {
  extrapolateRight: "clamp",
});
```

## Forbidden Patterns

- **CSS transitions / animations**: Remotion renders each frame independently; DOM transitions never complete.
- **Tailwind `animate-*` classes**: They use time-based `@keyframes`; Remotion never triggers the keyframe timeline.
- **Wall-clock timing**: `setTimeout`, `setInterval`, `Date.now()`, `performance.now()` produce non-deterministic output.

Tailwind utility classes for **static** styles (colors, padding, typography, borders) are safe. Only animation classes are forbidden.

## interpolate()

Maps an input range to an output range.

```tsx
interpolate(input, inputRange, outputRange, options?)
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `extrapolateLeft` | `"extend"` | `"clamp"` / `"extend"` / `"wrap"` / `"identity"` |
| `extrapolateRight` | `"extend"` | Same enum as `extrapolateLeft` |
| `easing` | `(x) => x` | A single easing function **or** an array of per-segment easing functions |
| `posterize` | off | Quantizes input every N frames (`v4.0.470+`) |

Always add `extrapolateRight: "clamp"` unless continuation past the endpoint is intended. Without it, values can exceed bounds (opacity > 1, scale > 1, etc.).

### Per-Segment Easing Array (`v4.0.462+`)

```tsx
interpolate(frame, [0, 100, 200], [0, 1, 2], {
  easing: [Easing.out(Easing.cubic), Easing.in(Easing.cubic)],
});
```

Length must be `inputRange.length - 1`. Each easing applies between two adjacent keyframes.

## Easing

Import from `"remotion"`:

```tsx
import { Easing, interpolate } from "remotion";
```

### Preset Easings

Use via the `in` / `out` / `inOut` wrappers. Do NOT use bare named easings without direction — that causes type/behavior issues.

```tsx
Easing.in(Easing.cubic)
Easing.out(Easing.cubic)
Easing.inOut(Easing.cubic)
Easing.in(Easing.quad)
Easing.out(Easing.sin)
```

### Bezier

Matches CSS `cubic-bezier(x1, y1, x2, y2)`:

```tsx
easing: Easing.bezier(0.16, 1, 0.3, 1)
```

### Spring Easing in `interpolate()` (`v4.0.476+`)

You can use a spring as an easing function inside `interpolate()`:

```tsx
const scale = interpolate(frame, [0, 60], [0, 1], {
  easing: Easing.spring({
    damping: 200,
    durationRestThreshold: 0.03,
  }),
  extrapolateRight: "clamp",
});
```

Supported config: `damping`, `mass`, `stiffness`, `overshootClamping`, `durationRestThreshold`, `allowTail`.

The spring is normalized to the interpolation progress. It does not take `frame`, `fps`, or `durationInFrames`.

### Common Easing Choices

| Need | Easing |
|------|--------|
| Smooth enter | `Easing.out(Easing.cubic)` |
| Smooth exit | `Easing.in(Easing.cubic)` |
| Smooth enter + exit | `Easing.inOut(Easing.cubic)` |
| Designer-specified curve | `Easing.bezier(x1, y1, x2, y2)` |
| Bouncy in `interpolate` | `Easing.spring({ damping: 20, stiffness: 200, durationRestThreshold: 0.03 })` |
| No bounce | `Easing.spring({ damping: 200 })` |

## spring() Primitive

For physics-based motion, use the standalone `spring()` hook:

```tsx
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

const value = spring({
  frame,
  fps,
  config: { damping: 10, stiffness: 100 },
  durationInFrames: 40,
  delay: 10,
  reverse: false,
});
```

### Config Cheatsheet

| Character | `damping` | `stiffness` | `mass` |
|-----------|-----------|-------------|--------|
| Smooth, no bounce | 200 | — | — |
| Snappy UI | 20 | 200 | — |
| Bouncy / playful | 8 | — | — |
| Heavy / slow | 15 | 80 | 2 |

Default config is `{ damping: 10, mass: 1, stiffness: 100 }` with visible bounce.

**Important**: `spring()` always starts at frame 0. To delay, either:
- Subtract delay frames: `spring({ frame: frame - 20, fps, ... })`
- Use `delay` prop for production springs with `durationInFrames`

Always pass `fps` from `useVideoConfig()`. Do NOT hardcode frame counts; multiply seconds by `fps`.

## Sequencing

```tsx
import { Sequence } from "remotion";

<Sequence from={1 * fps} durationInFrames={2 * fps} layout="none">
  <Title />
</Sequence>
```

- `from` — frame offset where children mount. Negative values pre-warm: `from={-10}` means animation has already run 10 frames when visible.
- `durationInFrames` — unmount children when the window ends. Use `Infinity` for the last scene.
- `layout` — `"absolute-fill"` by default; use `"none"` for inline content to avoid extra DOM wrappers.
- `premountFor` — mount children this many frames before `from`. From `v5`, default is `fps` (1 second).

### Series

`<Series>` auto-sequences `<Series.Sequence>` children back-to-back. Offsets compound if nested.

**`Series.Sequence` vs manual `Sequence`:**

| Feature | `Series.Sequence` | Manual `Sequence` |
|---------|-------------------|-------------------|
| Offset calculation | Automatic | Manual |
| Add/remove scenes | Just insert/delete | Must update downstream `from` |
| Overlapping scenes | `from` as relative offset | Full control |
| Best for | Slideshows, linear flows | Parallel / complex layouts |

## Timing Best Practices

- Express durations in seconds, multiply by `fps`: `1 * fps`, `0.5 * fps`.
- Separate **timing** from **mapping**: compute one 0→1 progress value, derive each property from it.
- For enter animations: `Easing.out` starts fast and decelerates — feels natural.
- For exit animations: `Easing.in` starts slow and accelerates — feels like gravity.
- When a specific design curve is given, use a single `Easing.bezier(...)` rather than stacking presets.
- If values should be editable in Studio, keep `interpolate()` inline in the `style` prop.

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| CSS `transition` | Animation frozen at final value | Replace with `interpolate()` |
| Tailwind `animate-*` | No animation in rendered video | Replace with `interpolate()` + inline style |
| Missing `extrapolateRight: "clamp"` | Values exceed bounds | Always add it |
| `Easing.quad` without `in/out/inOut` | Type error / unexpected curve | Wrap in direction helper |
| `spring()` without `fps` | Wrong duration at different fps | Get fps from `useVideoConfig()` |
| `spring()` value directly in CSS | Bounce overshoots into invalid values | Map through `interpolate(springValue, [0, 1], [min, max])` |
| Hardcoded frame numbers | Timing breaks when fps changes | Use `seconds * fps` |
| `spring()` starting before element visible | Spring fires at frame 0 unexpectedly | Use `delay` or `frame - delayFrames` |
| Custom array passed as `easing` string | `arr is not iterable` crash | Pass actual array or `Easing` function, not a string |

## Migrations

- `v5`: `selectComposition()` and `getCompositions()` require `inputProps`. Pass `{}` if no props.
- `v4`: Input props must be objects, not bare arrays. `TransitionSeries` does not support `layout="none"`.
- `v4.0.472+`: `interpolate()` supports CSS transform strings and numeric tuples directly in `outputRange`.

## References

- Official docs: https://www.remotion.dev/docs/interpolate
- Easing reference: https://www.remotion.dev/docs/easing
- Spring primitive: https://www.remotion.dev/docs/spring
- Animation fundamentals: https://devsvideo.com/remotion/remotion-animations-fundamentals
- Sequence/Series timing: https://rendercomp.com/blog/remotion-sequence-series-timing-guide/
- v5 migration: https://convert.remotion.dev/docs/5-0-migration
