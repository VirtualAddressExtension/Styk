import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Cloud, HardDrive, Plus, X, Trash2, Server, 
    Shield, Loader2, Filter, Settings, FolderPlus, 
    FolderSearch, Link as LinkIcon, Unplug
} from 'lucide-react';
import logo from './assets/images/logo-universal.png';
import './App.css';

// Реальные биндинги Wails
import { 
    AuthorizeService, ConnectToCloud, MountCloudToLocal, 
    UnmountCloud, DisconnectFromCloud, CloseApp, SelectDirectory, GetHomeDir 
} from '../wailsjs/go/main/App.js';
import { disk_base } from '../wailsjs/go/models.js';

const CloudServices = {
    Yandex: 0,
    NextCloud: 1,
    Local: 2
};

interface CloudProvider {
    id: number;
    name: string;
    icon: React.ReactNode;
    authType: 'oauth' | 'form';
    requires: string[];
}

interface MountedLink {
    mountPath: string; 
    remotePath: string; 
}

interface ConnectedDrive {
    id: string; 
    providerId: number;
    name: string;
    token: any; // ВАЖНО: Храним токен, чтобы переиспользовать его для ConnectToCloud при монтировании папок
    links: MountedLink[];
}

const PROVIDERS: CloudProvider[] = [
    { id: CloudServices.Yandex, name: 'Яндекс.Диск', icon: <Cloud size={16} />, authType: 'oauth', requires: [] },
    { id: CloudServices.NextCloud, name: 'Nextcloud', icon: <Server size={16} />, authType: 'form', requires: ['url', 'user', 'pass'] },
];

type ModalType = 'none' | 'addDrive' | 'settings' | 'addLinkStep1' | 'addLinkStep2';

export default function App() {
    const [drives, setDrives] = useState<ConnectedDrive[]>([]);
    const [modalType, setModalType] = useState<ModalType>('none');
    const [step, setStep] = useState<1 | 2>(1);
    
    const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);

    const [activeDriveId, setActiveDriveId] = useState<string | null>(null);
    const [tempRemotePath, setTempRemotePath] = useState<string>('/');
    const [tempParentPath, setTempParentPath] = useState<string>(''); 
    const [tempFolderName, setTempFolderName] = useState<string>(''); 

    const [appTheme, setAppTheme] = useState<'system' | 'dark' | 'light'>('system');
    const [cacheMode, setCacheMode] = useState<number>(3); 
    const [cacheSize, setCacheSize] = useState<string>('5');      
    const [cacheUnit, setCacheUnit] = useState<string>('GB'); 
    const [homeDir, setHomeDir] = useState<string>('');

    useEffect(() => {
        GetHomeDir().then(setHomeDir);
    }, []);

    useEffect(() => {
        const applyTheme = () => {
            const isLight = appTheme === 'system' 
                ? window.matchMedia('(prefers-color-scheme: light)').matches 
                : appTheme === 'light';
            isLight ? document.body.classList.add('theme-light') : document.body.classList.remove('theme-light');
        };
        applyTheme();
        const handler = () => { if (appTheme === 'system') applyTheme(); };
        window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', handler);
        return () => window.matchMedia('(prefers-color-scheme: light)').removeEventListener('change', handler);
    }, [appTheme]);

    const joinPath = (parent: string, folder: string) => {
        const separator = homeDir.includes('\\') ? '\\' : '/';
        const cleanParent = parent.endsWith(separator) ? parent.slice(0, -1) : parent;
        return `${cleanParent}${separator}${folder}`;
    };

    // === 1. ПОДКЛЮЧЕНИЕ ДИСКА (АВТОРИЗАЦИЯ) ===
    const handleAddDrive = async (provider: CloudProvider) => {
        setSelectedProvider(provider);
        setStep(2);

        if (provider.authType === 'oauth') {
            try {
                // Получаем токен
                const result = await AuthorizeService(provider.id);
                if (result == "") throw new Error(result);

                // Опционально: Создаем корневое подключение, чтобы убедиться что токен работает
                const bytesMultipliers: Record<string, number> = { MB: 1048576, GB: 1073741824 };
                const sizeInBytes = Number(cacheSize) * (bytesMultipliers[cacheUnit] || 1048576);

                const options = new disk_base.DiskOptions({
                    RemoteMountPath: "/", 
                    LocalMountPath: "",   
                    CacheSizeInBytes: sizeInBytes,
                    CacheMode: Number(cacheMode)
                });
                
                const connectErr = await ConnectToCloud(provider.id, result, options);
                if (connectErr !== "") throw new Error(connectErr);

                // Сохраняем диск и ТОКЕН в UI
                setDrives(prev => [...prev, {
                    id: Math.random().toString(36).substring(7),
                    providerId: provider.id,
                    name: provider.name,
                    token: result,
                    links: []
                }]);
                closeModal();

            } catch (error: any) {
                alert(`Ошибка подключения: ${error.message || error}`);
                setStep(1); 
            }
        }
    };

    const handleDisconnectDrive = async (drive: ConnectedDrive) => {
        try {
            for (const link of drive.links) {
                await UnmountCloud(link.mountPath);
            }
            const err = await DisconnectFromCloud(drive.providerId, "/");
            if (err !== "") throw new Error(err);

            setDrives(prev => prev.filter(d => d.id !== drive.id));
        } catch (error: any) {
            alert(`Ошибка отключения: ${error.message}`);
        }
    };

    // === 2. ЗЕРКАЛИРОВАНИЕ ПАПКИ (CONNECT + MOUNT) ===
    const startAddLink = (driveId: string) => {
        setActiveDriveId(driveId);
        setTempRemotePath('/');
        setTempParentPath(homeDir); 
        setTempFolderName('');
        setModalType('addLinkStep1');
    };

    const handleAddLinkSubmit = async () => {
        if (!activeDriveId || !tempParentPath || !tempFolderName || !tempRemotePath) {
            alert("Заполните все поля");
            return;
        }

        const drive = drives.find(d => d.id === activeDriveId);
        if (!drive) return;

        const finalMountPath = joinPath(tempParentPath, tempFolderName);

        try {
            // ВАЖНО: Согласно твоему Go-коду, перед монтированием папки 
            // мы ДОЛЖНЫ создать для нее Connection с ключом tempRemotePath
            const bytesMultipliers: Record<string, number> = { MB: 1048576, GB: 1073741824 };
            const sizeInBytes = Number(cacheSize) * (bytesMultipliers[cacheUnit] || 1048576);

            const options = new disk_base.DiskOptions({
                RemoteMountPath: tempRemotePath, 
                LocalMountPath: "", // Локальный путь кэша Go создает сам
                CacheSizeInBytes: sizeInBytes,
                CacheMode: Number(cacheMode)
            });

            // 1. Создаем соединение для конкретного remotePath
            const connectErr = await ConnectToCloud(drive.providerId, drive.token, options);
            if (connectErr !== "") throw new Error(`Ошибка ConnectToCloud: ${connectErr}`);

            // 2. Теперь монтируем
            const mountErr = await MountCloudToLocal(drive.providerId, finalMountPath, tempRemotePath);
            if (mountErr !== "") throw new Error(`Ошибка MountCloudToLocal: ${mountErr}`);

            setDrives(prev => prev.map(d => {
                if (d.id === activeDriveId) {
                    return {
                        ...d,
                        links: [...d.links, { mountPath: finalMountPath, remotePath: tempRemotePath }]
                    };
                }
                return d;
            }));

            closeModal();
        } catch (error: any) {
            alert(`Сбой: ${error.message}`);
        }
    };

    const handleUnmountLink = async (driveId: string, mountPath: string) => {
        try {
            const err = await UnmountCloud(mountPath);
            if (err !== "") throw new Error(err);

            setDrives(prev => prev.map(d => {
                if (d.id === driveId) {
                    return { ...d, links: d.links.filter(l => l.mountPath !== mountPath) };
                }
                return d;
            }));
        } catch (error: any) {
            alert(`Ошибка размонтирования: ${error.message}`);
        }
    };

    const handleBrowseParentDir = async () => {
        const path = await SelectDirectory();
        if (path) setTempParentPath(path);
    };

    const closeModal = () => {
        setModalType('none');
        setStep(1);
        setSelectedProvider(null);
        setActiveDriveId(null);
    };

    return (
        <div className="qt-window-bg">
            <div className="qt-app-container">
                <div className="qt-window-titlebar">
                    <div className="qt-window-title">
                        <img src={logo} alt="icon" className="qt-window-icon" />
                        КСП СТЫК
                    </div>
                    <button onClick={CloseApp} className="qt-window-close-btn">
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
                        <button onClick={() => setModalType('addDrive')} className="qt-btn qt-btn-icon">
                            <Plus size={18} />
                        </button>
                    </div>
                </header>

                <main className="qt-workspace">
                    {drives.length === 0 ? (
                        <div className="qt-empty-state">
                            <Cloud size={48} />
                            <p>Нет подключенных сервисов</p>
                            <button onClick={() => setModalType('addDrive')} className="qt-btn qt-btn-primary" style={{marginTop: 10}}>
                                Подключить диск
                            </button>
                        </div>
                    ) : (
                        <div className="qt-drives-list">
                            {drives.map((drive) => (
                                <div key={drive.id} className="qt-card">
                                    <div className="qt-card-header">
                                        <div className="qt-card-icon"><Server size={16}/></div>
                                        <div className="qt-card-details">
                                            <span className="qt-card-title">{drive.name}</span>
                                            <span className="qt-card-point" style={{fontSize: 10, color: 'var(--text-sub)'}}>
                                                Статус: Подключено
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div style={{ padding: '0 12px' }}>
                                        {drive.links.length > 0 ? (
                                            drive.links.map(link => (
                                                <div key={link.mountPath} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-workspace)', padding: '6px', borderRadius: 4, marginBottom: 6 }}>
                                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                                                        <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{link.remotePath}</span>
                                                        <br />
                                                        <span style={{ color: 'var(--text-sub)', userSelect: 'text' }}>{link.mountPath}</span>
                                                    </div>
                                                    <button onClick={() => handleUnmountLink(drive.id, link.mountPath)} className="qt-btn qt-btn-icon qt-btn-danger" title="Отмонтировать">
                                                        <X size={12}/>
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p style={{ fontSize: 11, color: 'var(--text-sub)', textAlign: 'center', margin: '10px 0' }}>
                                                Нет смонтированных папок
                                            </p>
                                        )}
                                    </div>

                                    <div className="qt-card-footer" style={{ display: 'flex', gap: '6px', marginTop: 10 }}>
                                        <button onClick={() => startAddLink(drive.id)} className="qt-btn qt-flex-1">
                                            <FolderPlus size={14} /> Зеркалировать
                                        </button>
                                        <button onClick={() => handleDisconnectDrive(drive)} className="qt-btn qt-btn-danger" title="Отключить сервис">
                                            <Unplug size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                <AnimatePresence>
                    {modalType !== 'none' && (
                        <div className="qt-dialog-overlay">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                exit={{ opacity: 0, scale: 0.95 }} 
                                className="qt-dialog"
                            >
                                <div className="qt-dialog-titlebar">
                                    <span>
                                        {modalType === 'addDrive' ? 'Подключение диска' : 
                                         modalType === 'settings' ? 'Настройки' : 'Зеркалирование папки'}
                                    </span>
                                    <button onClick={closeModal} className="qt-dialog-close"><X size={14} /></button>
                                </div>

                                <div className="qt-dialog-content">
                                    
                                    {modalType === 'addDrive' && (
                                        step === 1 ? (
                                            <div className="qt-provider-list">
                                                {PROVIDERS.map((provider) => (
                                                    <button key={provider.id} onClick={() => handleAddDrive(provider)} className="qt-list-item">
                                                        {provider.icon}<span>{provider.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="qt-oauth-wait">
                                                <Loader2 size={32} className="qt-spinner" />
                                                <p>Подключение...</p>
                                                <span className="qt-muted-text">Подтвердите вход в браузере</span>
                                            </div>
                                        )
                                    )}

                                    {modalType === 'addLinkStep1' && (
                                        <div className="qt-form">
                                            <div className="qt-form-group">
                                                <label>Какую папку зеркалируем из облака?</label>
                                                <input type="text" className="qt-input" value={tempRemotePath} onChange={e => setTempRemotePath(e.target.value)} placeholder="/" />
                                                <span className="qt-muted-text" style={{ fontSize: 10, marginTop: 4 }}>Например: /Рабочие Документы</span>
                                            </div>
                                            <button onClick={() => setModalType('addLinkStep2')} className="qt-btn qt-btn-primary" style={{ width: '100%', marginTop: 10 }} disabled={!tempRemotePath}>
                                                Далее
                                            </button>
                                        </div>
                                    )}

                                    {modalType === 'addLinkStep2' && (
                                        <div className="qt-form">
                                            <div className="qt-form-group">
                                                <label>1. Выберите родительскую папку на ПК:</label>
                                                <div className="qt-input-row">
                                                    <input type="text" className="qt-input qt-flex-1" value={tempParentPath} readOnly />
                                                    <button type="button" onClick={handleBrowseParentDir} className="qt-btn">
                                                        <FolderSearch size={14}/> Обзор
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="qt-form-group">
                                                <label>2. Имя новой папки (будет создана):</label>
                                                <input type="text" className="qt-input" value={tempFolderName} onChange={e => setTempFolderName(e.target.value)} placeholder="МояПапка" />
                                            </div>

                                            <div style={{ background: 'var(--bg-app)', padding: 8, borderRadius: 4, fontSize: 11, marginBottom: 15, wordBreak: 'break-all' }}>
                                                <span style={{ color: 'var(--text-sub)' }}>Итоговый путь:</span><br/>
                                                <strong>{tempParentPath && tempFolderName ? joinPath(tempParentPath, tempFolderName) : '...'}</strong>
                                            </div>

                                            <div style={{ display: 'flex', gap: 10 }}>
                                                <button onClick={() => setModalType('addLinkStep1')} className="qt-btn qt-flex-1">Назад</button>
                                                <button onClick={handleAddLinkSubmit} className="qt-btn qt-btn-primary qt-flex-1" disabled={!tempFolderName}>Смонтировать</button>
                                            </div>
                                        </div>
                                    )}

                                    {modalType === 'settings' && (
                                        <div className="qt-form">
                                            <div className="qt-form-group">
                                                <label>Режим кэша (для новых ссылок):</label>
                                                <select className="qt-input" value={cacheMode} onChange={(e) => setCacheMode(Number(e.target.value))}>
                                                    <option value={0}>Отключен (Off)</option>
                                                    <option value={1}>Минимальный (Min)</option>
                                                    <option value={3}>Полный (Full)</option>
                                                </select>
                                            </div>
                                            <button onClick={closeModal} className="qt-btn qt-btn-primary" style={{marginTop: 15, width: '100%'}}>Сохранить</button>
                                        </div>
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