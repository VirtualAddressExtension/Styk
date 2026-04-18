package main

import (
	_ "embed"
	"encoding/json"
	"os"
	"path/filepath"

	"context"
	"fmt"

	disk_base "styk/internal"
	ya_auth "styk/internal/auth/yandex"
	local_cloud "styk/internal/cloud/local"
	ya_cloud "styk/internal/cloud/yandex"
	"styk/internal/fuse"
	"styk/utils"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type CloudServices int

const (
	YaDisk CloudServices = iota
	NextCloud
	Local // Only for internal use
)

func localizeCloudService(service CloudServices) string {
	switch service {
	case YaDisk:
		return "Yandex.Disk"
	case NextCloud:
		return "NextCloud"
	default:
		return "Unknown"
	}
}

type CloudMounted struct {
	Service    CloudServices
	MountPoint *fuse.DiskMountPoint
}

type App struct {
	ctx              context.Context
	currentConnected map[CloudServices]map[string]*disk_base.DiskConnection
	currentMounted   map[string]CloudMounted

	cacheSizeInBytes int
	cacheMode        disk_base.CacheMode
}

func NewApp() *App {
	app := &App{
		currentConnected: make(map[CloudServices]map[string]*disk_base.DiskConnection),
		currentMounted:   make(map[string]CloudMounted),
	}
	app.currentConnected[YaDisk] = make(map[string]*disk_base.DiskConnection)
	app.currentConnected[NextCloud] = make(map[string]*disk_base.DiskConnection)
	app.currentConnected[Local] = make(map[string]*disk_base.DiskConnection)

	return app
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) shutdown(ctx context.Context) {
	for mointPath, mntPoint := range a.currentMounted {
		err := mntPoint.MountPoint.Unmount()
		if err != nil {
			fmt.Printf("Unmount of %s (Service %s) emitted error: %s", mointPath, localizeCloudService(mntPoint.Service), err)
		}
	}
}

func (a *App) SelectDirectory() string {
	path, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Выберите папку",
	})
	if err != nil {
		return ""
	}
	return path
}

func (a *App) GetHomeDir() string {
	home, _ := os.UserHomeDir()
	return home
}

func (a *App) AuthorizeService(service CloudServices) (any, string) {
	switch service {
	case YaDisk:
		token, err := ya_auth.GetYandexToken(a.ctx)
		if err == nil {
			return *token, ""
		} else {
			return "", fmt.Sprintf("%s", err)
		}
	default:
		return "", "Unknown service!"
	}
}

func (a *App) ConnectToCloud(service CloudServices, token map[string]any, diskOptions disk_base.DiskOptions) string {
	tokenJson, _ := json.Marshal(token)

	switch service {
	case YaDisk:
		var token_ya ya_auth.YandexToken
		json.Unmarshal(tokenJson, &token_ya)

		diskConnection, err := ya_cloud.Connect(a.ctx, token_ya, diskOptions)
		if err != nil {
			return fmt.Sprintf("%s", err)
		}

		if a.currentConnected[service] == nil {
			a.currentConnected[service] = make(map[string]*disk_base.DiskConnection)
		}
		a.currentConnected[service][diskOptions.RemoteMountPath] = diskConnection
		return ""
	default:
		return "Unknown service"
	}
}

func (a *App) DisconnectFromCloud(service CloudServices, remotePath string) string {
	switch service {
	case YaDisk:
		if a.currentConnected[YaDisk] != nil {
			if _, ok := a.currentConnected[YaDisk]["remotePath"]; ok {
				a.currentConnected[YaDisk]["remotePath"] = nil
			} else {
				return fmt.Sprintf("Remote location is %s is not connected", remotePath)
			}
		}
		return ""
	default:
		return "Unknown service"
	}
}

func (a *App) MountCloudToLocal(service CloudServices, mountPath string, remotePath string) string {
	cache, _ := os.UserCacheDir()

	_, ok := a.currentMounted[mountPath]
	if ok {
		return fmt.Sprintf("%s already mounted to that mount point", localizeCloudService(service))
	}

	remoteConnections, ok := a.currentConnected[service]
	if !ok {
		return "Unknown service"
	}

	remoteConnection, ok := remoteConnections[remotePath]
	if !ok {
		return "Remote path doesn't connected"
	}

	var localCloudFolder = fmt.Sprintf("styk/local_files/%s_%s_", localizeCloudService(service), utils.SanitizeFolderName(remotePath))
	os.MkdirAll(localCloudFolder, 0755)

	localDiskConnection, err := local_cloud.Connect(a.ctx, disk_base.DiskOptions{
		RemoteMountPath:  "/",
		LocalMountPath:   filepath.Join(cache, localCloudFolder),
		CacheSizeInBytes: a.cacheSizeInBytes,
		CacheMode:        a.cacheMode,
	})

	if err != nil {
		return "Failed to create local files cache"
	}

	a.currentConnected[Local][localCloudFolder] = localDiskConnection

	diskMountPoint, err := fuse.CreateDiskMountPoint(a.ctx, mountPath, localDiskConnection, remoteConnection)
	if err != nil {
		return fmt.Sprintf("%s", err)
	}

	a.currentMounted[mountPath] = CloudMounted{
		Service:    service,
		MountPoint: diskMountPoint,
	}

	return ""
}

func (a *App) UnmountCloud(mountPath string) string {
	mountPoint, ok := a.currentMounted[mountPath]
	if !ok {
		return "Mount point doesn't exists"
	}

	err := mountPoint.MountPoint.Unmount()
	if err != nil {
		return fmt.Sprintf("%s", err)
	}
	return ""
}

func (a *App) ShowApp() {
	runtime.WindowShow(a.ctx)
}

func (a *App) HideApp() {
	runtime.WindowHide(a.ctx)
}

func (a *App) IsAppHidden() bool {
	return runtime.WindowIsNormal(a.ctx)
}

func (a *App) CloseApp() {
	runtime.Quit(a.ctx)
}
