const FUSO = "America/Sao_Paulo";

const dataBR = (data, opcoes) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, ...opcoes }).format(new Date(data));

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
  // Páginas de dados do Pedro (pilotos, equipes...): HTML puro, copiado como está.
  for (const pagina of ["calendario", "comparador", "equipes", "estatisticas", "gp", "pilotos"]) {
    eleventyConfig.addPassthroughCopy(`src/${pagina}.html`);
  }

  eleventyConfig.addCollection("materias", (api) =>
    api.getFilteredByGlob("src/materias/*.md")
      .filter((m) => !m.data.rascunho)
      .sort((a, b) => b.date - a.date)
  );

  // 11 de novembro de 2026
  eleventyConfig.addFilter("dataLonga", (d) => dataBR(d, { day: "numeric", month: "long", year: "numeric" }));
  // 11/11/2026 às 14h05
  eleventyConfig.addFilter("dataHora", (d) => {
    const dia = dataBR(d, { day: "2-digit", month: "2-digit", year: "numeric" });
    const hora = dataBR(d, { hour: "2-digit", minute: "2-digit", hour12: false }).replace(":", "h");
    return `${dia} às ${hora}`;
  });
  eleventyConfig.addFilter("iso", (d) => new Date(d).toISOString());
  eleventyConfig.addFilter("rfc822", (d) => new Date(d).toUTCString());
  eleventyConfig.addFilter("primeiros", (lista, n) => (lista || []).slice(0, n));
  eleventyConfig.addFilter("depois", (lista, n) => (lista || []).slice(n));
  eleventyConfig.addFilter("absoluta", (caminho, base) => new URL(caminho, base).href);

  // Post do Instagram ou do X colado sozinho numa linha da matéria vira o post embedado.
  const INSTA = /^https?:\/\/(?:www\.)?instagram\.com\/(?:[\w.]+\/)?(p|reel|tv)\/([\w-]+)\/?(?:\?\S*)?$/;
  const XPOST = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/(\w+)\/status\/(\d+)\/?(?:\?\S*)?$/;
  const SCRIPT_INSTA = '<script async src="https://www.instagram.com/embed.js"></script>';
  const SCRIPT_X = '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>';
  eleventyConfig.addTransform("embeds", function (html) {
    if (!(this.page.outputPath || "").endsWith(".html") || !this.page.url.startsWith("/materias/")) return html;
    let insta = false, x = false;
    const novo = html.replace(/<p>\s*(?:<a [^>]*>)?\s*(https?:\/\/[^\s<]+)\s*(?:<\/a>)?\s*<\/p>/g, (linha, url) => {
      const limpa = url.replace(/&amp;/g, "&");
      let m = limpa.match(INSTA);
      if (m) {
        insta = true;
        const link = `https://www.instagram.com/${m[1]}/${m[2]}/`;
        return `<div class="embed"><blockquote class="instagram-media" data-instgrm-permalink="${link}" data-instgrm-version="14"><a href="${link}" target="_blank" rel="noopener">Ver este post no Instagram</a></blockquote></div>`;
      }
      m = limpa.match(XPOST);
      if (m) {
        x = true;
        const link = `https://twitter.com/${m[1]}/status/${m[2]}`;
        return `<div class="embed"><blockquote class="twitter-tweet" data-lang="pt" data-dnt="true"><a href="${link}" target="_blank" rel="noopener">Ver este post no X</a></blockquote></div>`;
      }
      return linha;
    });
    const scripts = (insta ? SCRIPT_INSTA : "") + (x ? SCRIPT_X : "");
    return scripts ? novo.replace("</body>", scripts + "</body>") : novo;
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["njk", "md"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
