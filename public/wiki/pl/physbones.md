# PhysBones

<span class="badge badge-blue">ZALEŻNOŚĆ</span>

## Co to jest?

PhysBones to zbiór komponentów wbudowanych w VRChat SDK, które dodają ruch wtórny (fizykę) do obiektów w awatarach i światach. Za pomocą PhysBones możesz dodać ruch do włosów, ogonów, uszu, ubrań i więcej.

> [!NOTE]
> PhysBones to **oficjalny zamiennik** Dynamic Bones w VRChat.

## Główne Komponenty

| Komponent               | Opis                                                            |
| ----------------------- | --------------------------------------------------------------- |
| **VRCPhysBone**         | Główny komponent definiujący łańcuch bone'ów animowanych fizyką |
| **VRCPhysBoneCollider** | Definiuje kolidery wpływające na PhysBones                      |

## Konfiguracja

### Siły

- **Pull**: Siła przywracająca bone'y do pozycji spoczynkowej
- **Spring/Momentum**: Oscylacja przy próbie osiągnięcia pozycji spoczynkowej
- **Gravity**: Ilość zastosowanej grawitacji
- **Gravity Falloff**: Ile grawitacji jest usuwane w pozycji spoczynkowej

> [!TIP]
> Jeśli twoje włosy są wymodelowane w pozycji, którą chcesz podczas normalnego stania, użyj Gravity Falloff na 1.0.

### Limity

| Typ       | Opis                                    |
| --------- | --------------------------------------- |
| **None**  | Brak limitów                            |
| **Angle** | Ograniczone do maksymalnego kąta od osi |
| **Hinge** | Ograniczone wzdłuż płaszczyzny          |
| **Polar** | Łączy Hinge z Yaw                       |

### Grab & Pose

| Ustawienie         | Opis                                 |
| ------------------ | ------------------------------------ |
| **Allow Grabbing** | Pozwala graczom chwytać bone'y       |
| **Allow Posing**   | Pozwala graczom pozować po chwyceniu |

## Praktyczne Przykłady

### Przykład 1: Długie Włosy

1. Wybierz root bone włosów
2. Dodaj komponent **VRCPhysBone**
3. Skonfiguruj: Pull: 0.3-0.5, Gravity: 0.5-1.0, Radius: 0.05-0.1
4. Dodaj **Limits** typu Angle, aby zapobiec przenikaniu przez głowę

### Przykład 2: Ogon Zwierzęcy

1. Wybierz bazowy bone ogona
2. Dodaj komponent **VRCPhysBone**
3. Skonfiguruj: Pull: 0.2-0.4, Momentum: 0.5-0.7, Gravity: 0.3-0.6

### Przykład 3: Spódnica

1. Wybierz root bone spódnicy
2. Dodaj komponent **VRCPhysBone**
3. Skonfiguruj: Pull: 0.1-0.3, Gravity: 0.8-1.0
4. Dodaj **VRCPhysBoneCollider** do torsu awatara

## Częste Błędy

### PhysBone się nie rusza

- Sprawdź czy Root Transform jest poprawnie przypisany
- Upewnij się, że wartość Pull nie jest 0

### PhysBone przechodzi przez ciało

- Dodaj Limits do komponentu
- Dodaj Collidery do awatara

---

## Odniesienia

VRChat. (2025). _PhysBones_. VRChat Creators. Retrieved from https://creators.vrchat.com/common-components/physbones/
