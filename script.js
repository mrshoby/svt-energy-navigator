(() => {
  const root = document.querySelector("[data-carousel]");
  if (!root) return;

  const slides = Array.from(root.querySelectorAll("[data-slide]"));
  const indicators = Array.from(document.querySelectorAll(".carousel-indicators span"));
  const intervalMs = 10000;
  let index = 0;
  let timer = null;

  function showSlide(nextIndex) {
    index = nextIndex % slides.length;

    slides.forEach((slide, i) => {
      const isActive = i === index;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
    });

    indicators.forEach((indicator, i) => {
      indicator.classList.toggle("is-active", i === index);
    });
  }

  function start() {
    stop();
    timer = window.setInterval(() => {
      showSlide(index + 1);
    }, intervalMs);
  }

  function stop() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  showSlide(0);
  start();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
})();



// Tutorial video modal
(() => {
  const modal = document.querySelector("[data-video-modal]");
  const openButton = document.querySelector("[data-open-video]");
  const closeButtons = document.querySelectorAll("[data-close-video]");
  const player = modal ? modal.querySelector("video") : null;

  if (!modal || !openButton) return;

  function openModal() {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (player) {
      player.pause();
      try { player.currentTime = 0; } catch (e) {}
    }
  }

  openButton.addEventListener("click", openModal);
  closeButtons.forEach((btn) => btn.addEventListener("click", closeModal));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });
})();



// v25 video library switching
(function () {
  const menuItems = document.querySelectorAll(".tutorial-video-menu-item");
  const player = document.querySelector(".tutorial-video-player");
  const currentTitle = document.getElementById("tutorialCurrentTitle");
  const currentDesc = document.getElementById("tutorialCurrentDesc");

  if (!menuItems.length || !player) return;

  menuItems.forEach((item) => {
    item.addEventListener("click", () => {
      menuItems.forEach((btn) => btn.classList.remove("is-active"));
      item.classList.add("is-active");

      const title = item.dataset.videoTitle || "Video";
      const desc = item.dataset.videoDesc || "";
      const src = item.dataset.videoSrc || "";

      if (currentTitle) currentTitle.textContent = title;
      if (currentDesc) currentDesc.textContent = desc;

      if (!src) {
        player.pause();
        alert("Acest video va fi adăugat în următoarea versiune.");
        return;
      }

      const source = player.querySelector("source");
      if (source && source.getAttribute("src") !== src) {
        source.setAttribute("src", src);
        player.load();
      }
    });
  });
})();



// v27 safety: keep player in right stage and avoid layout jumps
(function () {
  const modal = document.querySelector(".video-modal-card");
  const layout = document.querySelector(".tutorial-library-layout");
  const menu = document.querySelector(".tutorial-video-menu");
  const stage = document.querySelector(".tutorial-video-stage");
  if (!modal || !layout || !menu || !stage) return;
  layout.style.display = "grid";
})();



// v28 trial page card selection
(function () {
  const card = document.getElementById("selectedQuestionCard");
  const buttons = document.querySelectorAll("[data-focus-card]");
  if (!card || !buttons.length) return;

  const content = {
    costuri: {
      title: "Vreau să aflu unde consum energie scumpă.",
      text: "Vom identifica orele cu cost mare din rețea și ce ai putea face mâine pentru reducerea costului."
    },
    pv: {
      title: "Vreau să văd dacă folosesc bine energia produsă local.",
      text: "Vom compara producția locală estimată cu profilul de consum și vom arăta energia care poate fi valorificată util."
    },
    flex: {
      title: "Vreau să aflu ce consumuri pot muta în timp.",
      text: "Vom căuta consumurile flexibile și intervalele în care mutarea lor poate aduce economie fără să afecteze procesul."
    },
    investitii: {
      title: "Vreau să compar investiții energetice.",
      text: "Vom estima impactul pentru BESS, pompă de căldură, boiler, puffer, cogenerare sau o investiție integrată."
    }
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.focusCard;
      const selected = content[key];
      if (!selected) return;
      card.querySelector("h3").textContent = selected.title;
      card.querySelector("p").textContent = selected.text;
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
})();
