import { getAddress } from 'ethers/lib/utils';
import { randomHex } from 'web3-utils';

export function generateRandomAddress(): string {
	return getAddress(randomHex(20));
}
