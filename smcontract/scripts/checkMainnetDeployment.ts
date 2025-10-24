import { ethers } from "hardhat";

async function main() {
  const addresses = {
    TicketNft: "0x5476A8C9d2420FeDd7933b2035F5b3b446135441",
    EventTicketing: "0x105003a5f52eA5D7d3a0872A467971bC31675376",
    TicketResaleMarket: "0xF92BbC14d485e38e651Fb3F220366159e0569ff2"
  };

  console.log("Checking deployments on Base Mainnet...\n");

  for (const [name, address] of Object.entries(addresses)) {
    const code = await ethers.provider.getCode(address);
    const isDeployed = code !== "0x";
    console.log(`${name}: ${address}`);
    console.log(`  Status: ${isDeployed ? "✅ Deployed" : "❌ Not deployed"}`);
    console.log(`  View: https://basescan.org/address/${address}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
