const Storage = {
    get(key) {
        const data = localStorage.getItem(`gallinaza_${key}`);
        if (!data) return null;
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error(`Datos corruptos en "${key}":`, e);
            // Preservar una copia del dato dañado para posible recuperación manual
            try {
                localStorage.setItem(`gallinaza_${key}_corrupto_${Date.now()}`, data);
            } catch (_) {}
            alert(`ADVERTENCIA: Los datos de "${key}" estaban dañados y no se pudieron leer. ` +
                  `Se guardó una copia de respaldo. Si tenía facturas, restaure desde su último backup.`);
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(`gallinaza_${key}`, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Error guardando "${key}":`, e);
            alert('ERROR: No se pudo guardar la información en el disco.\n\n' +
                  'Posible causa: espacio de almacenamiento lleno o datos dañados.\n' +
                  'Descargue un "Backup Completo" y contacte soporte antes de continuar. ' +
                  'La última operación NO se guardó.');
            return false;
        }
    },

    // Fecha de hoy en hora local como 'YYYY-MM-DD' (evita el desfase de UTC)
    todayLocalISO() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },

    // Interpreta 'YYYY-MM-DD' como fecha local (no UTC); deja pasar ISO completos tal cual
    parseLocalDate(dateStr) {
        if (!dateStr) return new Date();
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        return new Date(dateStr);
    },

    getProducts() {
        return this.get('products') || [];
    },

    saveProducts(products) {
        return this.set('products', products);
    },

    getInvoices() {
        return this.get('invoices') || [];
    },

    saveInvoices(invoices) {
        return this.set('invoices', invoices);
    },

    saveInvoice(invoice) {
        const invoices = this.getInvoices();
        const index = invoices.findIndex(inv => inv.number === invoice.number);
        if (index !== -1) {
            invoices[index] = invoice;
        } else {
            invoices.push(invoice);
        }
        return this.saveInvoices(invoices);
    },

    getQuotations() {
        return this.get('quotations') || [];
    },

    saveQuotations(quotations) {
        return this.set('quotations', quotations);
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
