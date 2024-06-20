import { parseEther } from 'ethers';
import {
  Airdrop,
  EntityForging,
  EntropyGenerator,
  TraitForgeNft,
} from '../typechain-types';

const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('EntityForging', () => {
  let entityForging: EntityForging;
  let nft;
  let owner;
  let user1;
  let user2;

  const FORGING_FEE = ethers.parseEther('1.0'); // 1 ETH

  before(async () => {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy TraitForgeNft contract
    const TraitForgeNft = await ethers.getContractFactory('TraitForgeNft');
    nft = (await TraitForgeNft.deploy()) as TraitForgeNft;

    // Deploy Airdrop contract
    const airdropFactory = await ethers.getContractFactory('Airdrop');
    const airdrop = (await airdropFactory.deploy()) as Airdrop;

    await nft.setAirdropContract(await airdrop.getAddress());

    await airdrop.transferOwnership(await nft.getAddress());

    // Deploy EntityForging contract
    const EntropyGenerator = await ethers.getContractFactory(
      'EntropyGenerator'
    );
    const entropyGenerator = (await EntropyGenerator.deploy(
      await nft.getAddress()
    )) as EntropyGenerator;

    await entropyGenerator.writeEntropyBatch1();

    await nft.setEntropyGenerator(await entropyGenerator.getAddress());

    // Deploy EntityForging contract
    const EntityForging = await ethers.getContractFactory('EntityForging');
    entityForging = (await EntityForging.deploy(
      await nft.getAddress()
    )) as EntityForging;
    await nft.setEntityForgingContract(await entityForging.getAddress());

    await nft.setNukeFundContract(user2.address);

    // Mint some tokens for testing
    await nft.connect(owner).mintToken({ value: ethers.parseEther('1') });
    await nft.connect(user1).mintToken({ value: ethers.parseEther('1') });
    // await nft.connect(user2).mintToken({ value: ethers.parseEther('1') });
    await nft.connect(user1).mintToken({ value: ethers.parseEther('1') });
  });

  describe('listForForging', () => {
    it('should not allow non-owners to list a token for forging', async () => {
      const tokenId = 0;
      const fee = FORGING_FEE;

      await expect(
        entityForging.connect(user1).listForForging(tokenId, fee)
      ).to.be.revertedWith('Caller must own the token');
    });

    it('should allow the owner to list a token for forging', async () => {
      const tokenId = 0;
      const fee = FORGING_FEE;

      await entityForging.connect(owner).listForForging(tokenId, fee);

      const listing = await entityForging.listings(tokenId);
      expect(listing.isListed).to.be.true;
      expect(listing.fee).to.equal(fee);
    });
  });

  describe('breedWithListed', () => {
    it('should not allow forging with an unlisted forger token', async () => {
      const forgerTokenId = 2;
      const mergerTokenId = 1;

      await expect(
        entityForging
          .connect(user1)
          .forgeWithListed(forgerTokenId, mergerTokenId, {
            value: FORGING_FEE,
          })
      ).to.be.revertedWith("Forger's entity not listed for forging");

      // Additional assertions as needed
    });

    it('should allow forging with a listed token', async () => {
      const forgerTokenId = 0;
      const mergerTokenId = 1;

      const initialBalance = await ethers.provider.getBalance(user1.address);
      const tx = await entityForging
        .connect(user1)
        .forgeWithListed(forgerTokenId, mergerTokenId, {
          value: FORGING_FEE,
        });
      const finalBalance = await ethers.provider.getBalance(user1.address);

      // Check event emissions
      expect(tx)
        .to.emit(entityForging, 'FeePaid')
        .withArgs(forgerTokenId, mergerTokenId, FORGING_FEE);

      // Check balances
      expect(finalBalance).to.be.closeTo(
        initialBalance - FORGING_FEE,
        ethers.parseUnits('0.1')
      );
    });
  });
});
