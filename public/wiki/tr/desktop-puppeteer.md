# Esska Desktop Puppeteer

<span class="badge">ARAÇ</span>

## Nedir?

**Esska Desktop Puppeteer**, **Esska** tarafından oluşturulan VRChat masaüstü kullanıcıları için gelişmiş bir araçtır. Bilgisayar faresini kullanarak avatarınızın belirli vücut bölümlerini kontrol etmenizi sağlar.

## Ne İşe Yarar?

- **Uzuv Kontrolü:** Avatarınızın kollarını ve ellerini fare ile hassas bir şekilde kontrol edin.
- **Özel Parçalar:** Kulaklar, kuyruklar veya aksesuarlar gibi ek avatar parçalarının kontrolü.
- **Masaüstünde VR Simülasyonu:** Masaüstü kullanıcılarına VR'daki gibi hareket özgürlüğü verir.
- **Head Tracking:** TrackIR cihazlarını destekler.

> [!NOTE]
> Bu araç, masaüstü uygulamasından VRChat istemcinize parametre göndermek için **OSC (Open Sound Control)** kullanır. VRChat Radyal Menüsünde OSC seçeneğinin etkinleştirildiğinden emin olun.

## Nerede Bulunur?

- [BOOTH - Esska Desktop Puppeteer](https://esska.booth.pm/items/6366670)

## Ön Koşullar

- **İşletim Sistemi:** Windows 10 veya Windows 11.
- **Yazılım:** [Microsoft .NET 9.0 Desktop Runtime](https://dotnet.microsoft.com/download/dotnet/9.0)
- **Donanım:** Orta düğmeli fare (kaydırma tekerleği).
- **VRChat SDK:** Unity projenizde kurulu (VCC aracılığıyla).

## Kurulum

### Bölüm 1: Avatar Üzerine (Unity)

1. `.unitypackage` dosyasını Unity projenize aktarın.
2. Prefab'ı `Hierarchy`'de avatarınıza sürükleyin.
3. OSC parametrelerini yapılandırın.
4. Avatarınızı yükleyin.

### Bölüm 2: Masaüstü Uygulaması

1. "Esska Desktop Puppeteer App"ı indirin ve açın.
2. VRChat'te OSC'yi etkinleştirin (`Options` -> `OSC` -> **Enabled**).
3. Fare ve klavye ile avatarınızı kontrol edin.

> [!WARNING]
> Uygulama, VRChat penceresi aktifken çalışması için klavye ve fare girişlerini "dinler" (global hook'lar).

---

## Kaynaklar

- Esska. (n.d.). Esska Desktop Puppeteer. BOOTH. https://esska.booth.pm/items/6366670
