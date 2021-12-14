import { defaultSimulationConfig, validateSimulationConfig } from '../../src/config/simulation-config';
import { categorizeJobMessages, findFreePort } from '../../src/utils/helpers';
import { ProcessManager } from '../../src/utils/process-manager';
import { JobMessage, WorkRequest } from '@keep3r-network/cli-utils';
import fs from 'fs-extra';
import { concatMap, Observable } from 'rxjs';
import { SimulationConfig } from 'src/config/simulation-config.d';

const testConfig: Partial<SimulationConfig> = {
	chainId: 5,
	keep3r: '0x3364BF0a8DcB15E463E6659175c90A57ee3d4288',
	keep3rV1: '0x3364BF0a8DcB15E463E6659175c90A57ee3d4288',
	keep3rHelper: '0xF3043424E22C0b3204C1458546271b13c513b62f',
	keeper: '0x3223C2ad76f62f4115dADDf07749F83AFc41f4a1',

	jobDefaults: {
		futureBlocks: 3,
		bundleBurst: 1,
		timeToAdvance: 30,
		priorityFee: 10,
	},
};

const jsonFilePath = `.config.test.goerli.json`;

export async function testGoerliBlock(jobPath: string, blockNumber: number): Promise<Observable<WorkRequest>> {
	const envConfig = process.env.ALCHEMYKEY ? { localRpc: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMYKEY}` } : {};
	const jsonConfig = fs.existsSync(jsonFilePath) ? await fs.readJSON(jsonFilePath) : {};

	const config = validateSimulationConfig({
		...defaultSimulationConfig,
		...envConfig,
		...jsonConfig,
		...testConfig,
	});

	const processManager = new ProcessManager();

	if (config.localRpc.includes('127.0.0.1') || config.localRpc.includes('localhost')) {
		throw new Error('Please use an alchemy node. Tests require an archive node.');
	}

	const jobMessage$ = processManager.run<JobMessage>(
		jobPath,
		`./dist/tsc/src/job-wrapper ` +
			`--job ${jobPath} ` +
			`--block ${blockNumber} ` +
			`--keeper ${config.keeper} ` +
			`--config ${JSON.stringify(config)} ` +
			`--ahead-amount ${config.jobDefaults.futureBlocks} ` +
			`--bundle-burst ${config.jobDefaults.bundleBurst} ` +
			`--time-to-advance ${config.jobDefaults.timeToAdvance} ` +
			`--priority-fee ${config.jobDefaults.priorityFee}`
	);

	const { workRequest$, portRequest$ } = categorizeJobMessages(jobMessage$);

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

	workRequest$.subscribe();

	return workRequest$;
}
