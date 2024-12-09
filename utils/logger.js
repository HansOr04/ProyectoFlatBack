import winston from 'winston';
import 'winston-daily-rotate-file';

// Formato personalizado para los logs
const customFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Configuración de transportes
const transports = [
    // Consola en desarrollo
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
        level: process.env.NODE_ENV === 'production' ? 'error' : 'debug'
    }),
    
    // Rotación diaria de archivos para errores
    new winston.transports.DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'error'
    }),
    
    // Rotación diaria de archivos para todos los logs
    new winston.transports.DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d'
    })
];

// Crear la instancia del logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: customFormat,
    transports,
    // No detener la aplicación si hay error al escribir los logs
    exitOnError: false
});

// Funciones de utilidad para logging
export const logError = (message, error) => {
    logger.error(message, { error: error.stack || error });
};

export const logInfo = (message, meta = {}) => {
    logger.info(message, meta);
};

export const logWarn = (message, meta = {}) => {
    logger.warn(message, meta);
};

export const logDebug = (message, meta = {}) => {
    logger.debug(message, meta);
};

// Middleware para Express
export const requestLogger = (req, res, next) => {
    logInfo(`${req.method} ${req.url}`, {
        method: req.method,
        url: req.url,
        body: req.body,
        query: req.query,
        params: req.params,
        ip: req.ip
    });
    next();
};

// Middleware para manejo de errores
export const errorLogger = (err, req, res, next) => {
    logError('Error en la solicitud', err);
    next(err);
};

export default logger;