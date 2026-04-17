package main

import (
	"context"
	"fmt"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx      context.Context
	IsHidden bool
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	runtime.EventsOn(ctx, "wails:window-hide", func(optionalData ...interface{}) {
		a.IsHidden = true
	})

	runtime.EventsOn(ctx, "wails:window-show", func(optionalData ...interface{}) {
		a.IsHidden = false
	})
}

func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

func (a *App) ShowApp() {
	runtime.Show(a.ctx)
	a.IsHidden = false
}

func (a *App) HideApp() {
	runtime.Hide(a.ctx)
	a.IsHidden = true
}

func (a *App) IsAppHidden() bool {
	return a.IsHidden
}

func (a *App) CloseApp() {
	runtime.Quit(a.ctx)
}
