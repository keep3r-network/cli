import Keep3rV1ABI from '../abi/Keep3rV1.json';
import Keep3rV3HelperABI from '../abi/Keep3rV3Helper.json';
import { parseUnits } from '@ethersproject/units';
import { Contract, BigNumber, providers } from 'ethers';

export async function getTokenBalanceInETH(
	provider: providers.JsonRpcProvider,
	walletAddress: string,
	keep3rAddress: string,
	keep3rHelperAddress: string,
	blockNumber: number
): Promise<BigNumber> {
	const keep3r = new Contract(keep3rAddress, Keep3rV1ABI, provider);
	const keep3rHelper = new Contract(keep3rHelperAddress, Keep3rV3HelperABI, provider);

	const tokenBalance: BigNumber = await keep3r.callStatic.balanceOf(walletAddress, { blockTag: blockNumber });
	const tokenBonds: BigNumber = await keep3r.callStatic.bonds(walletAddress, keep3r.address, { blockTag: blockNumber });
	const tokenTotal: BigNumber = tokenBalance.add(tokenBonds);

	const base: BigNumber = parseUnits('10', 'ether');
	const quote: BigNumber = await keep3rHelper.callStatic.getQuote(base, { blockTag: blockNumber });

	return tokenTotal.mul(base).div(quote);
}
