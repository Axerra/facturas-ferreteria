const Backup = {
    dirHandle: null,

    async selectFolder() {
        try {
            this.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            localStorage.setItem('gallinaza_backup_folder', this.dirHandle.name);
            return true;
        } catch (e) {
            return false;
        }
    },

    getMonthName(month) {
        const names = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        return names[month];
    },

    sanitizeFileName(str) {
        return str.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
    },

    async saveInvoice(invoice) {
        if (!this.dirHandle) {
            const savedName = localStorage.getItem('gallinaza_backup_folder');
            if (!savedName) return;
            try {
                this.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            } catch (e) {
                return;
            }
        }

        try {
            const date = new Date(invoice.date);
            const monthYear = `${this.getMonthName(date.getMonth())} ${date.getFullYear()}`;

            const monthDir = await this.dirHandle.getDirectoryHandle(monthYear, { create: true });

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const clientName = this.sanitizeFileName(invoice.client.name || 'SinCliente');
            const fileName = `${day}-${month}-${year} ${clientName}.json`;

            const fileHandle = await monthDir.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(invoice, null, 2));
            await writable.close();

            return true;
        } catch (e) {
            console.error('Error guardando factura:', e);
            return false;
        }
    },

    async updateInvoice(invoice) {
        return this.saveInvoice(invoice);
    },

    async restoreFromFolder() {
        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
            let count = 0;

            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'directory') {
                    for await (const file of entry.values()) {
                        if (file.kind === 'file' && file.name.endsWith('.json')) {
                            const fileHandle = await entry.getFileHandle(file.name);
                            const fileData = await fileHandle.getFile();
                            const text = await fileData.text();
                            const invoice = JSON.parse(text);

                            if (invoice.number && invoice.type === 'factura') {
                                const invoices = Storage.getInvoices();
                                const exists = invoices.some(inv => inv.number === invoice.number);
                                if (!exists) {
                                    invoices.push(invoice);
                                    Storage.saveInvoices(invoices);
                                    count++;
                                }
                            }
                        }
                    }
                }
            }

            return count;
        } catch (e) {
            return 0;
        }
    },

    async exportAll() {
        const invoices = Storage.getInvoices();
        const quotations = Storage.getQuotations();
        const products = Storage.getProducts();

        const data = {
            invoices,
            quotations,
            products,
            exportDate: new Date().toISOString(),
            companyName: 'Gallinaza y Materiales Tejada'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date();
        const fileName = `backup-gallinaza-${date.getDate()}-${date.getMonth()+1}-${date.getFullYear()}.json`;
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    },

    async importFromBackup() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) { resolve(0); return; }

                try {
                    const text = await file.text();
                    const data = JSON.parse(text);

                    if (data.invoices) {
                        const existing = Storage.getInvoices();
                        const existingNumbers = new Set(existing.map(i => i.number));
                        const newInvoices = data.invoices.filter(i => !existingNumbers.has(i.number));
                        Storage.saveInvoices([...existing, ...newInvoices]);
                    }
                    if (data.quotations) {
                        const existing = Storage.getQuotations();
                        const existingNumbers = new Set(existing.map(q => q.number));
                        const newQuotations = data.quotations.filter(q => !existingNumbers.has(q.number));
                        Storage.saveQuotations([...existing, ...newQuotations]);
                    }
                    if (data.products) {
                        const existing = Storage.getProducts();
                        const existingCodes = new Set(existing.map(p => p.code));
                        const newProducts = data.products.filter(p => !existingCodes.has(p.code));
                        Storage.saveProducts([...existing, ...newProducts]);
                    }

                    resolve((data.invoices || []).length + (data.quotations || []).length);
                } catch (err) {
                    resolve(0);
                }
            };
            input.click();
        });
    }
};
