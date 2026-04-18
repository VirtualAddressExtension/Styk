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
		interval:  1 * time.Minute, // Плановый опрос облака
		trigger:   make(chan struct{}, 1),
		bisyncOpt: &bisync.Options{
			Workdir:   workDir,
			CheckSync: bisync.CheckSyncTrue,
			Resync:    true, // Обязательно true для создания базового слепка
		},
	}
}

func (e *SyncEngine) Start(ctx context.Context) {
	go e.watchLocal()

	go func() {
		ticker := time.NewTicker(e.interval)
		defer ticker.Stop()

		// Первый запуск при старте
		e.runSync(ctx)

		for {
			select {
			case <-ticker.C:
				log.Println("[Engine] Плановый опрос облака...")
				e.runSync(ctx)
			case <-e.trigger:
				log.Println("[Engine] Срочная синхронизация по локальному событию...")
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
		e.mu.Unlock()
	}()

	// ИСПРАВЛЕНИЕ 1: fRemote идет первым!
	// При Resync=true rclone берет первый аргумент (Path1) за источник истины.
	// Если локальная папка пустая, мы должны стянуть файлы из облака (fRemote).
	err := bisync.Bisync(ctx, e.fRemote, e.fLocal, e.bisyncOpt)
	if err != nil {
		log.Printf("[Engine] Ошибка синхронизации: %v", err)
		// ИСПРАВЛЕНИЕ 2: Если произошла ошибка, мы НЕ отключаем Resync,
		// иначе синхронизация будет сломана до конца работы программы.
	} else {
		log.Println("[Engine] Синхронизация успешно завершена")
		e.mu.Lock()
		e.bisyncOpt.Resync = false // Отключаем Resync только после успешного старта
		e.mu.Unlock()
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

	// ИСПРАВЛЕНИЕ 4: Создаем остановленный таймер
	timer := time.NewTimer(time.Hour)
	timer.Stop()

	for {
		select {
		case event, ok := <-watcher.Events:
			if !ok {
				return
			}
			// ИСПРАВЛЕНИЕ 3: Правильная проверка битовых масок
			if event.Op&fsnotify.Write == fsnotify.Write ||
				event.Op&fsnotify.Create == fsnotify.Create ||
				event.Op&fsnotify.Remove == fsnotify.Remove {
				// Безопасный сброс таймера (Debounce)
				if !timer.Stop() {
					select {
					case <-timer.C:
					default:
					}
				}
				timer.Reset(5 * time.Second)
			}
		case <-timer.C:
			// Отправляем сигнал, не блокируя горутину
			select {
			case e.trigger <- struct{}{}:
			default:
			}
		}
	}
}
