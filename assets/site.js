// 인쇄 버튼과 좁은 화면의 차례 접기만 한다. 외부 요청이나 브라우저 저장은 하지 않는다.
document.querySelectorAll("[data-print]").forEach(function (button) {
  button.addEventListener("click", function () { window.print(); });
});
// 좁은 화면에서는 옆 차례를 접어 본문이 먼저 보이게 한다.
if (window.matchMedia("(max-width: 980px)").matches) {
  document.querySelectorAll(".side details").forEach(function (d) { d.open = false; });
}
// 인쇄할 때는 접힌 참고문헌도 펼친다.
window.addEventListener("beforeprint", function () {
  document.querySelectorAll("details.refs").forEach(function (d) { d.dataset.wasOpen = d.open ? "1" : ""; d.open = true; });
});
window.addEventListener("afterprint", function () {
  document.querySelectorAll("details.refs").forEach(function (d) { d.open = d.dataset.wasOpen === "1"; });
});

// 대문 파형: 어둠 속에서 금빛 펜 끝이 SpO2(위)·CO2(아래) 파형을 왼쪽에서 오른쪽으로 훑으며 그리고,
// 지나간 자리는 천천히 식어 간다(잔광). 파형 모양은 멈춘 그림(SVG) 경로를 읽어 쓰므로 build_site.py 한 곳에서 정한다.
// 움직임을 줄이도록 설정한 기기에서는 시작하지 않고 멈춘 그림만 보인다. 외부 요청·저장은 없다.
(function () {
  var gate = document.querySelector(".gate");
  var canvas = gate && gate.querySelector(".wv-live");
  var band = gate && gate.querySelector(".wv");
  if (!canvas || !band || !canvas.getContext) return;
  // 사이트 안의 다른 쪽에서 돌아오면 첫 등장 연출은 생략한다.
  try {
    if (document.referrer && new URL(document.referrer).host === location.host) gate.classList.add("seen");
  } catch (e) { /* 주소를 읽지 못하면 연출을 그대로 둔다 */ }
  var still = band.querySelectorAll(".wv-still path");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (still.length < 2 || reduce.matches) return;

  var PULSE = +canvas.dataset.pulse, BREATH = +canvas.dataset.breath;
  var SPEED = 60.75;         // 단위/초. 이전 대문(8초 루프, 펜이 4.94초에 1200단위)의 1/4.
  var HEIGHT = 300;          // 두 파형이 차지하는 높이(단위, 위아래 여유 포함)

  // 한 주기를 1단위 간격의 높이표로 바꿔 둔다.
  function table(path, period) {
    var total = path.getTotalLength(), pts = [], t = [], i, j = 0, p;
    for (i = 0; i <= total; i += 0.5) {
      p = path.getPointAtLength(i);
      if (p.x > period + 1) break;
      pts.push(p);
    }
    for (i = 0; i <= period; i++) {
      while (j < pts.length - 2 && pts[j + 1].x < i) j++;
      var a = pts[j], b = pts[j + 1] || a, k = b.x > a.x ? (i - a.x) / (b.x - a.x) : 0;
      t.push(a.y + (b.y - a.y) * Math.min(1, Math.max(0, k)));
    }
    return t;
  }
  var waves;
  try {
    waves = [{ t: table(still[0], PULSE), n: PULSE }, { t: table(still[1], BREATH), n: BREATH }];
  } catch (e) { return; }
  function value(w, x) {
    var n = w.n, m = ((x % n) + n) % n, i = Math.floor(m), f = m - i;
    return w.t[i] + (w.t[Math.min(i + 1, n)] - w.t[i]) * f;
  }

  var ctx = canvas.getContext("2d");
  var W, H, dpr, bx, by, bw, bh, u, ys, top0, span;
  function measure() {
    var g = gate.getBoundingClientRect(), b = band.getBoundingClientRect();
    W = g.width; H = g.height;
    // 선명도는 2배까지, 캔버스 전체 픽셀은 약 300만 개까지만(큰 화면에서 그리기 비용을 묶어 둔다).
    dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3e6 / Math.max(1, W * H)));
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    bx = b.left - g.left; by = b.top - g.top; bw = b.width; bh = b.height;
    u = Math.max(0.633, bw / 1200);                 // 가로 배율(이전 대문과 같은 비율)
    ys = Math.min(bh / HEIGHT, Math.max(u, 0.78));  // 세로 배율
    top0 = by + (bh - HEIGHT * ys) / 2 + 30 * ys;
    span = bw / u;                                  // 화면에 들어가는 가로 단위
  }

  // 잔광: 펜 끝 가까이는 밝은 샴페인빛, 멀어질수록 짙은 금빛으로 식으며 어두워지다 지워진다.
  var HOT = [255, 240, 206], COOL = [160, 118, 54], STOPS = 28;
  function heat(d, reach) {
    var r = reach > 0 ? Math.min(1, d / reach) : 1;
    return Math.min(1, Math.exp(-d / 90) * 0.8 + 0.42 * Math.pow(1 - r, 1.15)) * Math.min(1, (1 - r) * 5);
  }
  // 펜에서 d0~d1만큼 뒤의 구간(화면 x0~x1, x0이 펜 쪽)을 칠할 가로 그라데이션
  function trail(x0, x1, d0, d1, reach, fade) {
    var g = ctx.createLinearGradient(x0, 0, x1, 0);
    for (var i = 0; i <= STOPS; i++) {
      var f = i / STOPS, a = heat(d0 + (d1 - d0) * f, reach) * fade, c = Math.pow(a, 1.3);
      g.addColorStop(f, "rgba(" + [0, 1, 2].map(function (k) { return Math.round(COOL[k] + (HOT[k] - COOL[k]) * c); }).join(",") + "," + a.toFixed(3) + ")");
    }
    return g;
  }

  function glow(x, y, r, rgb, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(" + rgb + "," + a + ")");
    g.addColorStop(1, "rgba(" + rgb + ",0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function draw(X, drawn, fade) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    var pos = ((X % span) + span) % span, head = pos * u + bx;
    var reach = Math.min(span * 0.9, drawn), wrap = Math.min(pos, reach), step = 2 / u;
    // 화면 왼쪽 끝에서 끊긴다: A는 펜에서 왼쪽 끝까지, B는 오른쪽 끝에서 이어지는 나머지.
    var A = new Path2D(), B = new Path2D(), heads = [], w, d;
    for (w = 0; w < 2; w++) {
      var wave = waves[w];
      heads.push(top0 + value(wave, X) * ys);
      A.moveTo(head, heads[w]);
      for (d = step; d < wrap + step; d += step) {
        var dd = Math.min(d, wrap);
        A.lineTo(head - dd * u, top0 + value(wave, X - dd) * ys);
      }
      if (reach > wrap) {
        B.moveTo(bx + span * u, top0 + value(wave, X - wrap) * ys);
        for (d = wrap + step; d < reach + step; d += step) {
          var de = Math.min(d, reach);
          B.lineTo(bx + (span - (de - wrap)) * u, top0 + value(wave, X - de) * ys);
        }
      }
    }
    var gA = trail(head, bx, 0, pos, reach, fade);
    var gB = reach > wrap ? trail(bx + span * u, bx + (span - (reach - wrap)) * u, wrap, reach, reach, fade) : null;
    // 세 겹으로 그려 빛이 번지게 한다: 넓고 옅은 빛무리, 중간 빛, 가늘고 밝은 심지.
    var passes = [[7, 0.08], [2.8, 0.24], [1.15, 0.95]];
    for (var i = 0; i < passes.length; i++) {
      ctx.lineWidth = passes[i][0]; ctx.globalAlpha = passes[i][1];
      ctx.strokeStyle = gA; ctx.stroke(A);
      if (gB) { ctx.strokeStyle = gB; ctx.stroke(B); }
    }
    ctx.globalAlpha = 1;
    // 펜 끝: 작고 밝은 광원. 날숨(CO2가 오를 때)에는 주변 빛이 아주 조금 밝아진다.
    var breath = 1 - (value(waves[1], X) - 130) / 110;
    glow(head, (heads[0] + heads[1]) / 2, Math.max(bh, 260) * 0.95, "214,176,106", (0.035 + 0.03 * breath) * fade);
    for (w = 0; w < 2; w++) {
      glow(head, heads[w], 34, "226,190,120", 0.16 * fade);
      glow(head, heads[w], 9, "255,236,196", 0.55 * fade);
      glow(head, heads[w], 2.6, "255,250,238", 0.95 * fade);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  var running = false, visible = true, last = 0, shown = 0, t = 0, intro = !gate.classList.contains("seen");
  var lead = 0, offset = 0;
  function pen(time) {
    // 첫 등장: 펜이 처음 1~2초는 빠르게 어둠을 가르며 나아가다 평소 속도로 가라앉는다.
    return SPEED * time + (intro ? lead * (1 - Math.exp(-time / 0.7)) : 0) + offset;
  }
  function paint() {
    var X = pen(t), fade = intro ? Math.min(1, t / 0.6) : 1;
    draw(X, intro ? X : Infinity, fade * (2 - fade));
  }
  // 그리다 실패하면(크기 0, 지원하지 않는 기능 등) 멈추고 정지 그림으로 되돌린다.
  function fail() { running = false; gate.classList.remove("live"); }
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (shown && now - shown < 15) return;   // 120Hz 화면에서도 초당 60번까지만 그린다
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now; shown = now; t += dt;
    if (W < 2 || H < 2) return;
    try { paint(); } catch (e) { fail(); }
  }
  function start() {
    if (running || !visible || reduce.matches || !gate.classList.contains("live")) return;
    running = true; last = 0; shown = 0;
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  try {
    measure();
    lead = 0.32 * span; offset = intro ? 0 : 0.6 * span;   // 돌아온 경우에는 이미 그려진 상태에서 시작
    paint();
    gate.classList.add("live");   // 첫 그림이 성공한 뒤에야 정지 그림을 숨긴다
  } catch (e) { fail(); return; }
  start();
  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      try { measure(); if (!running && gate.classList.contains("live")) paint(); } catch (e) { fail(); }
    }).observe(gate);
  } else window.addEventListener("resize", measure);
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      visible = es[es.length - 1].isIntersecting;
      if (visible) start(); else stop();
    }).observe(gate);
  }
  var onReduce = function () {
    if (reduce.matches) { stop(); gate.classList.remove("live"); } else { gate.classList.add("live"); start(); }
  };
  if (reduce.addEventListener) reduce.addEventListener("change", onReduce);
  else if (reduce.addListener) reduce.addListener(onReduce);
})();
