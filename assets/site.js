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
