const Quotations = {
    items: [],
    currentQuoteNumber: null,

    init() {
        this.items = [];
        this.currentQuoteNumber = null;
        this.setupListeners();
        this.clearSearchFields();
    },

    setupListeners() {
        if (this.listenersReady) return;
        this.listenersReady = true;

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.product-search-container')) {
                document.getElementById('quote-product-list').classList.remove('active');
            }
        });
    },

    clearSearchFields() {
        document.getElementById('quote-product-search').value = '';
        document.getElementById('quote-product-id').value = '';
        document.getElementById('quote-unit-price').value = '';
        document.getElementById('quote-quantity').value = 1;
    },

    searchProduct(query) {
        const list = document.getElementById('quote-product-list');
        const results = Products.search(query);
        
        if (query.length === 0) {
            list.classList.remove('active');
            return;
        }

        if (results.length === 0) {
            list.innerHTML = '<div class="product-search-no-results">No se encontraron productos</div>';
        } else {
            list.innerHTML = results.map(p => `
                <div class="product-search-item" onclick="Quotations.selectProduct(${p.id})">
                    <span class="product-name">${Products.escapeHtml(p.name)}</span>
                    <span class="product-price">${Products.formatCurrency(p.price)}</span>
                </div>
            `).join('');
        }
        
        list.classList.add('active');
    },

    selectProduct(productId) {
        const product = Products.getById(productId);
        if (!product) return;

        document.getElementById('quote-product-search').value = product.name;
        document.getElementById('quote-product-id').value = product.id;
        document.getElementById('quote-unit-price').value = product.price;
        document.getElementById('quote-product-list').classList.remove('active');
    },

    addItem() {
        const productId = parseInt(document.getElementById('quote-product-id').value);
        const quantity = parseFloat(document.getElementById('quote-quantity').value);
        const unitPrice = parseFloat(document.getElementById('quote-unit-price').value);

        if (!productId || isNaN(quantity) || quantity <= 0) {
            alert('Seleccione un producto y cantidad válida');
            return;
        }

        if (isNaN(unitPrice) || unitPrice < 0) {
            alert('Ingrese un precio unitario válido');
            return;
        }

        const product = Products.getById(productId);
        if (!product) return;

        // Precio tomado del campo editable (solo para esta cotización); total redondeado al peso
        this.items.push({
            productId: product.id,
            name: product.name,
            quantity: quantity,
            unitPrice: unitPrice,
            total: Math.round(quantity * unitPrice)
        });

        // El carrito cambió: la próxima impresión será una cotización nueva
        this.currentQuoteNumber = null;
        this.updateTable();
        this.clearSearchFields();
    },

    removeItem(index) {
        this.items.splice(index, 1);
        this.currentQuoteNumber = null;
        this.updateTable();
    },

    updateTable() {
        const tbody = document.getElementById('quote-items-body');
        tbody.innerHTML = this.items.map((item, i) => `
            <tr>
                <td>${item.quantity}</td>
                <td>${Products.escapeHtml(item.name)}</td>
                <td>${Products.formatCurrency(item.unitPrice)}</td>
                <td>${Products.formatCurrency(item.total)}</td>
                <td><button class="btn btn-danger btn-small" onclick="Quotations.removeItem(${i})">X</button></td>
            </tr>
        `).join('');

        this.updateTotals();
    },

    updateTotals() {
        const total = this.items.reduce((sum, item) => sum + item.total, 0);

        document.getElementById('quote-total').textContent = Products.formatCurrency(total);
    },

    clearForm() {
        this.items = [];
        this.currentQuoteNumber = null;
        document.getElementById('quote-client-name').value = '';
        document.getElementById('quote-client-id').value = '';
        document.getElementById('quote-client-phone').value = '';
        document.getElementById('quote-client-address').value = '';
        this.clearSearchFields();
        this.updateTable();
    },

    getClientData() {
        return {
            name: document.getElementById('quote-client-name').value.trim(),
            id: document.getElementById('quote-client-id').value.trim(),
            phone: document.getElementById('quote-client-phone').value.trim(),
            address: document.getElementById('quote-client-address').value.trim()
        };
    },

    print() {
        if (this.items.length === 0) {
            alert('Agregue al menos un producto');
            return;
        }

        // Guarda la cotización (asigna y persiste su número) para que quede en el
        // Historial y el número impreso coincida con el guardado. Antes se "quemaban"
        // números en cada impresión sin guardar nada.
        const quotation = this.save();
        if (!quotation) return;

        const date = Storage.parseLocalDate(quotation.date).toLocaleDateString('es-CO');
        const html = this.generatePrintHTML(quotation.number, date, quotation.client, quotation.total, quotation.items);
        this.openPrintWindow(html);
    },

    generatePrintHTML(quoteNumber, date, client, total, items) {
        const itemsHTML = (items || this.items).map(item => `            <tr>
                <td style="text-align:center;">${item.quantity}</td>
                <td>${Products.escapeHtml(item.name)}</td>
                <td style="text-align:right;">${Products.formatCurrency(item.unitPrice)}</td>
                <td style="text-align:right;">${Products.formatCurrency(item.total)}</td>
            </tr>
        `).join('');

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cotización ${quoteNumber}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
                .company-name { font-size: 24px; font-weight: bold; }
                .company-info { font-size: 12px; color: #555; margin-top: 5px; }
                .doc-type { font-size: 18px; font-weight: bold; color: #1a237e; margin: 10px 0; }
                .info-row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 14px; }
                .info-label { font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background-color: #1a237e; color: white; padding: 10px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                .totals { max-width: 300px; margin-left: auto; margin-top: 20px; }
                .total-line { display: flex; justify-content: space-between; padding: 5px 0; }
                .total-final { border-top: 2px solid #1a237e; font-weight: bold; font-size: 18px; margin-top: 5px; }
                .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-name">GALLINAZA Y MATERIALES TEJADA</div>
                <div class="company-info">NIT: 4640733-0</div>
                <div class="company-info">Arcadio Tejada Núñez Responsable del IVA</div>
                <div class="company-info">Vda. La Florida Piendamó</div>
                <div class="company-info">Cel: 3168305501 - 3117096101</div>
            </div>

            <div class="doc-type">COTIZACIÓN</div>

            <div class="info-row">
                <div><span class="info-label">Fecha:</span> ${date}</div>
                <div><span class="info-label">No. Cotización:</span> ${String(quoteNumber).padStart(6, '0')}</div>
            </div>
            <div class="info-row">
                <div><span class="info-label">Cliente:</span> ${Products.escapeHtml(client.name) || 'N/A'}</div>
                <div><span class="info-label">NIT/Cédula:</span> ${Products.escapeHtml(client.id) || 'N/A'}</div>
            </div>
            <div class="info-row">
                <div><span class="info-label">Teléfono:</span> ${Products.escapeHtml(client.phone) || 'N/A'}</div>
                <div><span class="info-label">Dirección:</span> ${Products.escapeHtml(client.address) || 'N/A'}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="text-align:center;">Cant.</th>
                        <th>Detalles</th>
                        <th style="text-align:right;">Valor Unitario</th>
                        <th style="text-align:right;">Valor Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>

            <div class="totals">
                <div class="total-line total-final">
                    <span>TOTAL:</span>
                    <span>${Products.formatCurrency(total)}</span>
                </div>
            </div>

            <div class="footer">
                <p>Esta cotización tiene una validez de 15 días</p>
                <p>Gallinaza y Materiales Tejada - Vda. La Florida Piendamó</p>
            </div>
        </body>
        </html>`;
    },

    openPrintWindow(html) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    },

    save() {
        if (this.items.length === 0) {
            alert('Agregue al menos un producto');
            return false;
        }

        const client = this.getClientData();
        const total = this.items.reduce((sum, item) => sum + item.total, 0);
        const quotations = Storage.getQuotations();

        let quotation = null;

        // Si esta cotización ya fue guardada (mismo carrito), la actualizamos en vez
        // de crear una nueva; así reimprimir no genera duplicados ni "quema" números.
        if (this.currentQuoteNumber != null) {
            const idx = quotations.findIndex(q => q.number === this.currentQuoteNumber);
            if (idx !== -1) {
                quotation = { ...quotations[idx], client, items: [...this.items], total };
                quotations[idx] = quotation;
            }
        }

        if (!quotation) {
            quotation = {
                number: Storage.getNextQuotationNumber(),
                date: new Date().toISOString(),
                client,
                items: [...this.items],
                total,
                type: 'cotizacion'
            };
            quotations.push(quotation);
        }

        const ok = Storage.saveQuotations(quotations);
        if (!ok) return false;

        this.currentQuoteNumber = quotation.number;
        return quotation;
    },

    convertToInvoice() {
        if (this.items.length === 0) {
            alert('Agregue al menos un producto');
            return;
        }

        const client = this.getClientData();
        const itemsToTransfer = [...this.items];

        // Save as quotation first
        this.save();

        // Navigate to invoices (this resets Invoices.items/fields via Invoices.init())
        App.navigateTo('invoices');

        // Now fill the invoice form with the quotation's client and items
        document.getElementById('invoice-client-name').value = client.name;
        document.getElementById('invoice-client-id').value = client.id;
        document.getElementById('invoice-client-phone').value = client.phone;
        document.getElementById('invoice-client-address').value = client.address;

        Invoices.items = itemsToTransfer;
        Invoices.updateTable();
    }
};
