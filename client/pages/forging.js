import React, { useState, useEffect, useRef } from 'react';
import { useContextState } from '@/utils/context';
import { contractsConfig } from '@/utils/contractsConfig'; 
import { useWeb3ModalProvider } from '@web3modal/ethers/react';
import styles from '@/styles/forging.module.scss';
import { LoadingSpinner, EntityCard, Modal } from '@/components';

const Forging = () => {
  const {
    isOpen,
    openModal,
    getEntitiesForForging,
    ownerEntities,
    entitiesForForging 
  } = useContextState();

  const [modalContent, setModalContent] = useState(null);
  const entityList = useRef(null);
  const [sortOption, setSortOption] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processingText, setProcessingText] = useState('');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const { walletProvider } = useWeb3ModalProvider()

  useEffect(() => {
      getEntitiesForForging();
  }, [ getEntitiesForForging ]);

  const openModalWithContent = (content) => {
    setModalContent(content);
    openModal(true); 
  };
 
  const forgeEntity = async () => {
    if (!walletProvider ) return;
    setProcessing(true);
    setProcessingText('Forging');
    try {
      const ethersProvider = new ethers.providers.Web3Provider(walletProvider);
      const signer = await ethersProvider.getSigner();
      const forgeContract = new ethers.Contract(
        contractsConfig.forgeContractAddress,
        contractsConfig.forgeContractAbi,
        signer
      );
      const transaction = await forgeContract.forgeEntity();
      await transaction.wait();

      setTimeout(() => {
        setProcessingText('Merging');
        setTimeout(() => {
          setProcessing(false);
          console.log('Process completed');
        }, 10000);
      }, 10000);
      console.log('Forged successfully');
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    }
  };

  const EntityList = ({ entities, onEntitySelect }) => (
    <div className="breeder-items-list">
      {entities.map((entity, index) => (
        <EntityCard key={entity.id} entity={entity} index={index} onClick={() => onEntitySelect(entity)} />
      ))}
    </div>
  );

  const modalContent1 = (
    <div className={styles.entityDisplay}>
      <h1>LIST YOUR ENTITY</h1>
      <ul>
        {Array.isArray(ownerEntities) && ownerEntities.length > 0 ? (
          ownerEntities.map((entity, index) => (
            <EntityCard className={styles.entitycard} key={index}>
              {entity.name} - {entity.description}
            </EntityCard>
          ))
        ) : (
          <li>You don't own an Entity!</li>
        )}
      </ul>
    </div>
  );

  const modalContent2 = (
    <div className={styles.entityDisplay}>
      <h1>Select entity</h1>
      <ul>
        {Array.isArray(ownerEntities) && ownerEntities.length > 0 ? (
          ownerEntities.map((entity, index) => (
            <EntityCard className={styles.entitycard} key={index}>
              {entity.name} - {entity.description}
            </EntityCard>
          ))
        ) : (
          <li>You don't own an Entity!</li>
        )}
      </ul>
    </div>
  );

  const ProcessingModal = ({ processing, text }) => {
    if (!processing) return null;
    return (
      <div className="processing-modal">
        <div className="modal-content">
          <LoadingSpinner />
          <p>{text}</p>
        </div>
      </div>
    );
  };

  const getSortedEntities = () => {
    if (!sortOption) return entitiesForForging;
    return entitiesForForging.sort((a, b) => {
      if (sortOption === 'priceLowHigh') {
        return parseFloat(a.price) - parseFloat(b.price);
      } else if (sortOption === 'priceHighLow') {
        return parseFloat(b.price) - parseFloat(a.price);
      }
      return 0;
    });
  };

  const sortedEntities = getSortedEntities();

  const scrollToEntityList = () => {
    entityList.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const openEntityToForge = (entity) => {
    console.log('Opening entity for forging:', entity);
    setSelectedEntity(entity);
  };

  return (
    <div className={styles.forgingPage}>
      <div className={styles.forgeArenaContainer}>
        <h1>Forging Arena</h1>
        <div className={styles.selectedEntityPlaceholder}>
          <div className={styles.forgecardsrow}>
            <img
              src= "/images/PoolSelectCard.png"
              alt="forge place holder"
              className={styles.otherEntities}
              onClick={scrollToEntityList}
            />
            <img src= "/images/claimentity.png" 
            alt="claim box" 
            />
            <img
              src= "/images/WalletSelectCard.png"
              alt="forge place holder"
              className={styles.yourEntities}
              onClick={() => openModalWithContent(modalContent2)}
            />
            {isOpen && (
             <Modal background = '/images/forge-background.jpg'>
          {modalContent2}
            </Modal>
            )}
          </div>
          {selectedEntity && (
            <div className={styles.selectedEntity}>
              <img
                src={selectedEntity.image}
                alt={`Entity ${selectedEntity.title}`}
              />
              <div>
                <h5>{selectedEntity.title}</h5>
                <p>Price: {selectedEntity.price} ETH</p>
                <p>Gender: {selectedEntity.gender}</p>
              </div>
            </div>
          )}
        </div>
        <img
          src= "/images/forgebutton.png"
          alt="forge"
          className={styles.forgeButton}
          onClick={() => forgeEntity()}
        />
      </div>

      <div className={styles.entityListContainer} ref={entityList}>
        <div className={styles.breedSortingOptions}>
          <div className={styles.leftItems}>
            <button
              className={styles.breedEntityButton}
              onClick={() => openModalWithContent(modalContent1)}
            >
              List Your Forger
            </button>
            {isOpen && (
             <Modal background = '/images/forge-background.jpg'>
          {modalContent}
            </Modal >
            )}
          </div>
          <div className={styles.rightItems}>
            <select
              className={styles.forgeSortingDropdown}
              onChange={e => setSortOption(e.target.value)}
            >
              <option value="">Select Sorting Option</option>
              <option value="priceLowHigh">Price: Low to High</option>
              <option value="priceHighLow">Price: High to Low</option>
            </select>
          </div>
        </div>
        <EntityList
          entities={sortedEntities}
          openSelectEntity={openEntityToForge}
        />
      </div>

      {selectedEntity && (
        <div className={styles.detailedCard}>
          <img
            src={selectedEntity.image}
            alt={`Entity ${selectedEntity.title}`}
          />
          <h5>{selectedEntity.title}</h5>
          <p>Price: {selectedEntity.price} ETH</p>
          <p>{selectedEntity.gender}</p>
          <p>Nuke Factor: {selectedEntity.nukefactor}</p>
          <button
            className={styles.forgeButton}
            onClick={() => forgeNewEntity(selectedEntity)}
          >
            Forge
          </button>
          <button
            className={styles.closeButton}
            onClick={() => setSelectedEntity(null)}
          >
            Close
          </button>
          <ProcessingModal processing={processing} text={processingText} />
        </div>
      )}
    </div>
  );
};

export default Forging;
