# SPS (Super Plug Shader)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## Nedir?
**SPS** (Super Plug Shader), **VRCFury** ekibi tarafından tasarlanan VRChat için ücretsiz ve modern bir mesh deformasyon sistemidir [1].

## Ne İşe Yarar?
- **Gerçekçi Deformasyon:** Penetrasyon ve fiziksel temas simülasyonu.
- **Optimizasyon:** Eski sistemlerden daha hafif ve verimli.
- **Ücretsiz:** DPS'in aksine tamamen ücretsiz ve açık kaynak.
- **Uyumluluk:** Çoğu modern shader ile çalışır.

## Kurulum

### Adım 1: VRCFury Kurulumu
VCC aracılığıyla VRCFury'yi kurun.

### Adım 2: Socket Oluşturma (Açıklık)
1. Unity'de `Tools` > `VRCFury` > `SPS` > `Create Socket` yoluna gidin.
2. Avatarınızın hiyerarşisinde uygun kemiğin çocuğu yapın.
3. Açıklığın girişine konumlandırın.

> [!TIP]
> Socket'ları avatarın çok derinlerine yerleştirmeyin. Girişte veya biraz dışarıda yerleştirin.

### Adım 3: Plug Oluşturma (Penetratör)
1. Mesh'in dinlenme pozisyonunda "düz" olduğundan emin olun.
2. `Tools` > `VRCFury` > `SPS` > `Create Plug` yoluna gidin.
3. Taban kemiğinin çocuğu yapın.

### Adım 4: Unity'de Test
1. VCC'den **Gesture Manager**'ı kurun.
2. **Play Mode**'a girin.
3. VRCFury otomatik olarak bir test menüsü oluşturur.

> [!WARNING]
> SPS'in deforme ettiği aynı kemiklerde Unity Constraints kullanmaktan kaçının — jitter'a neden olabilir.

---

## Kaynaklar

* VRCFury. (n.d.). SPS (Super Plug Shader). VRCFury Documentation. https://vrcfury.com/sps
* VRCFury. (n.d.). Download & Install. VRCFury Documentation. https://vrcfury.com/download
