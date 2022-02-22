#!/usr/bin/env zx


const deploymentFile = fs.readFileSync('deployment.json', {encoding: 'utf8', flag: 'r'})
const { registry } = JSON.parse(deploymentFile)

const CHAIN_ID_TO_RPC = {
  100: process.env.RPC_GNOSIS_CHAIN,
  42: process.env.RPC_KOVAN
}

const PRIVATE_KEY = process.env.PRIVATE_KEY

const chainId = parseInt(argv["_"][1])

if(!Object.keys(CHAIN_ID_TO_RPC).includes(chainId.toString())) {
  throw new Error("Can't use the registry on chainId: " + chainId)
}

const RPC = CHAIN_ID_TO_RPC[chainId];

console.log("Using RPC: " + RPC)

const REGISTRY_ADDRESS = registry[chainId] 

if(!REGISTRY_ADDRESS) {
  throw new Error("No address for deployment on chain id: " + chainId)
}

process.env.PKEY = PRIVATE_KEY
process.env.RPC_URL = RPC

const SUBTASK = await question('Choose subtask: ', {
  choices: ['ADD_INSTANCE', 'ADD_INSTANCE_TO_CHANNEL', 'REMOVE_INSTANCE_FROM_CHANNEL', 'UPDATE_INSTANCE_URI']
})
if(SUBTASK === 'ADD_INSTANCE') {
  await $`yarn ts-node src/tasks/instance/add.ts ${REGISTRY_ADDRESS}`
  console.log(chalk.bold.green("Done!"))
} else if(SUBTASK === "ADD_INSTANCE_TO_CHANNEL") {
  const instanceId = await question('Instance ID: ')
  const channelId = await question('Channel ID: ')
  await $`bash src/tasks/instance/add-to-channel.sh ${REGISTRY_ADDRESS} ${channelId} ${instanceId}`
  console.log(chalk.bold.green("Done!"))
} else if(SUBTASK === 'REMOVE_INSTANCE_FROM_CHANNEL') {
  const instanceId = await question('Instance ID: ')
  const channelId = await question('Channel ID: ')
  await $`bash src/tasks/instance/remove-from-channel.sh ${REGISTRY_ADDRESS} ${channelId} ${instanceId}`
  console.log(chalk.bold.green("Done!"))
} else if(SUBTASK === "UPDATE_INSTANCE_URI") {
  const instanceId = await question('Instance ID: ')
  const instanceURI = await question('Instance URI: ')
  await $`yarn ts-node src/tasks/instance/update-uri.ts ${REGISTRY_ADDRESS} ${instanceId} ${instanceURI}`
  console.log(chalk.bold.green("Done!"))
}