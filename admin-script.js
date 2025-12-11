// Check if admin is logged in
if (!sessionStorage.getItem('adminLoggedIn')) {
    window.location.href = 'login.html';
}

// Initialize data structures
let products = JSON.parse(localStorage.getItem('products')) || [];
let orders = JSON.parse(localStorage.getItem('orders')) || [];

// Initialize default products if empty
if (products.length === 0) {
    products = [
        {
            id: 1,
            name: 'Peyek Kacang',
            description: 'Peyek klasik dengan kacang tanah pilihan yang gurih dan renyah',
            price: 15000,
            stock: 50,
            icon: 'fa-pepper-hot',
            badge: 'Best Seller',
            image: null,
            status: 'active'
        },
        {
            id: 2,
            name: 'Peyek Teri',
            description: 'Kombinasi sempurna antara teri nasi segar dengan bumbu tradisional',
            price: 18000,
            stock: 30,
            icon: 'fa-fish',
            badge: null,
            image: null,
            status: 'active'
        },
        {
            id: 3,
            name: 'Peyek Kedelai',
            description: 'Peyek kedelai pilihan dengan tekstur renyah dan rasa gurih alami',
            price: 12000,
            stock: 40,
            icon: 'fa-seedling',
            badge: null,
            image: null,
            status: 'active'
        },
        {
            id: 4,
            name: 'Peyek Udang',
            description: 'Peyek premium dengan udang segar berkualitas tinggi',
            price: 25000,
            stock: 20,
            icon: 'fa-shrimp',
            badge: 'Premium',
            image: null,
            status: 'active'
        },
        {
            id: 5,
            name: 'Peyek Bayam',
            description: 'Peyek sehat dengan bayam segar, cocok untuk camilan bergizi',
            price: 14000,
            stock: 35,
            icon: 'fa-leaf',
            badge: null,
            image: null,
            status: 'active'
        },
        {
            id: 6,
            name: 'Peyek Jagung',
            description: 'Peyek manis dan gurih dari jagung pipil pilihan',
            price: 13000,
            stock: 45,
            icon: 'fa-sun',
            badge: null,
            image: null,
            status: 'active'
        }
    ];
    saveProducts();
}

// Save functions
function saveProducts() {
    localStorage.setItem('products', JSON.stringify(products));
    updateWebsiteProducts();
}

function saveOrders() {
    localStorage.setItem('orders', JSON.stringify(orders));
}

function updateWebsiteProducts() {
    localStorage.setItem('websiteProducts', JSON.stringify(products.filter(p => p.status === 'active')));
}

// Navigation
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.admin-page');
const pageTitle = document.getElementById('pageTitle');

navItems.forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        const page = this.dataset.page;

        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');

        pages.forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}-page`).classList.add('active');

        pageTitle.textContent = this.querySelector('span').textContent;

        // Load data for specific page
        if (page === 'dashboard') loadDashboard();
        if (page === 'produk') loadProducts();
        if (page === 'pesanan') loadOrders();
    });
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('Yakin ingin logout?')) {
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminUsername');
        window.location.href = 'login.html';
    }
});

// Menu toggle for mobile
document.getElementById('menuToggle').addEventListener('click', function() {
    document.querySelector('.admin-sidebar').classList.toggle('active');
});

// Admin name
document.getElementById('adminName').textContent = sessionStorage.getItem('adminUsername') || 'Admin';

// Dashboard Functions
function loadDashboard() {
    const activeProducts = products.filter(p => p.status === 'active');
    const lowStock = products.filter(p => p.stock < 10);
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

    document.getElementById('totalProduk').textContent = activeProducts.length;
    document.getElementById('totalPesanan').textContent = orders.length;
    document.getElementById('stokRendah').textContent = lowStock.length;
    document.getElementById('totalPendapatan').textContent = formatCurrency(totalRevenue);

    // Top products
    const topProductsHtml = activeProducts.slice(0, 5).map(product => `
        <div class="product-item">
            <span>${product.name}</span>
            <span>${formatCurrency(product.price)}</span>
        </div>
    `).join('');
    document.getElementById('topProducts').innerHTML = topProductsHtml || '<div class="empty-state"><p>Belum ada data produk</p></div>';

    // Recent orders
    const recentOrdersHtml = orders.slice(-5).reverse().map(order => `
        <div class="order-item">
            <span>${order.customerName}</span>
            <span>${new Date(order.date).toLocaleDateString('id-ID')}</span>
        </div>
    `).join('');
    document.getElementById('recentOrders').innerHTML = recentOrdersHtml || '<div class="empty-state"><p>Belum ada pesanan</p></div>';
}

// Product Management
let currentProductId = null;

function loadProducts() {
    const tbody = document.getElementById('productTableBody');

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>Belum ada produk</p></td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => `
        <tr>
            <td>
                ${product.image ? 
                    `<img src="${product.image}" alt="${product.name}" class="product-image-cell">` :
                    `<div class="product-icon-cell"><i class="fas ${product.icon}"></i></div>`
                }
            </td>
            <td>${product.name}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>${product.stock}</td>
            <td>
                <span class="status-badge ${product.status}">
                    ${product.status === 'active' ? 'Aktif' : 'Nonaktif'}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon edit" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Add Product Button
document.getElementById('addProductBtn').addEventListener('click', function() {
    currentProductId = null;
    document.getElementById('modalTitle').textContent = 'Tambah Produk';
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').innerHTML = '<i class="fas fa-image"></i><p>Klik untuk upload gambar</p>';
    document.getElementById('productModal').classList.add('active');
});

// Image upload
document.getElementById('imagePreview').addEventListener('click', function() {
    document.getElementById('productImage').click();
});

document.getElementById('productImage').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('imagePreview').innerHTML = 
                `<img src="${event.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }
});

// Badge checkbox
document.getElementById('productBadge').addEventListener('change', function() {
    document.getElementById('badgeTextGroup').style.display = this.checked ? 'block' : 'none';
});

// Product Form Submit
document.getElementById('productForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const imageInput = document.getElementById('productImage');
    const imagePreview = document.getElementById('imagePreview').querySelector('img');
    const imageData = imagePreview ? imagePreview.src : null;

    const productData = {
        name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        price: parseInt(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        icon: document.getElementById('productIcon').value || 'fa-box',
        badge: document.getElementById('productBadge').checked ? 
               (document.getElementById('badgeText').value || 'New') : null,
        image: imageData,
        status: 'active'
    };

    if (currentProductId) {
        // Update existing product
        const index = products.findIndex(p => p.id === currentProductId);
        products[index] = { ...products[index], ...productData };
    } else {
        // Add new product
        productData.id = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        products.push(productData);
    }

    saveProducts();
    loadProducts();
    closeModal();
    alert('Produk berhasil disimpan!');
});

// Edit Product
function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    currentProductId = id;
    document.getElementById('modalTitle').textContent = 'Edit Produk';
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productIcon').value = product.icon;
    document.getElementById('productBadge').checked = !!product.badge;
    document.getElementById('badgeText').value = product.badge || '';
    document.getElementById('badgeTextGroup').style.display = product.badge ? 'block' : 'none';

    if (product.image) {
        document.getElementById('imagePreview').innerHTML = 
            `<img src="${product.image}" alt="Preview">`;
    } else {
        document.getElementById('imagePreview').innerHTML = 
            '<i class="fas fa-image"></i><p>Klik untuk upload gambar</p>';
    }

    document.getElementById('productModal').classList.add('active');
}

// Delete Product
function deleteProduct(id) {
    if (confirm('Yakin ingin menghapus produk ini?')) {
        products = products.filter(p => p.id !== id);
        saveProducts();
        loadProducts();
        alert('Produk berhasil dihapus!');
    }
}

// Modal Close
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);

function closeModal() {
    document.getElementById('productModal').classList.remove('active');
}

// Close modal on outside click
document.getElementById('productModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// Order Management
function loadOrders() {
    const tbody = document.getElementById('orderTableBody');
    const filterStatus = document.getElementById('filterStatus').value;

    let filteredOrders = orders;
    if (filterStatus !== 'all') {
        filteredOrders = orders.filter(o => o.status === filterStatus);
    }

    if (filteredOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><p>Belum ada pesanan</p></td></tr>';
        return;
    }

    tbody.innerHTML = filteredOrders.map(order => `
        <tr>
            <td>#${order.id}</td>
            <td>${order.customerName}</td>
            <td>${order.productName}</td>
            <td>${order.quantity}</td>
            <td>${formatCurrency(order.total)}</td>
            <td>
                <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
            </td>
            <td>${new Date(order.date).toLocaleDateString('id-ID')}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon view" onclick="viewOrder(${order.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteOrder(${order.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Filter orders
document.getElementById('filterStatus').addEventListener('change', loadOrders);

// View Order
function viewOrder(id) {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    const content = `
        <div style="padding: 1.5rem;">
            <div style="margin-bottom: 1rem;">
                <strong>ID Pesanan:</strong> #${order.id}
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Nama Pelanggan:</strong> ${order.customerName}
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Telepon:</strong> ${order.phone}
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Email:</strong> ${order.email || '-'}
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Alamat:</strong> ${order.address}
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Produk:</strong> ${order.productName}
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Jumlah:</strong> ${order.quantity} pack
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Total:</strong> ${formatCurrency(order.total)}
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Catatan:</strong> ${order.notes || '-'}
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Status:</strong> <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div>
                <strong>Tanggal:</strong> ${new Date(order.date).toLocaleString('id-ID')}
            </div>
        </div>
    `;

    document.getElementById('orderDetailContent').innerHTML = content;
    document.getElementById('orderModal').classList.add('active');
}

// Delete Order
function deleteOrder(id) {
    if (confirm('Yakin ingin menghapus pesanan ini?')) {
        orders = orders.filter(o => o.id !== id);
        saveOrders();
        loadOrders();
        alert('Pesanan berhasil dihapus!');
    }
}

// Close order modal
document.getElementById('closeOrderModal').addEventListener('click', function() {
    document.getElementById('orderModal').classList.remove('active');
});

document.getElementById('orderModal').addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('active');
});

// Settings
document.getElementById('storeInfoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Informasi toko berhasil diperbarui!');
});

document.getElementById('changePasswordForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    const adminData = JSON.parse(localStorage.getItem('adminCredentials')) || {
        username: 'admin',
        password: 'admin123'
    };

    if (oldPassword !== adminData.password) {
        alert('Password lama salah!');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('Konfirmasi password tidak cocok!');
        return;
    }

    if (newPassword.length < 6) {
        alert('Password minimal 6 karakter!');
        return;
    }

    adminData.password = newPassword;
    localStorage.setItem('adminCredentials', JSON.stringify(adminData));

    alert('Password berhasil diubah!');
    this.reset();
});

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Pending',
        'processing': 'Diproses',
        'completed': 'Selesai',
        'cancelled': 'Dibatalkan'
    };
    return statusMap[status] || status;
}

// Initialize dashboard on load
loadDashboard();
