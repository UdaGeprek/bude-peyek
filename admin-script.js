// admin-script.js
// Admin Dashboard Bude Peyek – Supabase Auth + Products/Orders

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
    let currentProductId = null;

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

    // ====== AUTH CHECK – hanya via Supabase Auth ======
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

    // ====== DOM CACHE ======
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
    const productIdInput = document.getElementById('productId');
    const productNameInput = document.getElementById('productName');
    const productDescriptionInput = document.getElementById('productDescription');
    const productPriceInput = document.getElementById('productPrice');
    const productStockInput = document.getElementById('productStock');
    const productIconInput = document.getElementById('productIcon');
    const productBadgeCheckbox = document.getElementById('productBadge');
    const badgeTextGroup = document.getElementById('badgeTextGroup');
    const badgeTextInput = document.getElementById('badgeText');
    const productImageInput = document.getElementById('productImage');
    const imagePreview = document.getElementById('imagePreview');

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
        if (pageTitle) pageTitle.textContent = mapTitle[page] || 'Dashboard';
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

    // ====== PRODUK: TABEL ======
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
            const iconClass = p.icon || 'fa-cookie-bite';
            const badgeHtml = p.badge
                ? `<span class="badge badge-warning">${p.badge}</span>`
                : '';

            tr.innerHTML = `
                <td>
                    <div class="product-image-cell">
                        ${
                            p.image_url
                                ? `<img src="${p.image_url}" alt="${p.name || ''}">`
                                : `<div class="product-icon-fallback"><i class="fas ${iconClass}"></i></div>`
                        }
                    </div>
                </td>
                <td>
                    <div class="product-info-cell">
                        <strong>${p.name || '-'}</strong>
                        ${badgeHtml}
                        <p>${p.description || ''}</p>
                    </div>
                </td>
                <td>${formatRupiah(p.price)}</td>
                <td>${stockDisplay}</td>
                <td>
                    <span class="badge ${getStatusBadgeClass(p.status || 'active')}">
                        ${p.status || 'active'}
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

        // Binding tombol EDIT
        productTableBody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.id);
                openEditProductModal(id);
            });
        });

        // Binding tombol DELETE
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

    // ====== PRODUK: MODAL ======
    function resetProductForm() {
        if (!productForm) return;
        productForm.reset();
        currentProductId = null;
        if (productIdInput) productIdInput.value = '';
        if (productIconInput) productIconInput.value = '';
        if (productBadgeCheckbox) productBadgeCheckbox.checked = false;
        if (badgeTextInput) badgeTextInput.value = '';
        if (badgeTextGroup) badgeTextGroup.style.display = 'none';
        if (imagePreview) {
            imagePreview.innerHTML = '<i class="fas fa-image"></i><p>Klik untuk upload gambar</p>';
        }
    }

    function openAddProductModal() {
        resetProductForm();
        const titleEl = document.getElementById('modalTitle');
        if (titleEl) titleEl.textContent = 'Tambah Produk';
        productModal.classList.add('active');
        modalOverlay.classList.add('active');
    }

    function openEditProductModal(id) {
        const p = products.find(prod => prod.id === id);
        if (!p) {
            alert('Produk tidak ditemukan.');
            return;
        }

        resetProductForm();
        currentProductId = id;

        const titleEl = document.getElementById('modalTitle');
        if (titleEl) titleEl.textContent = 'Edit Produk';

        if (productIdInput) productIdInput.value = p.id;
        if (productNameInput) productNameInput.value = p.name || '';
        if (productDescriptionInput) productDescriptionInput.value = p.description || '';
        if (productPriceInput) productPriceInput.value = p.price || 0;
        if (productStockInput) productStockInput.value = p.stock ?? '';
        if (productIconInput) productIconInput.value = p.icon || '';

        if (productBadgeCheckbox) {
            productBadgeCheckbox.checked = !!p.badge;
            if (badgeTextGroup) {
                badgeTextGroup.style.display = p.badge ? 'block' : 'none';
            }
        }
        if (badgeTextInput) badgeTextInput.value = p.badge || '';

        if (imagePreview) {
            if (p.image_url) {
                imagePreview.innerHTML = `<img src="${p.image_url}" alt="${p.name || ''}">`;
            } else {
                imagePreview.innerHTML = '<i class="fas fa-image"></i><p>Klik untuk upload gambar</p>';
            }
        }

        productModal.classList.add('active');
        modalOverlay.classList.add('active');
    }

    function closeAllModals() {
        productModal.classList.remove('active');
        orderModal.classList.remove('active');
        modalOverlay.classList.remove('active');
    }

    if (addProductBtn) addProductBtn.addEventListener('click', openAddProductModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeAllModals);
    if (cancelBtn) cancelBtn.addEventListener('click', closeAllModals);
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeAllModals();
        });
    }

    // Badge show/hide
    if (productBadgeCheckbox && badgeTextGroup) {
        productBadgeCheckbox.addEventListener('change', () => {
            badgeTextGroup.style.display = productBadgeCheckbox.checked ? 'block' : 'none';
        });
    }

    // Image picker & preview
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

            const name = productNameInput.value.trim();
            const description = productDescriptionInput.value.trim();
            const price = Number(productPriceInput.value) || 0;
            const stock = productStockInput.value === ''
                ? null
                : Number(productStockInput.value);
            const icon = productIconInput.value.trim() || null;
            const badgeChecked = productBadgeCheckbox && productBadgeCheckbox.checked;
            const badgeText = badgeTextInput.value.trim();
            const badge = badgeChecked ? (badgeText || 'Best Seller') : null;
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
                icon,
                badge,
                status: 'active'
            };
            if (image_url) payload.image_url = image_url;

            try {
                if (currentProductId || productIdInput.value) {
                    const id = Number(currentProductId || productIdInput.value);
                    const { error } = await supabase
                        .from('products')
                        .update(payload)
                        .eq('id', id);
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
                closeAllModals();
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
        closeOrderModalBtn.addEventListener('click', closeAllModals);
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
                    .filter(p => (p.status || 'active') !== 'inactive')
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

    // ====== BOOTSTRAP AWAL ======
    (async () => {
        const user = await requireAuth();
        if (!user) return; // sudah di-redirect kalau tidak login

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
