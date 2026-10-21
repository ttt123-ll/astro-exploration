/**
 * 通过 GitHub Git Data API 推送本地提交（HTTPS/SSH 被墙时的备选通道）
 *
 * 前提：api.github.com 可访问，本地已有提交且远程落后。
 * 流程：读取远程 main → 计算本地领先的提交与文件差异 → 上传 blob →
 *       建 tree → 建 commit → 更新 ref → 本地 reset 到远程内容（保持同步）
 *
 * 用法：node tools/api-push.js            # 正常推送
 *       node tools/api-push.js --dry-run  # 只看将要做什么
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OWNER = 'ttt123-ll';
const REPO = 'astro-exploration';
const BRANCH = 'main';
const REPO_DIR = path.resolve(__dirname, '..');
const TOKEN = process.env.GITHUB_TOKEN || '';
if (!TOKEN) {
    console.error('缺少 GITHUB_TOKEN 环境变量。用法：\n  $env:GITHUB_TOKEN=\'ghp_xxx\'; node tools/api-push.js');
    process.exit(1);
}
const API = 'https://api.github.com';
const DRY = process.argv.includes('--dry-run');

function git(...args) {
    return execFileSync('git', args, { cwd: REPO_DIR, encoding: 'utf8' }).trim();
}

async function api(method, p, body) {
    const res = await fetch(API + p, {
        method,
        headers: {
            Authorization: 'Bearer ' + TOKEN,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'astro-api-push',
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(45000)
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* 非 JSON */ }
    if (!res.ok) {
        throw new Error(`${method} ${p} → ${res.status} ${text.slice(0, 300)}`);
    }
    return json;
}

(async () => {
    // 1) 远程 main
    const ref = await api('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
    const remoteSha = ref.object.sha;
    const remoteCommit = await api('GET', `/repos/${OWNER}/${REPO}/git/commits/${remoteSha}`);
    console.log('远程 main: ' + remoteSha.slice(0, 7));

    const localSha = git('rev-parse', 'HEAD');
    console.log('本地 HEAD: ' + localSha.slice(0, 7));

    // 远程提交可能不在本地对象库（API 推送后 SHA 与本地不同），此时用 tree 做差异基准
    let remoteHasObject = true;
    try { git('cat-file', '-e', remoteSha); } catch (e) { remoteHasObject = false; }
    const baseRef = remoteHasObject ? remoteSha : remoteCommit.tree.sha;
    console.log('差异基准: ' + (remoteHasObject ? '提交 ' + remoteSha.slice(0, 7) : 'tree ' + remoteCommit.tree.sha.slice(0, 7)));
    if (localSha === remoteSha) { console.log('已是最新，无需推送'); return; }

    // 2) 本地领先的提交
    let commits;
    if (remoteHasObject) {
        commits = git('log', '--reverse', '--pretty=%s', `${remoteSha}..${localSha}`).split('\n').filter(Boolean);
    } else {
        // 无法计算提交范围时，退化为读取最近一次提交信息
        commits = git('log', '-1', '--pretty=%s', localSha).split('\n').filter(Boolean);
    }
    const message = commits.join('\n\n');
    console.log(`待推送提交（${commits.length}）：\n` + commits.map(c => '  - ' + c).join('\n'));

    // 3) 文件差异
    const diff = git('diff', '--name-status', baseRef, localSha).split('\n').filter(Boolean);
    const entries = [];
    let uploaded = 0;
    for (const line of diff) {
        const [status, ...rest] = line.split('\t');
        const filePath = rest.join('\t');
        if (status === 'D') {
            entries.push({ path: filePath, mode: '100644', type: 'blob', sha: null });
            console.log('  删除 ' + filePath);
            continue;
        }
        // 重命名：取新路径
        const target = status.startsWith('R') ? rest[1] : filePath;
        const full = path.join(REPO_DIR, target);
        const buf = fs.readFileSync(full);
        if (DRY) { console.log('  上传 ' + target + '  ' + Math.round(buf.length / 1024) + ' KB (dry-run)'); continue; }
        const blob = await api('POST', `/repos/${OWNER}/${REPO}/git/blobs`, {
            content: buf.toString('base64'),
            encoding: 'base64'
        });
        uploaded += 1;
        entries.push({ path: target, mode: '100644', type: 'blob', sha: blob.sha });
        console.log('  上传 ' + target + '  ' + Math.round(buf.length / 1024) + ' KB');
    }

    if (DRY) { console.log('dry-run 结束'); return; }
    if (!entries.length) { console.log('无文件变化'); return; }

    // 4) 新 tree（基于远程 tree，只覆盖变化的路径）
    const tree = await api('POST', `/repos/${OWNER}/${REPO}/git/trees`, {
        base_tree: remoteCommit.tree.sha,
        tree: entries
    });

    // 5) 新 commit（带上本地提交的作者/时间信息，尽量让 SHA 与本地一致）
    const meta = (() => {
        const raw = execFileSync('git', ['log', '-1', '--pretty=%an|%ae|%aI|%cn|%ce|%cI|%B', localSha],
            { cwd: REPO_DIR, encoding: 'utf8' });
        const parts = raw.split('|');
        const [an, ae, aI, cn, ce, cI] = parts;
        const body = raw.slice([an, ae, aI, cn, ce, cI].join('|').length + 1).replace(/\n+$/, '');
        return { an, ae, aI, cn, ce, cI, body };
    })();
    const commitMsg = commits.length === 1 ? meta.body : message;
    const commit = await api('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
        message: commitMsg,
        tree: tree.sha,
        parents: [remoteSha],
        author: { name: meta.an, email: meta.ae, date: meta.aI },
        committer: { name: meta.cn, email: meta.ce, date: meta.cI }
    });
    console.log('新远程提交: ' + commit.sha.slice(0, 7));

    // 6) 更新 ref
    await api('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: false });
    console.log('✓ 远程 main 已更新');

    // 7) 本地与远程对齐：若 API 生成的 SHA 与本地一致，直接更新远程跟踪引用
    if (commit.sha === localSha) {
        git('update-ref', 'refs/remotes/origin/' + BRANCH, commit.sha);
        console.log('✓ 本地与远程 SHA 完全一致: ' + commit.sha.slice(0, 7));
    } else {
        // 远程 SHA 与本地不同（API 通道生成），只要 tree 相同即内容一致
        const localTree = git('rev-parse', 'HEAD^{tree}');
        if (localTree === tree.sha) {
            console.log('✓ 内容已同步：远程 tree 与本地 tree 相同 (' + tree.sha.slice(0, 7) + ')');
            console.log('  （SHA 不同是因为走 Git Data API；联网后 git fetch && git reset --hard origin/main 即可对齐）');
        } else {
            console.log('⚠ 本地 tree 与远程 tree 不同，请联网后执行 git fetch && git reset --hard origin/main');
        }
    }
    console.log(`上传 ${uploaded} 个文件，提交 ${commits.length} 条合并为一次 API 提交`);
})().catch(e => {
    console.error('✗ 推送失败: ' + e.message);
    process.exit(1);
});
