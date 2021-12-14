import { Config, JobConfig } from './config/config.d';
import { Secrets } from './config/secrets.d';
import { JobMetadata } from './utils/io.d';
import { GanacheFork, AvailablePort } from '@keep3r-network/cli-utils';
import { ChildProcess } from 'child_process';
import { BigNumber, ethers } from 'ethers';
import { Observable } from 'rxjs';

export interface ProcessArguments {
	block: number;
	job: string;
	keeper: string;
	config: string;
}

export type ChildProcessMessage<T> = {
	process: ChildProcess;
	data: T;
};

export interface JobInitialConsts {
	message$: Observable<AvailablePort>;
	config: Config;
	provider: ethers.providers.JsonRpcProvider;
	block: ethers.providers.Block;
	keeper: string;
	nonce: number;
	fork: GanacheFork;
	maxFeePerGas: BigNumber;
	targetBlock: number;
}

export interface JobObject {
	config: JobConfig;
	metadata: JobMetadata;
}

export interface IGasPrice {
	confidence: number;
	price: number;
	maxPriorityFeePerGas: number;
	maxFeePerGas: number;
}

export interface IGasReport {
	estimatedPrices: IGasPrice[];
}

declare global {
	namespace NodeJS {
		interface Global {
			config: Config;
			secrets: Secrets;
		}
	}
}

// Balance and calculation types

export interface ITokenAsset {
	name: string;
	address: string;
	oracleType?: string;
	// oracleFn: Function; // linter error >>> Don't use `Function` as a type
	oracleFn: any; // change to defined function type
	metadata: any;
}
