import { testGoerliBlock } from './common';

describe('JobA', () => {
	it('should be workable when the block has not been worked', (done) => {
		(async () => {
			const workRequest$ = await testGoerliBlock('node_modules/@keep3r-network/cli-sample-jobs/dist/goerli/job-a', 5806700);
			workRequest$.subscribe((workRequest) => {
				const { burst } = workRequest;
				expect(workRequest).toMatchObject({
					type: 'WorkRequest',
					job: 'Job A',
					correlationId: 'job-a',
					burst: [
						{
							unsignedTxs: [
								{
									chainId: 5,
									data: '0x322e9f04',
									from: '0x3223C2ad76f62f4115dADDf07749F83AFc41f4a1',
									gasLimit: {
										hex: '0x1e8480',
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
									nonce: 112,
									to: '0xd50345ca88e0B2cF9a6f5eD29C1F1f9d76A16C3c',
									type: 2,
								},
							],
							targetBlock: 5806703,
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
			const workRequest$ = await testGoerliBlock('node_modules/@keep3r-network/cli-sample-jobs/dist/goerli/job-a', 5814195);
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
