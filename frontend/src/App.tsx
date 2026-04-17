import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, HardDrive, Plus, X, Trash2, Server, Shield, Loader2, Filter } from 'lucide-react';
import logo from './assets/images/logo-universal.png';
import { ProviderType, openBrowserAuth, mountDriveLogic, unmountDriveLogic } from './logic.js';
import './App.css';

interface CloudProvider {
  id: ProviderType;
  name: string;
  icon: React.ReactNode;
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
  { id: 'Yandex', name: 'Яндекс.Диск', icon: <Cloud size={16} />, authType: 'oauth', requires: [] },
  { id: 'Nextcloud', name: 'Nextcloud', icon: <Server size={16} />, authType: 'form', requires: ['URL сервера', 'Логин', 'Пароль'] },
  { id: 'Google', name: 'Google Drive', icon: <HardDrive size={16} />, authType: 'oauth', requires: [] },
  { id: 'WebDAV', name: 'WebDAV', icon: <Shield size={16} />, authType: 'form', requires: ['URL', 'Логин', 'Пароль'] },
];

export default function App() {
  const [drives, setDrives] = useState<MountedDrive[]>([
    { id: '1', name: 'Мой Яндекс', provider: 'Yandex', totalSpace: 100, usedSpace: 45, letter: 'Y:' }
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);

  const [filterProvider, setFilterProvider] = useState<string>('All');
  const [filterSize, setFilterSize] = useState<string>('All');

  useEffect(() => {
    let isMounted = true;
    if (step === 2 && selectedProvider?.authType === 'oauth') {
      openBrowserAuth(selectedProvider.id).then((success) => {
        if (isMounted && success) handleMountSuccess(selectedProvider);
      });
    }
    return () => { isMounted = false; };
  }, [step, selectedProvider]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;
    const success = await mountDriveLogic(selectedProvider.id, { info: "data" });
    if (success) handleMountSuccess(selectedProvider);
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
    if (success) setDrives(drives.filter(d => d.id !== id));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setStep(1);
    setSelectedProvider(null);
  };

  const handleAppClose = () => {
    // Безопасный вызов метода Wails д��я закрытия приложения
    if ((window as any).runtime && (window as any).runtime.Quit) {
      (window as any).runtime.Quit();
    } else {
      console.log('Закрытие окна (Wails runtime не найден)');
    }
  };

  const filteredDrives = drives.filter(drive => {
    const matchProvider = filterProvider === 'All' || drive.provider === filterProvider;
    let matchSize = true;
    if (filterSize === 'small') matchSize = drive.totalSpace < 100;
    if (filterSize === 'large') matchSize = drive.totalSpace >= 100;
    return matchProvider && matchSize;
  });

  return (
    <div className="qt-window-bg">
      {/* Жестко заданный контейнер 9:16 */}
      <div className="qt-app-container">
        
        {/* === КАСТОМНЫЙ ТАЙТЛБАР ОКНА ДЛЯ WAILS === */}
        <div className="qt-window-titlebar">
          <div className="qt-window-title">КСП СТЫК</div>
          <button onClick={handleAppClose} className="qt-window-close-btn" title="Закрыть">
            <X size={14} />
          </button>
        </div>
        
        <header className="qt-header">
          <div className="qt-header-left">
            <img src={logo} alt="logo" className="qt-logo" />
            <div className="qt-titles">
              <span className="qt-subtitle">КСП</span>
              <h1 className="qt-title">СТЫК</h1>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="qt-btn qt-btn-icon" title="Добавить диск">
            <Plus size={18} />
          </button>
        </header>

        <div className="qt-toolbar">
          <span className="qt-toolbar-label"><Filter size={14} /></span>
          <select className="qt-input qt-flex-1" value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)}>
            <option value="All">Все сервисы</option>
            {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="qt-input qt-flex-1" value={filterSize} onChange={(e) => setFilterSize(e.target.value)}>
            <option value="All">Любой размер</option>
            <option value="small">Меньше 100 ГБ</option>
            <option value="large">Больше или 100 ГБ</option>
          </select>
        </div>

        <main className="qt-workspace">
          {drives.length === 0 || filteredDrives.length === 0 ? (
            <div className="qt-empty-state">
              <Cloud size={48} />
              <p>{drives.length === 0 ? 'Нет дисков' : 'Ничего не найдено'}</p>
            </div>
          ) : (
            <div className="qt-drives-list">
              {filteredDrives.map((drive) => (
                <DriveCard key={drive.id} drive={drive} onUnmount={handleUnmount} />
              ))}
            </div>
          )}
        </main>

        <AnimatePresence>
          {isModalOpen && (
            <div className="qt-dialog-overlay">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                transition={{ duration: 0.1 }}
                className="qt-dialog"
              >
                <div className="qt-dialog-titlebar">
                  <span>{step === 1 ? 'Монтирование' : selectedProvider?.name}</span>
                  <button onClick={closeModal} className="qt-dialog-close"><X size={14} /></button>
                </div>

                <div className="qt-dialog-content">
                  {step === 1 ? (
                    <>
                      <p className="qt-label">Файловая система:</p>
                      <div className="qt-provider-list">
                        {PROVIDERS.map((provider) => (
                          <button key={provider.id} onClick={() => { setSelectedProvider(provider); setStep(2); }} className="qt-list-item">
                            {provider.icon}
                            <span>{provider.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : selectedProvider?.authType === 'oauth' ? (
                    <div className="qt-oauth-wait">
                      <Loader2 size={32} className="qt-spinner" />
                      <p>Ожидание...</p>
                      <span className="qt-muted-text">Подтвердите в браузере</span>
                    </div>
                  ) : (
                    <form onSubmit={handleFormSubmit} className="qt-form">
                      {selectedProvider?.requires.map((req, idx) => (
                        <div key={idx} className="qt-form-group">
                          <label>{req}:</label>
                          <input type={req.toLowerCase().includes('пароль') ? 'password' : 'text'} required className="qt-input" />
                        </div>
                      ))}
                      <div className="qt-dialog-actions" style={{ marginTop: '16px' }}>
                        <button type="button" onClick={() => setStep(1)} className="qt-btn">Назад</button>
                        <button type="submit" className="qt-btn qt-btn-primary">Применить</button>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DriveCard({ drive, onUnmount }: { drive: MountedDrive, onUnmount: (id: string) => void }) {
  const providerConfig = PROVIDERS.find(p => p.id === drive.provider);
  const percentage = Math.round((drive.usedSpace / drive.totalSpace) * 100);

  return (
    <div className="qt-card">
      <div className="qt-card-header">
        <div className="qt-card-icon">{providerConfig?.icon}</div>
        <div className="qt-card-details">
          <span className="qt-card-title">{drive.name}</span>
          <span className="qt-card-point">Точка: {drive.letter}</span>
        </div>
      </div>
      <div className="qt-card-body">
        <div className="qt-progress-labels">
          <span>{drive.usedSpace} GiB</span>
          <span>{drive.totalSpace} GiB</span>
        </div>
        <div className="qt-progress-bar">
          <div className="qt-progress-fill" style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
      <div className="qt-card-footer">
        <button onClick={() => onUnmount(drive.id)} className="qt-btn qt-btn-danger qt-btn-full">
          <Trash2 size={12} /> Отмонтировать
        </button>
      </div>
    </div>
  );
}