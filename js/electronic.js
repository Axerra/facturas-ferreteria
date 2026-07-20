const Electronic = {
    config: {
        baseUrl: 'https://api-sandbox.factus.com.co',
        clientId: '',
        clientSecret: '',
        username: '',
        password: '',
        numberingRangeId: null
    },

    token: null,
    tokenExpiry: null,

    init() {
        const saved = Storage.get('electronic_config');
        if (saved) {
            this.config = { ...this.config, ...saved };
        }
    },

    saveConfig() {
        Storage.set('electronic_config', this.config);
    },

    isConfigured() {
        return this.config.clientId && this.config.clientSecret && 
               this.config.username && this.config.password;
    },

    async authenticate() {
        if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.token;
        }

        const response = await fetch(`${this.config.baseUrl}/v2/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'password',
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                username: this.config.username,
                password: this.config.password
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error de autenticación');
        }

        const data = await response.json();
        this.token = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        return this.token;
    },

    async refreshToken() {
        const token = await this.authenticate();
        const response = await fetch(`${this.config.baseUrl}/v2/auth/refresh-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Error al refrescar token');

        const data = await response.json();
        this.token = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        return this.token;
    },

    buildInvoiceData(invoice) {
        const referenceCode = `FACT-${new Date().getFullYear()}-${String(invoice.number).padStart(6, '0')}`;
        
        const items = invoice.items.map(item => {
            const basePrice = Math.round(item.unitPrice / 1.19);
            return {
                code_reference: item.productId ? String(item.productId) : item.name.substring(0, 10),
                name: item.name,
                quantity: String(item.quantity),
                discount_rate: "0.00",
                price: String(basePrice),
                unit_measure_code: "94",
                standard_code: "999",
                taxes: [
                    {
                        code: "01",
                        rate: "19.00"
                    }
                ]
            };
        });

        const paymentForm = invoice.paymentStatus === 'pagado' ? '1' : '2';
        const paymentMethod = invoice.paymentStatus === 'pagado' ? '10' : '47';

        return {
            reference_code: referenceCode,
            document: "01",
            operation_type: "10",
            observation: `Factura ${invoice.number}`,
            payment_details: [
                {
                    payment_form: paymentForm,
                    payment_method_code: paymentMethod,
                    amount: String(invoice.total)
                }
            ],
            customer: {
                identification_document_code: this.getIdType(invoice.client.id),
                identification: invoice.client.id || '2222222222222',
                company: invoice.client.name,
                address: invoice.client.address || '',
                email: '',
                phone: invoice.client.phone || '',
                legal_organization_code: "1",
                tribute_code: "ZZ",
                country_code: "CO",
                municipality_code: "11001"
            },
            items: items
        };
    },

    getIdType(id) {
        if (!id) return "13";
        if (/^\d{9,10}$/.test(id)) return "31";
        if (/^\d{6,12}$/.test(id)) return "13";
        return "13";
    },

    async createInvoice(invoice) {
        if (!this.isConfigured()) {
            return { success: false, message: 'Configure sus credenciales de Factus primero' };
        }

        try {
            const token = await this.authenticate();
            const invoiceData = this.buildInvoiceData(invoice);

            const response = await fetch(`${this.config.baseUrl}/v2/bills/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(invoiceData)
            });

            const result = await response.json();

            if (!response.ok) {
                return { 
                    success: false, 
                    message: result.message || 'Error al crear factura electrónica',
                    errors: result.errors || []
                };
            }

            return { 
                success: true, 
                data: result.data,
                message: 'Factura electrónica creada exitosamente'
            };
        } catch (error) {
            return { 
                success: false, 
                message: error.message || 'Error de conexión con Factus'
            };
        }
    },

    async downloadPDF(referenceCode) {
        if (!this.isConfigured()) return null;

        try {
            const token = await this.authenticate();
            const response = await fetch(`${this.config.baseUrl}/v2/bills/download-pdf/${referenceCode}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            return null;
        }
    },

    async downloadXML(referenceCode) {
        if (!this.isConfigured()) return null;

        try {
            const token = await this.authenticate();
            const response = await fetch(`${this.config.baseUrl}/v2/bills/download-xml/${referenceCode}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            return null;
        }
    },

    showConfigModal() {
        document.getElementById('electronic-client-id').value = this.config.clientId;
        document.getElementById('electronic-client-secret').value = this.config.clientSecret;
        document.getElementById('electronic-username').value = this.config.username;
        document.getElementById('electronic-password').value = this.config.password;
        document.getElementById('electronic-base-url').value = this.config.baseUrl;
        document.getElementById('electronic-modal').classList.add('active');
    },

    closeConfigModal() {
        document.getElementById('electronic-modal').classList.remove('active');
    },

    saveConfigFromModal() {
        this.config.clientId = document.getElementById('electronic-client-id').value.trim();
        this.config.clientSecret = document.getElementById('electronic-client-secret').value.trim();
        this.config.username = document.getElementById('electronic-username').value.trim();
        this.config.password = document.getElementById('electronic-password').value.trim();
        this.config.baseUrl = document.getElementById('electronic-base-url').value.trim();
        
        this.saveConfig();
        this.closeConfigModal();
        alert('Configuración guardada');
    },

    async testConnection() {
        try {
            await this.authenticate();
            alert('Conexión exitosa');
            return true;
        } catch (error) {
            alert('Error de conexión: ' + error.message);
            return false;
        }
    },

    async sendInvoice() {
        if (Invoices.items.length === 0) {
            alert('Primero agregue productos a la factura');
            return;
        }

        const client = Invoices.getClientData();
        if (!client.name) {
            alert('Ingrese el nombre del cliente');
            return;
        }

        if (!this.isConfigured()) {
            alert('Configure sus credenciales de Factus primero en el menú lateral');
            return;
        }

        const formData = Invoices.getFormData();
        const total = Invoices.items.reduce((sum, item) => sum + item.total, 0);

        const invoice = {
            number: parseInt(formData.number),
            date: formData.date,
            client,
            shippingAddress: formData.shippingAddress,
            items: [...Invoices.items],
            total,
            payment: formData.payment,
            balance: total - formData.payment,
            paymentStatus: formData.paymentStatus,
            dispatchStatus: formData.dispatchStatus,
            type: 'factura',
            createdAt: new Date().toISOString()
        };

        try {
            const result = await this.createInvoice(invoice);
            if (!result.success) {
                alert('Error: ' + result.message);
                return;
            }

            invoice.electronicInvoice = true;
            invoice.electronicUuid = result.data?.uuid;

            const invoices = Storage.getInvoices();
            invoices.push(invoice);
            const persisted = Storage.saveInvoices(invoices);
            if (!persisted) {
                alert('¡ATENCIÓN! La factura SÍ se envió a la DIAN (código: ' + (result.data?.uuid || 'N/A') + '), ' +
                      'pero NO se pudo guardar en este equipo. Anote el código y descargue un backup antes de continuar.');
                return;
            }
            Invoices.applyStockChange(invoice.items, -1);
            Storage.set('lastInvoiceNumber', invoice.number);

            await Backup.saveInvoice(invoice);

            alert('Factura electrónica enviada exitosamente\nCódigo: ' + (result.data?.uuid || 'N/A'));

            Invoices.clearForm();
            History.load();
            App.updateDashboard();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    },

    async sendInvoiceByNumber(number) {
        const invoices = Storage.getInvoices();
        const invoice = invoices.find(inv => inv.number === number);
        if (!invoice) {
            alert('Factura no encontrada');
            return;
        }

        if (!this.isConfigured()) {
            alert('Configure sus credenciales de Factus primero');
            return;
        }

        try {
            const result = await this.createInvoice(invoice);
            if (result.success) {
                invoice.electronicInvoice = true;
                invoice.electronicUuid = result.data?.uuid;
                Storage.saveInvoice(invoice);
                alert('Factura electrónica enviada exitosamente');
                History.load();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
};
