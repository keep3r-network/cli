import { getLoggerOptions, setupLogger } from '../../../src/utils/loggers';
import winston from 'winston';

const basicConfig = {
	datePattern: 'YYYY-MM-DD-HH',
	maxSize: '20m',
	maxFiles: '14d',
	zippedArchive: false,
	dirname: 'logs',
};

const defaultLogConfig = {
	dailyRotateFile: {
		default: {
			filename: 'logs-%DATE%.log',
			...basicConfig,
		},
	},
};

const exceptionsLogConfig = {
	dailyRotateFile: {
		exceptions: {
			filename: 'exceptions-%DATE%.log',
			...basicConfig,
		},
	},
};

describe('setupLogger', () => {
	describe('when no config is provided', () => {
		const logger = getLoggerOptions({});
		const transports = getTransports(logger);

		it('should only return a winston Console inside transports', async () => {
			expect(transports.default).toEqual(['Console']);
		});

		it('should only return a winston Console inside exceptionHandlers', async () => {
			expect(transports.exceptions).toEqual(['Console']);
		});
	});

	describe('when user provides full config', () => {
		const fullConfig = {
			dailyRotateFile: {
				...defaultLogConfig.dailyRotateFile,
				...exceptionsLogConfig.dailyRotateFile,
			},
		};
		const logger = getLoggerOptions(fullConfig);
		const transports = getTransports(logger);

		it('should add DailyRotateFile to transports', async () => {
			expect(transports.default).toEqual(['Console', 'DailyRotateFile']);
		});

		it('should add DailyRotateFile to exceptionHandlers', async () => {
			expect(transports.exceptions).toEqual(['Console', 'DailyRotateFile']);
		});
	});

	it('should only return Console and DailyRotateFile inside transports if user provides a config without exceptions', async () => {
		const logger = getLoggerOptions(defaultLogConfig);
		const transports = getTransports(logger);

		expect(transports.default).toEqual(['Console', 'DailyRotateFile']);
		expect(transports.exceptions).toEqual(['Console']);
	});

	it('should only return Console and DailyRotateFile inside exceptionHandlers if user provides a config without default', async () => {
		const logger = getLoggerOptions(exceptionsLogConfig);
		const transports = getTransports(logger);

		expect(transports.exceptions).toEqual(['Console', 'DailyRotateFile']);
		expect(transports.default).toEqual(['Console']);
	});
});

function getTransports(logger: winston.LoggerOptions) {
	const transports = logger.transports as winston.transport[];
	const exceptionHandlers = logger.exceptionHandlers as winston.transport[];

	return {
		default: transports.map((item) => item.constructor.name),
		exceptions: exceptionHandlers.map((item) => item.constructor.name),
	};
}
