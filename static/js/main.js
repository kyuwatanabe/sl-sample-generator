document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('searchForm');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const error = document.getElementById('error');
    const resultList = document.getElementById('resultList');
    const resultTitle = document.getElementById('resultTitle');
    const resultBadge = document.getElementById('resultBadge');
    const copyAllBtn = document.getElementById('copyAllBtn');

    searchForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const position = document.getElementById('position').value;
        const industry = document.getElementById('industry').value;
        const department = document.getElementById('department').value;

        // 入力チェック
        if (!position && !industry && !department) {
            showError('少なくとも1つの項目を入力してください');
            return;
        }

        // UI更新
        loading.style.display = 'block';
        results.style.display = 'none';
        error.style.display = 'none';

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    position: position,
                    industry: industry,
                    department: department
                })
            });

            const data = await response.json();

            if (data.success) {
                if (data.source === 'none') {
                    // 該当なし - AI生成確認
                    loading.style.display = 'none';
                    if (confirm(data.message)) {
                        // AI生成実行
                        loading.style.display = 'block';
                        await generateWithAI(position, industry, department);
                    }
                } else {
                    displayResults(data);
                }
            } else {
                showError(data.error || '検索中にエラーが発生しました');
            }
        } catch (err) {
            showError('サーバーとの通信に失敗しました: ' + err.message);
        } finally {
            loading.style.display = 'none';
        }
    });

    async function generateWithAI(position, industry, department) {
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    position: position,
                    industry: industry,
                    department: department
                })
            });

            const data = await response.json();

            if (data.success) {
                displayResults(data);
            } else {
                showError(data.error || 'AI生成中にエラーが発生しました');
            }
        } catch (err) {
            showError('AI生成に失敗しました: ' + err.message);
        } finally {
            loading.style.display = 'none';
        }
    }

    function displayResults(data) {
        resultList.innerHTML = '';

        // バッジとタイトル設定
        if (data.source === 'database') {
            resultBadge.innerHTML = '<span class="badge bg-success me-2">データベースから検索</span>';
            resultTitle.textContent = `${data.count}件のサンプルが見つかりました（最大10件表示）`;
        } else {
            resultBadge.innerHTML = '<span class="badge bg-info me-2">AIで生成</span>';
            resultTitle.textContent = '該当サンプルがないため、AIで生成しました';
        }

        // 結果をリスト表示
        data.results.forEach((item, index) => {
            const listItem = document.createElement('div');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-start';
            listItem.innerHTML = `
                <div class="ms-2 me-auto">
                    <div class="fw-bold">${index + 1}.</div>
                    <div class="job-description">${item}</div>
                </div>
                <button class="btn btn-sm btn-outline-primary copy-btn" onclick="copyText('${escapeHtml(item)}')">
                    コピー
                </button>
            `;
            resultList.appendChild(listItem);
        });

        results.style.display = 'block';

        // すべてコピーボタンのイベント
        copyAllBtn.onclick = function() {
            const allText = data.results.join('\n\n');
            copyToClipboard(allText);
            showToast('すべての結果をコピーしました');
        };
    }

    function showError(message) {
        document.getElementById('errorMessage').textContent = message;
        error.style.display = 'block';
    }

    window.copyText = function(text) {
        copyToClipboard(text);
        showToast('コピーしました');
    };

    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/'/g, '&#39;');
    }

    function showToast(message) {
        // Bootstrap Toast風の簡易通知
        const toast = document.createElement('div');
        toast.className = 'alert alert-success copied-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 2000);
    }
});
