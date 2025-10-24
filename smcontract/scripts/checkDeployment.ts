import { ethers } from "hardhat";

async function main() {
  const addresses = {
    TicketNft: "0xc174678cc24B372a509A08dFA8d00f7AC678c459",
    EventTicketing: "0x12f537d03EfAD03924A2ce12cd6ABDe02693d3eF",
    TicketResaleMarket: "0x105003a5f52eA5D7d3a0872A467971bC31675376"
  };

  console.log("Checking deployments on Base Sepolia...\n");

  for (const [name, address] of Object.entries(addresses)) {
    const code = await ethers.provider.getCode(address);
    const isDeployed = code !== "0x";
    console.log(`${name}: ${address}`);
    console.log(`  Status: ${isDeployed ? "✅ Deployed" : "❌ Not deployed"}`);
    console.log(`  View: https://sepolia.basescan.org/address/${address}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
