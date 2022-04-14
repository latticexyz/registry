#!/usr/bin/env zx

function parseForgeCreateDeploy(output) {
    const lines = output.split('\n');
    const address = lines[lines.length - 3].split(':').slice(1)[0].trim();
    return address
}

const CHAIN_IDS = [100, 42];

const CHAIN_ID_TO_RPC = {
    100: process.env.RPC_GNOSIS_CHAIN,
    42: process.env.RPC_KOVAN
};

const CHAIN_ID_TO_TRUSTED_FORWARDER = {
    100: "0x7eEae829DF28F9Ce522274D5771A6Be91d00E5ED",
    42: "0x7eEae829DF28F9Ce522274D5771A6Be91d00E5ED",
};

const PRIVATE_KEY = process.env.PRIVATE_KEY;

// TODO: add support for GC via a simple loop.
const chainId = 42;
const RPC = CHAIN_ID_TO_RPC[chainId];

// Deploy the proxy contract.
process.env.PKEY = PRIVATE_KEY;
process.env.RPC_URL = RPC;

const { stdout: contractDeployOutput } = await $`bash src/deployments/proxy-registry-instance-adder/deploy-contract.sh`;

// Set the Registry address on the proxy contract.
const PROXY_CONTRACT_ADDRESS = parseForgeCreateDeploy(contractDeployOutput);
const REGISTRY_ADDRESS = await question(`Where is Registry deployed on chain: ${chainId}?`);

const { stdout: setRegistryOutput } = await $`bash src/deployments/proxy-registry-instance-adder/set-registry.sh ${PROXY_CONTRACT_ADDRESS} ${REGISTRY_ADDRESS}`;

// Set the trusted forwarder for GSN.
const TRUSTED_FORWARDER_ADDRESS = CHAIN_ID_TO_TRUSTED_FORWARDER[chainId];
const { stdout: setTrustedForwarderOutpu } = await $`bash src/deployments/proxy-registry-instance-adder/set-trusted-forwarder.sh ${PROXY_CONTRACT_ADDRESS} ${TRUSTED_FORWARDER_ADDRESS}`;

console.log(chalk.green(`Done deploying and setting up ProxyRegistryInstanceAdder`));

let DEPLOYMENT = JSON.parse(fs.readFileSync('deployment.json', { encoding: 'utf8', flag: 'r' }));
DEPLOYMENT['proxy'] = {
    100: PROXY_CONTRACT_ADDRESS
};
fs.writeFileSync('deployment.json', JSON.stringify(DEPLOYMENT));
