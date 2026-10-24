document.documentElement.dataset.page = "home";

const searchButton = document.querySelector(".search-button");
const signupForm = document.querySelector("#signup-form");
const formStatus = document.querySelector("#form-status");

const heroCarousel = document.querySelector("#hero-carousel");

if (heroCarousel) {
  const slides = Array.from(heroCarousel.querySelectorAll(".hero-slide"));
  const paginationButtons = Array.from(heroCarousel.querySelectorAll(".hero-pagination button"));
  const slidesContainer = heroCarousel.querySelector(".hero-slides");
  const previousButton = heroCarousel.querySelector(".hero-previous");
  const nextButton = heroCarousel.querySelector(".hero-next");
  let activeSlide = slides.findIndex((slide) => slide.classList.contains("is-active"));
  let autoplayTimer;
  let isHovered = false;
  let hasFocus = false;

  if (activeSlide < 0) activeSlide = 0;

  const setActiveSlide = (index) => {
    activeSlide = (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeSlide;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
      slide.toggleAttribute("inert", !isActive);
    });

    paginationButtons.forEach((button, buttonIndex) => {
      button.setAttribute("aria-pressed", String(buttonIndex === activeSlide));
    });
  };

  const showSlide = (index) => {
    setActiveSlide(index);
    slidesContainer?.scrollTo({
      left: activeSlide * slidesContainer.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  slidesContainer?.addEventListener("scroll", () => {
    const slideWidth = slidesContainer.clientWidth;
    if (slideWidth > 0) {
      setActiveSlide(Math.round(slidesContainer.scrollLeft / slideWidth));
    }
  });

  setActiveSlide(activeSlide);

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const startAutoplay = () => {
    if (prefersReducedMotion.matches || autoplayTimer || slides.length < 2 || isHovered || hasFocus) return;
    autoplayTimer = window.setInterval(() => showSlide(activeSlide + 1), 5000);
  };
  const stopAutoplay = () => {
    window.clearInterval(autoplayTimer);
    autoplayTimer = undefined;
  };
  const navigateToSlide = (index) => {
    showSlide(index);
    stopAutoplay();
    startAutoplay();
  };

  previousButton?.addEventListener("click", () => navigateToSlide(activeSlide - 1));
  nextButton?.addEventListener("click", () => navigateToSlide(activeSlide + 1));

  paginationButtons.forEach((button, index) => {
    button.addEventListener("click", () => navigateToSlide(index));
  });

  heroCarousel.addEventListener("pointerenter", () => {
    isHovered = true;
    stopAutoplay();
  });
  heroCarousel.addEventListener("pointerleave", () => {
    isHovered = false;
    startAutoplay();
  });
  heroCarousel.addEventListener("focusin", () => {
    hasFocus = true;
    stopAutoplay();
  });
  heroCarousel.addEventListener("focusout", (event) => {
    if (!heroCarousel.contains(event.relatedTarget)) {
      hasFocus = false;
      startAutoplay();
    }
  });
  prefersReducedMotion.addEventListener("change", () => {
    if (prefersReducedMotion.matches) stopAutoplay();
    else startAutoplay();
  });
  startAutoplay();
}

if (searchButton && window.matchMedia("(min-width: 768px)").matches) {
  searchButton.addEventListener("click", () => {
    const products = document.querySelector("#products");
    products?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelector(".product-image")?.focus({ preventScroll: true });
  });
}

if (signupForm && formStatus) {
  signupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!signupForm.checkValidity()) {
      signupForm.querySelector("input")?.reportValidity();
      return;
    }

    formStatus.textContent = "Thanks for joining the Merssh Club!";
    signupForm.reset();
  });
}
