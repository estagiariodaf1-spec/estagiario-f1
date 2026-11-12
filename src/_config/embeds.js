// Reconhece links de posts e vídeos e devolve o HTML do embed. Usado pelo site (build) e pela prévia do painel
// (cópia em redacao-estagiario/redacao/embeds.js: mudou aqui, copia lá).
const DOMINIO = "estagiariodaf1.com.br";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function quadro(src, { vertical = false, titulo = "Vídeo" } = {}) {
  return `<div class="embed embed-video${vertical ? " vertical" : ""}"><iframe src="${esc(src)}" title="${esc(titulo)}" ` +
    `loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write" allowfullscreen ` +
    `referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
}

function segundos(t) {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  return m ? (Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)) : 0;
}

const REGRAS = [
  { nome: "instagram", re: /^https?:\/\/(?:www\.)?instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/i,
    html: (m) => {
      const link = `https://www.instagram.com/${m[1] === "reels" ? "reel" : m[1]}/${m[2]}/`;
      return { script: "instagram", html: `<div class="embed"><blockquote class="instagram-media" data-instgrm-permalink="${link}" data-instgrm-version="14"><a href="${link}" target="_blank" rel="noopener">Ver este post no Instagram</a></blockquote></div>` };
    } },
  { nome: "x", re: /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/(\w+)\/status\/(\d+)/i,
    html: (m) => {
      const link = `https://twitter.com/${m[1]}/status/${m[2]}`;
      return { script: "x", html: `<div class="embed"><blockquote class="twitter-tweet" data-lang="pt" data-dnt="true"><a href="${link}" target="_blank" rel="noopener">Ver este post no X</a></blockquote></div>` };
    } },
  { nome: "youtube", re: /^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([\w-]{11})/i,
    html: (m, url) => {
      const t = segundos((url.match(/[?&](?:t|start)=([\dhms]+)/) || [])[1]);
      return { html: quadro(`https://www.youtube-nocookie.com/embed/${m[1]}?rel=0${t ? `&start=${t}` : ""}`,
        { vertical: /\/shorts\//.test(url), titulo: "Vídeo do YouTube" }) };
    } },
  { nome: "vimeo", re: /^https?:\/\/(?:www\.)?vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/i,
    html: (m) => ({ html: quadro(`https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}`, { titulo: "Vídeo do Vimeo" }) }) },
  { nome: "streamable", re: /^https?:\/\/(?:www\.)?streamable\.com\/(?:e\/|o\/)?([a-z0-9]+)/i,
    html: (m) => ({ html: quadro(`https://streamable.com/e/${m[1]}`, { titulo: "Vídeo do Streamable" }) }) },
  { nome: "dailymotion", re: /^https?:\/\/(?:(?:www\.)?dailymotion\.com\/video|dai\.ly)\/([a-z0-9]+)/i,
    html: (m) => ({ html: quadro(`https://geo.dailymotion.com/player.html?video=${m[1]}`, { titulo: "Vídeo do Dailymotion" }) }) },
  { nome: "twitch-clip", re: /^https?:\/\/(?:clips\.twitch\.tv\/|(?:www\.)?twitch\.tv\/\w+\/clip\/)([\w-]+)/i,
    html: (m) => ({ html: quadro(`https://clips.twitch.tv/embed?clip=${m[1]}&parent=${DOMINIO}&parent=www.${DOMINIO}&autoplay=false`, { titulo: "Clipe da Twitch" }) }) },
  { nome: "twitch-video", re: /^https?:\/\/(?:www\.)?twitch\.tv\/videos\/(\d+)/i,
    html: (m) => ({ html: quadro(`https://player.twitch.tv/?video=${m[1]}&parent=${DOMINIO}&parent=www.${DOMINIO}&autoplay=false`, { titulo: "Vídeo da Twitch" }) }) },
  { nome: "tiktok", re: /^https?:\/\/(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/i,
    html: (m) => ({ html: quadro(`https://www.tiktok.com/embed/v2/${m[1]}`, { vertical: true, titulo: "Vídeo do TikTok" }) }) },
  { nome: "facebook", re: /^https?:\/\/(?:www\.|m\.)?(?:facebook\.com\/(?:[\w.]+\/videos\/|watch\/?\?v=|reel\/)\d+|fb\.watch\/[\w-]+)/i,
    html: (m, url) => ({ html: quadro(`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
      { vertical: /\/reel\//.test(url), titulo: "Vídeo do Facebook" }) }) },
  { nome: "kick", re: /^https?:\/\/(?:www\.)?kick\.com\/([\w-]+)\/(?:clips\/|\?clip=)(clip_[\w]+)/i,
    html: (m) => ({ html: quadro(`https://player.kick.com/${m[1]}?clip=${m[2]}&autoplay=false`, { titulo: "Clipe do Kick" }) }) },
  // arquivo de vídeo direto (inclusive os que sobem pelo painel)
  { nome: "arquivo", re: /^https?:\/\/[^\s?#]+\.(mp4|webm|mov|m4v)(?:[?#]\S*)?$/i,
    html: (m, url) => ({ html: `<div class="embed embed-arquivo"><video controls playsinline preload="metadata" src="${esc(url)}"></video></div>` }) },
];

function embedDe(url) {
  for (const r of REGRAS) {
    const m = url.match(r.re);
    if (m) return { plataforma: r.nome, ...r.html(m, url) };
  }
  return null;
}

if (typeof module !== "undefined") module.exports = { embedDe, REGRAS };
