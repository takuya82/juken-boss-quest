"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("app");
  if (el) {
    el.dataset.ready = "true";
  }
  console.log("Hello Codex!");

  // Toggle heading color with ARIA state and keyboard support
  const heading = document.querySelector("h1");
  const btn = document.getElementById("toggle-color");
  if (heading && btn) {
    const setPressed = (pressed) => {
      btn.setAttribute("aria-pressed", String(pressed));
      heading.classList.toggle("alt", pressed);
    };
    // Initialize consistent state based on aria-pressed
    setPressed(btn.getAttribute("aria-pressed") === "true");

    const toggle = () => {
      const next = btn.getAttribute("aria-pressed") !== "true";
      setPressed(next);
    };
    btn.addEventListener("click", toggle);
    btn.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggle();
      }
    });
  }
});
