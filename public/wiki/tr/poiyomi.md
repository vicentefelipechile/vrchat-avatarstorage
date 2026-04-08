# Poiyomi Toon Shader

<span class="badge badge-blue">BAĞIMLILIK</span>

## Nedir?

Poiyomi Toon Shader, VRChat için özel olarak tasarlanmış ücretsiz bir Unity shader'ıdır. Çok yönlülüğü ve kullanım kolaylığı sayesinde VRChat avatarları için **fiili standart** haline gelmiştir [1].

## Ne işe yarar?

- **Stillendirme:** Avatarınızın görünümü üzerinde tam kontrol (renkler, aydınlatma, gölgelendirme).
- **Özel Efektler:** Emisyon, parıltı, outline, dissolve, UV distorsiyonu ve çok daha fazlası.
- **Audiolink:** Avatarınızın bir dünyadaki müziğe görsel tepkisi.
- **Render:** Backface Culling, Stencil, Z-Buffer gibi gelişmiş seçenekler.

## Nasıl Kurulur?

### Yöntem 1: VRChat Creator Companion (Önerilen)

1. **VCC**'yi açın.
2. Projenizi seçin.
3. Küratörlü paketler listesinde **"Poiyomi Toon Shader"** arayın ve **"Add"** tıklayın [2].
4. Unity projenizi açın.

### Yöntem 2: Manuel

1. GitHub veya BOOTH'taki Poiyomi sürüm sayfasına gidin.
2. En son `.unitypackage`'ı indirin.
3. Unity'de `Assets` klasörüne sürükleyin veya `Assets > Import Package > Custom Package` ile içe aktarın.

> [!WARNING]
> Aynı projede **Poiyomi Free** ve **Poiyomi Pro**'yu karıştırmayın. Çakışmaları önlemek için birini seçin ve diğerini kaldırın.

## Sürümler

| Sürüm         | Özellikler                                                                      |
| ------------- | ------------------------------------------------------------------------------- |
| **Free/Toon** | Çoğu kullanıcı için eksiksiz özellik seti. Ücretsiz.                            |
| **Pro**       | Ücretli. Global dissolve, distorsiyon efektleri gibi gelişmiş özellikler ekler. |

## Nasıl Kullanılır?

1. Avatarınızdaki bir materyal seçin (Inspector panelinde).
2. Açılır menüyü kullanarak shader'ı değiştirin: `.poiyomi > Poiyomi Toon`.
3. Bölümleri (Main, Lighting, Emission vb.) ihtiyaçlarınıza göre yapılandırın.

> [!TIP]
> Poiyomi "kilitli" görünüyorsa (üstte bir kilit simgesi ile), materyal optimize modundadır. Kilidini açmak ve düzenlemek için kilit simgesine tıklayın.

---

## Kaynaklar

- Poiyomi. (n.d.). Poiyomi Toon Shader. GitHub. https://github.com/poiyomi/PoiyomiToonShader
- VRChat. (n.d.). VCC Documentation. VRChat Creator Companion. https://vcc.docs.vrchat.com
