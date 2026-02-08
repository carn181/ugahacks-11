"use client";

// Use the provided cloud image, layering several instances for a stylized effect

import Image from "next/image";
// Use the correct file name for the cloud image
const cloudSrc = "/cloud.png";

export default function ArcaneClouds() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden arcane-clouds">
      {/* Top left cloud */}
      <img
        src={cloudSrc}
        alt="Cloud"
        width={320}
        height={120}
        className="cloud-drift-top"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          opacity: 0.7,
          filter: "blur(2px)",
          pointerEvents: "none",
        }}
        aria-hidden
      />
      {/* Top right cloud */}
      <img
        src={cloudSrc}
        alt="Cloud"
        width={260}
        height={100}
        className="cloud-drift-top"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          opacity: 0.5,
          filter: "blur(2.5px)",
          pointerEvents: "none",
        }}
        aria-hidden
      />
      {/* Bottom left cloud */}
      <img
        src={cloudSrc}
        alt="Cloud"
        width={280}
        height={110}
        className="cloud-drift-bottom"
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          opacity: 0.6,
          filter: "blur(2.5px)",
          pointerEvents: "none",
        }}
        aria-hidden
      />
      {/* Bottom right cloud */}
      <img
        src={cloudSrc}
        alt="Cloud"
        width={220}
        height={90}
        className="cloud-drift-bottom"
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          opacity: 0.5,
          filter: "blur(2px)",
          pointerEvents: "none",
        }}
        aria-hidden
      />
    </div>
  );
}
