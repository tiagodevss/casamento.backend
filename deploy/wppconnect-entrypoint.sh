#!/bin/sh
# O Chrome grava SingletonLock/Cookie/Socket no perfil (volume persistente) com o hostname
# do container. Depois de recriar o container o hostname muda, o Chrome acredita que o perfil
# está em uso "em outro computador" e recusa abrir: sem navegador não há QR Code.
# Este entrypoint roda antes do servidor, quando nenhum Chrome desta imagem está ativo.
BASE="${CUSTOM_USER_DATA_DIR:-/usr/src/wpp-server/userDataDir/}"
for dir in "$BASE"*/; do
  [ -d "$dir" ] || continue
  rm -f "${dir}SingletonLock" "${dir}SingletonCookie" "${dir}SingletonSocket"
done
exec node dist/server.js "$@"
