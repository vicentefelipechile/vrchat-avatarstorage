# Avatar Parametreleri (Expression Parameters)

<span class="badge badge-blue">Mantık</span> <span class="badge badge-yellow">Optimizasyon</span>

## Nedir?

**Expression Parameters**, VRChat avatarınızın "hafızası" olarak görev yapan değişkenlerdir [1]. **Expressions Menu** ile **Animator Controller** arasında köprü görevi görürler.

## Parametre Türleri

| Tür       | Açıklama                         | Bellek Maliyeti | Yaygın Kullanım                       |
| :-------- | :------------------------------- | :-------------- | :------------------------------------ |
| **Bool**  | Doğru veya Yanlış (Açık/Kapalı). | 1 bit           | Basit toggle'lar (kıyafet, prop).     |
| **Int**   | Tam sayılar (0 ila 255).         | 8 bit           | Çoklu seçenekli kıyafet değişimi.     |
| **Float** | Ondalık sayılar (0.0 ila 1.0).   | 8 bit           | Sürekli kaydırıcılar (kalınlık, ton). |

## Bellek Sınırı (Synced Bits)

VRChat, avatar başına **256 bit** senkronize veri limiti uygular [2].

- **Senkronize:** Değerleri diğer oyunculara gönderilen parametreler.
- **Senkronize Olmayan (Yerel):** Yalnızca sizin PC'nizde var olan parametreler.

> [!WARNING]
> Bellek sınırını aşarsanız, avatarı yükleyemez veya ekstra parametreler çalışmayı durdurur.

## Optimizasyon

#### "Tek Int" Hilesi

10 farklı tişörtünüz olduğunu düşünün.

- **Verimsiz (Bool):** 10 `Bool` parametresi. _Maliyet:_ 10 bit.
- **Verimli (Int):** 1 `Int` parametresi `Top_Clothing`. _Maliyet:_ 8 bit — ve **255 tişörte** kadar olabilir!

> [!NOTE]
> **Altın Kural:** 8'den fazla birbirini dışlayan seçeneğiniz varsa `Int` kullanın. 8'den azsa bireysel `Bool` kullanın.

## Özet Tablo

| Kullanım Durumu                          | Önerilen Tür | Neden?                         |
| :--------------------------------------- | :----------- | :----------------------------- |
| **1 nesne toggle'ı** (Gözlük, şapka)     | `Bool`       | Basit. 1 bit maliyetli.        |
| **Kıyafet Seçici** (Tişört A, B, C...)   | `Int`        | 8 bit için yüzlerce seçenek.   |
| **Kademeli Değişimler** (Kalınlık, Renk) | `Float`      | Ondalık değerler için gerekli. |
| **Karmaşık Durumlar** (Danslar, AFK)     | `Int`        | Durum makineleri için ideal.   |

---

## Kaynaklar

- VRChat. (n.d.). Expression Parameters. VRChat Documentation. https://creators.vrchat.com/avatars/animator-parameters/#expression-parameters-asset
- VRChat. (n.d.). Avatar Parameter Driver. VRChat Documentation. https://creators.vrchat.com/avatars/state-behaviors/#avatar-parameter-driver
