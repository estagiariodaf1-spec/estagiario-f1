/* Ao vivo do Estagiário: junta o minuto a minuto (posts do Pedro) com os dados de pista do OpenF1 que o robô serve. */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var grade = $('.av-grade'), lista = $('[data-lista]'), vazio = $('[data-vazio]'), main = $('[data-av]');
  var posts = { ativo: false, titulo: null, entradas: [] }, dados = { ativo: false };
  var primeira = true, vistos = {}, abertaTabela = false;

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function formata(t) {
    return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>');
  }
  function hora(iso) {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  }
  function num(v, casas) { return (v == null || v === '') ? '–' : (typeof v === 'number' ? '+' + v.toFixed(casas == null ? 3 : casas) : esc(v)); }
  // brasileiros no grid: pelo sobrenome, sem acento (a sigla do Câmara pode variar)
  var BRASILEIROS = ['bortoleto', 'camara'];
  function ehBR(p) {
    var n = String(p.nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return BRASILEIROS.some(function (b) { return n.indexOf(b) >= 0; });
  }
  var MENSAGENS = [
    [/^GREEN LIGHT - PIT EXIT OPEN/, 'Sinal verde: saída dos boxes aberta.'],
    [/^SESSION STARTED/, 'Sessão começou.'],
    [/^SESSION WILL RESUME AT (.+)/, 'A sessão volta às $1 (horário local).'],
    [/^SESSION SUSPENDED/, 'Sessão suspensa.'],
    [/^OVERTAKE ENABLED/, 'Modo de ultrapassagem liberado.'],
    [/^OVERTAKE DISABLED/, 'Modo de ultrapassagem desligado.'],
    [/^LOW GRIP CONDITIONS/, 'Pista com pouca aderência.'],
    [/^LOW GRIP DELTA ACTIVE/, 'Delta de pouca aderência ativado.'],
    [/^WET TRACK/, 'Pista molhada.'],
    [/^TRACK SURFACE SLIPPERY(.*)/, 'Pista escorregadia$1.'],
    [/^CAR (\d+) \((\w+)\) STOPPED (?:AT|IN) TURN (\d+)/, 'Carro $1 ($2) parado na curva $3.'],
    [/^RECOVERY VEHICLE ON TRACK/, 'Veículo de resgate na pista.'],
    [/^MEDICAL CAR/, 'Carro médico na pista.'],
    [/^PIT EXIT CLOSED/, 'Saída dos boxes fechada.'],
    [/^RED FLAG/, 'Bandeira vermelha.'],
    [/^CHEQUERED FLAG/, 'Bandeira quadriculada.'],
    [/^TRACK CLEAR/, 'Pista liberada.'],
    [/^DOUBLE YELLOW IN TRACK SECTOR (\d+)/, 'Bandeira amarela dupla no setor $1.'],
    [/^YELLOW IN TRACK SECTOR (\d+)/, 'Bandeira amarela no setor $1.'],
    [/^CLEAR IN TRACK SECTOR (\d+)/, 'Setor $1 liberado.'],
    [/^SAFETY CAR DEPLOYED/, 'Safety car na pista.'],
    [/^SAFETY CAR IN THIS LAP/, 'Safety car entra nos boxes nesta volta.'],
    [/^VIRTUAL SAFETY CAR DEPLOYED/, 'Safety car virtual acionado.'],
    [/^VIRTUAL SAFETY CAR ENDING/, 'Fim do safety car virtual.'],
    [/^DRS ENABLED/, 'DRS liberado.'],
    [/^DRS DISABLED/, 'DRS desligado.'],
    [/^RISK OF RAIN FOR F1 RACE IS (\d+)%/, 'Risco de chuva para a corrida: $1%.'],
    [/^CAR (\d+) \((\w+)\) TIME (.+) DELETED - TRACK LIMITS AT TURN (\d+) LAP (\d+)/, 'Tempo de $3 do carro $1 ($2) apagado: limite de pista na curva $4, volta $5.'],
    [/^BLUE FLAG FOR CAR (\d+) \((\w+)\)/, 'Bandeira azul para o carro $1 ($2).'],
    [/^BLACK AND WHITE FLAG FOR CAR (\d+) \((\w+)\)/, 'Bandeira preta e branca para o carro $1 ($2).'],
    [/^FIA STEWARDS: (.+) UNDER INVESTIGATION/, 'Comissários investigam: $1.'],
    [/^FIA STEWARDS: (.+) NOTED/, 'Comissários anotaram: $1.'],
    [/^FIA STEWARDS: NO FURTHER (?:INVESTIGATION|ACTION) - (.+)/, 'Comissários: sem punição. $1'],
    [/^FIA STEWARDS: (.+)/, 'Comissários: $1']
  ];
  function traduz(m) {
    for (var i = 0; i < MENSAGENS.length; i++) { if (MENSAGENS[i][0].test(m)) return m.replace(MENSAGENS[i][0], MENSAGENS[i][1]); }
    return m.charAt(0) + m.slice(1).toLowerCase();
  }
  /* tipo de mensagem oficial: rótulo e cor */
  function tipoOficial(m) {
    var t = m.texto || '', b = m.bandeira || '';
    if (b === 'RED' || /^RED FLAG/.test(t)) return ['vermelha', 'Bandeira vermelha'];
    if (/YELLOW/.test(b) || /YELLOW/.test(t)) return ['amarela', 'Bandeira amarela'];
    if (/SAFETY CAR/.test(t)) return ['sc', /VIRTUAL/.test(t) ? 'Safety car virtual' : 'Safety car'];
    if (b === 'CHEQUERED' || /CHEQUERED/.test(t)) return ['quadriculada', 'Bandeira quadriculada'];
    if (b === 'GREEN' || b === 'CLEAR' || /^(GREEN LIGHT|TRACK CLEAR|CLEAR IN)/.test(t)) return ['verde', 'Pista liberada'];
    if (/STEWARDS|INVESTIGATION|PENALTY|NOTED|REPRIMAND|SUMMONED/.test(t)) return ['comissarios', 'Comissários'];
    if (/TRACK LIMITS|DELETED|BLACK AND WHITE/.test(t)) return ['limites', 'Limite de pista'];
    if (/WET|GRIP|RAIN|SLIPPERY|DEBRIS|OIL|SURFACE/.test(t)) return ['condicoes', 'Condições da pista'];
    if (/SESSION|PIT EXIT|PIT ENTRY|PIT LANE|RESUME|SUSPENDED|START/.test(t)) return ['sessao', 'Sessão'];
    if (/OVERTAKE|DRS/.test(t)) return ['ultrapassagem', 'Modo de ultrapassagem'];
    if (/STOPPED|INCIDENT|CRASH|RECOVERY|MEDICAL|HAZARD/.test(t)) return ['incidente', 'Incidente'];
    return ['', 'Direção de prova'];
  }

  /* ---------- tuítes embutidos (script oficial do X, carregado só quando aparece o primeiro) ---------- */
  var xPronto = null;
  function carregaTuite(li) {
    if (!xPronto) {
      xPronto = new Promise(function (ok) {
        var sc = document.createElement('script');
        sc.src = 'https://platform.twitter.com/widgets.js'; sc.async = true; sc.charset = 'utf-8';
        sc.onload = function () { ok(window.twttr); }; sc.onerror = function () { ok(null); };
        document.head.appendChild(sc);
      });
    }
    xPronto.then(function (tw) { if (tw && tw.widgets) tw.widgets.load(li); });
  }

  /* ---------- ultrapassagens detectadas pela mudança de posição (corrida) ---------- */
  var ordemAnterior = null, eventosLocais = [];
  function detectaUltrapassagens() {
    if (!(dados.tipo === 'Race' || dados.tipo === 'Sprint')) return;
    var ps = (dados.pilotos || []).filter(function (p) { return p.posicao; });
    var atual = {}; ps.forEach(function (p) { atual[p.numero] = p; });
    if (ordemAnterior) {
      ps.forEach(function (p) {
        var antes = ordemAnterior[p.numero];
        if (!antes || p.no_box || antes.no_box || p.posicao >= antes.posicao) return;
        // quem estava na posição que ele ganhou e caiu (e não foi pro box)
        var vitima = ps.find(function (q) { var a = ordemAnterior[q.numero]; return a && a.posicao === p.posicao && q.posicao > p.posicao && !q.no_box; });
        if (!vitima || ps.some(function (q) { return q.no_box && ordemAnterior[q.numero] && ordemAnterior[q.numero].posicao < antes.posicao; })) return;
        eventosLocais.unshift({ id: 'u' + dados.relogio + p.numero, quando: dados.relogio || new Date().toISOString(), classe: 'ultrapassagem-ev', cat: 'oficial',
          html: '<span class="rot">Ultrapassagem</span><b>' + esc(p.nome) + '</b> passa <b>' + esc(vitima.nome) + '</b> e assume o ' + p.posicao + 'º lugar' +
            (ehBR(p) ? ' 🇧🇷' : '') });
      });
      eventosLocais = eventosLocais.slice(0, 40);
    }
    ordemAnterior = {}; ps.forEach(function (p) { ordemAnterior[p.numero] = { posicao: p.posicao, no_box: p.no_box }; });
  }

  /* ---------- minuto a minuto ---------- */
  function itensFeed() {
    var itens = (posts.entradas || []).map(function (e) {
      var m = /^\[\[(tuite|torcida)\]\]\s+(https:\/\/(?:x|twitter)\.com\/([A-Za-z0-9_]+)\/status\/(\d+))/.exec(e.texto || '');
      // link de tuíte colado sozinho no campo do Ao vivo: vira tuíte embutido também
      var solto = /^\s*(https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]+)\/status\/(\d+))\S*\s*$/.exec(e.texto || '');
      if (!m && solto) m = [solto[0], /^estagiariodaf1$/i.test(solto[2]) ? 'tuite' : 'torcida', solto[1].replace('http://', 'https://').replace('www.', ''), solto[2], solto[3]];
      if (m) {  // tuíte embutido: o vídeo toca aqui mesmo
        var rotulo = m[1] === 'tuite' ? 'No X · @' + m[3] : 'Da torcida · @' + m[3];
        return { id: 'p' + e.id, quando: e.quando, classe: 'tuite ' + (m[1] === 'tuite' ? 'nosso' : 'torcida'), tuite: true,
          cat: m[1] === 'tuite' ? 'estagiario' : 'torcida',
          html: '<span class="rot">' + esc(rotulo) + '</span><blockquote class="twitter-tweet" data-dnt="true" data-conversation="none" data-theme="' +
            (main.dataset.tema === 'claro' ? 'light' : 'dark') + '"><a href="' + esc(m[2].replace('x.com', 'twitter.com')) + '">Ver no X</a></blockquote>' };
      }
      var rot = { destaque: 'Estagiário', bandeira: 'Bandeira', abertura: 'Começou', encerramento: 'Encerrado' }[e.tipo] || 'Estagiário';
      return { id: 'p' + e.id, quando: e.quando, classe: 'tipo-' + e.tipo, cat: 'estagiario', html: '<span class="rot">' + rot + '</span>' + formata(e.texto) };
    });
    if (dados.ativo) {
      (dados.direcao || []).forEach(function (m) {
        if (!m.texto || /BLUE FLAG/.test(m.texto)) return;  // bandeira azul vira spam na corrida
        var tp = tipoOficial(m);
        itens.push({ id: 'd' + m.quando + m.texto, quando: m.quando, classe: 'oficial ' + tp[0], cat: 'oficial',
          html: '<span class="rot">' + tp[1] + '</span>' + esc(m.texto_pt || traduz(m.texto)) });
      });
      (dados.radio || []).forEach(function (r) {
        if (!r.texto && r.vazio) return;  // rádio sem fala aproveitável: não entra
        itens.push({ id: 'r' + r.quando + r.piloto, quando: r.quando, classe: 'radio', cat: 'radio',
          // sem tocar o áudio (é da transmissão da F1): só a transcrição traduzida, quando o robô já tiver feito
          html: '<span class="rot">Rádio · ' + esc(r.piloto) + '</span>' + (r.texto ? '“' + esc(r.texto) + '”' : '') +
            (r.audio && !r.texto ? '<audio controls preload="none" src="' + esc(r.audio) + '"></audio>' : '') });
      });
    }
    itens = itens.concat(eventosLocais);
    itens.sort(function (a, b) { return a.quando < b.quando ? 1 : -1; });
    return itens.slice(0, 120);
  }
  function desenhaFeed() {
    var itens = itensFeed(), ids = {};
    itens.forEach(function (i) { ids[i.id] = true; });
    Array.prototype.slice.call(lista.children).forEach(function (li) { if (!ids[li.dataset.id]) li.remove(); });
    var anterior = null;
    itens.forEach(function (i) {
      var li = lista.querySelector('[data-id="' + CSS.escape(i.id) + '"]');
      if (li && !i.tuite && li.dataset.html !== i.html) { li.querySelector('div').innerHTML = i.html; li.dataset.html = i.html; }
      if (!li) {
        li = document.createElement('li');
        li.dataset.html = i.html;
        li.dataset.id = i.id;
        li.dataset.cat = i.cat || 'estagiario';
        li.id = 'post-' + i.id.replace(/[^A-Za-z0-9_-]/g, '');
        li.className = i.classe + (primeira || vistos[i.id] ? '' : ' nova');
        li.innerHTML = '<time>' + hora(i.quando) + '</time><div>' + i.html + '</div>' +
          (i.cat === 'estagiario' || i.cat === 'torcida' ? '<button type="button" class="av-compartilhar" aria-label="Compartilhar este post">Compartilhar</button>' : '');
        vistos[i.id] = true;
        if (i.tuite) carregaTuite(li);
      }
      if (anterior) { if (anterior.nextSibling !== li) lista.insertBefore(li, anterior.nextSibling); }
      else if (lista.firstChild !== li) lista.insertBefore(li, lista.firstChild);
      anterior = li;
    });
    aplicaFiltro();
    vazio.hidden = itens.length > 0 || posts.ativo || dados.ativo;
    $('[data-filtros]').hidden = !dados.ativo;
    if (!rolouAoPost && location.hash.indexOf('#post-') === 0) {
      var alvo = document.getElementById(location.hash.slice(1));
      if (alvo) { rolouAoPost = true; alvo.scrollIntoView({ block: 'center' }); alvo.classList.add('nova'); }
    }
    $('[data-feed-sub]').textContent = dados.ativo ? 'Estagiário, direção e rádio' : 'Estagiário';
  }

  var ultimaAtualizacao = null;
  function marcaAtualizado() {
    if (!ultimaAtualizacao) return;
    var seg = Math.max(0, Math.round((Date.now() - ultimaAtualizacao.getTime()) / 1000));
    $('[data-atualizado]').textContent = seg < 60 ? 'Atualizado há ' + seg + ' s' : 'Atualizado há ' + Math.round(seg / 60) + ' min';
  }
  setInterval(marcaAtualizado, 1000);

  /* ---------- situação da sessão pelo que a direção de prova falou (em ordem) ---------- */
  function statusSessao() {
    var msgs = (dados.direcao || []).slice().sort(function (a, b) { return a.quando < b.quando ? -1 : 1; });
    var st = 'aguardando';
    msgs.forEach(function (m) {
      var t = m.texto || '';
      if (/CHEQUERED/.test(t) || m.bandeira === 'CHEQUERED') st = 'fim';
      else if (/^RED FLAG/.test(t) || m.bandeira === 'RED') st = 'vermelha';
      else if (/SESSION STARTED|GREEN LIGHT - PIT EXIT OPEN|SESSION (?:WILL )?RESUME/.test(t) || (m.bandeira === 'GREEN' && st !== 'aguardando')) st = 'verde';
      else if (/^(?:VIRTUAL )?SAFETY CAR DEPLOYED/.test(t)) st = /VIRTUAL/.test(t) ? 'vsc' : 'sc';
      else if (/SAFETY CAR (?:IN THIS LAP|ENDING)/.test(t) && (st === 'sc' || st === 'vsc')) st = 'verde';
    });
    if (st === 'verde' && /YELLOW/.test(dados.bandeira || '')) st = 'amarela';
    if (dados.faltam === 0 && st !== 'vermelha') st = 'fim';
    var fimTxt = '🏁 Fim de sessão';
    if (st === 'fim') {
      var n = dados.quadriculadas != null ? dados.quadriculadas : msgs.filter(function (m) { return /CHEQUERED/.test(m.texto || '') || m.bandeira === 'CHEQUERED'; }).length;
      var nome = dados.nome_sessao || '', tipo = dados.tipo || '';
      if (/Sprint Qualifying|Sprint Shootout/.test(nome)) fimTxt = n >= 3 ? '🏁 Fim da classificação sprint' : '🏁 Fim do SQ' + Math.max(1, n);
      else if (tipo === 'Qualifying' || /Qualifying/.test(nome)) fimTxt = n >= 3 ? '🏁 Fim da classificação' : '🏁 Fim do Q' + Math.max(1, n);
      else if (nome === 'Sprint') fimTxt = '🏁 Fim da sprint';
      else if (tipo === 'Race') fimTxt = '🏁 Fim de corrida';
      else if (tipo === 'Practice') fimTxt = '🏁 Fim do treino';
    }
    return {
      aguardando: ['aguardando', 'Aguardando início'], verde: ['verde', 'Bandeira verde'], amarela: ['amarela', 'Bandeira amarela'],
      vermelha: ['vermelha', 'Bandeira vermelha'], sc: ['sc', 'Safety car'], vsc: ['sc', 'Safety car virtual'], fim: ['quadriculada', fimTxt]
    }[st];
  }

  /* ---------- visão compacta e colunas (o leitor escolhe; fica guardado no navegador dele) ---------- */
  var tabelaEl = $('[data-bloco-tabela]'), prefs = {};
  try { prefs = JSON.parse(localStorage.getItem('av-tabela') || '{}'); } catch (e) {}
  function salvaPrefs() { try { localStorage.setItem('av-tabela', JSON.stringify(prefs)); } catch (e) {} }
  function aplicaPrefs() {
    tabelaEl.classList.toggle('compacta', !!prefs.compacta);
    $('[data-compacta]').setAttribute('aria-pressed', prefs.compacta ? 'true' : 'false');
    Array.prototype.forEach.call(document.querySelectorAll('[data-col]'), function (c) {
      var escondida = (prefs.ocultas || []).indexOf(c.dataset.col) >= 0;
      c.checked = !escondida;
      tabelaEl.classList.toggle('sem-' + c.dataset.col, escondida);
    });
  }
  $('[data-compacta]').addEventListener('click', function () { prefs.compacta = !prefs.compacta; salvaPrefs(); aplicaPrefs(); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-col]'), function (c) {
    c.addEventListener('change', function () {
      var o = (prefs.ocultas || []).filter(function (x) { return x !== c.dataset.col; });
      if (!c.checked) o.push(c.dataset.col);
      prefs.ocultas = o; salvaPrefs(); aplicaPrefs();
    });
  });
  aplicaPrefs();

  /* ---------- filtros e compartilhar ---------- */
  var filtro = 'tudo', rolouAoPost = false;
  function aplicaFiltro() {
    Array.prototype.forEach.call(lista.children, function (li) { li.hidden = filtro !== 'tudo' && li.dataset.cat !== filtro; });
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-filtro]'), function (b) {
    b.addEventListener('click', function () {
      filtro = b.dataset.filtro;
      Array.prototype.forEach.call(document.querySelectorAll('[data-filtro]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      aplicaFiltro();
    });
  });
  lista.addEventListener('click', function (e) {
    var b = e.target.closest('.av-compartilhar');
    if (!b) return;
    var li = b.closest('li'), url = location.origin + location.pathname + '#' + li.id;
    var texto = (li.querySelector('div') || li).textContent.replace(/\s+/g, ' ').replace('Compartilhar', '').trim().slice(0, 140);
    if (navigator.share) { navigator.share({ title: document.title, text: texto, url: url }).catch(function () {}); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () {
      b.textContent = 'Link copiado'; setTimeout(function () { b.textContent = 'Compartilhar'; }, 2000);
    }).catch(function () { window.prompt('Copie o link do post:', url); });
  });

  /* ---------- cabeçalho ---------- */
  function desenhaTopo() {
    var vivo = posts.ativo || dados.ativo, st = $('[data-av-status]');
    st.textContent = vivo ? 'AO VIVO' : (posts.titulo ? 'Encerrado' : 'Fora do ar');
    st.className = 'aovivo-status' + (vivo ? ' no-ar' : '');
    var titulo = posts.ativo && posts.titulo ? posts.titulo : (dados.ativo ? dados.sessao : (posts.titulo || 'Ao vivo do Estagiário'));
    var paises = { 'United States': 'us', USA: 'us', Australia: 'au', China: 'cn', Japan: 'jp', Bahrain: 'bh', 'Saudi Arabia': 'sa',
      Canada: 'ca', Monaco: 'mc', Spain: 'es', Austria: 'at', 'United Kingdom': 'gb', UK: 'gb', Belgium: 'be', Hungary: 'hu',
      Netherlands: 'nl', Italy: 'it', Azerbaijan: 'az', Singapore: 'sg', Mexico: 'mx', Brazil: 'br', Qatar: 'qa',
      'United Arab Emirates': 'ae', UAE: 'ae', Portugal: 'pt', France: 'fr', Germany: 'de', Turkey: 'tr' };
    var cod = dados.ativo && paises[dados.pais];
    if (!cod && /las vegas|miami|austin/i.test(dados.circuito || '')) cod = 'us';
    $('[data-titulo]').innerHTML = esc(titulo) + (cod ? ' <img class="av-bandeira-pais" src="/assets/bandeiras/' + cod + '.svg" alt="" width="40" height="40">' : '');
    document.title = (vivo ? '🔴 ' : '') + titulo + ' · Estagiário da F1';
    var comp = document.querySelector('.av-compartilhar-pagina');  // compartilhar leva o nome da cobertura
    if (comp && comp.dataset.titulo !== (vivo ? '🔴 ' : '') + titulo) {
      comp.dataset.titulo = (vivo ? '🔴 ' : '') + titulo;
      comp.dispatchEvent(new Event('compartilhar:atualizou'));
      var w = comp.querySelector('[data-whats]');
      if (w) w.href = 'https://wa.me/?text=' + encodeURIComponent((vivo ? '🔴 ' : '') + titulo + ' ' + comp.dataset.url);
    }
    var band = $('[data-bandeira]');
    band.hidden = !dados.ativo;
    $('[data-numeros]').hidden = !dados.ativo;
    if (!dados.ativo) $('[data-vivo-linha]').hidden = true;
    $('[data-reprise]').hidden = !(dados.ativo && dados.modo === 'reprise');
    $('[data-circuito]').textContent = dados.ativo ? (dados.circuito || '') : '';
    if (!dados.ativo) return;
    var st = statusSessao();
    band.className = 'av-bandeira ' + st[0];
    band.textContent = st[1];
    ultimaAtualizacao = dados.atualizado_em ? new Date(dados.atualizado_em) : new Date();
    $('[data-vivo-linha]').hidden = false;
    $('[data-sessao-st]').textContent = st[0] === 'aguardando' ? 'Aguardando' : (st[0] === 'quadriculada' ? 'Encerrada' : 'Em andamento');
    marcaAtualizado();
    var rc = (dados.direcao || []).filter(function (m) { return m.texto && !/BLUE FLAG/.test(m.texto); })
      .sort(function (a, b) { return a.quando < b.quando ? 1 : -1; })[0];
    $('[data-rc]').hidden = !rc;
    if (rc) {
      var tp = tipoOficial(rc);
      $('[data-rc]').className = 'av-rc ' + tp[0];
      $('[data-rc-texto]').textContent = (rc.texto_pt || traduz(rc.texto)) + ' (' + hora(rc.quando) + ')';
    }
    var f = dados.faltam_fase != null ? dados.faltam_fase : dados.faltam;
    var rotFaltam = document.querySelector('[data-numeros] div:first-child small');
    if (rotFaltam) rotFaltam.textContent = dados.fase_rotulo || 'Faltam';
    $('[data-faltam]').textContent = f == null ? '–' : (Math.floor(f / 3600) ? Math.floor(f / 3600) + ':' : '') + String(Math.floor(f % 3600 / 60)).padStart(2, '0') + ':' + String(f % 60).padStart(2, '0');
    var c = dados.clima || {};
    $('[data-pista]').textContent = c.pista != null ? Math.round(c.pista) + '°C' : '–';
    $('[data-ar]').textContent = c.ar != null ? Math.round(c.ar) + '°C' : '–';
    $('[data-vento]').textContent = c.vento != null ? c.vento + ' km/h' : '–';
    $('[data-chuva]').textContent = c.chuva == null ? '–' : (c.chuva ? 'Sim' : 'Não');
  }

  /* ---------- tabela ---------- */
  function desenhaTabela() {
    var ps = dados.pilotos || [], corrida = dados.tipo === 'Race' || dados.tipo === 'Sprint';
    var mostrar = abertaTabela || window.innerWidth > 900 ? ps : ps.slice(0, 5);
    $('[data-mais]').hidden = abertaTabela || window.innerWidth > 900 || ps.length <= 5;
    $('[data-tabela-sub]').textContent = corrida ? 'Posição na corrida' : (dados.fase_atual ? 'Classificação · ' + dados.fase_atual : 'Pela melhor volta');
    $('[data-linhas]').innerHTML = mostrar.map(function (p) {
      var sets = (p.setores || []).map(function (s, i) { return '<span class="s ' + (s.cor || '') + '" title="Setor ' + (i + 1) + (s.tempo ? ': ' + s.tempo.toFixed(3) : '') + '"></span>'; }).join('');
      var pn = p.pneu ? '<span class="pneu"><i class="' + esc(p.pneu.composto) + '">' + esc(p.pneu.composto) + '</i>' + p.pneu.voltas + 'v</span>' : '';
      var br = ehBR(p) ? '<span class="tag-br">BR</span>' : '';
      var box = p.no_box ? '<span class="tag-box">NOS BOXES</span>' : '';
      var gap = p.pos === 1 ? (corrida ? 'Líder' : '–') : num(p.gap);
      var fora = /^fora_q(\d)/.exec(p.fase || '');
      if (fora) box += '<span class="tag-fora">Fora no Q' + fora[1] + '</span>';
      return '<tr class="' + (ehBR(p) ? 'br' : '') + (fora ? ' fora' : '') + '"><td class="pos">' + p.pos + '</td><td class="cor"><span style="background:' + esc(p.cor) + '"></span></td>' +
        '<td class="piloto"><b>' + esc(p.nome) + br + box + '</b><small>' + esc(p.equipe || '') + '</small>' +
          ((p.mini || []).length ? '<span class="mini so-largo" aria-hidden="true">' + p.mini.map(function (m) { return '<i class="' + m + '"></i>'; }).join('') + '</span>' : '') + '</td>' +
        '<td class="so-largo c-setores"><span class="setores">' + sets + '</span></td><td class="c-pneu">' + pn + '</td>' +
        '<td class="num so-largo c-voltas">' + (p.voltas || '–') + '</td>' +
        '<td class="num so-largo c-intervalo">' + (p.pos === 1 ? '–' : num(p.intervalo)) + '</td>' +
        '<td class="num c-melhor' + (p.recorde ? ' recorde' : '') + '">' + esc(p.melhor_txt || '–') + '</td><td class="num c-gap">' + gap + '</td></tr>';
    }).join('');
  }

  /* ---------- mapa ---------- */
  var caixaMapa = null;
  function desenhaMapa() {
    var pista = dados.pista || {}, tr = pista.tracado || [], svg = $('[data-mapa]');
    if (tr.length < 10) { $('[data-bloco-mapa]').hidden = true; return; }
    $('[data-bloco-mapa]').hidden = false;
    if (!caixaMapa || caixaMapa.n !== tr.length) {
      var xs = tr.map(function (p) { return p[0]; }), ys = tr.map(function (p) { return p[1]; });
      var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs), miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
      var esc_ = Math.min(940 / (maxx - minx || 1), 640 / (maxy - miny || 1));
      caixaMapa = { n: tr.length, f: function (x, y) { return [30 + (x - minx) * esc_ + (940 - (maxx - minx) * esc_) / 2, 670 - (y - miny) * esc_ - (640 - (maxy - miny) * esc_) / 2]; } };
      var d = tr.map(function (p, i) { var q = caixaMapa.f(p[0], p[1]); return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' ') + ' Z';
      svg.innerHTML = '<path d="' + d + '" fill="none" style="stroke:var(--pista)" stroke-width="22" stroke-linejoin="round"></path>' +
        '<path d="' + d + '" fill="none" style="stroke:var(--pista-traco)" stroke-width="2" stroke-dasharray="2 10" stroke-linecap="round"></path><g data-carros></g>';
    }
    // cada carro é um elemento fixo que desliza até a posição nova (em vez de pular a cada atualização)
    var g = svg.querySelector('[data-carros]'), vistosCarro = {};
    (pista.carros || []).forEach(function (c) {
      var q = caixaMapa.f(c.x, c.y), el = g.querySelector('[data-carro="' + c.sigla + '"]');
      vistosCarro[c.sigla] = true;
      if (!el) {
        el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        el.setAttribute('data-carro', c.sigla);
        el.setAttribute('class', 'av-carro');
        el.innerHTML = '<circle r="13" fill="' + esc(c.cor) + '" style="stroke:var(--cartao)" stroke-width="3"></circle>' +
          '<text y="-20" text-anchor="middle" font-size="20" font-weight="700" style="fill:var(--texto)" font-family="Arial, sans-serif">' + esc(c.sigla) + '</text>';
        el.style.transform = 'translate(' + q[0].toFixed(1) + 'px,' + q[1].toFixed(1) + 'px)';
        g.appendChild(el);
      } else {
        el.style.transform = 'translate(' + q[0].toFixed(1) + 'px,' + q[1].toFixed(1) + 'px)';
      }
    });
    Array.prototype.forEach.call(g.querySelectorAll('[data-carro]'), function (el) { if (!vistosCarro[el.getAttribute('data-carro')]) el.remove(); });
  }

  /* ---------- ritmo ---------- */
  function desenhaRitmo() {
    var series = (dados.ritmo || []).filter(function (s) { return s.voltas && s.voltas.length > 1; });
    $('[data-bloco-ritmo]').hidden = !series.length;
    if (!series.length) return;
    var todos = [].concat.apply([], series.map(function (s) { return s.voltas; })).sort(function (a, b) { return a - b; });
    var lo = todos[0], hi = todos[Math.floor(todos.length * 0.9)] || todos[todos.length - 1];  // corta volta lenta (tráfego, box)
    if (hi - lo < 0.5) hi = lo + 0.5;
    function y(v) { return 15 + Math.min(1, (v - lo) / (hi - lo)) * 130; }
    var linhas = series.map(function (s) {
      var passo = 500 / Math.max(1, s.voltas.length - 1);
      return '<polyline fill="none" stroke="' + esc(s.cor) + '" stroke-width="2.5" stroke-linejoin="round" points="' +
        s.voltas.map(function (v, i) { return (20 + i * passo).toFixed(0) + ',' + y(v).toFixed(0); }).join(' ') + '"></polyline>';
    }).join('');
    function fmt(v) { var m = Math.floor(v / 60); return m + ':' + (v - m * 60).toFixed(1).padStart(4, '0'); }
    $('[data-ritmo]').innerHTML = '<line x1="20" x2="520" y1="15" y2="15" style="stroke:var(--linha)"></line><line x1="20" x2="520" y1="145" y2="145" style="stroke:var(--linha)"></line>' + linhas +
      '<text x="520" y="12" text-anchor="end" font-size="11" style="fill:var(--fraco)">' + fmt(lo) + '</text><text x="520" y="162" text-anchor="end" font-size="11" style="fill:var(--fraco)">' + fmt(hi) + '</text>';
    $('[data-ritmo-legenda]').innerHTML = series.map(function (s) { return '<span><span class="s" style="background:' + esc(s.cor) + '"></span> ' + esc(s.nome) + '</span>'; }).join(' ');
  }

  /* ---------- box ---------- */
  function desenhaBox() {
    var itens = [];
    (dados.pits || []).forEach(function (p) {
      itens.push({ q: p.quando, h: '<b>' + esc(p.piloto) + '</b> no box' + (p.volta ? ' na volta ' + p.volta : '') +
        (p.parado ? ' <small>· ' + p.parado.toFixed(1) + 's parado</small>' : (p.pitlane ? ' <small>· ' + p.pitlane.toFixed(1) + 's no pit lane</small>' : '')) });
    });
    (dados.ultrapassagens || []).forEach(function (o) {
      itens.push({ q: o.quando, h: '<b>' + esc(o.quem) + '</b> passa <b>' + esc(o.em) + '</b>' + (o.posicao ? ' <small>· ' + o.posicao + 'º lugar</small>' : '') });
    });
    itens.sort(function (a, b) { return a.q < b.q ? 1 : -1; });
    $('[data-bloco-box]').hidden = !itens.length;
    $('[data-box]').innerHTML = itens.slice(0, 10).map(function (i) { return '<li>' + i.h + ' <small>' + hora(i.q) + '</small></li>'; }).join('');
  }

  /* ---------- briga pelo vice (o título já está decidido) ---------- */
  function desenhaVice() {
    var c = (dados.campeonato || []).filter(function (x) { return x.agora && x.agora >= 2 && x.agora <= 6; });
    $('[data-bloco-vice]').hidden = !c.length;
    if (!c.length) return;
    var vice = c.find(function (x) { return x.agora === 2; }) || c[0];
    $('[data-vice]').innerHTML = c.map(function (x) {
      var mud = x.antes && x.antes !== x.agora ? (x.antes > x.agora ? '<span class="sobe">▲ ' + (x.antes - x.agora) + '</span>' : '<span class="cai">▼ ' + (x.agora - x.antes) + '</span>') : '';
      var dif = x === vice ? 'vice agora' : (vice.pontos != null && x.pontos != null ? '−' + (vice.pontos - x.pontos) + ' pts' : '');
      return '<li class="' + (x === vice ? 'vice' : '') + '"><span class="p">' + x.agora + 'º</span><span class="c" style="background:' + esc(x.cor) + '"></span>' +
        '<span><b>' + esc(x.nome) + '</b> ' + mud + '<br><small>' + esc(dif) + '</small></span><b>' + (x.pontos != null ? x.pontos : '–') + '</b><small>pts</small></li>';
    }).join('');
  }

  /* ---------- estratégia de pneus ---------- */
  function desenhaEstrategia() {
    var e = (dados.estrategia || []).slice(0, 20), total = Math.max(dados.voltas_total || 1, 1);
    $('[data-bloco-estrategia]').hidden = !e.length;
    if (!e.length) return;
    $('[data-estrategia]').innerHTML = e.map(function (p) {
      return '<div class="linha"><span>' + esc(p.nome) + '</span><span class="barra">' + p.stints.map(function (st) {
        var n = Math.max(1, st.ate - st.de + 1);
        return '<span class="' + esc(st.composto) + '" style="width:' + (n / total * 100).toFixed(1) + '%" title="' + esc(st.composto) + ': voltas ' + st.de + ' a ' + st.ate + '">' + (n >= 3 ? esc(st.composto) : '') + '</span>';
      }).join('') + '</span></div>';
    }).join('');
  }

  /* ---------- posições volta a volta (corrida) ---------- */
  function desenhaPosicoes() {
    var ps = (dados.posicoes || []).slice(0, 10).filter(function (p) { return (p.serie || []).filter(Boolean).length > 1; });
    $('[data-bloco-posicoes]').hidden = !ps.length;
    if (!ps.length) return;
    var n = Math.max.apply(null, ps.map(function (p) { return p.serie.length; }));
    function x(i) { return 20 + i / Math.max(1, n - 1) * 440; }
    function y(pos) { return 15 + (pos - 1) * 14; }
    $('[data-posicoes]').innerHTML = ps.map(function (p) {
      var pts = p.serie.map(function (v, i) { return v ? x(i).toFixed(0) + ',' + y(v).toFixed(0) : null; }).filter(Boolean);
      var ult = p.serie[p.serie.length - 1];
      return '<polyline fill="none" stroke="' + esc(p.cor) + '" stroke-width="2" points="' + pts.join(' ') + '"></polyline>' +
        (ult ? '<text x="468" y="' + (y(ult) + 4) + '" font-size="11" style="fill:var(--texto)">' + esc(p.nome) + '</text>' : '');
    }).join('');
  }

  /* ---------- velocidade máxima ---------- */
  function desenhaVelocidade() {
    var v = dados.velocidades || [];
    $('[data-bloco-vel]').hidden = !v.length;
    if (!v.length) return;
    var max = v[0].kmh, min = v[v.length - 1].kmh - 5;
    $('[data-vel]').innerHTML = v.map(function (p) {
      return '<li><span>' + esc(p.nome) + '<span class="bar" style="display:block;background:' + esc(p.cor) + ';width:' + ((p.kmh - min) / (max - min) * 100).toFixed(0) + '%"></span></span><b>' + p.kmh + '</b></li>';
    }).join('');
  }

  function desenhaDados() {
    grade.classList.toggle('com-dados', !!dados.ativo);
    $('[data-abas]').hidden = !dados.ativo;
    $('[data-bloco-tabela]').hidden = !dados.ativo;
    if (!dados.ativo) { ['[data-bloco-mapa]', '[data-bloco-ritmo]', '[data-bloco-box]', '[data-bloco-vice]', '[data-bloco-estrategia]', '[data-bloco-posicoes]', '[data-bloco-vel]'].forEach(function (s) { $(s).hidden = true; }); return; }
    desenhaTabela(); desenhaMapa(); desenhaRitmo(); desenhaBox(); desenhaVice(); desenhaEstrategia(); desenhaPosicoes(); desenhaVelocidade();
  }

  // foto do card pro story: a do destaque na capa (com crédito), se tiver
  function buscaFotoDoCard() {
    var selo = document.querySelector('[data-aovivo-selo]'), comp = document.querySelector('.av-compartilhar-pagina');
    if (!selo || !selo.dataset.status || !comp) return;
    fetch(selo.dataset.status, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (s) {
      var dq = s && s.destaque;
      if (dq && dq.foto && comp.dataset.imagem !== dq.foto) {
        comp.dataset.imagem = dq.foto; comp.dataset.credito = dq.credito ? 'Foto: ' + dq.credito : '';
        comp.dispatchEvent(new Event('compartilhar:atualizou'));
      }
    }).catch(function () {});
  }
  buscaFotoDoCard();
  setInterval(function () { if (!document.hidden) buscaFotoDoCard(); }, 60000);

  async function buscaPosts() {
    try { posts = await (await fetch(window.AV_POSTS, { cache: 'no-store' })).json(); } catch (e) { /* tenta no próximo */ }
    desenhaTopo(); desenhaFeed(); primeira = false;
  }
  async function buscaDados() {
    if (!window.AV_DADOS) return;
    try { dados = await (await fetch(window.AV_DADOS, { cache: 'no-store' })).json(); } catch (e) { return; }
    detectaUltrapassagens();
    desenhaTopo(); desenhaDados(); desenhaFeed();
  }
  var botaoTema = $('[data-tema-botao]');
  function marcaTema() {
    var claro = main.dataset.tema === 'claro';
    botaoTema.setAttribute('aria-pressed', claro ? 'true' : 'false');
    $('[data-tema-txt]').textContent = claro ? 'Escuro' : 'Claro';
    botaoTema.setAttribute('aria-label', claro ? 'Mudar para o modo escuro' : 'Mudar para o modo claro');
  }
  botaoTema.addEventListener('click', function () {
    main.dataset.tema = main.dataset.tema === 'claro' ? 'escuro' : 'claro';
    try { localStorage.setItem('av-tema', main.dataset.tema); } catch (e) {}
    marcaTema();
  });
  marcaTema();
  main.dataset.aba = 'feed';
  Array.prototype.forEach.call(document.querySelectorAll('[data-aba-botao]'), function (b) {
    b.addEventListener('click', function () {
      main.dataset.aba = b.dataset.abaBotao;
      Array.prototype.forEach.call(document.querySelectorAll('[data-aba-botao]'), function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      abertaTabela = b.dataset.abaBotao === 'tabela';
      if (dados.ativo) desenhaTabela();
    });
  });
  $('[data-mais]').addEventListener('click', function () { $('[data-aba-botao="tabela"]').click(); });
  buscaPosts(); buscaDados();
  setInterval(function () { if (!document.hidden) buscaPosts(); }, 15000);
  setInterval(function () { if (!document.hidden && (dados.ativo || Math.random() < 0.2)) buscaDados(); }, 3000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { buscaPosts(); buscaDados(); } });
})();
