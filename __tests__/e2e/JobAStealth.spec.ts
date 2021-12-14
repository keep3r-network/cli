import { testGoerliBlock } from './common';

describe('JobAStealth', () => {
	it('should be workable when the block has not been worked', (done) => {
		(async () => {
			const workRequest$ = await testGoerliBlock(
				'node_modules/@keep3r-network/cli-sample-jobs/dist/goerli/job-a-stealth',
				5819500
			);
			workRequest$.subscribe((workRequest) => {
				const { burst } = workRequest;
				expect(workRequest).toMatchObject({
					type: 'WorkRequest',
					job: 'Job A Stealth',
					correlationId: 'job-a-stealth',
					burst: [
						{
							unsignedTxs: [
								{
									chainId: 5,
									data: burst[0].unsignedTxs[0].data,
									from: '0x3223C2ad76f62f4115dADDf07749F83AFc41f4a1',
									gasLimit: {
										hex: '0x01c950f5',
										type: 'BigNumber',
									},
									maxFeePerGas: {
										hex: '0x02540be40c',
										type: 'BigNumber',
									},
									maxPriorityFeePerGas: {
										hex: '0x02540be400',
										type: 'BigNumber',
									},
									nonce: 114,
									to: '0xD44A48001A4BAd6f23aD8750eaD0036765A35d4b',
									type: 2,
								},
							],
							targetBlock: 5819503,
							logId: burst[0].logId,
						},
					],
				});
				done();
			});
		})();
	}, 80000);

	it('should not be workable when in cooldown', (done) => {
		(async () => {
			const workRequest$ = await testGoerliBlock(
				'node_modules/@keep3r-network/cli-sample-jobs/dist/goerli/job-a-stealth',
				5819580
			);
			workRequest$.subscribe({
				next: (workRequest) => {
					expect(workRequest).toBeNull();
					done();
				},
				complete: () => done(),
			});
		})();
	}, 80000);
});
