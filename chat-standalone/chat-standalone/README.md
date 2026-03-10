# Chat VivAI - Versão Standalone

Projeto HTML/CSS/JS standalone do módulo de chat do VivAI, pronto para ser integrado em landing pages e outros projetos.

## Estrutura de Arquivos

```
chat-standalone/
├── index.html      # Estrutura HTML do chat
├── styles.css      # Estilos CSS completos
├── chat.js         # Lógica JavaScript do chat
└── README.md       # Este arquivo
```

## Funcionalidades

- ✅ Formulário de dados do usuário (nome, email, telefone)
- ✅ Criação de sessão de chat
- ✅ Envio e recebimento de mensagens
- ✅ Formatação de markdown nas mensagens
- ✅ Indicador de digitação
- ✅ Detecção de suporte WhatsApp
- ✅ Sistema de avaliação com estrelas
- ✅ Persistência de sessão no localStorage
- ✅ Timer de expiração de sessão
- ✅ Suporte a múltiplas sessões
- ✅ Responsivo para mobile
- ✅ Animações e transições
- ✅ Tratamento de erros

## Como Usar

### 1. Incluir os arquivos no seu projeto

Copie os três arquivos (`index.html`, `styles.css`, `chat.js`) para o seu projeto.

### 2. Configurar a URL da API

No arquivo `chat.js`, configure a URL base da API:

```javascript
const chat = new VivaChat({
    apiBaseUrl: '/api/chat',
    whatsappPhone: '5511942169624'
});
```

### 3. Integrar no seu HTML

#### Opção A: Incluir diretamente no HTML

Adicione os arquivos CSS e JS no seu HTML:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Seu Site</title>
    <link rel="stylesheet" href="caminho/para/styles.css">
</head>
<body>
    <!-- Seu conteúdo aqui -->
    
    <!-- Incluir o HTML do chat -->
    <button id="chatFloatButton" class="chat-float-button">
        <!-- ... conteúdo do botão ... -->
    </button>
    
    <div id="chatModalOverlay" class="modal fade show d-block chat-modal-overlay" style="display: none;">
        <!-- ... conteúdo do modal ... -->
    </div>
    
    <script src="caminho/para/chat.js"></script>
</body>
</html>
```

#### Opção B: Carregar via JavaScript

Crie um arquivo HTML simples e carregue o chat dinamicamente:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Seu Site</title>
    <link rel="stylesheet" href="caminho/para/styles.css">
</head>
<body>
    <!-- Seu conteúdo aqui -->
    
    <script>
        fetch('caminho/para/index.html')
            .then(response => response.text())
            .then(html => {
                document.body.insertAdjacentHTML('beforeend', html);
            });
    </script>
    <script src="caminho/para/chat.js"></script>
</body>
</html>
```

### 4. Configurar CORS (se necessário)

Se a API estiver em um domínio diferente, configure CORS no servidor:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Configuração

### Parâmetros do Construtor

```javascript
const chat = new VivaChat({
    apiBaseUrl: '/api/chat',           // URL base da API
    whatsappPhone: '5511942169624'     // Número do WhatsApp para suporte
});
```

### Endpoints da API Esperados

O chat espera os seguintes endpoints:

1. **POST** `/api/chat/chat/sessions` - Criar sessão
   ```json
   {
     "title": "Chat Bot IA",
     "hotsiteDomain": "exemplo",
     "fullName": "João Silva",
     "email": "joao@example.com",
     "phoneNumber": "+5511999999999"
   }
   ```

2. **POST** `/api/chat/chat/{sessionId}/messages` - Enviar mensagem
   ```json
   {
     "message": "Olá!"
   }
   ```

3. **GET** `/api/chat/chat/{sessionId}/messages` - Obter mensagens

4. **GET** `/api/chat/chat/evaluations/{sessionId}` - Verificar avaliação

5. **POST** `/api/chat/chat/evaluations` - Enviar avaliação
   ```json
   {
     "sessionId": "uuid",
     "rating": 5,
     "feedback": "Ótimo atendimento!",
     "userName": "João Silva",
     "userEmail": "joao@example.com"
   }
   ```

## Personalização

### Cores

As cores principais podem ser alteradas no arquivo `styles.css`:

- Botão flutuante: `#da4401`
- Botão de envio: `#007bff`
- Botão de avaliação: `#007bff`
- Botão WhatsApp: `#25d366`
- Mensagens do usuário: `#f05e1f`

### Tamanhos

Os tamanhos do modal podem ser ajustados:

```css
.chat-modal-container {
    max-width: 380px;
    width: 380px;
}
```

### Duração da Sessão

A duração padrão é de 30 minutos. Pode ser alterada no construtor:

```javascript
this.sessionDurationMinutes = 30;
this.warningMinutes = 5;
```

## Recursos Adicionais

### LocalStorage

O chat salva automaticamente a sessão no localStorage com a chave `viva-chat-session`. A sessão expira após 24 horas.

### Formatação de Mensagens

O chat suporta formatação markdown:
- **Negrito**: `**texto**`
- *Itálico*: `*texto*`
- `Código`: `` `código` ``
- Links: `[texto](url)`

### Detecção de WhatsApp

O chat detecta automaticamente quando o atendimento deve ser redirecionado para WhatsApp baseado nas respostas da API.

## Compatibilidade

- ✅ Chrome/Edge (últimas versões)
- ✅ Firefox (últimas versões)
- ✅ Safari (últimas versões)
- ✅ Mobile (iOS e Android)

## Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento.

## Licença

Este projeto é propriedade da Viva! Experiências.
