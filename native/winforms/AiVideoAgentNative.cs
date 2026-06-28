using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;

[assembly: AssemblyTitle("AI Video Agent Native")]
[assembly: AssemblyDescription("Native Windows desktop agent for local AI video project folders")]
[assembly: AssemblyCompany("silly971")]
[assembly: AssemblyProduct("AI Video Agent Native")]
[assembly: AssemblyCopyright("Copyright 2026")]
[assembly: AssemblyVersion("0.7.0.0")]
[assembly: AssemblyFileVersion("0.7.0.0")]

namespace AiVideoAgentNative
{
    internal static class Program
    {
        [STAThread]
        private static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm(args));
        }
    }

    internal enum AssetKind
    {
        Video,
        Image,
        Audio,
        Script,
        Data,
        Other
    }

    internal sealed class AssetFile
    {
        public string FullPath;
        public string RelativePath;
        public string Name;
        public string Extension;
        public AssetKind Kind;
        public long SizeBytes;
        public DateTime LastWriteTime;
        public string Note;
    }

    internal sealed class ShotDraft
    {
        public int Index;
        public string Source;
        public string Summary;
        public string Prompt;
    }

    internal sealed class MainForm : Form
    {
        private readonly string appVersion = "0.7.0";
        private readonly List<AssetFile> assets = new List<AssetFile>();
        private readonly List<ShotDraft> shots = new List<ShotDraft>();
        private string projectFolder = string.Empty;
        private string outputFolder = string.Empty;

        private ToolStrip toolbar;
        private StatusStrip statusStrip;
        private ToolStripStatusLabel statusLabel;
        private SplitContainer rootSplit;
        private TreeView folderTree;
        private TabControl tabs;
        private ListView assetList;
        private ListView shotList;
        private TextBox overviewText;
        private TextBox scriptText;
        private TextBox promptPreviewText;
        private TextBox logText;
        private ComboBox ratioCombo;
        private ComboBox styleCombo;
        private NumericUpDown maxShotBox;
        private Label folderLabel;

        public MainForm(string[] args)
        {
            Text = "AI Video Agent Native";
            Width = 1280;
            Height = 820;
            MinimumSize = new Size(1040, 680);
            StartPosition = FormStartPosition.CenterScreen;
            Font = new Font("Microsoft YaHei UI", 9F, FontStyle.Regular, GraphicsUnit.Point);
            BackColor = Color.FromArgb(247, 248, 250);

            BuildLayout();

            if (args != null && args.Length > 0 && Directory.Exists(args[0]))
            {
                LoadProjectFolder(args[0]);
            }
            else
            {
                WriteLog("请选择一个项目文件夹。应用会递归读取视频、图片、音频、脚本和数据文件。");
            }
        }

        private void BuildLayout()
        {
            toolbar = new ToolStrip();
            toolbar.GripStyle = ToolStripGripStyle.Hidden;
            toolbar.RenderMode = ToolStripRenderMode.System;
            toolbar.Items.Add(CreateButton("打开文件夹", OnOpenFolder));
            toolbar.Items.Add(CreateButton("重新扫描", OnRescan));
            toolbar.Items.Add(new ToolStripSeparator());
            toolbar.Items.Add(CreateButton("生成镜头草稿", OnGenerateShots));
            toolbar.Items.Add(CreateButton("导出提示词包", OnExportPromptPack));
            toolbar.Items.Add(CreateButton("保存清单", OnSaveManifest));
            toolbar.Items.Add(new ToolStripSeparator());
            toolbar.Items.Add(CreateButton("打开输出目录", OnOpenOutputFolder));
            Controls.Add(toolbar);

            statusStrip = new StatusStrip();
            statusLabel = new ToolStripStatusLabel("就绪");
            statusLabel.Spring = true;
            statusLabel.TextAlign = ContentAlignment.MiddleLeft;
            statusStrip.Items.Add(statusLabel);
            Controls.Add(statusStrip);

            rootSplit = new SplitContainer();
            rootSplit.Dock = DockStyle.Fill;
            rootSplit.SplitterDistance = 330;
            rootSplit.FixedPanel = FixedPanel.Panel1;
            rootSplit.BackColor = Color.FromArgb(225, 229, 235);
            Controls.Add(rootSplit);
            rootSplit.BringToFront();

            Panel leftPanel = new Panel();
            leftPanel.Dock = DockStyle.Fill;
            leftPanel.Padding = new Padding(12);
            leftPanel.BackColor = Color.White;
            rootSplit.Panel1.Controls.Add(leftPanel);

            folderLabel = new Label();
            folderLabel.Dock = DockStyle.Top;
            folderLabel.AutoEllipsis = true;
            folderLabel.Height = 40;
            folderLabel.Text = "未选择文件夹";
            folderLabel.Font = new Font(Font, FontStyle.Bold);
            leftPanel.Controls.Add(folderLabel);

            folderTree = new TreeView();
            folderTree.Dock = DockStyle.Fill;
            folderTree.BorderStyle = BorderStyle.FixedSingle;
            folderTree.HideSelection = false;
            folderTree.AfterSelect += OnFolderTreeSelect;
            leftPanel.Controls.Add(folderTree);
            folderTree.BringToFront();

            tabs = new TabControl();
            tabs.Dock = DockStyle.Fill;
            rootSplit.Panel2.Controls.Add(tabs);

            tabs.TabPages.Add(CreateOverviewTab());
            tabs.TabPages.Add(CreateAssetTab());
            tabs.TabPages.Add(CreateScriptTab());
            tabs.TabPages.Add(CreateShotTab());
            tabs.TabPages.Add(CreateSettingsTab());
            tabs.TabPages.Add(CreateLogTab());
        }

        private ToolStripButton CreateButton(string text, EventHandler handler)
        {
            ToolStripButton button = new ToolStripButton(text);
            button.DisplayStyle = ToolStripItemDisplayStyle.Text;
            button.Click += handler;
            return button;
        }

        private TabPage CreateOverviewTab()
        {
            TabPage page = new TabPage("总览");
            page.Padding = new Padding(12);

            overviewText = new TextBox();
            overviewText.Dock = DockStyle.Fill;
            overviewText.Multiline = true;
            overviewText.ReadOnly = true;
            overviewText.ScrollBars = ScrollBars.Vertical;
            overviewText.BorderStyle = BorderStyle.FixedSingle;
            overviewText.BackColor = Color.White;
            overviewText.Font = new Font("Microsoft YaHei UI", 10F);
            page.Controls.Add(overviewText);
            return page;
        }

        private TabPage CreateAssetTab()
        {
            TabPage page = new TabPage("素材");
            page.Padding = new Padding(12);

            assetList = new ListView();
            assetList.Dock = DockStyle.Fill;
            assetList.View = View.Details;
            assetList.FullRowSelect = true;
            assetList.GridLines = true;
            assetList.HideSelection = false;
            assetList.Columns.Add("类型", 80);
            assetList.Columns.Add("文件名", 260);
            assetList.Columns.Add("相对路径", 420);
            assetList.Columns.Add("大小", 100);
            assetList.Columns.Add("修改时间", 150);
            assetList.Columns.Add("说明", 220);
            assetList.SelectedIndexChanged += OnAssetSelected;
            page.Controls.Add(assetList);
            return page;
        }

        private TabPage CreateScriptTab()
        {
            TabPage page = new TabPage("剧本/文案");
            page.Padding = new Padding(12);

            scriptText = new TextBox();
            scriptText.Dock = DockStyle.Fill;
            scriptText.Multiline = true;
            scriptText.ScrollBars = ScrollBars.Vertical;
            scriptText.BorderStyle = BorderStyle.FixedSingle;
            scriptText.Font = new Font("Microsoft YaHei UI", 10F);
            page.Controls.Add(scriptText);
            return page;
        }

        private TabPage CreateShotTab()
        {
            TabPage page = new TabPage("镜头提示词");
            page.Padding = new Padding(12);

            SplitContainer split = new SplitContainer();
            split.Dock = DockStyle.Fill;
            split.Orientation = Orientation.Horizontal;
            split.SplitterDistance = 300;
            page.Controls.Add(split);

            shotList = new ListView();
            shotList.Dock = DockStyle.Fill;
            shotList.View = View.Details;
            shotList.FullRowSelect = true;
            shotList.GridLines = true;
            shotList.Columns.Add("序号", 60);
            shotList.Columns.Add("来源", 180);
            shotList.Columns.Add("摘要", 420);
            shotList.Columns.Add("提示词", 720);
            shotList.SelectedIndexChanged += OnShotSelected;
            split.Panel1.Controls.Add(shotList);

            promptPreviewText = new TextBox();
            promptPreviewText.Dock = DockStyle.Fill;
            promptPreviewText.Multiline = true;
            promptPreviewText.ScrollBars = ScrollBars.Vertical;
            promptPreviewText.BorderStyle = BorderStyle.FixedSingle;
            promptPreviewText.Font = new Font("Microsoft YaHei UI", 10F);
            split.Panel2.Controls.Add(promptPreviewText);
            return page;
        }

        private TabPage CreateSettingsTab()
        {
            TabPage page = new TabPage("设置");
            page.Padding = new Padding(18);

            TableLayoutPanel grid = new TableLayoutPanel();
            grid.Dock = DockStyle.Top;
            grid.ColumnCount = 2;
            grid.RowCount = 4;
            grid.AutoSize = true;
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 130));
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            page.Controls.Add(grid);

            ratioCombo = new ComboBox();
            ratioCombo.DropDownStyle = ComboBoxStyle.DropDownList;
            ratioCombo.Items.AddRange(new object[] { "9:16", "16:9", "1:1", "4:5" });
            ratioCombo.SelectedIndex = 0;

            styleCombo = new ComboBox();
            styleCombo.DropDownStyle = ComboBoxStyle.DropDownList;
            styleCombo.Items.AddRange(new object[] { "电影写实", "国风影视", "美漫分镜", "低饱和纪实", "产品广告" });
            styleCombo.SelectedIndex = 0;

            maxShotBox = new NumericUpDown();
            maxShotBox.Minimum = 1;
            maxShotBox.Maximum = 80;
            maxShotBox.Value = 12;

            AddSettingRow(grid, 0, "画幅", ratioCombo);
            AddSettingRow(grid, 1, "视觉风格", styleCombo);
            AddSettingRow(grid, 2, "最大镜头数", maxShotBox);

            Label note = new Label();
            note.AutoSize = true;
            note.MaximumSize = new Size(760, 0);
            note.Text = "这个原生版本直接读取本地文件夹，不启动网页服务、不嵌入浏览器控件，也不依赖 Electron/Next 运行时。导出的清单和提示词包会写入项目目录下的 _native_agent。";
            note.ForeColor = Color.FromArgb(72, 82, 98);
            grid.Controls.Add(new Label(), 0, 3);
            grid.Controls.Add(note, 1, 3);

            return page;
        }

        private void AddSettingRow(TableLayoutPanel grid, int row, string label, Control control)
        {
            Label caption = new Label();
            caption.Text = label;
            caption.TextAlign = ContentAlignment.MiddleLeft;
            caption.Dock = DockStyle.Fill;
            caption.Height = 34;
            grid.Controls.Add(caption, 0, row);

            control.Dock = DockStyle.Top;
            control.Width = 280;
            grid.Controls.Add(control, 1, row);
        }

        private TabPage CreateLogTab()
        {
            TabPage page = new TabPage("日志");
            page.Padding = new Padding(12);

            logText = new TextBox();
            logText.Dock = DockStyle.Fill;
            logText.Multiline = true;
            logText.ReadOnly = true;
            logText.ScrollBars = ScrollBars.Vertical;
            logText.BorderStyle = BorderStyle.FixedSingle;
            logText.Font = new Font("Consolas", 9F);
            page.Controls.Add(logText);
            return page;
        }

        private void OnOpenFolder(object sender, EventArgs e)
        {
            using (FolderBrowserDialog dialog = new FolderBrowserDialog())
            {
                dialog.Description = "选择 AI 视频项目文件夹";
                dialog.ShowNewFolderButton = true;
                if (Directory.Exists(projectFolder))
                {
                    dialog.SelectedPath = projectFolder;
                }
                if (dialog.ShowDialog(this) == DialogResult.OK)
                {
                    LoadProjectFolder(dialog.SelectedPath);
                }
            }
        }

        private void OnRescan(object sender, EventArgs e)
        {
            if (Directory.Exists(projectFolder))
            {
                LoadProjectFolder(projectFolder);
            }
            else
            {
                MessageBox.Show(this, "请先选择一个项目文件夹。", "需要文件夹", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        private void LoadProjectFolder(string folder)
        {
            projectFolder = Path.GetFullPath(folder);
            outputFolder = Path.Combine(projectFolder, "_native_agent");
            folderLabel.Text = projectFolder;
            assets.Clear();
            shots.Clear();
            assetList.Items.Clear();
            shotList.Items.Clear();
            promptPreviewText.Clear();

            Cursor previous = Cursor;
            Cursor = Cursors.WaitCursor;
            try
            {
                ScanFolder(projectFolder);
                PopulateTree();
                PopulateAssets();
                LoadBestScriptIntoEditor();
                RefreshOverview();
                statusLabel.Text = "已读取 " + assets.Count.ToString(CultureInfo.InvariantCulture) + " 个文件";
                WriteLog("已读取文件夹: " + projectFolder);
            }
            catch (Exception ex)
            {
                WriteLog("读取失败: " + ex.Message);
                MessageBox.Show(this, ex.Message, "读取失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                Cursor = previous;
            }
        }

        private void ScanFolder(string root)
        {
            string[] files = Directory.GetFiles(root, "*", SearchOption.AllDirectories);
            Array.Sort(files, StringComparer.OrdinalIgnoreCase);
            foreach (string file in files)
            {
                string relative = MakeRelative(root, file);
                if (ShouldSkip(relative))
                {
                    continue;
                }
                FileInfo info = new FileInfo(file);
                AssetFile asset = new AssetFile();
                asset.FullPath = file;
                asset.RelativePath = relative;
                asset.Name = info.Name;
                asset.Extension = info.Extension.ToLowerInvariant();
                asset.Kind = Classify(asset.Extension);
                asset.SizeBytes = info.Length;
                asset.LastWriteTime = info.LastWriteTime;
                asset.Note = BuildAssetNote(asset);
                assets.Add(asset);
            }
        }

        private bool ShouldSkip(string relative)
        {
            string normalized = relative.Replace('\\', '/').ToLowerInvariant();
            return normalized.StartsWith(".git/")
                || normalized.StartsWith("node_modules/")
                || normalized.StartsWith(".next/")
                || normalized.StartsWith("desktop-dist/")
                || normalized.StartsWith("release/")
                || normalized.StartsWith("release-v")
                || normalized.StartsWith(".cache/")
                || normalized.StartsWith("logs/")
                || normalized.StartsWith("_native_agent/");
        }

        private AssetKind Classify(string ext)
        {
            if (ext == ".mp4" || ext == ".mov" || ext == ".mkv" || ext == ".avi" || ext == ".webm" || ext == ".m4v")
            {
                return AssetKind.Video;
            }
            if (ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".webp" || ext == ".bmp" || ext == ".gif")
            {
                return AssetKind.Image;
            }
            if (ext == ".mp3" || ext == ".wav" || ext == ".m4a" || ext == ".aac" || ext == ".flac" || ext == ".ogg")
            {
                return AssetKind.Audio;
            }
            if (ext == ".txt" || ext == ".md" || ext == ".srt" || ext == ".ass" || ext == ".vtt")
            {
                return AssetKind.Script;
            }
            if (ext == ".json" || ext == ".csv" || ext == ".xml" || ext == ".yaml" || ext == ".yml")
            {
                return AssetKind.Data;
            }
            return AssetKind.Other;
        }

        private string BuildAssetNote(AssetFile asset)
        {
            if (asset.Kind == AssetKind.Image)
            {
                try
                {
                    using (Image image = Image.FromFile(asset.FullPath))
                    {
                        return image.Width.ToString(CultureInfo.InvariantCulture) + "x" + image.Height.ToString(CultureInfo.InvariantCulture);
                    }
                }
                catch
                {
                    return "图片";
                }
            }
            if (asset.Kind == AssetKind.Video)
            {
                return "视频素材";
            }
            if (asset.Kind == AssetKind.Audio)
            {
                return "音频/BGM/配音";
            }
            if (asset.Kind == AssetKind.Script)
            {
                return "可导入文案";
            }
            if (asset.Kind == AssetKind.Data)
            {
                return "项目数据";
            }
            return string.Empty;
        }

        private string MakeRelative(string root, string file)
        {
            Uri rootUri = new Uri(AppendSeparator(root));
            Uri fileUri = new Uri(file);
            string relative = Uri.UnescapeDataString(rootUri.MakeRelativeUri(fileUri).ToString());
            return relative.Replace('/', Path.DirectorySeparatorChar);
        }

        private string AppendSeparator(string path)
        {
            if (path.EndsWith(Path.DirectorySeparatorChar.ToString(), StringComparison.Ordinal))
            {
                return path;
            }
            return path + Path.DirectorySeparatorChar;
        }

        private void PopulateTree()
        {
            folderTree.BeginUpdate();
            folderTree.Nodes.Clear();
            TreeNode root = new TreeNode(Path.GetFileName(projectFolder));
            root.Tag = projectFolder;
            folderTree.Nodes.Add(root);

            Dictionary<string, TreeNode> nodes = new Dictionary<string, TreeNode>(StringComparer.OrdinalIgnoreCase);
            nodes[string.Empty] = root;

            foreach (AssetFile asset in assets)
            {
                string dir = Path.GetDirectoryName(asset.RelativePath) ?? string.Empty;
                EnsureTreePath(nodes, root, dir);
            }

            root.Expand();
            folderTree.EndUpdate();
        }

        private TreeNode EnsureTreePath(Dictionary<string, TreeNode> nodes, TreeNode root, string dir)
        {
            if (string.IsNullOrEmpty(dir))
            {
                return root;
            }
            if (nodes.ContainsKey(dir))
            {
                return nodes[dir];
            }

            string parentDir = Path.GetDirectoryName(dir) ?? string.Empty;
            TreeNode parent = EnsureTreePath(nodes, root, parentDir);
            TreeNode current = new TreeNode(Path.GetFileName(dir));
            current.Tag = Path.Combine(projectFolder, dir);
            parent.Nodes.Add(current);
            nodes[dir] = current;
            return current;
        }

        private void PopulateAssets()
        {
            assetList.BeginUpdate();
            assetList.Items.Clear();
            foreach (AssetFile asset in assets)
            {
                AddAssetItem(asset);
            }
            assetList.EndUpdate();
        }

        private void AddAssetItem(AssetFile asset)
        {
            ListViewItem item = new ListViewItem(KindLabel(asset.Kind));
            item.SubItems.Add(asset.Name);
            item.SubItems.Add(asset.RelativePath);
            item.SubItems.Add(FormatBytes(asset.SizeBytes));
            item.SubItems.Add(asset.LastWriteTime.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture));
            item.SubItems.Add(asset.Note);
            item.Tag = asset;
            assetList.Items.Add(item);
        }

        private string KindLabel(AssetKind kind)
        {
            if (kind == AssetKind.Video) return "视频";
            if (kind == AssetKind.Image) return "图片";
            if (kind == AssetKind.Audio) return "音频";
            if (kind == AssetKind.Script) return "文案";
            if (kind == AssetKind.Data) return "数据";
            return "其他";
        }

        private string FormatBytes(long bytes)
        {
            string[] units = new string[] { "B", "KB", "MB", "GB" };
            double value = bytes;
            int unit = 0;
            while (value >= 1024 && unit < units.Length - 1)
            {
                value /= 1024;
                unit++;
            }
            return value.ToString(unit == 0 ? "0" : "0.0", CultureInfo.InvariantCulture) + " " + units[unit];
        }

        private void RefreshOverview()
        {
            int videos = CountKind(AssetKind.Video);
            int images = CountKind(AssetKind.Image);
            int audios = CountKind(AssetKind.Audio);
            int scripts = CountKind(AssetKind.Script);
            int data = CountKind(AssetKind.Data);

            StringBuilder sb = new StringBuilder();
            sb.AppendLine("AI Video Agent Native " + appVersion);
            sb.AppendLine();
            sb.AppendLine("项目文件夹");
            sb.AppendLine(projectFolder.Length > 0 ? projectFolder : "未选择");
            sb.AppendLine();
            sb.AppendLine("素材统计");
            sb.AppendLine("视频: " + videos.ToString(CultureInfo.InvariantCulture));
            sb.AppendLine("图片: " + images.ToString(CultureInfo.InvariantCulture));
            sb.AppendLine("音频: " + audios.ToString(CultureInfo.InvariantCulture));
            sb.AppendLine("文案: " + scripts.ToString(CultureInfo.InvariantCulture));
            sb.AppendLine("数据: " + data.ToString(CultureInfo.InvariantCulture));
            sb.AppendLine("全部文件: " + assets.Count.ToString(CultureInfo.InvariantCulture));
            sb.AppendLine();
            sb.AppendLine("工作流");
            sb.AppendLine("1. 打开本地项目文件夹");
            sb.AppendLine("2. 检查素材列表和剧本文案");
            sb.AppendLine("3. 生成镜头提示词草稿");
            sb.AppendLine("4. 导出清单、CSV 和提示词包");
            sb.AppendLine();
            sb.AppendLine("桌面实现");
            sb.AppendLine("WinForms 原生窗口、原生文件夹选择器、原生列表控件；不包含内嵌浏览器控件或本地网页服务。");
            overviewText.Text = sb.ToString();
        }

        private int CountKind(AssetKind kind)
        {
            int count = 0;
            foreach (AssetFile asset in assets)
            {
                if (asset.Kind == kind)
                {
                    count++;
                }
            }
            return count;
        }

        private void LoadBestScriptIntoEditor()
        {
            AssetFile best = null;
            foreach (AssetFile asset in assets)
            {
                if (asset.Kind != AssetKind.Script)
                {
                    continue;
                }
                if (best == null || asset.SizeBytes > best.SizeBytes)
                {
                    best = asset;
                }
            }

            if (best == null)
            {
                scriptText.Text = string.Empty;
                return;
            }

            scriptText.Text = SafeReadText(best.FullPath, 240000);
            WriteLog("已载入文案: " + best.RelativePath);
        }

        private string SafeReadText(string path, int maxChars)
        {
            byte[] bytes = File.ReadAllBytes(path);
            Encoding encoding = DetectEncoding(bytes);
            string text;
            try
            {
                text = encoding.GetString(bytes);
            }
            catch (DecoderFallbackException)
            {
                text = Encoding.Default.GetString(bytes);
            }
            if (text.Length > maxChars)
            {
                text = text.Substring(0, maxChars) + Environment.NewLine + "... 文本过长，已截断预览 ...";
            }
            return text;
        }

        private Encoding DetectEncoding(byte[] bytes)
        {
            if (bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF)
            {
                return Encoding.UTF8;
            }
            if (bytes.Length >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE)
            {
                return Encoding.Unicode;
            }
            if (bytes.Length >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF)
            {
                return Encoding.BigEndianUnicode;
            }
            return new UTF8Encoding(false, true);
        }

        private void OnGenerateShots(object sender, EventArgs e)
        {
            GenerateShotsFromScript();
        }

        private void GenerateShotsFromScript()
        {
            shots.Clear();
            shotList.Items.Clear();
            promptPreviewText.Clear();

            string text = scriptText.Text.Trim();
            if (text.Length == 0)
            {
                MessageBox.Show(this, "没有可用的剧本/文案。请先在“剧本/文案”页粘贴文本，或选择包含 txt/md/srt 的文件夹。", "需要文案", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            string[] paragraphs = SplitIntoParagraphs(text);
            int max = Convert.ToInt32(maxShotBox.Value, CultureInfo.InvariantCulture);
            int index = 1;
            foreach (string paragraph in paragraphs)
            {
                string clean = CleanLine(paragraph);
                if (clean.Length == 0)
                {
                    continue;
                }
                ShotDraft shot = new ShotDraft();
                shot.Index = index;
                shot.Source = "文案段落";
                shot.Summary = TrimTo(clean, 120);
                shot.Prompt = BuildPrompt(clean, index);
                shots.Add(shot);
                index++;
                if (shots.Count >= max)
                {
                    break;
                }
            }

            foreach (ShotDraft shot in shots)
            {
                ListViewItem item = new ListViewItem(shot.Index.ToString(CultureInfo.InvariantCulture));
                item.SubItems.Add(shot.Source);
                item.SubItems.Add(shot.Summary);
                item.SubItems.Add(shot.Prompt);
                item.Tag = shot;
                shotList.Items.Add(item);
            }

            if (shotList.Items.Count > 0)
            {
                shotList.Items[0].Selected = true;
                tabs.SelectedIndex = 3;
            }
            statusLabel.Text = "已生成 " + shots.Count.ToString(CultureInfo.InvariantCulture) + " 条镜头提示词";
            WriteLog(statusLabel.Text);
        }

        private string[] SplitIntoParagraphs(string text)
        {
            text = text.Replace("\r\n", "\n").Replace('\r', '\n');
            List<string> parts = new List<string>();
            string[] lines = text.Split('\n');
            StringBuilder current = new StringBuilder();
            foreach (string raw in lines)
            {
                string line = raw.Trim();
                if (line.Length == 0)
                {
                    FlushPart(parts, current);
                    continue;
                }
                if (LooksLikeSubtitleIndex(line) || LooksLikeTimecode(line))
                {
                    continue;
                }
                if (current.Length > 0)
                {
                    current.Append(" ");
                }
                current.Append(line);
                if (current.Length > 180)
                {
                    FlushPart(parts, current);
                }
            }
            FlushPart(parts, current);
            return parts.ToArray();
        }

        private void FlushPart(List<string> parts, StringBuilder current)
        {
            if (current.Length > 0)
            {
                parts.Add(current.ToString());
                current.Length = 0;
            }
        }

        private bool LooksLikeSubtitleIndex(string line)
        {
            int value;
            return line.Length < 8 && int.TryParse(line, NumberStyles.Integer, CultureInfo.InvariantCulture, out value);
        }

        private bool LooksLikeTimecode(string line)
        {
            return line.IndexOf("-->", StringComparison.Ordinal) >= 0;
        }

        private string CleanLine(string value)
        {
            return value.Replace('\t', ' ').Trim();
        }

        private string TrimTo(string value, int max)
        {
            if (value.Length <= max)
            {
                return value;
            }
            return value.Substring(0, max - 1) + "…";
        }

        private string BuildPrompt(string content, int index)
        {
            string ratio = ratioCombo.SelectedItem == null ? "9:16" : ratioCombo.SelectedItem.ToString();
            string style = styleCombo.SelectedItem == null ? "电影写实" : styleCombo.SelectedItem.ToString();
            return "镜头 " + index.ToString(CultureInfo.InvariantCulture)
                + "，" + ratio + "，" + style
                + "。画面内容：" + TrimTo(content, 180)
                + "。要求：主体清晰，构图稳定，光影有层次，动作与情绪连续，可直接用于图像/视频生成。";
        }

        private void OnExportPromptPack(object sender, EventArgs e)
        {
            if (!EnsureProjectLoaded())
            {
                return;
            }
            if (shots.Count == 0)
            {
                GenerateShotsFromScript();
            }
            Directory.CreateDirectory(outputFolder);
            string promptPath = Path.Combine(outputFolder, "video_agent_prompt_pack.txt");
            string csvPath = Path.Combine(outputFolder, "storyboard_prompts.csv");
            File.WriteAllText(promptPath, BuildPromptPack(), Encoding.UTF8);
            File.WriteAllText(csvPath, BuildShotCsv(), Encoding.UTF8);
            WriteLog("已导出提示词包: " + promptPath);
            WriteLog("已导出镜头 CSV: " + csvPath);
            MessageBox.Show(this, "已导出到：" + Environment.NewLine + outputFolder, "导出完成", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private string BuildPromptPack()
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("AI Video Agent Native 提示词包");
            sb.AppendLine("版本: " + appVersion);
            sb.AppendLine("项目: " + projectFolder);
            sb.AppendLine("画幅: " + ratioCombo.SelectedItem);
            sb.AppendLine("风格: " + styleCombo.SelectedItem);
            sb.AppendLine();
            foreach (ShotDraft shot in shots)
            {
                sb.AppendLine("[" + shot.Index.ToString(CultureInfo.InvariantCulture) + "]");
                sb.AppendLine(shot.Prompt);
                sb.AppendLine();
            }
            return sb.ToString();
        }

        private string BuildShotCsv()
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("index,source,summary,prompt");
            foreach (ShotDraft shot in shots)
            {
                sb.Append(shot.Index.ToString(CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(Csv(shot.Source));
                sb.Append(',');
                sb.Append(Csv(shot.Summary));
                sb.Append(',');
                sb.Append(Csv(shot.Prompt));
                sb.AppendLine();
            }
            return sb.ToString();
        }

        private string Csv(string value)
        {
            return "\"" + (value ?? string.Empty).Replace("\"", "\"\"") + "\"";
        }

        private void OnSaveManifest(object sender, EventArgs e)
        {
            if (!EnsureProjectLoaded())
            {
                return;
            }
            Directory.CreateDirectory(outputFolder);
            string manifestPath = Path.Combine(outputFolder, "project.manifest.json");
            File.WriteAllText(manifestPath, BuildManifestJson(), Encoding.UTF8);
            WriteLog("已保存项目清单: " + manifestPath);
            MessageBox.Show(this, "已保存项目清单：" + Environment.NewLine + manifestPath, "保存完成", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private string BuildManifestJson()
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("{");
            sb.AppendLine("  \"app\": \"AI Video Agent Native\",");
            sb.AppendLine("  \"version\": " + Json(appVersion) + ",");
            sb.AppendLine("  \"projectFolder\": " + Json(projectFolder) + ",");
            sb.AppendLine("  \"generatedAt\": " + Json(DateTime.Now.ToString("o", CultureInfo.InvariantCulture)) + ",");
            sb.AppendLine("  \"settings\": {");
            sb.AppendLine("    \"ratio\": " + Json(ratioCombo.SelectedItem == null ? string.Empty : ratioCombo.SelectedItem.ToString()) + ",");
            sb.AppendLine("    \"style\": " + Json(styleCombo.SelectedItem == null ? string.Empty : styleCombo.SelectedItem.ToString()) + ",");
            sb.AppendLine("    \"maxShots\": " + maxShotBox.Value.ToString(CultureInfo.InvariantCulture));
            sb.AppendLine("  },");
            sb.AppendLine("  \"assets\": [");
            for (int i = 0; i < assets.Count; i++)
            {
                AssetFile asset = assets[i];
                sb.AppendLine("    {");
                sb.AppendLine("      \"kind\": " + Json(KindLabel(asset.Kind)) + ",");
                sb.AppendLine("      \"relativePath\": " + Json(asset.RelativePath) + ",");
                sb.AppendLine("      \"sizeBytes\": " + asset.SizeBytes.ToString(CultureInfo.InvariantCulture) + ",");
                sb.AppendLine("      \"modifiedAt\": " + Json(asset.LastWriteTime.ToString("o", CultureInfo.InvariantCulture)) + ",");
                sb.AppendLine("      \"note\": " + Json(asset.Note));
                sb.Append("    }");
                if (i < assets.Count - 1)
                {
                    sb.Append(",");
                }
                sb.AppendLine();
            }
            sb.AppendLine("  ],");
            sb.AppendLine("  \"shots\": [");
            for (int i = 0; i < shots.Count; i++)
            {
                ShotDraft shot = shots[i];
                sb.AppendLine("    {");
                sb.AppendLine("      \"index\": " + shot.Index.ToString(CultureInfo.InvariantCulture) + ",");
                sb.AppendLine("      \"source\": " + Json(shot.Source) + ",");
                sb.AppendLine("      \"summary\": " + Json(shot.Summary) + ",");
                sb.AppendLine("      \"prompt\": " + Json(shot.Prompt));
                sb.Append("    }");
                if (i < shots.Count - 1)
                {
                    sb.Append(",");
                }
                sb.AppendLine();
            }
            sb.AppendLine("  ]");
            sb.AppendLine("}");
            return sb.ToString();
        }

        private string Json(string value)
        {
            if (value == null)
            {
                return "null";
            }
            StringBuilder sb = new StringBuilder();
            sb.Append('"');
            foreach (char c in value)
            {
                if (c == '\\') sb.Append("\\\\");
                else if (c == '"') sb.Append("\\\"");
                else if (c == '\n') sb.Append("\\n");
                else if (c == '\r') sb.Append("\\r");
                else if (c == '\t') sb.Append("\\t");
                else if (char.IsControl(c)) sb.Append("\\u" + ((int)c).ToString("x4", CultureInfo.InvariantCulture));
                else sb.Append(c);
            }
            sb.Append('"');
            return sb.ToString();
        }

        private void OnOpenOutputFolder(object sender, EventArgs e)
        {
            if (!EnsureProjectLoaded())
            {
                return;
            }
            Directory.CreateDirectory(outputFolder);
            Process.Start("explorer.exe", outputFolder);
        }

        private bool EnsureProjectLoaded()
        {
            if (Directory.Exists(projectFolder))
            {
                return true;
            }
            MessageBox.Show(this, "请先选择一个项目文件夹。", "需要文件夹", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return false;
        }

        private void OnFolderTreeSelect(object sender, TreeViewEventArgs e)
        {
            if (e.Node == null || e.Node.Tag == null)
            {
                return;
            }
            string selectedPath = e.Node.Tag.ToString();
            assetList.BeginUpdate();
            assetList.Items.Clear();
            foreach (AssetFile asset in assets)
            {
                if (asset.FullPath.StartsWith(selectedPath, StringComparison.OrdinalIgnoreCase))
                {
                    AddAssetItem(asset);
                }
            }
            assetList.EndUpdate();
        }

        private void OnAssetSelected(object sender, EventArgs e)
        {
            if (assetList.SelectedItems.Count == 0)
            {
                return;
            }
            AssetFile asset = assetList.SelectedItems[0].Tag as AssetFile;
            if (asset == null)
            {
                return;
            }
            statusLabel.Text = asset.RelativePath;
            if (asset.Kind == AssetKind.Script || asset.Kind == AssetKind.Data)
            {
                try
                {
                    scriptText.Text = SafeReadText(asset.FullPath, 240000);
                    tabs.SelectedIndex = 2;
                    WriteLog("已预览文本: " + asset.RelativePath);
                }
                catch (DecoderFallbackException)
                {
                    WriteLog("文本预览失败，编码不是 UTF-8/Unicode: " + asset.RelativePath);
                }
                catch (Exception ex)
                {
                    WriteLog("文本预览失败: " + ex.Message);
                }
            }
        }

        private void OnShotSelected(object sender, EventArgs e)
        {
            if (shotList.SelectedItems.Count == 0)
            {
                return;
            }
            ShotDraft shot = shotList.SelectedItems[0].Tag as ShotDraft;
            if (shot != null)
            {
                promptPreviewText.Text = shot.Prompt;
            }
        }

        private void WriteLog(string message)
        {
            string line = DateTime.Now.ToString("HH:mm:ss", CultureInfo.InvariantCulture) + "  " + message;
            logText.AppendText(line + Environment.NewLine);
        }
    }
}
