package local

import (
	"context"
	"fmt"
	disk_base "styk/internal"
	"styk/utils"

	"github.com/rclone/rclone/fs/config"
	"github.com/rclone/rclone/fs/config/configmap"

	backend "github.com/rclone/rclone/backend/local"
)

func Connect(ctx context.Context, diskOptions disk_base.DiskOptions) (*disk_base.DiskConnection, error) {
	localConfig := configmap.Simple{}

	configName := fmt.Sprintf("styk-local-%s", utils.SanitizeFolderName(diskOptions.LocalMountPath))
	config.Data().SetValue(configName, "type", "local")

	diskFs, err := backend.NewFs(ctx, configName, diskOptions.LocalMountPath, localConfig)
	if err != nil {
		return nil, err
	}

	return &disk_base.DiskConnection{
		DiskFs:          diskFs,
		ConfigName:      configName,
		ConnectionPoint: diskOptions.LocalMountPath,
	}, nil
}
