document.documentElement.dataset.page = "product";

const fallbackProductCatalog = {
  "aurora-ring": {
    name: "Aurora Ring",
    category: "The everyday edit",
    material: "18k vermeil",
    price: 185,
    description: "A softly sculpted ring made to bring a little light to everyday rituals. Wear it solo or stack it with your favorite pieces.",
    highlights: ["18k gold vermeil finish", "Designed for everyday wear", "Complimentary gift-ready packaging"],
    images: [
      ["assets/products/Ornate Gold Mermaid Pearl Pendant.png", "Aurora Ring, front view"],
      ["assets/RING.JPG", "Aurora Ring, styled close-up"],
      ["assets/products/show-case9.jpeg", "Aurora Ring, detail view"],
      ["assets/bracelate.png", "Aurora Ring, styled with jewelry"],
    ],
  },
  "selkie-necklace": {
    name: "Selkie Necklace",
    category: "Small details, lasting feeling",
    material: "Layered",
    price: 220,
    description: "A delicate necklace with an easy, considered silhouette. Made for layering, and lovely enough to wear all on its own.",
    highlights: ["Lightweight layered design", "Adjustable length", "Complimentary gift-ready packaging"],
    images: [
      ["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85", "Selkie Necklace, front view"],
      ["assets/necklace.png", "Selkie Necklace, styled close-up"],
      ["https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1000&q=85", "Selkie Necklace, detail view"],
      ["assets/Earing.png", "Selkie Necklace, styled with jewelry"],
    ],
  },
  "boreal-bracelet": {
    name: "Boreal Bracelet",
    category: "The everyday edit",
    material: "Everyday",
    price: 170,
    description: "An effortless bracelet with a refined finish, designed to feel just as at home with a simple tee as with eveningwear.",
    highlights: ["Comfortable everyday fit", "Made to mix and layer", "Complimentary gift-ready packaging"],
    images: [
      ["https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?auto=format&fit=crop&w=1000&q=85", "Boreal Bracelet, front view"],
      ["assets/bracelate.png", "Boreal Bracelet, styled close-up"],
      ["assets/bracelate.JPG", "Boreal Bracelet, detail view"],
      ["https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1000&q=85", "Boreal Bracelet, styled with jewelry"],
    ],
  },
  "fjord-earrings": {
    name: "Fjord Earrings",
    category: "Made to become yours",
    material: "Minimal",
    price: 140,
    description: "A clean, minimal pair that brings a subtle shine to your look. An easy finishing touch, from daily wear to special moments.",
    highlights: ["Lightweight minimalist silhouette", "Designed for easy styling", "Complimentary gift-ready packaging"],
    images: [
      ["https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1000&q=85", "Fjord Earrings, front view"],
      ["assets/Earing.png", "Fjord Earrings, styled close-up"],
      ["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85", "Fjord Earrings, detail view"],
      ["assets/necklace.png", "Fjord Earrings, styled with jewelry"],
    ],
  },
};

let productCatalog = { ...fallbackProductCatalog };

const productDetail = document.querySelector("#product-detail");
const productNotFound = document.querySelector("#product-not-found");
const recommendations = document.querySelector("#product-recommendations");
const productId = new URLSearchParams(window.location.search).get("id");
const formatPrice = (amount) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
}).format(amount);

async function loadProductCatalog() {
  try {
    const { db } = await import('./firebase-init.js');
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
    const querySnapshot = await getDocs(collection(db, 'products'));
    
    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        productCatalog[data.id] = data;
      });
    }
  } catch (error) {
    console.warn('Could not load products from Firestore, using fallback:', error);
  }
}

async function initProduct() {
  await loadProductCatalog();
  
  const product = Object.prototype.hasOwnProperty.call(productCatalog, productId)
    ? productCatalog[productId]
    : null;

  if (product) {
    document.title = `${product.name} | Merssh`;
    document.querySelector("#breadcrumb-product").textContent = product.name;
    document.querySelector("#product-category").textContent = product.category || '';
    document.querySelector("#product-title").textContent = product.name;
    document.querySelector("#product-material").textContent = product.material || '';
    document.querySelector("#product-price").textContent = formatPrice(product.price);
    document.querySelector("#product-description").textContent = product.description || '';
    document.querySelector("#product-highlights").innerHTML = Array.isArray(product.highlights)
      ? product.highlights.map((highlight) => `<li>${highlight}</li>`).join("")
      : '';

    const gallery = document.querySelector("#product-gallery-grid");
    const pagination = document.querySelector("#product-gallery-pagination");
    const galleryCount = document.querySelector("#product-gallery-count");
    gallery.innerHTML = '';
    pagination.innerHTML = '';
    
    const images = Array.isArray(product.images) ? product.images : [];
    images.forEach(([src, alt], index) => {
      const tile = document.createElement("div");
      const image = document.createElement("img");
      const pageButton = document.createElement("button");
      tile.className = "product-gallery-tile";
      tile.dataset.index = String(index);
      image.src = src;
      image.alt = alt || product.name;
      image.loading = index === 0 ? "eager" : "lazy";
      tile.append(image);
      gallery.append(tile);

      pageButton.type = "button";
      pageButton.className = "product-gallery-dot";
      pageButton.setAttribute("aria-label", `Show photo ${index + 1}`);
      pageButton.setAttribute("aria-pressed", String(index === 0));
      pageButton.addEventListener("click", () => {
        gallery.children[index]?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          inline: "start",
          block: "nearest",
        });
      });
      pagination.append(pageButton);
    });

    const setActiveGalleryImage = (index) => {
      pagination.querySelectorAll("button").forEach((button, buttonIndex) => {
        button.setAttribute("aria-pressed", String(buttonIndex === index));
      });
      galleryCount.textContent = images.length > 0 ? `${index + 1} / ${images.length}` : "0 / 0";
    };
    if (images.length > 0) {
      gallery.addEventListener("scroll", () => {
        const firstTile = gallery.firstElementChild;
        const tileWidth = firstTile?.getBoundingClientRect().width ?? 0;
        const gap = Number.parseFloat(getComputedStyle(gallery).columnGap) || 0;
        if (tileWidth > 0) setActiveGalleryImage(Math.min(images.length - 1, Math.round(gallery.scrollLeft / (tileWidth + gap))));
      });
      setActiveGalleryImage(0);
    }

    const recommendedProducts = document.querySelector("#recommended-products");
    const otherProducts = Object.entries(productCatalog).filter(([id]) => id !== productId);
    recommendedProducts.innerHTML = otherProducts.slice(0, 4).map(([id, suggestedProduct]) => {
      const imgSrc = Array.isArray(suggestedProduct.images) && suggestedProduct.images[0] ? suggestedProduct.images[0][0] : 'assets/logo.png';
      return `
        <article class="product-card">
          <a class="product-image" href="product.html?id=${id}" aria-label="View ${suggestedProduct.name} details">
            <img src="${imgSrc}" alt="${suggestedProduct.name}" />
          </a>
          <div class="product-copy">
            <div>
              <h3><a href="product.html?id=${id}">${suggestedProduct.name}</a></h3>
              <span>${suggestedProduct.material || ''}</span>
            </div>
            <div class="product-price">${formatPrice(suggestedProduct.price)}</div>
          </div>
          <a class="add-to-bag recommendation-view-link" href="product.html?id=${id}">View details</a>
        </article>`;
    }).join("");
    recommendations.hidden = otherProducts.length === 0;

    document.querySelector("#product-mobile-buybar").hidden = false;
    document.querySelector("#product-mobile-name").textContent = product.name;
    document.querySelector("#product-mobile-price").textContent = formatPrice(product.price);

    let quantity = 1;
    const quantityOutput = document.querySelector("#product-quantity");
    const updateQuantity = (change) => {
      quantity = Math.max(1, quantity + change);
      if (quantityOutput) quantityOutput.value = String(quantity);
      if (quantityOutput) quantityOutput.textContent = String(quantity);
    };
    document.querySelector("#quantity-decrease")?.addEventListener("click", () => updateQuantity(-1));
    document.querySelector("#quantity-increase")?.addEventListener("click", () => updateQuantity(1));

    const addToBag = (button) => {
      window.MersshCart.add({
        name: product.name,
        price: product.price,
        image: images[0] ? new URL(images[0][0], window.location.href).href : '',
        quantity,
      });
      button.textContent = "Added to bag";
      button.classList.add("is-added");
      const statusEl = document.querySelector("#product-status");
      if (statusEl) statusEl.textContent = `${quantity} ${product.name}${quantity === 1 ? "" : "s"} added to your bag.`;
      window.setTimeout(() => {
        button.textContent = "Add to bag";
        button.classList.remove("is-added");
      }, 1800);
    };
    document.querySelector("#product-add-to-bag")?.addEventListener("click", (event) => addToBag(event.currentTarget));
    document.querySelector("#product-mobile-add")?.addEventListener("click", (event) => addToBag(event.currentTarget));
  } else {
    productDetail.hidden = true;
    recommendations.hidden = true;
    document.querySelector("#product-mobile-buybar").hidden = true;
    productNotFound.hidden = false;
    document.title = "Product not found | Merssh";
  }
}

initProduct();
