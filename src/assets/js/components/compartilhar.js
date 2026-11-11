/* Compartilhar a matéria: link (menu do celular), WhatsApp e um card 1080x1920 pronto para story.
   O card é desenhado no próprio celular do leitor, na hora do clique: o site não fica mais pesado. */
(function () {
  'use strict';
  var caixa = document.querySelector('[data-compartilhar]');
  if (!caixa) return;
  var d = caixa.dataset;

  function aviso(botao, texto) {
    var antes = botao.textContent;
    botao.textContent = texto;
    setTimeout(function () { botao.textContent = antes; }, 2200);
  }

  function copiar(botao) {
    if (navigator.clipboard) navigator.clipboard.writeText(d.url).then(function () { aviso(botao, 'Link copiado!'); });
    else window.prompt('Copie o link:', d.url);
  }

  function quebrar(ctx, texto, largura) {
    var palavras = texto.split(/\s+/), linhas = [], linha = '';
    palavras.forEach(function (p) {
      var teste = linha ? linha + ' ' + p : p;
      if (ctx.measureText(teste).width > largura && linha) { linhas.push(linha); linha = p; } else { linha = teste; }
    });
    if (linha) linhas.push(linha);
    return linhas;
  }

  function carregarImagem(src) {
    return new Promise(function (ok, erro) {
      var img = new Image();
      img.onload = function () { ok(img); };
      img.onerror = erro;
      img.src = src;
    });
  }

  async function desenharCard() {
    var fonte = new FontFace('AntonCard', 'url(/assets/fonts/anton.woff2)');
    document.fonts.add(await fonte.load());
    var W = 1080, H = 1920, c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#0b0b0b'; ctx.fillRect(0, 0, W, H);

    if (d.imagem) {
      try {
        var img = await carregarImagem(d.imagem);
        var alturaFoto = 1150, escala = Math.max(W / img.width, alturaFoto / img.height);
        var w = img.width * escala, h = img.height * escala;
        ctx.drawImage(img, (W - w) / 2, (alturaFoto - h) / 2.6, w, h);
        var g = ctx.createLinearGradient(0, 600, 0, alturaFoto);
        g.addColorStop(0, 'rgba(11,11,11,0)'); g.addColorStop(1, 'rgba(11,11,11,1)');
        ctx.fillStyle = g; ctx.fillRect(0, 600, W, alturaFoto - 600);
        if (d.credito) {  // crédito da foto sempre junto, como na matéria
          ctx.font = '400 24px system-ui, -apple-system, Roboto, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.75)';
          ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillText(d.credito, W - 40, 1100); ctx.textAlign = 'left';
        }
      } catch (e) { /* sem foto, segue só com texto */ }
    }
    ctx.fillStyle = '#d10f0f'; ctx.fillRect(70, 1130, 330, 64);
    ctx.fillStyle = '#fff'; ctx.font = '700 34px system-ui, -apple-system, Roboto, sans-serif';
    ctx.textBaseline = 'middle'; ctx.fillText('ESTAGIÁRIO DA F1', 92, 1163);

    var titulo = (d.titulo || '').toUpperCase(), tamanho = 104, linhas;
    do {
      ctx.font = tamanho + 'px AntonCard';
      linhas = quebrar(ctx, titulo, W - 140);
      tamanho -= 6;
    } while (linhas.length > 5 && tamanho > 56);
    ctx.textBaseline = 'top'; ctx.fillStyle = '#fff';
    var y = 1230, passo = tamanho * 1.08;
    linhas.forEach(function (l) { ctx.fillText(l, 70, y); y += passo; });

    if (d.linha) {
      ctx.font = '400 38px system-ui, -apple-system, Roboto, sans-serif'; ctx.fillStyle = '#d6d6d6';
      quebrar(ctx, d.linha, W - 140).slice(0, 3).forEach(function (l) { y += 8; ctx.fillText(l, 70, y + 18); y += 46; });
    }
    ctx.fillStyle = '#ff2b2b'; ctx.font = '700 36px system-ui, -apple-system, Roboto, sans-serif';
    ctx.fillText('estagiariodaf1.com.br', 70, H - 120);
    return new Promise(function (ok) { c.toBlob(ok, 'image/jpeg', 0.9); });
  }

  caixa.addEventListener('click', async function (ev) {
    var botao = ev.target.closest('button');
    if (!botao) return;
    var acao = botao.dataset.acao;
    if (acao === 'link') {
      if (navigator.share) {
        navigator.share({ title: d.titulo, text: d.linha, url: d.url }).catch(function () {});
      } else { copiar(botao); }
      return;
    }
    if (acao === 'card') {
      botao.disabled = true; var rotulo = botao.textContent; botao.textContent = 'Montando o card…';
      try {
        var blob = await desenharCard();
        var arquivo = new File([blob], (d.slug || 'materia') + '-estagiario-f1.jpg', { type: 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
          await navigator.share({ files: [arquivo], title: d.titulo, text: d.url }).catch(function () {});
        } else {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = arquivo.name; a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        }
      } catch (e) {
        aviso(botao, 'Não deu pra montar o card');
      } finally {
        botao.disabled = false; botao.textContent = rotulo;
      }
    }
  });
})();
