package utils

import (
	"regexp"
	"strings"
)

func SanitizeFolderName(name string) string {
	badChars := regexp.MustCompile(`[<>:"/\\|?*\x00-\x1f]`)
	sanitized := badChars.ReplaceAllString(name, "_")

	sanitized = strings.TrimRight(sanitized, ". ")

	reservedNames := []string{
		"CON", "PRN", "AUX", "NUL",
		"COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
		"LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
	}

	upperName := strings.ToUpper(sanitized)
	for _, reserved := range reservedNames {
		if upperName == reserved {
			sanitized = sanitized + "_"
			break
		}
	}

	if len(strings.TrimSpace(sanitized)) == 0 {
		sanitized = "unnamed_folder"
	}

	if len(sanitized) > 255 {
		sanitized = sanitized[:255]
	}

	return sanitized
}
