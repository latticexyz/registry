import { ethers} from "ethers"
import { argv } from "process";
const [registryAddress, contractAddress, chainId, instanceURI, privateKey] = argv.slice(2) 
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
  const wallet = new ethers.Wallet(privateKey)
  const provider = new ethers.providers.JsonRpcProvider("https://rpc.xdaichain.com")
  const signer = wallet.connect(provider)
  const registryInterface = new ethers.utils.Interface(ABI)
  const contract = new ethers.Contract(registryAddress, registryInterface, signer)
  const tx = await contract.createInstance(contractAddress, chainId, instanceURI)
  console.log(tx)
  const receipt = await tx.wait();
  console.log(receipt)
}
main()