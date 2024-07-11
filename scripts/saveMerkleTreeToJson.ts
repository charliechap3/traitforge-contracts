const fs = require('fs');
import generateMerkleTree from './genMerkleTreeLib';

async function main() {
  const address: string[] = [];

  const data = generateMerkleTree(address);

  let whitelistedUsers = {
    whiteList: data,
  };

  const metadata = JSON.stringify(whitelistedUsers, null, 2);

  fs.writeFile(`WL.json`, metadata, (err: any) => {
    if (err) {
      throw err;
    }
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
