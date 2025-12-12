// Admin Script with Supabase Integration (fixed, no '...' truncation)

// Cek login sederhana berbasis sessionStorage
if (!sessionStorage.getItem('adminLoggedIn')) {
    window.location.href = 'login.html';
}

function initAdmin() {
    // Pastikan Supabase client sudah siap
    if (!window.supabaseClient) {
        console.log('⏳ Menunggu Supabase client...');
        setTimeout(initAdmin, 150);
        return;
    }

    console.log('✅ Supabase client siap di admin dashboard');
    const supabase = window.supabaseClient;

    // ===== STATE =====
    let products = [];
    let orders = [];
    let currentProductId = null;

    // ===== UTIL =====
    const formatRupiah = (value) => {
        const num = Number(value) || 0;
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(num);
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'pending': return 'badge-warning';
            case 'processing': return 'badge-info';
            case 'completed': return 'badge-success';
            case 'cancelled': return 'badge-danger';
            case 'active': return 'badge-success';
            case 'inactive': return 'badge-secondary';
            default: return 'badge-secondary';
        }
    };

    // ===== NAVIGASI PAGE =====
    const navLinks = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.admin-page');
    const pageTitle = document.getElementById('pageTitle');

    function showPage(page) {
        pages.forEach(sec => {
            sec.classList.toggle('active', sec.id === page + '-page');
        });

        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });

        if (page === 'dashboard') pageTitle.textContent = 'Dashboard';
        if (page === 'produk') pageTitle.textContent = 'Kelola Produk';
        if (page === 'pesanan') pageTitle.textContent = 'Riwayat Pesanan';
        if (page === 'settings') pageTitle.textContent = 'Pengaturan';
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            showPage(page);

            if (page === 'dashboard') updateDashboard();
            if (page === 'produk') renderProductTable();
            if (page === 'pesanan') renderOrderTable();
        });
    });

    // ===== AMBIL DATA DARI SUPABASE =====
    async function fetchProducts() {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            products = data || [];
        } catch (err) {
            console.error('Gagal ambil data produk:', err);
            alert('Gagal memuat produk dari database Supabase.\n\n' + err.message);
        }
    }

    async function fetchOrders() {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            orders = data || [];
        } catch (err) {
            console.error('Gagal ambil data pesanan:', err);
            alert('Gagal memuat pesanan dari database Supabase.\n\n' + err.message);
        }
    }

    // ===== RENDER TABEL PRODUK =====
    function renderProductTable() {
        const tbody = document.getElementById('productTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!products.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Belum ada produk di database.</td>
                </tr>`;
            return;
        }

        products.forEach((p) => {
            const tr = document.createElement('tr');
            const stockDisplay = (p.stock ?? '') === '' ? '-' : p.stock;

            tr.innerHTML = `
                <td>${p.id}</td>
                <td>${p.name || '-'}</td>
                <td>${formatRupiah(p.price)}</td>
                <td>${stockDisplay}</td>
                <td>
                    <span class="badge ${getStatusBadgeClass(p.status)}">
                        ${p.status || 'inactive'}
                    </span>
                </td>
                <td>
                    <button class="btn-table btn-edit" data-id="${p.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-table btn-delete" data-id="${p.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Event edit & delete
        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.id);
                openEditProductModal(id);
            });
        });

        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = Number(btn.dataset.id);
                const product = products.find(p => p.id === id);
                if (!product) return;

                const ok = confirm(`Yakin ingin menghapus produk "${product.name}"?`);
                if (!ok) return;

                try {
                    const { error } = await supabase
                        .from('products')
                        .delete()
                        .eq('id', id);
                    if (error) throw error;

                    alert('Produk berhasil dihapus.');
                    await fetchProducts();
                    renderProductTable();
                    updateDashboard();
                } catch (err) {
                    console.error('Gagal hapus produk:', err);
                    alert('Gagal menghapus produk.\n\n' + err.message);
                }
            });
        });
    }

    // ===== MODAL PRODUK (TAMBAH/EDIT) =====
    const productModal = document.getElementById('productModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const imagePreview = document.getElementById('imagePreview');
    const productForm = document.getElementById('productForm');

    function openAddProductModal() {
        currentProductId = null;
        document.getElementById('modalTitle').textContent = 'Tambah Produk';
        productForm.reset();
        document.getElementById('productId').value = '';
        imagePreview.innerHTML = '<i class="fas fa-image"></i><p>Klik untuk upload gambar</p>';
        productModal.classList.add('active');
        modalOverlay.classList.add('active');
    }

    function openEditProductModal(id) {
        const p = products.find(prod => prod.id === id);
        if (!p) {
            alert('Produk tidak ditemukan.');
            return;
        }
        currentProductId = id;
        document.getElementById('modalTitle').textContent = 'Edit Produk';

        document.getElementById('productId').value = p.id;
        document.getElementById('productName').value = p.name || '';
        document.getElementById('productDescription').value = p.description || '';
        document.getElementById('productPrice').value = p.price || 0;
        document.getElementById('productStock').value = p.stock ?? '';
        document.getElementById('productStatus').value = p.status || 'active';
        document.getElementById('badgeText').value = p.badge || '';

        if (p.image_url) {
            imagePreview.innerHTML = `<img src="${p.image_url}" alt="${p.name}">`;
        } else {
            imagePreview.innerHTML = '<i class="fas fa-image"></i><p>Klik untuk upload gambar</p>';
        }

        productModal.classList.add('active');
        modalOverlay.classList.add('active');
    }

    function closeProductModal() {
        productModal.classList.remove('active');
        modalOverlay.classList.remove('active');
    }

    document.getElementById('addProductBtn').addEventListener('click', openAddProductModal);
    document.getElementById('closeModal').addEventListener('click', closeProductModal);
    document.getElementById('cancelBtn').addEventListener('click', closeProductModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeProductModal();
    });

    // Click area preview untuk memicu input file
    imagePreview.addEventListener('click', () => {
        document.getElementById('productImage').click();
    });

    document.getElementById('productImage').addEventListener('change', function () {
        const file = this.files[0];
        if (!file) {
            imagePreview.innerHTML = '<i class="fas fa-image"></i><p>Klik untuk upload gambar</p>';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    });

    async function uploadImageToStorage(file) {
        if (!file) return null;
        try {
            const ext = file.name.split('.').pop();
            const fileName = `product-${Date.now()}.${ext}`;
            const { data, error } = await supabase
                .storage
                .from('product-images')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (error) throw error;

            const { data: urlData } = supabase
                .storage
                .from('product-images')
                .getPublicUrl(data.path);

            return urlData.publicUrl;
        } catch (err) {
            console.error('Upload gambar gagal:', err);
            alert('Gagal mengupload gambar ke Supabase Storage.\n\n' + err.message);
            return null;
        }
    }

    // Submit form produk
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = productForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        }

        const idHidden = document.getElementById('productId').value;
        const name = document.getElementById('productName').value.trim();
        const description = document.getElementById('productDescription').value.trim();
        const price = Number(document.getElementById('productPrice').value) || 0;
        const stock = document.getElementById('productStock').value === '' 
            ? null 
            : Number(document.getElementById('productStock').value);
        const status = document.getElementById('productStatus').value;
        const badge = document.getElementById('badgeText').value.trim();
        const file = document.getElementById('productImage').files[0];

        if (!name || !price) {
            alert('Nama dan harga produk wajib diisi.');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Simpan';
            }
            return;
        }

        let image_url = null;
        if (file) {
            image_url = await uploadImageToStorage(file);
            if (!image_url) {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-save"></i> Simpan';
                }
                return;
            }
        }

        const payload = {
            name,
            description,
            price,
            stock,
            status,
            badge: badge || null
        };
        if (image_url) payload.image_url = image_url;

        try {
            if (idHidden) {
                const { error } = await supabase
                    .from('products')
                    .update(payload)
                    .eq('id', Number(idHidden));
                if (error) throw error;
                alert('Produk berhasil diperbarui.');
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([payload]);
                if (error) throw error;
                alert('Produk baru berhasil ditambahkan.');
            }

            await fetchProducts();
            renderProductTable();
            updateDashboard();
            closeProductModal();
        } catch (err) {
            console.error('Gagal simpan produk:', err);
            alert('Gagal menyimpan produk.\n\n' + err.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Simpan';
            }
        }
    });

    // ===== RENDER TABEL PESANAN =====
    function renderOrderTable() {
        const tbody = document.getElementById('orderTableBody');
        if (!tbody) return;

        const filterStatus = document.getElementById('filterStatus').value;
        let filtered = [...orders];

        if (filterStatus !== 'all') {
            filtered = filtered.filter(o => (o.status || 'pending') === filterStatus);
        }

        tbody.innerHTML = '';

        if (!filtered.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">Belum ada pesanan.</td>
                </tr>`;
            return;
        }

        filtered.forEach(order => {
            const tr = document.createElement('tr');
            const statusClass = getStatusBadgeClass(order.status);
            const tanggal = order.created_at 
                ? new Date(order.created_at).toLocaleString('id-ID')
                : '-';

            const phone = (order.phone || '').toString().trim();
            const phoneForWa = phone
                ? '62' + phone.replace(/^0/, '')
                : '6283169352889'; // fallback ke nomor toko

            tr.innerHTML = `
                <td>${order.id}</td>
                <td>${order.customer_name || '-'}</td>
                <td>${order.product_name || '-'}</td>
                <td>${order.quantity || 0}</td>
                <td>${formatRupiah(order.total)}</td>
                <td><span class="badge ${statusClass}">${order.status || 'pending'}</span></td>
                <td>${tanggal}</td>
                <td>
                    <button class="btn-table btn-detail" data-id="${order.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <a class="btn-table btn-wa" href="https://wa.me/${phoneForWa}" target="_blank">
                        <i class="fab fa-whatsapp"></i>
                    </a>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Detail pesanan
        tbody.querySelectorAll('.btn-detail').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.id);
                const order = orders.find(o => o.id === id);
                if (!order) return;
                openOrderModal(order);
            });
        });
    }

    document.getElementById('filterStatus').addEventListener('change', renderOrderTable);

    // ===== MODAL DETAIL PESANAN =====
    const orderModal = document.getElementById('orderModal');
    const orderDetailContent = document.getElementById('orderDetailContent');
    const closeOrderModalBtn = document.getElementById('closeOrderModal');

    function openOrderModal(order) {
        orderDetailContent.innerHTML = `
            <p><strong>ID Pesanan:</strong> ${order.id}</p>
            <p><strong>Nama Pelanggan:</strong> ${order.customer_name || '-'}</p>
            <p><strong>No. HP:</strong> ${order.phone || '-'}</p>
            <p><strong>Produk:</strong> ${order.product_name || '-'}</p>
            <p><strong>Jumlah:</strong> ${order.quantity || 0}</p>
            <p><strong>Total:</strong> ${formatRupiah(order.total)}</p>
            <p><strong>Alamat:</strong> ${order.address || '-'}</p>
            <p><strong>Status:</strong> ${order.status || 'pending'}</p>
            <p><strong>Tanggal:</strong> ${order.created_at ? new Date(order.created_at).toLocaleString('id-ID') : '-'}</p>
        `;
        orderModal.classList.add('active');
        modalOverlay.classList.add('active');
    }

    function closeOrderModal() {
        orderModal.classList.remove('active');
        modalOverlay.classList.remove('active');
    }

    closeOrderModalBtn.addEventListener('click', closeOrderModal);

    // ===== DASHBOARD =====
    function updateDashboard() {
        const totalProduk = products.length;
        const totalPesanan = orders.length;
        const stokRendah = products.filter(p => (p.stock || 0) > 0 && p.stock <= 10).length;
        const totalPendapatan = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

        document.getElementById('totalProduk').textContent = totalProduk;
        document.getElementById('totalPesanan').textContent = totalPesanan;
        document.getElementById('stokRendah').textContent = stokRendah;
        document.getElementById('totalPendapatan').textContent = formatRupiah(totalPendapatan);

        const topProductsEl = document.getElementById('topProducts');
        const recentOrdersEl = document.getElementById('recentOrders');

        // Top produk (sederhana: list semua produk aktif)
        if (!products.length) {
            topProductsEl.innerHTML = '<p class="empty-state">Belum ada produk.</p>';
        } else {
            topProductsEl.innerHTML = products
                .filter(p => p.status !== 'inactive')
                .slice(0, 5)
                .map(p => `
                    <div class="product-item">
                        <span>${p.name}</span>
                        <span>${formatRupiah(p.price)}</span>
                    </div>
                `).join('');
        }

        // Pesanan terbaru
        if (!orders.length) {
            recentOrdersEl.innerHTML = '<p class="empty-state">Belum ada pesanan.</p>';
        } else {
            recentOrdersEl.innerHTML = orders
                .slice(0, 5)
                .map(o => `
                    <div class="order-item">
                        <div>
                            <strong>${o.customer_name || '-'}</strong>
                            <p>${o.product_name || '-'}</p>
                        </div>
                        <div>
                            <span class="badge ${getStatusBadgeClass(o.status)}">${o.status || 'pending'}</span>
                            <p>${formatRupiah(o.total)}</p>
                        </div>
                    </div>
                `).join('');
        }
    }

    // ===== SETTINGS (INFORMASI TOKO & PASSWORD) =====
    const storeForm = document.getElementById('storeInfoForm');
    if (storeForm) {
        // Prefill dari localStorage
        document.getElementById('storeName').value =
            localStorage.getItem('storeName') || 'Bude Peyek';
        document.getElementById('storeAddress').value =
            localStorage.getItem('storeAddress') || 'Jl. Raya Sejahtera No. 123, Jakarta Selatan';
        document.getElementById('storePhone').value =
            localStorage.getItem('storePhone') || '083169352889';
        document.getElementById('storeEmail').value =
            localStorage.getItem('storeEmail') || 'info@budepeyek.com';

        storeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            localStorage.setItem('storeName', document.getElementById('storeName').value);
            localStorage.setItem('storeAddress', document.getElementById('storeAddress').value);
            localStorage.setItem('storePhone', document.getElementById('storePhone').value);
            localStorage.setItem('storeEmail', document.getElementById('storeEmail').value);
            alert('Informasi toko berhasil disimpan.');
        });
    }

    // Ganti password admin (disimpan di localStorage, untuk demo saja)
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (e) => {
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
            alert('Password admin berhasil diubah.');
            changePasswordForm.reset();
        });
    }

    // ===== LOGOUT & UI KECIL =====
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            const ok = confirm('Yakin ingin logout?');
            if (!ok) return;
            sessionStorage.removeItem('adminLoggedIn');
            sessionStorage.removeItem('adminUsername');
            window.location.href = 'login.html';
        });
    }

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.querySelector('.admin-sidebar').classList.toggle('active');
        });
    }

    const adminNameEl = document.getElementById('adminName');
    if (adminNameEl) {
        adminNameEl.textContent = sessionStorage.getItem('adminUsername') || 'Admin';
    }

    // ===== INISIALISASI PERTAMA =====
    (async () => {
        await fetchProducts();
        await fetchOrders();
        renderProductTable();
        renderOrderTable();
        updateDashboard();
        showPage('dashboard');
    })();
}

// Mulai inisialisasi
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}
