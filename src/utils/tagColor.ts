import type { CSSProperties } from "react";

type TagType = "mapel" | "pengajar";

const stringToHash = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

export const getTagStyle = (rawValue: string, type: TagType): CSSProperties => {
  const value = rawValue.trim().toLowerCase();
  const hash = stringToHash(value || type);
  const hueOffset = type === "mapel" ? 18 : 188;
  const hue = (hash % 120) + hueOffset;

  return {
    backgroundColor: `hsl(${hue} 88% 95%)`,
    borderColor: `hsl(${hue} 68% 78%)`,
    color: `hsl(${hue} 62% 29%)`,
  };
};
