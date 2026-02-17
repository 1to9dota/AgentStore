import { ImageResponse } from "next/og";

// OG 图片尺寸
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";
export const alt = "AgentStore - MCP 插件评级平台";

/**
 * 动态生成 Open Graph 分享图片
 * 包含 AgentStore 品牌文字和 tagline
 */
export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* 装饰性网格背景 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            display: "flex",
          }}
        />

        {/* 品牌标识 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {/* 图标 */}
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
              color: "white",
              fontWeight: 700,
            }}
          >
            AS
          </div>
          <span
            style={{
              fontSize: "64px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-2px",
            }}
          >
            AgentStore
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: "28px",
            color: "#a1a1aa",
            marginTop: "8px",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          发现、评估和比较 200+ MCP 插件
        </p>

        {/* 五维评分标签 */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "40px",
          }}
        >
          {["可靠性", "安全性", "能力范围", "社区口碑", "易用性"].map(
            (label) => (
              <div
                key={label}
                style={{
                  padding: "10px 24px",
                  borderRadius: "999px",
                  background: "rgba(139, 92, 246, 0.15)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  color: "#c4b5fd",
                  fontSize: "18px",
                  display: "flex",
                }}
              >
                {label}
              </div>
            )
          )}
        </div>

        {/* 底部域名 */}
        <p
          style={{
            position: "absolute",
            bottom: "30px",
            fontSize: "20px",
            color: "#52525b",
          }}
        >
          agentstore.dev
        </p>
      </div>
    ),
    { ...size }
  );
}
