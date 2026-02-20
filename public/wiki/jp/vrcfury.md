# VRCFury

<span class="badge">オプション</span>

## これは何ですか？
VRCFuryは、VRChatアバターの設定を大幅に簡素化する無料のUnityプラグインです。アニメーションコントローラーを手動で編集することなく、衣服、小道具、ジェスチャー、アニメーションを簡単にインストールできます。

## 何のためのものですか？
- ワンクリックで衣服とアクセサリーをインストール
- ジェスチャーとアニメーションの自動設定
- VRChatメニューの自動生成
- 非破壊的：元のファイルを変更しません
- ブレンドシェイプオプティマイザー（未使用のものを削除）

> [!NOTE]
> 注意
> VRCFuryはオプションですが、強く推奨されるツールです。一部のアバターは正しく動作するために必要です。アバターに必要な場合は、説明に記載されます。

## どこで入手できますか？
- **公式サイト (ダウンロード):** [vrcfury.com/download](https://vrcfury.com/download/)
- **GitHub:** [VRCFury/VRCFury](https://github.com/VRCFury/VRCFury)

## インストール方法は？

多くの最新のVRChatツールと同様に、VRCFuryをインストールする方法は2つあります。公式に推奨されている方法は **VCC (VRChat Creator Companion)** を使用することです。

### 方法1: VCCによるインストール (推奨)

VCCを使用することで、VRCFuryが常に最新の状態に保たれ、複数のプロジェクトを使用する際に互換性の問題が発生しなくなります。

1. **VCCにリポジトリを追加します：**
   - 公式のダウンロードページに行きます：[vrcfury.com/download](https://vrcfury.com/download/)。
   - ステップ1（"Install VRChat Creator Companion"）で、すでにVCCがインストールされている場合はスキップできます。ステップ2で、**「Click Here to add VRCFury to VCC」** ボタンをクリックします。
   - ブラウザがVCCを開く許可を求めてきます。これを承認し、VCCに入ったら **「I Understand, Add Repository」** をクリックします。
   - *(手動の代替方法)*: VCCを開き、**Settings** -> **Packages**タブ -> **Add Repository**に行き、該当するスペースにURL `https://vcc.vrcfury.com` を貼り付けて **Add** をクリックします。
2. **プロジェクトにVRCFuryを追加します：**
   - VCCでプロジェクトリストに移動し、使用しているプロジェクトの **Manage Project** をクリックします。
   - 左側（または右上）のリポジトリリストで、**「VRCFury Repo」** にチェックが入っていることを確認します。
   - プロジェクトで利用可能なパッケージのリストで **「VRCFury」** を検索し、右側の **[+]** アイコンをクリックしてプロジェクトに追加します。
3. **完了です！** VCCで **Open Project** をクリックすると、アバターをアップロードするかシーンに追加したときに、VRCFuryを含むプレハブが自動的にインストールまたは構成されます。

> [!NOTE]
> VCC経由でインストールしているときにウィンドウが予期せず閉じたとしても、それは正常です。修正するには、VCCを閉じて再度開き、プロセスを繰り返します。今度は正しく動作するはずです。

### 方法2: .unitypackageによる手動インストール (旧式)

この方法はもはや推奨されておらず、旧式（Legacy）と見なされていますが、VCCで問題がある場合は引き続き使用できます。

1. [GitHub](https://github.com/VRCFury/VRCFury/releases)のダウンロードセクションから、`.unitypackage` 形式のVRCFuryインストーラーファイルをダウンロードします。
2. アバターを編集する予定のUnityプロジェクトを開きます。
3. Unityの上部メニューで、**Assets** → **Import Package** → **Custom Package...** に行きます。
4. ダウンロードしたVRCFuryの `.unitypackage` ファイルを選択します。
5. ポップアップウィンドウですべてのファイルが選択されていることを確認し、**Import** をクリックします。
6. VRCFuryがインストールされ、トップバーに **Tools > VRCFury** という新しいメニューが表示されます。（この手動方法を使用している場合は、そこから更新できます）。

---

## 参考文献

VRCFury. (n.d.). *Download*. VRCFury. Retrieved from https://vrcfury.com/download/

VRCFury. (n.d.). *VRCFury*. GitHub. Retrieved from https://github.com/VRCFury/VRCFury
