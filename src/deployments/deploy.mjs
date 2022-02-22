#!/usr/bin/env zx
function escapeShell(cmd) {
  return '"'+cmd.replace(/(["'$`\\])/g,'\\$1')+'"';
};

function parseForgeCreateDeploy(output) {
  const lines = output.split('\n');
  const address = lines[lines.length - 3].split(':').slice(1)[0].trim();
  return address
}
const CHAIN_IDS = [100, 42]

const CHAIN_ID_TO_RPC = {
  100: process.env.RPC_GNOSIS_CHAIN,
  42: process.env.RPC_KOVAN
}

const PRIVATE_KEY = process.env.PRIVATE_KEY

let deployments = {}

for(const chainId of CHAIN_IDS) {
  if(!Object.keys(CHAIN_ID_TO_RPC).includes(chainId.toString())) {
    throw new Error("Can't deploy on chainId: " + chainId)
  }

  const RPC = CHAIN_ID_TO_RPC[chainId];

  console.log("Using RPC: " + RPC)

  const NAME = "Channel"
  const SYMBOL = "LTX-CHANNEL"
  process.env.PKEY = PRIVATE_KEY
  process.env.RPC_URL = RPC

  const {stdout: tokenURIGeneratorOutput} = await $`bash src/deployments/deploy-simple-channel-token-uri-generator.sh`
  const TOKEN_URI_GENERATOR_ADDRESS = parseForgeCreateDeploy(tokenURIGeneratorOutput)
  const {stdout: output} = await $`bash src/deployments/deploy.sh ${NAME} ${SYMBOL} ${TOKEN_URI_GENERATOR_ADDRESS}`
  const address = parseForgeCreateDeploy(output)

  console.log(chalk.green(`Registry contract deployed at: ${address} on chain: ${chainId}`))
  deployments[chainId] = address
}

const DEPLOYMENT = {
  registry: deployments,
}

fs.writeFileSync('deployment.json', JSON.stringify(DEPLOYMENT))
let README = fs.readFileSync('README.template.md',
{encoding:'utf8', flag:'r'});
for(const chainId of CHAIN_IDS) {
  README = README.replace(`{{{${chainId}:address}}}`, deployments[chainId])
}
fs.writeFileSync('README.md', README)
