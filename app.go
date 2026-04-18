package main

import (
	_ "embed"

	"context"
	"fmt"

	disk_base "styk/internal"
	ya_auth "styk/internal/auth/yandex"
	ya_mount "styk/internal/cloud/yandex"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type CloudServices int

const (
	YaDisk CloudServices = iota
	NextCloud
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

type App struct {
	ctx            context.Context
	currentMounted map[CloudServices]func() error
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) shutdown(ctx context.Context) {
	for service, unmount := range a.currentMounted {
		err := unmount()
		if err != nil {
			fmt.Printf("Unmount of service %s emitted error: %s", localizeCloudService(service), err)
		}
	}
}

func (a *App) AuthorizeService(service CloudServices) (any, string) {
	switch service {
	case YaDisk:
		token, err := ya_auth.GetYandexToken(a.ctx)
		if err == nil {
			return token, ""
		} else {
			return nil, fmt.Sprintf("%s", err)
		}
	default:
		return nil, "Unknown service!"
	}
}

func (a *App) MountCloud(service CloudServices, token any, diskOptions disk_base.DiskOptions) string {
	switch service {
	case YaDisk:
		token_ya, ok := token.(ya_auth.YandexToken)
		if !ok {
			return "Unknown token type"
		}

		err := ya_mount.MountYaDisk(token_ya, diskOptions)
		if err != nil {
			return fmt.Sprintf("%s", err)
		}

		a.currentMounted[YaDisk] = ya_mount.UnmountYaDisk
		return ""
	default:
		return "Unknown service"
	}
}

func (a *App) UnmountCloud(service CloudServices) string {
	switch service {
	case YaDisk:
		if a.currentMounted[YaDisk] != nil {
			err := a.currentMounted[YaDisk]()
			if err != nil {
				return fmt.Sprintf("%s", err)
			}
		}
		return ""
	default:
		return "Unknown service"
	}
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
