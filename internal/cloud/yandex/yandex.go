package yandex

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	disk_base "styk/internal"
	auth "styk/internal/auth/yandex"

	"github.com/rclone/rclone/fs"
	"github.com/rclone/rclone/lib/systemd"
	"github.com/rclone/rclone/vfs/vfscommon"

	_ "github.com/rclone/rclone/cmd/cmount"
	_ "github.com/rclone/rclone/cmd/mount"
	_ "github.com/rclone/rclone/cmd/mount2"
	"github.com/rclone/rclone/cmd/mountlib"

	_ "github.com/rclone/rclone/backend/yandex"
)

var mountPath = func() string {
	homedir, _ := os.UserHomeDir()
	return filepath.Join(homedir, "YandexDrive")
}()

var mnt *mountlib.MountPoint

func MountYaDisk(authToken auth.YandexToken, diskOptions disk_base.DiskOptions) error {
	authToken.TokenType = "OAuth"

	authJSON, err := json.Marshal(authToken)
	if err != nil {
		return err
	}

	connStr := fmt.Sprintf(`:yandex,client_id='%s',client_secret='%s',token='%s':`,
		auth.YandexClientID,
		auth.YandexClientSecret,
		string(authJSON),
	)

	ctx := context.Background()

	myFs, err := fs.NewFs(ctx, connStr)
	if err != nil {
		return err
	}

	vfsOpt := vfscommon.Opt
	vfsOpt.CacheMode = diskOptions.CacheMode
	vfsOpt.CacheMaxSize = fs.SizeSuffix(diskOptions.CacheSizeInBytes)

	mountOpt := mountlib.Opt
	mountOpt.AsyncRead = true
	mountOpt.NetworkMode = true

	mounthMethod, mountFn := mountlib.ResolveMountMethod("")
	log.Print(mounthMethod)
	log.Print(mountFn)
	mnt = mountlib.NewMountPoint(mountFn, mountPath, myFs, &mountOpt, &vfsOpt)
	_, err = mnt.Mount()

	if err != nil {
		return err
	}

	go func() {
		defer systemd.Notify()()
		err = mnt.Wait()
		if err := <-mnt.ErrChan; err != nil {
			log.Printf("Диск отмонтирован с ошибкой: %v", err)
		}
	}()

	return nil
}

func UnmountYaDisk() error {
	if mnt.UnmountFn != nil {
		err := mnt.Unmount()
		if err != nil {
			return err
		} else {
			return nil
		}
	}
	return nil
}
