// Admin tweaks on top of Unfold (loaded through UNFOLD["SCRIPTS"]).
//
// Sidebar tooltips: when the sidebar is folded into the icon rail (templates/admin/nav_sidebar.html), hovering or
// focusing an icon shows its name beside the rail. The tooltip is attached to <body>, so the narrow rail can't clip it.
document.addEventListener("DOMContentLoaded", () => {
  const tip = document.createElement("div");
  tip.className = "ns-tooltip";
  tip.setAttribute("role", "tooltip");
  document.body.appendChild(tip);

  const railIsFolded = () => Boolean(document.querySelector(".ns-mini"));
  const nameOf = (link) =>
    (link.querySelector("span:not(.material-symbols-outlined)")?.textContent || "").trim();

  const show = (link) => {
    const name = nameOf(link);
    if (!railIsFolded() || !name) return;
    const box = link.getBoundingClientRect();
    tip.textContent = name;
    tip.style.top = `${box.top + box.height / 2}px`;
    tip.style.left = `${box.right + 10}px`;
    tip.classList.add("ns-tooltip-on");
  };
  const hide = () => tip.classList.remove("ns-tooltip-on");

  document.querySelectorAll("#nav-sidebar-apps a, #nav-sidebar-inner .mt-auto > a").forEach((link) => {
    link.setAttribute("aria-label", nameOf(link)); // screen readers still hear the name in the rail
    link.addEventListener("mouseenter", () => show(link));
    link.addEventListener("focus", () => show(link));
    link.addEventListener("mouseleave", hide);
    link.addEventListener("blur", hide);
  });
  document.getElementById("nav-sidebar-apps")?.addEventListener("scroll", hide);
});
