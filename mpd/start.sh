#!/bin/sh
# Запускаем MPD в фоне
mpd --no-daemon /etc/mpd.conf &

# Ждём пока MPD поднимется
sleep 2

# Сканируем библиотеку
mpc update --wait

# Пересобираем плейлист из текущей библиотеки
mpc clear
mpc ls | mpc add

# Включаем случайное воспроизведение и повтор
mpc random on
mpc repeat on

# Запускаем плей
mpc play

# Держим контейнер
tail -f /var/lib/mpd/mpd.log
