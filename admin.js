import { db } from './firebase-init.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  query,
  orderBy,
  Timestamp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Tab elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Customer activity
const customersTableBody = document.getElementById('customersTableBody');

// Products elements
const addProductBtn = document.getElementById('addProductBtn');
const productsTableBody = document.getElementById('productsTableBody');
const productModal = document.getElementById('productModal');
const closeProductModal = document.getElementById('closeProductModal');
const cancelProductBtn = document.getElementById('cancelProductBtn');
const productForm = document.getElementById('productForm');
const productModalTitle = document.getElementById('productModalTitle');
const productDocId = document.getElementById('productDocId');
const productIdInput = document.getElementById('productId');
const productNameInput = document.getElementById('productName');
const productCategoryInput = document.getElementById('productCategory');
const productMaterialInput = document.getElementById('productMaterial');
const productPriceInput = document.getElementById('productPrice');
const productDescriptionInput = document.getElementById('productDescription');
const productHighlightsInput = document.getElementById('productHighlights');
const productImagesInput = document.getElementById('productImages');

// Orders elements
const ordersTableBody = document.getElementById('ordersTableBody');
const orderModal = document.getElementById('orderModal');
const closeOrderModal = document.getElementById('closeOrderModal');
const orderCustomerName = document.getElementById('orderCustomerName');
const orderCustomerEmail = document.getElementById('orderCustomerEmail');
const orderCustomerPhone = document.getElementById('orderCustomerPhone');
const orderCustomerAddress = document.getElementById('orderCustomerAddress');
const orderId = document.getElementById('orderId');
const orderDate = document.getElementById('orderDate');
const orderStatus = document.getElementById('orderStatus');
const orderSubtotal = document.getElementById('orderSubtotal');
const orderShipping = document.getElementById('orderShipping');
const orderTotal = document.getElementById('orderTotal');
const orderItems = document.getElementById('orderItems');
const orderStatusSelect = document.getElementById('orderStatusSelect');
const updateOrderStatusBtn = document.getElementById('updateOrderStatusBtn');

// Users elements removed

let currentOrderId = null;

// Format price
const formatPrice = (amount) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
}).format(amount);

// Wait for auth to be ready from admin-auth.js
window.addEventListener('adminAuthReady', () => {
  loadProducts();
  loadOrders();
});

// Tabs
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(tc => tc.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
    
    if (btn.dataset.tab === 'orders') {
      loadOrders();
    }
  });
});

// Products
addProductBtn.addEventListener('click', () => {
  productModalTitle.textContent = 'Add Product';
  productDocId.value = '';
  productForm.reset();
  productModal.classList.add('active');
});

closeProductModal.addEventListener('click', () => {
  productModal.classList.remove('active');
});

cancelProductBtn.addEventListener('click', () => {
  productModal.classList.remove('active');
});

productModal.addEventListener('click', (e) => {
  if (e.target === productModal) {
    productModal.classList.remove('active');
  }
});

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const docId = productDocId.value;
  const productData = {
    id: productIdInput.value.trim(),
    name: productNameInput.value.trim(),
    category: productCategoryInput.value.trim(),
    material: productMaterialInput.value.trim(),
    price: parseFloat(productPriceInput.value),
    description: productDescriptionInput.value.trim(),
    highlights: productHighlightsInput.value.split('\n').filter(h => h.trim()),
    images: productImagesInput.value.split('\n').filter(img => img.trim()).map(img => [img.trim(), productNameInput.value.trim()])
  };
  
  try {
    if (docId) {
      await setDoc(doc(db, 'products', docId), productData);
    } else {
      await setDoc(doc(db, 'products', productData.id), productData);
    }
    productModal.classList.remove('active');
    loadProducts();
  } catch (error) {
    alert('Error saving product: ' + error.message);
  }
});

async function loadProducts() {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    productsTableBody.innerHTML = '';
    
    if (querySnapshot.empty) {
      productsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted);">No products found. Add your first product!</td></tr>';
      return;
    }
    
    querySnapshot.forEach((docSnap) => {
      const product = docSnap.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="product-image-cell"><img src="${product.images?.[0]?.[0] || 'assets/logo.png'}" alt="${product.name}"></td>
        <td>${product.id}</td>
        <td>${product.name}</td>
        <td>${product.category || '-'}</td>
        <td>${product.material || '-'}</td>
        <td>${formatPrice(product.price)}</td>
        <td>
          <div class="table-actions">
            <button class="btn-secondary" onclick='editProduct(${JSON.stringify(product).replace(/'/g, "&apos;")}, "${docSnap.id}")'>Edit</button>
            <button class="btn-danger" onclick="deleteProduct('${docSnap.id}')">Delete</button>
          </div>
        </td>
      `;
      productsTableBody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error loading products:', error);
    productsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger);">Error loading products</td></tr>';
  }
}

window.editProduct = (product, docId) => {
  productModalTitle.textContent = 'Edit Product';
  productDocId.value = docId;
  productIdInput.value = product.id;
  productIdInput.disabled = true;
  productNameInput.value = product.name;
  productCategoryInput.value = product.category || '';
  productMaterialInput.value = product.material || '';
  productPriceInput.value = product.price;
  productDescriptionInput.value = product.description;
  productHighlightsInput.value = Array.isArray(product.highlights) ? product.highlights.join('\n') : '';
  productImagesInput.value = Array.isArray(product.images) ? product.images.map(img => img[0]).join('\n') : '';
  productModal.classList.add('active');
};

window.deleteProduct = async (docId) => {
  if (confirm('Are you sure you want to delete this product?')) {
    try {
      await deleteDoc(doc(db, 'products', docId));
      loadProducts();
    } catch (error) {
      alert('Error deleting product: ' + error.message);
    }
  }
};

// Orders
async function loadOrders() {
  try {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    ordersTableBody.innerHTML = '';
    
    if (querySnapshot.empty) {
      ordersTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted);">No orders yet</td></tr>';
      return;
    }
    
    querySnapshot.forEach((docSnap) => {
      const order = docSnap.data();
      const tr = document.createElement('tr');
      const orderDateStr = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A';
      const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const statusClass = `status-${order.status || 'pending'}`;
      
      tr.innerHTML = `
        <td style="font-family: monospace; font-size: 0.8rem;">${docSnap.id.substring(0, 8)}...</td>
        <td>
          <div>${order.customer?.name || 'N/A'}</div>
          <div style="font-size: 0.8rem; color: var(--muted);">${order.customer?.email || ''}</div>
        </td>
        <td>${orderDateStr}</td>
        <td>${itemCount} ${itemCount === 1 ? 'item' : 'items'}</td>
        <td>${formatPrice(order.total || 0)}</td>
        <td><span class="status-badge ${statusClass}">${order.status || 'pending'}</span></td>
        <td><button class="btn-secondary" onclick="viewOrder('${docSnap.id}')">View</button></td>
      `;
      ordersTableBody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error loading orders:', error);
    ordersTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger);">Error loading orders</td></tr>';
  }
}

window.viewOrder = async (orderDocId) => {
  try {
    const orderDoc = await getDocs(query(collection(db, 'orders')));
    let orderData = null;
    orderDoc.forEach(doc => {
      if (doc.id === orderDocId) orderData = { id: doc.id, ...doc.data() };
    });
    
    if (!orderData) return;
    
    currentOrderId = orderDocId;
    
    orderCustomerName.textContent = orderData.customer?.name || 'N/A';
    orderCustomerEmail.textContent = orderData.customer?.email || 'N/A';
    orderCustomerPhone.textContent = orderData.customer?.phone || 'N/A';
    orderCustomerAddress.textContent = orderData.customer?.address || 'N/A';
    
    orderId.textContent = orderDocId;
    orderDate.textContent = orderData.createdAt?.toDate ? orderData.createdAt.toDate().toLocaleString() : 'N/A';
    orderStatus.textContent = orderData.status || 'pending';
    orderStatus.className = `status-badge status-${orderData.status || 'pending'}`;
    orderStatusSelect.value = orderData.status || 'pending';
    
    orderSubtotal.textContent = formatPrice(orderData.subtotal || 0);
    orderShipping.textContent = orderData.shipping === 0 ? 'Complimentary' : formatPrice(orderData.shipping || 0);
    orderTotal.textContent = formatPrice(orderData.total || 0);
    
    orderItems.innerHTML = '';
    if (orderData.items && orderData.items.length > 0) {
      orderData.items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'order-item';
        div.innerHTML = `
          <img src="${item.image || 'assets/logo.png'}" alt="${item.name}">
          <div class="order-item-info">
            <h5>${item.name}</h5>
            <p>Quantity: ${item.quantity} × ${formatPrice(item.price)}</p>
          </div>
          <strong>${formatPrice(item.price * item.quantity)}</strong>
        `;
        orderItems.appendChild(div);
      });
    }
    
    orderModal.classList.add('active');
  } catch (error) {
    alert('Error loading order: ' + error.message);
  }
};

closeOrderModal.addEventListener('click', () => {
  orderModal.classList.remove('active');
});

orderModal.addEventListener('click', (e) => {
  if (e.target === orderModal) {
    orderModal.classList.remove('active');
  }
});

updateOrderStatusBtn.addEventListener('click', async () => {
  if (!currentOrderId) return;
  
  try {
    await updateDoc(doc(db, 'orders', currentOrderId), {
      status: orderStatusSelect.value
    });
    orderStatus.textContent = orderStatusSelect.value;
    orderStatus.className = `status-badge status-${orderStatusSelect.value}`;
    alert('Order status updated successfully');
    loadOrders();
  } catch (error) {
    alert('Error updating status: ' + error.message);
  }
});

// Users functionality removed
