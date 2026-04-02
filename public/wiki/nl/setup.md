# Installatiehandleiding

<span class="badge badge-blue">Handleiding</span>

## Vereisten
Voordat je begint met het opzetten van je omgeving voor VRChat avatar-ontwikkeling, zorg dat je het volgende hebt:

1. **Unity Hub** geïnstalleerd op je computer
2. **VRChat Creator Companion (VCC)** gedownload van de officiële VRChat-website
3. Een **VRChat-account** met minimaal de rang "New User"

## Stap 1: Unity Hub Installeren
1. Ga naar de [officiële Unity-website](https://unity.com/download) en download Unity Hub
2. Installeer en start Unity Hub
3. Maak een Unity-account aan als je er nog geen hebt

> [!NOTE]
> Als je problemen hebt met Unity Hub, bekijk dan onze [handleiding voor Unity Hub-fouten](/wiki?topic=unityhub-error).

## Stap 2: VRChat Creator Companion Installeren
1. Download de VCC van de [VRChat-website](https://vrchat.com/home/download)
2. Installeer en open de VCC
3. De VCC installeert automatisch de juiste Unity-versie die nodig is voor VRChat

## Stap 3: Een Nieuw Project Maken
1. Open de VCC
2. Klik op "New Project"
3. Selecteer het "Avatar"-template
4. Kies een locatie voor je project en geef het een naam
5. Klik op "Create Project"

## Stap 4: Een Avatar Importeren
1. Download je avatar `.unitypackage`-bestand
2. Ga in Unity naar `Assets > Import Package > Custom Package`
3. Selecteer het gedownloade bestand
4. Klik op "Import" in het importvenster

## Stap 5: Uploaden naar VRChat
1. Zoek in je Unity-project de prefab van je avatar
2. Sleep deze naar de scène
3. Selecteer de avatar en zorg dat het `VRC Avatar Descriptor`-component is geconfigureerd
4. Ga naar `VRChat SDK > Show Control Panel`
5. Log in met je VRChat-gegevens
6. Klik op "Build & Publish"
