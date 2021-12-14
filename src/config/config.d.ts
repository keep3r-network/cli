import { BasicConfig, JobDefaults } from './basic-config';

interface JobConfig extends Partial<JobDefaults> {
	path: string;
}

interface PopulatedJobConfig extends JobDefaults {
	path: string;
}

export interface Config extends BasicConfig {
	txRpc: string;
	gasLimit: string;
	recommendedGasPriceIndex: number;
	inquireKeeperAddress: boolean;
	initializationGasLimit: number;
	flashbotRelays: string[];
	simulateBundle: boolean;
	jobs: JobConfig[];
}
