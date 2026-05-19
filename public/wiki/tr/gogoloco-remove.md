# Bir Unity Projesinden GoGo Loco Nasıl Kaldırılır

<span class="badge badge-blue">Logic</span>

## Bu nedir?

GoGo Loco, Franada tarafından oluşturulan ve Avatar Descriptor'ın Playable Layer'larından (Base/Locomotion, Additive, Gesture) bazılarını değiştiren ve avatarın Expression Menu'süne kendi parametrelerini ve girdilerini enjekte eden bir hareket (locomotion) prefab'ıdır. Bir avatar projesinin bu kadar çok birbirine bağlı parçasına dokunduğu için tamamen kaldırılması birden fazla katmanda — sahne nesnelerinden proje düzeyindeki asset'lere ve geçerli olduğu durumlarda VPM bildirimine kadar — çalışma gerektirir.

> [!WARNING]
> Bu işleme başlamadan önce daima Unity projenizi yedekleyin (veya sürüm kontrolüne commit edin). Bu adımların birçoğu avatarınızın diğer bölümleriyle paylaşılabilecek Animator Controller'ları ve Expression asset'lerini siler veya üzerine yazar.

## Ne içindir?

- GoGo Loco'yu farklı bir hareket sistemiyle değiştirmek (örn. Modular Avatar Locomotion, WetCat's Locomotion Fix veya VRChat varsayılan controller'ları).
- GoGo Loco önceden yüklenmiş olarak gelen ancak bunu istemediğiniz satın alınmış bir avatarı temizlemek.
- GoGo Loco'nun katman ve parametre adlarını paylaşan NSFW Locomotion veya diğer paketlerle çakışmaları çözmek.
- Parametre bellek kullanımını azaltmak (GoGo Loco varsayılan olarak 16–17 bit senkronize bellek kullanır).

## Adım 1: Prefab'ı Sahnede Silin

GoGo Loco, özellikle VRCFury veya Modular Avatar aracılığıyla kurulduğunda, avatar kökünde alt bir GameObject olarak yüklenebilir.

1. Avatarınızı içeren sahneyi **Hierarchy** penceresinde açın.
2. Avatarın kök GameObject'ini genişletin.
3. `GoGo Loco`, `GGL`, `GoGoLoco` veya benzeri bir ad taşıyan alt nesneleri arayın. Onu seçin ve **Delete** tuşuna basın.
4. GoGo Loco [VRCFury](/wiki?topic=vrcfury) aracılığıyla yüklendiyse, bir GoGo Loco prefab'ına başvuran bir `VRCFury` bileşenine sahip bir alt nesne arayın — bu nesneyi de silin.
5. [Modular Avatar](/wiki?topic=modular-avatar) aracılığıyla yüklendiyse, GoGo Loco varlıklarını gösteren bir `MA Merge Animator` veya `MA Menu Installer` bileşenine sahip bir alt nesne arayın ve silin.

> [!NOTE]
> Avatar satın alındıysa ve GoGo Loco kalıcı olarak yerleşikse (yani ayrı bir alt GameObject yoksa), bu adımı atlayın ve doğrudan 2. Adıma geçin.

## Adım 2: Avatar Descriptor'ın Playable Katmanlarını Geri Yükle

GoGo Loco, `VRCAvatarDescriptor` bileşenindeki beş Playable Layer'dan üçüne kadarını değiştirir. Bunların her birini varsayılan VRChat kontrolörlerine veya kendi özel kontrolörlerinize yeniden atamanız gerekir.

1. Hierarchy'de avatar kökünü seçin ve Inspector'daki **VRC Avatar Descriptor** bileşenini bulun.
2. **Playable Layers** bölümünü genişletin.
3. Aşağıdaki katmanların her biri için şu anda bir GoGo Loco kontrolörü atanıp atanmadığını kontrol edin (dosya adları `go_` ile başlar veya `GoGoLoco/GGL` içerir):

| Katman | GoGo Loco dosya adı (yaklaşık) | Varsayılan Değiştirme |
| :------------ | :--------------------------------- | :---------------------------------------------------- |
| **Base** | `go_locomotion` | `vrc_AvatarV3LocomotionLayer` (VRCSDK örneklerinden) |
| **Additive** | `go_additive` | `vrc_AvatarV3IdleLayer` (VRCSDK örneklerinden) |
| **Gesture** | `go_gesture` | `vrc_AvatarV3HandsLayer` (VRCSDK örneklerinden) |

4. Etkilenen her katman için alanın sağındaki küçük daireye tıklayın ve uygun VRChat varsayılan kontrolörünü atayın veya kendi özel kontrolörünüzü atayın.
5. Projenizde varsayılan VRChat kontrolörleriniz yoksa, bunlar `Assets/VRCSDK/Examples3/Animation/Controllers/` altında bulunabilir.

> [!TIP]
> Avatarınız GoGo Loco eklenmeden önce özel el hareketlerine sahipse, burada VRChat varsayılanı yerine orijinal Gesture katmanı kontrolörünüzü geri yüklemelisiniz — bunun için sürüm kontrolünüzü veya yedeklerinizi kontrol edin.

## Adım 3: FX Denetleyicisi'nden GoGo Loco Katmanlarını Kaldır

Uçma özelliği için GoGo Loco, avatarın FX Animator Controller'ına iki ek katman birleştirir. Bunlar, prefab silindikten sonra bile kalır ve manuel olarak kaldırılmalıdır.

1. Project penceresinde avatarınızın FX Animator Controller'ını bulun ve **Animator** penceresini açmak için çift tıklayın.
2. Sol taraftaki **Layers** panelinde `GoGo Fly`, `GoGo Freeze` adlı katmanları veya adı `go_` ile başlayan herhangi bir katmanı arayın.
3. Her GoGo Loco katmanına sağ tıklayın ve **Delete Layer**'ı seçin.
4. Aynı Animator penceresinde **Parameters** sekmesine tıklayın.
5. GoGo Loco'ya ait her parametreyi kaldırın. Yaygın olanlar şunlardır:

| Parametre adı | Tür |
| :-------------- | :------ |
| `Go/Freeze` | Bool |
| `Go/Fly` | Bool |
| `Go/Loco` | Bool |
| `Go/Crouch` | Bool |
| `Go/Prone` | Bool |
| `Go/Pose` | Int |
| `Go/PlaySpace` | Float |
| `VelocityMagnitude` | Float |

`go_` veya `Go/` ile başlayan parametreler GoGo Loco parametreleridir. Hepsini kaldırın. `VelocityY`, `VRCFaceBlendH`, `Grounded` gibi parametreler standart VRChat yerleşik parametreleridir — onları **kaldırmayın**.

> [!CAUTION]
> Halen kalan bir animasyon durumu veya geçişi tarafından başvurulan bir parametreyi silmek, bu durumları bozacaktır. Bir parametreyi kaldırmadan önce her zaman GoGo Loco olmayan hiçbir katmanın bu parametreye bağımlı olmadığını doğrulayın.

## Adım 4: Expression Parameters Varlığını Temizle

GoGo Loco, senkronize belleği tüketerek parametrelerini avatarın `VRCExpressionParameters` varlığına ekler. Geride bırakılan her GoGo Loco parametresi bit israfına neden olur.

1. Project penceresinde, Avatar Descriptor'da **Expression Parameters** alanına atanan `.asset` dosyasını bulun.
2. Onu seçin ve Inspector'daki parametre listesine bakın.
3. Bir GoGo Loco parametresine karşılık gelen her girdiyi silin (Adım 3'te listelenenlerle aynı isimler).
4. Inspector'ın altında gösterilen **Total Cost**'un (Toplam Maliyet) kaldırmadan sonra düştüğünü onaylayın.

## Adım 5: GoGo Loco Menü Girişini Kaldır

GoGo Loco, avatarın kök Expression Menu'süne bir alt menü girdisi ekler.

1. Avatar Descriptor'da **Expressions Menu** alanına atanan `.asset` dosyasını bulun.
2. Onu seçin ve **Controls** listesini inceleyin.
3. `GoGo Loco`, `GGL`, `Loco` veya GoGo Loco alt menü varlığına bağlanan benzer adlı girdileri silin.
4. Kalan her alt menüyü yinelemeli olarak açın ve içine yerleştirilmiş tüm GoGo Loco kontrol girdilerini kaldırın.

## Adım 6: GoGo Loco Varlık Dosyalarını Projeden Sil

GoGo Loco avatar ile bağlantısını kestikten sonra, `Assets/` klasörünü temiz tutmak için dosyalarını Unity projesinden kaldırın.

1. Project penceresinde, arama çubuğunu kullanarak `go_` aratın (arama kapsamının **All** olarak ayarlandığından emin olun).
2. Sonuçları inceleyin — `go_` ile başlayan dosyalar neredeyse her zaman GoGo Loco varlıklarıdır (Animation Clips, Animator Controllers, Textures, menü ikonları için Materials).
3. Ayrıca tam adı kullanan dosyaları yakalamak için `GoGoLoco` ve `GGL` aratın.
4. Doğrulanan tüm GoGo Loco varlıklarını seçin ve **Delete** tuşuna basın (veya sağ tık → **Delete**).
5. Unity, silme işlemini onaylamanızı isteyecektir. Kabul edin.

> [!WARNING]
> Kendi projenize aitlerse adları `go_` ile başlayan asset'leri silmeyin (örn. bu şekilde adlandırdığınız bir GameObject veya animasyon). Silmeden önce her dosyayı inceleyin.

GoGo Loco dosyaları için yaygın klasör konumları:

- `Assets/GoGoLoco/`
- `Assets/Franada/GoGoLoco/`
- `Assets/GoGo Loco/`
- Satın alınan bir avatarın `.unitypackage` paketini açmış olabileceği herhangi bir yer.

İçerilen tüm dosyaların GoGo Loco'ya ait olduğu onaylandıktan sonra klasörün tamamını silin.

## Adım 7: VPM Paketini Kaldır (Yalnızca VCC Kurulumu)

GoGo Loco VRChat Creator Companion aracılığıyla bir VPM paketi olarak yüklendiyse, paket dosyaları `Assets/` yerine `Packages/` dizininde yaşar ve VCC veya bildirim aracılığıyla kaldırılmalıdır.

### Seçenek A — VCC Arayüzü İle

1. **VRChat Creator Companion** uygulamasını açın.
2. **Projects** sekmesinden projenize gidin ve **Manage Project** butonuna tıklayın.
3. Paket listesinde `GoGoLoco`yu bulun (paket kimliği `com.franada.gogoloco` veya benzeri).
4. **Eksi (−)** düğmesine tıklayın veya sürüm açılır menüsünü **Remove** (Kaldır) olarak ayarlayın ve uygulayın.
5. Projeyi Unity'de yeniden açın. Çözücü (Resolver) kaldırmayı algılayacak ve `Packages/` klasörünü temizleyecektir.

### Seçenek B — `vpm-manifest.json` İle (manuel)

1. Unity'yi kapatın.
2. `<Projeniz>/Packages/vpm-manifest.json` dosyasını bir metin düzenleyicide açın.
3. GoGo Loco girdisini hem `"dependencies"` hem de `"locked"` nesnelerinden silin.
4. Fiziksel klasörü silin: `<Projeniz>/Packages/com.franada.gogoloco/` (veya eşdeğeri).
5. Unity'yi yeniden açın. Çözücü (Resolver) yeniden tarama yapacak ve eksik paket olmadığını doğrulayacaktır.

> [!NOTE]
> VPM paketini kaldırmak, kurulum sırasında eklenen katmanları, parametreleri, menüleri veya prefab alt nesnelerini otomatik olarak geri almaz. Adım 1-6, hangi kurulum yöntemi kullanılmış olursa olsun tamamlanmalıdır.

## Adım 8: Force Locomotion'ı Yeniden Etkinleştir (Gerekirse)

GoGo Loco kurulduğunda, özel Locomotion katmanı izleme modlarını kendi içinde işlediği için tipik olarak Avatar Descriptor'daki **Force Locomotion animations for 6-point tracking** seçeneğinin işaretini kaldırır. Kaldırma işleminden sonra varsayılan davranışı geri yüklemek isteyebilirsiniz.

1. Avatar kökünü seçin ve Inspector'daki **VRC Avatar Descriptor** bileşenini açın.
2. **IK** bölümüne ilerleyin.
3. Varsayılan VRChat Locomotion kontrolörünü kullanıyorsanız **Force Locomotion animations for 6 point tracking** onay kutusunu yeniden etkinleştirin.

> [!TIP]
> Tam gövde izleme (Full-Body Tracking - FBT) kullanmıyorsanız, bu onay kutusunun görünür bir etkisi yoktur ve herhangi bir durumda bırakılabilir.

## Doğrulama Kontrol Listesi

Avatarı yüklemeden önce aşağıdakilerin tümünü onaylayın:

| Kontrol | Nasıl Doğrulanır |
| :---------------------------------------- | :--------------------------------------------------- |
| Hierarchy'de GoGo Loco alt nesnesi yok | Unity sahnesindeki avatar hiyerarşisini inceleyin |
| Playable Layers doğru controller'lara işaret ediyor | VRC Avatar Descriptor → Playable Layers bölümü |
| FX controller'ında `go_` katmanları yok | FX Animator Controller'ı açın → Layers paneli |
| FX'te `go_` / `Go/` parametreleri yok | FX Animator Controller'ı açın → Parameters paneli |
| Expression Parameters içinde GoGo Loco girdisi yok | Inspector'da `.asset` dosyasını inceleyin |
| Expression Menu içinde GoGo Loco girdisi yok | Kök menü `.asset` dosyasını yinelemeli inceleyin |
| `Assets/` içinde GoGo Loco dosyaları yok | Project penceresinde `go_`, `GoGoLoco`, `GGL` aratın |
| `vpm-manifest.json` içinde GoGo Loco paketi yok | Dosyayı bir metin düzenleyicide açıp `gogoloco` aratın |
| Force Locomotion ayarı istenildiği gibi yapılmış | VRC Avatar Descriptor → IK bölümü |

## Özet Tablosu

| GoGo Loco Ne Ekler | Nereden Kaldırılır |
| :---------------------------------------------- | :------------------------------------------------ |
| Avatar kökünde Child Prefab/GameObject | Unity Hierarchy → child nesneyi silin |
| Base, Additive, Gesture Playable Layers | VRC Avatar Descriptor → Playable Layers |
| FX Katmanları (`GoGo Fly`, `GoGo Freeze`, `go_*`) | FX Animator Controller → Layers paneli |
| FX Parametreleri (`Go/*`, `VelocityMagnitude`, vb.) | FX Animator Controller → Parameters paneli |
| Expression Parameters girdileri | VRCExpressionParameters `.asset` → Controls listesi |
| Expression Menu alt menü girdisi | VRCExpressionsMenu `.asset` → Controls listesi |
| Asset dosyaları (`go_*.anim`, kontrolörler, textürler) | Project penceresi → GoGoLoco klasörünü silin |
| VPM paket girdisi | VCC GUI veya `vpm-manifest.json` |
| İşaretsiz Force Locomotion | VRC Avatar Descriptor → IK bölümü (geri yükle) |

## Kaynaklar

* Jellejurre, JustSleightly. (2024). _Playable Layers_. VRC School. https://vrc.school/docs/Avatars/Playable-Layers
* Shadsterwolf. (2023). _ShadstersAvatarTools — README_. GitHub. https://github.com/Shadsterwolf/ShadstersAvatarTools
* Franada. (2023). _gogoloco-legacy — Releases_. GitHub. https://github.com/Franada/gogoloco-legacy/releases
* VRChat. (2024). _CLI — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/vpm/cli/
* VRChat. (2024). _Community Repositories — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/guides/community-repositories/
* VRChat Wiki Contributors. (2025). _Community:GoGo Loco_. VRChat Wiki. https://wiki.vrchat.com/wiki/Community:GoGo_Loco
* LastationVRChat. (2024). _NSFW-Locomotion — README_. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion
