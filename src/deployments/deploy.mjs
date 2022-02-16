#!/usr/bin/env zx

function parseForgeCreateDeploy(output) {
  const lines = output.split('\n');
  const address = lines[lines.length - 2].split(':').slice(1)[0].trim();
  return address
}

const PRIVATE_KEY = await question('Private key: ')

const {stdout: output} = await $`bash src/deployments/deploy.sh ${NAME} ${SYMBOL} ${L1_BRIDGE} ${PRIVATE_KEY}`
const address = parseForgeCreateDeploy(output)

console.log(chalk.green(`Registry contract deployed at: ${address}`))
const DEPLOYMENT = {
  registry: address,
}

fs.writeFileSync('deployment.json', JSON.stringify(DEPLOYMENT))
let README = fs.readFileSync('README.template.md',
{encoding:'utf8', flag:'r'});
README = README.replace('{{{address}}}', address)
fs.writeFileSync('README.md', README)
