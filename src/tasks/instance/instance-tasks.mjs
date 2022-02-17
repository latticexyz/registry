#!/usr/bin/env zx


const deploymentFile = fs.readFileSync('deployment.json', {encoding: 'utf8', flag: 'r'})
const { registry: REGISTRY_ADDRESS } = JSON.parse(deploymentFile)

const PRIVATE_KEY = await question('Private key: ')
const SUBTASK = await question('Choose subtask: ', {
  choices: ['ADD_INSTANCE', 'ADD_INSTANCE_TO_CHANNEL', 'REMOVE_INSTANCE_FROM_CHANNEL', 'UPDATE_INSTANCE_URI']
})
if(SUBTASK === 'ADD_INSTANCE') {
  const contractAddress = await question('Contract address: ')
  const chainId = await question('Chain id: ')
  const deploymentURI = await question('Deployment URI: ')
  await $`yarn ts-node src/tasks/instance/add.ts ${REGISTRY_ADDRESS} ${contractAddress} ${chainId} ${deploymentURI} ${PRIVATE_KEY}`
  console.log(chalk.bold.green("Done!"))
} else if(SUBTASK === "ADD_INSTANCE_TO_CHANNEL") {
  const instanceId = await question('Instance ID: ')
  const channelId = await question('Channel ID: ')
  await $`bash src/tasks/instance/add-to-channel.sh ${REGISTRY_ADDRESS} ${instanceId} ${channelId} ${PRIVATE_KEY}`
  console.log(chalk.bold.green("Done!"))
} else if(SUBTASK === 'REMOVE_INSTANCE_FROM_CHANNEL') {
  const instanceId = await question('Instance ID: ')
  const channelId = await question('Channel ID: ')
  await $`bash src/tasks/instance/remove-from-channel.sh ${REGISTRY_ADDRESS} ${instanceId} ${channelId} ${PRIVATE_KEY}`
  console.log(chalk.bold.green("Done!"))
} else if(SUBTASK === "UPDATE_INSTANCE_URI") {
  const instanceId = await question('Instance ID: ')
  const instanceURI = await question('Instance URI: ')
  await $`yarn ts-node src/tasks/instance/update-uri.ts ${REGISTRY_ADDRESS} ${instanceId} ${instanceURI} ${PRIVATE_KEY}`
  console.log(chalk.bold.green("Done!"))
}