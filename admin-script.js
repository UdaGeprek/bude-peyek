// Admin Script with Supabase Integration

// Check if admin is logged in
if (!sessionStorage.getItem('adminLoggedIn')) {
    window.location.href = 'login.html';
}

// Wait for Supabase client to be ready
function initAdmin() {
    if (!window.supabaseClient) {
        console.log('⏳ Waiting for Supabase client...');
        setTimeout(initAdmin, 100);
        return;
    }

    console.log('✅ Supabase client ready, initializing admin...');
    
    // Gunakan window.supabaseClient langsung (JANGAN deklarasi ulang)
    const supabase = window.supabaseClient;

    // State variables
    let products = [];
    let orders = [];
    let currentProductId = null;

    // Initialize - Load data from Supabase
    async function initializeAdmin() {

// ==================== PRODUCTS ====================

// Load products from Supabase
async function loadProductsFromDB() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        products = data || [];
    } catch (error) {
        console.error('Error loading products:', error);
        alert('Gagal memuat produk: ' + error.message);
    }
}

// Save/Update product to Supabase
async function saveProductToDB(productData, productId = null) {
    try {
        if (productId) {
            // Update existing product
            const { error } = await supabase
                .from('products')
                .update({
                    ...productData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', productId);

            if (error) throw error;
        } else {
            // Insert new product
            const { error } = await supabase
                .from('products')
                .insert([productData]);

            if (error) throw error;
        }

        await loadProductsFromDB();
        return true;
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Gagal menyimpan produk: ' + error.message);
        return false;
    }
}

// Delete product from Supabase
async function deleteProductFromDB(productId) {
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);

        if (error) throw error;

        await loadProductsFromDB();
        return true;
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Gagal menghapus produk: ' + error.message);
        return false;
    }
}

// Upload image to Supabase Storage
async function uploadImageToStorage(file) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { data, error } = await supabase.storage
            .from('product-images')
            .upload(filePath, file);

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

        return urlData.publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        // Fallback to Base64 if storage fails
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }
}

// ==================== ORDERS ====================

// Load orders from Supabase
async function loadOrdersFromDB() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        orders = data || [];
    } catch (error) {
        console.error('Error loading orders:', error);
        alert('Gagal memuat pesanan: ' + error.message);
    }
}

// Delete order from Supabase
async function deleteOrderFromDB(orderId) {
    try {
        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId);

        if (error) throw error;

        await loadOrdersFromDB();
        return true;
    } catch (error) {
        console.error('Error deleting order:', error);
        alert('Gagal menghapus pesanan: ' + error.message);
        return false;
    }
}

// ==================== UI FUNCTIONS ====================

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

        if (page === 'dashboard') loadDashboard();
        if (page === 'produk') loadProducts();
        if (page === 'pesanan') loadOrders();
    });
});

// Dashboard
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
    document.getElementById('topProducts').innerHTML = topProductsHtml || 
        '<div class="empty-state"><i class="fas fa-box"></i><p>Belum ada produk</p></div>';

    // Recent orders
    const recentOrdersHtml = orders.slice(0, 5).map(order => `
        <div class="order-item">
            <span>${order.customer_name}</span>
            <span>${new Date(order.created_at).toLocaleDateString('id-ID')}</span>
        </div>
    `).join('');
    document.getElementById('recentOrders').innerHTML = recentOrdersHtml || 
        '<div class="empty-state"><i class="fas fa-shopping-cart"></i><p>Belum ada pesanan</p></div>';
}

// Load Products Table
function loadProducts() {
    const tbody = document.getElementById('productTableBody');

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fas fa-box"></i><p>Belum ada produk</p></td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => `
        <tr>
            <td>
                ${product.image_url ? 
                    `<img src="${product.image_url}" alt="${product.name}" class="product-image-cell">` :
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
document.getElementById('productForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

    try {
        let imageUrl = null;
        const imageInput = document.getElementById('productImage');

        // Upload image if new file selected
        if (imageInput.files && imageInput.files[0]) {
            imageUrl = await uploadImageToStorage(imageInput.files[0]);
        } else if (currentProductId) {
            // Keep existing image
            const existingProduct = products.find(p => p.id === currentProductId);
            imageUrl = existingProduct?.image_url;
        }

        const productData = {
            name: document.getElementById('productName').value,
            description: document.getElementById('productDescription').value,
            price: parseInt(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value),
            icon: document.getElementById('productIcon').value || 'fa-box',
            badge: document.getElementById('productBadge').checked ? 
                   (document.getElementById('badgeText').value || null) : null,
            image_url: imageUrl,
            status: 'active'
        };

        const success = await saveProductToDB(productData, currentProductId);

        if (success) {
            loadProducts();
            closeModal();
            alert('Produk berhasil disimpan!');
        }
    } catch (error) {
        alert('Gagal menyimpan produk: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Simpan';
    }
});

// Edit Product
function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    currentProductId = id;
    document.getElementById('modalTitle').textContent = 'Edit Produk';
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productIcon').value = product.icon || '';
    document.getElementById('productBadge').checked = !!product.badge;
    document.getElementById('badgeText').value = product.badge || '';
    document.getElementById('badgeTextGroup').style.display = product.badge ? 'block' : 'none';

    if (product.image_url) {
        document.getElementById('imagePreview').innerHTML = 
            `<img src="${product.image_url}" alt="Preview">`;
    } else {
        document.getElementById('imagePreview').innerHTML = 
            '<i class="fas fa-image"></i><p>Klik untuk upload gambar</p>';
    }

    document.getElementById('productModal').classList.add('active');
}

// Delete Product
async function deleteProduct(id) {
    if (confirm('Yakin ingin menghapus produk ini?')) {
        const success = await deleteProductFromDB(id);
        if (success) {
            loadProducts();
            alert('Produk berhasil dihapus!');
        }
    }
}

// Modal Close
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);

function closeModal() {
    document.getElementById('productModal').classList.remove('active');
}

document.getElementById('productModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// Load Orders Table
function loadOrders() {
    const tbody = document.getElementById('orderTableBody');
    const filterStatus = document.getElementById('filterStatus').value;

    let filteredOrders = orders;
    if (filterStatus !== 'all') {
        filteredOrders = orders.filter(o => o.status === filterStatus);
    }

    if (filteredOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-shopping-cart"></i><p>Belum ada pesanan</p></td></tr>';
        return;
    }

    tbody.innerHTML = filteredOrders.map(order => `
        <tr>
            <td>#${order.id}</td>
            <td>${order.customer_name}</td>
            <td>${order.product_name}</td>
            <td>${order.quantity}</td>
            <td>${formatCurrency(order.total)}</td>
            <td>
                <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
            </td>
            <td>${new Date(order.created_at).toLocaleDateString('id-ID')}</td>
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

document.getElementById('filterStatus').addEventListener('change', loadOrders);

// View Order
function viewOrder(id) {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    const content = `
        <div style="padding: 1.5rem;">
            <div style="margin-bottom: 1rem;"><strong>ID Pesanan:</strong> #${order.id}</div>
            <div style="margin-bottom: 1rem;"><strong>Nama:</strong> ${order.customer_name}</div>
            <div style="margin-bottom: 1rem;"><strong>Telepon:</strong> ${order.phone}</div>
            <div style="margin-bottom: 1rem;"><strong>Email:</strong> ${order.email || '-'}</div>
            <div style="margin-bottom: 1rem;"><strong>Alamat:</strong> ${order.address}</div>
            <div style="margin-bottom: 1rem;"><strong>Produk:</strong> ${order.product_name}</div>
            <div style="margin-bottom: 1rem;"><strong>Jumlah:</strong> ${order.quantity} pack</div>
            <div style="margin-bottom: 1rem;"><strong>Total:</strong> ${formatCurrency(order.total)}</div>
            <div style="margin-bottom: 1rem;"><strong>Catatan:</strong> ${order.notes || '-'}</div>
            <div style="margin-bottom: 1rem;"><strong>Status:</strong> <span class="status-badge ${order.status}">${getStatusText(order.status)}</span></div>
            <div><strong>Tanggal:</strong> ${new Date(order.created_at).toLocaleString('id-ID')}</div>
        </div>
    `;

    document.getElementById('orderDetailContent').innerHTML = content;
    document.getElementById('orderModal').classList.add('active');
}

// Delete Order
async function deleteOrder(id) {
    if (confirm('Yakin ingin menghapus pesanan ini?')) {
        const success = await deleteOrderFromDB(id);
        if (success) {
            loadOrders();
            alert('Pesanan berhasil dihapus!');
        }
    }
}

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

// Logout
document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('Yakin ingin logout?')) {
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminUsername');
        window.location.href = 'login.html';
    }
});

// Menu toggle
document.getElementById('menuToggle').addEventListener('click', function() {
    document.querySelector('.admin-sidebar').classList.toggle('active');
});

// Admin name
document.getElementById('adminName').textContent = sessionStorage.getItem('adminUsername') || 'Admin';

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

// Initialize when page loads
initializeAdmin();
