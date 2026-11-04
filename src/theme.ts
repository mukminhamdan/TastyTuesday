import "@fontsource/anton/400.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/800.css";
import "@fontsource/poppins/900.css";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const COLORS = {
  sambal: "#E8432E",
  chili: "#FF5A36",
  kunyit: "#FFC53D",
  cream: "#FFF6E5",
  ink: "#1B120E",
  leaf: "#4CC38A",
};

export const FONT_DISPLAY = "Anton, Impact, sans-serif";
export const FONT_BODY = "Poppins, Arial, sans-serif";

/**
 * Safe zone shared by TikTok and Instagram Reels on a 1080x1920 canvas.
 * Top: status bar / "Following | For You" / Reels header.
 * Bottom: username, caption, music ticker, comment bar.
 * Right: like / comment / share / remix rail.
 */
export const SAFE = {
  top: 250,
  bottom: 1920 - 480, // y = 1440 is the lowest point content may reach
  left: 60,
  right: 1080 - 150, // x = 930 is the right-most point content may reach
};
