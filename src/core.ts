import { loadConfig } from './config/config';
import { loadSecrets } from './config/secrets';
import { initializeKeeper } from './scripts/initialize-keeper';
import { Flashbots } from './utils/flashbots';
import { doWork, getNewBlocks, populateJobConfig, retryWorkAndSendTx, sendTxs } from './utils/helpers';
import { getJobMetadata } from './utils/io';
import { setupLogger } from './utils/loggers';
import { ProcessManager } from './utils/process-manager';
import { Wallet } from '@ethersproject/wallet';
import { providers } from 'ethers';
import { concatMap, exhaustMap, from, map, mergeMap, of, tap } from 'rxjs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

(async () => {
	const { config: configPath, secrets: secretsPath } = getArguments();

	// globals must be set at the beginning of the execution
	global.config = await loadConfig(configPath);
	global.secrets = await loadSecrets(secretsPath);
	const localProvider = new providers.JsonRpcProvider({ url: global.config.localRpc }, global.config.chainId);

	setupLogger(global.config.logs);

	const keeper = await initializeKeeper();
	if (!keeper) process.exit();

	const block$ = getNewBlocks(localProvider);

	const processManager = new ProcessManager();
	const flashbots = await Flashbots.init(
		new Wallet(global.secrets.keeperPrivateKey),
		new Wallet(global.secrets.bundleSignerPrivateKey)
	);

	const idsInProgress: Record<string, boolean> = {};

	const work$ = from(global.config.jobs).pipe(
		map((jobPartialConfig) => populateJobConfig(jobPartialConfig, global.config)),
		concatMap(async (jobConfig) => ({
			config: jobConfig,
			metadata: await getJobMetadata(jobConfig.path),
		})),
		mergeMap((job) =>
			block$.pipe(
				exhaustMap((block) =>
					doWork(
						job,
						block.number,
						job.config.timeToAdvance,
						job.config.priorityFee,
						job.config.futureBlocks,
						job.config.bundleBurst,
						processManager,
						keeper,
						Object.keys(idsInProgress)
					)
				),
				tap(({ correlationId }) => (idsInProgress[correlationId] = true)),
				mergeMap((workRequest) =>
					sendTxs(workRequest, flashbots).then((result) => ({
						workRequest,
						result,
					}))
				),
				mergeMap(({ result, workRequest }) => {
					if (result) {
						delete idsInProgress[workRequest.correlationId];
						return of(result);
					} else {
						const retry$ = retryWorkAndSendTx(
							job,
							job.config.bundleBurst,
							job.config.timeToAdvance,
							job.config.priorityFee,
							job.config.bundleBurst,
							workRequest.correlationId,
							Object.keys(idsInProgress),
							processManager,
							keeper,
							flashbots,
							localProvider
						);

						retry$.subscribe({ complete: () => delete idsInProgress[workRequest.correlationId] });

						return retry$;
					}
				})
			)
		)
	);

	block$.subscribe((block) => console.info(`Block ${block.number} arrived`));
	work$.subscribe(() => console.info(`Work finished`));
})();

function getArguments() {
	return yargs(hideBin(process.argv))
		.options({
			config: {
				type: 'string',
				alias: 'c',
				description: 'Path to user config json file. This will override default config.',
				require: true,
			},
			secrets: {
				type: 'string',
				alias: 's',
				description: 'Path to the .env file',
				require: true,
			},
		})
		.parseSync();
}
