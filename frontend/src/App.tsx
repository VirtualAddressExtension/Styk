import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, HardDrive, Plus, X, Trash2, Server, Shield, Loader2 } from 'lucide-react';
import logo from './assets/images/logo-universal.png';
import { ProviderType, openBrowserAuth, mountDriveLogic, unmountDriveLogic } from './logic.js';
import './App.css';

interface CloudProvider {
  id: ProviderType;
  name: string;
  icon: React.ReactNode;
  iconClass: string;
  authType: 'oauth' | 'form';
  requires: string[];
}

interface MountedDrive {
  id: string;
  name: string;
  provider: ProviderType;
  totalSpace: number;
  usedSpace: number;
  letter: string;
}

const PROVIDERS: CloudProvider[] = [
  { id: 'Yandex', name: 'Яндекс.Диск', icon: <Cloud />, iconClass: 'icon-yandex', authType: 'oauth', requires: [] },
  { id: 'Nextcloud', name: 'Nextcloud', icon: <Server />, iconClass: 'icon-nextcloud', authType: 'form', requires: ['URL сервера', 'Логин', 'Пароль'] },
  { id: 'Google', name: 'Google Drive', icon: <HardDrive />, iconClass: 'icon-google', authType: 'oauth', requires: [] },
  { id: 'WebDAV', name: 'WebDAV', icon: <Shield />, iconClass: 'icon-webdav', authType: 'form', requires: ['URL', 'Логин', 'Пароль'] },
];

export default function App() {
  const [drives, setDrives] = useState<MountedDrive[]>([
    { id: '1', name: 'Мой Яндекс', provider: 'Yandex', totalSpace: 100, usedSpace: 45, letter: 'Y:' }
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (step === 2 && selectedProvider?.authType === 'oauth') {
      openBrowserAuth(selectedProvider.id).then((success) => {
        if (isMounted && success) {
          handleMountSuccess(selectedProvider);
        }
      });
    }

    return () => { isMounted = false; };
  }, [step, selectedProvider]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    const success = await mountDriveLogic(selectedProvider.id, { info: "data_from_inputs" });
    if (success) {
      handleMountSuccess(selectedProvider);
    }
  };

  const handleMountSuccess = (provider: CloudProvider) => {
    const newDrive: MountedDrive = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Новый ${provider.name}`,
      provider: provider.id,
      totalSpace: Math.floor(Math.random() * 500) + 50,
      usedSpace: Math.floor(Math.random() * 50),
      letter: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}:`
    };

    setDrives(prev => [...prev, newDrive]);
    closeModal();
  };

  const handleUnmount = async (id: string) => {
    const success = await unmountDriveLogic(id);
    if (success) {
      setDrives(drives.filter(d => d.id !== id));
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setStep(1);
      setSelectedProvider(null);
    }, 300);
  };

  return (
    <div className="app-wrapper">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="app-container"
      >
        <header className="header">
          <motion.img 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            src={logo} 
            alt="logo" 
            className="logo-img hover-neon hover-shadow"
          />
          <h1 className="animated-gradient-text">
            CloudMounter
          </h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary hover-neon hover-shadow"
          >
            <Plus size={20} />
            Добавить диск
          </motion.button>
        </header>

        <main style={{ width: '100%' }}>
          <div className={`drives-zone hover-neon ${drives.length === 0 ? 'empty' : ''}`}>
            {drives.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="empty-state"
              >
                <Cloud size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>Нет подключенных дисков</p>
              </motion.div>
            ) : (
              <motion.div layout className="drives-grid">
                <AnimatePresence>
                  {drives.map((drive) => (
                    <DriveCard key={drive.id} drive={drive} onUnmount={handleUnmount} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </main>
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="modal-backdrop"
              style={{ position: 'absolute', inset: 0 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="modal-content hover-neon"
            >
              <button onClick={closeModal} className="modal-close-btn hover-neon-red">
                <X size={20} />
              </button>

              <div className="modal-header">
                <h2>{step === 1 ? 'Выберите сервис' : `Подключение ${selectedProvider?.name}`}</h2>
                <p>{step === 1 ? 'Какой тип диска вы хотите смонтировать?' : 'Авторизация'}</p>
              </div>

              {step === 1 ? (
                <div className="provider-grid">
                  {PROVIDERS.map((provider) => (
                    <motion.button
                      key={provider.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedProvider(provider);
                        setStep(2);
                      }}
                      className="provider-btn hover-neon hover-shadow"
                    >
                      <div className={`card-icon ${provider.iconClass}`}>
                        {provider.icon}
                      </div>
                      <span style={{ fontWeight: 600 }}>{provider.name}</span>
                    </motion.button>
                  ))}
                </div>
              ) : selectedProvider?.authType === 'oauth' ? (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="oauth-loading-container"
                >
                  <Loader2 size={56} className="icon-spin icon-yandex" style={{ marginBottom: '1.5rem' }} />
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>Ожидание авторизации...</h3>
                  <p className="form-label" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    Подождите, сейчас откроется браузер для подключения {selectedProvider.name}
                  </p>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setStep(1)}
                    className="btn btn-secondary hover-neon hover-shadow"
                    style={{ width: '100%' }}
                  >
                    Отмена
                  </motion.button>
                </motion.div>
              ) : (
                <form onSubmit={handleFormSubmit}>
                  {selectedProvider?.requires.map((req, idx) => (
                    <div key={idx} className="form-group">
                      <label className="form-label">{req}</label>
                      <div className="input-wrapper hover-neon" style={{ borderRadius: '4px' }}>
                        <input
                          type={req.toLowerCase().includes('пароль') ? 'password' : 'text'}
                          required
                          className="form-input"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="form-actions">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setStep(1)}
                      className="btn btn-secondary hover-neon hover-shadow"
                    >
                      Назад
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.9 }}
                      className="btn btn-submit hover-neon hover-shadow"
                    >
                      Смонтировать
                    </motion.button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DriveCard({ drive, onUnmount }: { drive: MountedDrive, onUnmount: (id: string) => void }) {
  const providerConfig = PROVIDERS.find(p => p.id === drive.provider);
  const percentage = Math.round((drive.usedSpace / drive.totalSpace) * 100);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="drive-card hover-neon hover-shadow"
    >
      <div className="card-header">
        <div className="card-title-group">
          <div className={`card-icon ${providerConfig?.iconClass}`}>
            {providerConfig?.icon}
          </div>
          <div>
            <h3 className="card-title">{drive.name}</h3>
            <p className="card-subtitle">Диск {drive.letter}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="progress-info">
          <span>{drive.usedSpace} ГБ занято</span>
          <span>{drive.totalSpace} ГБ</span>
        </div>
        <div className="progress-bar-bg">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1 }}
            className="progress-bar-fill"
          />
        </div>
      </div>

      <motion.button 
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onUnmount(drive.id)}
        className="btn btn-danger hover-neon-red hover-shadow"
      >
        <Trash2 size={18} />
        Отключить
      </motion.button>
    </motion.div>
  );
}