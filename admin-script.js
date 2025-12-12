// Admin Script with Supabase Integration

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

    // Auth: memastikan admin sudah login via Supabase Auth
    async function requireAuth() {
        try {
            const { data, error } = await supabase.auth.getUser();
            if (error || !data || !data.user) {
                console.warn('User belum login atau sesi habis, redirect ke login.');
                window.location.href = 'login.html';
                throw new Error('Not authenticated');
            }
            return data.user;
        } catch (err) {
            console.error('Error saat cek auth:', err);
            window.location.href = 'login.html';
            throw err;
        }
    }

    // State variables
    let products = [];
    let orders = [];
    let currentProductId = null;

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

    // Format currency (Rupiah)
    function formatCurrency(amount) {
        if (!amount) amount = 0;
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    // Render product table
    function renderProductTable() {
        const tbody = document.getElementById('productTableBody');
        tbody.innerHTML = '';

        if (!products.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">Belum ada produk tersedia</td>
                </tr>
            `;
            return;
        }

        products.forEach((product, index) => {
            const row = document.createElement('tr');
            const stockDisplay = product.stock !== null && product.stock !== undefined ? product.stock : '-';

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <div class="product-info">
                        <div class="product-icon">
                            <i class="fas ${product.icon || 'fa-cookie'}"></i>
                        </div>
                        <div>
                            <strong>${product.name}</strong>
                            <p>${product.description || '-'}</p>
                        </div>
                    </div>
                </td>
                <td>${formatCurrency(product.price)}</td>
                <td>${product.unit || 'pack'}</td>
                <td>${stockDisplay}</td>
                <td>
                    <span class="badge ${product.status === 'active' ? 'badge-success' : 'badge-secondary'}">
                        ${product.status === 'active' ? 'Aktif' : 'Non-aktif'}
                    </span>
                </td>
                <td>
                    ${product.badge ? `<span class="badge badge-warning">${product.badge}</span>` : '-'}
                </td>
                <td>
                    <button class="btn-table btn-edit" data-id="${product.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-table btn-delete" data-id="${product.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });

        // Attach event listeners
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                openEditProductModal(id);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const confirmed = confirm('Yakin ingin menghapus produk ini?');
                if (!confirmed) return;

                const success = await deleteProductFromDB(id);
                if (success) {
                    alert('Produk berhasil dihapus!');
                    renderProductTable();
                    updateDashboard();
                }
            });
        });
    }

    // Open Add Product Modal
    function openAddProductModal() {
        currentProductId = null;
        document.getElementById('modalTitle').textContent = 'Tambah Produk Baru';
        document.getElementById('productForm').reset();
        document.getElementById('imagePreview').innerHTML = '<i class="fas fa-image"></i><p>Klik untuk upload gambar</p>';
        
        document.getElementById('productModal').classList.add('active');
        document.getElementById('modalOverlay').classList.add('active');
    }

    // Open Edit Product Modal
    function openEditProductModal(productId) {
        currentProductId = productId;
        const product = products.find(p => p.id === productId || String(p.id) === String(productId));

        if (!product) {
            alert('Produk tidak ditemukan!');
            return;
        }

        document.getElementById('modalTitle').textContent = 'Edit Produk';

        document.getElementById('productName').value = product.name || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.price || 0;
        document.getElementById('productUnit').value = product.unit || 'pack';
        document.getElementById('productStock').value = product.stock ?? '';
        document.getElementById('productStatus').value = product.status || 'active';
        document.getElementById('productBadge').value = product.badge || '';
        document.getElementById('productIcon').value = product.icon || 'fa-cookie';

        if (product.image_url) {
            document.getElementById('imagePreview').innerHTML = 
                `<img src="${product.image_url}" alt="Preview">`;
        } else {
            document.getElementById('imagePreview').innerHTML = 
                '<i class="fas fa-image"></i><p>Klik untuk upload gambar</p>';
        }

        document.getElementById('productModal').classList.add('active');
        document.getElementById('modalOverlay').classList.add('active');
    }

    // Close Product Modal
    function closeProductModal() {
        document.getElementById('productModal').classList.remove('active');
        document.getElementById('modalOverlay').classList.remove('active');
    }

    // Handle product form submission
    document.getElementById('productForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const name = document.getElementById('productName').value.trim();
        const description = document.getElementById('productDescription').value.trim();
        const price = parseInt(document.getElementById('productPrice').value) || 0;
        const unit = document.getElementById('productUnit').value;
        const stock = parseInt(document.getElementById('productStock').value) || 0;
        const status = document.getElementById('productStatus').value;
        const badge = document.getElementById('productBadge').value.trim();
        const icon = document.getElementById('productIcon').value || 'fa-cookie';
        const imageInput = document.getElementById('productImage');

        if (!name || !price) {
            alert('Nama dan harga produk wajib diisi!');
            return;
        }

        let image_url = null;

        if (imageInput.files && imageInput.files[0]) {
            try {
                const uploadedUrl = await uploadImageToStorage(imageInput.files[0]);
                image_url = uploadedUrl;
            } catch (error) {
                console.error('Error uploading image:', error);
                alert('Gagal mengupload gambar: ' + error.message);
                return;
            }
        }

        const productData = {
            name,
            description,
            price,
            unit,
            stock,
            status,
            badge: badge || null,
            icon
        };

        if (image_url) {
            productData.image_url = image_url;
        }

        const success = await saveProductToDB(productData, currentProductId);
        if (success) {
            alert(`Produk berhasil ${currentProductId ? 'diperbarui' : 'ditambahkan'}!`);
            closeProductModal();
            renderProductTable();
            updateDashboard();
        }
    });

    // Image Preview Handler
    document.getElementById('productImage').addEventListener('change', function() {
        const file = this.files[0];
        const preview = document.getElementById('imagePreview');

        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = '<i class="fas fa-image"></i><p>Klik untuk upload gambar</p>';
        }
    });

    // Upload image to Supabase Storage
    async function uploadImageToStorage(file) {
        const bucketName = 'product-images';

        try {
            // Generate unique filename
            const timestamp = Date.now();
            const fileExt = file.name.split('.').pop();
            const fileName = `product-${timestamp}.${fileExt}`;

            // Upload image
            const { data, error } = await supabase.storage
                .from(bucketName)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(data.path);

            return urlData.publicUrl;
        } catch (error) {
            console.error('Error uploading to Supabase storage:', error);
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

    // Render orders table
    function renderOrderTable() {
        const tbody = document.getElementById('orderTableBody');
        tbody.innerHTML = '';

        if (!orders.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">Belum ada pesanan</td>
                </tr>
            `;
            return;
        }

        const filterStatus = document.getElementById('filterStatus').value;
        const filterDate = document.getElementById('filterDate').value;

        let filteredOrders = [...orders];

        // Filter status
        if (filterStatus !== 'all') {
            filteredOrders = filteredOrders.filter(order => order.status === filterStatus);
        }

        // Filter date
        const today = new Date();
        if (filterDate === 'today') {
            filteredOrders = filteredOrders.filter(order => {
                const orderDate = new Date(order.created_at);
                return orderDate.toDateString() === today.toDateString();
            });
        } else if (filterDate === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(today.getDate() - 7);
            filteredOrders = filteredOrders.filter(order => {
                const orderDate = new Date(order.created_at);
                return orderDate >= weekAgo && orderDate <= today;
            });
        } else if (filterDate === 'month') {
            const monthAgo = new Date();
            monthAgo.setMonth(today.getMonth() - 1);
            filteredOrders = filteredOrders.filter(order => {
                const orderDate = new Date(order.created_at);
                return orderDate >= monthAgo && orderDate <= today;
            });
        }

        if (!filteredOrders.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">Tidak ada pesanan sesuai filter</td>
                </tr>
            `;
            return;
        }

        filteredOrders.forEach((order, index) => {
            const row = document.createElement('tr');
            const statusClass = getStatusClass(order.status);

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <strong>${order.customer_name}</strong><br>
                    <small>${order.phone}</small>
                </td>
                <td>
                    ${order.product_name}<br>
                    <small>${order.quantity}x</small>
                </td>
                <td>${formatCurrency(order.total)}</td>
                <td>${order.address || '-'}</td>
                <td>
                    <span class="badge ${statusClass}">
                        ${order.status || 'baru'}
                    </span>
                </td>
                <td>${new Date(order.created_at).toLocaleString('id-ID')}</td>
                <td>
                    <button class="btn-table btn-detail" data-id="${order.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <a href="https://wa.me/62${(order.phone || '').replace(/^0/, '')}" target="_blank" class="btn-table btn-wa">
                        <i class="fab fa-whatsapp"></i>
                    </a>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    function getStatusClass(status) {
        switch (status) {
            case 'baru':
                return 'badge-primary';
            case 'diproses':
                return 'badge-warning';
            case 'selesai':
                return 'badge-success';
            case 'batal':
                return 'badge-danger';
            default:
                return 'badge-secondary';
        }
    }

    // ==================== DASHBOARD ====================

    function loadDashboard() {
        const totalProducts = products.length;
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

        document.getElementById('topProducts').innerHTML = topProductsHtml || '<p>Belum ada produk populer.</p>';

        // Recent orders
        const recentOrdersHtml = orders.slice(0, 5).map(order => `
            <div class="order-item">
                <div>
                    <strong>${order.customer_name}</strong>
                    <p>${order.product_name}</p>
                </div>
                <div>
                    <span class="badge ${getStatusClass(order.status)}">${order.status || 'baru'}</span>
                    <p>${formatCurrency(order.total)}</p>
                </div>
            </div>
        `).join('');

        document.getElementById('recentOrders').innerHTML = recentOrdersHtml || '<p>Belum ada pesanan terbaru.</p>';
    }

    // ==================== FILTER & EVENT HANDLERS ====================

    document.getElementById('filterStatus').addEventListener('change', () => {
        renderOrderTable();
    });

    document.getElementById('filterDate').addEventListener('change', () => {
        renderOrderTable();
    });

    // Modal buttons
    document.getElementById('btnAddProduct').addEventListener('click', openAddProductModal);
    document.getElementById('btnCloseModal').addEventListener('click', closeProductModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeProductModal);
    document.getElementById('modalOverlay').addEventListener('click', closeProductModal);

    // ==================== TOKO SETTINGS ====================

    const storeForm = document.getElementById('storeForm');
    if (storeForm) {
        // Load initial values
        document.getElementById('storeName').value = localStorage.getItem('storeName') || 'Bude Peyek';
        document.getElementById('storePhone').value = localStorage.getItem('storePhone') || '083169352889';
        document.getElementById('storeAddress').value = localStorage.getItem('storeAddress') || 'Bandar Lampung, Indonesia';
        document.getElementById('storeEmail').value = localStorage.getItem('storeEmail') || 'budepyek@contoh.com';

        storeForm.addEventListener('submit', function(e) {
            e.preventDefault();

            localStorage.setItem('storeName', document.getElementById('storeName').value);
            localStorage.setItem('storePhone', document.getElementById('storePhone').value);
            localStorage.setItem('storeAddress', document.getElementById('storeAddress').value);
            localStorage.setItem('storeEmail', document.getElementById('storeEmail').value);
            
            alert('Informasi toko berhasil diperbarui!');
        });
    }

    // ==================== UBAH PASSWORD (Supabase Auth) ====================

    // Ganti password admin via Supabase Auth
    document.getElementById('changePasswordForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const oldPassword = document.getElementById('oldPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!oldPassword || !newPassword || !confirmPassword) {
            alert('Semua field password wajib diisi!');
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

        try {
            // Ambil user yang sedang login dari Supabase Auth
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData || !userData.user) {
                console.error('Gagal mengambil user saat ubah password:', userError);
                alert('Sesi login sudah habis, silakan login ulang.');
                window.location.href = 'login.html';
                return;
            }

            const email = userData.user.email;
            if (!email) {
                alert('Akun admin tidak memiliki email. Pastikan akun dibuat melalui Supabase Auth.');
                return;
            }

            // Verifikasi password lama dengan sign in ulang
            const { error: reauthError } = await supabase.auth.signInWithPassword({
                email,
                password: oldPassword
            });

            if (reauthError) {
                console.error('Reauth error:', reauthError);
                alert('Password lama salah!');
                return;
            }

            // Update password baru
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) {
                console.error('Update password error:', updateError);
                alert('Gagal mengubah password: ' + updateError.message);
                return;
            }

            alert('Password berhasil diubah!');
            this.reset();
        } catch (err) {
            console.error('Unexpected error saat ubah password:', err);
            alert('Terjadi kesalahan saat mengubah password. Silakan coba lagi.');
        }
    });

    // ==================== LOGOUT & UI ====================

    // Logout via Supabase Auth
    document.getElementById('logoutBtn').addEventListener('click', async function() {
        if (!confirm('Yakin ingin logout?')) return;

        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('Error saat logout:', err);
        }

        // Bersihkan sessionStorage lama bila masih dipakai UI
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminUsername');

        window.location.href = 'login.html';
    });

    // Menu toggle
    document.getElementById('menuToggle').addEventListener('click', function() {
        document.querySelector('.admin-sidebar').classList.toggle('active');
    });

    // Admin name - ambil dari Supabase Auth jika ada
    (async () => {
        const el = document.getElementById('adminName');
        if (!el) return;
        try {
            const { data, error } = await supabase.auth.getUser();
            if (!error && data && data.user) {
                el.textContent = data.user.email || (data.user.user_metadata && data.user.user_metadata.full_name) || 'Admin';
            } else {
                el.textContent = sessionStorage.getItem('adminUsername') || 'Admin';
            }
        } catch (err) {
            console.error('Gagal mengambil data admin:', err);
            el.textContent = sessionStorage.getItem('adminUsername') || 'Admin';
        }
    })();

    // Initialize - cek auth lalu load data dari Supabase
    async function initializeAdmin() {
        const user = await requireAuth();
        console.log('Admin login sebagai:', user.email || user.id);
        await loadProductsFromDB();
        await loadOrdersFromDB();
        loadDashboard();
    }

    // Initialize when everything is ready
    initializeAdmin();
}

// Start initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}
