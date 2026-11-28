// Posts do "Por trás do capacete" (o blog do Estagiário). O robô grava aqui pelo painel (aba Coluna).
// Rascunho fica no repositório mas não vira página.
module.exports = {
  layout: "post-capacete.njk",
  eleventyComputed: {
    permalink: (d) => (d.rascunho ? false : `/por-tras-do-capacete/${d.page.fileSlug}/`),
    autor: (d) => d.autor || (d.capacete && d.capacete.autor) || "Pedro Lopes",
  },
};
