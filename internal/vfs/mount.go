package vfs

import (
	"fmt"

	"github.com/rclone/rclone/librclone/librclone"
)

func MountRemote(remoteName string, mountPoint string) error {
	params := fmt.Sprintf(`{
        "fs": "%s:",
        "mountpoint": "%s",
        "vfs_cache_mode": "full",
        "vfs_cache_max_size": "10G"
    }`, remoteName, mountPoint)

	output, status := librclone.RPC("mount/mount", params)
	if status != 200 {
		return fmt.Errorf("mount failed: %s", output)
	}
	return nil
}
