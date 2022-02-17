import { ethers} from "ethers"
import { argv } from "process";
const [registryAddress, instanceId, instanceURI, privateKey] = argv.slice(2) 
const ABI = `
[
    {
      "type": "function",
      "name": "updateInstanceURI",
      "inputs": [
        {
          "internalType": "uint256",
          "name": "instanceId",
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
  const tx = await contract.updateInstanceURI(instanceId, instanceURI)
  console.log(tx)
  const receipt = await tx.wait();
  console.log(receipt)
}
main()