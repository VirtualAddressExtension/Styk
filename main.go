package main

import (
	"embed"

	"runtime"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

	"github.com/getlantern/systray"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

//go:embed build/windows/icon.ico
var icon_windows []byte

func main() {
	app := NewApp()

	systray.Register(func() {
		var ico []byte
		if platform := runtime.GOOS; platform == "windows" {
			ico = icon_windows
		} else {
			ico = icon
		}

		systray.SetIcon(ico)
		systray.SetTitle("КСП СТЫК")
		mShow := systray.AddMenuItem("Показать/Скрыть", "Показать или скрыть приложение")
		mQuit := systray.AddMenuItem("Выход", "Выйти из приложения")

		go func() {
			for {
				select {
				case <-mShow.ClickedCh:
					if app.IsAppHidden() {
						app.ShowApp()
					} else {
						app.HideApp()
					}

				case <-mQuit.ClickedCh:
					systray.Quit()
					app.CloseApp()
				}
			}
		}()
	}, func() {})

	err := wails.Run(&options.App{
		Title:         "КСП «СТЫК»",
		Width:         405,
		Height:        720,
		DisableResize: true,
		Fullscreen:    false,
		Frameless:     true,
		MinWidth:      405,
		MinHeight:     720,
		MaxWidth:      405,
		MaxHeight:     720,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []any{
			app,
		},
		WindowStartState:  options.Normal,
		HideWindowOnClose: true,
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
