package sync

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/rclone/rclone/cmd/bisync"
	"github.com/rclone/rclone/fs"
)

type SyncEngine struct {
	fLocal    fs.Fs
	fRemote   fs.Fs
	bisyncOpt *bisync.Options
	interval  time.Duration
	localPath string

	mu        sync.Mutex
	isRunning bool
	trigger   chan struct{}
}

func NewSyncEngine(fLocal, fRemote fs.Fs, localPath string, workDir string) *SyncEngine {
	return &SyncEngine{
		fLocal:    fLocal,
		fRemote:   fRemote,
		localPath: localPath,
		interval:  1 * time.Minute, // Интервал опроса облака
		trigger:   make(chan struct{}, 1),
		bisyncOpt: &bisync.Options{
			Workdir:   workDir,
			CheckSync: bisync.CheckSyncTrue,
			Resync:    true,
		},
	}
}

func (e *SyncEngine) Start(ctx context.Context) {
	go e.watchLocal()

	go func() {
		ticker := time.NewTicker(e.interval)
		defer ticker.Stop()

		e.runSync(ctx)

		for {
			select {
			case <-ticker.C:
				log.Println("[Engine] Плановый опрос облака...")
				e.runSync(ctx)
			case <-e.trigger:
				log.Println("[Engine] Срочная синхронизация по событию...")
				e.runSync(ctx)
			case <-ctx.Done():
				return
			}
		}
	}()
}

func (e *SyncEngine) runSync(ctx context.Context) {
	e.mu.Lock()
	if e.isRunning {
		e.mu.Unlock()
		return
	}
	e.isRunning = true
	e.mu.Unlock()

	defer func() {
		e.mu.Lock()
		e.isRunning = false
		e.bisyncOpt.Resync = false
		e.mu.Unlock()
	}()

	err := bisync.Bisync(ctx, e.fLocal, e.fRemote, e.bisyncOpt)
	if err != nil {
		log.Printf("[Engine] Ошибка синхронизации: %v", err)
	} else {
		log.Println("[Engine] Синхронизация успешно завершена")
	}
}

func (e *SyncEngine) watchLocal() {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal(err)
	}
	defer watcher.Close()

	err = watcher.Add(e.localPath)
	if err != nil {
		log.Fatal(err)
	}

	timer := time.NewTimer(0)
	<-timer.C

	for {
		select {
		case event, ok := <-watcher.Events:
			if !ok {
				return
			}
			if event.Op == fsnotify.Write || event.Op == fsnotify.Create || event.Op == fsnotify.Remove {
				timer.Stop()
				timer.Reset(5 * time.Second)
			}
		case <-timer.C:
			select {
			case e.trigger <- struct{}{}:
			default:
			}
		}
	}
}
