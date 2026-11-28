/* Por trás do capacete: o feed vai carregando os posts mais antigos sozinho quando o leitor chega no fim
   (rolagem infinita, como nos blogs de antigamente, mas sem botão). Sem JavaScript, o link "Posts mais
   antigos" continua funcionando. Posts com Instagram/X embedado são processados de novo depois de chegar. */
(function () {
  'use strict';
  var feed = document.querySelector('[data-feed]');
  var mais = document.querySelector('[data-feed-mais]');
  if (!feed || !mais || !('IntersectionObserver' in window) || !window.fetch) return;
  var carregando = false;

  function scriptsDe(doc) {
    doc.querySelectorAll('script[src]').forEach(function (s) {
      var src = s.getAttribute('src');
      if (!/instagram\.com|twitter\.com/.test(src) || document.querySelector('script[src="' + src + '"]')) return;
      var novo = document.createElement('script');
      novo.src = src; novo.async = true;
      document.body.appendChild(novo);
    });
    if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
    if (window.twttr && window.twttr.widgets) window.twttr.widgets.load(feed);
  }

  function proxima() {
    var link = mais.querySelector('a');
    if (!link || carregando) return;
    carregando = true;
    link.textContent = 'Carregando…';
    fetch(link.href, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('[data-feed] .feed-post').forEach(function (post) { feed.appendChild(document.adoptNode(post)); });
        var novoMais = doc.querySelector('[data-feed-mais]');
        mais.innerHTML = novoMais ? novoMais.innerHTML : '';
        if (!mais.querySelector('a')) mais.innerHTML = '<p class="feed-fim">Você chegou no começo de tudo 🏁</p>';
        scriptsDe(doc);
        carregando = false;
      })
      .catch(function () { carregando = false; link.textContent = 'Posts mais antigos ›'; });
  }

  new IntersectionObserver(function (itens) {
    if (itens.some(function (i) { return i.isIntersecting; })) proxima();
  }, { rootMargin: '900px 0px' }).observe(mais);
})();
