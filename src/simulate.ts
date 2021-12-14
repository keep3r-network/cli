import { loadSimulationConfig } from './config/simulation-config';
import { categorizeJobMessages, findFreePort } from './utils/helpers';
import { getJobMetadata } from './utils/io';
import { setupLogger } from './utils/loggers';
import { ProcessManager } from './utils/process-manager';
import { JobMessage } from '@keep3r-network/cli-utils';
import { concatMap } from 'rxjs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

(async () => {
	const { config: configPath, block: blockNumber, job: jobPath } = getArguments();
	const config = await loadSimulationConfig(configPath);

	setupLogger(config.logs);

	const jobMetadata = await getJobMetadata(jobPath);
	const processManager = new ProcessManager();

	console.log(`Beginning test`, { blockNumber, jobName: jobMetadata.name, keeper: config.keeper });

	const jobMessage$ = processManager.run<JobMessage>(
		jobPath,
		`./src/job-wrapper.ts --job ${jobPath} --block ${blockNumber} --keeper ${config.keeper} --config ${JSON.stringify(
			config
		)} --ahead-amount ${config.jobDefaults.futureBlocks} --bundle-burst ${config.jobDefaults.bundleBurst} --time-to-advance ${
			config.jobDefaults.timeToAdvance
		} --priority-fee ${config.jobDefaults.priorityFee}`
	);

	const { workRequest$, portRequest$ } = categorizeJobMessages(jobMessage$);

	workRequest$.subscribe((workRequest) => {
		console.log(`Received work request`, workRequest);
	});

	// handle port requests
	portRequest$
		.pipe(
			concatMap(async (portRequest) => {
				const freePort = await findFreePort(config.forkStartPort, config.forkStartPort + config.forkMaxPorts);
				return { portRequest, freePort };
			})
		)
		.subscribe(({ portRequest, freePort }) => {
			portRequest.process.send({
				type: 'AvailablePort',
				port: freePort,
			});
		});
})();

function getArguments() {
	return yargs(hideBin(process.argv))
		.options({
			config: {
				type: 'string',
				alias: 'c',
				description: 'Path to user simulation config json file. This will override default config.',
				require: true,
			},
			block: {
				type: 'number',
				alias: 'b',
				description: 'Block to evaluate',
				require: true,
			},
			job: {
				type: 'string',
				alias: 'j',
				description: 'Job to simulate',
				require: true,
			},
		})
		.parseSync();
}
