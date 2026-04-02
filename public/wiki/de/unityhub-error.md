# Unity Hub Fehler beheben

Wenn sich Unity Hub nicht öffnet, in einem endlosen Ladebildschirm hängen bleibt oder Anmeldefehler auftreten, die dich an der Nutzung des Programms hindern, ist die effektivste Lösung eine **saubere Neuinstallation**.

So löschst du alle temporären Dateien und beschädigten Einstellungen.

## Methode 1: Saubere Neuinstallation (Alle Spuren entfernen)

Befolge diese Schritte sorgfältig, damit Unity Hub wieder funktioniert:

### 1. Unity Hub deinstallieren
> [!WARNING]
> Warnung
> Für diesen Schritt musst du den **offiziellen Windows-Deinstallierer** verwenden (über *Einstellungen -> Apps* oder *Systemsteuerung*). Verwende **KEINE Drittanbieter-Programme** wie IObit Uninstaller, Revo Uninstaller usw., da diese notwendige Registry-Schlüssel löschen und das Problem verschlimmern können.

- Gehe zu **Windows-Einstellungen** -> **Apps**.
- Finde „Unity Hub" in der Liste und klicke auf **Deinstallieren**.

### 2. Restliche Verzeichnisse löschen
Auch nach der Deinstallation hinterlässt Unity versteckte Konfigurations- (Cache-) Ordner auf deinem System. Du musst sie manuell finden und löschen.

Öffne den Windows-Datei-Explorer, kopiere jede der folgenden Adressen in die obere Leiste und drücke Enter. **Wenn der Ordner existiert, lösche ihn vollständig:**

- `C:\Program Files\Unity`
- `C:\Program Files\Unity Hub`
- `%USERPROFILE%\AppData\Roaming\Unity`
- `%USERPROFILE%\AppData\Roaming\Unity Hub`
- `%USERPROFILE%\AppData\Local\Unity`
- `%USERPROFILE%\AppData\Local\Unity Hub`

*(Hinweis: Du kannst den `%USERPROFILE%`-Pfad direkt in die Explorer-Leiste kopieren und einfügen, genau wie du `%appdata%` zum Installieren von Minecraft-Mods verwenden würdest, und es wird dich automatisch zu deinem aktuellen Benutzerordner führen).*

### 3. Unity Hub neu installieren
Sobald das System vollständig von Unity-Dateien bereinigt ist:
1. Gehe zur [offiziellen Unity-Website](https://unity.com/download) und lade die neueste Version von Unity Hub herunter.
2. Führe den Installer aus und folge den normalen Schritten.
3. Warte, bis alles korrekt installiert ist, melde dich erneut an und bestätige, dass der Fehler behoben ist.
