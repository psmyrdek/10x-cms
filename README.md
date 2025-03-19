# 10xCMS

![10xCMS](./public/images/banner.png)

Nowoczesny System Zarządzania Treścią zbudowany z myślą o wydajności i skalowalności (i refaktoryzacji).

## Wymagania wstępne

- Node.js i npm
- Bower (dla zależności frontendowych)

## Rozpoczęcie pracy

1. Zainstaluj globalne zależności:

```bash
npm install -g bower
```

2. Zainstaluj zależności projektu:

```bash
npm install
bower install
```

Zależności frontendowe (jQuery i Bootstrap) zostaną zainstalowane w katalogu `public/vendor`.

## Struktura projektu

```
.
├── public/
│   ├── app.js        # Główna logika aplikacji po stronie klienta
│   ├── uploads/      # Katalog na przesłane pliki mediów
│   └── vendor/       # Zależności frontendowe zarządzane przez Bower
├── src/
│   ├── components/   # Komponenty HTML
│   ├── layout/       # Szablony układu strony
│   ├── pages/        # Strony HTML
│   └── server/       # Logika po stronie serwera
│       ├── data/     # Pliki JSON z danymi
│       ├── media.js  # Obsługa biblioteki mediów
│       ├── storage.js # Obsługa kolekcji danych
│       ├── templating.js # System szablonów
│       └── webhooks.js # Obsługa webhooków
├── index.js          # Główny plik wejściowy aplikacji
├── bower.json        # Konfiguracja zależności frontendowych
├── .bowerrc          # Konfiguracja Bower
└── package.json      # Konfiguracja zależności Node.js
```

## Stack techniczny

- Node.js - środowisko wykonawcze
- Bower - zarządzanie zależnościami frontendowymi
- jQuery & jQuery UI - obsługa interakcji po stronie klienta
- Bootstrap - style komponentów
- Express - framework backendowy
- Multer - obsługa przesyłanych plików
- Mocha & Chai - narzędzia do testowania

## Funkcjonalności

### Zarządzanie kolekcjami

System umożliwia tworzenie i zarządzanie kolekcjami danych z niestandardowymi schematami. Dla każdej kolekcji można:

- Definiować własne pola i typy danych
- Dodawać, edytować i usuwać elementy
- Zarządzać strukturą danych

Dostępne typy pól:

- Tekst (krótki)
- Tekst (długi)
- Liczba
- Data
- Media (obraz)

### Biblioteka mediów

System zawiera bibliotekę mediów do zarządzania obrazami:

- Przesyłanie obrazów (z limitem 5MB)
- Przeglądanie galerii obrazów
- Dodawanie opisów do obrazów
- Usuwanie niepotrzebnych obrazów
- Kopiowanie adresów URL obrazów
- Podgląd obrazów w modalu

### Integracja mediów z kolekcjami

Możliwość dodawania pól typu "media" do kolekcji:

- Wybór obrazów z biblioteki mediów podczas tworzenia elementów kolekcji
- Wyświetlanie miniatur obrazów w tabeli elementów kolekcji
- Wyszukiwanie i filtrowanie obrazów w selektorze mediów

### Webhooks

System obsługuje webhooks, które umożliwiają powiadamianie zewnętrznych usług o zmianach w kolekcjach:

- Rejestrowanie webhooków dla konkretnych kolekcji
- Konfigurowanie zdarzeń wyzwalających webhook (tworzenie, aktualizacja, usunięcie)
- Automatyczne wysyłanie powiadomień HTTP/HTTPS do zdefiniowanych adresów URL
- Pełna integracja z systemem zarządzania kolekcjami

Struktura danych wysyłanych przez webhook:

```json
{
  "event": "create|update|delete",
  "collection": {
    "id": "collection_id",
    "name": "collection_name"
  },
  "data": {
    /* dane elementu */
  },
  "timestamp": "2025-03-18T10:59:57+01:00"
}
```

## Uruchamianie aplikacji

Aby uruchomić aplikację w trybie deweloperskim:

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:3000`.

## Licencja

Ten projekt jest oprogramowaniem własnościowym.
