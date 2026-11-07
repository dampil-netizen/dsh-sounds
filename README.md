# dsh-sounds

Звуковые уведомления для **DeepSeek Harness**: короткие сигналы, когда агент закончил
ход, просит подтверждение или задаёт вопрос. Хост-плагин — звук играет процесс DSH,
поэтому песочница оболочки ему не мешает.

## Что играет

| Событие DSH | Звук |
|---|---|
| `turn/end` (ход завершён) | `done` |
| `turn/end` со сбоем/отменой не пользователем | `error` |
| `approval/asked` (запрос подтверждения) | `ask` |
| `tool/call` = `ask_user_question` | `ask` |

Служебные сессии (субагенты, инъекции `agent-instructions`/`runtime-context`) не
озвучиваются: «человеческие» сессии определяются по `user/message` с `source.kind`
`user`/`steering`.

## Установка

### Через npm (если опубликован)

```bash
# в любом профиле DSH
dsh plugin install dsh-sounds        # или через Settings → Plugins
```

Или вручную в `~/.dsh/profiles/<profile>/package.json`:

```json
{
  "dependencies": { "dsh-sounds": "^1.0.0" },
  "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-sounds"] } }
}
```

и затем `pnpm install` в каталоге профиля (или перезапуск DSH).

### Из tarball / локального каталога

```json
"dependencies": { "dsh-sounds": "link:C:/path/to/dsh-sounds" }
```

или `file:C:/path/to/dsh-sounds-1.0.0.tgz`; bundle-имя `dsh-sounds` добавить в
`dsh.profile.bundles`. После установки DSH подхватывает плагин (обычно без перезапуска
в live-профиле; иначе перезапустите DSH).

## Настройка

- `config.enabled: false` — выключить (или Settings → Plugins).
- Переменная окружения `DSH_SOUNDS=0` — выключить глобально.
- Свои звуки: замените `assets/done.wav`, `assets/ask.wav`, `assets/error.wav`
  (WAV PCM; можно короче/тише). Перезапуск не нужен.
- Лог: `~/.dsh/dsh-sounds.log`.

## Требования

- DSH ≥ 0.2.0, desktop/web host (Windows — воспроизведение через PowerShell
  `Media.SoundPlayer`). На Linux/macOS хост-часть нужно дополнить своим плеером.

## Лицензия

MIT.

## Публикация / репозиторий

Замените `dampil-netizen` в полях `repository` / `homepage` / `bugs` файла `package.json`
на ваш GitHub-аккаунт.

```bash
# npm (проверьте имя: https://registry.npmjs.org/dsh-sounds)
npm publish --access public

# GitHub
git remote add origin git@github.com:<user>/dsh-sounds.git
git push -u origin main
git tag v1.0.0 && git push --tags   # publish.yml (нужен секрет NPM_TOKEN)
```

Собрать тарбол для передачи: `npm pack` (или `pnpm pack`) → `dsh-sounds-1.0.0.tgz`.
