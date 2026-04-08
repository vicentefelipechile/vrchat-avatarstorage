# Kurulum Kılavuzu

<span class="badge badge-blue">Kılavuz</span>

## Ön Koşullar

VRChat avatar geliştirme ortamınızı kurmadan önce aşağıdakilere sahip olduğunuzdan emin olun:

1. Bilgisayarınızda **Unity Hub** kurulu
2. Resmi VRChat web sitesinden indirilmiş **VRChat Creator Companion (VCC)**
3. En az "New User" rütbesinde bir **VRChat hesabı**

## Adım 1: Unity Hub Kurulumu

1. [Resmi Unity web sitesine](https://unity.com/download) gidin ve Unity Hub'ı indirin
2. Unity Hub'ı kurun ve çalıştırın
3. Henüz yoksa bir Unity hesabı oluşturun

> [!NOTE]
> Unity Hub ile ilgili sorunlarınız varsa, [Unity Hub hata düzeltme kılavuzumuza](/wiki?topic=unityhub-error) bakın.

## Adım 2: VRChat Creator Companion Kurulumu

1. VCC'yi [VRChat web sitesinden](https://vrchat.com/home/download) indirin
2. VCC'yi kurun ve açın
3. VCC otomatik olarak VRChat için gereken doğru Unity sürümünü kuracaktır

## Adım 3: Yeni Proje Oluşturma

1. VCC'yi açın
2. "New Project"e tıklayın
3. "Avatar" şablonunu seçin
4. Projeniz için bir konum seçin ve ad verin
5. "Create Project"e tıklayın

## Adım 4: Avatar İçe Aktarma

1. Avatar `.unitypackage` dosyanızı indirin
2. Unity'de `Assets > Import Package > Custom Package` yoluna gidin
3. İndirilen dosyayı seçin
4. İçe aktarma penceresinde "Import"a tıklayın

## Adım 5: VRChat'e Yükleme

1. Unity projenizde avatar prefab'ınızı bulun
2. Sahneye sürükleyin
3. Avatarı seçin ve `VRC Avatar Descriptor` bileşeninin yapılandırıldığından emin olun
4. `VRChat SDK > Show Control Panel` yoluna gidin
5. VRChat kimlik bilgilerinizle giriş yapın
6. "Build & Publish"e tıklayın
