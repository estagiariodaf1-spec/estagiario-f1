// Pilotos e equipes que ganham página própria (/piloto/<slug>/ e /equipe/<slug>/).
// Uma matéria "é sobre" alguém quando o nome aparece no título, na linha fina ou na palavra-chave.
const PILOTOS = [
  ["max-verstappen", "Max Verstappen", "Verstappen"], ["isack-hadjar", "Isack Hadjar", "Hadjar"],
  ["charles-leclerc", "Charles Leclerc", "Leclerc"], ["lewis-hamilton", "Lewis Hamilton", "Hamilton"],
  ["george-russell", "George Russell", "Russell"], ["kimi-antonelli", "Kimi Antonelli", "Antonelli"],
  ["lando-norris", "Lando Norris", "Norris"], ["oscar-piastri", "Oscar Piastri", "Piastri"],
  ["fernando-alonso", "Fernando Alonso", "Alonso"], ["lance-stroll", "Lance Stroll", "Stroll"],
  ["pierre-gasly", "Pierre Gasly", "Gasly"], ["franco-colapinto", "Franco Colapinto", "Colapinto"],
  ["alex-albon", "Alex Albon", "Albon"], ["carlos-sainz", "Carlos Sainz", "Sainz"],
  ["liam-lawson", "Liam Lawson", "Lawson"], ["arvid-lindblad", "Arvid Lindblad", "Lindblad"],
  ["esteban-ocon", "Esteban Ocon", "Ocon"], ["oliver-bearman", "Oliver Bearman", "Bearman"],
  ["nico-hulkenberg", "Nico Hülkenberg", "H[üu]lkenberg"], ["gabriel-bortoleto", "Gabriel Bortoleto", "Bortoleto"],
  ["sergio-perez", "Sergio Pérez", "P[ée]rez"], ["valtteri-bottas", "Valtteri Bottas", "Bottas"],
  ["colton-herta", "Colton Herta", "Herta"], ["rafael-camara", "Rafael Câmara", "C[âa]mara"],
  ["ayrton-senna", "Ayrton Senna", "Senna"],
].map(([slug, nome, padrao]) => ({ tipo: "piloto", slug, nome, re: new RegExp(`\\b${padrao}\\b`, "i") }));

const EQUIPES = [
  ["mercedes", "Mercedes", "Mercedes"], ["ferrari", "Ferrari", "Ferrari"], ["red-bull", "Red Bull", "Red Bull"],
  ["mclaren", "McLaren", "McLaren"], ["aston-martin", "Aston Martin", "Aston Martin"], ["alpine", "Alpine", "Alpine"],
  ["williams", "Williams", "Williams"], ["racing-bulls", "Racing Bulls", "Racing Bulls"], ["haas", "Haas", "Haas"],
  ["audi", "Audi", "Audi|Sauber"], ["cadillac", "Cadillac", "Cadillac"],
].map(([slug, nome, padrao]) => ({ tipo: "equipe", slug, nome, re: new RegExp(`\\b(${padrao})\\b`, "i") }));

const cache = new Map();
function citados(item) {
  if (!item || !item.data) return [];
  const chave = item.url || item.inputPath;
  if (cache.has(chave)) return cache.get(chave);
  const d = item.data;
  const texto = [d.title, d.linha_fina, d.palavra_chave].filter(Boolean).join(" ");
  const achados = [...PILOTOS, ...EQUIPES].filter((a) => a.re.test(texto));
  cache.set(chave, achados);
  return achados;
}

module.exports = { PILOTOS, EQUIPES, citados };
