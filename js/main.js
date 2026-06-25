const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");
const siteHeader = document.querySelector(".site-header");
const navLinks = document.querySelectorAll("[data-nav]");
const sectionIds = ["accueil", "fonctionnalites", "apercu", "ecoles", "parents", "repetiteurs", "version", "contact"];

// Ombre du header au défilement
if (siteHeader) {
  const onScroll = () => {
    siteHeader.classList.toggle("scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// Animations d'apparition au défilement
const revealEls = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (revealEls.length && !prefersReducedMotion && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

function trackEvent(eventName) {
  if (typeof window.gtag === "function" && eventName) {
    window.gtag("event", eventName);
  }
}

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    document.body.classList.toggle("menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      siteNav.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const trackedElement = event.target.closest("[data-event]");
  if (trackedElement) {
    trackEvent(trackedElement.dataset.event);
  }
});

// Navigation active au scroll
if (navLinks.length) {
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const setActiveNav = () => {
    const offset = 120;
    let current = sectionIds[0];

    sections.forEach((section) => {
      if (section && window.scrollY >= section.offsetTop - offset) {
        current = section.id;
      }
    });

    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      link.classList.toggle("is-active", href === `#${current}`);
    });
  };

  window.addEventListener("scroll", setActiveNav, { passive: true });
  setActiveNav();
}

if (contactForm && formStatus) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    trackEvent("submit_contact_form");

    formStatus.textContent = "";
    formStatus.className = "form-status";

    const formAction = contactForm.getAttribute("action") || "";

    if (formAction.includes("FORM_ID")) {
      formStatus.textContent = "Le formulaire est prêt. Remplacez FORM_ID par l’identifiant Formspree pour recevoir les demandes.";
      formStatus.classList.add("error");
      return;
    }

    try {
      const response = await fetch(formAction, {
        method: "POST",
        body: new FormData(contactForm),
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error("Form submission failed");
      }

      contactForm.reset();
      formStatus.textContent = "Merci. Votre demande a bien été envoyée. L’équipe WalahaTracker vous contactera bientôt.";
      formStatus.classList.add("success");
    } catch (error) {
      formStatus.textContent = "Une erreur est survenue. Veuillez réessayer ou nous contacter directement sur WhatsApp.";
      formStatus.classList.add("error");
    }
  });
}

// Vitrine interactive des captures d'écran
const showcaseShot = document.getElementById("showcaseShot");
const showcaseSource = document.getElementById("showcaseSource");
const showcaseCaption = document.getElementById("showcaseCaption");
const showcaseTriggers = document.querySelectorAll("[data-showcase]");

function pngToWebp(src) {
  return src.replace(/\.png$/i, ".webp");
}

function setShowcaseScreen(trigger, scrollToShowcase = false) {
  if (!showcaseShot || !trigger) return;

  const { src, alt, caption } = trigger.dataset;
  if (!src) return;

  if (scrollToShowcase) {
    const section = document.getElementById("apercu");
    if (section) {
      section.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    }
  }

  if (showcaseShot.getAttribute("src") !== src) {
    showcaseShot.classList.add("is-fading");

    window.setTimeout(() => {
      showcaseShot.setAttribute("src", src);
      if (alt) showcaseShot.setAttribute("alt", alt);
      if (showcaseSource) showcaseSource.setAttribute("srcset", pngToWebp(src));
      showcaseShot.classList.remove("is-fading");
    }, 180);
  }

  if (showcaseCaption && caption) {
    showcaseCaption.textContent = caption;
  }

  showcaseTriggers.forEach((el) => {
    const isMatch = el.dataset.src === src;
    el.classList.toggle("is-active", isMatch);
    if (el.matches('[role="tab"]')) {
      el.setAttribute("aria-selected", String(isMatch));
    }
  });
}

if (showcaseShot && showcaseTriggers.length) {
  showcaseTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => setShowcaseScreen(trigger));
  });
}

// Lien fonctionnalités → vitrine
document.querySelectorAll("[data-feature-showcase]").forEach((card) => {
  card.addEventListener("click", () => {
    const src = card.dataset.featureShowcase;
    const caption = card.dataset.featureCaption || "";
    const match = Array.from(showcaseTriggers).find((el) => el.dataset.src === src);

    if (match) {
      setShowcaseScreen(match, true);
      return;
    }

    if (showcaseShot && src) {
      setShowcaseScreen(
        { dataset: { src, alt: caption, caption } },
        true
      );
    }
  });
});
