# Eylem Menüsü

<span class="badge badge-blue">Mantık</span> <span class="badge badge-purple">İş Akışı</span>

## Giriş

**Eylem Menüsü** (Expression Menu olarak da bilinir), VRChat'te animasyonları etkinleştirmek, kıyafet değiştirmek veya avatar parametrelerini değiştirmek için kullandığınız radyal menüdür [1].

---

## Simülasyon Araçları

### 1. Gesture Manager (BlackStartx)

Radyal menüyü görselleştirmek için en popüler araç.

> [!NOTE]
> Ayrıntılı kurulum ve tüm özellikleri için makalemize bakın: **[Gesture Manager Emulator](/wiki?topic=gesture-manager-emulator)**.

### 2. Avatars 3.0 Emulator (Lyuma)

Daha teknik ve güçlü, karmaşık mantık hata ayıklaması için ideal.

- **Nasıl kullanılır:**
  1.  `Tools` > `Avatar 3.0 Emulator` yoluna gidin.
  2.  **Play Mode**'da bir kontrol paneli oluşturulur.
  3.  [Parametre](/wiki?topic=parameter) değerlerini zorlamanızı sağlar.

---

## Hangisini Seçmeli?

| Özellik                  | Gesture Manager   | Av3 Emulator                  |
| :----------------------- | :---------------- | :---------------------------- |
| **Görsel Arayüz**        | Mükemmel (Radyal) | Temel (Düğmeler/Kaydırıcılar) |
| **Menü Testi**           | Evet              | Sınırlı                       |
| **Mantık Hata Ayıklama** | Temel             | Gelişmiş                      |

**Öneri:** Çoğu test için **Gesture Manager** kullanın. Animasyonlar çalışmadığında **Av3 Emulator** kullanın.

---

## Build & Test

Ağ özelliklerini test etmeniz gerekiyorsa, resmi SDK'nın **Build & Test** özelliğini kullanın [1]:

1.  `VRChat SDK Control Panel`'i açın.
2.  `Build & Test`'e tıklayın.
3.  Unity avatarı derler ve yerel bir VRChat örneği açar.

---

## Kaynaklar

- VRChat. (n.d.). Expression Menu and Controls. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls
- BlackStartx. (n.d.). VRC-Gesture-Manager. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager
- Lyuma. (n.d.). Av3Emulator. GitHub. https://github.com/lyuma/Av3Emulator
