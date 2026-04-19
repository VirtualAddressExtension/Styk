package disk_base

import (
	_ "embed"

	"github.com/rclone/rclone/fs"
	"github.com/rclone/rclone/vfs/vfscommon"
)

//go:embed auth_success.html
var AuthSuccessPage []byte

type CacheMode = vfscommon.CacheMode
type DiskOptions struct {
	RemoteMountPath  string
	LocalMountPath   string
	CacheSizeInBytes int
	CacheMode        CacheMode
}

type DiskConnection struct {
	DiskFs          fs.Fs
	ConfigName      string
	ConnectionPoint string
}
