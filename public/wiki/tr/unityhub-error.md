# Unity Hub Hata Düzeltme

Unity Hub açılmıyorsa, sonsuz yükleme ekranında takılıyorsa veya giriş hataları programa erişmenizi engelliyorsa, en etkili çözüm **temiz bir yeniden kurulum** yapmaktır.

## Yöntem 1: Temiz Yeniden Kurulum

### 1. Unity Hub'ı Kaldırın

> [!WARNING]
> Bu adım için **resmi Windows kaldırıcısını** kullanmalısınız (_Ayarlar -> Uygulamalar_ veya _Denetim Masası_). IObit Uninstaller, Revo Uninstaller gibi **üçüncü taraf programları KULLANMAYIN**.

- **Windows Ayarları** -> **Uygulamalar** yoluna gidin.
- Listede "Unity Hub" bulun ve **Kaldır** tıklayın.

### 2. Kalan Dizinleri Silin

Windows Dosya Gezgini'ni açın, aşağıdaki adresleri üst çubuğa yapıştırın ve Enter'a basın. **Klasör varsa tamamen silin:**

- `C:\Program Files\Unity`
- `C:\Program Files\Unity Hub`
- `%USERPROFILE%\AppData\Roaming\Unity`
- `%USERPROFILE%\AppData\Roaming\Unity Hub`
- `%USERPROFILE%\AppData\Local\Unity`
- `%USERPROFILE%\AppData\Local\Unity Hub`

### 3. Unity Hub'ı Yeniden Kurun

1. [Resmi Unity web sitesine](https://unity.com/download) gidin ve en son Unity Hub sürümünü indirin.
2. Yükleyiciyi çalıştırın ve normal adımları izleyin.
3. Her şeyin düzgün kurulmasını bekleyin, tekrar giriş yapın ve hatanın çözüldüğünü onaylayın.
