# Ticket 2331 - Poprawa odczuwalnej wydajności zarządzania kolekcjami

## Opis problemu

Użytkownicy zgłaszają zauważalne spowolnienie działania aplikacji podczas wykonywania operacji na wybranych kolekcjach treści (dodawanie, usuwanie, edycja).

## Zasięg problemu

Problem wydaje się globalny i dotyczy wszystkich użytkowników.

## Potencjalne przyczyny do zbadania

- Wzrastająca liczba kolekcji i elementów kolekcji.
- Spowolnienia w przypadku elementów z dużą liczbą pól.
- Problemy związane z funkcjonalnością webhooków.

## Działania

- Zidentyfikowanie źródła opóźnień.
- Wdrożenie optymalizacji.
