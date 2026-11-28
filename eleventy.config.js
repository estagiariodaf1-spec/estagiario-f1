const { eleventyImageTransformPlugin } = require("@11ty/eleventy-img");

const FUSO = "America/Sao_Paulo";

const dataBR = (data, opcoes) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, ...opcoes }).format(new Date(data));

module.exports = function (eleventyConfig) {
  // Toda <img> local vira versões leves (WebP + original) em 3 tamanhos; o celular baixa a menor que serve.
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["webp", "jpeg"],
    widths: [480, 960, 1600],
    urlPath: "/img/",
    outputDir: "./_site/img/",
    failOnError: false,
    htmlOptions: {
      imgAttributes: { decoding: "async", sizes: "(max-width: 760px) 100vw, 640px" },
    },
  });

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });  // Cloudflare Pages
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
  // ícones: o boneco no círculo branco (aba do navegador, sugestões do Safari, atalho na tela do celular)
  eleventyConfig.addPassthroughCopy({ "src/icones/favicon.ico": "favicon.ico", "src/icones/apple-touch-icon.png": "apple-touch-icon.png",
    "src/icones/site.webmanifest": "site.webmanifest", "src/icones": "icones" });
  // Páginas de dados do Pedro (pilotos, equipes...): HTML puro, copiado como está.
  for (const pagina of ["calendario", "equipes", "pilotos"]) {
    eleventyConfig.addPassthroughCopy(`src/${pagina}.html`);
  }
  // Classificação (antiga "Estatísticas"): endereço limpo pro Google, /classificacao-f1-2026/
  eleventyConfig.addPassthroughCopy({ "src/classificacao.html": "classificacao-f1-2026/index.html" });

  // Cópia dos dados da F1 no build: o site usa se a API cair na hora (ver fetchJson em f1-api.js).
  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    const fs = require("node:fs"), path = require("node:path");
    const fontes = ["https://api.jolpi.ca/ergast/f1/current.json", "https://api.jolpi.ca/ergast/f1/current/next.json",
      "https://api.jolpi.ca/ergast/f1/current/last/results.json", "https://api.jolpi.ca/ergast/f1/current/driverstandings.json",
      "https://api.jolpi.ca/ergast/f1/current/constructorstandings.json",
      "https://api.jolpi.ca/ergast/f1/current/results/1.json?limit=100", "https://api.jolpi.ca/ergast/f1/current/results/2.json?limit=100",
      "https://api.jolpi.ca/ergast/f1/current/results/3.json?limit=100"];
    const pasta = path.join(dir.output, "dados", "f1");
    fs.mkdirSync(pasta, { recursive: true });
    await Promise.all(fontes.map(async (url) => {
      const nome = url.replace(/^https:\/\/[^/]+\/(ergast\/f1\/|v1\/)?/, "").replace(/[^a-z0-9]+/gi, "_") + ".json";
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (r.ok) fs.writeFileSync(path.join(pasta, nome), await r.text());
      } catch (e) { console.log("[dados f1] sem cópia de", url); }
    }));
  });

  // Pilotos e equipes: cada um tem página com as matérias que citam o nome (e alimentam o "Leia também").
  const { PILOTOS, EQUIPES, citados } = require("./src/_config/assuntos.js");
  eleventyConfig.addGlobalData("assuntos", [...PILOTOS, ...EQUIPES]);
  eleventyConfig.addFilter("assuntosDe", (item) => citados(item));
  const itemDe = (pagina, lista) => (lista || []).find((m) => m.url === pagina.url) || { url: pagina.url, data: {} };
  eleventyConfig.addFilter("itemDaPagina", itemDe);
  eleventyConfig.addFilter("assuntosDaPagina", (pagina, lista) => citados(itemDe(pagina, lista)));
  eleventyConfig.addFilter("materiasDoAssunto", (lista, slug) =>
    (lista || []).filter((m) => citados(m).some((a) => a.slug === slug)));
  // Leia também: até 3 matérias que dividem piloto/equipe com esta; completa com as mais recentes.
  eleventyConfig.addFilter("relacionadas", (lista, atual, n = 3) => {
    const meus = new Set(citados(atual).map((a) => a.slug));
    const outras = (lista || []).filter((m) => m.url !== atual.url);
    const pontos = (m) => citados(m).filter((a) => meus.has(a.slug)).length;
    const com = outras.filter((m) => pontos(m) > 0).sort((a, b) => pontos(b) - pontos(a) || b.date - a.date);
    const resto = outras.filter((m) => pontos(m) === 0);
    return [...com, ...resto].slice(0, n);
  });

  eleventyConfig.addCollection("materias", (api) =>
    api.getFilteredByGlob("src/materias/*.md")
      .filter((m) => !m.data.rascunho)
      .sort((a, b) => b.date - a.date)
  );

  // Por trás do capacete (o blog do Estagiário): posts publicados, do mais novo pro mais velho.
  eleventyConfig.addCollection("capacete", (api) =>
    api.getFilteredByGlob("src/capacete/*.md")
      .filter((m) => !m.data.rascunho)
      .sort((a, b) => b.date - a.date)
  );
  eleventyConfig.addFilter("comEtiqueta", (lista, slug) => (lista || []).filter((m) => (m.data.etiquetas || []).includes(slug)));
  eleventyConfig.addFilter("etiquetasCapacete", (slugs, todas) =>
    (slugs || []).map((s) => (todas || []).find((e) => e.slug === s)).filter(Boolean));
  eleventyConfig.addFilter("vizinhosCapacete", (lista, url) => {
    const i = (lista || []).findIndex((m) => m.url === url);
    return i < 0 ? {} : { novo: lista[i - 1], velho: lista[i + 1] };
  });
  // Imagem no meio do texto carrega só quando chega perto da tela (o feed do blog tem muita foto).
  eleventyConfig.amendLibrary("md", (md) => {
    const padrao = md.renderer.rules.image;
    md.renderer.rules.image = (tokens, idx, options, env, self) => {
      tokens[idx].attrSet("loading", "lazy");
      return padrao ? padrao(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
    };
  });

  // Período de um fim de semana de GP: "12 a 14 de mar." ou "30 de abr. a 2 de mai."
  const MESES = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
  eleventyConfig.addFilter("periodo", (inicio, fim) => {
    const [, m1, d1] = inicio.split("-").map(Number), [, m2, d2] = fim.split("-").map(Number);
    return m1 === m2 ? `${d1} a ${d2} de ${MESES[m2 - 1]}` : `${d1} de ${MESES[m1 - 1]} a ${d2} de ${MESES[m2 - 1]}`;
  });
  const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  eleventyConfig.addFilter("periodoLongo", (inicio, fim) => {
    const [, m1, d1] = inicio.split("-").map(Number), [, m2, d2] = fim.split("-").map(Number);
    return m1 === m2 ? `${d1} a ${d2} de ${MESES_LONGOS[m2 - 1]}` : `${d1} de ${MESES_LONGOS[m1 - 1]} a ${d2} de ${MESES_LONGOS[m2 - 1]}`;
  });
  eleventyConfig.addFilter("diaMes", (iso) => {
    const [, m, d] = iso.split("-").map(Number);
    return `${d} de ${["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"][m - 1]}`;
  });

  // Notas de sessão (TL1, TL2, TL3, classificação, sprint, corrida) pela palavra-chave que o robô grava.
  const SESSAO_DA_CHAVE = [[/^tl\s*1\b|^treino livre 1\b/i, "TL1"], [/^tl\s*2\b|^treino livre 2\b/i, "TL2"], [/^tl\s*3\b|^treino livre 3\b/i, "TL3"],
    [/^classifica[cç][aã]o sprint\b|^quali(fying)? sprint\b/i, "QS"], [/^sprint\b/i, "SP"], [/^classifica[cç][aã]o\b|^quali\b/i, "Q"],
    [/^corrida\b|^resultado\b/i, "R"]];
  eleventyConfig.addFilter("notasDeSessao", (lista, dias = 21) => {
    const limite = Date.now() - dias * 24 * 3600e3;
    return (lista || []).filter((m) => m.date.getTime() >= limite).map((m) => {
      const chave = String(m.data.palavra_chave || "").trim();
      const achou = SESSAO_DA_CHAVE.find(([re]) => re.test(chave));
      const gp = chave.replace(/^(tl\s*[123]|treino livre [123]|classifica[cç][aã]o sprint|quali(fying)? sprint|sprint|classifica[cç][aã]o|quali|corrida|resultado)\s+(d[oa]s?\s+)?/i, "");
      return achou && /^GP\b/i.test(gp) ? { sessao: achou[1], gp, url: m.url, data: m.date.toISOString() } : null;
    }).filter(Boolean);
  });

  // Sitemap de notícias: o Google só aceita matérias das últimas 48 horas.
  eleventyConfig.addCollection("materiasRecentes", (api) => {
    const limite = Date.now() - 2 * 24 * 60 * 60 * 1000;
    return api.getFilteredByGlob("src/materias/*.md")
      .filter((m) => !m.data.rascunho && m.date.getTime() >= limite)
      .sort((a, b) => b.date - a.date);
  });

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
  // Destaques da home: as fixadas pelo Pedro (na ordem dele, em src/_data/destaques.json) e o resto
  // completado com as mais novas. Fixada fica no carrossel até ser desafixada, mesmo com matéria nova.
  const slugDaUrl = (url) => (url || "").split("/").filter(Boolean).pop();
  eleventyConfig.addFilter("destaquesHome", (lista, fixadas, n = 5) => {
    const todas = lista || [];
    const presas = (fixadas || [])
      .map((slug) => todas.find((m) => slugDaUrl(m.url) === slug))
      .filter(Boolean)
      .slice(0, n);
    const resto = todas.filter((m) => !presas.includes(m));
    return [...presas, ...resto].slice(0, n);
  });
  eleventyConfig.addFilter("tirando", (lista, fora) => (lista || []).filter((m) => m !== fora));
  eleventyConfig.addFilter("primeiros", (lista, n) => (lista || []).slice(0, n));
  eleventyConfig.addFilter("depois", (lista, n) => (lista || []).slice(n));
  eleventyConfig.addFilter("absoluta", (caminho, base) => new URL(caminho, base).href);
  // Imagem de compartilhamento com marca de versão pelo conteúdo: trocou a foto (mesmo nome de arquivo),
  // muda o endereço e o WhatsApp/Facebook/X buscam a nova em vez de mostrar a miniatura guardada.
  eleventyConfig.addFilter("comVersao", (caminho) => {
    if (!caminho || !caminho.startsWith("/")) return caminho;
    try {
      const fs = require("node:fs"), crypto = require("node:crypto");
      const hash = crypto.createHash("md5").update(fs.readFileSync("src" + caminho.split("?")[0])).digest("hex").slice(0, 10);
      return caminho + (caminho.includes("?") ? "&" : "?") + "v=" + hash;
    } catch (e) { return caminho; }
  });

  // Link colado sozinho numa linha da matéria vira o conteúdo embedado (posts e vídeos de qualquer plataforma).
  const { embedDe } = require("./src/_config/embeds.js");
  const SCRIPTS = {
    instagram: '<script async src="https://www.instagram.com/embed.js"></script>',
    x: '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>',
  };
  eleventyConfig.addTransform("embeds", function (html) {
    if (!(this.page.outputPath || "").endsWith(".html") || !/^\/(materias|por-tras-do-capacete)\//.test(this.page.url || "")) return html;
    const usados = new Set();
    const novo = html.replace(/<p>\s*(?:<a [^>]*>)?\s*(https?:\/\/[^\s<]+)\s*(?:<\/a>)?\s*<\/p>/g, (linha, url) => {
      const achado = embedDe(url.replace(/&amp;/g, "&"));
      if (!achado) return linha;
      if (achado.script) usados.add(achado.script);
      return achado.html;
    });
    const scripts = [...usados].map((k) => SCRIPTS[k]).join("");
    return scripts ? novo.replace("</body>", scripts + "</body>") : novo;
  });

  // As páginas de dados (gp, pilotos...) são HTML puro com cabeçalho próprio. Depois do build, troca o
  // cabeçalho delas pelo mesmo da home: logo, selo Ao vivo, menu e logos das redes ficam iguais em todo o site.
  const BLOCO_TOPO = /<header class="header">[\s\S]*?<\/nav>\s*<\/div>\s*<\/div>(\s*<script src="\/assets\/js\/aovivo-selo\.js(?:\?v=\d+)?" defer(?:="")?><\/script>)?/;
  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const home = await fs.readFile(path.join(dir.output, "index.html"), "utf8");
    const topo = (home.match(BLOCO_TOPO) || [])[0];
    if (!topo || !topo.includes("aovivo-selo.js")) throw new Error("cabeçalho da home não encontrado para as páginas de dados");
    const RODAPE = /<footer[\s\S]*?<\/footer>/;
    const rodape = (home.match(RODAPE) || [])[0];
    if (!rodape || !rodape.includes("<svg")) throw new Error("rodapé da home não encontrado para as páginas de dados");
    const PAGINAS_DADOS = [["calendario", "calendario.html", "/calendario.html"], ["equipes", "equipes.html", "/equipes.html"], ["pilotos", "pilotos.html", "/pilotos.html"],
      ["classificacao", "classificacao-f1-2026/index.html", "/classificacao-f1-2026/"]];
    for (const [pagina, saida, endereco] of PAGINAS_DADOS) {
      const arquivo = path.join(dir.output, saida);
      const html = await fs.readFile(arquivo, "utf8");
      if (!BLOCO_TOPO.test(html)) throw new Error(`cabeçalho de ${pagina}.html não encontrado`);
      const icones = '<link rel="icon" href="/favicon.ico?v=3" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/icones/favicon-32.png?v=3"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3"><link rel="manifest" href="/site.webmanifest?v=3">';
      const ativo = topo.replaceAll(`href="${endereco}"`, `href="${endereco}" class="is-active" aria-current="page"`);
      const comIcones = html.includes('rel="apple-touch-icon"') ? html : html.replace("</head>", icones + "</head>");
      let pronto = comIcones.replace(BLOCO_TOPO, () => ativo);
      // rodapé igual ao da home (com os ícones das redes); quem não tinha ganha um depois do conteúdo
      pronto = RODAPE.test(pronto) ? pronto.replace(RODAPE, () => rodape) : pronto.replace("</main>", () => "</main>\n    " + rodape);
      // CSS e JS das páginas de dados com a versão do build: sem isso o navegador ficava com o estilo velho
      // (28/11: os botões 2026 | 2027 apareciam como link azul cru no calendário)
      const versao = require("./src/_data/versao.js");
      pronto = pronto.replace(/(href|src)="(\/assets\/[^"?]+\.(?:css|js))"/g, (_, attr, url) => `${attr}="${url}?v=${versao}"`);
      await fs.writeFile(arquivo, pronto);
    }
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["njk", "md"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
