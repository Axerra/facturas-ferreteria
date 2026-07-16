const Quotations = {
    items: [],

    init() {
        this.items = [];
        Products.populateSelect('quote-product-select');
        this.setupListeners();
    },

    setupListeners() {
        const select = document.getElementById('quote-product-select');
        select.addEventListener('change', () => {
            const product = Products.getById(parseInt(select.value));
            document.getElementById('quote-unit-price').value = product ? product.price : '';
        });
    },

    addItem() {
        const select = document.getElementById('quote-product-select');
        const quantity = parseInt(document.getElementById('quote-quantity').value);
        const productId = parseInt(select.value);

        if (!productId || isNaN(quantity) || quantity <= 0) {
            alert('Seleccione un producto y cantidad válida');
            return;
        }

        const product = Products.getById(productId);
        if (!product) return;

        this.items.push({
            productId: product.id,
            name: product.name,
            quantity: quantity,
            unitPrice: product.price,
            total: quantity * product.price
        });

        this.updateTable();
        select.value = '';
        document.getElementById('quote-unit-price').value = '';
        document.getElementById('quote-quantity').value = 1;
    },

    removeItem(index) {
        this.items.splice(index, 1);
        this.updateTable();
    },

    updateTable() {
        const tbody = document.getElementById('quote-items-body');
        tbody.innerHTML = this.items.map((item, i) => `
            <tr>
                <td>${item.quantity}</td>
                <td>${item.name}</td>
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
        document.getElementById('quote-client-name').value = '';
        document.getElementById('quote-client-id').value = '';
        document.getElementById('quote-client-phone').value = '';
        document.getElementById('quote-client-address').value = '';
        document.getElementById('quote-product-select').value = '';
        document.getElementById('quote-unit-price').value = '';
        document.getElementById('quote-quantity').value = 1;
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

        const client = this.getClientData();
        const quoteNumber = Storage.getNextQuotationNumber();
        const date = new Date().toLocaleDateString('es-CO');
        const total = this.items.reduce((sum, item) => sum + item.total, 0);

        const html = this.generatePrintHTML(quoteNumber, date, client, total);
        this.openPrintWindow(html);
    },

    generatePrintHTML(quoteNumber, date, client, total) {
        const itemsHTML = this.items.map(item => `
            <tr>
                <td style="text-align:center;">${item.quantity}</td>
                <td>${item.name}</td>
                <td style="text-align:right;">${Products.formatCurrency(item.unitPrice)}</td>
                <td style="text-align:right;">${Products.formatCurrency(item.total)}</td>
            </tr>
        `).join('');

        const total = this.items.reduce((sum, item) => sum + item.total, 0);

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
                <div><span class="info-label">Cliente:</span> ${client.name || 'N/A'}</div>
                <div><span class="info-label">NIT/Cédula:</span> ${client.id || 'N/A'}</div>
            </div>
            <div class="info-row">
                <div><span class="info-label">Teléfono:</span> ${client.phone || 'N/A'}</div>
                <div><span class="info-label">Dirección:</span> ${client.address || 'N/A'}</div>
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
        const quotation = {
            number: Storage.getNextQuotationNumber(),
            date: new Date().toISOString(),
            client,
            items: [...this.items],
            total: this.items.reduce((sum, item) => sum + item.total, 0),
            type: 'cotizacion'
        };

        const quotations = Storage.getQuotations();
        quotations.push(quotation);
        Storage.saveQuotations(quotations);
        return quotation;
    },

    convertToInvoice() {
        if (this.items.length === 0) {
            alert('Agregue al menos un producto');
            return;
        }

        const client = this.getClientData();
        
        // Fill invoice form
        document.getElementById('invoice-number').value = String(Storage.get('lastInvoiceNumber') || 0 + 1).padStart(6, '0');
        document.getElementById('invoice-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('invoice-client-name').value = client.name;
        document.getElementById('invoice-client-id').value = client.id;
        document.getElementById('invoice-client-phone').value = client.phone;
        document.getElementById('invoice-client-address').value = client.address;

        // Copy items
        Invoices.items = [...this.items];
        Invoices.updateTable();

        // Save as quotation first
        this.save();

        // Navigate to invoices
        App.navigateTo('invoices');
    }
};
