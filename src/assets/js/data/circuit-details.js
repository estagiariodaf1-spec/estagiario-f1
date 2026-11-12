(function (global) {
  'use strict';

  // Ficha dos circuitos (o que a base de resultados não entrega). Chave = circuitId da base.
  // Só entra dado conferido: campo sem valor simplesmente não aparece na página.
  // Recorde e distância seguem as fichas das artes do robô (redacao/design.py, FICHAS).
  function f(extensao, voltas, extra) { return Object.assign({ lengthKm: extensao, laps: voltas }, extra || {}); }

  global.F1CircuitDetails = {
    albert_park: f('5,278 km', 58),
    shanghai: f('5,451 km', 56),
    suzuka: f('5,807 km', 53),
    bahrain: f('5,412 km', 57),
    jeddah: f('6,174 km', 50),
    miami: f('5,412 km', 57),
    villeneuve: f('4,361 km', 70),
    monaco: f('3,337 km', 78),
    catalunya: f('4,657 km', 66),
    red_bull_ring: f('4,318 km', 71),
    silverstone: f('5,891 km', 52),
    spa: f('7,004 km', 44),
    hungaroring: f('4,381 km', 70),
    zandvoort: f('4,259 km', 72),
    monza: f('5,793 km', 53),
    imola: f('4,909 km', 63),
    baku: f('6,003 km', 51),
    marina_bay: f('4,940 km', 62),
    americas: f('5,513 km', 56),
    rodriguez: f('4,304 km', 71),
    interlagos: f('4,309 km', 71, { raceDistance: '305,879 km', firstGp: '1973', lapRecord: '1:10.540 (Valtteri Bottas, 2018)' }),
    vegas: f('6,201 km', 50, { raceDistance: '309,958 km', firstGp: '2023', lapRecord: '1:33.365 (Max Verstappen, 2025)' }),
    losail: f('5,419 km', 57, { raceDistance: '308,611 km', firstGp: '2021', lapRecord: '1:22.384 (Lando Norris, 2024)' }),
    yas_marina: f('5,281 km', 58, { raceDistance: '306,183 km', firstGp: '2009' })
  };
})(window);
