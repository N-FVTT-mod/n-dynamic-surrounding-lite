import { MODULE_ID } from "./constants.mjs";
export function isPF2e() {
  return game.system?.id === "pf2e";
}

export function systemSupportsEffectsPanel() {
  return isPF2e();
}

export function actorVisionCapabilities(actor, tokenDocument = null) {
  if (isPF2e()) {
    return {
      creature: Boolean(actor?.isOfType?.("creature")),
      lowLight: Boolean(actor?.hasLowLightVision),
      darkvision: Boolean(actor?.hasDarkvision),
    };
  }

  const moduleFlags = actor?.getFlag?.(MODULE_ID, "vision") ?? {};
  const mode = String(tokenDocument?.sight?.visionMode ?? "").toLowerCase();
  const darkvision = Boolean(moduleFlags.darkvision) || mode.includes("darkvision") || mode.includes("dark-vision");
  const lowLight = darkvision || Boolean(moduleFlags.lowLightVision) || mode.includes("lowlight") || mode.includes("low-light");
  return { creature: Boolean(actor), lowLight, darkvision };
}

