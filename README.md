# Site do Estagiário da F1

Site em [Eleventy](https://www.11ty.dev/), publicado pelo Netlify a cada mudança no GitHub.

## Como publicar uma matéria
Cada matéria é um arquivo em `src/materias/`, com o nome `AAAA-MM-DD-titulo.md`:

```markdown
---
title: Título da matéria
linha_fina: Uma frase que resume a notícia
date: 2026-11-11T14:00:00-03:00
categoria: F1
imagem: /images/uploads/foto.jpg        # opcional
credito_imagem: Foto: Equipe X/Divulgação # obrigatório se tiver imagem
fontes:
  - https://www.formula1.com/...
---

Texto da matéria em markdown.
```

O agente do site publica sozinho depois da aprovação no Telegram. Também dá pra escrever à mão pelo `/admin`.

## Páginas de dados
`calendario.html`, `pilotos.html`, `equipes.html`, `estatisticas.html`, `gp.html` e `comparador.html` são HTML puro, copiados como estão. Os dados vêm ao vivo da Jolpica e da OpenF1 (`src/assets/js/api/f1-api.js`).

## Lançamento
Enquanto `lancado` for `false` em `src/_data/site.json`, a página inicial mostra "Paddock em construção" e a home de verdade fica em `/home.html` (fora do Google). Para lançar, troque para `true`.

## Rodar no computador
```
npm install
npm run dev
```
