import { BasicConfig } from './config/basic-config';
import { getNewBlocks } from './utils/helpers';
import { getJobMetadata } from './utils/io';
import { setupLogger } from './utils/loggers';
import { bnMin, toGwei } from './utils/math';
import { Block } from '@ethersproject/abstract-provider';
import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';
import {
	WorkRequest,
	getAvailablePort,
	getCoreMessages,
	GanacheFork,
	Job,
	JobBurst,
	JobWorkableGroup,
	advanceToTimeAndBlock,
} from '@keep3r-network/cli-utils';
import { BigNumber, providers, PopulatedTransaction } from 'ethers';
import path from 'path';
import { concatMap, filter, map, Subject, tap } from 'rxjs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const {
	job: jobPath,
	block: blockNumber,
	bundleBurst,
	config,
	aheadAmount,
	keeper: keeperAddress,
	retryId,
	skipIds,
	timeToAdvance,
	priorityFee,
} = getProcessArguments();
const job: Job = require(path.join(process.cwd(), jobPath, 'job'));

let logMetadata: { job: string };

(async () => {
	const jobMetadata = await getJobMetadata(jobPath);
	logMetadata = {
		job: jobMetadata.name,
	};
	setupLogger(config.logs);

	const localProvider = new providers.JsonRpcProvider({ url: config.localRpc }, config.chainId);
	const block = await localProvider.getBlock(blockNumber);
	const block$ = getNewBlocks(localProvider);
	const targetBlock = blockNumber + aheadAmount;
	const coreMessage$ = getCoreMessages();

	const burst$: Subject<JobBurst> = new Subject();

	burst$
		.pipe(
			filter((burst) => burst.workableGroups.length > 0),
			tap((burst) => allowOnlyType2LastTx(burst.workableGroups)),
			concatMap((burst) => addPaymentToMiner(burst, block, config)),
			filter((burst) => !!burst),
			map((burst) => sendBurstToCore(burst!, config.chainId))
		)
		.subscribe({
			next: () => console.info('Sent workable txs to core'),
			complete: async () => {
				// give some time to logs to be exported (printed to files or something else)
				setTimeout(() => process.exit(), 30);
			},
		});

	const fork = await GanacheFork.start(
		{
			fork: config.localRpc,
			port: await getAvailablePort(coreMessage$),
			fork_block_number: block.number,
			gasLimit: block.gasLimit.toHexString(),
			unlocked_accounts: [keeperAddress],
			gasPrice: BigNumber.from(0).toHexString(),
		},
		config.chainId
	);

	const timestamp = (await fork.ethersProvider.getBlock(block.number)).timestamp;
	await advanceToTimeAndBlock(fork.ganacheProvider, timestamp + timeToAdvance);

	await job.getWorkableTxs({
		subject: burst$,
		block: block,
		advancedBlock: block.number + 2,
		timeToAdvance,
		targetBlock,
		bundleBurst,
		keeperAddress,
		rpcUrl: config.localRpc,
		coreMessage$,
		keeperNonce: await localProvider.getTransactionCount(keeperAddress, blockNumber),
		fork,
		aheadAmount,
		block$,
		skipIds,
		retryId,
		chainId: config.chainId,
	});
})();

/**
 * Because we currently pay the miner using the maxPriorityFeePerGas in the last tx.
 * This is why the last tx must be type 2
 * @param burst burst with txs to verify
 */
function allowOnlyType2LastTx(burst: JobWorkableGroup[]): void {
	for (const workableGroup of burst) {
		if (workableGroup.txs[workableGroup.txs.length - 1]?.type !== 2) {
			throw new Error('Last tx must be type 2 for miner payment');
		}
	}
}

async function addPaymentToMiner(burst: JobBurst, forkBlock: Block, config: BasicConfig): Promise<JobBurst | undefined> {
	const maxBaseFeeInFutureBlock = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(forkBlock.baseFeePerGas!, aheadAmount);
	const priorityFeeToGwei = toGwei(priorityFee);
	const calculatedMaxFeePerGas = priorityFeeToGwei.add(maxBaseFeeInFutureBlock);
	const maxFeePerGas = config.topMaxFeePerGas
		? bnMin(BigNumber.from(config.topMaxFeePerGas), calculatedMaxFeePerGas)
		: calculatedMaxFeePerGas;

	const editedWorkableGroups = burst.workableGroups.map((workableGroup) => ({
		...workableGroup,
		txs: workableGroup.txs.slice(0, -1).concat({
			...workableGroup.txs[workableGroup.txs.length - 1],
			maxFeePerGas: maxFeePerGas,
			maxPriorityFeePerGas: priorityFeeToGwei,
		}),
	}));

	return {
		...burst,
		workableGroups: editedWorkableGroups,
	};
}

function sendBurstToCore(burst: JobBurst, chainId: number): void {
	const message: WorkRequest = {
		type: 'WorkRequest',
		job: logMetadata.job,
		correlationId: burst.correlationId,
		burst: burst.workableGroups.map((workableGroup) => ({
			unsignedTxs: workableGroup.txs.map((workableTx: PopulatedTransaction) => ({
				...workableTx,
				chainId,
			})),
			targetBlock: workableGroup.targetBlock,
			logId: workableGroup.logId,
		})),
	};

	process.send && process.send(message);
}

export function getProcessArguments() {
	const args = yargs(hideBin(process.argv))
		.options({
			block: {
				type: 'number',
				demandOption: true,
				description: 'Block number to fork from',
			},
			aheadAmount: {
				type: 'number',
				demandOption: true,
				description: 'Extra blocks used for the retry mechanism',
			},
			job: {
				type: 'string',
				demandOption: true,
				description: 'Job name',
			},
			keeper: {
				type: 'string',
				demandOption: true,
				description: 'Keeper address',
			},
			config: {
				type: 'string',
				demandOption: true,
				description: 'Config json',
			},
			retryId: {
				type: 'string',
				description: 'Retry id that will be passed down to the job',
			},
			skipId: {
				type: 'string',
				array: true,
				description: 'Ids to skip that will be passed down to the job',
			},
			bundleBurst: {
				type: 'number',
				demandOption: true,
			},
			timeToAdvance: {
				type: 'number',
				demandOption: true,
			},
			priorityFee: {
				type: 'number',
				demandOption: true,
			},
		})
		.parseSync();

	return {
		...args,
		config: JSON.parse(args.config) as BasicConfig,
		skipIds: args.skipId ? args.skipId : [],
	};
}
