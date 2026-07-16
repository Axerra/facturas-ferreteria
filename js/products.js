const Products = {
    init() {
        Storage.initSampleProducts(SAMPLE_PRODUCTS);
        this.load();
    },

    load() {
        const products = Storage.getProducts();
        const tbody = document.getElementById('products-table-body');
        tbody.innerHTML = products.map(p => `
            <tr>
                <td>${p.code}</td>
                <td>${p.name}</td>
                <td>${this.formatCurrency(p.price)}</td>
                <td>${p.stock}</td>
                <td class="actions">
                    <button class="btn btn-primary btn-small" onclick="Products.edit(${p.id})">Editar</button>
                    <button class="btn btn-danger btn-small" onclick="Products.delete(${p.id})">Eliminar</button>
                </td>
            </tr>
        `).join('');
    },

    formatCurrency(value) {
        return '$' + value.toLocaleString('es-CO');
    },

    populateSelect(selectId) {
        const products = Storage.getProducts();
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Seleccionar producto...</option>' +
            products.map(p => `<option value="${p.id}">${p.name} - ${this.formatCurrency(p.price)}</option>`).join('');
    },

    showAddModal() {
        document.getElementById('modal-product-title').textContent = 'Nuevo Producto';
        document.getElementById('modal-product-id').value = '';
        document.getElementById('modal-product-code').value = '';
        document.getElementById('modal-product-name').value = '';
        document.getElementById('modal-product-price').value = '';
        document.getElementById('modal-product-stock').value = '';
        document.getElementById('product-modal').classList.add('active');
    },

    edit(id) {
        const products = Storage.getProducts();
        const product = products.find(p => p.id === id);
        if (!product) return;

        document.getElementById('modal-product-title').textContent = 'Editar Producto';
        document.getElementById('modal-product-id').value = product.id;
        document.getElementById('modal-product-code').value = product.code;
        document.getElementById('modal-product-name').value = product.name;
        document.getElementById('modal-product-price').value = product.price;
        document.getElementById('modal-product-stock').value = product.stock;
        document.getElementById('product-modal').classList.add('active');
    },

    closeModal() {
        document.getElementById('product-modal').classList.remove('active');
    },

    saveProduct() {
        const id = document.getElementById('modal-product-id').value;
        const code = document.getElementById('modal-product-code').value.trim();
        const name = document.getElementById('modal-product-name').value.trim();
        const price = parseInt(document.getElementById('modal-product-price').value);
        const stock = parseInt(document.getElementById('modal-product-stock').value);

        if (!code || !name || isNaN(price) || isNaN(stock)) {
            alert('Por favor complete todos los campos');
            return;
        }

        const products = Storage.getProducts();

        if (id) {
            const index = products.findIndex(p => p.id === parseInt(id));
            if (index !== -1) {
                products[index] = { ...products[index], code, name, price, stock };
            }
        } else {
            const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
            products.push({ id: newId, code, name, price, stock });
        }

        Storage.saveProducts(products);
        this.closeModal();
        this.load();
    },

    delete(id) {
        if (!confirm('¿Está seguro de eliminar este producto?')) return;
        const products = Storage.getProducts().filter(p => p.id !== id);
        Storage.saveProducts(products);
        this.load();
    },

    getById(id) {
        return Storage.getProducts().find(p => p.id === id);
    }
};
