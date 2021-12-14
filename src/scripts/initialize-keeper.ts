import Keep3rTXABI from '../abi/Keep3rTX.json';
import Keep3rV1ABI from '../abi/Keep3rV1.json';
import Keep3rV2ABI from '../abi/Keep3rV2.json';
import { makeTransaction, promptYesNo } from '../utils/actions';
import { getAddressFromPrivateKey } from '../utils/helpers';
import { providers, Wallet, Contract } from 'ethers';
import moment from 'moment';

export async function initializeKeeper(): Promise<string | undefined> {
	const keeperAddress = getAddressFromPrivateKey(global.secrets.keeperPrivateKey);

	// verifying correct keeper address
	if (global.config.inquireKeeperAddress) {
		const keeperConfirmed = await promptYesNo(`Please confirm the address which will work: ${keeperAddress}`);
		if (!keeperConfirmed) return;
	}

	console.log(`Verifying keeper status`, { keeper: keeperAddress });

	const provider = new providers.JsonRpcProvider({ url: global.config.localRpc }, global.config.chainId);

	let isKeeper: boolean;
	let bondingTime: number;
	let activationTimestamp: number;

	const isKeep3rV1 = global.config.keep3r === global.config.keep3rV1;

	if (isKeep3rV1) {
		const keep3rV1: Contract = new Contract(global.config.keep3rV1, Keep3rV1ABI, provider);

		isKeeper = await keep3rV1.keepers(keeperAddress);
		bondingTime = await keep3rV1.BOND();
		activationTimestamp = await keep3rV1.bondings(keeperAddress, global.config.keep3rV1);
	} else {
		const keep3rV2: Contract = new Contract(global.config.keep3r, Keep3rV2ABI, provider);

		isKeeper = await keep3rV2.callStatic.isKeeper(keeperAddress);
		bondingTime = await keep3rV2.bondTime();
		activationTimestamp = await keep3rV2.canActivateAfter(keeperAddress, global.config.keep3rV1);
	}

	if (isKeeper) {
		console.log(`Keeper is activated`);
		return keeperAddress;
	}

	/* TODO: define where it should be initialized */
	// setup provider
	const txProvider = new providers.JsonRpcProvider({ url: global.config.txRpc }, global.config.chainId);
	// setup signer
	const signer = new Wallet(global.secrets.keeperPrivateKey, txProvider);
	// setup Keep3r contract for tx
	const keep3rTx = new Contract(global.config.keep3r, Keep3rTXABI, signer);

	const keeperIsNew = activationTimestamp == 0;
	if (keeperIsNew) {
		console.log(`Your address is not currently a keeper nor bonded to be one`);
		const bondKeeper = await promptYesNo('Would you like to bond 0 KP3R in order to start the process?');
		if (bondKeeper) {
			const bondSuccess = await makeTransaction(keep3rTx, 'bond', [global.config.keep3rV1, 0]);
			if (bondSuccess) {
				console.info(`Keeper will be able to activate ${moment.duration(bondingTime, 'seconds').humanize(true)}`);
			}
		} else {
			console.info('You need an activated keeper to start working jobs');
		}
		return;
	}

	const timeToWait = activationTimestamp * 1000 - Date.now();
	const keeperIsBonding = timeToWait > 0;
	if (keeperIsBonding) {
		console.log(`Your address is currently in the bonding process`);
		console.info(`Keeper will be able to activate ${moment.duration(timeToWait, 'milliseconds').humanize(true)}`);
		return;
	}

	console.log(`Keeper can be activated`);

	const activateKeeper = await promptYesNo('Would you like to activate your keeper?');
	if (activateKeeper) {
		const activateSuccess = await makeTransaction(keep3rTx, 'activate', [global.config.keep3rV1]);
		if (activateSuccess) {
			console.info(`Keeper activated`);
			return keeperAddress;
		}
	} else {
		console.info('You need an activated keeper to start working jobs');
	}
}
