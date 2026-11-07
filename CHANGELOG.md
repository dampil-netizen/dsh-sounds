# Changelog

## 1.0.0 — 2026-11-07

- Первый выпуск: хост-плагин `dsh-sounds` для DeepSeek Harness.
- Звуки `done` / `ask` / `error` на `turn/end`, `approval/asked` и `tool/call = ask_user_question`.
- Определение «человеческих» сессий по `user/message` (`source.kind` = `user`/`steering`),
  служебные сессии и субагенты не озвучиваются.
- Троттлинг 350 мс, лог `~/.dsh/dsh-sounds.log`, выключение через config/enabled, env `DSH_SOUNDS=0`
  или Settings → Plugins.
- Воспроизведение WAV через PowerShell `Media.SoundPlayer` (Windows).
