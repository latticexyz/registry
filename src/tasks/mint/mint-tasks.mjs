#!/usr/bin/env zx


const deploymentFile = fs.readFileSync('deployment.json', {encoding: 'utf8', flag: 'r'})
const { registry: REGISTRY_ADDRESS } = JSON.parse(deploymentFile)

const PRIVATE_KEY = await question('Private key: ')
const SUBTASK = await question('Choose subtask: ', {
  choices: ['MINT', 'ADD_MINTER']
})
if(SUBTASK === 'MINT') {
  const address = await question('Address of receiver: ')
  const channelName = await question('Channel name: ')
  await $`bash src/tasks/mint/mint.sh ${REGISTRY_ADDRESS} ${address} ${channelName} ${PRIVATE_KEY}`
  console.log(chalk.bold.green("Done!"))
} else if(SUBTASK === 'ADD_MINTER') {
  const address = await question('Address of minter: ')
  await $`bash src/tasks/mint/add-minter.sh ${REGISTRY_ADDRESS} ${address} ${PRIVATE_KEY}`
  console.log(chalk.bold.green("Done!"))
}