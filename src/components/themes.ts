export const offerThemes: Record<
  string,
  { panel: string; eyebrow: string; cta: string; badge: string; glow: string; ring: string }
> = {
  emerald: {
    panel: "bg-[#0e5c3d] text-cream",
    eyebrow: "text-lime",
    cta: "bg-lime text-[#0e5c3d] hover:bg-white",
    badge: "bg-white/15 text-cream",
    glow: "from-[#4fbf7f]/40 to-transparent",
    ring: "ring-white/15",
  },
  amber: {
    panel: "bg-[#f3e6c9] text-[#3b2a0f]",
    eyebrow: "text-[#9a6b12]",
    cta: "bg-[#3b2a0f] text-[#fdf1d6] hover:bg-[#5a421d]",
    badge: "bg-[#3b2a0f]/10 text-[#5a421d]",
    glow: "from-[#f5ae1b]/40 to-transparent",
    ring: "ring-[#3b2a0f]/10",
  },
  rose: {
    panel: "bg-[#fbe4dd] text-[#4a2117]",
    eyebrow: "text-[#b6492a]",
    cta: "bg-[#b6492a] text-white hover:bg-[#93361c]",
    badge: "bg-[#b6492a]/10 text-[#93361c]",
    glow: "from-[#f0917a]/40 to-transparent",
    ring: "ring-[#4a2117]/10",
  },
  indigo: {
    panel: "bg-[#e5e7f7] text-[#232a52]",
    eyebrow: "text-[#4a55a8]",
    cta: "bg-[#3b4694] text-white hover:bg-[#2c3575]",
    badge: "bg-[#232a52]/10 text-[#3b4694]",
    glow: "from-[#7f8ce0]/40 to-transparent",
    ring: "ring-[#232a52]/10",
  },
  forest: {
    panel: "bg-[#16302a] text-[#eef3e6]",
    eyebrow: "text-lime",
    cta: "bg-lime text-[#16302a] hover:bg-white",
    badge: "bg-white/12 text-[#eef3e6]",
    glow: "from-[#6fae86]/40 to-transparent",
    ring: "ring-white/15",
  },
};

export function theme(name: string) {
  return offerThemes[name] ?? offerThemes.emerald;
}

export const themeAccent: Record<string, string> = {
  emerald: "#0f7a4d",
  amber: "#d99b12",
  rose: "#bf5a36",
  indigo: "#4a55a8",
  forest: "#16302a",
};
