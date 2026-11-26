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

// 체크리스트: 근거 표시 켜기·끄기 단추. 인쇄할 때는 모두 펼치고 근거도 보인다.
(function () {
  var art = document.querySelector(".article.checklist"), b = document.querySelector("[data-evtoggle]");
  if (!art || !b) return;
  b.addEventListener("click", function () {
    var off = art.classList.toggle("ev-off");
    b.textContent = off ? "근거 표시 켜기" : "근거 표시 끄기";
  });
  window.addEventListener("beforeprint", function () {
    document.querySelectorAll("details.more,details.sec").forEach(function (d) { d.dataset.w = d.open ? "1" : ""; d.open = true; });
    art.dataset.wasoff = art.classList.contains("ev-off") ? "1" : "";
    art.classList.remove("ev-off");
  });
  window.addEventListener("afterprint", function () {
    document.querySelectorAll("details.more,details.sec").forEach(function (d) { d.open = d.dataset.w === "1"; });
    if (art.dataset.wasoff === "1") art.classList.add("ev-off");
  });
})();

// 강의 영상: 재생 단추나 차례의 시간을 누를 때에만 플레이어를 넣는다(그 전에는 외부 요청 없음).
// 차례의 시간은 data-start(초)를 embed 주소의 start로 넘겨 그 시각부터 재생한다. 링크라서 키보드(Enter)로도 누를 수 있다.
function playLecture(box, start) {
  var a = box.querySelector("a[data-embed]"), f = box.querySelector("iframe");
  var base = a ? a.getAttribute("data-embed") : box.getAttribute("data-embed");
  var src = base + (start ? "&start=" + start : "");
  if (!f) {
    box.setAttribute("data-embed", base);
    f = document.createElement("iframe");
    f.title = a.getAttribute("data-title");
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    f.allowFullscreen = true;
    f.referrerPolicy = "strict-origin-when-cross-origin";
    f.src = src;
    a.replaceWith(f);
  } else {
    f.src = src;
  }
  return f;
}
document.querySelectorAll(".video a[data-embed]").forEach(function (a) {
  var box = a.parentNode;
  a.addEventListener("click", function (e) {
    e.preventDefault();
    playLecture(box, 0);
  });
});
document.querySelectorAll(".chap a[data-start]").forEach(function (a) {
  var box = document.querySelector(".lmain .video");
  if (!box) return;
  a.addEventListener("click", function (e) {
    e.preventDefault();
    var f = playLecture(box, parseInt(a.getAttribute("data-start"), 10) || 0);
    box.scrollIntoView({ block: "nearest", behavior: "smooth" });
    f.focus();
    document.querySelectorAll(".chap a[aria-current]").forEach(function (x) { x.removeAttribute("aria-current"); });
    a.setAttribute("aria-current", "true");
  });
});
