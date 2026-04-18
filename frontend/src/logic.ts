import { option } from "framer-motion/client";
import { AuthorizeService, MountCloud, } from "../wailsjs/go/main/App.js"

export type ProviderType = 'Yandex' | 'Nextcloud' | 'Google' | 'WebDAV';

interface DiskOptions
{
  MountPath        :string,
	CacheSizeInBytes :number,
	CacheMode        :any,
}

export const openBrowserAuth = async (provider: ProviderType): Promise<string> => {
  console.log(`[System Logic] Открытие браузера для авторизации в: ${provider}...`);
  
  return new Promise(async (resolve, reject) => {

    switch (provider){
      case "Yandex":{
      const token = await AuthorizeService(0)
      
      if (token === null) {
        reject("Iternal Error")
      }

      resolve(token)
      
      }
    }

    
  });
};

export const mountDriveLogicOauth = async (provider: ProviderType, token:any, options:DiskOptions): Promise<boolean> => {
  console.log(`[System Logic] Вызов команды монтирования для ${provider} с данными:`);
  
  return new Promise(async(resolve, reject) => {
    switch (provider){
     case "Yandex":{
      const err = await MountCloud(0, token, options)
      if (err === "") reject(err)
      resolve(true)
     }
    
  }
  });
};

export const unmountDriveLogic = async (driveId: string): Promise<boolean> => {
  console.log(`[System Logic] Размонтирование системного диска с ID: ${driveId}...`);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`[System Logic] Диск ${driveId} отключен!`);
      resolve(true);
    }, 500);
  });
};