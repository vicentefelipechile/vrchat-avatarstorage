# Gesture Manager Emulator

<span class="badge badge-purple">Araç</span> <span class="badge badge-blue">İş Akışı</span>

## Gesture Manager Nedir?

**Gesture Manager**, **BlackStartx** tarafından geliştirilen VRChat avatar oluşturucuları için temel bir araçtır. Bir avatarın animasyonlarını, jestlerini ve menülerini doğrudan Unity'de önizlemenizi ve düzenlemenizi sağlar [1].

VRChat'in animasyon sistemini, **Radyal Menü (Expressions Menu)** dahil olmak üzere neredeyse tamamen simüle eder.

---

## Kurulum

### Yöntem 1: VRChat Creator Companion (Önerilen)

1. **VCC**'yi açın.
2. Projenizi seçin.
3. **"Gesture Manager"** arayın ve **"Add"** tıklayın.
4. Unity projenizi açın.

### Yöntem 2: Manuel

1. BlackStartx'in GitHub'ından `.unitypackage` dosyasını indirin [3].
2. Unity'de içe aktarın (`Assets > Import Package > Custom Package`).

---

## Temel Özellikler

- **Radial Menu 3.0:** VRChat ifade menüsünü sadık bir şekilde yeniden oluşturur.
- **Jest Emülasyonu:** Inspector'daki düğmelerle el jestlerini test edin.
- **Contact Testi:** Fare tıklamasıyla _VRCContacts_'ı etkinleştirin.
- **Parametre Hata Ayıklama:** Tüm parametreleri ve mevcut değerlerini gösterir.

---

## Nasıl Kullanılır

1.  `Tools > Gesture Manager Emulator` yoluna gidin.
2.  Hiyerarşiye bir `GestureManager` nesnesi eklenecektir.
3.  Unity'de **Play Mode**'a girin.
4.  `GestureManager` nesnesini seçin.
5.  **Inspector**'da radyal menüyü ve tüm kontrolleri göreceksiniz.

> [!IMPORTANT]
> Unity çalışırken kontrolleri görmek için `GestureManager` nesnesini seçili tutmalısınız.

---

## Kaynaklar

- BlackStartx. (n.d.). VRC-Gesture-Manager. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager
- VRChat. (n.d.). VCC Documentation. VRChat Creator Companion. https://vcc.docs.vrchat.com
