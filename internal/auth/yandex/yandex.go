package yandex

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	internal "styk/internal"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	YandexClientID     = "d3b06694a4f84f61a207b22e2ecda81b"
	YandexClientSecret = "87cd289c3df2459aa2aae49a68e38ec1"
	RedirectPort       = "53682"
	RedirectURL        = "http://127.0.0.1:" + RedirectPort
)

type YandexToken struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

type AuthResult struct {
	Token *YandexToken
	Err   error
}

func GetYandexToken(ctx context.Context) (*YandexToken, error) {
	resultChan := make(chan AuthResult)

	mux := http.NewServeMux()
	server := &http.Server{Addr: ":" + RedirectPort, Handler: mux}

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code == "" {
			w.Write([]byte("Ошибка: Код не получен."))
			resultChan <- AuthResult{Err: fmt.Errorf("no code in callback")}
			return
		}

		token, err := exchangeCodeForToken(code)
		if err != nil {
			w.Write([]byte("Ошибка при обмене кода на токен."))
			resultChan <- AuthResult{Err: err}
			return
		}

		w.Write(internal.AuthSuccessPage)
		resultChan <- AuthResult{Token: token}
	})

	go func() {
		if err := server.ListenAndServe(); err != http.ErrServerClosed {
			resultChan <- AuthResult{Err: err}
		}
	}()

	authURL := fmt.Sprintf("https://oauth.yandex.ru/authorize?access_type=offline&response_type=code&client_id=%s&redirect_uri=%s",
		YandexClientID, url.QueryEscape(RedirectURL))

	runtime.BrowserOpenURL(ctx, authURL)

	select {
	case res := <-resultChan:
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		server.Shutdown(shutdownCtx)
		return res.Token, res.Err
	case <-time.After(5 * time.Minute):
		server.Shutdown(context.Background())
		return nil, fmt.Errorf("Превышено время ожидания авторизации")
	}
}

func exchangeCodeForToken(code string) (*YandexToken, error) {
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("client_id", YandexClientID)
	data.Set("client_secret", YandexClientSecret)

	resp, err := http.Post("https://oauth.yandex.ru/token", "application/x-www-form-urlencoded", strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("yandex api error: %s", string(body))
	}

	var token YandexToken
	err = json.Unmarshal(body, &token)
	return &token, err
}
