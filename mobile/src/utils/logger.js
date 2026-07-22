/**
 * Structured Mobile Event Logger
 * Provides standardized logging for the mobile application.
 */

class Logger {
    constructor() {
        this.isDevelopment = __DEV__;
    }

    _formatMessage(level, context, message, data = null) {
        const timestamp = new Date().toISOString();
        const payload = {
            timestamp,
            level,
            context,
            message,
        };
        
        if (data) {
            payload.data = data;
        }

        return payload;
    }

    _log(level, context, message, data) {
        if (!this.isDevelopment && level === 'debug') {
            return;
        }

        const payload = this._formatMessage(level, context, message, data);
        const logString = `[${payload.timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;

        switch (level) {
            case 'debug':
                console.debug(logString, data ? data : '');
                break;
            case 'info':
                console.info(logString, data ? data : '');
                break;
            case 'warn':
                console.warn(logString, data ? data : '');
                break;
            case 'error':
                console.error(logString, data ? data : '');
                break;
            default:
                console.log(logString, data ? data : '');
        }

        // In a production app, we would send 'payload' to a remote service here (e.g. Sentry, Datadog)
    }

    debug(context, message, data) {
        this._log('debug', context, message, data);
    }

    info(context, message, data) {
        this._log('info', context, message, data);
    }

    warn(context, message, data) {
        this._log('warn', context, message, data);
    }

    error(context, message, errorObj) {
        const data = errorObj instanceof Error 
            ? { message: errorObj.message, stack: errorObj.stack } 
            : errorObj;
        this._log('error', context, message, data);
    }

    event(eventName, data = {}) {
        // Structured event tracking for analytics
        const payload = this._formatMessage('event', 'Analytics', eventName, data);
        if (this.isDevelopment) {
            console.log(`📊 [EVENT] ${eventName}`, data);
        }
        // Send event payload to analytics backend
    }
}

export const logger = new Logger();
