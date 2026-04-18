package yandex

import (
	"context"
	"encoding/json"
	"fmt"

	disk_base "styk/internal"
	auth "styk/internal/auth/yandex"
	"styk/utils"

	"github.com/rclone/rclone/fs/config"
	"github.com/rclone/rclone/fs/config/configmap"

	backend "github.com/rclone/rclone/backend/yandex"
)

func Connect(ctx context.Context, authToken auth.YandexToken, diskOptions disk_base.DiskOptions) (*disk_base.DiskConnection, error) {
	authToken.TokenType = "OAuth"

	authJSON, err := json.Marshal(authToken)
	if err != nil {
		return nil, err
	}

	yandexConfig := configmap.Simple{
		"type":          "yandex",
		"token":         string(authJSON),
		"client_id":     auth.YandexClientID,
		"client_secret": auth.YandexClientSecret,
	}

	configName := fmt.Sprintf("styk-yandex-%s", utils.SanitizeFolderName(diskOptions.RemoteMountPath))
	config.Data().SetValue(configName, "type", "yandex")
	config.Data().SetValue(configName, "token", string(authJSON))
	config.Data().SetValue(configName, "client_id", auth.YandexClientID)
	config.Data().SetValue(configName, "client_secret", auth.YandexClientSecret)
	config.ShowConfig()

	diskFs, err := backend.NewFs(ctx, configName, diskOptions.RemoteMountPath, yandexConfig)
	if err != nil {
		return nil, err
	}

	return &disk_base.DiskConnection{
		DiskFs:     diskFs,
		ConfigName: configName,
	}, nil
}
