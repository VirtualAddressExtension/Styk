import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Cloud, HardDrive, Plus, X, Trash2, Server, 
    Shield, Loader2, Filter, Settings, FolderPlus, 
    Link as LinkIcon, ArrowRight 
} from 'lucide-react';
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

interface FolderLink {
    id: string;
    remotePath: string;
    localPath: string;
}

interface MountedDrive {
    id: string;
    name: string;
    provider: ProviderType;
    totalSpace: number;
    usedSpace: number;  
    letter: string;
    links?: FolderLink[];
}

const PROVIDERS: CloudProvider[] = [
    { id: 'Yandex', name: 'Яндекс.Диск', icon: <Cloud size={16} />, authType: 'oauth', requires: [] },
    { id: 'Nextcloud', name: 'Nextcloud', icon: <Server size={16} />, authType: 'form', requires: ['URL сервера', 'Логин', 'Пароль'] },
    { id: 'Google', name: 'Google Drive', icon: <HardDrive size={16} />, authType: 'oauth', requires: [] },
    { id: 'WebDAV', name: 'WebDAV', icon: <Shield size={16} />, authType: 'form', requires: ['URL', 'Логин', 'Пароль'] },
];

// Вспомогательная функция для форматирования байт
const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

type ModalType = 'none' | 'add' | 'settings' | 'addLinkStep1' | 'addLinkStep2' | 'linkManager';

export default function App() {
    const [drives, setDrives] = useState<MountedDrive[]>([
        { id: '1', name: 'Мой Яндекс', provider: 'Yandex', totalSpace: 100, usedSpace: 45, letter: 'Y:', links: [] }
    ]);
    
    const [modalType, setModalType] = useState<ModalType>('none');
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);

    const [activeDriveId, setActiveDriveId] = useState<string | null>(null);
    const [tempRemotePath, setTempRemotePath] = useState<string>('/');
    const [tempLocalPath, setTempLocalPath] = useState<string>('');

    const [filterProvider, setFilterProvider] = useState<string>('All');
    const [filterSize, setFilterSize] = useState<string>('All');

    const [appTheme, setAppTheme] = useState<'system' | 'dark' | 'light'>('system');

    const [cacheMode, setCacheMode] = useState<string>('off');             
    const [cacheSize, setCacheSize] = useState<number | string>(512);      
    const [cacheUnit, setCacheUnit] = useState<string>('MB');              
    const [configPath, setConfigPath] = useState<string>('C:\\KSP_Styk\\Config'); 
    
    const [cachePath, setCachePath] = useState<string>('C:\\KSP_Styk\\Cache'); 
    const [cacheLifetime, setCacheLifetime] = useState<number | string>(3600); 
    const [cacheLifetimeUnit, setCacheLifetimeUnit] = useState<string>('s');   
    const [cacheUpdate, setCacheUpdate] = useState<number | string>(300);      
    const [cacheUpdateUnit, setCacheUpdateUnit] = useState<string>('s');       

    // Мок свободного места на ПК (в будущем получать из Wails)
    const [localFreeSpaceBytes] = useState<number>(250 * 1024 * 1024 * 1024); // 250 GB

    useEffect(() => {
        const applyTheme = () => {
            let isLight = false;
            if (appTheme === 'system') {
                isLight = window.matchMedia('(prefers-color-scheme: light)').matches;
            } else {
                isLight = appTheme === 'light';
            }

            if (isLight) {
                document.body.classList.add('theme-light');
            } else {
                document.body.classList.remove('theme-light');
            }
        };

        applyTheme();

        const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        const handler = () => {
            if (appTheme === 'system') applyTheme();
        };
        
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [appTheme]);
  useEffect(() => {
    let isMounted = true;

    return () => { isMounted = false; };
  }, [step, selectedProvider]);

    const getDiskOptions = (letter: string) => {
        const bytesMultipliers: Record<string, number> = { MB: 1048576, GB: 1073741824, TB: 1099511627776 };
        const sizeInBytes = Number(cacheSize) * (bytesMultipliers[cacheUnit] || 1048576);

        return {
            MountPath: letter,
            CacheSizeInBytes: sizeInBytes,
            CacheMode: cacheMode
        };
    };

    const handleProviderSelect = async (provider: CloudProvider) => {
        setSelectedProvider(provider);
        setStep(2);

        if (provider.authType === 'oauth') {
            try {
                let token
                // 1. Получаем токен из браузера
                token = await openBrowserAuth(provider.id).catch(err=>{console.log(err)});
                
                
                // 2. Генерируем свободную букву (здесь заглушка)
                const letter = "C:/yandex/";
                
                // 3. Формируем настройки монтирования
                const options = getDiskOptions(letter);

                const success = await mountDriveLogicOauth(provider.id, token, options);
                
                if (success) {
                    handleMountSuccess(provider, letter);
                }
              }
             catch (error) {
                console.error(`Ошибка монтирования ${provider.id}:`, error);
                setStep(1); // В случае отмены или ошибки возвращаемся назад
            }
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProvider) return;
        
        try {
            const formDataToken = { info: "data from form inputs" };
            const letter = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}:`;
            const options = getDiskOptions(letter);

            const success = await mountDriveLogicOauth(selectedProvider.id, formDataToken, options);
            if (success) handleMountSuccess(selectedProvider, letter);
        } catch (error) {
            console.error(`Ошибка монтировани�� ${selectedProvider.id}:`, error);
        }
    };

    const handleMountSuccess = (provider: CloudProvider, letter: string) => {
        const newDrive: MountedDrive = {
            id: Math.random().toString(36).substr(2, 9),
            name: `Новый ${provider.name}`,
            provider: provider.id,
            totalSpace: Math.floor(Math.random() * 500) + 50,
            usedSpace: Math.floor(Math.random() * 50),
            letter: letter,
            links: [] 
        };
        setDrives(prev => [...prev, newDrive]);
        closeModal();
    };

    const handleUnmount = async (id: string) => {
        try {
            const success = await unmountDriveLogic(id);
            if (success) setDrives(drives.filter(d => d.id !== id));
        } catch (error) {
            console.error(`Ошибка размонтирования диска ${id}:`, error);
        }
    };

    const startFolderLinking = (driveId: string) => {
        setActiveDriveId(driveId);
        setTempRemotePath('/'); 
        setTempLocalPath('');
        setModalType('addLinkStep1');
    };

    const handleAddLinkStep1Submit = (e: React.FormEvent) => {
        e.preventDefault();
        setModalType('addLinkStep2');
    };

    const handleAddLinkStep2Submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeDriveId || !tempLocalPath) return;

        const newLink: FolderLink = {
            id: Math.random().toString(36).substr(2, 9),
            remotePath: tempRemotePath,
            localPath: tempLocalPath
        };

        setDrives(prev => prev.map(drive => {
            if (drive.id === activeDriveId) {
                return { ...drive, links: [...(drive.links || []), newLink] };
            }
            return drive;
        }));

        closeModal();
    };

    const openLinkManager = (driveId: string) => {
        setActiveDriveId(driveId);
        setModalType('linkManager');
    };

    const updateLinkProperty = (driveId: string, linkId: string, field: keyof FolderLink, value: string) => {
        setDrives(prev => prev.map(drive => {
            if (drive.id === driveId) {
                const updatedLinks = drive.links?.map(link => 
                    link.id === linkId ? { ...link, [field]: value } : link
                );
                return { ...drive, links: updatedLinks };
            }
            return drive;
        }));
    };

    const deleteLink = (driveId: string, linkId: string) => {
        setDrives(prev => prev.map(drive => {
            if (drive.id === driveId) {
                return { ...drive, links: drive.links?.filter(l => l.id !== linkId) };
            }
            return drive;
        }));
    };

    const closeModal = () => {
        setModalType('none');
        setStep(1);
        setSelectedProvider(null);
        setActiveDriveId(null);
    };

    const handleAppClose = () => {
        if ((window as any).runtime && (window as any).runtime.Quit) {
            (window as any).runtime.Quit();
        }
    };

    // --- Обработчики и контроль ввода данных ---

    const cleanNumberInput = (val: string) => {
        // Убираем всё кроме цифр и точек
        let cleaned = val.replace(/[^0-9.]/g, '');
        // Оставляем только одну точку, если их несколько
        if ((cleaned.match(/\./g) || []).length > 1) {
            const parts = cleaned.split('.');
            cleaned = parts[0] + '.' + parts.slice(1).join('');
        }
        return cleaned;
    };

    const handleCacheSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = cleanNumberInput(e.target.value);
        if (val === '') {
            setCacheSize('');
            return;
        }

        const numVal = parseFloat(val);
        const bytesMultipliers: Record<string, number> = { MB: 1048576, GB: 1073741824, TB: 1099511627776 };
        const multiplier = bytesMultipliers[cacheUnit] || 1048576;
        
        // Лимит размера кэша = Свободное место на диске
        const maxAllowed = localFreeSpaceBytes / multiplier;

        if (numVal > maxAllowed) {
            // Если ввели больше доступного, сбрасываем на максимум
            setCacheSize(maxAllowed.toFixed(2));
        } else {
            setCacheSize(val);
        }
    };

    const handleTimeInput = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<number | string>>) => {
        const val = cleanNumberInput(e.target.value);
        setter(val);
    };

    const handleCacheUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newUnit = e.target.value;
        const multipliers: Record<string, number> = { MB: 1, GB: 1024, TB: 1048576 };
        if (cacheSize !== '') {
            const num = Number(cacheSize);
            const converted = num * (multipliers[cacheUnit] / multipliers[newUnit]);
            setCacheSize(Number(converted.toFixed(6))); 
        }
        setCacheUnit(newUnit);
    };

    const handleCacheLifetimeUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newUnit = e.target.value;
        const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }; 
        if (cacheLifetime !== '') {
            const num = Number(cacheLifetime);
            const converted = num * (multipliers[cacheLifetimeUnit] / multipliers[newUnit]);
            setCacheLifetime(Number(converted.toFixed(6)));
        }
        setCacheLifetimeUnit(newUnit);
    };

    const handleCacheUpdateUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newUnit = e.target.value;
        const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
        if (cacheUpdate !== '') {
            const num = Number(cacheUpdate);
            const converted = num * (multipliers[cacheUpdateUnit] / multipliers[newUnit]);
            setCacheUpdate(Number(converted.toFixed(6)));
        }
        setCacheUpdateUnit(newUnit);
    };

    const filteredDrives = drives.filter(drive => {
        const matchProvider = filterProvider === 'All' || drive.provider === filterProvider;
        let matchSize = true;
        if (filterSize === 'small') matchSize = drive.totalSpace < 100;
        if (filterSize === 'large') matchSize = drive.totalSpace >= 100;
        return matchProvider && matchSize;
    });

    const activeDrive = drives.find(d => d.id === activeDriveId);

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
                                <DriveCard 
                                    key={drive.id} 
                                    drive={drive} 
                                    onUnmount={handleUnmount} 
                                    onManageFolders={() => startFolderLinking(drive.id)}
                                    onOpenLinkManager={() => openLinkManager(drive.id)}
                                />
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
                                        {modalType === 'settings' ? 'Настройки' : 
                                         modalType === 'add' ? (step === 1 ? 'Монтирование' : selectedProvider?.name) :
                                         modalType === 'addLinkStep1' ? 'Выбор папки на диске' :
                                         modalType === 'addLinkStep2' ? 'Создание точки монтирования' :
                                         modalType === 'linkManager' ? 'Менеджер ссылок' : ''}
                                    </span>
                                    <button onClick={closeModal} className="qt-dialog-close"><X size={14} /></button>
                                </div>

                                <div className="qt-dialog-content">
                                    
                                    {modalType === 'add' && (
                                        step === 1 ? (
                                            <>
                                                <p className="qt-label">Файловая система:</p>
                                                <div className="qt-provider-list">
                                                    {PROVIDERS.map((provider) => (
                                                        <button key={provider.id} onClick={() => handleProviderSelect(provider)} className="qt-list-item">
                                                            {provider.icon}<span>{provider.name}</span>
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
                                    )}

                                    {modalType === 'addLinkStep1' && (
                                        <form onSubmit={handleAddLinkStep1Submit} className="qt-form">
                                            <div className="qt-form-group">
                                                <label>Введите путь папки на удаленном диске (или корень /):</label>
                                                <div className="qt-input-row">
                                                    <input 
                                                        type="text" className="qt-input qt-flex-1" 
                                                        value={tempRemotePath} onChange={(e) => setTempRemotePath(e.target.value)} required
                                                    />
                                                </div>
                                            </div>
                                            <div className="qt-dialog-actions" style={{ marginTop: '16px' }}>
                                                <button type="button" onClick={closeModal} className="qt-btn">Отмена</button>
                                                <button type="submit" className="qt-btn qt-btn-primary">Далее <ArrowRight size={14}/></button>
                                            </div>
                                        </form>
                                    )}

                                    {modalType === 'addLinkStep2' && (
                                        <form onSubmit={handleAddLinkStep2Submit} className="qt-form">
                                            <div className="qt-form-group">
                                                <label>Куда смонтировать на ПК (локальная папка):</label>
                                                <div className="qt-input-row">
                                                    <input 
                                                        type="text" className="qt-input qt-flex-1" placeholder="C:\MyDrive\Folder"
                                                        value={tempLocalPath} onChange={(e) => setTempLocalPath(e.target.value)} required
                                                    />
                                                    {/* ЗАГЛУШКА ДЛЯ ОБЗОРА */}
                                                    <button type="button" className="qt-btn">Обзор...</button>
                                                </div>
                                            </div>
                                            <div className="qt-dialog-actions" style={{ marginTop: '16px' }}>
                                                <button type="button" onClick={() => setModalType('addLinkStep1')} className="qt-btn">Назад</button>
                                                <button type="submit" className="qt-btn qt-btn-primary">Создать ссылку</button>
                                            </div>
                                        </form>
                                    )}

                                    {modalType === 'linkManager' && activeDrive && (
                                        <div className="qt-form">
                                            <p className="qt-label" style={{ marginBottom: '12px' }}>Управление ссылками для {activeDrive.name}</p>
                                            
                                            {(!activeDrive.links || activeDrive.links.length === 0) ? (
                                                <div className="qt-empty-state" style={{ padding: '20px 0' }}>
                                                    <p>Нет созданных ссылок</p>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {activeDrive.links.map(link => (
                                                        <div key={link.id} style={{ background: 'var(--bg-workspace)', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '2px' }}>
                                                            <div className="qt-input-row" style={{ marginBottom: '8px' }}>
                                                                <span style={{ fontSize: '11px', color: 'var(--text-sub)', width: '60px' }}>Диск:</span>
                                                                <input 
                                                                    className="qt-input qt-flex-1" value={link.remotePath}
                                                                    onChange={(e) => updateLinkProperty(activeDrive.id, link.id, 'remotePath', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="qt-input-row">
                                                                <span style={{ fontSize: '11px', color: 'var(--text-sub)', width: '60px' }}>ПК:</span>
                                                                <input 
                                                                    className="qt-input qt-flex-1" value={link.localPath}
                                                                    onChange={(e) => updateLinkProperty(activeDrive.id, link.id, 'localPath', e.target.value)}
                                                                />
                                                                <button 
                                                                    className="qt-btn qt-btn-danger qt-btn-icon" 
                                                                    onClick={() => deleteLink(activeDrive.id, link.id)} title="Удалить ссылку"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="qt-dialog-actions" style={{ marginTop: '16px' }}>
                                                <button onClick={closeModal} className="qt-btn qt-btn-primary">Закрыть</button>
                                            </div>
                                        </div>
                                    )}

                                    {modalType === 'settings' && (
                                        <form onSubmit={(e) => { e.preventDefault(); closeModal(); }} className="qt-form">
                                            <div className="qt-form-group">
                                                <label>Тема оформления:</label>
                                                <select className="qt-input" value={appTheme} onChange={(e) => setAppTheme(e.target.value as 'system' | 'dark' | 'light')}>
                                                    <option value="system">Как в системе</option>
                                                    <option value="dark">Тёмная</option>
                                                    <option value="light">Светлая</option>
                                                </select>
                                            </div>

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
                                                    {/* Заменён type="number" на text + кастомный хэндлер ввода для безопасности */}
                                                    <input 
                                                        type="text" 
                                                        className="qt-input qt-flex-1" 
                                                        value={cacheSize} 
                                                        onChange={handleCacheSizeChange} 
                                                    />
                                                    <select className="qt-input qt-unit-select" value={cacheUnit} onChange={handleCacheUnitChange}>
                                                        <option value="MB">МБ</option><option value="GB">ГБ</option><option value="TB">ТБ</option>
                                                    </select>
                                                </div>
                                                <span className="qt-muted-text" style={{ display: 'block', marginTop: '4px', fontSize: '10px' }}>
                                                    Свободно на диске ПК: {formatBytes(localFreeSpaceBytes)}
                                                </span>
                                            </div>

                                            <div className="qt-form-group">
                                                <label>Длительность жизни кэша:</label>
                                                <div className="qt-input-row">
                                                    <input 
                                                        type="text" 
                                                        className="qt-input qt-flex-1" 
                                                        value={cacheLifetime} 
                                                        onChange={(e) => handleTimeInput(e, setCacheLifetime)} 
                                                    />
                                                    <select className="qt-input qt-unit-select" value={cacheLifetimeUnit} onChange={handleCacheLifetimeUnitChange}>
                                                        <option value="s">Сек</option><option value="m">Мин</option><option value="h">Час</option><option value="d">Дн</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="qt-form-group">
                                                <label>Интервал обновления кэша:</label>
                                                <div className="qt-input-row">
                                                    <input 
                                                        type="text" 
                                                        className="qt-input qt-flex-1" 
                                                        value={cacheUpdate} 
                                                        onChange={(e) => handleTimeInput(e, setCacheUpdate)} 
                                                    />
                                                    <select className="qt-input qt-unit-select" value={cacheUpdateUnit} onChange={handleCacheUpdateUnitChange}>
                                                        <option value="s">Сек</option><option value="m">Мин</option><option value="h">Час</option><option value="d">Дн</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="qt-form-group">
                                                <label>Папка кэша:</label>
                                                <div className="qt-input-row">
                                                    <input type="text" className="qt-input qt-flex-1" value={cachePath} onChange={(e) => setCachePath(e.target.value)} />
                                                    {/* ЗАГЛУШКА ДЛЯ ОБЗОРА */}
                                                    <button type="button" className="qt-btn">Обзор...</button>
                                                </div>
                                            </div>

                                            <div className="qt-form-group">
                                                <label>Папка сохранения конфигурации:</label>
                                                <div className="qt-input-row">
                                                    <input type="text" className="qt-input qt-flex-1" value={configPath} onChange={(e) => setConfigPath(e.target.value)} />
                                                    {/* ЗАГЛУШКА ДЛЯ ОБЗОРА */}
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


function DriveCard({ 
    drive, 
    onUnmount, 
    onManageFolders, 
    onOpenLinkManager 
}: { 
    drive: MountedDrive; 
    onUnmount: (id: string) => void;
    onManageFolders: () => void;
    onOpenLinkManager: () => void;
}) {
    const providerConfig = PROVIDERS.find(p => p.id === drive.provider);
    const percentage = Math.round((drive.usedSpace / drive.totalSpace) * 100);
    const hasLinks = drive.links && drive.links.length > 0;

    return (
        <div className="qt-card">
            <div className="qt-card-header">
                <div className="qt-card-icon">{providerConfig?.icon}</div>
                <div className="qt-card-details">
                    <span className="qt-card-title">{drive.name}</span>
                    {/*<span className="qt-card-point">Точка: {drive.letter}</span>*/}
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
            <div className="qt-card-footer" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button onClick={onManageFolders} className="qt-btn qt-btn-full">
                    <FolderPlus size={14} /> Управление папками
                </button>
                
                {hasLinks && (
                    <button onClick={onOpenLinkManager} className="qt-btn qt-btn-full">
                        <LinkIcon size={14} /> Менеджер ссылок
                    </button>
                )}

                <button onClick={() => onUnmount(drive.id)} className="qt-btn qt-btn-danger qt-btn-full">
                    <Trash2 size={14} /> Отмонтировать
                </button>
            </div>
        </div>
    );
}