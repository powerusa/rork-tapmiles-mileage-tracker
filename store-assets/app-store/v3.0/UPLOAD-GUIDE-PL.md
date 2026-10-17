# TapMiles 3.0 — paczka do App Store

Gotowe materiały w języku **English (U.S.)**. Screenshoty pokazują prawdziwe ekrany TapMiles 3.0 z fikcyjnymi danymi demonstracyjnymi. Nie zostały w nich dorysowane funkcje aplikacji. Nagłówki i oprawa graficzna znajdują się poza ekranem aplikacji.

## Co wgrać w App Store Connect

Otwórz istniejącą aplikację → wersja iOS **3.0.0** → lokalizacja **English (U.S.)** → App Previews and Screenshots / Media Manager. W każdej grupie zachowaj kolejność plików `01`–`06`.

| Katalog | Wymiary | Miejsce w Apple |
|---|---:|---|
| `iphone-medium-1206x2622` | 1206 × 2622 | iPhone with Dynamic Island — medium display; aktualny wymagany rozmiar iPhone’a |
| `iphone-large-1320x2868` | 1320 × 2868 | iPhone with Dynamic Island — large display; dodatkowy duży format |
| `ipad-13-2064x2752` | 2064 × 2752 | iPad 13-inch display; wymagany, ponieważ aplikacja obsługuje iPada |

Każdy katalog zawiera sześć finalnych PNG bez kanału alpha, w przestrzeni sRGB.

Jeżeli panel Apple posługuje się starszymi etykietami w calach, wybierz odpowiadającą grupę według akceptowanych wymiarów. Nie wgrywaj wszystkich 18 plików do jednej grupy.

## Kolejność screenshotów

1. **Every mile. Clearly logged.** — start przejazdu jednym dotknięciem.
2. **Your drive. Live on screen.** — aktywne śledzenie, czas, dystans i prędkość.
3. **Your mileage. Made clear.** — raport i eksport PDF/CSV.
4. **Every drive. In its place.** — historia oraz kategorie przejazdów.
5. **Small details. A clearer record.** — szczegóły, projekt, samochód i notatka.
6. **Your setup. Your way.** — ustawienia, jednostki, projekty i pojazdy.

Pierwsze trzy dobrano z myślą o wynikach wyszukiwania. Apple może wyświetlać pierwsze 1–3 screenshoty, gdy aplikacja nie ma app preview. Osobny screenshot wyników wyszukiwania nie jest wymaganym polem uploadu.

## Teksty do przeklejenia

Katalog `metadata` zawiera oddzielny plik `.txt` dla każdego pola oraz zbiorcze `APP-STORE-COPY.md`.

- Nazwa: **TapMiles: Mileage Tracker** — 25/30 znaków.
- Podtytuł: **Drive Log, PDF & CSV Reports** — 28/30 znaków.
- Keywords: `keywords.txt` — 95/100 znaków.
- Promotional text: `promotional_text.txt` — 139/170 znaków.
- Opis: `description.txt` — 1552/4000 znaków.
- Co nowego: `whats_new.txt` — 380/4000 znaków.
- Notatki dla review: `review_notes.txt`.
- Sugerowana kategoria główna: **Business**; dodatkowa: **Travel**.

Zachowaj istniejący Support URL, Privacy Policy URL oraz dane właściciela aplikacji. Paczka nie zgaduje tych danych ani odpowiedzi App Privacy. Nie dodaje informacji o płatnościach, subskrypcjach, ocenach ani pozycji w rankingu.

## Ikona

`App-Icon-1024.png` to istniejąca ikona aplikacji wyeksportowana w 1024 × 1024 bez przezroczystości. Zachowano obecny branding. Standardowa ikona App Store pochodzi z przesyłanego builda; ten plik jest kopią referencyjną, a nie kolejnym screenshotem.

## Materiały dodatkowe — nie wgrywać jako screenshoty

- `extras/TapMiles-promotional-header-2400x1200.png` — banner/header do promocji, strony lub social media. Zwykła strona produktu w App Store Connect nie ma osobnego wymaganego pola na taki banner.
- `extras/Search-results-screenshot-preview.png` — podgląd pierwszych trzech kadrów. Nie udaje rzeczywistej pozycji w wynikach wyszukiwania ani zatwierdzonej strony Apple.
- `extras/Contact-sheet-iPhone.png` — podgląd całego zestawu.

## Źródła i odtwarzanie

W repozytorium pozostawiono oryginalne captures w `raw`, edytowalne projekty SVG w `design` i skrypty w `scripts` na poziomie głównym repozytorium. PNG są renderowane z wektorowej oprawy zawierającej niezmienione screenshoty aplikacji.

Demonstracyjne trasy pochodzą z dedykowanych symulatorów „TapMiles App Store iPhone” oraz „TapMiles App Store iPad”. Skrypt danych odmawia zmiany zwykłego symulatora użytkownika. Oba dodatkowe symulatory wyłączono po wykonaniu ujęć.

## Oficjalne źródła Apple — sprawdzone 17 października 2026

- Wymiary, wymagane urządzenia i brak alpha: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- Pola strony produktu i screenshoty w wynikach: https://developer.apple.com/app-store/product-page/
- Limity keywords i zasady wyszukiwania: https://developer.apple.com/app-store/search/

Przygotowanie materiałów nie jest publikacją ani przesłaniem aplikacji do review. Wersja 3.0.0 nadal wymaga wybrania właściwego builda i uzupełnienia istniejących danych App Store Connect.
