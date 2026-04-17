package main

import (
	"context"
	"fmt"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

func (a *App) ShowApp() {
	runtime.WindowShow(a.ctx)
}

func (a *App) HideApp() {
	runtime.WindowHide(a.ctx)
}

func (a *App) IsAppHidden() bool {
	return runtime.WindowIsNormal(a.ctx)
}

func (a *App) CloseApp() {
	runtime.Quit(a.ctx)
}
