document.documentElement.dataset.page = "cart";

const cartContent = document.querySelector("#cart-content");
const cartCount = document.querySelector(".cart-count");
const formatPrice = (amount) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
}).format(amount);
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));

const renderCart = () => {
  const cart = window.MersshCart.get();
  cartCount.textContent = String(cart.reduce((total, item) => total + item.quantity, 0));

  if (!cart.length) {
    cartContent.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-copy">
          <p class="eyebrow">A lovely place to start</p>
          <h2>Your next favorite<br>is waiting.</h2>
          <p>Discover thoughtfully made pieces to make your everyday rituals feel special.</p>
          <a class="cta-button" href="index.html#products">Explore the collection</a>
        </div>
        <div class="empty-cart-image">
          <img src="assets/necklace.png" alt="A delicate Merssh necklace" />
          <span>Made to be treasured</span>
        </div>
      </div>`;
    return;
  }

  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const shippingProgress = Math.min((subtotal / 150) * 100, 100);
  const remainingForShipping = Math.max(150 - subtotal, 0);
  cartContent.innerHTML = `
    <div class="cart-layout">
      <section class="cart-items" aria-label="Items in your bag">
        <div class="cart-items-heading">
          <h2>Your pieces</h2>
          <span>${itemCount} ${itemCount === 1 ? "item" : "items"}</span>
        </div>
        ${cart.map((item, index) => `
          <article class="cart-item">
            <img class="cart-item-image" src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" />
            <div>
              <h3>${escapeHTML(item.name)}</h3>
              <div class="cart-item-price">${formatPrice(item.price)}</div>
              <div class="cart-item-controls">
                <div class="quantity-control" aria-label="Quantity for ${escapeHTML(item.name)}">
                <button type="button" data-action="decrease" data-index="${index}" aria-label="Decrease quantity of ${escapeHTML(item.name)}">−</button>
                <span>${item.quantity}</span>
                <button type="button" data-action="increase" data-index="${index}" aria-label="Increase quantity of ${escapeHTML(item.name)}">+</button>
                </div>
                <button class="remove-item" type="button" data-action="remove" data-index="${index}">Remove</button>
              </div>
            </div>
            <strong class="cart-item-total">${formatPrice(item.price * item.quantity)}</strong>
          </article>`).join("")}
        <div class="cart-reassurance">
          <span aria-hidden="true">✳</span>
          <p>Gift-ready packaging, always. <span>Every order arrives ready to give — or keep.</span></p>
        </div>
      </section>
      <aside class="cart-summary">
        <p class="eyebrow">The details</p>
        <h2>Order summary</h2>
        <div class="shipping-note">
          <p>${remainingForShipping ? `You’re ${formatPrice(remainingForShipping)} away from complimentary shipping.` : "Your order ships on us. Enjoy complimentary shipping!"}</p>
          <div class="shipping-progress" role="progressbar" aria-label="Progress toward complimentary shipping" aria-valuemin="0" aria-valuemax="150" aria-valuenow="${Math.min(subtotal, 150)}">
            <span style="width: ${shippingProgress}%"></span>
          </div>
        </div>
        <div class="summary-row"><span>Subtotal</span><strong>${formatPrice(subtotal)}</strong></div>
        <div class="summary-row"><span>Shipping</span><span>${subtotal >= 150 ? "Complimentary" : formatPrice(9.99)}</span></div>
        <div class="summary-row total"><span>Total</span><strong>${formatPrice(subtotal >= 150 ? subtotal : subtotal + 9.99)}</strong></div>
        <button class="checkout-button" type="button">Continue to checkout <span aria-hidden="true">→</span></button>
        <p class="secure-checkout"><span aria-hidden="true">♧</span> A little love, packed with care</p>
        <p class="checkout-status" id="checkout-status" role="status" aria-live="polite"></p>
      </aside>
    </div>`;
};

cartContent.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (button) {
    const cart = window.MersshCart.get();
    const index = Number(button.dataset.index);
    const action = button.dataset.action;

    if (action === "increase") cart[index].quantity += 1;
    if (action === "decrease") cart[index].quantity -= 1;
    if (action === "remove" || cart[index].quantity < 1) cart.splice(index, 1);

    window.MersshCart.save(cart);
    renderCart();
    return;
  }

  if (event.target.closest(".checkout-button")) {
    const checkoutBtn = event.target.closest(".checkout-button");
    const statusEl = document.querySelector("#checkout-status");
    const cart = window.MersshCart.get();
    
    if (cart.length === 0) {
      statusEl.textContent = "Your bag is empty.";
      return;
    }
    
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Processing...";
    statusEl.textContent = "";
    
    // Prompt for customer details
    const name = prompt("Full Name:");
    if (!name) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Continue to checkout →";
      statusEl.textContent = "Checkout cancelled.";
      return;
    }
    
    const email = prompt("Email Address:");
    if (!email) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Continue to checkout →";
      statusEl.textContent = "Checkout cancelled.";
      return;
    }
    
    const phone = prompt("Phone Number:");
    if (!phone) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Continue to checkout →";
      statusEl.textContent = "Checkout cancelled.";
      return;
    }
    
    const address = prompt("Shipping Address:");
    if (!address) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Continue to checkout →";
      statusEl.textContent = "Checkout cancelled.";
      return;
    }
    
    (async () => {
      try {
        const { db } = await import('./firebase-init.js');
        const { collection, addDoc, Timestamp } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        
        const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
        const shipping = subtotal >= 150 ? 0 : 9.99;
        const total = subtotal >= 150 ? subtotal : subtotal + 9.99;
        
        await addDoc(collection(db, 'orders'), {
          customer: {
            name,
            email,
            phone,
            address
          },
          items: cart,
          subtotal,
          shipping,
          total,
          status: 'pending',
          createdAt: Timestamp.now()
        });
        
        // Clear cart
        window.MersshCart.save([]);
        renderCart();
        if (window.MersshCart.updateCount) window.MersshCart.updateCount();
        
        statusEl.textContent = "Order placed successfully! We'll contact you soon for confirmation.";
        checkoutBtn.textContent = "Order Placed";
      } catch (error) {
        console.error('Error placing order:', error);
        statusEl.textContent = "Error placing order. Please try again.";
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = "Continue to checkout →";
      }
    })();
  }
});

renderCart();
