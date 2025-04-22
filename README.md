# 10xCMS - Fork

![10xCMS](./public/images/banner.png)

Nowoczesny System Zarządzania Treścią zbudowany z myślą o wydajności i skalowalności (i refaktoryzacji).

## Funkcjonalności

### tl;dr

1. Utworzenie kolekcji (definicja typu elementów - np. Artykuł z polami: tytuł, treść, data publikacji)
2. Dodanie elementów do kolekcji (tworzenie elementów - np. Nowy artykuł)
3. Zarządzanie elementami (przeglądanie,edycja, usuwanie)
4. Rejestracja webhooków (reagowanie na zmiany w kolekcji)
5. Udostępnianie kolekcji przez API (automatycznie)

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

Zależności frontendowe zostaną zainstalowane w katalogu `public/vendor`.

## Stack techniczny

- Node.js - środowisko wykonawcze
- Bower - zarządzanie zależnościami frontendowymi
- jQuery & jQuery UI - obsługa interakcji po stronie klienta
- Bootstrap - style komponentów
- Express - framework backendowy
- Multer - obsługa przesyłanych plików
- Mocha & Chai - narzędzia do testowania

## Uruchamianie aplikacji

Aby uruchomić aplikację w trybie deweloperskim:

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:3000`.

## Licencja

Ten projekt jest oprogramowaniem własnościowym.
