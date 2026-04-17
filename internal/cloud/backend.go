package cloud

import (
	_ "github.com/rclone/rclone/backend/drive"
	_ "github.com/rclone/rclone/backend/local"
	_ "github.com/rclone/rclone/backend/webdav" // Для NextCloud
	_ "github.com/rclone/rclone/backend/yandex"
	"github.com/rclone/rclone/librclone/librclone"
)

func InitRclone() {
	librclone.Initialize()
}
