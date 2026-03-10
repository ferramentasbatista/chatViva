class VivaChat {
    constructor(config = {}) {
        this.apiBaseUrl = config.apiBaseUrl || 'https://chat-api.vivaexperiencias.com.br/chat';
        this.whatsappPhone = config.whatsappPhone || '5511942169624';
        this.sessionDurationMinutes = 30;
        this.warningMinutes = 5;

        this.modalOpen = false;
        this.step = 1;
        this.isLoading = false;
        this.isSessionLoading = false;
        this.isTyping = false;
        this.shouldShowVivaChat = true;

        this.isSessionExpiring = false;
        this.sessionTimeRemaining = 0;
        this.sessionTimer = null;
        this.sessionExpirationTime = null;

        this.message = '';
        this.messages = [];
        this.sessionId = null;

        this.isSessionFinalized = false;
        this.showNewSessionButton = false;
        this.savedClientData = null;

        this.isSupportDetected = false;
        this.supportWhatsAppUrl = null;

        this.evaluationState = {
            showEvaluation: false,
            isSubmitting: false,
            isSubmitted: false,
            alreadyEvaluated: false,
            rating: 0,
            feedback: '',
            isMinimized: false,
        };

        this.userData = {
            nome: '',
            email: '',
            telefone: '',
        };

        this.messageFormatCache = new Map();
        this.whatsAppProcessedMessageIds = new Set();

        this.init();
    }

    init() {
        this.loadSessionFromLocalStorage();
        this.setupEventListeners();
        this.setupPhoneMask();

        if (this.sessionId && this.step === 2) {
            this.syncMessagesWithServer();
        }
    }

    setupEventListeners() {
        const floatButton = document.getElementById('chatFloatButton');
        const closeButton = document.getElementById('closeChatButton');
        const overlay = document.getElementById('chatModalOverlay');
        const userForm = document.getElementById('userForm');
        const messageForm = document.getElementById('messageForm');
        const messageInput = document.getElementById('messageInput');
        const startNewSessionBtn = document.getElementById('startNewSessionBtn');
        const nomeInput = document.getElementById('nome');
        const emailInput = document.getElementById('email');
        const telefoneInput = document.getElementById('telefone');

        if (floatButton) {
            floatButton.addEventListener('click', () => this.openModal());
        }

        if (closeButton) {
            closeButton.addEventListener('click', () => this.closeModal());
        }


        if (userForm) {
            userForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitUserData();
            });
        }

        if (messageForm) {
            messageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendMessage();
            });
        }

        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !this.isSessionFinalized && !this.isSupportDetected) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            messageInput.addEventListener('input', () => {
                this.updateButtons();
            });
        }

        if (startNewSessionBtn) {
            startNewSessionBtn.addEventListener('click', () => this.startNewSession());
        }

        const validateForm = () => {
            this.updateButtons();
        };

        if (nomeInput) {
            nomeInput.addEventListener('input', validateForm);
            nomeInput.addEventListener('blur', validateForm);
        }

        if (emailInput) {
            emailInput.addEventListener('input', validateForm);
            emailInput.addEventListener('blur', validateForm);
        }

        if (telefoneInput) {
            telefoneInput.addEventListener('input', validateForm);
            telefoneInput.addEventListener('blur', validateForm);
        }

        if (!this.modalOpen) {
            const floatBtn = document.getElementById('chatFloatButton');
            if (floatBtn) {
                floatBtn.classList.add('pulse');
            }
        }
    }

    setupPhoneMask() {
        const telefoneInput = document.getElementById('telefone');
        if (telefoneInput) {
            telefoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 11) {
                    value = value.substring(0, 11);
                }
                if (value.length <= 11) {
                    if (value.length <= 10) {
                        value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
                    } else {
                        value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
                    }
                    e.target.value = value;
                }
            });

            telefoneInput.addEventListener('keydown', (e) => {
                const value = e.target.value.replace(/\D/g, '');
                if (value.length >= 11 && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        }
    }

    openModal() {
        this.modalOpen = true;
        const overlay = document.getElementById('chatModalOverlay');
        if (overlay) {
            overlay.style.display = 'block';
        }

        const floatBtn = document.getElementById('chatFloatButton');
        if (floatBtn) {
            floatBtn.classList.remove('pulse');
        }

        this.loadSessionFromLocalStorage();

        if (this.sessionId && this.step === 2) {
            this.syncMessagesWithServer();
        } else if (this.step === 2 && this.messages.length > 0) {
            this.detectAndHandleSessionTermination();
            this.processLocalMessagesForWhatsAppSupport();
            this.handleWhatsAppSupportPersistence();
            this.scrollToNewMessage();
        }

        this.updateUI();

        setTimeout(() => {
            const messageInput = document.getElementById('messageInput');
            if (messageInput && this.step === 2) {
                messageInput.focus();
            }
        }, 100);
    }

    closeModal() {
        this.modalOpen = false;
        const overlay = document.getElementById('chatModalOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }

        const floatBtn = document.getElementById('chatFloatButton');
        if (floatBtn && !this.modalOpen) {
            floatBtn.classList.add('pulse');
        }

        this.saveSessionToLocalStorage();

        this.isLoading = false;
        this.isTyping = false;
        this.message = '';

        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = '';
        }
    }

    resetChat() {
        this.step = 1;
        this.messages = [];
        this.message = '';
        this.sessionId = null;
        this.userData = { nome: '', email: '', telefone: '' };

        this.isSessionFinalized = false;
        this.showNewSessionButton = false;
        this.savedClientData = null;

        this.isSupportDetected = false;
        this.supportWhatsAppUrl = null;

        this.evaluationState = {
            showEvaluation: false,
            isSubmitting: false,
            isSubmitted: false,
            alreadyEvaluated: false,
            rating: 0,
            feedback: '',
            isMinimized: false,
        };

        this.clearSessionFromLocalStorage();
        this.updateUI();
    }

    submitUserData() {
        const nomeInput = document.getElementById('nome');
        const emailInput = document.getElementById('email');
        const telefoneInput = document.getElementById('telefone');

        this.userData.nome = nomeInput ? nomeInput.value.trim() : '';
        this.userData.email = emailInput ? emailInput.value.trim() : '';
        this.userData.telefone = telefoneInput ? telefoneInput.value.trim() : '';

        if (!this.isValidUserData()) {
            this.showValidationErrors();
            return;
        }

        this.hideValidationErrors();
        this.isSessionLoading = true;
        this.updateUI();
        this.createChatSession();
    }

    isValidUserData() {
        return !!(this.userData.nome && this.userData.email && this.userData.telefone);
    }

    showValidationErrors() {
        const nomeInput = document.getElementById('nome');
        const emailInput = document.getElementById('email');
        const telefoneInput = document.getElementById('telefone');

        if (!this.userData.nome) {
            const error = document.getElementById('nomeError');
            if (error) error.style.display = 'block';
        }

        if (!this.userData.email) {
            const error = document.getElementById('emailRequiredError');
            if (error) error.style.display = 'block';
        } else if (!this.isValidEmail(this.userData.email)) {
            const error = document.getElementById('emailFormatError');
            if (error) error.style.display = 'block';
        }

        if (!this.userData.telefone) {
            const error = document.getElementById('telefoneError');
            if (error) error.style.display = 'block';
        }
    }

    hideValidationErrors() {
        const errors = ['nomeError', 'emailRequiredError', 'emailFormatError', 'telefoneError'];
        errors.forEach(id => {
            const error = document.getElementById(id);
            if (error) error.style.display = 'none';
        });
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    formatPhoneNumber(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        return `+55${cleanPhone}`;
    }

    async createChatSession() {
        try {
            const sessionRequest = {
                title: 'Chat Bot IA',
                hotsiteDomain: 'landingpage',
                fullName: this.userData.nome,
                email: this.userData.email,
                phoneNumber: this.formatPhoneNumber(this.userData.telefone),
            };

            const response = await this.fetchWithTimeout(
                `${this.apiBaseUrl}/sessions/b2b`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(sessionRequest),
                },
                60000
            );

            if (!response.ok) {
                throw new Error('Erro ao criar sessão');
            }

            const data = await response.json();
            this.handleSessionCreationSuccess(data);
        } catch (error) {
            this.handleSessionCreationError();
        } finally {
            this.isSessionLoading = false;
            this.updateUI();
        }
    }

    handleSessionCreationSuccess(response) {
        this.sessionId = response.id;
        this.step = 2;

        this.saveSessionToLocalStorage();
        this.startSessionTimer();
        this.syncMessagesWithServer();
        this.scrollToNewMessage();
        this.updateUI();

        setTimeout(() => {
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.focus();
            }
        }, 100);
    }

    handleSessionCreationError() {
        const errorMessage = {
            message: 'Erro ao inicializar o chat. Tente novamente em alguns instantes.',
            sender: 'assistant',
            createdAt: new Date().toISOString(),
        };
        this.messages.push(errorMessage);
        this.updateUI();
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput ? messageInput.value.trim() : '';

        if (!message || this.isLoading || this.isSessionFinalized || this.isSupportDetected) {
            return;
        }

        const userMessage = {
            message: message,
            sender: 'user',
            createdAt: new Date().toISOString(),
        };

        this.messages.push(userMessage);
        this.scrollToNewMessage();
        this.saveSessionToLocalStorage();

        if (messageInput) {
            messageInput.value = '';
        }

        this.isLoading = true;
        this.isTyping = true;
        this.updateUI();

        this.callChatApi(message);
    }

    async callChatApi(message) {
        if (!this.sessionId) {
            this.handleApiError();
            return;
        }

        const messageRequest = {
            message: message,
        };

        try {
            const response = await this.fetchWithTimeout(
                `${this.apiBaseUrl}/${this.sessionId}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(messageRequest),
                },
                60000
            );

            if (!response.ok) {
                throw new Error('Erro ao enviar mensagem');
            }

            const data = await response.json();
            await this.handleApiResponse(data);
        } catch (error) {
            this.handleApiError(error);
        } finally {
            this.isLoading = false;
            this.isTyping = false;
            this.updateUI();
        }
    }

    async handleApiResponse(response) {
        if (response.sessionId) {
            this.sessionId = response.sessionId;
        }

        if (this.isSequentialMessagesPlaceholder(response)) {
            await this.refreshMessagesAfterSequentialCreation();
            return;
        }

        const assistantMessage = {
            id: response.id,
            message: response.message,
            sender: 'assistant',
            createdAt: response.createdAt,
            model: response.model,
            sessionId: response.sessionId,
            metadata: response.metadata,
        };

        this.messages.push(assistantMessage);
        this.scrollToNewMessage();
        this.saveSessionToLocalStorage();

        if (this.isSessionTimeoutMessage(response)) {
            this.handleSessionTimeout();
            return;
        }

        const isB2BComplete = this.checkB2BQualificationComplete(response);
        if (isB2BComplete) {
            await this.handleB2BQualificationComplete();
            return;
        }

        await this.handleWidgetTrigger(response);
    }

    handleApiError(error) {
        let errorMessage = 'Desculpe, ocorreu um erro de conexão. Tente novamente em alguns instantes.';

        if (error) {
            if (error.name === 'TimeoutError') {
                errorMessage = 'A solicitação demorou mais que o esperado. Verifique sua conexão e tente novamente.';
            } else if (error.status === 504) {
                errorMessage = 'O servidor está temporariamente indisponível. Tente novamente em alguns instantes.';
            } else if (error.status === 0) {
                errorMessage = 'Erro de conectividade. Verifique sua conexão com a internet.';
            }
        }

        const chatErrorMessage = {
            message: errorMessage,
            sender: 'assistant',
            createdAt: new Date().toISOString(),
        };

        this.messages.push(chatErrorMessage);
        this.scrollToNewMessage();
        this.updateUI();
    }

    scrollToNewMessage() {
        const container = document.getElementById('messagesContainer');
        if (container) {
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight;
            });
        }
    }

    formatMessageTime(createdAt) {
        const date = new Date(createdAt);
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    formatMarkdownMessage(message) {
        if (this.messageFormatCache.has(message)) {
            return this.messageFormatCache.get(message);
        }

        const result = this.processMarkdownMessage(message);

        if (this.messageFormatCache.size > 100) {
            const firstKey = this.messageFormatCache.keys().next().value;
            this.messageFormatCache.delete(firstKey);
        }
        this.messageFormatCache.set(message, result);

        return result;
    }

    processMarkdownMessage(message) {
        const anchorTagPattern = /<a\s+href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
        const preservedAnchors = [];

        let messageWithPlaceholders = message.replace(anchorTagPattern, (match, href, text) => {
            const urlPattern = /^https?:\/\/[^\s<>"']+$/i;
            if (urlPattern.test(href)) {
                const placeholder = `__ANCHOR_${preservedAnchors.length}__`;
                preservedAnchors.push(`<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`);
                return placeholder;
            }
            return text;
        });

        const escapedMessage = messageWithPlaceholders
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');

        let html = escapedMessage
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');

        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
            const urlPattern = /^https?:\/\/[^\s<>"']+$/i;
            if (urlPattern.test(url)) {
                return `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
            }
            return match;
        });

        preservedAnchors.forEach((anchor, index) => {
            html = html.replace(`__ANCHOR_${index}__`, anchor);
        });

        return html;
    }

    async handleWidgetTrigger(response) {
        try {
            let whatsappHandoff = this.detectWhatsAppHandoff(response);

            if (!whatsappHandoff) {
                whatsappHandoff = this.detectWhatsAppHandoffFromMessage(response);
            }

            if (!whatsappHandoff) {
                return false;
            }

            this.isSupportDetected = true;

            const whatsappSummary = this.extractWhatsAppSummary(response.metadata);
            const encodedMessage = encodeURIComponent(whatsappSummary);
            this.supportWhatsAppUrl = `https://api.whatsapp.com/send/?phone=${this.whatsappPhone}&text=${encodedMessage}&type=phone_number&app_absent=0`;

            this.updateUI();
            return true;
        } catch (error) {
            return false;
        }
    }

    detectWhatsAppHandoff(response) {
        try {
            if (!response.metadata?.functionCallsExecuted) {
                return null;
            }

            const functionCalls = response.metadata.functionCallsExecuted;

            const handoffCall = functionCalls.find(call => call.function_name === 'human_support_redirect');

            if (!handoffCall) {
                const widgetTriggerCall = functionCalls.find(call => call.result?.data?.widget_trigger?.enabled === true);

                if (!widgetTriggerCall) {
                    const whatsappCall = functionCalls.find(call => call.result?.data?.whatsapp_summary);

                    if (!whatsappCall) {
                        return null;
                    }

                    const resultData = whatsappCall.result?.data;
                    const businessHoursActive = resultData?.business_hours_active === true;
                    const whatsappSummary = resultData?.whatsapp_summary || 'Olá! Preciso de ajuda com minha solicitação.';

                    return {
                        businessHoursActive,
                        summary: whatsappSummary,
                    };
                }

                const resultData = widgetTriggerCall.result?.data;
                const businessHoursActive = resultData?.business_hours_active === true;
                const whatsappSummary = resultData?.whatsapp_summary || 'Olá! Preciso de ajuda com minha solicitação.';

                return {
                    businessHoursActive,
                    summary: whatsappSummary,
                };
            }

            const resultData = handoffCall.result?.data;
            if (!resultData) {
                return null;
            }

            const businessHoursActive = resultData.business_hours_active === true;
            const whatsappSummary = resultData.whatsapp_summary || 'Olá! Preciso de ajuda com minha solicitação.';

            return {
                businessHoursActive,
                summary: whatsappSummary,
            };
        } catch (error) {
            return null;
        }
    }

    detectWhatsAppHandoffFromMessage(response) {
        try {
            if (!response.metadata?.functionCallsExecuted) {
                return null;
            }

            const functionCalls = response.metadata.functionCallsExecuted;

            const supportFunctionNames = [
                'human_support_redirect',
                'whatsapp_support',
                'transfer_to_human',
                'support_handoff',
            ];

            const supportCall = functionCalls.find(call => supportFunctionNames.includes(call.function_name));

            if (!supportCall) {
                return null;
            }

            const resultData = supportCall.result?.data;
            const businessHoursActive = resultData?.business_hours_active === true;
            const whatsappSummary = resultData?.whatsapp_summary || resultData?.summary || 'Cliente precisa de atendimento humano baseado na conversa.';

            return {
                businessHoursActive,
                summary: whatsappSummary,
            };
        } catch (error) {
            return null;
        }
    }

    handleWhatsAppClick(event) {
        event.preventDefault();

        if (!this.supportWhatsAppUrl) {
            return;
        }

        try {
            const anchorElement = document.createElement('a');
            anchorElement.href = this.supportWhatsAppUrl;
            anchorElement.target = '_blank';
            anchorElement.rel = 'noopener noreferrer';
            anchorElement.style.display = 'none';

            document.body.appendChild(anchorElement);
            anchorElement.click();

            setTimeout(() => {
                try {
                    if (document.body.contains(anchorElement)) {
                        document.body.removeChild(anchorElement);
                    }
                } catch (cleanupError) {}
            }, 100);

            if (!this.isSessionFinalized) {
                this.finalizeCurrentSession();
                this.showEvaluationInterface();
            }
        } catch (error) {}
    }

    checkB2BQualificationComplete(response) {
        try {
            if (response.metadata && response.metadata['b2b-qualification-complete'] === true) {
                return true;
            }

            if (response.metadata && response.metadata.functionCallsExecuted) {
                const functionCalls = response.metadata.functionCallsExecuted;
                for (const call of functionCalls) {
                    if (call.result && call.result.data && call.result.data.metadata) {
                        if (call.result.data.metadata['b2b-qualification-complete'] === true) {
                            return true;
                        }
                    }

                    if (call.result && call.result.data && call.result.data.qualification_complete === true) {
                        return true;
                    }
                }
            }

            if (response.metadata && response.metadata.functionCallsExecuted) {
                const functionCalls = response.metadata.functionCallsExecuted;
                for (const call of functionCalls) {
                    if (call.function_name === 'b2b_lead_qualification' && call.parameters && call.parameters.step === 'qualification_complete') {
                        return true;
                    }
                }
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    async handleB2BQualificationComplete() {
        try {
            const completionMessage = {
                message: 'Atendimento finalizado, agradecemos o seu contato!',
                sender: 'assistant',
                createdAt: new Date().toISOString(),
            };
            this.messages.push(completionMessage);
            this.scrollToNewMessage();
            this.saveSessionToLocalStorage();

            await new Promise(resolve => setTimeout(resolve, 1000));

            this.finalizeCurrentSession();
            this.showEvaluationInterface();
        } catch (error) {}
    }

    isSessionTimeoutMessage(message) {
        if (message.metadata?.type === 'timeout' && message.metadata?.reason === 'session_expired') {
            return true;
        }

        const timeoutPatterns = [
            /sua sessão expirou/i,
            /session expired/i,
            /sessão.*inatividade/i,
            /sessão expirou devido à inatividade/i,
            /para continuar.*inicie uma nova conversa/i,
            /timeout/i,
        ];

        return timeoutPatterns.some(pattern => pattern.test(message.message));
    }

    isSequentialMessagesPlaceholder(response) {
        return (
            response.id === 'sequential-messages-placeholder' &&
            response.message === 'Sequential messages created' &&
            response.sender === 'assistant' &&
            response.metadata?.sequentialMessagesCreated === true &&
            response.metadata?.context?.intent === 'B2B_SEQUENTIAL_MESSAGES_CREATED'
        );
    }

    async refreshMessagesAfterSequentialCreation() {
        if (!this.sessionId) {
            return;
        }

        try {
            const response = await this.fetchWithTimeout(
                `${this.apiBaseUrl}/${this.sessionId}/messages`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
                60000
            );

            if (!response.ok) {
                return;
            }

            const serverMessages = await response.json();

            if (serverMessages.length > 0) {
                this.messages = serverMessages.map(msg => ({
                    id: msg.id,
                    message: msg.message,
                    sender: msg.sender,
                    createdAt: msg.createdAt,
                    model: msg.model,
                    sessionId: msg.sessionId,
                    metadata: msg.metadata,
                }));

                this.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                this.saveSessionToLocalStorage();
                this.detectAndHandleSessionTermination();
                this.processServerMessagesForWhatsAppSupport(serverMessages);
                this.handleWhatsAppSupportPersistence();
                this.scrollToNewMessage();
                this.updateUI();
            }
        } catch (error) {}
    }

    detectAndHandleSessionTermination(messages = this.messages) {
        try {
            if (this.isSessionFinalized || this.isLoading) {
                return;
            }

            const hasTimeoutMessage = messages.some(message =>
                message.sender === 'assistant' && this.isSessionTimeoutMessage(message)
            );

            if (hasTimeoutMessage) {
                this.handleSessionTimeout();
                return;
            }

            const hasB2BCompletion = messages.some(message =>
                message.sender === 'assistant' && message.metadata && this.checkB2BQualificationComplete(message)
            );

            if (hasB2BCompletion) {
                this.finalizeCurrentSession();
                this.showEvaluationInterface();
                return;
            }

            const terminationPatterns = [
                /atendimento finalizado/i,
                /conversa encerrada/i,
                /sessão finalizada/i,
                /chat encerrado/i,
            ];

            const hasTerminationMessage = messages.some(message =>
                message.sender === 'assistant' && terminationPatterns.some(pattern => pattern.test(message.message))
            );

            if (hasTerminationMessage) {
                this.finalizeCurrentSession();
                this.showEvaluationInterface();
            }
        } catch (error) {}
    }

    handleSessionTimeout() {
        this.finalizeCurrentSession();
        this.showEvaluationInterface();
    }

    async showEvaluationInterface() {
        if (this.evaluationState.showEvaluation) {
            return;
        }

        if (!this.sessionId) {
            this.displayEvaluationForm();
            return;
        }

        try {
            const response = await this.fetchWithTimeout(
                `${this.apiBaseUrl}/evaluations/${this.sessionId}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
                60000
            );

            if (response.ok) {
                const data = await response.json();
                const alreadyEvaluated = data && (data.id || data.rating !== undefined);

                if (alreadyEvaluated) {
                    this.showAlreadyEvaluatedState();
                } else {
                    this.displayEvaluationForm();
                }
            } else {
                this.displayEvaluationForm();
            }
        } catch (error) {
            this.displayEvaluationForm();
        }
    }

    displayEvaluationForm() {
        this.evaluationState = {
            showEvaluation: true,
            isSubmitting: false,
            isSubmitted: false,
            alreadyEvaluated: false,
            rating: 0,
            feedback: '',
            isMinimized: false,
        };
        this.saveSessionToLocalStorage();
        this.updateUI();
    }

    showAlreadyEvaluatedState() {
        this.evaluationState = {
            showEvaluation: true,
            isSubmitting: false,
            isSubmitted: false,
            alreadyEvaluated: true,
            rating: 0,
            feedback: '',
            isMinimized: false,
        };
        this.saveSessionToLocalStorage();
        this.updateUI();
    }

    finalizeCurrentSession() {
        if (this.isSessionFinalized) {
            return;
        }

        this.savedClientData = {
            nome: this.userData.nome,
            email: this.userData.email,
            telefone: this.userData.telefone,
        };

        this.isSessionFinalized = true;
        this.showNewSessionButton = true;

        this.isSupportDetected = false;
        this.supportWhatsAppUrl = null;

        this.clearSessionTimer();

        this.isSessionExpiring = false;
        this.sessionTimeRemaining = 0;
        this.isLoading = false;
        this.isTyping = false;
        this.isSessionLoading = false;

        this.saveSessionToLocalStorage();
        this.updateUI();
    }

    startNewSession() {
        if (!this.savedClientData) {
            return;
        }

        const clientData = { ...this.savedClientData };

        this.resetChat();

        this.userData = {
            nome: clientData.nome,
            email: clientData.email,
            telefone: clientData.telefone,
        };

        this.isSessionLoading = true;
        this.updateUI();
        this.createChatSession();
    }

    saveSessionToLocalStorage() {
        const sessionData = {
            step: this.step,
            sessionId: this.sessionId,
            userData: this.userData,
            messages: this.messages,
            isSessionFinalized: this.isSessionFinalized,
            showNewSessionButton: this.showNewSessionButton,
            savedClientData: this.savedClientData,
            isSupportDetected: this.isSupportDetected,
            supportWhatsAppUrl: this.supportWhatsAppUrl,
            evaluationState: this.evaluationState,
            timestamp: new Date().getTime(),
        };

        localStorage.setItem('viva-chat-session', JSON.stringify(sessionData));
    }

    loadSessionFromLocalStorage() {
        try {
            const savedSession = localStorage.getItem('viva-chat-session');

            if (!savedSession) {
                return;
            }

            const sessionData = JSON.parse(savedSession);

            const now = new Date().getTime();
            const sessionAge = now - (sessionData.timestamp || 0);
            const maxAge = 24 * 60 * 60 * 1000;

            if (sessionAge > maxAge) {
                this.clearSessionFromLocalStorage();
                return;
            }

            this.step = sessionData.step || 1;
            this.sessionId = sessionData.sessionId || null;
            this.userData = sessionData.userData || { nome: '', email: '', telefone: '' };
            this.messages = sessionData.messages || [];
            this.isSessionFinalized = sessionData.isSessionFinalized || false;
            this.showNewSessionButton = sessionData.showNewSessionButton || false;
            this.savedClientData = sessionData.savedClientData || null;
            this.isSupportDetected = sessionData.isSupportDetected || false;
            this.supportWhatsAppUrl = sessionData.supportWhatsAppUrl || null;
            this.evaluationState = sessionData.evaluationState || {
                showEvaluation: false,
                isSubmitting: false,
                isSubmitted: false,
                alreadyEvaluated: false,
                rating: 0,
                feedback: '',
                isMinimized: false,
            };

            if (this.evaluationState.isMinimized === undefined) {
                this.evaluationState.isMinimized = false;
            }
        } catch (error) {
            this.clearSessionFromLocalStorage();
        }
    }

    clearSessionFromLocalStorage() {
        localStorage.removeItem('viva-chat-session');
        this.whatsAppProcessedMessageIds.clear();
    }

    async syncMessagesWithServer() {
        if (!this.sessionId) {
            return;
        }

        try {
            const response = await this.fetchWithTimeout(
                `${this.apiBaseUrl}/${this.sessionId}/messages`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
                60000
            );

            if (!response.ok) {
                return;
            }

            const serverMessages = await response.json();

            this.messages = serverMessages.map(msg => ({
                id: msg.id,
                message: msg.message,
                sender: msg.sender,
                createdAt: msg.createdAt,
                model: msg.model,
                sessionId: msg.sessionId,
                metadata: msg.metadata,
            }));

            this.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            this.detectAndHandleSessionTermination();
            this.processServerMessagesForWhatsAppSupport(serverMessages);
            this.handleWhatsAppSupportPersistence();

            if (this.messages.length > 0) {
                this.scrollToNewMessage();
            }
            this.updateUI();
        } catch (error) {}
    }

    extractWhatsAppSummary(metadata) {
        try {
            if (metadata?.functionCallsExecuted && metadata.functionCallsExecuted.length > 0) {
                const functionCall = metadata.functionCallsExecuted[0];
                const whatsappSummary = functionCall?.result?.data?.whatsapp_summary;

                if (whatsappSummary && typeof whatsappSummary === 'string') {
                    return whatsappSummary;
                }
            }

            if (metadata?.functionCallsExecuted) {
                for (const call of metadata.functionCallsExecuted) {
                    const whatsappSummary = call?.result?.data?.whatsapp_summary;
                    if (whatsappSummary && typeof whatsappSummary === 'string') {
                        return whatsappSummary;
                    }
                }
            }

            return 'Olá! Preciso de ajuda com minha solicitação.';
        } catch (error) {
            return 'Olá! Preciso de ajuda com minha solicitação.';
        }
    }

    processServerMessagesForWhatsAppSupport(serverMessages) {
        try {
            for (const serverMsg of serverMessages) {
                const whatsappHandoff = this.detectWhatsAppHandoffFromServerMessage(serverMsg);

                if (whatsappHandoff) {
                    this.isSupportDetected = true;

                    const whatsappSummary = this.extractWhatsAppSummary(serverMsg.metadata);
                    const encodedMessage = encodeURIComponent(whatsappSummary);
                    this.supportWhatsAppUrl = `https://api.whatsapp.com/send/?phone=${this.whatsappPhone}&text=${encodedMessage}&type=phone_number&app_absent=0`;
                    break;
                }
            }
        } catch (error) {}
    }

    detectWhatsAppHandoffFromServerMessage(serverMsg) {
        try {
            if (!serverMsg.metadata?.functionCallsExecuted) {
                return this.detectWhatsAppHandoffFromMessageContent(serverMsg.message);
            }

            const functionCalls = serverMsg.metadata.functionCallsExecuted;

            const handoffCall = functionCalls.find(call => call.function_name === 'human_support_redirect');

            if (!handoffCall) {
                const widgetTriggerCall = functionCalls.find(call => call.result?.data?.widget_trigger?.enabled === true);

                if (!widgetTriggerCall) {
                    const whatsappCall = functionCalls.find(call => call.result?.data?.whatsapp_summary);

                    if (!whatsappCall) {
                        return this.detectWhatsAppHandoffFromMessageContent(serverMsg.message);
                    }

                    const resultData = whatsappCall.result?.data;
                    const businessHoursActive = resultData?.business_hours_active === true;
                    const whatsappSummary = resultData?.whatsapp_summary || 'Olá! Preciso de ajuda com minha solicitação.';

                    return {
                        businessHoursActive,
                        summary: whatsappSummary,
                    };
                }

                const resultData = widgetTriggerCall.result?.data;
                const businessHoursActive = resultData?.business_hours_active === true;
                const whatsappSummary = resultData?.whatsapp_summary || 'Olá! Preciso de ajuda com minha solicitação.';

                return {
                    businessHoursActive,
                    summary: whatsappSummary,
                };
            }

            const resultData = handoffCall.result?.data;
            if (!resultData) {
                return null;
            }

            const businessHoursActive = resultData.business_hours_active === true;
            const whatsappSummary = resultData.whatsapp_summary || 'Olá! Preciso de ajuda com minha solicitação.';

            return {
                businessHoursActive,
                summary: whatsappSummary,
            };
        } catch (error) {
            return null;
        }
    }

    detectWhatsAppHandoffFromMessageContent(message) {
        try {
            const messageText = message?.toLowerCase() || '';

            const supportKeywords = [
                'transferir',
                'atendente humano',
                'suporte humano',
                'redirecionado para o suporte',
                'equipe especializada',
                'agente analisará',
                'transferência do chat',
            ];

            const hasSupportKeyword = supportKeywords.some(keyword => messageText.includes(keyword.toLowerCase()));

            if (!hasSupportKeyword) {
                return null;
            }

            const defaultSummary = 'Cliente precisa de atendimento humano baseado na conversa.';

            return {
                businessHoursActive: true,
                summary: defaultSummary,
            };
        } catch (error) {
            return null;
        }
    }

    processLocalMessagesForWhatsAppSupport() {
        try {
            if (this.isSupportDetected) {
                return;
            }

            const unprocessedMessages = this.messages.filter(msg =>
                !msg.metadata?.isWhatsAppSupport && msg.id && !this.whatsAppProcessedMessageIds.has(msg.id)
            );

            for (const localMsg of unprocessedMessages) {
                if (localMsg.id) {
                    this.whatsAppProcessedMessageIds.add(localMsg.id);
                }

                const whatsappHandoff = this.detectWhatsAppHandoffFromLocalMessage(localMsg);

                if (whatsappHandoff) {
                    this.isSupportDetected = true;

                    const whatsappSummary = this.extractWhatsAppSummary(localMsg.metadata);
                    const encodedMessage = encodeURIComponent(whatsappSummary);
                    this.supportWhatsAppUrl = `https://api.whatsapp.com/send/?phone=${this.whatsappPhone}&text=${encodedMessage}&type=phone_number&app_absent=0`;

                    break;
                }
            }
        } catch (error) {}
    }

    detectWhatsAppHandoffFromLocalMessage(localMsg) {
        try {
            if (!localMsg.metadata?.functionCallsExecuted) {
                return this.detectWhatsAppHandoffFromMessageContent(localMsg.message);
            }

            const functionCalls = localMsg.metadata.functionCallsExecuted;

            const handoffCall = functionCalls.find(call => call.function_name === 'human_support_redirect');

            if (!handoffCall) {
                const widgetTriggerCall = functionCalls.find(call => call.result?.data?.widget_trigger?.enabled === true);

                if (!widgetTriggerCall) {
                    const whatsappCall = functionCalls.find(call => call.result?.data?.whatsapp_summary);

                    if (!whatsappCall) {
                        return this.detectWhatsAppHandoffFromMessageContent(localMsg.message);
                    }

                    const resultData = whatsappCall.result?.data;
                    const businessHoursActive = resultData?.business_hours_active === true;
                    const whatsappSummary = resultData?.whatsapp_summary || 'Olá! Preciso de ajuda com minha solicitação.';

                    return {
                        businessHoursActive,
                        summary: whatsappSummary,
                    };
                }

                const resultData = widgetTriggerCall.result?.data;
                const businessHoursActive = resultData?.business_hours_active === true;
                const whatsappSummary = resultData?.whatsapp_summary || 'Olá! Preciso de ajuda com minha solicitação.';

                return {
                    businessHoursActive,
                    summary: whatsappSummary,
                };
            }

            const resultData = handoffCall.result?.data;
            if (!resultData) {
                return null;
            }

            const businessHoursActive = resultData.business_hours_active === true;
            const whatsappSummary = resultData.whatsapp_summary || 'Olá! Preciso de ajuda com minha solicitação.';

            return {
                businessHoursActive,
                summary: whatsappSummary,
            };
        } catch (error) {
            return null;
        }
    }

    handleWhatsAppSupportPersistence() {
        if (this.messages.length === 0) {
            return;
        }

        const whatsappSupportMessage = this.messages.find(msg => msg.metadata?.isWhatsAppSupport && msg.sender === 'assistant');

        if (whatsappSupportMessage) {
            if (this.isSessionFinalized) {
                this.isSupportDetected = true;

                const originalSupportMessage = this.messages.find(msg =>
                    msg.metadata?.functionCallsExecuted && msg.sender === 'assistant' && !msg.metadata?.isWhatsAppSupport
                );

                let whatsappSummary = 'Olá! Preciso de ajuda com minha solicitação.';
                if (originalSupportMessage) {
                    whatsappSummary = this.extractWhatsAppSummary(originalSupportMessage.metadata);
                }

                const encodedMessage = encodeURIComponent(whatsappSummary);
                this.supportWhatsAppUrl = `https://api.whatsapp.com/send/?phone=${this.whatsappPhone}&text=${encodedMessage}&type=phone_number&app_absent=0`;
            }
        }
    }

    startSessionTimer() {
        this.sessionExpirationTime = new Date();
        this.sessionExpirationTime.setMinutes(this.sessionExpirationTime.getMinutes() + this.sessionDurationMinutes);

        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }

        this.sessionTimer = setInterval(() => {
            this.checkSessionStatus();
        }, 60000);

        this.checkSessionStatus();
    }

    checkSessionStatus() {
        if (!this.sessionExpirationTime) return;

        const now = new Date();
        const timeLeft = this.sessionExpirationTime.getTime() - now.getTime();
        const minutesLeft = Math.floor(timeLeft / (1000 * 60));

        if (minutesLeft <= this.warningMinutes) {
            this.isSessionExpiring = true;
            this.sessionTimeRemaining = minutesLeft;
        } else {
            this.isSessionExpiring = false;
            this.sessionTimeRemaining = minutesLeft;
        }
    }

    clearSessionTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    async fetchWithTimeout(url, options, timeout = 60000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                const timeoutError = new Error('Timeout');
                timeoutError.name = 'TimeoutError';
                throw timeoutError;
            }
            throw error;
        }
    }

    updateUI() {
        this.renderMessages();
        this.renderEvaluation();
        this.updateFormVisibility();
        this.updateButtons();
    }

    renderMessages() {
        const container = document.getElementById('messagesContainer');
        if (!container) return;

        container.innerHTML = '';

        this.messages.forEach((msg, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'message-wrapper mb-3';

            if (msg.sender === 'assistant') {
                const isWhatsAppSupport = msg.metadata?.functionCallsExecuted?.[0]?.result?.data?.isWhatsAppSupport;

                wrapper.innerHTML = `
                    <div class="message-assistant">
                        <div class="d-flex align-items-start">
                            <div class="message-avatar assistant-avatar me-2 p-1">
                                <img src="https://incentivoviva.vivaexperiencias.com.br/assets/icons/icon-72x72.png" alt="VivAI" title="VivAI" class="img-fluid" />
                            </div>
                            <div class="message-content">
                                <div class="message-bubble assistant-bubble">
                                    ${!isWhatsAppSupport ? `<div class="mb-1">${this.formatMarkdownMessage(msg.message)}</div>` : ''}
                                    ${isWhatsAppSupport ? `
                                        <div class="mb-1">${this.formatMarkdownMessage(msg.message.split('👉')[0])}</div>
                                        <div class="mt-2">
                                            <button type="button" class="whatsapp-link" data-action="whatsapp">
                                                👉 Falar com a equipe no WhatsApp
                                            </button>
                                        </div>
                                    ` : ''}
                                    <small class="message-time">${this.formatMessageTime(msg.createdAt)}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                const whatsappBtn = wrapper.querySelector('[data-action="whatsapp"]');
                if (whatsappBtn) {
                    whatsappBtn.addEventListener('click', (e) => this.handleWhatsAppClick(e));
                }
            } else {
                wrapper.innerHTML = `
                    <div class="message-user">
                        <div class="d-flex align-items-start justify-content-end">
                            <div class="message-content">
                                <div class="message-bubble user-bubble" style="background-color: #f05e1f; color: #ffffff;">
                                    <p class="mb-1">${this.escapeHtml(msg.message)}</p>
                                    <small class="message-time text-white">${this.formatMessageTime(msg.createdAt)}</small>
                                </div>
                            </div>
                            <div class="message-avatar user-avatar ms-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                        </div>
                    </div>
                `;
            }

            container.appendChild(wrapper);
        });

        if (this.isTyping) {
            const typingWrapper = document.createElement('div');
            typingWrapper.className = 'd-flex align-items-start mb-3';
            typingWrapper.innerHTML = `
                <div class="message-avatar assistant-avatar me-2 p-1">
                    <img src="https://incentivoviva.vivaexperiencias.com.br/assets/icons/icon-72x72.png" alt="VivAI" title="VivAI" class="img-fluid" />
                </div>
                <div class="typing-indicator">
                    <div class="typing-text-container">
                        <span class="typing-text">Escrevendo</span>
                        <div class="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(typingWrapper);
        }

        this.scrollToNewMessage();
    }

    renderEvaluation() {
        const container = document.getElementById('evaluationContainer');
        const messagesArea = document.getElementById('messagesContainer');
        if (!container) return;

        if (!this.evaluationState.showEvaluation) {
            container.style.display = 'none';
            if (messagesArea) {
                messagesArea.closest('.chat-messages-area')?.classList.remove('has-evaluation');
            }
            return;
        }

        container.style.display = 'block';
        const html = this.getEvaluationHTML();
        container.innerHTML = html;

        if (messagesArea) {
            messagesArea.closest('.chat-messages-area')?.classList.add('has-evaluation');
        }

        this.attachEvaluationListeners();

        setTimeout(() => {
            const feedbackTextarea = container.querySelector('#feedback');
            if (feedbackTextarea && document.activeElement !== feedbackTextarea) {
                const cursorPosition = feedbackTextarea.value.length;
                feedbackTextarea.setSelectionRange(cursorPosition, cursorPosition);
            }
        }, 0);
    }

    getEvaluationHTML() {
        if (this.evaluationState.alreadyEvaluated) {
            return `
                <div class="chat-evaluation">
                    <div class="evaluation-container">
                        <div class="already-evaluated-message text-center">
                            <div class="already-evaluated-icon mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22,4 12,14.01 9,11.01"></polyline>
                                </svg>
                            </div>
                            <h5 class="already-evaluated-title">Você já avaliou esta conversa</h5>
                            <p class="already-evaluated-subtitle text-muted">Obrigado pelo seu feedback anterior!</p>
                        </div>
                        ${this.showNewSessionButton ? `
                            <div class="new-session-section text-center">
                                <button type="button" class="btn btn-success btn-new-session" data-action="new-session">
                                    <span class="d-flex align-items-center justify-content-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M12 5v14"></path>
                                            <path d="M5 12h14"></path>
                                        </svg>
                                        Iniciar Nova Conversa
                                    </span>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        if (this.evaluationState.isSubmitted) {
            return `
                <div class="chat-evaluation">
                    <div class="evaluation-container">
                        <div class="evaluation-success text-center">
                            <div class="success-icon mb-0 mt-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22,4 12,14.01 9,11.01"></polyline>
                                </svg>
                            </div>
                            <h5 class="success-title">Obrigado pela sua avaliação!</h5>
                            <p class="success-message text-muted">Seu feedback nos ajuda a melhorar nosso atendimento.</p>
                        </div>
                        ${this.showNewSessionButton ? `
                            <div class="new-session-section text-center">
                                <button type="button" class="btn btn-success btn-new-session" data-action="new-session">
                                    <span class="d-flex align-items-center justify-content-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M12 5v14"></path>
                                            <path d="M5 12h14"></path>
                                        </svg>
                                        Iniciar Nova Conversa
                                    </span>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        return `
            <div class="chat-evaluation ${this.evaluationState.isMinimized ? 'minimized' : ''}">
                <div class="evaluation-container">
                    <div class="evaluation-header text-center mb-3">
                        <h5 class="evaluation-title mb-2">Como foi sua experiência?</h5>
                    </div>
                    <div class="evaluation-form">
                        <div class="rating-section mb-2">
                            <div class="rating-container d-flex justify-content-center">
                                <div class="star-rating">
                                    ${[1, 2, 3, 4, 5].map(star => `
                                        <button type="button" class="star-button ${star <= this.evaluationState.rating ? 'star-filled' : 'star-empty'}" data-rating="${star}" ${this.evaluationState.isSubmitting ? 'disabled' : ''}>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="star-icon">
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                            </svg>
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="rating-text text-center mt-1">
                                ${this.evaluationState.rating > 0 ? `<small class="text-muted">${this.getRatingText(this.evaluationState.rating)}</small>` : ''}
                            </div>
                        </div>
                        ${this.evaluationState.rating > 0 ? `
                            <div class="feedback-section mb-2">
                                <label for="feedback" class="form-label fw-semibold">Comentários (opcional):</label>
                                <textarea id="feedback" class="form-control feedback-textarea" rows="1" placeholder="Conte-nos mais sobre sua experiência..." ${this.evaluationState.isSubmitting ? 'disabled' : ''} maxlength="500">${this.evaluationState.feedback}</textarea>
                                <div class="feedback-counter text-end mt-1">
                                    <small class="text-muted">${this.evaluationState.feedback.length}/500</small>
                                </div>
                            </div>
                        ` : ''}
                        ${this.evaluationState.error ? `
                            <div class="alert alert-danger" role="alert">
                                <small>${this.evaluationState.error}</small>
                            </div>
                        ` : ''}
                        <div class="submit-section text-center">
                            <button type="button" class="btn btn-primary btn-submit-evaluation" data-action="submit-evaluation" ${!this.canSubmitEvaluation() ? 'disabled' : ''}>
                                ${!this.evaluationState.isSubmitting ? `
                                    <span class="d-flex align-items-center justify-content-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="m3 16 4 4 4-4"></path>
                                            <path d="M7 20V4"></path>
                                            <path d="M20 8l-4-4-4 4"></path>
                                            <path d="M17 4v16"></path>
                                        </svg>
                                        Enviar Avaliação
                                    </span>
                                ` : `
                                    <span class="d-flex align-items-center justify-content-center gap-2">
                                        <div class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>
                                        Enviando...
                                    </span>
                                `}
                            </button>
                        </div>
                    </div>
                    <div class="minimize-section text-center mt-2">
                        <button type="button" class="btn btn-outline-secondary btn-sm btn-minimize" data-action="minimize-toggle">
                            <span class="d-flex align-items-center justify-content-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    ${this.evaluationState.isMinimized ? '<path d="M18 15l-6-6-6 6"/>' : '<path d="M6 9l6 6 6-6"/>'}
                                </svg>
                                <span class="minimize-text">${this.evaluationState.isMinimized ? 'Expandir' : 'Minimizar'}</span>
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    attachEvaluationListeners() {
        const container = document.getElementById('evaluationContainer');
        if (!container) return;

        const starButtons = container.querySelectorAll('[data-rating]');
        starButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const rating = parseInt(btn.getAttribute('data-rating'));
                this.onRatingChange(rating);
            });
        });

        const feedbackTextarea = container.querySelector('#feedback');
        if (feedbackTextarea) {
            const savedValue = feedbackTextarea.value;
            feedbackTextarea.addEventListener('input', (e) => {
                const currentValue = e.target.value;
                this.evaluationState.feedback = currentValue;
                this.saveSessionToLocalStorage();

                const counter = container.querySelector('.feedback-counter small');
                if (counter) {
                    counter.textContent = `${currentValue.length}/500`;
                }
            });
        }

        const submitBtn = container.querySelector('[data-action="submit-evaluation"]');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.submitEvaluation();
            });
        }

        const newSessionBtn = container.querySelector('[data-action="new-session"]');
        if (newSessionBtn) {
            newSessionBtn.addEventListener('click', () => {
                this.startNewSession();
            });
        }

        const minimizeBtn = container.querySelector('[data-action="minimize-toggle"]');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                this.evaluationState.isMinimized = !this.evaluationState.isMinimized;
                this.saveSessionToLocalStorage();
                this.renderEvaluation();
            });
        }
    }

    onRatingChange(rating) {
        this.evaluationState.rating = rating;
        this.saveSessionToLocalStorage();
        this.updateUI();
    }

    onFeedbackChange(feedback) {
        this.evaluationState.feedback = feedback;
        this.saveSessionToLocalStorage();
    }

    canSubmitEvaluation() {
        return this.evaluationState.rating > 0 && !this.evaluationState.isSubmitting && !this.evaluationState.isSubmitted && !this.evaluationState.alreadyEvaluated;
    }

    getRatingText(rating) {
        const ratingTexts = {
            1: 'Muito insatisfeito',
            2: 'Insatisfeito',
            3: 'Neutro',
            4: 'Satisfeito',
            5: 'Muito satisfeito',
        };
        return ratingTexts[rating] || '';
    }

    async submitEvaluation() {
        if (!this.sessionId || this.evaluationState.rating === 0) {
            return;
        }

        this.evaluationState.isSubmitting = true;
        this.evaluationState.error = undefined;
        this.saveSessionToLocalStorage();
        this.updateUI();

        const evaluationRequest = {
            sessionId: this.sessionId,
            rating: this.evaluationState.rating,
            feedback: this.evaluationState.feedback.trim() || undefined,
            userName: this.userData.nome,
            userEmail: this.userData.email,
        };

        try {
            const response = await this.fetchWithTimeout(
                `${this.apiBaseUrl}/evaluations`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(evaluationRequest),
                },
                60000
            );

            if (!response.ok) {
                throw new Error('Erro ao enviar avaliação');
            }

            const data = await response.json();

            this.evaluationState.isSubmitted = true;
            this.evaluationState.isSubmitting = false;
            this.saveSessionToLocalStorage();
            this.updateUI();
        } catch (error) {
            this.evaluationState.isSubmitting = false;
            this.evaluationState.error = 'Erro ao enviar avaliação. Tente novamente.';
            this.saveSessionToLocalStorage();
            this.updateUI();
        }
    }

    updateFormVisibility() {
        const userDataForm = document.getElementById('userDataForm');
        const chatInterface = document.getElementById('chatInterface');
        const chatInputContainer = document.getElementById('chatInputContainer');
        const messagesArea = document.getElementById('messagesContainer')?.closest('.chat-messages-area');

        if (this.step === 1) {
            if (userDataForm) userDataForm.style.display = 'block';
            if (chatInterface) chatInterface.style.display = 'none';
            if (messagesArea) messagesArea.classList.remove('has-evaluation');
        } else {
            if (userDataForm) userDataForm.style.display = 'none';
            if (chatInterface) chatInterface.style.display = 'block';

            if (this.evaluationState.showEvaluation) {
                if (chatInputContainer) chatInputContainer.style.display = 'none';
                if (messagesArea) messagesArea.classList.add('has-evaluation');
            } else {
                if (chatInputContainer) chatInputContainer.style.display = 'block';
                if (messagesArea) messagesArea.classList.remove('has-evaluation');
            }
        }
    }

    updateButtons() {
        const submitBtn = document.getElementById('submitUserDataBtn');
        const submitBtnText = document.getElementById('submitBtnText');
        const submitBtnLoading = document.getElementById('submitBtnLoading');
        const sendBtn = document.getElementById('sendMessageBtn');
        const messageInput = document.getElementById('messageInput');
        const newSessionBtnContainer = document.getElementById('newSessionButtonContainer');
        const newSessionBtn = document.getElementById('startNewSessionBtn');
        const newSessionBtnText = document.getElementById('newSessionBtnText');
        const newSessionBtnLoading = document.getElementById('newSessionBtnLoading');

        if (submitBtn) {
            const nomeInput = document.getElementById('nome');
            const emailInput = document.getElementById('email');
            const telefoneInput = document.getElementById('telefone');

            const nome = nomeInput ? nomeInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const telefone = telefoneInput ? telefoneInput.value.trim() : '';

            const isFormValid = nome && email && telefone && this.isValidEmail(email);

            submitBtn.disabled = !isFormValid || this.isSessionLoading;

            if (submitBtnText) submitBtnText.style.display = this.isSessionLoading ? 'none' : 'block';
            if (submitBtnLoading) submitBtnLoading.style.display = this.isSessionLoading ? 'flex' : 'none';
        }

        if (sendBtn && messageInput) {
            const hasMessage = messageInput.value.trim().length > 0;
            sendBtn.disabled = !hasMessage || this.isLoading || this.isSessionFinalized || this.isSupportDetected;
        }

        if (newSessionBtnContainer) {
            newSessionBtnContainer.style.display = this.showNewSessionButton && !this.evaluationState.showEvaluation ? 'block' : 'none';
        }

        if (newSessionBtn) {
            newSessionBtn.disabled = this.isSessionLoading;
            if (newSessionBtnText) newSessionBtnText.style.display = this.isSessionLoading ? 'none' : 'flex';
            if (newSessionBtnLoading) newSessionBtnLoading.style.display = this.isSessionLoading ? 'flex' : 'none';
        }

        if (messageInput) {
            messageInput.disabled = this.isLoading || this.isSessionFinalized || this.isSupportDetected;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const chat = new VivaChat({
    apiBaseUrl: 'https://chat-api.vivaexperiencias.com.br/chat',
    whatsappPhone: '5511942169624'
});
