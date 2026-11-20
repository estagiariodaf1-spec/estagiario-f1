/* Ao vivo do Estagiário: junta o minuto a minuto (posts do Pedro) com os dados de pista do OpenF1 que o robô serve. */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var grade = $('.av-grade'), lista = $('[data-lista]'), vazio = $('[data-vazio]');
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

  /* ---------- minuto a minuto ---------- */
  function itensFeed() {
    var itens = (posts.entradas || []).map(function (e) {
      var rot = { destaque: 'Estagiário', bandeira: 'Bandeira', abertura: 'Começou', encerramento: 'Encerrado' }[e.tipo] || 'Estagiário';
      return { id: 'p' + e.id, quando: e.quando, classe: 'tipo-' + e.tipo, html: '<span class="rot">' + rot + '</span>' + formata(e.texto) };
    });
    if (dados.ativo) {
      (dados.direcao || []).forEach(function (m) {
        if (!m.texto || /BLUE FLAG/.test(m.texto)) return;  // bandeira azul vira spam na corrida
        var tp = tipoOficial(m);
        itens.push({ id: 'd' + m.quando + m.texto, quando: m.quando, classe: 'oficial ' + tp[0],
          html: '<span class="rot">' + tp[1] + '</span>' + esc(m.texto_pt || traduz(m.texto)) });
      });
      (dados.radio || []).forEach(function (r) {
        itens.push({ id: 'r' + r.quando + r.piloto, quando: r.quando, classe: 'radio',
          html: '<span class="rot">Rádio · ' + esc(r.piloto) + '</span>' + (r.audio ? '<audio controls preload="none" src="' + esc(r.audio) + '"></audio>' : '') });
      });
    }
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
      if (li && li.dataset.html !== i.html) { li.querySelector('div').innerHTML = i.html; li.dataset.html = i.html; }
      if (!li) {
        li = document.createElement('li');
        li.dataset.html = i.html;
        li.dataset.id = i.id;
        li.className = i.classe + (primeira || vistos[i.id] ? '' : ' nova');
        li.innerHTML = '<time>' + hora(i.quando) + '</time><div>' + i.html + '</div>';
        vistos[i.id] = true;
      }
      if (anterior) { if (anterior.nextSibling !== li) lista.insertBefore(li, anterior.nextSibling); }
      else if (lista.firstChild !== li) lista.insertBefore(li, lista.firstChild);
      anterior = li;
    });
    vazio.hidden = itens.length > 0 || posts.ativo || dados.ativo;
    $('[data-feed-sub]').textContent = dados.ativo ? 'Estagiário, direção e rádio' : 'Estagiário';
  }

  /* ---------- cabeçalho ---------- */
  function desenhaTopo() {
    var vivo = posts.ativo || dados.ativo, st = $('[data-av-status]');
    st.textContent = vivo ? 'AO VIVO' : (posts.titulo ? 'Encerrado' : 'Fora do ar');
    st.className = 'aovivo-status' + (vivo ? ' no-ar' : '');
    var titulo = posts.ativo && posts.titulo ? posts.titulo : (dados.ativo ? dados.sessao : (posts.titulo || 'Ao vivo do Estagiário'));
    $('[data-titulo]').textContent = titulo;
    document.title = (vivo ? '🔴 ' : '') + titulo + ' · Estagiário da F1';
    var band = $('[data-bandeira]');
    band.hidden = !dados.ativo;
    $('[data-numeros]').hidden = !dados.ativo;
    $('[data-reprise]').hidden = !(dados.ativo && dados.modo === 'reprise');
    $('[data-circuito]').textContent = dados.ativo ? (dados.circuito || '') : '';
    if (!dados.ativo) return;
    var b = dados.bandeira || 'GREEN';
    band.className = 'av-bandeira ' + ({ GREEN: 'verde', CLEAR: 'verde', YELLOW: 'amarela', 'DOUBLE YELLOW': 'amarela', RED: 'vermelha', SC: 'sc', CHEQUERED: 'quadriculada' }[b] || 'verde');
    band.textContent = 'Bandeira ' + (dados.bandeira_txt || 'verde');
    if (b === 'SC') band.textContent = 'Safety car';
    var f = dados.faltam;
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
    $('[data-tabela-sub]').textContent = corrida ? 'Posição na corrida' : 'Pela melhor volta';
    $('[data-linhas]').innerHTML = mostrar.map(function (p) {
      var sets = (p.setores || []).map(function (s, i) { return '<span class="s ' + (s.cor || '') + '" title="Setor ' + (i + 1) + (s.tempo ? ': ' + s.tempo.toFixed(3) : '') + '"></span>'; }).join('');
      var pn = p.pneu ? '<span class="pneu"><i class="' + esc(p.pneu.composto) + '">' + esc(p.pneu.composto) + '</i>' + p.pneu.voltas + 'v</span>' : '';
      var br = ehBR(p) ? '<span class="tag-br">BR</span>' : '';
      var box = p.no_box ? '<span class="tag-box">BOX</span>' : '';
      var gap = p.pos === 1 ? (corrida ? 'Líder' : '–') : num(p.gap);
      return '<tr class="' + (ehBR(p) ? 'br' : '') + '"><td class="pos">' + p.pos + '</td><td class="cor"><span style="background:' + esc(p.cor) + '"></span></td>' +
        '<td class="piloto"><b>' + esc(p.nome) + br + box + '</b><small>' + esc(p.equipe || '') + '</small></td>' +
        '<td class="so-largo"><span class="setores">' + sets + '</span></td><td>' + pn + '</td>' +
        '<td class="num so-largo">' + (p.pos === 1 ? '–' : num(p.intervalo)) + '</td>' +
        '<td class="num' + (p.recorde ? ' recorde' : '') + '">' + esc(p.melhor_txt || '–') + '</td><td class="num">' + gap + '</td></tr>';
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
      svg.innerHTML = '<path d="' + d + '" fill="none" stroke="#2c2c2c" stroke-width="22" stroke-linejoin="round"></path>' +
        '<path d="' + d + '" fill="none" stroke="#555" stroke-width="2" stroke-dasharray="2 10" stroke-linecap="round"></path><g data-carros></g>';
    }
    var g = svg.querySelector('[data-carros]');
    g.innerHTML = (pista.carros || []).map(function (c) {
      var q = caixaMapa.f(c.x, c.y);
      return '<g transform="translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')"><circle r="13" fill="' + esc(c.cor) + '" stroke="#050505" stroke-width="3"></circle>' +
        '<text y="-20" text-anchor="middle" font-size="20" font-weight="700" fill="#fff" font-family="Arial, sans-serif">' + esc(c.sigla) + '</text></g>';
    }).join('');
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
    $('[data-ritmo]').innerHTML = '<line x1="20" x2="520" y1="15" y2="15" stroke="#1c1c1c"></line><line x1="20" x2="520" y1="145" y2="145" stroke="#1c1c1c"></line>' + linhas +
      '<text x="520" y="12" text-anchor="end" font-size="11" fill="#8a8a8a">' + fmt(lo) + '</text><text x="520" y="162" text-anchor="end" font-size="11" fill="#8a8a8a">' + fmt(hi) + '</text>';
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

  function desenhaDados() {
    grade.classList.toggle('com-dados', !!dados.ativo);
    $('[data-abas]').hidden = !dados.ativo;
    $('[data-bloco-tabela]').hidden = !dados.ativo;
    if (!dados.ativo) { ['[data-bloco-mapa]', '[data-bloco-ritmo]', '[data-bloco-box]'].forEach(function (s) { $(s).hidden = true; }); return; }
    desenhaTabela(); desenhaMapa(); desenhaRitmo(); desenhaBox();
  }

  async function buscaPosts() {
    try { posts = await (await fetch(window.AV_POSTS, { cache: 'no-store' })).json(); } catch (e) { /* tenta no próximo */ }
    desenhaTopo(); desenhaFeed(); primeira = false;
  }
  async function buscaDados() {
    if (!window.AV_DADOS) return;
    try { dados = await (await fetch(window.AV_DADOS, { cache: 'no-store' })).json(); } catch (e) { return; }
    desenhaTopo(); desenhaDados(); desenhaFeed();
  }
  var main = $('[data-av]');
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
