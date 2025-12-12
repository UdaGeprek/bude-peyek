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

    // State variables
    let products = [];
    let orders = [];
    let selectedProductId = null;

    // === DOM ELEMENTS ===
    const productForm = document.getElementById('productForm');
    const productTableBody = document.getElementById('productTableBody');
    const productModal = document.getElementById('productModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const btnAddProduct = document.getElementById('btnAddProduct');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelModal = document.getElementById('btnCancelModal');
    const productImagePreview = document.getElementById('productImagePreview');
    const productImageInput = document.getElementById('productImage');

    const dashboardTotalProducts = document.getElementById('dashboardTotalProducts');
    const dashboardTotalOrders = document.getElementById('dashboardTotalOrders');
    const dashboardTotalRevenue = document.getElementById('dashboardTotalRevenue');
    const dashboardLatestOrder = document.getElementById('dashboardLatestOrder');

    const orderTableBody = document.getElementById('orderTableBody');
    const filterStatus = document.getElementById('filterStatus');
    const filterDate = document.getElementById('filterDate');

    const menuItems = document.querySelectorAll('.sidebar-menu li');
    const sections = document.querySelectorAll('.admin-section');

    // Helper: format rupiah
    function formatRupiah(amount) {
        if (!amount) amount = 0;
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    // Helper: show section
    function showSection(sectionId) {
        sections.forEach(section => {
            section.style.display = section.id === sectionId ? 'block' : 'none';
        });

        menuItems.forEach(item => {
            item.classList.toggle('active', item.dataset.target === sectionId);
        });
    }

    // Initialize default section
    showSection('dashboardSection');

    // Sidebar menu click handler
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.target;
            showSection(target);
        });
    });

    // ==================== PRODUCTS ====================

    // Load products from Supabase
    async function loadProductsFromDB() {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            products = data || [];
            renderProductTable();
            updateDashboard();
        } catch (err) {
            console.error('Error loading products:', err);
            alert('Gagal memuat data produk dari server.');
        }
    }

    function renderProductTable() {
        productTableBody.innerHTML = '';

        if (!products || products.length === 0) {
            productTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center;">Belum ada produk.</td>
                </tr>
            `;
            return;
        }

        products.forEach((product, index) => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <div class="product-info">
                        <div>
                            <strong>${product.name}</strong><br>
                            <small>${product.description || '-'}</small>
                        </div>
                    </div>
                </td>
                <td>${formatRupiah(product.price)}</td>
                <td>${product.unit || 'pack'}</td>
                <td>${product.stock ?? '-'}</td>
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

            productTableBody.appendChild(tr);
        });

        // Add event listeners for edit & delete buttons
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = btn.getAttribute('data-id');
                openEditProductModal(productId);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = btn.getAttribute('data-id');
                deleteProduct(productId);
            });
        });
    }

    function openAddProductModal() {
        selectedProductId = null;
        modalTitle.textContent = 'Tambah Produk Baru';
        productForm.reset();
        productImagePreview.innerHTML = '<span>Preview gambar produk</span>';
        openModal();
    }

    function openEditProductModal(productId) {
        selectedProductId = productId;
        const product = products.find(p => String(p.id) === String(productId));

        if (!product) {
            alert('Produk tidak ditemukan.');
            return;
        }

        modalTitle.textContent = 'Edit Produk';
        
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.price || 0;
        document.getElementById('productUnit').value = product.unit || 'pack';
        document.getElementById('productStock').value = product.stock ?? '';
        document.getElementById('productStatus').value = product.status || 'active';
        document.getElementById('productBadge').value = product.badge || '';
        document.getElementById('productIcon').value = product.icon || 'fa-cookie';

        if (product.image_url) {
            productImagePreview.innerHTML = `
                <img src="${product.image_url}" alt="${product.name}">
            `;
        } else {
            productImagePreview.innerHTML = '<span>Preview gambar produk</span>';
        }

        openModal();
    }

    function openModal() {
        productModal.classList.add('active');
        modalOverlay.classList.add('active');
        document.body.classList.add('no-scroll');
    }

    function closeModal() {
        productModal.classList.remove('active');
        modalOverlay.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }

    // Handle modal buttons
    btnAddProduct.addEventListener('click', openAddProductModal);
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    // Handle image preview
    productImageInput.addEventListener('change', function() {
        const file = this.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = function(e) {
                productImagePreview.innerHTML = `
                    <img src="${e.target.result}" alt="Preview Produk">
                `;
            };

            reader.readAsDataURL(file);
        } else {
            productImagePreview.innerHTML = '<span>Preview gambar produk</span>';
        }
    });

    async function uploadImageToSupabase(file) {
        if (!file) return null;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `product-images/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            return publicUrlData.publicUrl;
        } catch (err) {
            console.error('Error uploading image:', err);
            alert('Gagal mengupload gambar. Pastikan bucket storage sudah disiapkan.');
            return null;
        }
    }

    productForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const productName = document.getElementById('productName').value.trim();
        const productDescription = document.getElementById('productDescription').value.trim();
        const productPrice = parseInt(document.getElementById('productPrice').value) || 0;
        const productUnit = document.getElementById('productUnit').value;
        const productStock = parseInt(document.getElementById('productStock').value) || 0;
        const productStatus = document.getElementById('productStatus').value;
        const productBadge = document.getElementById('productBadge').value.trim();
        const productIcon = document.getElementById('productIcon').value;
        const imageFile = productImageInput.files[0];

        if (!productName || !productPrice) {
            alert('Nama dan harga produk wajib diisi.');
            return;
        }

        let imageUrl = null;
        if (imageFile) {
            imageUrl = await uploadImageToSupabase(imageFile);
            if (!imageUrl) return;
        }

        const productData = {
            name: productName,
            description: productDescription,
            price: productPrice,
            unit: productUnit,
            stock: productStock,
            status: productStatus,
            badge: productBadge || null,
            icon: productIcon || 'fa-cookie'
        };

        if (imageUrl) {
            productData.image_url = imageUrl;
        }

        try {
            if (selectedProductId) {
                const { error } = await supabase
                    .from('products')
                    .update({
                        ...productData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', selectedProductId);

                if (error) throw error;
                alert('Produk berhasil diperbarui!');
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([productData]);

                if (error) throw error;
                alert('Produk baru berhasil ditambahkan!');
            }

            await loadProductsFromDB();
            closeModal();
        } catch (err) {
            console.error('Error saving product:', err);
            alert('Gagal menyimpan data produk.');
        }
    });

    async function deleteProduct(productId) {
        const product = products.find(p => String(p.id) === String(productId));
        if (!product) {
            alert('Produk tidak ditemukan.');
            return;
        }

        if (!confirm(`Yakin ingin menghapus produk "${product.name}"?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;

            alert('Produk berhasil dihapus.');
            await loadProductsFromDB();
        } catch (err) {
            console.error('Error deleting product:', err);
            alert('Gagal menghapus produk.');
        }
    }

    // ==================== ORDERS ====================

    async function loadOrdersFromDB() {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            orders = data || [];
            renderOrderTable();
            updateDashboard();
        } catch (err) {
            console.error('Error loading orders:', err);
            alert('Gagal memuat data pesanan.');
        }
    }

    function renderOrderTable() {
        orderTableBody.innerHTML = '';

        if (!orders || orders.length === 0) {
            orderTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center;">Belum ada pesanan.</td>
                </tr>
            `;
            return;
        }

        const statusFilter = filterStatus.value;
        const dateFilter = filterDate.value;

        let filteredOrders = orders;

        if (statusFilter) {
            filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
        }

        if (dateFilter) {
            const today = new Date();
            let startDate, endDate;

            if (dateFilter === 'today') {
                startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            } else if (dateFilter === 'week') {
                const firstDayOfWeek = today.getDate() - today.getDay();
                startDate = new Date(today.getFullYear(), today.getMonth(), firstDayOfWeek);
                endDate = new Date(today.getFullYear(), today.getMonth(), firstDayOfWeek + 7);
            } else if (dateFilter === 'month') {
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            }

            if (startDate && endDate) {
                filteredOrders = filteredOrders.filter(order => {
                    const orderDate = new Date(order.created_at);
                    return orderDate >= startDate && orderDate < endDate;
                });
            }
        }

        if (!filteredOrders.length) {
            orderTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center;">Tidak ada pesanan yang cocok dengan filter.</td>
                </tr>
            `;
            return;
        }

        filteredOrders.forEach((order, index) => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <strong>${order.customer_name}</strong><br>
                    <small>${order.phone}</small>
                </td>
                <td>${order.product_name}</td>
                <td>${order.quantity}</td>
                <td>${formatRupiah(order.total)}</td>
                <td>
                    <span class="badge badge-status">${order.status || 'baru'}</span>
                </td>
                <td>${new Date(order.created_at).toLocaleString('id-ID')}</td>
                <td>
                    <button class="btn-table btn-detail" data-id="${order.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;

            orderTableBody.appendChild(tr);
        });
    }

    filterStatus.addEventListener('change', renderOrderTable);
    filterDate.addEventListener('change', renderOrderTable);

    // ==================== DASHBOARD ====================

    function updateDashboard() {
        dashboardTotalProducts.textContent = products.length;

        dashboardTotalOrders.textContent = orders.length;

        let totalRevenue = 0;
        orders.forEach(order => {
            if (order.total) {
                totalRevenue += Number(order.total);
            }
        });
        dashboardTotalRevenue.textContent = formatRupiah(totalRevenue);

        if (orders.length > 0) {
            const latestOrder = orders[0];
            dashboardLatestOrder.innerHTML = `
                <strong>${latestOrder.customer_name}</strong> memesan 
                <strong>${latestOrder.product_name}</strong> (${latestOrder.quantity}x) 
                dengan total ${formatRupiah(latestOrder.total)}<br>
                <small>${new Date(latestOrder.created_at).toLocaleString('id-ID')}</small>
            `;
        } else {
            dashboardLatestOrder.textContent = 'Belum ada pesanan terbaru.';
        }
    }

    // ==================== TOKO SETTINGS ====================

    const storeForm = document.getElementById('storeForm');

    if (storeForm) {
        storeForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const storeName = document.getElementById('storeName').value.trim();
            const storePhone = document.getElementById('storePhone').value.trim();
            const storeAddress = document.getElementById('storeAddress').value.trim();
            const storeDescription = document.getElementById('storeDescription').value.trim();

            localStorage.setItem('storeName', storeName);
            localStorage.setItem('storePhone', storePhone);
            localStorage.setItem('storeAddress', storeAddress);
            localStorage.setItem('storeDescription', storeDescription);

            alert('Informasi toko berhasil diperbarui!');
        });

        document.getElementById('storeName').value = localStorage.getItem('storeName') || 'Bude Peyek';
        document.getElementById('storePhone').value = localStorage.getItem('storePhone') || '083169352889';
        document.getElementById('storeAddress').value = localStorage.getItem('storeAddress') || 'Bandar Lampung, Indonesia';
        document.getElementById('storeDescription').value = localStorage.getItem('storeDescription') || 'Peyek renyah dan gurih khas Nusantara.';
    }

    // ==================== UBAH PASSWORD (PAKAI DATABASE) ====================

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

        const currentUsername = sessionStorage.getItem('adminUsername') || 'admin';

        try {
            const { data, error } = await supabase
                .from('admin_credentials')
                .select('id, username, password')
                .eq('username', currentUsername)
                .single();

            if (error || !data) {
                console.error('Gagal mengambil data admin:', error);
                alert('Gagal mengambil data admin. Silakan coba lagi.');
                return;
            }

            if (oldPassword !== data.password) {
                alert('Password lama salah!');
                return;
            }

            const { error: updateError } = await supabase
                .from('admin_credentials')
                .update({ password: newPassword })
                .eq('id', data.id);

            if (updateError) {
                console.error('Gagal update password:', updateError);
                alert('Gagal mengubah password. Silakan coba lagi.');
                return;
            }

            alert('Password berhasil diubah!');
            this.reset();
        } catch (err) {
            console.error('Unexpected error saat ubah password:', err);
            alert('Terjadi kesalahan saat mengubah password. Silakan coba lagi.');
        }
    });

    // ==================== LOGOUT ====================

    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (confirm('Yakin ingin logout?')) {
            sessionStorage.removeItem('adminLoggedIn');
            sessionStorage.removeItem('adminUsername');
            window.location.href = 'login.html';
        }
    });

    // ==================== UI INTERACTION ====================

    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-collapsed');
        });
    }

    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            document.querySelector('.admin-sidebar').classList.toggle('active');
        });
    }

    document.getElementById('adminName').textContent =
        sessionStorage.getItem('adminUsername') || 'Admin';

    async function initializeAdmin() {
        await loadProductsFromDB();
        await loadOrdersFromDB();
        updateDashboard();
    }

    initializeAdmin();
}

// Start initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}
