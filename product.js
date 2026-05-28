const firebaseConfig = {
  apiKey: "AIzaSyAv8WZPd7k6oGAsGX10NPAOp6iuqU3QE1w",
  authDomain: "experime-3251a.firebaseapp.com",
  projectId: "experime-3251a",
  storageBucket: "experime-3251a.firebasestorage.app",
  messagingSenderId: "256324869428",
  appId: "1:256324869428:web:02a6392b90e77b2f805961"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  const loading = document.getElementById('product-loading');
  const errorNode = document.getElementById('product-error');
  const container = document.getElementById('product-container');

  if (!productId) {
    loading.style.display = 'none';
    errorNode.style.display = 'block';
    return;
  }

  try {
    const doc = await db.collection('products').doc(productId).get();
    if (!doc.exists) {
      loading.style.display = 'none';
      errorNode.style.display = 'block';
      return;
    }

    const p = doc.data();
    p.id = doc.id; // Store ID

    // Setup UI
    document.title = p.name + " - SRS Silk Traders";
    
    document.getElementById('main-img').src = p.img;
    document.getElementById('p-title').textContent = p.name;
    document.getElementById('p-price').textContent = "₹" + p.price;
    if (p.orig) {
      document.getElementById('p-orig').textContent = "₹" + p.orig;
    }
    document.getElementById('p-desc').textContent = p.desc || '';

    // Thumbnails (if any)
    const thumbContainer = document.getElementById('thumbnails');
    let allImages = [p.img];
    if (p.imgUrls && p.imgUrls.length > 0) {
      allImages = p.imgUrls;
    }
    
    thumbContainer.innerHTML = '';
    allImages.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.onclick = () => { document.getElementById('main-img').src = url; };
      thumbContainer.appendChild(img);
    });

    // Buttons
    const btnAddCart = document.getElementById('btn-add-cart');
    const btnWa = document.getElementById('btn-wa');
    const btnShare = document.getElementById('btn-share');

    if (p.inStock) {
      btnAddCart.onclick = () => {
        let cart = JSON.parse(localStorage.getItem('srs_cart') || '[]');
        const existing = cart.find(i => i.id === p.id);
        if (existing) {
          existing.qty++;
        } else {
          cart.push({ id: p.id, name: p.name, price: p.price, img: p.img, qty: 1 });
        }
        localStorage.setItem('srs_cart', JSON.stringify(cart));
        alert('Added to cart!');
        window.location.href = 'index.html#cart'; // Redirect to cart
      };
      
      btnWa.onclick = () => {
        const text = `Hi SRS Silk Traders, I am interested in this product:\n\n*` + p.name + `*\nPrice: ?` + p.price + `\nLink: ` + window.location.href;
        window.open('https://wa.me/919341218059?text=' + encodeURIComponent(text), '_blank');
      };
    } else {
      btnAddCart.textContent = "Sold Out";
      btnAddCart.style.background = "#ccc";
      btnAddCart.disabled = true;
      btnWa.textContent = "Notify me when back in stock (WhatsApp)";
      btnWa.onclick = () => {
        const text = `Hi SRS Silk Traders, please notify me when this product is back in stock:\n\n*` + p.name + `*\nLink: ` + window.location.href;
        window.open('https://wa.me/919341218059?text=' + encodeURIComponent(text), '_blank');
      };
    }

    if (navigator.share) {
      btnShare.onclick = () => {
        navigator.share({
          title: p.name,
          text: 'Check out ' + p.name + ' at SRS Silk Traders!',
          url: window.location.href
        }).catch(console.error);
      };
    } else {
      btnShare.onclick = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Product link copied to clipboard!');
      };
    }

    // Related Products
    loadRelatedProducts(p.cat, p.id);

    // Show container
    loading.style.display = 'none';
    container.style.display = 'flex';

  } catch (err) {
    console.error(err);
    loading.style.display = 'none';
    errorNode.style.display = 'block';
    errorNode.textContent = 'Error loading product details.';
  }
});

async function loadRelatedProducts(category, currentId) {
  try {
    const snap = await db.collection('products').where('cat', '==', category).limit(5).get();
    let related = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    related = related.filter(r => r.id !== currentId); // exclude current

    if (related.length > 0) {
      document.getElementById('related-container').style.display = 'block';
      const grid = document.getElementById('related-grid');
      grid.innerHTML = related.map(p => `
        <div class="product-card" onclick="window.location.href='product.html?id=${p.id}'" style="cursor:pointer; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <div class="product-img-wrap" style="position:relative;">
            <img src="${p.img}" alt="${p.name}" style="width: 100%; height: 250px; object-fit: cover;">
            ${!p.inStock ? '<div style="position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(255,255,255,0.7); display:flex; align-items:center; justify-content:center; font-weight:bold; color:red;">Out of Stock</div>' : ''}
          </div>
          <div class="product-info" style="padding: 15px;">
            <div class="product-title" style="font-weight:600; margin-bottom:5px;">${p.name}</div>
            <div class="product-price" style="color:#d4b896; font-weight:bold;">₹${p.price} <strike style="color:#999; font-size:12px; margin-left:5px;">₹${p.orig}</strike></div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error("Error loading related products", err);
  }
}



