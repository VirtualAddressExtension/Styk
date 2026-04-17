import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, HardDrive, Plus, X, Trash2, Server, Shield } from 'lucide-react';
import logo from './assets/images/logo-universal.png';
import './App.css';

type ProviderType = 'Yandex' | 'Nextcloud' | 'Google' | 'WebDAV';

interface CloudProvider {
  id: ProviderType;
  name: string;
  icon: React.ReactNode;
  iconClass: string;
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
  { id: 'Yandex', name: 'Яндекс.Диск', icon: <Cloud />, iconClass: 'icon-yandex', requires: ['OAuth Токен'] },
  { id: 'Nextcloud', name: 'Nextcloud', icon: <Server />, iconClass: 'icon-nextcloud', requires: ['URL сервера', 'Логин', 'Пароль / Токен'] },
  { id: 'Google', name: 'Google Drive', icon: <HardDrive />, iconClass: 'icon-google', requires: ['OAuth Токен'] },
  { id: 'WebDAV', name: 'WebDAV', icon: <Shield />, iconClass: 'icon-webdav', requires: ['URL', 'Логин', 'Пароль'] },
];

export default function App() {
  const [drives, setDrives] = useState<MountedDrive[]>([
    { id: '1', name: 'Мой Яндекс', provider: 'Yandex', totalSpace: 100, usedSpace: 45, letter: 'Y:' }
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);

  const handleMount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    const newDrive: MountedDrive = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Новый ${selectedProvider.name}`,
      provider: selectedProvider.id,
      totalSpace: Math.floor(Math.random() * 500) + 50,
      usedSpace: Math.floor(Math.random() * 50),
      letter: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}:`
    };

    setDrives([...drives, newDrive]);
    closeModal();
  };

  const handleUnmount = (id: string) => {
    setDrives(drives.filter(d => d.id !== id));
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
            transition={{ delay: 0.2 }}
            src={logo} 
            alt="logo" 
            className="logo-img"
          />
          <h1 className="animated-gradient-text">
            CloudMounter
          </h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={20} />
            Добавить диск
          </motion.button>
        </header>

        <main style={{ width: '100%' }}>
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
              className="modal-content"
            >
              <button onClick={closeModal} className="modal-close-btn">
                <X size={24} />
              </button>

              <div className="modal-header">
                <h2>{step === 1 ? 'Выберите сервис' : `Подключение ${selectedProvider?.name}`}</h2>
                <p>{step === 1 ? 'Какой тип диска вы хотите смонтировать?' : 'Введите данные для доступа'}</p>
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
                      className="provider-btn"
                    >
                      <div className={`card-icon ${provider.iconClass}`}>
                        {provider.icon}
                      </div>
                      <span style={{ fontWeight: 600 }}>{provider.name}</span>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleMount}>
                  {selectedProvider?.requires.map((req, idx) => (
                    <div key={idx} className="form-group">
                      <label className="form-label">{req}</label>
                      <input
                        type={req.toLowerCase().includes('пароль') || req.toLowerCase().includes('токен') ? 'password' : 'text'}
                        required
                        className="form-input"
                      />
                    </div>
                  ))}
                  <div className="form-actions">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setStep(1)}
                      className="btn btn-secondary"
                    >
                      Назад
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.9 }}
                      className="btn btn-submit"
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
      className="drive-card"
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
        className="btn btn-danger"
      >
        <Trash2 size={18} />
        Отключить
      </motion.button>
    </motion.div>
  );
}