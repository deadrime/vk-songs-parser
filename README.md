# Парсер музыки из вк

Данный пакет позволяет спарсить и скачать свой плейлист из ВК. Скачать можно только песни со своей страницы, с чужой страницы можно достать только список песен (при условии, что аудиозаписи открыты).
Вк выпилил публичный API для работы с музыкой, а прямые ссылки на mp3 теперь привязаны к ID, поэтому приходится доставать музыку немного костыльными способами.
Парсеру нужны куки, чтобы зайти на страницу аудиозаписей, так что необходимо указать свой логин и пароль.

# Инструкция

- Ввести в **config.json** свой логин и пароль от вк, а также ID своей страницы или страницы другого юзера.
- ```yarn && yarn start```
- Песни будут лежать в папке **songs**, плейлист - **playlist.json**
