export interface JobDefaults {
	futureBlocks: number;
	bundleBurst: number;
	timeToAdvance: number;
	priorityFee: number;
}

export interface BasicConfig {
	localRpc: string;
	chainId: number;
	forkStartPort: number;
	forkMaxPorts: number;
	keep3r: string;
	keep3rV1: string;
	keep3rHelper: string;
	logs?: ConfigLogs;
	topMaxFeePerGas?: string;
	jobDefaults: JobDefaults;
}

export interface ConfigLogs {
	dailyRotateFile?: {
		default?: any;
		exceptions?: any;
	};
}
