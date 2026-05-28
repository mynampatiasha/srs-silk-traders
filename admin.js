const firebaseConfig = {
  apiKey: "AIzaSyAv8WZPd7k6oGAsGX10NPAOp6iuqU3QE1w",
  authDomain: "experime-3251a.firebaseapp.com",
  projectId: "experime-3251a",
  storageBucket: "experime-3251a.firebasestorage.app",
  messagingSenderId: "256324869428",
  appId: "1:256324869428:web:02a6392b90e77b2f805961"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// UI Elements
const statusMsg = document.getElementById('status-msg');

function showStatus(msg) {
  statusMsg.textContent = msg;
  statusMsg.style.display = 'block';
  setTimeout(() => statusMsg.style.display = 'none', 3000);
}

// Tab Switching
document.querySelectorAll('.admin-sidebar nav a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.admin-sidebar nav a').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    
    link.classList.add('active');
    document.getElementById(`tab-${link.dataset.tab}`).classList.add('active');
  });
});

// ========================
// CATEGORIES MANAGEMENT
// ========================
const catForm = document.getElementById('cat-form');
const catsList = document.getElementById('cats-list');
const pCatSelect = document.getElementById('p-cat');

function loadCategories() {
  db.collection('categories').onSnapshot(snapshot => {
    catsList.innerHTML = '';
    pCatSelect.innerHTML = '<option value="">Select Category...</option>';
    
    snapshot.forEach(doc => {
      const cat = doc.data();
      catsList.innerHTML += `
        <div class="item-card">
          <img src="${cat.img}" alt="${cat.name}" style="border-radius:50%; width:60px; height:60px; object-fit:cover; margin:0 auto 10px auto;">
          <strong>${cat.name}</strong>
          <span>ID: ${cat.id}</span>
          <button onclick="deleteCat('${doc.id}')">Delete</button>
        </div>
      `;
      pCatSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
  });
}

// Image Compression Helper
function compressImage(file, maxWidth = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% JPEG to save space
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
}

const btnAddCat = document.getElementById('btn-add-cat');

catForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  btnAddCat.disabled = true;
  btnAddCat.textContent = "Uploading...";

  const id = document.getElementById('c-id').value.toLowerCase().replace(/\s+/g, '_');
  const name = document.getElementById('c-name').value;
  const file = document.getElementById('c-img').files[0];
  
  try {
    const base64Img = await compressImage(file, 400); // Small size for category circles
    await db.collection('categories').doc(id).set({ id, name, img: base64Img });
    
    catForm.reset();
    showStatus('Category Added!');
  } catch (error) {
    console.error(error);
    alert('Error uploading category!');
  }

  btnAddCat.disabled = false;
  btnAddCat.textContent = "Add Category";
});

window.deleteCat = async (id) => {
  if(confirm('Are you sure you want to delete this category?')) {
    await db.collection('categories').doc(id).delete();
  }
};

// ========================
// PRODUCTS MANAGEMENT
// ========================
const productForm = document.getElementById('product-form');
const productsList = document.getElementById('products-list');
const btnAddProduct = document.getElementById('btn-add-product');

function loadProducts() {
  db.collection('products').onSnapshot(snapshot => {
    productsList.innerHTML = '';
    snapshot.forEach(doc => {
      const p = doc.data();
      productsList.innerHTML += `
        <div class="item-card">
          <img src="${p.img}" alt="${p.name}">
          <strong>${p.name}</strong>
          <span>₹${p.price} <strike>₹${p.orig}</strike></span>
          <span>Cat: ${p.cat}</span>
          <div style="margin-top: 10px; display: flex; gap: 5px; flex-wrap: wrap;">
            <button onclick="toggleStock('${doc.id}', ${p.inStock})" style="background: ${p.inStock ? '#4CAF50' : '#ff9800'};">${p.inStock ? 'In Stock' : 'Out of Stock'}</button>
            <button onclick="editProduct('${doc.id}')" style="background: #2196F3;">Edit</button>
            <button onclick="deleteProduct('${doc.id}')">Delete</button>
          </div>
        </div>
      `;
    });
  });
}

let productFiles = [];
const pImgInput = document.getElementById('p-img');
const previewContainer = document.getElementById('image-preview-container');

pImgInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    productFiles.push(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement('div');
      div.style.position = 'relative';
      div.innerHTML = `
        <img src="${e.target.result}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;">
        <button type="button" style="position:absolute;top:-5px;right:-5px;background:red;color:white;border-radius:50%;border:none;width:20px;height:20px;font-size:12px;cursor:pointer;padding:0;line-height:20px;text-align:center;" onclick="removeProductImage(this, '${file.name}')">X</button>
      `;
      previewContainer.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
  // Clear input so same file can be selected again if removed
  pImgInput.value = '';
});

window.removeProductImage = (btn, fileName) => {
  productFiles = productFiles.filter(f => f.name !== fileName);
  btn.parentElement.remove();
};

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!window.editingProductId && productFiles.length === 0) {
    alert("Please select at least one image.");
    return;
  }

  btnAddProduct.disabled = true;
  btnAddProduct.textContent = window.editingProductId ? "Updating..." : "Uploading...";

  const name = document.getElementById('p-name').value;
  const price = Number(document.getElementById('p-price').value);
  const orig = Number(document.getElementById('p-orig').value);
  const cat = document.getElementById('p-cat').value;
  const desc = document.getElementById('p-desc').value;
  const tagsStr = document.getElementById('p-tags').value;
  const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);
  const metaTitle = document.getElementById('p-meta-title').value;
  const metaDesc = document.getElementById('p-meta-desc').value;

  try {
    let updateData = { name, price, orig, cat, desc, tags, metaTitle, metaDesc };

    if (productFiles.length > 0) {
      let uploadedUrls = [];
      for (let file of productFiles) {
        const base64Img = await compressImage(file, 800);
        uploadedUrls.push(base64Img);
      }
      updateData.img = uploadedUrls[0];
      updateData.imgUrls = uploadedUrls;
    }

    if (window.editingProductId) {
      await db.collection('products').doc(window.editingProductId).update(updateData);
      window.editingProductId = null;
      showStatus('Product Updated Successfully!');
    } else {
      updateData.inStock = true;
      updateData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('products').add(updateData);
      showStatus('Product Added Successfully!');
    }

    productForm.reset();
    productFiles = [];
    previewContainer.innerHTML = '';
  } catch (error) {
    console.error(error);
    alert('Error saving product!');
  }

  btnAddProduct.disabled = false;
  btnAddProduct.textContent = "Add Product";
});

window.toggleStock = async (id, currentStock) => {
  await db.collection('products').doc(id).update({
    inStock: !currentStock
  });
};

window.editProduct = async (id) => {
  const doc = await db.collection('products').doc(id).get();
  if(!doc.exists) return;
  const p = doc.data();
  
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-orig').value = p.orig || '';
  document.getElementById('p-cat').value = p.cat;
  document.getElementById('p-desc').value = p.desc || '';
  document.getElementById('p-tags').value = p.tags ? p.tags.join(', ') : '';
  
  // We can't easily populate file inputs due to browser security, so we clear them.
  productFiles = [];
  document.getElementById('image-preview-container').innerHTML = '';
  document.getElementById('p-img').value = '';
  
  window.editingProductId = id;
  document.getElementById('btn-add-product').textContent = "Update Product";
  
  window.scrollTo(0,0);
};

window.deleteProduct = async (id) => {
  if(confirm('Are you sure you want to delete this product?')) {
    await db.collection('products').doc(id).delete();
  }
};

// ========================
// BANNERS MANAGEMENT
// ========================
const bannerForm = document.getElementById('banner-form');
const bannersList = document.getElementById('banners-list');
const btnAddBanner = document.getElementById('btn-add-banner');

function loadBanners() {
  db.collection('banners').onSnapshot(snapshot => {
    bannersList.innerHTML = '';
    snapshot.forEach(doc => {
      const b = doc.data();
      bannersList.innerHTML += `
        <div class="item-card">
          <img src="${b.url}" alt="${b.alt}">
          <strong>${b.label}</strong>
          <button onclick="deleteBanner('${doc.id}')">Delete</button>
        </div>
      `;
    });
  });
}

bannerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  btnAddBanner.disabled = true;
  btnAddBanner.textContent = "Uploading...";

  const file = document.getElementById('b-img').files[0];
  const label = document.getElementById('b-label').value;
  const alt = document.getElementById('b-alt').value;

  try {
    const base64Img = await compressImage(file, 1200);

    await db.collection('banners').add({
      label, alt, url: base64Img, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    bannerForm.reset();
    showStatus('Banner Added!');
  } catch (error) {
    console.error(error);
    alert('Error uploading banner!');
  }

  btnAddBanner.disabled = false;
  btnAddBanner.textContent = "Add Banner";
});

window.deleteBanner = async (id) => {
  if(confirm('Are you sure you want to delete this banner?')) {
    await db.collection('banners').doc(id).delete();
  }
};

// Initialize Admin Data
function initAdmin() {
  loadCategories();
  loadProducts();
  loadBanners();
}

window.checkPin = () => {
  const pin = document.getElementById('admin-pin').value;
  if (pin === '8059' || pin === '1234') { // Using parts of their phone number as default PIN
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('main-admin-content').style.display = 'flex';
    initAdmin();
  } else {
    document.getElementById('pin-error').style.display = 'block';
  }
};




