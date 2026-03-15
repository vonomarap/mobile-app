import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function setHtmlLang(html, lang) {
  return html.replace(/<html\b([^>]*)>/i, (match, attrs) => {
    if (/\blang\s*=/.test(attrs)) {
      const nextAttrs = attrs.replace(/\blang\s*=\s*(["']).*?\1/i, `lang="${lang}"`);
      return `<html${nextAttrs}>`;
    }
    return `<html lang="${lang}"${attrs}>`;
  });
}

function setTitle(html, title) {
  if (/<title\b[^>]*>/.test(html)) {
    return html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtmlAttribute(title)}</title>`);
  }
  // Fallback: inject title at the top of <head>.
  return html.replace(/<head\b([^>]*)>/i, `<head$1>\n    <title>${escapeHtmlAttribute(title)}</title>`);
}

function removeMetaByName(html, name) {
  const re = new RegExp(`<meta\\s+[^>]*\\bname=["']${escapeRegExp(name)}["'][^>]*>\\s*`, "gi");
  return html.replace(re, "");
}

function removeMetaByProperty(html, property) {
  const re = new RegExp(`<meta\\s+[^>]*\\bproperty=["']${escapeRegExp(property)}["'][^>]*>\\s*`, "gi");
  return html.replace(re, "");
}

function removeLinkCanonical(html) {
  return html.replace(/<link\s+[^>]*\brel=["']canonical["'][^>]*>\s*/gi, "");
}

function removeLinkByRel(html, rel) {
  const re = new RegExp(`<link\\s+[^>]*\\brel=["']${escapeRegExp(rel)}["'][^>]*>\\s*`, "gi");
  return html.replace(re, "");
}

function insertAfterTitle(html, snippet) {
  const m = html.match(/<\/title>\s*/i);
  if (m && m.index != null) {
    const at = m.index + m[0].length;
    return html.slice(0, at) + snippet + html.slice(at);
  }
  // Fallback: insert after <head>.
  const hm = html.match(/<head\b[^>]*>\s*/i);
  if (hm && hm.index != null) {
    const at = hm.index + hm[0].length;
    return html.slice(0, at) + snippet + html.slice(at);
  }
  return snippet + html;
}

const BASE_URL = "https://kanokna.web.app";
const BRAND_NAME = "КанОкна";
const DEFAULT_TITLE = `Окна и двери на заказ в Каневской | ${BRAND_NAME}`;
const DEFAULT_DESCRIPTION =
  "Окна и двери на заказ в Каневской и Каневском районе. Замер, изготовление и монтаж. Рассчитайте стоимость в калькуляторе и оставьте заявку.";
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;
const OG_IMAGE_URL_HOME = `${BASE_URL}/og-image-v3.png`;
const THEME_COLOR = "#1E3A8A";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const distDir = path.join(repoRoot, "dist");
const indexPath = path.join(distDir, "index.html");

function readOptionalTextFile(filepath) {
  try {
    if (!fs.existsSync(filepath)) return undefined;
    const raw = fs.readFileSync(filepath, "utf8");
    const trimmed = raw.trim();
    return trimmed ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

// Google Search Console verification.
// Provide via env var or create seo/google-site-verification.txt with the token.
const googleSiteVerification =
  (process.env.GOOGLE_SITE_VERIFICATION ?? process.env.SEO_GOOGLE_SITE_VERIFICATION ?? "").trim() ||
  readOptionalTextFile(path.join(repoRoot, "seo", "google-site-verification.txt"));

if (!fs.existsSync(indexPath)) {
  console.error(`SEO inject: index.html not found at: ${indexPath}`);
  process.exit(1);
}

const baseHtml = fs.readFileSync(indexPath, "utf8");

const MANAGED_OG_PROPS = [
  "og:title",
  "og:description",
  "og:type",
  "og:url",
  "og:site_name",
  "og:locale",
  "og:image",
  "og:image:width",
  "og:image:height",
  "og:image:type"
];
const MANAGED_TWITTER_NAMES = ["twitter:card", "twitter:title", "twitter:description", "twitter:image"];

function injectSeo({
  html,
  title,
  description,
  canonical,
  ogImageUrl,
  robots
}) {
  let out = html;

  // Ensure static lang + title (JS can override later, but crawlers without JS will use this).
  out = setHtmlLang(out, "ru");
  out = setTitle(out, title);

  // Remove existing tags we manage (idempotent and resilient to template changes).
  out = removeMetaByName(out, "description");
  out = removeMetaByName(out, "robots");
  out = removeMetaByName(out, "theme-color");
  out = removeMetaByName(out, "google-site-verification");
  out = removeLinkCanonical(out);
  out = removeLinkByRel(out, "shortcut icon");
  out = removeLinkByRel(out, "icon");
  out = removeLinkByRel(out, "apple-touch-icon");
  out = removeLinkByRel(out, "manifest");

  for (const prop of MANAGED_OG_PROPS) {
    out = removeMetaByProperty(out, prop);
  }
  for (const name of MANAGED_TWITTER_NAMES) {
    out = removeMetaByName(out, name);
  }

  const snippet =
    `\n` +
    `    <meta name="description" content="${escapeHtmlAttribute(description)}" />\n` +
    `    <meta name="robots" content="${escapeHtmlAttribute(robots)}" />\n` +
    `    <meta name="theme-color" content="${escapeHtmlAttribute(THEME_COLOR)}" />\n` +
    (googleSiteVerification
      ? `    <meta name="google-site-verification" content="${escapeHtmlAttribute(googleSiteVerification)}" />\n`
      : "") +
    `    <link rel="manifest" href="/site.webmanifest" />\n` +
    `    <link rel="icon" href="/favicon.ico" sizes="any" />\n` +
    `    <link rel="icon" type="image/png" sizes="512x512" href="/favicon.png" />\n` +
    `    <link rel="shortcut icon" href="/favicon.png" />\n` +
    `    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />\n` +
    `    <link rel="canonical" href="${escapeHtmlAttribute(canonical)}" />\n` +
    `\n` +
    `    <meta property="og:title" content="${escapeHtmlAttribute(title)}" />\n` +
    `    <meta property="og:description" content="${escapeHtmlAttribute(description)}" />\n` +
    `    <meta property="og:type" content="website" />\n` +
    `    <meta property="og:url" content="${escapeHtmlAttribute(canonical)}" />\n` +
    `    <meta property="og:site_name" content="${escapeHtmlAttribute(BRAND_NAME)}" />\n` +
    `    <meta property="og:locale" content="ru_RU" />\n` +
    `    <meta property="og:image" content="${escapeHtmlAttribute(ogImageUrl)}" />\n` +
    `    <meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />\n` +
    `    <meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />\n` +
    `    <meta property="og:image:type" content="image/png" />\n` +
    `\n` +
    `    <meta name="twitter:card" content="summary_large_image" />\n` +
    `    <meta name="twitter:title" content="${escapeHtmlAttribute(title)}" />\n` +
    `    <meta name="twitter:description" content="${escapeHtmlAttribute(description)}" />\n` +
    `    <meta name="twitter:image" content="${escapeHtmlAttribute(ogImageUrl)}" />\n`;

  out = insertAfterTitle(out, snippet);
  return out;
}

const pages = [
  {
    filename: "index.html",
    canonical: `${BASE_URL}/`,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    ogImageUrl: OG_IMAGE_URL_HOME
  },
  {
    filename: "catalog.html",
    canonical: `${BASE_URL}/catalog`,
    title: `Каталог окон и дверей | ${BRAND_NAME}`,
    description: "Каталог окон, дверей и комплектующих. Выберите товар и рассчитайте стоимость в калькуляторе.",
    ogImageUrl: `${BASE_URL}/og-catalog-v3.png`
  },
  {
    filename: "gallery.html",
    canonical: `${BASE_URL}/gallery`,
    title: `Портфолио работ | ${BRAND_NAME}`,
    description: "Примеры установленных окон и дверей. Посмотрите фото наших работ в Каневской и Каневском районе.",
    ogImageUrl: `${BASE_URL}/og-gallery-v3.png`
  },
  {
    filename: "calculator.html",
    canonical: `${BASE_URL}/calculator`,
    title: `Калькулятор стоимости окон и дверей | ${BRAND_NAME}`,
    description: "Онлайн-расчет стоимости окон и дверей. Выберите параметры и размеры, затем отправьте заявку.",
    ogImageUrl: `${BASE_URL}/og-calculator-v3.png`
  },
  {
    filename: "contacts.html",
    canonical: `${BASE_URL}/contacts`,
    title: `Контакты | ${BRAND_NAME}`,
    description: "Мессенджеры для связи. Напишите нам для замера и расчета.",
    ogImageUrl: `${BASE_URL}/og-contacts-v3.png`
  }
];

for (const page of pages) {
  const outPath = path.join(distDir, page.filename);
  const nextHtml = injectSeo({
    html: baseHtml,
    title: page.title,
    description: page.description,
    canonical: page.canonical,
    ogImageUrl: page.ogImageUrl,
    robots: "index,follow"
  });
  fs.writeFileSync(outPath, nextHtml, "utf8");
}

console.log(`SEO inject: updated ${pages.length} HTML files in ${distDir}`);
