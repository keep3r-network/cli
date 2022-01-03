import { TransactionRequest } from '@ethersproject/abstract-provider';
import { Signer } from '@ethersproject/abstract-signer';
import {
	FlashbotsBundleProvider,
	FlashbotsBundleRawTransaction,
	FlashbotsBundleResolution,
	SimulationResponse,
} from '@flashbots/ethers-provider-bundle';
import { prelog } from '@keep3r-network/cli-utils';
import { providers } from 'ethers';

export class Flashbots {
	private constructor(private txSigner: Signer, private flashbotsProviders: FlashbotsBundleProvider[]) {}

	static async init(txSigner: Signer, bundleSigner: Signer): Promise<Flashbots> {
		const localProvider = new providers.JsonRpcProvider({ url: global.config.localRpc }, global.config.chainId);

		// create a provider for every relay defined in the config
		const flashbotsProviders = await Promise.all(
			global.config.flashbotRelays.map((relay) => {
				return FlashbotsBundleProvider.create(localProvider, bundleSigner, relay, global.config.chainId);
			})
		);

		return new Flashbots(txSigner, flashbotsProviders);
	}

	async send(unsignedTxs: TransactionRequest[], targetBlock: number, logId: string): Promise<boolean> {
		// prepare txs and bundle
		const signedTxs = await Promise.all(unsignedTxs.map((unsignedTx) => this.txSigner.signTransaction(unsignedTx)));
		const bundle: FlashbotsBundleRawTransaction[] = signedTxs.map((signedTransaction) => ({
			signedTransaction,
		}));

		// simulate bundle if needed
		const simulationPassed = global.config.simulateBundle
			? await this.simulateBundle(this.flashbotsProviders[0], bundle, targetBlock, logId)
			: true;

		if (simulationPassed) {
			return this.broadcastBundle(this.flashbotsProviders, bundle, targetBlock, logId);
		}

		return false;
	}

	async simulateBundle(
		provider: FlashbotsBundleProvider,
		bundle: FlashbotsBundleRawTransaction[],
		targetBlock: number,
		logId: string
	): Promise<boolean> {
		const logConsole = prelog({ targetBlock, logId });
		let simulation: SimulationResponse;

		try {
			const singedBundle = await provider.signBundle(bundle);
			simulation = await provider.simulate(singedBundle, targetBlock);
			if ('error' in simulation || simulation.firstRevert) {
				logConsole.log(`Bundle simulation error`, simulation);
				return false;
			}
		} catch (error: any) {
			logConsole.log(`Bundle simulation error`, { error });
			return false;
		}

		logConsole.log(`Bundle simulation success`, simulation);
		return true;
	}

	async broadcastBundle(
		providers: FlashbotsBundleProvider[],
		bundle: FlashbotsBundleRawTransaction[],
		targetBlock: number,
		logId: string
	): Promise<boolean> {
		const inclusions = await Promise.all(
			providers.map((provider) => {
				return this.sendBundle(provider, bundle, targetBlock, logId);
			})
		);

		return inclusions.find((inclusion) => inclusion) || false;
	}

	async sendBundle(
		provider: FlashbotsBundleProvider,
		bundle: FlashbotsBundleRawTransaction[],
		targetBlock: number,
		logId: string
	): Promise<boolean> {
		const logConsole = prelog({ targetBlock, logId, provider: provider.connection.url });
		logConsole.log(`Sending bundle`);

		try {
			const response = await provider.sendBundle(bundle, targetBlock);

			if ('error' in response) {
				logConsole.log(`Bundle execution error`, response.error);
				return false;
			}

			const resolution = await response.wait();

			if (resolution == FlashbotsBundleResolution.BundleIncluded) {
				logConsole.info(`Bundle status: BundleIncluded`);
				return true;
			} else if (resolution == FlashbotsBundleResolution.BlockPassedWithoutInclusion) {
				logConsole.info(`Bundle status: BlockPassedWithoutInclusion`);
			} else if (resolution == FlashbotsBundleResolution.AccountNonceTooHigh) {
				logConsole.warn(`AccountNonceTooHigh`);
			}
		} catch (err: unknown) {
			logConsole.warn(`Failed to send bundle`, { error: err });
		}

		return false;
	}
}
