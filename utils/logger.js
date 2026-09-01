

const LOG_LEVELS = {
	ERROR: 'ERROR',
	WARN: 'WARN',
	INFO: 'INFO',
	DEBUG: 'DEBUG'
};

function formatTimestamp() {
	const now = new Date();
	return now.toLocaleTimeString('pt-BR');
}

function formatMessage(level, module, message) {
	const time = formatTimestamp();
	return `[${time}] [${level}] ${module ? `[${module}]` : ''} ${message}`;
}

const logger = {
	error(module, message, error = null) {
		console.error(formatMessage('ERROR', module, message));
		if (error) {
			console.error(`  └─ ${error.message}`);
		}
	},

	warn(module, message) {
		console.warn(formatMessage('WARN', module, message));
	},

	info(module, message) {
		console.log(formatMessage('INFO', module, message));
	},

	debug(module, message) {
		if (process.env.NODE_ENV === 'development') {
			console.log(formatMessage('DEBUG', module, message));
		}
	}
};

module.exports = logger;
