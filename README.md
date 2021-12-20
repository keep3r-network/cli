# Keep3r CLI

The Keep3r CLI provides an easy-to-use CLI along with all the necessary code required to run your own keeper and start working on jobs on The Keep3r Network.

Jobs can be added as external packages. This allows job owners to publish their own scripts for keepers to run them on their local infrastructure.

## Getting Started

1. [Install geth](https://geth.ethereum.org/docs/install-and-build/installing-geth)
2. Clone this repo
`git clone https://github.com/keep3r-network/cli`
2. Install dependencies (`yarn install`)
3. Create a `.json` file with your config. Use the example `.config.example.json` we provide to see the fields you have to complete.
4. Create a `.json` file with your secrets. Use the example `.secrets.example.json` we provide to see how to complete it
5. Run a local geth node, and wait till it fully synchronizes with `yarn node:mainnet`. In case you want to run the node somewhere else or in a specific port, remember changing the `localRpc` configuration.
6. Run the following command. Both the `--config` and `--secrets` flag are required. You will have to provide the path to where your config and secrets file are located.
`yarn start --config <path_to_config_file> --secrets <path_to_secrets_file>`

## First run

The first time running the script, chances are the user's keeper is not yet registered in The Keep3r Network. If that's the case, the script will prompt the user to perform the activation process, bonding 0 KP3Rs to the protocol, and being able to activate the keeper after 3 days.

-------

## Job board

- **Harvest V2**
    - Package: `@keep3r-network/cli-sample-jobs`
    - Location: `node_modules/@keep3r-network/cli-sample-jobs/src/mainnet/harvest-v2`
    - [**Requirements to run**](https://github.com/keep3r-network/cli-sample-jobs/blob/main/src/mainnet/harvest-v2/README.md)

- **DCA**
    - Package: `@keep3r-network/cli-sample-jobs`
    - Location: `node_modules/@keep3r-network/cli-sample-jobs/src/mainnet/dca`
    - [**Requirements to run**](https://github.com/keep3r-network/cli-sample-jobs/blob/main/src/mainnet/dca/README.md)

- **Tend V2**
    - Package: `@keep3r-network/cli-sample-jobs`
    - Location: `node_modules/@keep3r-network/cli-sample-jobs/src/mainnet/tend-v2`
    - **[Requirements to run](https://github.com/keep3r-network/cli-sample-jobs/blob/main/src/mainnet/tend-v2/README.md)**

- **Tend V2 2**
    - Package: `@keep3r-network/cli-sample-jobs`
    - Location: `node_modules/@keep3r-network/cli-sample-jobs/src/mainnet/tend-v2-2`
    - **[Requirements to run](https://github.com/keep3r-network/cli-sample-jobs/blob/main/src/mainnet/tend-v2-2/README.md)**

-------

## Configuration

### txRpc
RPC address which will be used for broadcasting general use transactions (keeper bond & activation).

### jobs
Array of job objects to run. The configuration given (except for the path) does not need to be repeated for every job, instead, it can be defined once in the `jobDefaults` config and overriden when necessary.

You can find a more detailed explanation of these parameters with examples to understand them further in the **Getting Technical Section** below.

* Default: `[]`

Sample job with full overriden default configuration:
```
{
  "path": "node_modules/@keep3r-network/cli-sample-jobs/dist/mainnet/dca",
  "futureBlocks": 3,
  "bundleBurst": 5,
  "timeToAdvance": 200,
  "priorityFee": 10
}
```

**futureBlocks**

Number of blocks in the future to simulate the transactions on. It is recommended to set it up higher for computational demanding jobs.

* Default: 1

**bundleBurst**

Amount of blocks to target with emitted transactions.

* Default: 6

**timeToAdvance**

Time, in seconds, to advance in the forks. This allows us to discover workable works before they're workable.

* Default: 120

**priorityFee**

Priority fee in gwei, the user is willing to pay the miner to have his bundle included.

* Default: 10

### localRpc
RPC used for simulations. The recommended setup is to point it to a [local light node](https://ethereum.org/en/developers/tutorials/run-light-node-geth/).

* Default: `http://127.0.0.1:8545`

### flashbotRelays
Flashbot relays used for broadcasting work transactions.

* Default: `['https://relay.flashbots.net']`

### chainId
Chain id of the network to work on.

* Default: 1

### keep3r
Keep3r address used to interact with the protocol (bond & activate).

* Default: `0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44`

*Default Keep3r address will be changed to Keep3rV2 in future release.*

### keep3rV1
KP3R ERC20 token address.

* Default: `0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44`

### keep3rHelper
Keep3r Helper address used for quoting KP3R.

* Default: `0xcb12Ac8649eA06Cbb15e29032163938D5F86D8ad`

### topMaxFeePerGas
Maximum maxFeePerGas allowed to pay. This is not a mandatory config.

-------

## Secrets

The `secrets` is a json file. It's only readable by Keep3r CLI Core (not by jobs), and holds the private information of the keeper and the flashbots signer.

```
{
  "keeperPrivateKey": "0x...",
  "bundleSignerPrivateKey": "0x..."
}
```

## Simulations

We also provide you a way to perform simulations on past blocks without actually sending the transactions to flashbots. This can be a useful debugging tool.

For example, we could verify that a job was workable at a specific block in the past. Such simulation may require using an **archive node** as `localRpc`.

The command to run is:
    
`yarn simulate --job <job_path> --block <block_number> --config <simulation_config_path>`

The minimum simulation config required to run a simulation looks like:

```bash
{ 
  "localRpc": "https://eth-goerli.alchemyapi.io/v2/API_KEY",
  "keeper": "KEEPER_ADDRESS"
}
```

### keeper
Address of the user's keeper to run tests without the user's secrets. This is only required when running `yarn simulate` or `yarn test`.

------

## Recommendations

1. We recommend the user to run the CLI as a linux service, or using [pm2](https://www.npmjs.com/package/pm2), or [forever](https://www.npmjs.com/package/forever). All of these services will monitor the execution of the script, and automatically restart it if an exception is thrown.

2. As a part of the setup, having a local light node is recommended when running simulations. It can be spawned by running `yarn node:mainnet`, and pointing the `forkRpc` to localhost. Using RPC services (like Alchemy) is discouraged, as they have reduced performance on recent blocks.

------

## Getting more technical

When running a job with the intent of working it, it's important to be as efficient as possible to be able to work it quickly. Keepers, in general, will employ different strategies to achieve this. The Keep3r CLI provides four optional parameters for each job that have a major effect on how efficient the keeper can be running each job. These parameters are:

- `futureBlocks`
- `bundleBurst`
- `timeToAdvance`
- `priorityFee`

### futureBlocks and bundleBurst

Let's say we are running a single job at block `100` and we intend to try and work it in that very same block. However, we may notice that, if our computer is slow or if the job is computationally-heavy to simulate, going through the whole process of running the job until it's sent to flashbots as a bundle, may take more than one block. It may even take two or more. So we would run into an interesting problem if we start working at block `100` and try to send it to flashbots at block `100` when it finished going through the whole pipeline of logic at block `102`.

Here's where `futureBlocks` comes to the rescue. If we set a `futureBlocks` of 3 and start working at block `100`, then the bundle will know that it must send the bundled transactions required to work the job at block `103` = `100 + futureBlocks(3)`

This is great, but there's a possibility that our bundle is not included in ``block 103``. This can happen, for example, if the miner of ``block 103`` is not a FlashBot. If this takes place, then we would be out of luck. We would need to restart the process again, and send the same bundled transactions for block ``106 (103 + futureBlocks(3))``, and perhaps by then the job is not workable anymore. This would be inefficient at best. To solve this, ``bundleBurst`` comes to the rescue. ``bundleBurst`` allows us to send the same bundled transactions for different consequent blocks. 

In other words, we can start working at block `100`, aim to send our bundle at block `105` thanks to `futureBlocks`, but we can also have the CLI send that very same bundle we sent at block `105` at blocks `106, 107 and 108`, saving us a lot of computation. How many blocks ahead we sent the bundled transactions is determined by `bundleBurst`. If we have a `bundleBurst` of 5, then it would send the same bundle for blocks `105, 106 107, 108, and 109`.

A question arises at this point, what happens after block `109`? Will the CLI repeat the process and aim at block `114`? If that's the case, then we missed all the blocks in-between blocks `109` and `114`. Forunately, the CLI is smart enough to initiate this whole process again at our first target block, meaning we won't miss any blocks.

For example:

- We start working at block `100` with `futureBlocks` set to `5` and `bundleBurst` to `3`. Our first target block will be block `105`, and we will send bundles for blocks `105, 106 and 107`
- When block `105` arrives, this whole process is initiated again automatically. This time, however, the CLI will use the `bundleBurst` to calculate which will be our next target block. So, our target block becomes block `108 (105 + bundleBurst(3))`, and we will send bundles for blocks `108, 109, and 110`.
- The same thing will happen in the next iteration. Our target block will be block `111` and we will send bundles for blocks `111, 112, 113`. This way we send bundles for every workable block without running a crazy amount of simulations.

### timeToAdvance

`timeToAdvance` is more straight-forward. Many jobs use a time-dependent cooldown to define when they will be workable or not. This means that if we can advance to a certain timestamp before the block with that timestamp actually arrives, we can see many blocks ahead whether, at that timestamp, the job will be workable or not. 

For example, if a job becomes workable at block `100`, and we assume each block is validated every 15 seconds, we could check whether that job would be workable at block `90` if we define a `timeToAdvance` of `150 seconds (10 blocks * 15 seconds)`. Which would increase our chances of working that job at the same block it becomes workable.

### priorityFee

`priorityFee` is also straight-forward. This is the tip we pay the flashbot miner, and will define whether our bundle is included or not in case another keeper also sends a bundle trying to work the same job as us. Whoever pays a higher `priorityFee` will get his bundle included and successfully work the job.

Upon hearing this, we may be tempted to give the miner a large `priorityFee`, but this can end up with the transaction being unprofitable for us.
