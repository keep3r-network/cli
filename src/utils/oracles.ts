import UniswapV3Pool from '../abi/UniswapV3Pool.json';
import { ITokenAsset } from '../types';
import { Contract, BigNumber, providers } from 'ethers';

export const BASE = 1_000_000;

// type Oracle

/* TODO: define weather to return a number or a BigNumber */
export async function uniV3TwapQuote(asset: ITokenAsset, provider: providers.Provider): Promise<number> {
	//TODO: when we start working on oracles, add blockTag to callStatic
	const uniV3Pool = new Contract(asset.metadata.poolAddress, UniswapV3Pool, provider);
	const observations = await uniV3Pool.callStatic.observe([0, asset.metadata.twapTime]);
	const ticks = observations[0];

	// console.log(ticks[0].toString());
	// console.log(ticks[1].toString());

	let quote = 0;
	/* TODO: verify correct order of tick0 tick1 */
	if ((await uniV3Pool.callStatic.token0()) === asset.address) {
		quote = 1.0001 ** ((ticks[0] - ticks[1]) / asset.metadata.twapTime);
	} else if ((await uniV3Pool.callStatic.token1()) === asset.address) {
		quote = 1.0001 ** ((ticks[1] - ticks[0]) / asset.metadata.twapTime);
	} else {
		/* TODO: add warn message */
		// quote = 0;
	}

	return quote;
}
