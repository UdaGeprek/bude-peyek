// admin-script.js
// Admin Dashboard Bude Peyek – Supabase Auth + Orders + Stok + WhatsApp

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

    const ORDER_STATUS_LIST = [
        { value: 'pending',    label: 'Pending / Baru' },
        { value: 'processing', label: 'Diproses' },
        { value: 'shipped',    label: 'Dikirim' },
        { value: 'completed',  label: 'Selesai' },
        { value: 'cancelled',  label: 'Dibatalkan' },
    ];

    const statusToBadgeClass = (status) => {
        switch (status) {
            case 'pending':    return 'status-badge pending';
            case 'processing': return 'status-badge processing';
            case 'shipped':    return 'status-badge processing'; // sama warna dengan processing
            case 'completed':  return 'status-badge completed';
            case 'cancelled':  return 'status-badge cancelled';
            case 'active':     return 'status-badge active';
            case 'inactive':   return 'status-badge inactive';
            default:           return 'status-badge';
        }
    };

    const statusToText = (status) => {
        switch (status) {
            case 'pending':    return 'Pending / Baru';
            case 'processing': return 'Diproses';
            case 'shipped':    return 'Dikirim';
            case 'completed':  return 'Selesai';
            case 'cancelled':  return 'Dibatalkan';
            default:           return status || '-';
        }
    };

    const isStockCountedStatus = (status) =>
        ['processing', 'shipped', 'completed'].includes(status);

    // ====== AUTH CHECK – HANYA Supabase Auth ======
    async function requireAuth() {
        try {
            const { data, error } = await supabase.auth.getUser();
            if (error || !data || !data.user) {
                console.warn('Belum login / sesi habis → ke login.html');
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
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-box"></i>
                        <p>Belum ada produk.</p>
                    </td>
                </tr>`;
            return;
        }

        products.forEach((p) => {
            const tr = document.createElement('tr');
            const stock = p.stock ?? 0;
            const iconClass = p.icon || 'fa-cookie-bite';
            const isHabis = stock <= 0;
            const badgeHtml = p.badge
                ? `<span class="status-badge pending">${p.badge}</span>`
                : '';

            tr.innerHTML = `
                <td>
                    ${
                        p.image_url
                            ? `<img src="${p.image_url}" alt="${p.name || ''}" class="product-image-cell">`
                            : `<div class="product-icon-cell"><i class="fas ${iconClass}"></i></div>`
                    }
                </td>
                <td>
                    <div class="product-info-cell">
                        <strong>${p.name || '-'}</strong>
                        ${badgeHtml}
                        <p>${p.description || ''}</p>
                    </div>
                </td>
                <td>${formatRupiah(p.price)}</td>
                <td>
                    ${
                        isHabis
                            ? '<span class="status-badge inactive">Stok Habis</span>'
                            : `<span class="status-badge active">Stok: ${stock}</span>`
                    }
                </td>
                <td>
                    <span class="${statusToBadgeClass(p.status || (isHabis ? 'inactive' : 'active'))}">
                        ${p.status || (isHabis ? 'inactive' : 'active')}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon edit btn-edit" data-id="${p.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete btn-delete" data-id="${p.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            `;
            productTableBody.appendChild(tr);
        });

        // Edit
        productTableBody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.id);
                openEditProductModal(id);
            });
        });

        // Delete
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

    if (productBadgeCheckbox && badgeTextGroup) {
        productBadgeCheckbox.addEventListener('change', () => {
            badgeTextGroup.style.display = productBadgeCheckbox.checked ? 'block' : 'none';
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
                status: stock !== null && stock <= 0 ? 'inactive' : 'active'
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

    // ====== PESANAN: TABEL + STATUS + WHATSAPP ======
    function buildWhatsAppUrlForOrder(order) {
        const defaultAdminNumber = '6283169352889';
        let waNumber = defaultAdminNumber;

        if (order.phone) {
            let digits = order.phone.toString().replace(/[^0-9]/g, '').trim();
            if (digits.startsWith('0')) digits = '62' + digits.slice(1);
            else if (!digits.startsWith('62')) digits = '62' + digits;
            waNumber = digits;
        }

        const text =
            `Halo Kak ${order.customer_name || ''}, pesanan ` +
            `${order.product_name || ''} sebanyak ${order.quantity || 0} ` +
            `dengan total ${formatRupiah(order.total || 0)} ` +
            `sedang kami proses. Terima kasih sudah memesan di Bude Peyek 🙏`;

        return `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
    }

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
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-shopping-cart"></i>
                        <p>Belum ada pesanan.</p>
                    </td>
                </tr>`;
            return;
        }

        filtered.forEach(order => {
            const tr = document.createElement('tr');
            const tanggal = order.created_at
                ? new Date(order.created_at).toLocaleString('id-ID')
                : '-';

            // Dropdown status
            const statusOptionsHtml = ORDER_STATUS_LIST.map(s =>
                `<option value="${s.value}" ${s.value === (order.status || 'pending') ? 'selected' : ''}>
                    ${s.label}
                </option>`
            ).join('');

            tr.innerHTML = `
                <td>#${order.id}</td>
                <td>${order.customer_name || '-'}</td>
                <td>${order.product_name || '-'}</td>
                <td>${order.quantity || 0}</td>
                <td>${formatRupiah(order.total || 0)}</td>
                <td>
                    <div class="status-cell">
                        <span class="${statusToBadgeClass(order.status || 'pending')} status-label">
                            ${statusToText(order.status || 'pending')}
                        </span>
                        <select class="order-status-select" data-id="${order.id}">
                            ${statusOptionsHtml}
                        </select>
                    </div>
                </td>
                <td>${tanggal}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon view btn-detail" data-id="${order.id}" title="Detail pesanan">
                            <i class="fas fa-eye"></i>
                        </button>
                        <a class="btn-icon wa"
                           href="${buildWhatsAppUrlForOrder(order)}"
                           target="_blank"
                           title="Hubungi via WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </a>
                    </div>
                </td>
            `;
            orderTableBody.appendChild(tr);
        });

        // Detail
        orderTableBody.querySelectorAll('.btn-detail').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.id);
                const order = orders.find(o => o.id === id);
                if (!order) return;
                openOrderModal(order);
            });
        });

        // Change status
        orderTableBody.querySelectorAll('.order-status-select').forEach(select => {
            select.addEventListener('change', async () => {
                const id = Number(select.dataset.id);
                const newStatus = select.value;
                await handleOrderStatusChange(id, newStatus);
            });
        });
    }

    if (filterStatusSelect) {
        filterStatusSelect.addEventListener('change', renderOrderTable);
    }

    function openOrderModal(order) {
        if (!orderModal || !orderDetailContent) return;

        orderDetailContent.innerHTML = `
            <p><strong>ID Pesanan:</strong> #${order.id}</p>
            <p><strong>Nama Pelanggan:</strong> ${order.customer_name || '-'}</p>
            <p><strong>No. HP:</strong> ${order.phone || '-'}</p>
            <p><strong>Produk:</strong> ${order.product_name || '-'}</p>
            <p><strong>Jumlah:</strong> ${order.quantity || 0}</p>
            <p><strong>Total:</strong> ${formatRupiah(order.total || 0)}</p>
            <p><strong>Alamat:</strong> ${order.address || '-'}</p>
            <p><strong>Status:</strong> ${statusToText(order.status || 'pending')}</p>
            <p><strong>Waktu Pesan:</strong> ${order.created_at ? new Date(order.created_at).toLocaleString('id-ID') : '-'}</p>
        `;
        orderModal.classList.add('active');
        modalOverlay.classList.add('active');
    }

    if (closeOrderModalBtn) {
        closeOrderModalBtn.addEventListener('click', closeAllModals);
    }

    // ====== LOGIKA PERUBAHAN STATUS + SINKRONISASI STOK ======
    async function handleOrderStatusChange(orderId, newStatus) {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const oldStatus = order.status || 'pending';
        if (oldStatus === newStatus) return;

        const wasCountedBefore = isStockCountedStatus(oldStatus);
        const willBeCountedAfter = isStockCountedStatus(newStatus);

        let needDeduct = !wasCountedBefore && willBeCountedAfter;
        let needRestock = wasCountedBefore && newStatus === 'cancelled';

        // Cari produk terkait
        let product = null;
        if (needDeduct || needRestock) {
            product =
                products.find(p => p.id === order.product_id) ||
                products.find(p => p.name === order.product_name);
            if (!product) {
                alert('Produk terkait pesanan ini tidak ditemukan. Stok tidak dapat disesuaikan.');
                return;
            }
        }

        // Validasi stok sebelum dikurangi
        if (needDeduct) {
            if (product.stock == null) {
                alert('Stok produk belum diatur. Silakan set stok dulu sebelum memproses pesanan.');
                return;
            }
            if (product.stock < order.quantity) {
                alert('Stok tidak mencukupi untuk memproses pesanan ini.');
                return;
            }
        }

        try {
            // Update stok produk dulu (kalau perlu)
            if (needDeduct) {
                const newStock = product.stock - order.quantity;
                const productPayload = {
                    stock: newStock,
                    status: newStock <= 0 ? 'inactive' : (product.status || 'active')
                };
                const { error: prodError } = await supabase
                    .from('products')
                    .update(productPayload)
                    .eq('id', product.id);
                if (prodError) throw prodError;
            } else if (needRestock) {
                const currentStock = product.stock == null ? 0 : product.stock;
                const newStock = currentStock + order.quantity;
                const productPayload = {
                    stock: newStock,
                    status: 'active'
                };
                const { error: prodError } = await supabase
                    .from('products')
                    .update(productPayload)
                    .eq('id', product.id);
                if (prodError) throw prodError;
            }

            // Update status pesanan
            const { error: orderError } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', order.id);
            if (orderError) throw orderError;

            alert('Status pesanan berhasil diperbarui.');

            // Refresh lokal
            await fetchProducts();
            await fetchOrders();
            renderProductTable();
            renderOrderTable();
            updateDashboard();
        } catch (err) {
            console.error('Gagal mengubah status pesanan:', err);
            alert('Gagal mengubah status pesanan:\n' + err.message);
        }
    }

    // ====== DASHBOARD ======
    function updateDashboard() {
        const activeProducts = products.filter(p => (p.status || 'active') === 'active');
        const lowStock = products.filter(p => (p.stock || 0) > 0 && p.stock <= 10);
        const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);

        if (totalProdukEl) totalProdukEl.textContent = activeProducts.length;
        if (totalPesananEl) totalPesananEl.textContent = orders.length;
        if (stokRendahEl) stokRendahEl.textContent = lowStock.length;
        if (totalPendapatanEl) totalPendapatanEl.textContent = formatRupiah(totalRevenue);

        if (topProductsEl) {
            if (!activeProducts.length) {
                topProductsEl.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-box"></i>
                        <p>Belum ada produk aktif.</p>
                    </div>`;
            } else {
                topProductsEl.innerHTML = activeProducts
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
                recentOrdersEl.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-shopping-cart"></i>
                        <p>Belum ada pesanan.</p>
                    </div>`;
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
                                <span class="${statusToBadgeClass(o.status || 'pending')}">
                                    ${statusToText(o.status || 'pending')}
                                </span>
                                <p>${formatRupiah(o.total || 0)}</p>
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

    // ====== UBAH PASSWORD (Supabase Auth) ======
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
        if (!user) return;

        await fetchProducts();
        await fetchOrders();
        renderProductTable();
        renderOrderTable();
        updateDashboard();
        showPage('dashboard');
    })();
}

// Start init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}
