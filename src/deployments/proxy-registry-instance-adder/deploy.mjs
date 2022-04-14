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

let deployments = {};
let EXISTING_DEPLOYMENT = JSON.parse(fs.readFileSync('deployment.json', { encoding: 'utf8', flag: 'r' }));

for (const chainId of CHAIN_IDS) {
    if (!Object.keys(CHAIN_ID_TO_RPC).includes(chainId.toString())) {
        throw new Error("Can't deploy on chainId: " + chainId)
    }
    const RPC = CHAIN_ID_TO_RPC[chainId];

    // Deploy the proxy contract.
    process.env.PKEY = PRIVATE_KEY;
    process.env.RPC_URL = RPC;

    const { stdout: contractDeployOutput } = await $`bash src/deployments/proxy-registry-instance-adder/deploy-contract.sh`;

    // Set the Registry address on the proxy contract.
    const PROXY_CONTRACT_ADDRESS = parseForgeCreateDeploy(contractDeployOutput);

    // Read the Registry address from the deployments file.
    const REGISTRY_ADDRESS = EXISTING_DEPLOYMENT['registry'][chainId];
    console.log(chalk.yellow(`Registry is deployed at address ${REGISTRY_ADDRESS} on chainId=${chainId}`));

    await $`bash src/deployments/proxy-registry-instance-adder/set-registry.sh ${PROXY_CONTRACT_ADDRESS} ${REGISTRY_ADDRESS}`;

    // Set the trusted forwarder for GSN.
    const TRUSTED_FORWARDER_ADDRESS = CHAIN_ID_TO_TRUSTED_FORWARDER[chainId];
    await $`bash src/deployments/proxy-registry-instance-adder/set-trusted-forwarder.sh ${PROXY_CONTRACT_ADDRESS} ${TRUSTED_FORWARDER_ADDRESS}`;

    deployments[chainId] = PROXY_CONTRACT_ADDRESS;
}

console.log(chalk.green(`Done deploying and setting up ProxyRegistryInstanceAdder`));

EXISTING_DEPLOYMENT['proxy'] = deployments;
fs.writeFileSync('deployment.json', JSON.stringify(EXISTING_DEPLOYMENT));
