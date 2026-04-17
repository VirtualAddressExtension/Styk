/**
 * Origin file with logic for buttons in frontend
 */

//TODO: create a logger for logging in *.log file

/**
 * Main cloud disk providers
 * 
 *? Maybe can be extend
 */
export type ProviderType = 'Yandex' | 'Nextcloud' | 'Google' | 'WebDAV';


export const openBrowserAuth = async (provider: ProviderType): Promise<boolean> => {
  console.log(`[System Logic] Открытие браузера для авторизации в: ${provider}...`);
  
  return new Promise((resolve) => {

    /**
     * TODO: switch test function normal backend func
     */
    setTimeout(() => {
      console.log(`[System Logic] Успешная авторизация в ${provider}!`);
      resolve(true);
    }, 3000);


  });
};

export const mountDriveLogic = async (provider: ProviderType, formData: Record<string, string>): Promise<boolean> => {
  console.log(`[System Logic] Вызов команды монтирования для ${provider} с данными:`, formData);
  
  return new Promise((resolve) => {
    
    /**
     * TODO: switch test function normal backend func
     */
    setTimeout(() => {
      console.log(`[System Logic] Диск ${provider} успешно смонтирован!`);
      resolve(true);
    }, 1000);
  });
};

export const unmountDriveLogic = async (driveId: string): Promise<boolean> => {
  console.log(`[System Logic] Размонтирование системного диска с ID: ${driveId}...`);
  
  return new Promise((resolve) => {

    
    /**
     * TODO: switch test function normal backend func
     */
    setTimeout(() => {
      console.log(`[System Logic] Диск ${driveId} отключен!`);
      resolve(true);
    }, 500);
  });
};