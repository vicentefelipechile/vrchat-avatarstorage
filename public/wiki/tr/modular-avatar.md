# Modular Avatar

<span class="badge badge-blue">BAĞIMLILIK</span>

## Nedir?

**Modular Avatar** (MA), VRChat avatarlarına **tahribatsız** bir şekilde ek bileşenler oluşturmanızı ve kurmanızı sağlayan ücretsiz ve açık kaynaklı bir Unity araç setidir [1].

Kıyafetleri, aksesuarları, animasyonları ve menüleri bağımsız modüller olarak avatarınıza "ekleyebileceğiniz" bir sistem olarak düşünün. Avatarı yüklerken MA her şeyi otomatik olarak birleştirir.

## Ne İşe Yarar?

- **Kıyafet ve aksesuar kurulumu:** MA için hazırlanmış bir prefab'ı avatarınızın çocuğu olarak sürükleyin.
- **Yeniden kullanılabilir bileşenler oluşturma:** Kaynak oluşturucular için.
- **Otomatik birleştirme:** Animator Controller, BlendTree, radyal menü ve parametreleri yönetir.

## VRCFury ile Farkı

| Özellik       | Modular Avatar                    | VRCFury                                            |
| :------------ | :-------------------------------- | :------------------------------------------------- |
| **Yaklaşım**  | Unity için modüler bileşenler     | "Hepsi bir arada" araç seti                        |
| **Odak**      | İskelet ve controller birleştirme | Birleştirme + ekstra özellikler (SPS, Toggle, vb.) |
| **Uyumluluk** | Japon topluluğu standardı         | Batı topluluğunda çok popüler                      |

> [!NOTE]
> Çoğu durumda **her iki aracı da aynı projede sorunsuz** kullanabilirsiniz.

## Nasıl Kurulur?

1. **VCC**'yi açın.
2. **Settings** -> **Packages** -> **Add Repository** yoluna gidin.
3. Modular Avatar deposunu ekleyin ([modular-avatar.nadena.dev](https://modular-avatar.nadena.dev/)).
4. Paket listesinden **Modular Avatar**'ı kurun.

## Nasıl Çalışır?

1. MA uyumlu bir kaynak indirin.
2. Unity'de içe aktarın.
3. Prefab'ı `Hierarchy`'de avatarınızın çocuğu olarak sürükleyin.
4. Avatarınızı yükleyin. MA her şeyi otomatik birleştirir [2].

### Temel bileşenler (oluşturucular için)

- **MA Merge Armature:** İskeletleri otomatik birleştirir.
- **MA Menu Installer:** Menüleri radyal menüye ekler.
- **MA Parameters:** Eklenecek parametreleri tanımlar.
- **MA Merge Animator:** Animator Controller'ları birleştirir.
- **MA Bone Proxy:** Bir nesneyi belirli bir kemiğe bağlar.

---

## Kaynaklar

- bd\_. (n.d.). Modular Avatar. https://modular-avatar.nadena.dev/
- bd\_. (n.d.). Modular Avatar Documentation. https://modular-avatar.nadena.dev/docs/intro
