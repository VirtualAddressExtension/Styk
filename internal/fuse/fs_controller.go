package fuse

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	disk_base "styk/internal"
	"styk/internal/sync"
	"time"

	"github.com/rclone/rclone/backend/union"
	_ "github.com/rclone/rclone/cmd/cmount"
	_ "github.com/rclone/rclone/cmd/mount"
	_ "github.com/rclone/rclone/cmd/mount2"
	"github.com/rclone/rclone/cmd/mountlib"
	"github.com/rclone/rclone/fs"
	"github.com/rclone/rclone/fs/config/configmap"
	"github.com/rclone/rclone/vfs/vfscommon"
)

type DiskMountPoint struct {
	MountPoint *mountlib.MountPoint
}

func (d *DiskMountPoint) Unmount() error {
	return d.MountPoint.Unmount()
}

func CreateDiskMountPoint(ctx context.Context, mountPoint string, localConnection *disk_base.DiskConnection, remoteConnection *disk_base.DiskConnection) (*DiskMountPoint, error) {
	unionConfig := configmap.Simple{
		"type":          "union",
		"upstreams":     fmt.Sprintf("%s:%s %s:%s", localConnection.ConfigName, localConnection.ConnectionPoint, remoteConnection.ConfigName, remoteConnection.ConnectionPoint),
		"action_policy": "ff",
		"create_policy": "ff",
		"search_policy": "ff",
	}
	fUnion, err := union.NewFs(ctx, "styk-union", "/", unionConfig)
	if err != nil {
		return nil, err
	}

	cache, _ := os.UserCacheDir()
	bisyncDb := filepath.Join(cache, "styk/bisync")
	os.MkdirAll(bisyncDb, 0755)

	engine := sync.NewSyncEngine(localConnection.DiskFs, remoteConnection.DiskFs, localConnection.ConnectionPoint, bisyncDb)
	engine.Start(ctx)

	vfsOpt := vfscommon.Opt
	vfsOpt.CacheMode = vfscommon.CacheModeFull
	vfsOpt.Links = true
	vfsOpt.LinkPerms = vfsOpt.FilePerms
	vfsOpt.DirCacheTime = fs.Duration(1 * time.Minute)

	mountMethod, mountFn := mountlib.ResolveMountMethod("")
	if mountFn == nil {
		return nil, fmt.Errorf("Failed to find suitable mount method")
	} else {
		log.Printf("Метод монтирования: %s", mountMethod)
	}

	mountOpt := mountlib.Opt
	mnt := mountlib.NewMountPoint(mountFn, mountPoint, fUnion, &mountOpt, &vfsOpt)

	_, err = mnt.Mount()
	if err != nil {
		return nil, err
	}

	go func() {
		if err := mnt.Wait(); err != nil {
			log.Printf("Монтирование завершено: %v", err)
		}
	}()

	return &DiskMountPoint{
		MountPoint: mnt,
	}, nil
}
