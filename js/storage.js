const Storage = {
    get(key) {
        const data = localStorage.getItem(`gallinaza_${key}`);
        return data ? JSON.parse(data) : null;
    },

    set(key, value) {
        localStorage.setItem(`gallinaza_${key}`, JSON.stringify(value));
    },

    getProducts() {
        return this.get('products') || [];
    },

    saveProducts(products) {
        this.set('products', products);
    },

    getInvoices() {
        return this.get('invoices') || [];
    },

    saveInvoices(invoices) {
        this.set('invoices', invoices);
    },

    saveInvoice(invoice) {
        const invoices = this.getInvoices();
        const index = invoices.findIndex(inv => inv.number === invoice.number);
        if (index !== -1) {
            invoices[index] = invoice;
        } else {
            invoices.push(invoice);
        }
        this.saveInvoices(invoices);
    },

    getQuotations() {
        return this.get('quotations') || [];
    },

    saveQuotations(quotations) {
        this.set('quotations', quotations);
    },

    getNextInvoiceNumber() {
        const last = this.get('lastInvoiceNumber') || 0;
        const next = last + 1;
        this.set('lastInvoiceNumber', next);
        return next;
    },

    getNextQuotationNumber() {
        const last = this.get('lastQuotationNumber') || 0;
        const next = last + 1;
        this.set('lastQuotationNumber', next);
        return next;
    },

    initSampleProducts(products) {
        if (this.getProducts().length === 0) {
            this.saveProducts(products);
        }
    }
};
