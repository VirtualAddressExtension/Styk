import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, HardDrive, Plus, X, Trash2, Server, Shield, Loader2, Filter, Settings } from 'lucide-react';
import logo from './assets/images/logo-universal.png';
import { ProviderType, openBrowserAuth, mountDriveLogicOauth, unmountDriveLogic } from './logic.js';
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
      }).catch(e=>{isMounted == false;closeModal()});
    }
    return () => { isMounted = false; };
  }, [step, selectedProvider]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;
    /* rework this for correct data */
    const success = await mountDriveLogicOauth(selectedProvider.id,
       "", 
      {
        MountPath:"",
        CacheSizeInBytes:0,
        CacheMode:null
      }).catch(e=>console.log(e));
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
        setModalType('none');
        setStep(1);
        setSelectedProvider(null);
    };

    const handleAppClose = () => {
        if ((window as any).runtime && (window as any).runtime.Quit) {
            (window as any).runtime.Quit();
        }
    };

    const handleSettingsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        closeModal();
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
            <div className="qt-app-container">
                
                <div className="qt-window-titlebar">
                    <div className="qt-window-title">
                        <img src={logo} alt="icon" className="qt-window-icon" />
                        КСП СТЫК
                    </div>
                    <button onClick={handleAppClose} className="qt-window-close-btn">
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
                    <div className="qt-header-right">
                        <button onClick={() => setModalType('settings')} className="qt-btn qt-btn-icon">
                            <Settings size={18} />
                        </button>
                        <button onClick={() => setModalType('add')} className="qt-btn qt-btn-icon">
                            <Plus size={18} />
                        </button>
                    </div>
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
                    {modalType !== 'none' && (
                        <div className="qt-dialog-overlay">
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }} 
                                transition={{ duration: 0.1 }}
                                className="qt-dialog"
                            >
                                <div className="qt-dialog-titlebar">
                                    <span>
                                        {modalType === 'settings' 
                                            ? 'Настройки' 
                                            : (step === 1 ? 'Монтирование' : selectedProvider?.name)}
                                    </span>
                                    <button onClick={closeModal} className="qt-dialog-close"><X size={14} /></button>
                                </div>

                                <div className="qt-dialog-content">
                                    {modalType === 'add' ? (
                                        step === 1 ? (
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
                                        )
                                    ) : (
                                        <form onSubmit={handleSettingsSubmit} className="qt-form">
                                            
                                            <div className="qt-form-group">
                                                <label>Режим работы кэша:</label>
                                                <select className="qt-input" value={cacheMode} onChange={(e) => setCacheMode(e.target.value)}>
                                                    <option value="off">Отключен</option>
                                                    <option value="min">Минимальный</option>
                                                    <option value="full">Полный</option>
                                                </select>
                                            </div>

                                            <div className="qt-form-group">
                                                <label>Размер кэша:</label>
                                                <div className="qt-input-row">
                                                    <input 
                                                        type="number" 
                                                        className="qt-input qt-flex-1" 
                                                        min="1" 
                                                        value={cacheSize} 
                                                        onChange={(e) => setCacheSize(e.target.value ? Number(e.target.value) : '')} 
                                                    />
                                                    <select className="qt-input qt-unit-select" value={cacheUnit} onChange={(e) => setCacheUnit(e.target.value)}>
                                                        <option value="MB">МБ</option>
                                                        <option value="GB">ГБ</option>
                                                        <option value="TB">ТБ</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="qt-form-group">
                                                <label>Папка сохранения конфигурации:</label>
                                                <div className="qt-input-row">
                                                    <input 
                                                        type="text" 
                                                        className="qt-input qt-flex-1" 
                                                        value={configPath} 
                                                        onChange={(e) => setConfigPath(e.target.value)} 
                                                    />
                                                    <button type="button" className="qt-btn">Обзор...</button>
                                                </div>
                                            </div>

                                            <div className="qt-dialog-actions" style={{ marginTop: '16px' }}>
                                                <button type="button" onClick={closeModal} className="qt-btn">Отмена</button>
                                                <button type="submit" className="qt-btn qt-btn-primary">Сохранить</button>
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