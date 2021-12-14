import { ConfigLogs } from '../config/basic-config';
import winston, { format, LoggerOptions } from 'winston';
import 'winston-daily-rotate-file';
import * as Transport from 'winston-transport';

const { combine, errors, timestamp, metadata, json } = format;
const loggerFormat = combine(errors({ stack: true }), timestamp(), metadata(), json());

winston.createLogger({
	level: 'debug',
	format: loggerFormat,
	transports: [new winston.transports.Console()],
});

export function getLoggerOptions(config: ConfigLogs): LoggerOptions {
	const transports: Transport[] = [new winston.transports.Console()];

	const exceptionHandlers: Transport[] = [
		new winston.transports.Console({
			handleExceptions: true,
		}),
	];

	if (config.dailyRotateFile && config.dailyRotateFile.default) {
		transports.push(new winston.transports.DailyRotateFile(config.dailyRotateFile.default));
	}

	if (config.dailyRotateFile && config.dailyRotateFile.exceptions) {
		exceptionHandlers.push(new winston.transports.DailyRotateFile(config.dailyRotateFile.exceptions));
	}

	return {
		level: 'debug',
		format: loggerFormat,
		transports,
		exceptionHandlers,
	};
}

export function setupLogger(config: ConfigLogs = {}): void {
	const logger = winston.createLogger(getLoggerOptions(config));

	console.log = (...args: any) => logger.debug.apply(logger, args);
	console.info = (...args: any) => logger.info.apply(logger, args);
	console.warn = (...args: any) => logger.warn.apply(logger, args);
	console.error = (...args: any) => logger.error.apply(logger, args);
	console.debug = (...args: any) => logger.debug.apply(logger, args);
}
