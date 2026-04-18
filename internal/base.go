package disk_base

import (
	_ "embed"

	"github.com/rclone/rclone/vfs/vfscommon"
)

//go:embed auth_success.html
var AuthSuccessPage []byte

type CacheMode = vfscommon.CacheMode
type DiskOptions struct {
	MountPath        string
	CacheSizeInBytes int
	CacheMode        CacheMode
}
