import { authColors, authFonts } from "../../theme/authTheme";

export const adminColors = {
  ...authColors,
  backgroundSoft: "#2B1F1C",
  panelElevated: "#332622",
  chip: "rgba(240, 154, 134, 0.12)",
  chipActive: "rgba(240, 154, 134, 0.2)",
  line: "rgba(247, 232, 213, 0.08)",
  whiteOverlay: "rgba(255, 255, 255, 0.05)",
};

export const adminFonts = authFonts;

export const adminShadow = {
  shadowColor: "#120B0A",
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.28,
  shadowRadius: 24,
  elevation: 10,
};
