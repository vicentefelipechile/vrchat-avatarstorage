# PhysBones

<span class="badge badge-blue">BAĞIMLILIK</span>

## Nedir?

PhysBones, VRChat SDK'ya yerleşik olarak gelen ve nesnelere ikincil hareket (fizik) ekleyen bileşenler koleksiyonudur. PhysBones ile saç, kuyruk, kulak, kıyafet ve daha fazlasına hareket ekleyebilirsiniz.

> [!NOTE]
> PhysBones, VRChat'teki Dynamic Bones'un **resmi yedeğidir**.

## Ana Bileşenler

| Bileşen                 | Açıklama                                                     |
| ----------------------- | ------------------------------------------------------------ |
| **VRCPhysBone**         | Fizik ile animasyonlu kemik zincirini tanımlayan ana bileşen |
| **VRCPhysBoneCollider** | PhysBones'u etkileyen çarpıştırıcıları tanımlar              |

## Yapılandırma

### Kuvvetler

- **Pull**: Kemikleri dinlenme pozisyonuna geri getirme kuvveti
- **Spring/Momentum**: Dinlenme pozisyonuna ulaşmaya çalışırken salınım
- **Gravity**: Uygulanan yerçekimi miktarı
- **Gravity Falloff**: Dinlenme pozisyonunda ne kadar yerçekiminin kaldırılacağı

> [!TIP]
> Saçınız normal ayaktayken istediğiniz pozisyonda modellenmiş ise, Gravity Falloff'u 1.0 yapın.

### Limitler

| Tür       | Açıklama                             |
| --------- | ------------------------------------ |
| **None**  | Limit yok                            |
| **Angle** | Bir eksenden maksimum açıyla sınırlı |
| **Hinge** | Bir düzlem boyunca sınırlı           |
| **Polar** | Hinge ile Yaw'ı birleştirir          |

### Grab & Pose

| Ayar               | Açıklama                                             |
| ------------------ | ---------------------------------------------------- |
| **Allow Grabbing** | Oyuncuların kemikleri tutmasına izin verir           |
| **Allow Posing**   | Oyuncuların tuttuktan sonra poz vermesine izin verir |

## Pratik Örnekler

### Örnek 1: Uzun Saç

1. Saçın kök kemiğini seçin
2. **VRCPhysBone** bileşenini ekleyin
3. Yapılandırın: Pull: 0.3-0.5, Gravity: 0.5-1.0, Radius: 0.05-0.1

### Örnek 2: Hayvan Kuyruğu

1. Kuyruğun taban kemiğini seçin
2. Yapılandırın: Pull: 0.2-0.4, Momentum: 0.5-0.7, Gravity: 0.3-0.6

### Örnek 3: Etek

1. Eteğin kök kemiğini seçin
2. Yapılandırın: Pull: 0.1-0.3, Gravity: 0.8-1.0
3. Gövdeye **VRCPhysBoneCollider** ekleyin

---

## Kaynaklar

VRChat. (2025). _PhysBones_. VRChat Creators. Retrieved from https://creators.vrchat.com/common-components/physbones/
