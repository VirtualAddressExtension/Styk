package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

	"github.com/getlantern/systray"
)

//go:embed all:frontend/dist
var assets embed.FS

func onReady() {
	/*icon, err := assets.Open("icon.ico")
	if err != nil {
		println("Error:", err.Error())
	}*/

	// systray.SetIcon(icon.Data)
	systray.SetTitle("Awesome App")
	systray.SetTooltip("Pretty awesome!")
	mQuit := systray.AddMenuItem("Quit", "Quit the whole app")
	mQuit.Enable()
	// mQuit.SetIcon(icon.Data)
}

func onExit() {
	// Очистка здесь
}

func main() {
	systray.Run(onReady, onExit)

	app := NewApp()

	err := wails.Run(&options.App{
		Title:  "КСП «СТЫК»",
		Width:  1024,
		Height: 768,
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
