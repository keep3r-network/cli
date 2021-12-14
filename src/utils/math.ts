import { BigNumber, utils } from 'ethers';

export function bnMin(...values: BigNumber[]): BigNumber {
	let lowest = values[0];

	for (const value of values) {
		if (value.lt(lowest)) {
			lowest = value;
		}
	}

	return lowest;
}

export const toGwei = (value: number): BigNumber => {
	return utils.parseUnits(value.toString(), 'gwei');
};
