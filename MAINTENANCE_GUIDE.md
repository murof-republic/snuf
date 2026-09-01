# Guia de Manutenção - Bot Snuf

## Melhorias Implementadas

### 1. Sistema de XP Robusto
- [OK] Sincronização corrigida - Agora sincroniza perfeitamente com Firebase
- [OK] Race conditions resolvidas - Implementado sistema de mutex para evitar conflitos
- [OK] Validação de dados - Todos os IDs e valores são validados
- [OK] Auto-save periódico - Salva automaticamente a cada 10 minutos
- [OK] Melhor logging - Cada ação é registrada com timestamp

### 2. Error Handling
- [OK] Try-catch em todos os handlers - Nenhum erro quebra o bot
- [OK] Validações de entrada - Todos os dados são validados antes de usar
- [OK] Logging centralizado - Sistema de logger com níveis (ERROR, WARN, INFO, DEBUG)
- [OK] Mensagens de erro amigáveis - Usuários recebem feedback claro

### 3. Firebase Integration
- [OK] Estrutura de dados corrigida - Agora salva corretamente: `servers: { guildId: { xp: number } }`
- [OK] Tratamento de erro na conexão - Valida variáveis de ambiente
- [OK] Transações seguras - Usa `merge: true` para evitar sobrescrita de dados

### 4. Comandos Seguros
- [OK] Validação de permissões - Todos os comandos sensíveis requerem validação
- [OK] Validação de usuário - Função `requireUser()` adicionada
- [OK] Melhor mensagens de erro - Feedback claro ao usuário

### 5. Logging e Debug
- [OK] Logger centralizado (utils/logger.js) - Padrão em todo o código
- [OK] Prefixos de módulo - [XP], [FIREBASE], [EVENT], etc.
- [OK] Timestamps automáticos - Cada log tem horário
- [OK] Modo desenvolvimento - Debug logs só aparecem em NODE_ENV=development

---

## Estrutura de Arquivos Importantes

```
services/
├── xp.js              <- Sistema de XP completo (REESCRITO)
├── firebase.js        <- Integração Firebase (MELHORADO)
└── ...

events/
├── ready.js           <- Inicialização (MELHORADO)
├── messageCreate.js   <- Processamento de mensagens (MELHORADO)
├── voiceStateUpdate.js <- Rastreamento de voz (MELHORADO)
├── interactionCreate.js <- Processamento de comandos (REESCRITO)
└── ...

utils/
├── commandUtils.js    <- Validações de comando (MELHORADO)
├── logger.js          <- Sistema de logging (NOVO)
└── ...
```

---

## 🔧 Como Usar o Logger

```javascript
const logger = require('../utils/logger');

logger.error('MODULE', 'Descrição do erro', error);   // ERROR
logger.warn('MODULE', 'Aviso importante');            // WARN
logger.info('MODULE', 'Informação geral');            // INFO
logger.debug('MODULE', 'Info de debug');              // DEBUG
```

### Saída de Exemplo:
```
[14:25:30] [INFO] [XP] Salvo: 123456789 (Global: 5000)
[14:25:31] [ERROR] [FIREBASE] Erro ao salvar XP do usuário 123456789
  └─ Document already exists
```

---

## Segurança

### Validações Implementadas

1. **IDs** - Sempre validar antes de usar
```javascript
if (!userId || typeof userId !== 'string') {
    return null;
}
```

2. **Permissões** - Sempre verificar antes de ações sensíveis
```javascript
const isAdmin = requireAdmin(interaction);
```

3. **Guild ID** - Validar se é o servidor correto
```javascript
const isCorrectGuild = requireGuild(interaction, process.env.DISCORD_GUILD_ID);
```

4. **Valores numéricos** - Garantir que são válidos
```javascript
user.globalXP = Math.max(0, user.globalXP);
```

---

## Sistema de XP

### Configurações (em `services/xp.js`)

```javascript
MESSAGE_XP_MIN = 5          // XP mínimo por mensagem
MESSAGE_XP_MAX = 15         // XP máximo por mensagem
VOICE_XP_MIN = 5            // XP mínimo por minuto em voz
VOICE_XP_MAX = 10           // XP máximo por minuto em voz
VOICE_INTERVAL = 60 * 1000  // Intervalo entre XP de voz (60s)
XP_PER_LEVEL = 1000         // XP para cada nível
```

### Como Funciona

1. **Ao enviar mensagem** -> `handleMessage()` adiciona XP
2. **Ao entrar em voz** -> Sistema começa a rastrear
3. **A cada minuto em voz** -> Adiciona XP (mínimo 2 humanos)
4. **A cada 10 mensagens** -> Salva no Firebase
5. **A cada 10 minutos** -> Auto-salva todos os usuários

### Estrutura no Firebase

```json
{
  "xpGlobal": 5000,
  "servers": {
    "SERVER_ID_1": { "xp": 2000 },
    "SERVER_ID_2": { "xp": 1500 }
  }
}
```

---

## Deployando Mudanças

### Checklist de Antes de Deploy

- [ ] Todos os `console.log()` removidos ou convertidos para `logger`
- [ ] Todas as funções têm try-catch
- [ ] Todas as inputs são validadas
- [ ] Mensagens de erro são claras
- [ ] Sem console.error() genéricos (usar logger.error)
- [ ] Code review realizado

### Reiniciar o Bot

```bash
# Parar bot atual
kill <PID>

# Puxar mudanças
git pull origin main

# Instalar deps (se necessário)
npm install

# Iniciar bot
npm start
```

---

## Troubleshooting

### XP Não Sincroniza
1. Verificar logs: procurar por `[XP]`
2. Verificar Firebase: dados estão sendo salvos?
3. Verificar cache: `getCachedXP()` retorna valores corretos?
4. Restart bot

### Comando Dá Erro
1. Verificar logs: procurar por `[INTERACTION]` ou `[EVENT]`
2. Verificar permissões: usuário é admin?
3. Verificar validações: `requireGuild()`, `requireUser()`, etc.

### Bot Não Responde
1. Verificar conexão Discord
2. Verificar Firebase: está conectado?
3. Verificar logs: há erros críticos?
4. Verificar RAM/CPU: bot está travado?

---

## Padrões de Código

### Estrutura de Função

```javascript
// ============ SEÇÃO ============

async function minhaFuncao(param) {
	// Validação
	if (!param) {
		logger.warn('MODULE', 'Param inválido');
		return null;
	}

	try {
		// Lógica principal
		const resultado = await operacao();

		logger.debug('MODULE', 'Operação bem-sucedida');
		return resultado;

	} catch (error) {
		logger.error('MODULE', 'Descrição do erro', error);
		return null;

	} finally {
		// Cleanup se necessário
	}
}
```

### Comentários de Seção

```javascript
// ============ NOME DA SEÇÃO ============
// Use isto para separar seções maiores do código
```

---

## Próximas Melhorias (Opcional)

- [ ] Adicionar ratelimiter mais robusto
- [ ] Sistema de backup automático do Firebase
- [ ] Dashboard web para visualizar XP
- [ ] Leaderboard com cache em Redis
- [ ] Metrics/telemetria
- [ ] Alerts para eventos importantes

---

## Perguntas Frequentes

P: Como adicionar um novo comando?
R: Criar arquivo em `commands/CATEGORIA/nome.js` com as propriedades `data` (SlashCommandBuilder) e `execute(interaction)`.

P: Como adicionar um novo evento?
R: Criar arquivo em `events/nome.js` com as propriedades `name` (event name) e `execute(...)`.

P: Como debugar um problema?
R: Adicione `logger.debug()` no código e configure `NODE_ENV=development` antes de iniciar.

---

Última atualização: 2026-09-01
Versão: 2.1 (Logger simplificado para produção)
