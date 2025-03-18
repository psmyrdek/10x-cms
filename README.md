# 10x CMS

Nowoczesny System Zarządzania Treścią zbudowany z myślą o wydajności i skalowalności.

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
│       └── templating.js # System szablonów
├── index.js          # Główny plik wejściowy aplikacji
├── bower.json        # Konfiguracja zależności frontendowych
├── .bowerrc          # Konfiguracja Bower
└── package.json      # Konfiguracja zależności Node.js
```

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

## Uruchamianie aplikacji

Aby uruchomić aplikację w trybie deweloperskim:

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:3000`.

## Licencja

Ten projekt jest oprogramowaniem własnościowym.
