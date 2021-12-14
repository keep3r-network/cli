import { JobDefaults } from './basic-config';
import { Config } from './config.d';
import validate from './config.d.validator';
import fs from 'fs-extra';

const defaultJobDefaults: JobDefaults = {
	futureBlocks: 1,
	bundleBurst: 6,
	timeToAdvance: 120,
	priorityFee: 2,
};

const defaultConfig: Partial<Config> = {
	localRpc: 'http://127.0.0.1:8545',
	chainId: 1,
	// TODO: change for Keep3rV2: 0xdc02981c9C062d48a9bD54adBf51b816623dcc6E
	keep3r: '0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44',
	keep3rV1: '0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44',
	// TODO: change for Keep3rV2Helper: 0xcb12ac8649ea06cbb15e29032163938d5f86d8ad
	// change `getQuote` for `quote`
	keep3rHelper: '0xcb12Ac8649eA06Cbb15e29032163938D5F86D8ad',
	jobs: [],
	gasLimit: '300000',
	forkStartPort: 10000,
	forkMaxPorts: 100,
	recommendedGasPriceIndex: 0,
	inquireKeeperAddress: true,
	initializationGasLimit: 200000,
	simulateBundle: true,
	flashbotRelays: ['https://relay.flashbots.net'],
	jobDefaults: defaultJobDefaults,
};

export async function loadConfig(filePath: string): Promise<Config> {
	const userConfig: Partial<Config> = await fs.readJSON(filePath);

	return validateConfig({
		...defaultConfig,
		...userConfig,
		jobDefaults: {
			...defaultJobDefaults,
			...userConfig.jobDefaults,
		},
	});
}

export function validateConfig(partialConfig: Partial<Config>): Config {
	const config = validate(partialConfig);

	if (config.flashbotRelays.length === 0) {
		throw new Error('At least one relay should be specified inside flashbotRelays');
	}

	return config;
}
