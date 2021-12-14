import { ChildProcessMessage, JobObject } from '../types';
import { Flashbots } from './flashbots';
import { ProcessManager } from './process-manager';
import { Block } from '@ethersproject/abstract-provider';
import { JobMessage, PortRequest, WorkRequest } from '@keep3r-network/cli-utils';
import { BigNumber, providers, Wallet, utils } from 'ethers';
import moment from 'moment';
import portfinder from 'portfinder';
import { concatMap, from, mergeMap, Observable, of, Subject, tap, toArray } from 'rxjs';
import { filter, map, share } from 'rxjs/operators';
import { JobConfig } from 'src/config/config.d';
import { Config } from 'src/config/config.d';
import { PopulatedJobConfig } from 'src/config/config.d';

export function doWork(
	job: JobObject,
	forkBlock: number,
	timeToAdvance: number,
	priorityFee: number,
	aheadAmount: number,
	bundleBurst: number,
	processManager: ProcessManager,
	keeper: string,
	skipIds: string[],
	correlationId?: string
): Observable<WorkRequest> {
	console.log(`Start working on ${job.metadata.name} from block ${forkBlock}`);

	const jobMessage$ = processManager.run<JobMessage>(
		job.config.path,
		`./src/job-wrapper.ts ` +
			`--job ${job.config.path} ` +
			`--block ${forkBlock} ` +
			`--time-to-advance ${timeToAdvance} ` +
			`--priority-fee ${priorityFee} ` +
			`--ahead-amount ${aheadAmount} ` +
			`--bundle-burst ${bundleBurst} ` +
			`--keeper ${keeper} ` +
			`--config ${JSON.stringify(global.config)} ` +
			skipIds.map((skipId) => `--skipId ${skipId}`).join(' ') +
			' ' +
			(correlationId ? `--retry-id ${correlationId}` : '')
	);
	const { workRequest$, portRequest$ } = categorizeJobMessages(jobMessage$);

	portRequest$
		.pipe(
			concatMap(async (portRequest) => {
				const freePort = await findFreePort(
					global.config.forkStartPort,
					global.config.forkStartPort + global.config.forkMaxPorts
				);
				return { portRequest, freePort };
			})
		)
		.subscribe(({ portRequest, freePort }) => {
			portRequest.process.send({
				type: 'AvailablePort',
				port: freePort,
			});
		});

	return workRequest$;
}

export function retryWorkAndSendTx(
	job: JobObject,
	aheadAmount: number,
	timeToAdvance: number,
	priorityFee: number,
	bundleBurst: number,
	correlationId: string,
	skipIds: string[],
	processManager: ProcessManager,
	keeper: string,
	flashbots: Flashbots,
	localProvider: providers.JsonRpcProvider
): Observable<boolean> {
	return from(localProvider.getBlockNumber()).pipe(
		tap((forkBlock) => console.log(`Retrying work for ${job.metadata.name} forking block ${forkBlock}`)),
		concatMap((forkBlock) =>
			doWork(job, forkBlock, timeToAdvance, priorityFee, aheadAmount, bundleBurst, processManager, keeper, skipIds, correlationId)
		),
		mergeMap((workRequests) => sendTxs(workRequests, flashbots)),
		mergeMap(
			(result: boolean): Observable<boolean> =>
				result
					? of(result)
					: retryWorkAndSendTx(
							job,
							aheadAmount,
							timeToAdvance,
							priorityFee,
							bundleBurst,
							correlationId,
							skipIds,
							processManager,
							keeper,
							flashbots,
							localProvider
					  )
		)
	);
}

export function sendTxs(workRequest: WorkRequest, flashbots: Flashbots): Promise<boolean> {
	console.log('Sending txs', workRequest);
	if (workRequest.burst.length === 0) return Promise.resolve(true);

	const included = workRequest.burst.map((workableGroup) => {
		return flashbots.send(workableGroup.unsignedTxs, workableGroup.targetBlock, workableGroup.logId);
	});

	return included[0];
}

export function getAddressFromPrivateKey(pk: string): string {
	return new Wallet(pk).address;
}

export function getNewBlocks(provider: providers.BaseProvider): Observable<Block> {
	const blockSubject$ = new Subject<Block>();
	provider.on('block', async (blockNumber) => {
		const block = await provider.getBlock(blockNumber);
		blockSubject$.next(block);
	});

	return blockSubject$.pipe(share());
}

const portUnlockedAt: { [port: number]: number } = {};

/**
 * Each job needs any number of free ports in order to run some forks
 * If every job looks for a free port on it's own a race will start and
 * they may find the same port.
 * For this not to happen, the core should listen to port requests
 * looks for a free port, and send it to the child process.
 *
 * Each time a port is given, there is a timelock in order to avoid finding the same
 * port again before the child process starts using it
 *
 * @param start Starting point to look for a free port
 * @param end End point to look for a free port
 * @returns Free and unlocked port between the given limits
 */
export async function findFreePort(start: number, end: number): Promise<number> {
	try {
		const port = await portfinder.getPortPromise({
			port: start,
			stopPort: end,
		});

		if (portUnlockedAt[port] > Date.now()) {
			return await findFreePort(port + 1, end);
		}

		// lock port assignment
		portUnlockedAt[port] = Date.now() + moment.duration(30, 'seconds').asMilliseconds();

		return port;
	} catch {
		throw new Error('No free ports found');
	}
}

export function categorizeJobMessages(message$: Observable<ChildProcessMessage<JobMessage>>): {
	workRequest$: Observable<WorkRequest>;
	portRequest$: Observable<ChildProcessMessage<PortRequest>>;
} {
	const workRequest$ = message$.pipe(
		filter((message) => message.data.type === 'WorkRequest'),
		map((message) => message.data as WorkRequest)
	);
	const portRequest$ = message$.pipe(
		filter((message) => message.data.type === 'PortRequest'),
		map((message) => message as ChildProcessMessage<PortRequest>)
	);

	return { workRequest$, portRequest$ };
}

export function populateJobConfig(jobPartialConfig: JobConfig, config: Config): PopulatedJobConfig {
	return {
		path: jobPartialConfig.path,
		futureBlocks: jobPartialConfig.futureBlocks || config.jobDefaults.futureBlocks,
		bundleBurst: jobPartialConfig.bundleBurst || config.jobDefaults.bundleBurst,
		timeToAdvance: jobPartialConfig.timeToAdvance || config.jobDefaults.timeToAdvance,
		priorityFee: jobPartialConfig.priorityFee || config.jobDefaults.priorityFee,
	};
}

export const toGwei = (value: number): BigNumber => {
	return utils.parseUnits(value.toString(), 'gwei');
};
