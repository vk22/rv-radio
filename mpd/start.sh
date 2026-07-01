#!/bin/sh
# Старое state_file может ссылаться на удаленные файлы и мешать чистому старту
rm -f /var/lib/mpd/state

# Запускаем MPD в фоне
mpd --no-daemon /etc/mpd.conf &

# Ждём пока MPD поднимется
sleep 2

# Сканируем библиотеку
mpc update --wait

# Генерируем плейлист в порядке tracks.json
if [ -f /tracks.json ]; then
  awk -F'"' '/"id"[[:space:]]*:/ { print $4 ".mp3" }' /tracks.json > /playlists/tracks.m3u
fi

# Пересобираем плейлист из текущей библиотеки
mpc clear
if [ -f /playlists/tracks.m3u ]; then
  mpc load tracks
else
  mpc ls | mpc add
fi

# Включаем случайное воспроизведение и повтор
mpc random off
mpc repeat on

# Запускаем плей
mpc play

# Держим контейнер
tail -f /var/lib/mpd/mpd.log
