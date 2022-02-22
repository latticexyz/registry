import { ethers} from "ethers"
import { argv } from "process";
import { createInterface } from "readline";
const [registryAddress] = argv.slice(2) 


export async function question(query : string, options? : {choices: string[]}) {
  let completer = undefined
  if (Array.isArray(options?.choices)) {
    completer = function completer(line : string) {
      const completions = options!.choices
      const hits = completions.filter((c) => c.startsWith(line))
      return [hits.length ? hits : completions, line]
    }
  }
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    completer,
  })
  const question = (q : string) => new Promise<string>((resolve) => rl.question(q ?? '', resolve))
  let answer = await question(query)
  rl.close()
  return answer
}

const ABI = `
[
    {
      "type": "function",
      "name": "createInstance",
      "inputs": [
        {
          "internalType": "address",
          "name": "contractAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "chainId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "instanceURI",
          "type": "string"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    }
]
`
const main = async () => {
  const wallet = new ethers.Wallet(process.env.PKEY!)
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL)
  const signer = wallet.connect(provider)
  const registryInterface = new ethers.utils.Interface(ABI)
  const contract = new ethers.Contract(registryAddress, registryInterface, signer)
  const contractAddress = await question("Contract address?: ")
  const chainId = await question("Chain ID?: ")
  const instanceURI = await question("InstanceURI?: ")
  const tx = await contract.createInstance(contractAddress, chainId, instanceURI)
  console.log(tx)
  const receipt = await tx.wait();
  console.log(receipt)
}
main()