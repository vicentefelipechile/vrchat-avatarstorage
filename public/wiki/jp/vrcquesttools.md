# VRCQuestTools

<span class="badge">ツール</span>

## とは？

VRCQuestToolsは、**kurotu**が開発したUnity拡張で、PC用にデザインされたVRChatアバターをAndroidプラットフォーム（Meta Quest/PICO）に変換することができます。このツールは、モバイルデバイスの厳しいパフォーマンス制限にアバターを対応させるプロセスを自動化します。

> [!NOTE]
> VRCQuestToolsは最新バージョンで**Non-Destructive Modular Framework (NDMF)**システムを通じて動作し、元のファイルを変更せずにアバターを処理できます。

## 何ができますか？

- 数回のクリックでPCアバターをAndroidに変換
- ポリゴンとマテリアルを自動的に削減
- Quest互換のないコンポーネントを削除（ライトクロス等）
- パフォーマンス最適化のためのテクスチャとマテリアルの調整
- Questにアバターをアップロードするための各種ユーティリティ

> [!WARNING]
> 重要：VRoid Studioのアバターは透明マテリアルを大量に使用するため、Android互換ではありません。VRCQuestToolsでは这些アバターは помочьできません。手動で修正する必要があります。

## 環境要件

| 要件                             | 最小バージョン                             |
| -------------------------------- | ------------------------------------------ |
| Unity                            | 2019.4.31f1、2022.3.6f1 または 2022.3.22f1 |
| VRChat SDK                       | Avatars 3.3.0 以降                         |
| Android Build Support モジュール | Unityにインストール済み                    |

## どこで入手？

- **公式ページ：** [kurotu.github.io/VRCQuestTools](https://kurotu.github.io/VRCQuestTools/)
- **ドキュメント：** [VRCQuestTools ドキュメント](https://kurotu.github.io/VRCQuestTools/docs/intro)
- **GitHub：** [kurotu/VRCQuestTools](https://github.com/kurotu/VRCQuestTools)
- **Booth（寄付）：** [kurotu.booth.pm](https://kurotu.booth.pm/items/2436054)

## インストール方法

### VCC（VRChat Creator Companion）でのインストール

1. リポジトリをVCCに追加：
   - クリック：[VRCQuestToolsをVCCに追加](vcc://vpm/addRepo?url=https://kurotu.github.io/vpm-repos/vpm.json)
   - または **Settings** → **Packages** → **Add Repository**に移動し、URL `https://kurotu.github.io/vpm-repos/vpm.json`を貼り付けて **Add**をクリック
2. プロジェクトの **Manage Project**に移動
3. パッケージリストで **VRCQuestTools**を検索し、**[+]**をクリックして追加
4. VCCで **Open Project**をクリック

## Android用にアバターを変換する方法

### クイックメソッド（NDMF非破壊的）

1. Unityのヒエラルキーでアバターを右クリック
2. **VRCQuestTools** → **Convert Avatar For Android**を選択
3. 開いたウィンドウで **Begin Converter Settings**をクリックし、次に **Convert**をクリック
4. 変換が完了するまで待機
5. **File** → **Build Settings**に移動
6. **Android**プラットフォームを選択し、**Switch Platform**をクリック
7. Unityがプラットフォームを切り替えるのを待機
8. 変換されたアバターをVRChatにアップロード

> [!TIP]
> 元のアバターは変換後に無効になります。必要に応じてInspectorから再度有効にできます。

> [!NOTE]
> 変換されたアバターは**パフォーマンスを自動最適化しません**。ほとんどの場合、変換されたアバターはAndroidで**Very Poor**評価になります。Avatar Display設定（アバターを表示）を使用して表示できます。

## Questパフォーマンス制限

| 指標                   | Excellent | Good   | Medium | Poor   | Very Poor |
| ---------------------- | --------- | ------ | ------ | ------ | --------- |
| **トライアングル**     | 7,500     | 10,000 | 15,000 | 20,000 | >20,000   |
| **マテリアルスロット** | 1         | 1      | 1      | 2      | >2        |
| **スキンメッシュ**     | 1         | 1      | 1      | 2      | >2        |
| **PhysBones**          | 2         | 4      | 6      | 8      | >8        |

> [!NOTE]
> デフォルトでは、モバイルデバイスでの**Minimum Displayed Performance Rank**レベルは**Medium**に設定されています。これは、PoorまたはVery Poorと評価されたアバターは、ユーザーが手動であなたのアバターを表示することを選択しない限り、他のユーザーには表示されないことを意味します。

パフォーマンスランキングシステムの詳細については、[VRChat公式ドキュメント](https://creators.vrchat.com/avatars/avatar-performance-ranking-system/)を参照してください。

## 他のツールとの関係

- **[Modular Avatar](/wiki?topic=modular-avatar)**：Modular Avatarやその他のNDMFツールを使用する場合、変換は完全に非破壊的になります。
- **[VRCFury](/wiki?topic=vrcfury)**：VRCFuryは変換前にアニメーションやジェスチャーを準備するのに役立ちます。
- **[Poiyomi Toon Shader](/wiki?topic=poiyomi)**：変換後にシェーダーがAndroid互換であることを確認してください。

---

## 参考文献

kurotu. (n.d.). _VRCQuestTools - Avatar Converter and Utilities for Android_. GitHub Pages. Retrieved from https://kurotu.github.io/VRCQuestTools/

kurotu. (n.d.). _Introduction_. VRCQuestTools Docs. Retrieved from https://kurotu.github.io/VRCQuestTools/docs/intro

kurotu. (2025). _kurotu/VRCQuestTools_ [Software]. GitHub. Retrieved from https://github.com/kurotu/VRCQuestTools

VRChat Inc. (2025). _Performance Ranks_. VRChat Creator Documentation. Retrieved from https://creators.vrchat.com/avatars/avatar-performance-ranking-system/
