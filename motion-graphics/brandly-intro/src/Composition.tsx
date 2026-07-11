import {
  Composition,
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

// ── Scene 0: Title Reveal (3s) ──
const Scene_0 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const el0_0_text = "BRANDLY";
  const el0_1_text = "AI Product Video Generator";
  const el0_2_text = "Plugin";

  const el0_0_scale = interpolate(
    frame, (0.2 * fps), (0.2 + 0.8) * fps, [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const el0_0_opacity = interpolate(
    frame, (0.2 * fps), (0.2 + 0.8) * fps, [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const el0_1_opacity = interpolate(
    frame, (1.0 * fps), (1.0 + 0.6) * fps, [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const el0_2_opacity = interpolate(
    frame, (1.3 * fps), (1.3 + 0.5) * fps, [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          transform: `scale(${el0_0_scale})`,
          opacity: el0_0_opacity,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            color: "#ffffff",
            fontSize: 120,
            fontWeight: "900",
            fontFamily: "Impact, Arial, sans-serif",
            letterSpacing: 8,
            margin: 0,
          }}
        >
          {el0_0_text}
        </h1>
        <p
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 36,
            fontWeight: "normal",
            fontFamily: "Arial, sans-serif",
            marginTop: 16,
          }}
        >
          {el0_1_text}
        </p>
        <p
          style={{
            color: "#6c63ff",
            fontSize: 24,
            fontWeight: "600",
            fontFamily: "Arial, sans-serif",
            marginTop: 8,
            opacity: el0_2_opacity,
          }}
        >
          {el0_2_text}
        </p>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 1: Features (4s) ──
const Scene_1 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const el1_0_text = "AI-Powered";
  const el1_1_text = "Smart prompt optimization for viral-ready videos";
  const el1_2_text = "Viral Ready";
  const el1_3_text = "Built-in virality scoring and trending hooks";
  const el1_4_text = "Multi-Platform";
  const el1_5_text = "Export for TikTok, Instagram, YouTube";

  const el1_0_x = interpolate(
    frame, (0 * fps), (0 + 0.5) * fps, [-100, 5], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const el1_0_opacity = interpolate(
    frame, (0 * fps), (0 + 0.5) * fps, [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const el1_1_opacity = interpolate(
    frame, (0.3 * fps), (0.3 + 0.4) * fps, [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const el1_2_x = interpolate(
    frame, (0.2 * fps), (0.2 + 0.5) * fps, [-100, 36], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const el1_2_opacity = interpolate(
    frame, (0.2 * fps), (0.2 + 0.5) * fps, [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const el1_3_opacity = interpolate(
    frame, (0.5 * fps), (0.5 + 0.4) * fps, [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const el1_4_x = interpolate(
    frame, (0.4 * fps), (0.4 + 0.5) * fps, [-100, 67], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const el1_4_opacity = interpolate(
    frame, (0.4 * fps), (0.4 + 0.5) * fps, [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const el1_5_opacity = interpolate(
    frame, (0.7 * fps), (0.7 + 0.4) * fps, [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  return (
    <AbsoluteFill style={{ background: "#0a0a0a", justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          left: `${el1_0_x}%`,
          top: "10%",
          width: "27%",
          height: "35%",
          backgroundColor: "#1a1a2e",
          borderRadius: 12,
          opacity: el1_0_opacity,
          padding: 16,
        }}
      >
        <div style={{ color: "#6c63ff", fontSize: 28, fontWeight: "bold", fontFamily: "Arial, sans-serif" }}>
          {el1_0_text}
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 14,
            fontFamily: "Arial, sans-serif",
            marginTop: 8,
            opacity: el1_1_opacity,
          }}
        >
          {el1_1_text}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: `${el1_2_x}%`,
          top: "10%",
          width: "27%",
          height: "35%",
          backgroundColor: "#1a1a2e",
          borderRadius: 12,
          opacity: el1_2_opacity,
          padding: 16,
        }}
      >
        <div style={{ color: "#6c63ff", fontSize: 28, fontWeight: "bold", fontFamily: "Arial, sans-serif" }}>
          {el1_2_text}
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 14,
            fontFamily: "Arial, sans-serif",
            marginTop: 8,
            opacity: el1_3_opacity,
          }}
        >
          {el1_3_text}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: `${el1_4_x}%`,
          top: "10%",
          width: "27%",
          height: "35%",
          backgroundColor: "#1a1a2e",
          borderRadius: 12,
          opacity: el1_4_opacity,
          padding: 16,
        }}
      >
        <div style={{ color: "#6c63ff", fontSize: 28, fontWeight: "bold", fontFamily: "Arial, sans-serif" }}>
          {el1_4_text}
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 14,
            fontFamily: "Arial, sans-serif",
            marginTop: 8,
            opacity: el1_5_opacity,
          }}
        >
          {el1_5_text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 2: CTA (3s) ──
const Scene_2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const el2_0_text = "Turn Ideas Into Videos";
  const el2_1_text = "Start free with brandly-plugin today";
  const el2_2_text = "Get Started \u2192";

  const el2_0_scale = interpolate(
    frame, (0.2 * fps), (0.2 + 0.6) * fps, [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const el2_0_opacity = interpolate(
    frame, (0.2 * fps), (0.2 + 0.6) * fps, [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const el2_1_opacity = interpolate(
    frame, (0.8 * fps), (0.8 + 0.5) * fps, [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const el2_2_opacity = interpolate(
    frame, (1.0 * fps), (1.0 + 0.5) * fps, [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #6c63ff, #3f3d99)",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          transform: `scale(${el2_0_scale})`,
          opacity: el2_0_opacity,
          textAlign: "center",
        }}
      >
        <h2
          style={{
            color: "#ffffff",
            fontSize: 72,
            fontWeight: "bold",
            fontFamily: "Arial, sans-serif",
            margin: 0,
          }}
        >
          {el2_0_text}
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 28,
            fontFamily: "Arial, sans-serif",
            marginTop: 16,
            opacity: el2_1_opacity,
          }}
        >
          {el2_1_text}
        </p>
        <div
          style={{
            marginTop: 32,
            backgroundColor: "#ffffff",
            padding: "14px 32px",
            borderRadius: 50,
            display: "inline-block",
            opacity: el2_2_opacity,
          }}
        >
          <span
            style={{
              color: "#6c63ff",
              fontSize: 24,
              fontWeight: "bold",
              fontFamily: "Arial, sans-serif",
            }}
          >
            {el2_2_text}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Main Composition ──
const MotionGraphic = () => {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence from={0} durationInFrames={90}>
        <Scene_0 />
      </Sequence>
      <Sequence from={90} durationInFrames={120}>
        <Scene_1 />
      </Sequence>
      <Sequence from={210} durationInFrames={90}>
        <Scene_2 />
      </Sequence>
    </AbsoluteFill>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="MotionGraphic"
      component={MotionGraphic}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
