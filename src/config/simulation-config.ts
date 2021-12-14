import { JobDefaults } from './basic-config';
import { SimulationConfig } from './simulation-config.d';
import validate from './simulation-config.d.validator';
import fs from 'fs-extra';

const defaultJobDefaults: JobDefaults = {
	futureBlocks: 1,
	bundleBurst: 6,
	timeToAdvance: 120,
	priorityFee: 2,
};

export const defaultSimulationConfig: Partial<SimulationConfig> = {
	localRpc: 'http://127.0.0.1:8545',
	forkStartPort: 10000,
	forkMaxPorts: 100,
	keep3rHelper: '0xcb12Ac8649eA06Cbb15e29032163938D5F86D8ad',
	keep3rV1: '0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44',
	keep3r: '0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44',
	chainId: 1,
};

export async function loadSimulationConfig(filePath: string): Promise<SimulationConfig> {
	const userConfig: Partial<SimulationConfig> = await fs.readJSON(filePath);

	return validateSimulationConfig({
		...defaultSimulationConfig,
		...userConfig,
		jobDefaults: {
			...defaultJobDefaults,
			...userConfig.jobDefaults,
		},
	});
}

export function validateSimulationConfig(partialConfig: Partial<SimulationConfig>): SimulationConfig {
	return validate(partialConfig);
}
