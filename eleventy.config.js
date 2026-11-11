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

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["njk", "md"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
