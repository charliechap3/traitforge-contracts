import { parseEther } from 'ethers';
import {
  Airdrop,
  EntityForging,
  EntropyGenerator,
  TraitForgeNft,
} from '../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('EntityForging', () => {
  let entityForging: EntityForging;
  let nft: TraitForgeNft;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

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

      const listedTokenId = await entityForging.listedTokenIds(tokenId);
      const listing = await entityForging.listings(listedTokenId);
      expect(listing.isListed).to.be.true;
      expect(listing.fee).to.equal(fee);
    });
  });

  describe('Forge With Listed', () => {
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

      const initialBalance = await ethers.provider.getBalance(owner.address);

      const forgerEntropy = await nft.getTokenEntropy(forgerTokenId);
      const mergerEntrypy = await nft.getTokenEntropy(mergerTokenId);
      await expect(
        entityForging
          .connect(user1)
          .forgeWithListed(forgerTokenId, mergerTokenId, {
            value: FORGING_FEE,
          })
      )
        .to.emit(entityForging, 'EntityForged')
        .withArgs(
          3,
          forgerTokenId,
          mergerTokenId,
          (forgerEntropy + mergerEntrypy) / 2n,
          FORGING_FEE
        )
        .to.emit(nft, 'NewEntityMinted')
        .withArgs(
          await user1.getAddress(),
          3,
          2,
          (forgerEntropy + mergerEntrypy) / 2n
        );

      const finalBalance = await ethers.provider.getBalance(owner.address);

      expect(finalBalance - initialBalance).to.be.eq((FORGING_FEE * 9n) / 10n);
      // Check forger nft delisted

      const listingInfo = await entityForging.listings(forgerTokenId);

      expect(listingInfo.isListed).to.be.eq(false);
    });
  });
});
