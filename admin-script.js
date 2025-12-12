// admin-script.js
// Admin Dashboard Bude Peyek – pakai Supabase Auth (tanpa sessionStorage login check)

// Inisialisasi setelah Supabase client siap
function initAdmin() {
    if (!window.supabaseClient) {
        console.log('⏳ Menunggu Supabase client...');
        setTimeout(initAdmin, 150);
        return;
    }

    console.log('✅ Supabase client siap di admin');
    const supabase = window.supabaseClient;

    // ====== STATE ======
    let products = [];
    let orders = [];

    // ====== UTIL ======
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

    // ====== AUTH CHECK (HANYA SUPABASE AUTH) ======
    async function requireAuth() {
        try {
            const { data, error } = await supabase.auth.getUser();
            if (error || !data || !data.user) {
                console.warn('Belum login / sesi habis → balik ke login');
                window.location.href = 'login.html';
                return null;
            }
            return data.user;
        } catch (err) {
            console.error('Error cek auth:', err);
            window.location.href = 'login.html';
            return null;
        }
    }

    // ====== DOM ======
    const navLinks = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.admin-page');
    const pageTitle = document.getElementById('pageTitle');

    const productTableBody = document.getElementById('productTableBody');
    const addProductBtn = document.getElementById('addProductBtn');
    const productModal = document.getElementById('productModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const productForm = document.getElementById('productForm');
    const imagePreview = document.getElementById('imagePreview');
    const productImageInput = document.getElementById('productImage');

    const orderTableBody = document.getElementById('orderTableBody');
    const filterStatusSelect = document.getElementById('filterStatus');

    const orderModal = document.getElementById('orderModal');
    const orderDetailContent = document.getElementById('orderDetailContent');
    const closeOrderModalBtn = document.getElementById('closeOrderModal');

    const totalProdukEl = document.getElementById('totalProduk');
    const totalPesananEl = document.getElementById('totalPesanan');
    const stokRendahEl = document.getElementById('stokRendah');
    const totalPendapatanEl = document.getElementById('totalPendapatan');
    const topProductsEl = document.getElementById('topProducts');
    const recentOrdersEl = document.getElementById('recentOrders');

    const storeInfoForm = document.getElementById('storeInfoForm');
    const adminNameEl = document.getElementById('adminName');
    const logoutBtn = document.getElementById('logoutBtn');
    const menuToggle = document.getElementById('menuToggle');

    const changePasswordForm = document.getElementById('changePasswordForm');

    let currentProductId = null;

    // ====== NAVIGASI HALAMAN ======
    function showPage(page) {
        pages.forEach(sec => {
            sec.classList.toggle('active', sec.id === `${page}-page`);
        });

        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });

        const mapTitle = {
            dashboard: 'Dashboard',
            produk: 'Kelola Produk',
            pesanan: 'Riwayat Pesanan',
            settings: 'Pengaturan'
        };
        pageTitle.textContent = mapTitle[page] || 'Dashboard';
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            showPage(page);
            if (page === 'produk') renderProductTable();
            if (page === 'pesanan') renderOrderTable();
            if (page === 'dashboard') updateDashboard();
        });
    });

    // ====== LOAD DATA DARI SUPABASE ======
    async function fetchProducts() {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            products = data || [];
        } catch (err) {
            console.error('Gagal ambil produk:', err);
            alert('Gagal memuat produk dari database Supabase:\n' + err.message);
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
            console.error('Gagal ambil pesanan:', err);
            alert('Gagal memuat pesanan dari database Supabase:\n' + err.message);
        }
    }

    // ====== PRODUK: TABEL & MODAL ======
    function renderProductTable() {
        if (!productTableBody) return;

        productTableBody.innerHTML = '';

        if (!products.length) {
            productTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Belum ada produk.</td>
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
            productTableBody.appendChild(tr);
        });

        productTableBody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.id);
                openEditProductModal(id);
            });
        });

        productTableBody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = Number(btn.dataset.id);
                const p = products.find(prod => prod.id === id);
                if (!p) return;

                if (!confirm(`Yakin ingin menghapus produk "${p.name}"?`)) return;

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
                    alert('Gagal menghapus produk:\n' + err.message);
                }
            });
        });
    }

    function openAddProductModal() {
        currentProductId = null;
        document.getElementById('modalTitle').textContent = 'Tambah Produk';
        productForm.reset();
        document.getElementById('productId').value = '';
        if (imagePreview) {
            imagePreview.innerHTML = '<i class="fas fa-image"></i><p>Klik untuk upload gambar</p>';
        }
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

        if (p.image_url && imagePreview) {
            imagePreview.innerHTML = `<img src="${p.image_url}" alt="${p.name}">`;
        } else if (imagePreview) {
            imagePreview.innerHTML = '<i class="fas fa-image"></i><p>Klik untuk upload gambar</p>';
        }

        productModal.classList.add('active');
        modalOverlay.classList.add('active');
    }

    function closeProductModal() {
        productModal.classList.remove('active');
        orderModal.classList.remove('active');
        modalOverlay.classList.remove('active');
    }

    if (addProductBtn) addProductBtn.addEventListener('click', openAddProductModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeProductModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeProductModal);
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeProductModal();
        });
    }

    if (imagePreview && productImageInput) {
        imagePreview.addEventListener('click', () => {
            productImageInput.click();
        });

        productImageInput.addEventListener('change', function () {
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
    }

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
            alert('Gagal mengupload gambar ke Supabase Storage:\n' + err.message);
            return null;
        }
    }

    if (productForm) {
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
            const file = productImageInput.files[0];

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
                alert('Gagal menyimpan produk:\n' + err.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-save"></i> Simpan';
                }
            }
        });
    }

    // ====== PESANAN ======
    function renderOrderTable() {
        if (!orderTableBody) return;

        const filterStatus = filterStatusSelect ? filterStatusSelect.value : 'all';
        let filtered = [...orders];

        if (filterStatus !== 'all') {
            filtered = filtered.filter(o => (o.status || 'pending') === filterStatus);
        }

        orderTableBody.innerHTML = '';

        if (!filtered.length) {
            orderTableBody.innerHTML = `
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
            orderTableBody.appendChild(tr);
        });

        orderTableBody.querySelectorAll('.btn-detail').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.id);
                const order = orders.find(o => o.id === id);
                if (!order) return;
                openOrderModal(order);
            });
        });
    }

    if (filterStatusSelect) {
        filterStatusSelect.addEventListener('change', renderOrderTable);
    }

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

    if (closeOrderModalBtn) {
        closeOrderModalBtn.addEventListener('click', closeProductModal);
    }

    // ====== DASHBOARD ======
    function updateDashboard() {
        const totalProduk = products.length;
        const totalPesanan = orders.length;
        const stokRendah = products.filter(p => (p.stock || 0) > 0 && p.stock <= 10).length;
        const totalPendapatan = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

        if (totalProdukEl) totalProdukEl.textContent = totalProduk;
        if (totalPesananEl) totalPesananEl.textContent = totalPesanan;
        if (stokRendahEl) stokRendahEl.textContent = stokRendah;
        if (totalPendapatanEl) totalPendapatanEl.textContent = formatRupiah(totalPendapatan);

        if (topProductsEl) {
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
        }

        if (recentOrdersEl) {
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
    }

    // ====== SETTINGS TOKO ======
    if (storeInfoForm) {
        document.getElementById('storeName').value =
            localStorage.getItem('storeName') || 'Bude Peyek';
        document.getElementById('storeAddress').value =
            localStorage.getItem('storeAddress') || 'Jl. Contoh No. 123, Lampung';
        document.getElementById('storePhone').value =
            localStorage.getItem('storePhone') || '083169352889';
        document.getElementById('storeEmail').value =
            localStorage.getItem('storeEmail') || 'info@budepeyek.com';

        storeInfoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            localStorage.setItem('storeName', document.getElementById('storeName').value);
            localStorage.setItem('storeAddress', document.getElementById('storeAddress').value);
            localStorage.setItem('storePhone', document.getElementById('storePhone').value);
            localStorage.setItem('storeEmail', document.getElementById('storeEmail').value);
            alert('Informasi toko berhasil disimpan.');
        });
    }

    // ====== UBAH PASSWORD VIA SUPABASE AUTH ======
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
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
                const { data: userData, error: userError } = await supabase.auth.getUser();
                if (userError || !userData || !userData.user) {
                    alert('Sesi login habis, silakan login ulang.');
                    window.location.href = 'login.html';
                    return;
                }

                const email = userData.user.email;
                if (!email) {
                    alert('Akun admin tidak memiliki email. Pastikan dibuat via Supabase Auth.');
                    return;
                }

                const { error: reauthError } = await supabase.auth.signInWithPassword({
                    email,
                    password: oldPassword
                });
                if (reauthError) {
                    alert('Password lama salah!');
                    return;
                }

                const { error: updateError } = await supabase.auth.updateUser({
                    password: newPassword
                });
                if (updateError) {
                    alert('Gagal mengubah password: ' + updateError.message);
                    return;
                }

                alert('Password berhasil diubah!');
                changePasswordForm.reset();
            } catch (err) {
                console.error('Error ubah password:', err);
                alert('Terjadi kesalahan saat mengubah password.');
            }
        });
    }

    // ====== LOGOUT & UI ======
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (!confirm('Yakin ingin logout?')) return;
            try {
                await supabase.auth.signOut();
            } catch (err) {
                console.error('Error logout:', err);
            }
            window.location.href = 'login.html';
        });
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.querySelector('.admin-sidebar').classList.toggle('active');
        });
    }

    (async () => {
        if (adminNameEl) {
            try {
                const { data, error } = await supabase.auth.getUser();
                if (!error && data && data.user) {
                    adminNameEl.textContent =
                        data.user.email ||
                        (data.user.user_metadata && data.user.user_metadata.full_name) ||
                        'Admin';
                } else {
                    adminNameEl.textContent = 'Admin';
                }
            } catch (err) {
                adminNameEl.textContent = 'Admin';
            }
        }
    })();

    // ====== BOOTSTRAP ======
    (async () => {
        const user = await requireAuth();
        if (!user) return; // sudah di-redirect

        await fetchProducts();
        await fetchOrders();
        renderProductTable();
        renderOrderTable();
        updateDashboard();
        showPage('dashboard');
    })();
}

// Mulai
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}
