import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const distDir = path.join(repoRoot, "dist");
const logoPath = path.join(repoRoot, "assets", "favicon.png");

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const LOGO_SIZE = 420;

const ogImages = [
  {
    filename: "og-image.png",
    title: "Канокна"
  },
  {
    filename: "og-catalog.png",
    title: "Каталог"
  },
  {
    filename: "og-gallery.png",
    title: "Портфолио"
  },
  {
    filename: "og-calculator.png",
    title: "Калькулятор"
  },
  {
    filename: "og-contacts.png",
    title: "Контакты"
  }
];

function hasExecutable(name) {
  try {
    execFileSync("sh", ["-lc", `command -v ${name} >/dev/null 2>&1`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function ensureDistDir() {
  if (!fs.existsSync(distDir)) {
    console.error(`OG images: dist directory not found at: ${distDir}`);
    process.exit(1);
  }
}

function ensureLogo() {
  if (!fs.existsSync(logoPath)) {
    console.error(`OG images: logo not found at: ${logoPath}`);
    process.exit(1);
  }
}

function generateImage({ filename }) {
  const outPath = path.join(distDir, filename);

  const filterComplex = [
    `[1:v]scale=${LOGO_SIZE}:${LOGO_SIZE}:flags=lanczos[logo]`,
    "[0:v][logo]overlay=(W-w)/2:(H-h)/2:format=auto"
  ].join(";");

  execFileSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=white:s=${OG_WIDTH}x${OG_HEIGHT}:r=1`,
      "-i",
      logoPath,
      "-filter_complex",
      filterComplex,
      "-frames:v",
      "1",
      outPath
    ],
    { stdio: "inherit" }
  );
}

ensureDistDir();
ensureLogo();

if (!hasExecutable("ffmpeg")) {
  console.warn("OG images: ffmpeg not found; copying seo/og-image.png as fallback.");
  const baseNames = [
    "og-image.png",
    "og-catalog.png",
    "og-gallery.png",
    "og-calculator.png",
    "og-contacts.png"
  ];
  const versionSuffixes = ["-v2", "-v3"];
  const allNames = baseNames.flatMap((name) =>
    [name, ...versionSuffixes.map((s) => name.replace(/\.png$/i, `${s}.png`))]
  );
  const uniqueNames = [...new Set(allNames)];
  for (const fn of uniqueNames) {
    const outPath = path.join(distDir, fn);
    if (!fs.existsSync(outPath)) {
      fs.copyFileSync(logoPath, outPath);
    }
  }
  console.log(`OG images: fallback copied to ${uniqueNames.length} files in ${distDir}`);
  process.exit(0);
}

for (const img of ogImages) {
  generateImage(img);
}

const versionSuffixes = ["-v2", "-v3"];
const versioned = ogImages.flatMap((img) => {
  return versionSuffixes.map((suffix) => {
    return {
      ...img,
      filename: img.filename.replace(/\.png$/i, `${suffix}.png`)
    };
  });
});

for (const img of versioned) {
  generateImage(img);
}

console.log(`OG images: generated ${ogImages.length + versioned.length} files in ${distDir}`);
