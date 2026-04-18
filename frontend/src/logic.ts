import { AuthorizeService, ConnectToCloud, MountCloudToLocal, UnmountCloud } from "../wailsjs/go/main/App.js";
import { disk_base } from "../wailsjs/go/models.js";

export type ProviderType = 'Yandex' | 'Nextcloud' // | 'Google' | 'WebDAV';

// Маппинг для соответствия Go CloudServices enum
const ServiceMap: Record<ProviderType, number> = {
    'Yandex': 0,
    'Nextcloud': 1,
    // 'Google': 2, // Добавь в Go если нужно
    // 'WebDAV': 3  // Добавь в Go если нужно
};

export const openBrowserAuth = async (provider: ProviderType): Promise<any> => {
    console.log(`[System Logic] Авторизация в: ${provider}...`);
    const serviceId = ServiceMap[provider];
    
    // В Wails v2 множественные возвращаемые значения приходят как массив или объект
    // Судя по app.go: (any, string). Обычно Wails возвращает массив [data, error]
    const result = await AuthorizeService(serviceId);
    
    // Если в Go вернулась ошибка во втором параметре
    if (Array.isArray(result) && result[1] !== "") {
        throw new Error(result[1]);
    }
    
    return Array.isArray(result) ? result[0] : result;
};

export const mountDriveLogicOauth = async (
    provider: ProviderType, 
    token: any, 
    options: { MountPath: string, CacheSizeInBytes: number, CacheMode: number }
): Promise<boolean> => {
    const serviceId = ServiceMap[provider];

    // 1. Сначала подключаемся к облаку (создаем fs.Fs в памяти Go)
    const diskOpts = new disk_base.DiskOptions({
        RemoteMountPath: "/", // Корень по умолчанию
        LocalMountPath: options.MountPath,
        CacheSizeInBytes: options.CacheSizeInBytes,
        CacheMode: options.CacheMode
    });

    const connectError = await ConnectToCloud(serviceId, token, diskOpts);
    if (connectError !== "") {
        throw new Error(`Connect error: ${connectError}`);
    }

    // 2. Теперь монтируем (FUSE + Union)
    const mountError = await MountCloudToLocal(serviceId, options.MountPath, "/");
    if (mountError !== "") {
        throw new Error(`Mount error: ${mountError}`);
    }

    return true;
};

export const unmountDriveLogic = async (mountPath: string): Promise<boolean> => {
    const err = await UnmountCloud(mountPath);
    if (err !== "") {
        throw new Error(err);
    }
    return true;
};