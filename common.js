(() => {
  const CART_STORAGE_KEY = "merssh-cart";
  const cartButton = document.querySelector(".cart-button");
  const cartCount = cartButton?.querySelector(".cart-count");

  const getCart = () => {
    try {
      const cart = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "[]");
      return Array.isArray(cart) ? cart : [];
    } catch {
      return [];
    }
  };

  const saveCart = (cart) => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  };

  const createCartConfirmation = () => {
    const dialog = document.createElement("dialog");
    dialog.className = "cart-add-dialog";
    dialog.setAttribute("role", "status");
    dialog.setAttribute("aria-live", "polite");
    dialog.setAttribute("aria-labelledby", "cart-add-title");
    dialog.innerHTML = `
      <div class="cart-add-dialog-header">
        <h2 id="cart-add-title">Added to your bag</h2>
        <button class="cart-add-close" type="button" aria-label="Close confirmation">×</button>
      </div>
      <div class="cart-add-product">
        <img class="cart-add-image" alt="" />
        <div class="cart-add-copy">
          <p class="cart-add-name"></p>
          <p class="cart-add-quantity"></p>
        </div>
      </div>
      <a class="cart-add-view" href="cart.html">View bag <span aria-hidden="true">→</span></a>`;

    dialog.querySelector(".cart-add-close").addEventListener("click", () => dialog.close());
    document.body.append(dialog);
    return dialog;
  };

  let cartConfirmation;
  let cartConfirmationTimer;
  const showCartConfirmation = ({ name, image, quantity }) => {
    cartConfirmation ??= createCartConfirmation();
    const productImage = cartConfirmation.querySelector(".cart-add-image");
    productImage.src = image;
    productImage.alt = name;
    cartConfirmation.querySelector(".cart-add-name").textContent = name;
    const itemCount = getCart().reduce((total, item) => total + item.quantity, 0);
    cartConfirmation.querySelector(".cart-add-quantity").textContent =
      `Quantity: ${quantity} · Your bag now has ${itemCount} ${itemCount === 1 ? "item" : "items"}`;

    if (!cartConfirmation.open) cartConfirmation.show();
    window.clearTimeout(cartConfirmationTimer);
    cartConfirmationTimer = window.setTimeout(() => {
      if (cartConfirmation.open) cartConfirmation.close();
    }, 4500);
  };

  const updateCartCount = () => {
    if (!cartCount || !cartButton) return;
    const count = getCart().reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = String(count);
    cartButton.setAttribute("aria-label", `Shopping bag, ${count} item${count === 1 ? "" : "s"}`);
  };

  const addItem = ({ name, price, image, quantity = 1 }) => {
    if (!name || !Number.isFinite(price) || !image || !Number.isInteger(quantity) || quantity < 1) {
      throw new Error("A product must have a name, valid price, image, and positive whole-number quantity to be added to the bag.");
    }

    const cart = getCart();
    const existingItem = cart.find((item) => item.name === name);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({ name, price, image, quantity });
    }

    saveCart(cart);
    updateCartCount();
    showCartConfirmation({ name, image, quantity });
  };

  window.MersshCart = { get: getCart, save: saveCart, add: addItem, updateCount: updateCartCount };
  updateCartCount();

  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".main-nav");

  const closeDropdowns = () => {
    document.querySelectorAll(".main-nav .nav-menu.is-open").forEach((menu) => {
      menu.classList.remove("is-open");
      menu.querySelector(":scope > .nav-menu-heading > .nav-menu-toggle")
        ?.setAttribute("aria-expanded", "false");
    });
    document.body.classList.remove("nav-dropdown-open");
  };

  if (menuToggle && navigation) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      if (isOpen) closeDropdowns();
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Open menu" : "Close menu");
      navigation.classList.toggle("is-open", !isOpen);
    });

    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open menu");
        navigation.classList.remove("is-open");
        closeDropdowns();
      });
    });
  }

  document.querySelectorAll(".main-nav .nav-menu").forEach((menu) => {
    const trigger = menu.querySelector(":scope > .nav-menu-heading > a");
    const toggle = menu.querySelector(":scope > .nav-menu-heading > .nav-menu-toggle");
    if (!trigger || !menu.querySelector(".nav-dropdown")) return;

    const setOpen = (isOpen) => {
      menu.classList.toggle("is-open", isOpen);
      toggle?.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle(
        "nav-dropdown-open",
        Boolean(document.querySelector(".main-nav .nav-menu.is-open"))
      );
    };

    toggle?.addEventListener("click", () => setOpen(!menu.classList.contains("is-open")));
    menu.addEventListener("pointerenter", () => {
      if (!window.matchMedia("(max-width: 900px)").matches) setOpen(true);
    });
    menu.addEventListener("pointerleave", () => {
      if (!window.matchMedia("(max-width: 900px)").matches) setOpen(false);
    });
    menu.addEventListener("focusin", () => {
      if (!window.matchMedia("(max-width: 900px)").matches) setOpen(true);
    });
    menu.addEventListener("focusout", (event) => {
      if (!window.matchMedia("(max-width: 900px)").matches && !menu.contains(event.relatedTarget)) {
        setOpen(false);
      }
    });
    menu.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (toggle && window.matchMedia("(max-width: 900px)").matches) {
        toggle.focus();
      } else {
        trigger.focus();
      }
      setOpen(false);
    });
  });

  const updateProductNameSizes = (root) => {
    root.querySelectorAll?.(".product-copy h3 a").forEach((name) => {
      const length = name.textContent.trim().length;
      name.classList.toggle("is-long", length > 32);
      name.classList.toggle("is-extra-long", length > 46);
    });
  };

  updateProductNameSizes(document);
  new MutationObserver((mutations) => {
    mutations.forEach(({ addedNodes }) => {
      addedNodes.forEach((node) => {
        if (node instanceof Element) updateProductNameSizes(node);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });

  document.querySelectorAll(".product-card button.add-to-bag").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".product-card");
      const name = button.dataset.product;
      const priceText = card?.querySelector(".product-price")?.textContent || "";
      const price = Number(priceText.replace(/[^\d.-]/g, ""));
      const image = card?.querySelector("img")?.src;
      addItem({ name, price, image });

      button.textContent = "Added to bag";
      button.classList.add("is-added");
      window.setTimeout(() => {
        button.textContent = "Add to bag";
        button.classList.remove("is-added");
      }, 1800);
    });
  });
})();
